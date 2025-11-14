# Quick Start: Database Setup

## 🚀 3 Simple Steps

### Step 1: Get a Free Database (2 minutes)

Choose one:

**Option A: Neon** (Easiest) ⭐
1. Go to https://neon.tech
2. Sign up (free)
3. Click "Create Project"
4. Copy the connection string

**Option B: Supabase**
1. Go to https://supabase.com
2. Sign up (free)
3. Create project → Settings → Database
4. Copy connection string

**Option C: Railway**
1. Go to https://railway.app
2. Sign up (free)
3. New → PostgreSQL
4. Copy connection string

### Step 2: Add to .env.local (30 seconds)

1. Open `.env.local` (create it if it doesn't exist)
2. Add this line:
   ```
   DATABASE_URL=your_connection_string_here
   ```

Example:
```
DATABASE_URL=postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Step 3: Run Setup (10 seconds)

```bash
pnpm run db:setup
```

That's it! ✅

## Verify It Works

Test your connection:
```bash
pnpm run db:test
```

You should see:
```
✅ Connection successful!
✅ All tables present!
```

## What You Get

Once set up:
- ✅ Chat history persists across devices
- ✅ User preferences save automatically
- ✅ Tool usage analytics tracked
- ✅ Everything syncs automatically

## Troubleshooting

**"DATABASE_URL not found"**
→ Make sure `.env.local` exists and has `DATABASE_URL=...`

**"Connection refused"**
→ Check your connection string is correct (no extra spaces/quotes)

**"Password authentication failed"**
→ Double-check your credentials in the connection string

## Don't Want a Database?

No problem! BioFlo works perfectly without it:
- Uses localStorage for chat history (browser-only)
- Everything else works the same

You can add the database later anytime! 🎉

