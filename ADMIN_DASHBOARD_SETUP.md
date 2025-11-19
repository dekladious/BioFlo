# Admin Dashboard Setup

## Access Issues Fixed

The admin dashboard at `/admin/analytics` had several issues that have been fixed:

### 1. **Access Control**
- ✅ Added dev bypass: Set `BYPASS_ADMIN_CHECK=true` in `.env.local` for local development
- ✅ Fixed admin email check logic (was failing when `ADMIN_EMAILS` was empty)
- ✅ Better error logging for access denials

### 2. **Error Handling**
- ✅ Added graceful error handling for database queries
- ✅ Dashboard will load even if analytics tables don't exist yet
- ✅ Shows zeros/empty states instead of crashing

### 3. **Navigation**
- ✅ Updated Header link from `/analytics` to `/admin/analytics`
- ✅ Link text changed to "Admin" for clarity

## How to Access

### Option 1: Development Bypass (Easiest)
Add to `.env.local`:
```bash
BYPASS_ADMIN_CHECK=true
```

Then visit: `http://localhost:3000/admin/analytics`

### Option 2: Set Admin Email
Add to `.env.local`:
```bash
ADMIN_EMAILS=your-email@example.com
```

Or multiple emails:
```bash
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

Then visit: `http://localhost:3000/admin/analytics`

### Option 3: Set Clerk Role
In Clerk Dashboard, set the user's `publicMetadata.role` to `"admin"`.

## What You'll See

The dashboard shows:
- **Overview**: Total users, subscribers, MRR, ARR
- **AI Usage**: Chat counts, model breakdown, topic distribution, safety outcomes
- **RAG Performance**: Average docs per call, usage rate
- **Infrastructure Health**: System health checks, recent errors

## Troubleshooting

### "Redirected to /dashboard"
- You're not authorized as admin
- Set `BYPASS_ADMIN_CHECK=true` in `.env.local` for dev
- Or add your email to `ADMIN_EMAILS`

### "Error loading data"
- Analytics tables might not exist: Run `pnpm db:setup-analytics`
- Database connection issue: Check `DATABASE_URL` in `.env.local`
- Dashboard will still load with zeros/empty states

### "Page not found"
- Make sure you're visiting `/admin/analytics` (not `/analytics`)
- Check that the file exists at `app/admin/analytics/page.tsx`

## Next Steps

1. **Set up environment variable**:
   ```bash
   echo "BYPASS_ADMIN_CHECK=true" >> .env.local
   ```

2. **Visit the dashboard**:
   ```
   http://localhost:3000/admin/analytics
   ```

3. **Verify analytics tables exist** (if you see zeros):
   ```bash
   pnpm db:setup-analytics
   ```

4. **Send some test messages** in chat to populate analytics

