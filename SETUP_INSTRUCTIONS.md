# BioFlo Production AI Pipeline - Setup Instructions

## ✅ Automated Steps (Already Done)

1. ✅ All code files created and integrated
2. ✅ Migration script created (`scripts/setup-analytics-tables.js`)
3. ✅ Cron configuration created (`vercel.json`)
4. ✅ Package.json updated with new script

## 📋 Manual Steps Required

### Step 1: Add Environment Variables

Add these to your `.env.local` file:

```bash
# Model Configuration (add these)
OPENAI_CHEAP_MODEL=gpt-4o-mini
OPENAI_EXPENSIVE_MODEL=gpt-5
OPENAI_EMBED_MODEL=text-embedding-3-small
ANTHROPIC_JUDGE_MODEL=claude-4-5-sonnet

# Analytics (REQUIRED - generate a random secret string)
BIOFLO_ANALYTICS_SALT=your-random-secret-string-here-change-this

# Admin Access (add your email addresses, comma-separated)
ADMIN_EMAILS=your-email@example.com
```

**To generate a secure salt:**
```bash
# On Mac/Linux:
openssl rand -hex 32

# On Windows (PowerShell):
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Step 2: Run Database Migration

Run the analytics tables migration:

```bash
pnpm db:setup-analytics
```

Or manually run the SQL in Supabase:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `lib/db/analytics-schema.sql`
4. Click "Run"

**Expected output:**
```
✓ Created tables:
  - ai_users
  - analytics_events
  - system_health_checks
  - api_errors
```

### Step 3: Verify Stripe Schema (Optional but Recommended)

The analytics queries assume a `stripe_subscriptions` table. If you don't have this:

**Option A**: Create it based on your Stripe integration:
```sql
CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  amount INT, -- in cents
  created_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_id ON public.stripe_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON public.stripe_subscriptions(status);
```

**Option B**: Adjust queries in `lib/analytics/queries.ts` to match your actual Stripe schema.

### Step 4: Test the V2 Chat Route

Start your dev server:
```bash
pnpm dev
```

Test the new route (you'll need to be authenticated):
```bash
# In browser console or Postman:
fetch('/api/chat/v2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'How can I improve my sleep?' }
    ]
  })
})
.then(r => r.json())
.then(console.log)
```

**Expected response:**
```json
{
  "reply": "...",
  "metadata": {
    "topic": "sleep",
    "risk": "low",
    "modelUsed": "gpt-4o-mini",
    "usedJudge": false,
    ...
  }
}
```

### Step 5: Set Up Health Check Cron (Vercel)

If deploying to Vercel, the `vercel.json` file is already configured. Just deploy:

```bash
git add vercel.json
git commit -m "Add health check cron"
git push
```

Vercel will automatically set up the cron job.

**For other platforms**, set up a cron job to call:
```
GET https://your-domain.com/api/health-check
```
Every 5 minutes.

### Step 6: Test Admin Dashboard

1. Make sure your email is in `ADMIN_EMAILS` in `.env.local`
2. Restart your dev server (to pick up env changes)
3. Navigate to: `http://localhost:3000/admin/analytics`
4. You should see the analytics dashboard

**If you get redirected**, check:
- Your email matches `ADMIN_EMAILS`
- Or set your Clerk user's `publicMetadata.role` to `"admin"`

### Step 7: Test Health Check

Manually test the health check endpoint:

```bash
curl http://localhost:3000/api/health-check
```

**Expected response:**
```json
{
  "status": "ok",
  "checks": [
    { "check_name": "supabase", "status": "ok", "latency_ms": 45, ... },
    { "check_name": "stripe", "status": "ok", "latency_ms": 120, ... },
    { "check_name": "openai", "status": "ok", "latency_ms": 850, ... },
    { "check_name": "anthropic", "status": "ok", "latency_ms": 920, ... }
  ]
}
```

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] Environment variables added to `.env.local`
- [ ] Database migration ran successfully (`pnpm db:setup-analytics`)
- [ ] V2 chat route responds correctly
- [ ] Health check endpoint works
- [ ] Admin dashboard accessible at `/admin/analytics`
- [ ] Analytics events are being logged (check `analytics_events` table)
- [ ] Health checks are being logged (check `system_health_checks` table)

## 🐛 Troubleshooting

### "BIOFLO_ANALYTICS_SALT not set"
- Add it to `.env.local` and restart dev server

### "Table already exists" errors
- This is fine - tables already exist, migration is idempotent

### Admin dashboard redirects to `/dashboard`
- Check `ADMIN_EMAILS` matches your email
- Or set Clerk user metadata: `publicMetadata.role = "admin"`

### Analytics queries return 0s
- Normal if no data yet - wait for some chat interactions
- Check `analytics_events` table has rows after using chat

### Health check fails for a service
- Check API keys are set correctly
- Check network connectivity
- Review error messages in response

## 📊 Next Steps After Setup

1. **Use the chat** - Generate some analytics data
2. **Check analytics** - View metrics in admin dashboard
3. **Monitor health** - Check `/api/health-check` regularly
4. **Review logs** - Check `api_errors` table for issues
5. **Integrate V2 route** - Update frontend to use `/api/chat/v2` when ready

## 📝 Notes

- Analytics logging is fire-and-forget (won't break main flow)
- All analytics are pseudonymous (no PII)
- Health checks can be called manually or via cron
- The V2 route is separate from the existing route - you can test it independently

