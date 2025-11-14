# Database Setup Guide

BioFlo uses PostgreSQL for persistent storage of chat history, user preferences, and analytics.

## Quick Setup

### Option 1: Neon (Recommended - Free Tier Available)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (starts with `postgresql://`)
4. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

### Option 2: Supabase (Free Tier Available)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string
5. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres:password@host:5432/postgres
   ```

### Option 3: Railway (Free Tier Available)
1. Sign up at [railway.app](https://railway.app)
2. Create a new PostgreSQL service
3. Copy the connection string from the service
4. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres:password@host:5432/railway
   ```

## Initialize Database Schema

Run the SQL schema file to create all tables:

```bash
# Using psql (if installed locally)
psql $DATABASE_URL -f lib/db/schema.sql

# Or using Neon/Supabase dashboard SQL editor
# Copy and paste the contents of lib/db/schema.sql
```

## Schema Overview

- **users**: Extends Clerk user data with subscription info
- **chat_messages**: Stores all chat messages by thread
- **user_preferences**: Biohacking profile (diet, goals, supplements)
- **tool_usage**: Analytics for tool usage tracking

## Graceful Degradation

If `DATABASE_URL` is not set, the app will continue to work but:
- Chat history won't persist (uses localStorage only)
- User preferences won't save
- Analytics won't be tracked

All database operations are wrapped in try-catch with graceful fallbacks.

## Testing Connection

The app automatically tests the database connection on startup. Check your server logs for connection status.

