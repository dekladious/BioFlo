# Rate Limit Fix

## Quick Fix

The rate limit is currently **20 requests per 5 minutes**. This is too restrictive for testing.

### Option 1: Disable Rate Limiting (Development Only)

Add to `.env.local`:
```
DISABLE_RATE_LIMIT=true
```

Then restart your dev server:
```bash
pnpm dev
```

### Option 2: Wait for Reset

The rate limit resets after 5 minutes. You can:
- Wait 5 minutes
- Or restart the dev server (clears in-memory rate limit store)

### Option 3: Increased Limit (Already Applied)

The rate limit is now **100 requests per 5 minutes** in development mode automatically.

## What Changed

1. ✅ Increased dev rate limit from 20 → 100 requests per 5 minutes
2. ✅ Better error messages showing retry time
3. ✅ Option to disable rate limiting in dev mode

## Production

In production, the rate limit remains **20 requests per 5 minutes** to prevent abuse.

## Check Your Rate Limit Status

The API response headers show:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - When the limit resets (timestamp)

## Still Hitting Limits?

If you're still hitting limits:
1. Add `DISABLE_RATE_LIMIT=true` to `.env.local`
2. Restart dev server
3. Rate limiting will be completely disabled in development

---

**Note:** Rate limiting is important for production to prevent abuse, but can be annoying during development. The changes above make it more developer-friendly while keeping production safe.

