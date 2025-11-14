# Fix Rate Limit Issue

Since you haven't reached Anthropic's rate limit, the issue is our **internal rate limiter**.

## Quick Fix

### Option 1: Disable Rate Limiting (Recommended for Testing)

Add this line to `.env.local`:

```
DISABLE_RATE_LIMIT=true
```

Then **restart your dev server**:
```bash
# Stop server (Ctrl+C)
pnpm dev
```

### Option 2: Clear Rate Limit Store

The rate limit store is in-memory. Simply **restart your dev server** to clear it:

```bash
# Stop server (Ctrl+C)
pnpm dev
```

This will reset your rate limit count.

### Option 3: Wait 5 Minutes

The rate limit resets automatically after 5 minutes.

## Verify It's Disabled

After adding `DISABLE_RATE_LIMIT=true` and restarting, check the server logs. You should see:

```
Rate limiting disabled in development
```

## Current Rate Limit Settings

- **Development**: 100 requests per 5 minutes (or disabled if `DISABLE_RATE_LIMIT=true`)
- **Production**: 20 requests per 5 minutes

## Still Having Issues?

1. **Check `.env.local` exists** in the root directory
2. **Verify the line** `DISABLE_RATE_LIMIT=true` is there (no quotes, no spaces)
3. **Restart server** after adding it
4. **Check server logs** for "Rate limiting disabled" message

## Test

After restarting with `DISABLE_RATE_LIMIT=true`, try sending multiple messages quickly. They should all work without rate limiting!

