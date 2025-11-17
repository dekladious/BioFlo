# 🔐 BioFlo Auth & Data Stack

This document captures the _current_ authentication and persistence design so it stays aligned with the actual codebase. Treat this as the source of truth until we intentionally migrate to a different auth or database provider.

---

## Identity & Sessions (Clerk)
- **Provider:** [`@clerk/nextjs`](https://clerk.com) wraps the App Router via `ClerkProvider` in `app/layout.tsx`.
- **Client usage:** UI components (e.g. `components/Header.tsx`, `components/ProBadge.tsx`) rely on `SignedIn`, `SignedOut`, and `useUser()` for state.
- **Server usage:** Route handlers (e.g. `app/api/chat/route.ts`, `app/api/health/metrics/route.ts`) call `auth()` to obtain the authenticated `userId`. All backend logic starts from this identifier.
- **Why keep Clerk:** We already have working session management, OAuth, and MFA. Replacing it with Supabase Auth would be a large refactor with no near-term benefit.

---

## Database Source of Truth (Postgres)
- **Connection helper:** `lib/db/client.ts` exposes `getDbPool`, `query`, and `queryOne`, reading `DATABASE_URL`. Production deploys can point at Supabase, Neon, Railway, etc.—we treat it as “managed Postgres,” not as an auth provider.
- **Primary tables:** defined in `lib/db/schema.sql`.
  - `users`: stores `clerk_user_id`, email, and subscription fields. This is the bridge between Clerk identities and our domain data.
  - `chat_messages`: full conversation history keyed by `user_id` + `thread_id`.
  - `user_preferences`: optional nutrition/sleep targets.
  - `tool_usage`: structured analytics for protocol generators.
  - `health_metrics` & `wearable_devices`: placeholders for current/future ingest of objective data.
- **Triggers:** `update_*_updated_at` ensures `updated_at` stays correct on mutations.
- **Planned multi-tenancy:** We will add `tenant_id`, `role`, and `plan` columns (starting with the `users` table) plus row-level checks in queries. RLS policies can be layered onto the same schema once we flip the switch.

---

## Auth ↔ DB Interaction Pattern
1. **Web request hits API route** → `auth()` yields `userId` (Clerk).
2. **Lookup local profile** via `queryOne("SELECT id, subscription_status FROM users WHERE clerk_user_id = $1", [userId])`.
3. **Gate feature access** using `subscription_status` (Stripe webhooks keep it in sync).
4. **Persist or fetch domain data** (`chat_messages`, `tool_usage`, etc.) scoped by our internal UUID `users.id`.

This keeps Clerk concerns at the edge while every downstream table references our own UUIDs.

---

## Subscriptions & Billing
- **Provider:** Stripe (see `app/api/stripe/*` routes and `scripts/create-stripe-price.js`).
- **Flow:** When a checkout completes or a subscription changes, the webhook updates the matching `users` row (`subscription_status`, `subscription_tier`). Feature gates read those columns.
- **Decision:** Shopify may power future course/commerce offerings, but we keep Stripe for the BioFlo agent subscription in this repository.

---

## Upcoming Enhancements
- **pgvector + documents table:** add embeddings-backed RAG inside the same Postgres instance (see TODO).
- **Row-Level Security:** once we solidify the schema, enforce `user_id = auth.uid` style policies. Clerk will still front authentication; the database simply gains guards.
- **Multi-tenant fields:** extend `users` (and cascading tables) with `tenant_id` to support team accounts without swapping auth providers.

Until those land, any feature work should assume: **Clerk for identity, this Postgres schema for everything else.**

