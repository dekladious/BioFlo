# Debugging 500 Internal Server Error

You're getting a **500 Internal Server Error**, not a rate limit error. The "Rate limit exceeded" message is misleading - it's coming from error handling.

## Check Server Terminal Logs

**Look at your terminal where `pnpm dev` is running.** You should see detailed error logs there.

The error will show something like:
- `Anthropic API call failed`
- `Chat API error`
- The actual error message

## Common Causes of 500 Errors

### 1. Missing or Invalid API Key
**Check**: Is `ANTHROPIC_API_KEY` set in `.env.local`?

**Fix**: Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-************************************
```

### 2. Wrong Model Name
**Check**: The model name might be incorrect

**Fix**: I've updated it to `claude-sonnet-4-20250514` which matches your test command.

### 3. API Version Header Issue
**Check**: Anthropic requires a specific API version header

**Fix**: I've added `anthropic-version: 2023-06-01` header.

### 4. Network/Connection Issue
**Check**: Can't reach Anthropic API

**Fix**: Check your internet connection

## What to Do Now

1. **Check your terminal logs** - Look for the actual error message
2. **Verify `.env.local`** - Make sure `ANTHROPIC_API_KEY` is set correctly
3. **Restart server** - After adding the key
4. **Check browser console** - The improved error logging will show more details

## Improved Error Messages

I've updated the error handling to show:
- More specific error messages
- Better API key error detection
- Model name error detection
- Full error logging in server terminal

## Next Steps

1. **Check terminal logs** - Copy the error message you see
2. **Share the error** - The terminal will show the actual problem
3. **Try again** - After verifying `.env.local` and restarting

The terminal logs will tell us exactly what's wrong!

