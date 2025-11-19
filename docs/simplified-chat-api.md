# Simplified BioFlo Chat API

## Overview

A clean, simplified implementation of the BioFlo chat API that:
- Uses the master BioFlo system prompt
- Fetches RAG context from Supabase/Postgres documents
- Calls OpenAI via the `biofloChat()` wrapper
- Returns a simple JSON response

## Files Created

### 1. `lib/biofloPrompt.ts`
- Exports `BIOFLO_SYSTEM_PROMPT` constant (uses master prompt)
- Exports `buildBiofloMessages()` function that:
  - Builds system prompt with topic modules
  - Adds RAG context instructions
  - Formats user messages for OpenAI API

### 2. `lib/llm.ts`
- Simple wrapper around OpenAI API
- Exports `biofloChat()` function
- Configurable model, temperature, max tokens

### 3. `app/api/chat/simple/route.ts`
- Simplified POST endpoint at `/api/chat/simple`
- Authenticates via Clerk
- Fetches RAG context using existing `searchDocuments()` helper
- Calls `biofloChat()` and returns `{ reply: string }`
- Optionally saves messages to database

## Usage

### API Endpoint

```typescript
POST /api/chat/simple

Request Body:
{
  "messages": [
    { "role": "user", "content": "How can I improve my sleep?" },
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "What about caffeine?" }
  ]
}

Response:
{
  "reply": "Here's how caffeine affects sleep..."
}
```

### Frontend Example

```typescript
async function sendMessage(userInput: string) {
  const messages = [
    ...previousMessages,
    { role: "user" as const, content: userInput }
  ];

  const response = await fetch("/api/chat/simple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
}
```

## Differences from Main Chat Route

The simplified route (`/api/chat/simple`) differs from the main route (`/api/chat`) in:

1. **No Streaming**: Returns complete response in one JSON payload
2. **No Safety Triage**: Doesn't use the safety classifier (relies on prompt)
3. **No Tool Execution**: Doesn't detect or execute tools
4. **No Rate Limiting**: Relies on Next.js/AWS rate limits
5. **Simpler Error Handling**: Basic try/catch with generic errors

## Integration with Existing System

The simplified route uses:
- Existing RAG helpers (`lib/ai/rag.ts`)
- Existing database client (`lib/db/client.ts`)
- Existing authentication (Clerk)
- New prompt system (`lib/biofloPrompt.ts`)
- New LLM wrapper (`lib/llm.ts`)

## Testing

To test the simplified route:

```bash
curl -X POST http://localhost:3000/api/chat/simple \
  -H "Content-Type: application/json" \
  -H "Cookie: your-clerk-session-cookie" \
  -d '{
    "messages": [
      { "role": "user", "content": "How can I improve my VO2max?" }
    ]
  }'
```

## Next Steps

1. **Replace Main Route**: If you want to use this as the main chat route, rename it to `/api/chat/route.ts` (backup the old one first)
2. **Add Streaming**: If you need streaming, modify `biofloChat()` to support streaming callbacks
3. **Add Rate Limiting**: Import and use the existing rate limiter
4. **Add Safety Triage**: Import and use the safety classifier before calling LLM

