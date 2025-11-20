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
- ✅ **Analytics Layer** - Pseudonymous usage logging + admin dashboard

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

5. Provision the main database schema locally:
   ```bash
   pnpm db:setup
   ```

6. (Optional) Provision analytics tables (AI usage, health checks, errors):
   ```bash
   pnpm db:setup-analytics
   ```

7. Run the development server:
   ```bash
   pnpm dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

> Tip: set `BYPASS_ADMIN_CHECK=true` in `.env.local` to preview `/admin/analytics` without Clerk admin credentials during local development.

### Common scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Next.js dev server |
| `pnpm lint` | ESLint (errors treated as failures) |
| `pnpm test` | Vitest suite (non-watch) |
| `pnpm db:setup` | Apply core schema |
| `pnpm db:setup-analytics` | Apply analytics schema |
| `pnpm db:check-analytics` | Sanity-check analytics tables & latest event |
| `pnpm ingest` | Generic markdown ingestion (`content/`) |
| `pnpm ingest:longevity` | Load BioFlo longevity knowledge base |
| `pnpm ingest:sleep` | Load Matthew Walker sleep corpus |
| `pnpm ingest:attia` | Load Peter Attia masterclass transcripts |

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

We store all educational content inside the `documents` table (1536-dim pgvector). Choose the script that matches your source:

- **General markdown (`content/`):**
  ```bash
  pnpm ingest
  ```
- **BioFlo Longevity pack (`content/longevity/`):**
  ```bash
  pnpm ingest:longevity
  ```
- **Matthew Walker sleep course (`knowledge/sleep/matthew-walker/raw/`):**
  ```bash
  pnpm ingest:sleep
  ```
- **Peter Attia MasterClass transcripts (`data/attia/` – drop `.txt`, `.pdf`, or `.docx` files there):**
  ```bash
  pnpm ingest:attia
  ```

All scripts:
- Read `.md`/`.txt` files (Attia script also ingests `.pdf`/`.docx`), chunk them (~1k tokens), and embed with `text-embedding-3-small`
- Insert rows with `metadata.topic`, `metadata.source`, `metadata.risk_level`
- Require `DATABASE_URL` + `OPENAI_API_KEY`

Use `pnpm db:check-analytics` afterwards if you want to confirm new chat runs are being logged with the ingested content.

## License

Private

