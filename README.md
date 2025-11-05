# BioFlo - Biohacking Personal Assistant

Enterprise-grade Next.js application with authentication, subscription management, and AI-powered chat.

## Features

- ✅ **Authentication** - Clerk integration with secure user management
- ✅ **Subscription Management** - Stripe integration with £14.99/month subscriptions
- ✅ **AI Chat** - OpenAI GPT-4o powered biohacking assistant
- ✅ **Rate Limiting** - Protection against API abuse
- ✅ **Security** - Enterprise-grade security headers and best practices
- ✅ **Error Handling** - Comprehensive error boundaries and logging
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Request Tracking** - Request ID tracking for observability

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Authentication:** Clerk
- **Payments:** Stripe
- **AI:** OpenAI GPT-4o
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Clerk account
- Stripe account
- OpenAI API key

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

5. Run the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

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

## License

Private

