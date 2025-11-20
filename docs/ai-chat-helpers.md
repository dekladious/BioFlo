# BioFlo AI Chat Helper Modules

This note documents the shared helpers that power both `/api/chat` and `/api/chat/v2`.  
Use it as the starting point for troubleshooting or extending the chat pipeline.

---

## 1. `lib/ai/chat/context.ts`

**Purpose:** Resolve all user-specific context required for an AI reply.

- Inputs: `clerkUserId`, raw user message, `RequestClassification`, optional `domain`.
- Responsibilities:
  - Load or create the Postgres `users` row and stringify profile goals/struggles.
  - Detect `sleepMode` (domain hint or content) and build a combined RAG bundle via `buildRagBundle`.
  - Pull protocol status via `getProtocolStatusSummary`.
  - Return a `CoachContext`, flattened RAG context string, RAG source metadata, DB user id.
- Failure handling:
  - Any DB/RAG errors are caught and logged at `debug` level; the API falls back to empty context.
  - Always returns a `coachContext` string, even if it has to use “No profile data available”.

**When debugging:**  
If RAG feels irrelevant or protocol context is missing, log the returned `coachContext` to verify it contains the expected blocks.

---

## 2. `lib/ai/chat/history.ts`

**Purpose:** Persist conversation turns in `chat_messages` while preventing duplicates.

- Ensures a `users` row exists for the current Clerk user (creates one if missing).
- Deduplicates by checking for the same role/content inserted within the last 5 minutes.
- Stores assistant and user messages together to keep threads coherent.
- Safe to call fire-and-forget; any DB issues are logged and ignored.

**Failure handling:**  
If a user cannot be created (e.g., DB outage), the helper logs a warning and exits—chat replies still flow to the client.

---

## 3. `lib/ai/chat/streaming.ts`

**Purpose:** Centralise streaming response behaviour for all chat routes.

- `createStreamResponse`: wraps the NDJSON stream, injects `requestId`, handles abort signals gracefully.
- `streamTextChunks`: utility for faking streaming when we only have a full string (e.g., fallback path).
- `streamWithFallback`: streams via OpenAI first; if it throws a `ModelError` and the Anthropic key is present, it retries with Anthropic automatically.

**Failure handling:**  
Aborted requests emit a deterministic `ERROR_USER_ABORTED_REQUEST`. Any other errors stream a single `{ type: "error" }` packet before closing.

---

## Operational Tips

1. **Tracing an answer:**  
   - Look at `/api/chat` (streaming) or `/api/chat/v2` (non-streaming). Both now call the helpers listed above in the same order: classification → context → model routing → streaming → persistence.
2. **Adding new context sources:**  
   - Extend `buildChatContext` to fetch and append new data. The API routes consume the returned `CoachContext` string automatically.
3. **Debugging missing history:**  
   - Verify `persistChatHistory` is called (search for it in the route).  
   - Check Postgres `chat_messages` for the relevant `thread_id` and `user_id`.
4. **Monitoring streaming issues:**  
   - All streaming errors go through `createStreamResponse`. If clients report “Request aborted,” confirm whether the browser aborted (user navigated away) or the server emitted `ERROR_USER_ABORTED_REQUEST`.
5. **Future enhancements:**  
   - Consider moving the final orchestration (classification+context+stream) into a service so that `/api/chat` and `/api/chat/v2` share even more code. The helpers documented here are designed to make that step straightforward.

---

Maintaining these helpers ensures the AI layer remains consistent, debuggable, and ready for additional surfaces (mobile, cron jobs, admin simulators). Update this document whenever you add new shared helpers or change their failure semantics.

