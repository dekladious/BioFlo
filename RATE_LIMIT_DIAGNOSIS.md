# Rate Limit Diagnosis

## Two Types of Rate Limits

There are **two different** rate limits that could be hitting:

### 1. **Our Internal Rate Limit** (BioFlo)
- **Limit**: 20 requests per 5 minutes (production) or 100 (development)
- **Error**: "Rate limit exceeded. You've used X requests..."
- **Fix**: Add `DISABLE_RATE_LIMIT=true` to `.env.local` and restart

### 2. **API Provider Rate Limit** (Anthropic/OpenAI) ⚠️
- **Limit**: Depends on your API key tier
- **Error**: "Rate limit exceeded. Please try again later." (from API)
- **Fix**: Wait a few minutes, or use a different API key

## How to Tell Which One

### Check Browser Console (F12)

**Our Rate Limit:**
```
Error: Rate limit exceeded. You've used 20 requests. Please try again in 5 minutes.
```

**API Provider Rate Limit:**
```
Error: Rate limit exceeded. Please try again later.
Error: AI provider (anthropic) rate limit exceeded. This is from the API provider...
```

### Check Server Logs

**Our Rate Limit:**
```
Chat API: Rate limit exceeded
```

**API Provider Rate Limit:**
```
API provider rate limit hit
Anthropic rate limited, falling back to OpenAI
```

## Quick Fixes

### Fix 1: Disable Our Rate Limiter

Add to `.env.local`:
```
DISABLE_RATE_LIMIT=true
```

Then restart:
```bash
pnpm dev
```

### Fix 2: Reset Rate Limit Store

The rate limit store is in-memory and clears when you restart the server.

Or call this endpoint (development only):
```bash
curl -X POST http://localhost:3000/api/admin/reset-rate-limit
```

### Fix 3: Wait for API Provider Reset

If it's the API provider (Anthropic/OpenAI):
- Wait 5-10 minutes
- Check your API key limits at:
  - Anthropic: https://console.anthropic.com/
  - OpenAI: https://platform.openai.com/usage

### Fix 4: Use Different API Key

If you have multiple API keys, switch to a different one:
- Change `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in `.env.local`
- Restart server

## API Provider Rate Limits

### Anthropic Claude
- Free tier: ~50 requests/minute
- Paid tier: Higher limits

### OpenAI
- Free tier: ~3 requests/minute
- Paid tier: Much higher limits

## Still Having Issues?

1. **Check which rate limit** - Look at the error message
2. **Check API key limits** - Visit your provider's dashboard
3. **Try fallback** - The system will auto-fallback to OpenAI if Anthropic is rate limited
4. **Disable our limiter** - Add `DISABLE_RATE_LIMIT=true` to `.env.local`

## Most Likely Issue

If you're testing frequently, it's probably **API provider rate limits** (Anthropic/OpenAI), not our internal limiter.

**Solution**: Wait a few minutes, or add `DISABLE_RATE_LIMIT=true` to disable our limiter and see if that helps.

