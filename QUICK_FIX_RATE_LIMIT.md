# Quick Fix: 429 Rate Limit Error

You're hitting our **internal rate limiter** (429 Too Many Requests).

## Immediate Fix

### Step 1: Create/Edit `.env.local`

Create or edit `.env.local` in the root directory (same folder as `package.json`):

```bash
DISABLE_RATE_LIMIT=true
ANTHROPIC_API_KEY=sk-ant-************************************
```

**Important:**
- No spaces around the `=`
- No quotes around the values
- File must be named exactly `.env.local` (starts with a dot)

### Step 2: Restart Dev Server

**CRITICAL**: You MUST restart the server after adding/editing `.env.local`:

```bash
# Stop server (Ctrl+C in the terminal running pnpm dev)
# Then start again:
pnpm dev
```

### Step 3: Verify It's Disabled

After restarting, check your server terminal. You should see:
```
Rate limiting DISABLED in development
```

If you see that message, rate limiting is disabled and you can test freely!

## Why Restart is Required

Environment variables are only loaded when the server starts. Changes to `.env.local` won't take effect until you restart.

## Still Getting 429?

1. **Double-check `.env.local`** - Make sure it exists and has `DISABLE_RATE_LIMIT=true`
2. **Check file location** - Must be in the root directory (same as `package.json`)
3. **Restart server** - Must restart after changing `.env.local`
4. **Check server logs** - Should say "Rate limiting DISABLED in development"

## Alternative: Wait 5 Minutes

If you don't want to disable rate limiting, just wait 5 minutes and the rate limit will reset automatically.

---

**After adding `DISABLE_RATE_LIMIT=true` and restarting, you should be able to test without rate limits!**

