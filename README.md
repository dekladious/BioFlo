# BioFlo - Biohacking Personal Assistant

Enterprise-grade Next.js application with authentication, subscription management, and AI-powered chat.

## Features

- ✅ **Authentication** - Clerk integration with secure user management
- ✅ **Subscription Management** - Stripe integration with £14.99/month subscriptions
- ✅ **AI Chat** - OpenAI GPT‑5 primary with Claude 4.5 fallback + streaming responses
- ✅ **Rate Limiting** - Protection against API abuse
- ✅ **Security** - Enterprise-grade security headers and best practices
- ✅ **Error Handling** - Comprehensive error boundaries and logging
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Request Tracking** - Request ID tracking for observability
- ✅ **Knowledge Base Ready** - pgvector-backed `documents` table for RAG context

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Authentication:** Clerk
- **Payments:** Stripe
- **AI:** OpenAI GPT‑5 (primary) + Anthropic Claude 4.5 fallback
- **Vector Search:** pgvector (1536-dim embeddings)
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Clerk account
- Stripe account
- OpenAI API key (GPT-5 access)
- Anthropic API key (fallback, optional but recommended)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables (copy `.env.example` to `.env.local`):
   ```bash
   cp .env.example .env.local
   ```

4. Fill in your API keys in `.env.local`

5. (Optional) Provision the database schema locally:
   ```bash
   pnpm db:setup
   ```

6. Run the development server:
   ```bash
   pnpm dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── api/           # API routes
│   ├── chat/          # Chat page
│   ├── subscribe/     # Subscription page
│   └── layout.tsx     # Root layout
├── components/        # React components
├── lib/              # Utilities and helpers
├── types/            # TypeScript type definitions
└── middleware.ts     # Authentication middleware
```

## Environment Variables

See `.env.example` for required variables.

## API Endpoints

- `POST /api/chat` - Chat with AI (requires Pro subscription)
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Open billing portal
- `POST /api/stripe/webhook` - Stripe webhook handler
- `GET /api/stripe/check-status` - Check subscription status
- `GET /api/health` - Health check
- `POST /api/chat/history` - Persist chat threads (internal)

## Security Features

- Security headers (HSTS, XSS protection, etc.)
- Rate limiting (20 requests per 5 minutes)
- Input validation
- Request size limits
- Authentication required for protected routes
- Subscription gating for chat access

## Production Deployment

1. Set environment variables in your hosting platform
2. Run `pnpm build`
3. Deploy to Vercel, Railway, or your preferred platform

## Knowledge Base Ingestion (RAG)

The `documents` table stores protocol snippets and long-form references with embeddings. Use the ingestion script to add new files:

```bash
node scripts/ingest-documents.js ./knowledge/sleep.md --title "Sleep Foundations"
```

Flags:
- `--title` – override the title (defaults to file name)
- `--user-id` – assign to a specific `users.id` (omit for global/shared)
- `--user` – look up `users.id` from a Clerk `userId`
- `--visibility` – `global` (default) or `private`

Each chunk is embedded with `text-embedding-3-small` and stored in Postgres via pgvector, ready for retrieval inside `/api/chat`.

## License

Private

