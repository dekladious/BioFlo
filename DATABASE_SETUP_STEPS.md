# Database Setup - Step by Step

Follow these steps to set up your database for BioFlo.

## Step 1: Choose a Database Provider

Pick one of these free options:

### Option A: Neon (Recommended) ⭐
1. Go to https://neon.tech
2. Sign up (free)
3. Click "Create Project"
4. Copy the connection string (it looks like: `postgresql://user:pass@host/db`)

### Option B: Supabase
1. Go to https://supabase.com
2. Sign up (free)
3. Create a new project
4. Go to Settings > Database
5. Copy the connection string

### Option C: Railway
1. Go to https://railway.app
2. Sign up (free)
3. Create a new PostgreSQL service
4. Copy the connection string from the service

## Step 2: Add Database URL to .env.local

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and add your DATABASE_URL:
   ```
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

   Replace with your actual connection string from Step 1.

## Step 3: Install Dependencies (if needed)

The database packages are already installed, but if you need to reinstall:
```bash
pnpm install
```

## Step 4: Run Database Setup

Run the setup script to create all tables:
```bash
pnpm run db:setup
```

Or manually:
```bash
node scripts/setup-database.js
```

This will:
- ✅ Test your database connection
- ✅ Create all required tables
- ✅ Set up indexes and triggers
- ✅ Verify everything is working

## Step 5: Test the Connection

Verify everything is working:
```bash
pnpm run db:test
```

Or manually:
```bash
node scripts/test-database.js
```

## Troubleshooting

### "DATABASE_URL not found"
- Make sure you created `.env.local` (not `.env`)
- Check that `DATABASE_URL` is in the file

### "Connection refused"
- Check your database is running
- Verify the connection string is correct
- For Neon/Supabase, make sure you're using the right connection string (not the pooler URL)

### "Password authentication failed"
- Double-check your credentials in the connection string
- Make sure there are no extra spaces or quotes

### "Database does not exist"
- Create the database first in your provider's dashboard
- Or use the default database name (usually `postgres` or `neondb`)

## What Gets Created?

The setup script creates:
- **users** - User records linked to Clerk
- **chat_messages** - All chat history
- **user_preferences** - Biohacking profiles
- **tool_usage** - Analytics data

Plus indexes and triggers for performance.

## Graceful Degradation

**Good news!** BioFlo works perfectly fine without a database:
- Chat history uses localStorage (browser-only)
- User preferences won't persist
- Analytics won't be tracked

You can test everything first, then add the database when ready!

## Next Steps

Once your database is set up:
1. ✅ Chat history will persist across devices
2. ✅ User preferences will save
3. ✅ Tool usage analytics will be tracked
4. ✅ Everything will sync automatically

Ready to go! 🚀

