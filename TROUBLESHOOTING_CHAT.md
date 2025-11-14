# Troubleshooting: "No Response" in Chat

## Quick Fixes

### 1. Check API Keys

Make sure you have **at least one** AI API key set in `.env.local`:

**Option A: Anthropic Claude (Primary)**
```
ANTHROPIC_API_KEY=sk-ant-...
```

**Option B: OpenAI (Fallback)**
```
OPENAI_API_KEY=sk-...
```

**Get API Keys:**
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/api-keys

### 2. Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try sending a message
4. Look for error messages

Common errors you might see:
- `ANTHROPIC_API_KEY is not configured` → Add API key to `.env.local`
- `Invalid API key` → Check your API key is correct
- `Rate limit exceeded` → Wait a few minutes and try again

### 3. Check Server Logs

Look at your terminal where `pnpm dev` is running. You should see:
- ✅ `Chat API: Request completed` → API is working
- ❌ Error messages → Check what the error says

### 4. Test API Directly

Open browser console and run:
```javascript
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

This will show you the exact API response.

## Common Issues

### Issue: "No response" appears in chat

**Causes:**
1. Missing API keys
2. Invalid API keys
3. API rate limits
4. Network errors

**Solutions:**
1. ✅ Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to `.env.local`
2. ✅ Restart dev server after adding keys: `pnpm dev`
3. ✅ Check API key is valid (no extra spaces/quotes)
4. ✅ Check browser console for specific errors

### Issue: Error message appears

**Check the error message:**
- `ANTHROPIC_API_KEY is not configured` → Add API key
- `Invalid API key` → Verify key is correct
- `Rate limit exceeded` → Wait and retry
- `HTTP 401` → Authentication issue (check Clerk keys)
- `HTTP 402` → Subscription required (check Stripe setup)

### Issue: Loading spinner never stops

**Causes:**
- API timeout (30 seconds)
- Network issues
- API is down

**Solutions:**
1. Check server logs for timeout errors
2. Try a shorter message
3. Check your internet connection
4. Verify API service status

## Debug Mode

The chat now includes debug logging. Check browser console for:
- `API Response:` - Shows the full API response
- `No response from API:` - Shows what was received when parsing fails
- `Chat error:` - Shows any errors during the request

## Still Not Working?

1. **Check `.env.local` exists** and has the right keys
2. **Restart dev server** after changing `.env.local`
3. **Check terminal logs** for detailed error messages
4. **Try OpenAI fallback** - Add `OPENAI_API_KEY` if Anthropic isn't working
5. **Check authentication** - Make sure you're signed in

## Test Checklist

- [ ] `.env.local` file exists
- [ ] `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set
- [ ] Dev server restarted after adding keys
- [ ] Signed in to the app
- [ ] Browser console shows no errors
- [ ] Server logs show successful requests

## Need More Help?

Check the error message in:
1. Browser console (F12 → Console)
2. Server terminal logs
3. Network tab (F12 → Network → check `/api/chat` request)

The error message will tell you exactly what's wrong!

