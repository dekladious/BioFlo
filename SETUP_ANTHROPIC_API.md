# Setting Up Anthropic API Key

## Step 1: Add API Key to .env.local

Create or edit `.env.local` in the root directory and add:

```
ANTHROPIC_API_KEY=sk-ant-************************************
```

**Important**: Make sure there are no spaces or quotes around the key!

## Step 2: Restart Dev Server

After adding the key, restart your dev server:

```bash
# Stop current server (Ctrl+C)
pnpm dev
```

## Step 3: Test It

Try sending a message in the chat. It should now work!

## Model Configuration

The app is now configured to use:
- **Model**: `claude-sonnet-4-20250514` (matches your test command)
- **API Version**: `2023-06-01` (required header)

## Troubleshooting

### Still Getting Rate Limits?

1. **Check API Key Limits**: Visit https://console.anthropic.com/ to see your usage
2. **Wait a few minutes**: API rate limits reset periodically
3. **Check Error Message**: The console will show if it's our rate limit or API provider rate limit

### Still Not Working?

1. **Verify .env.local exists** in the root directory
2. **Check for typos** in the API key
3. **Restart server** after adding the key
4. **Check browser console** (F12) for error messages

## Security Note

⚠️ **Never commit .env.local to git!** It's already in `.gitignore`, but double-check.

Your API key is sensitive - keep it private!

