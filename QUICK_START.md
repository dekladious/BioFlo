# Quick Start - BioFlo Production AI Pipeline

## 🚀 3-Step Setup

### Step 1: Add Environment Variables

Add these to your `.env.local`:

```bash
# Model Configuration
OPENAI_CHEAP_MODEL=gpt-4o-mini
OPENAI_EXPENSIVE_MODEL=gpt-5
OPENAI_EMBED_MODEL=text-embedding-3-small
ANTHROPIC_JUDGE_MODEL=claude-4-5-sonnet

# Analytics Salt (use the generated one below)
BIOFLO_ANALYTICS_SALT=72edef16ffdadd68580c31289031246442cf7dd44300a7c726355d3a9d51d805

# Admin Access (your email)
ADMIN_EMAILS=your-email@example.com
```

### Step 2: Run Database Migration

```bash
pnpm db:setup-analytics
```

### Step 3: Test It

```bash
# Start dev server
pnpm dev

# Test health check
curl http://localhost:3000/api/health-check

# Test admin dashboard (in browser)
http://localhost:3000/admin/analytics
```

## ✅ Done!

See `SETUP_INSTRUCTIONS.md` for detailed steps and troubleshooting.

