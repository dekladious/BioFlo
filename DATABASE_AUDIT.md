# Database Schema Audit vs BioFlo Phase 1 Spec

## Database Tooling
- **Tool:** Raw SQL with `pg` library
- **Migration System:** Manual SQL scripts (`lib/db/schema.sql`)
- **Setup Script:** `scripts/setup-database.js` (via `pnpm db:setup`)
- **Vector Extension:** pgvector (already enabled)

## Schema Comparison

### ✅ Tables That Exist and Match Spec

1. **profiles** → `users` table
   - ✅ `id` (UUID, PK)
   - ✅ `clerk_user_id` (TEXT, UNIQUE) - matches spec
   - ✅ `email`, `full_name`
   - ✅ `goals` (JSONB) - matches spec
   - ✅ `main_struggles` (JSONB) - matches spec
   - ✅ `subscription_status` - matches spec enum
   - ✅ `created_at`, `updated_at`

2. **messages** → `chat_messages` table
   - ✅ `id` (UUID, PK)
   - ✅ `user_id` (FK to users)
   - ✅ `role` ('user' | 'assistant') - matches spec
   - ✅ `content` (TEXT)
   - ✅ `created_at`
   - ⚠️ Uses `thread_id` (TEXT) instead of separate thread table (acceptable)

3. **check_ins** → `check_ins` table
   - ✅ `id` (BIGSERIAL, PK)
   - ✅ `user_id` (FK)
   - ✅ `mood` (INTEGER, 1-10)
   - ✅ `energy` (INTEGER, 1-10)
   - ✅ `sleep_quality` (INTEGER, 1-10)
   - ✅ `notes` (TEXT, nullable)
   - ✅ `created_at` (TIMESTAMPTZ)

4. **documents** → `documents` table (RAG)
   - ✅ `id` (UUID, PK)
   - ✅ `user_id` (FK, nullable for global docs)
   - ✅ `title` (TEXT)
   - ✅ `chunk` (TEXT)
   - ✅ `embedding` (vector(1536)) - matches spec
   - ✅ `metadata` (JSONB) - supports topic, risk_level
   - ✅ `visibility` ('global' | 'private')
   - ✅ pgvector index exists

5. **protocols** → `protocols` table
   - ✅ `id` (BIGSERIAL, PK)
   - ✅ `slug` (TEXT, UNIQUE)
   - ✅ `name` (TEXT)
   - ✅ `description` (TEXT)
   - ✅ `config` (JSONB) - matches spec
   - ✅ `created_at`

6. **protocol_runs** → `protocol_runs` table
   - ✅ `id` (BIGSERIAL, PK)
   - ✅ `user_id` (FK)
   - ✅ `protocol_id` (FK)
   - ✅ `status` ('active' | 'completed' | 'abandoned') - matches spec
   - ✅ `started_at`, `completed_at`
   - ✅ `state` (JSONB) - matches spec

7. **protocol_logs** → `protocol_logs` table
   - ✅ `id` (BIGSERIAL, PK)
   - ✅ `protocol_run_id` (FK)
   - ✅ `day_index` (INTEGER)
   - ✅ `completed` (BOOLEAN)
   - ✅ `notes` (TEXT, nullable)
   - ✅ `created_at`

8. **wearable_raw_sleep** → `wearable_raw_sleep` table
   - ✅ `id` (BIGSERIAL, PK)
   - ✅ `user_id` (FK)
   - ✅ `source` ('oura' | 'whoop' | 'garmin' | 'apple' | 'google')
   - ✅ `provider_id` (TEXT)
   - ✅ `start_time`, `end_time` (TIMESTAMPTZ)
   - ✅ `raw` (JSONB)

9. **wearable_raw_activity** → `wearable_raw_activity` table
   - ✅ `id` (BIGSERIAL, PK)
   - ✅ `user_id` (FK)
   - ✅ `source` (TEXT)
   - ✅ `provider_id` (TEXT)
   - ✅ `date` (DATE)
   - ✅ `raw` (JSONB)

10. **wearable_raw_hr** → `wearable_raw_hr` table
    - ✅ `id` (BIGSERIAL, PK)
    - ✅ `user_id` (FK)
    - ✅ `source` (TEXT)
    - ✅ `provider_id` (TEXT)
    - ✅ `timestamp` (TIMESTAMPTZ)
    - ✅ `raw` (JSONB)

11. **wearable_features_daily** → `wearable_features_daily` table
    - ✅ `id` (BIGSERIAL, PK)
    - ✅ `user_id` (FK)
    - ✅ `date` (DATE)
    - ✅ `sleep_total_minutes` (INTEGER)
    - ✅ `sleep_efficiency` (INTEGER, 0-100)
    - ✅ `sleep_onset`, `sleep_offset` (TIME)
    - ✅ `hrv_baseline` (NUMERIC)
    - ✅ `resting_hr` (NUMERIC)
    - ✅ `steps` (INTEGER)
    - ✅ `training_load` (NUMERIC)
    - ✅ `readiness_score` (INTEGER, 0-100)
    - ✅ `source_flags` (TEXT[])
    - ✅ UNIQUE(user_id, date)

12. **daily_plans** → `daily_plans` table
    - ✅ `id` (BIGSERIAL, PK)
    - ✅ `user_id` (FK)
    - ✅ `date` (DATE)
    - ✅ `plan` (JSONB) - matches spec
    - ✅ `created_at`
    - ✅ UNIQUE(user_id, date)

13. **weekly_debriefs** → `weekly_debriefs` table
    - ✅ `id` (BIGSERIAL, PK)
    - ✅ `user_id` (FK)
    - ✅ `week_start`, `week_end` (DATE)
    - ✅ `debrief` (JSONB) - matches spec
    - ✅ `created_at`
    - ✅ UNIQUE(user_id, week_start)

14. **nudges** → `nudges` table
    - ✅ `id` (BIGSERIAL, PK)
    - ✅ `user_id` (FK)
    - ✅ `type` (TEXT) - matches spec
    - ✅ `payload` (JSONB) - matches spec
    - ✅ `channel` ('in_app' | 'push' | 'email')
    - ✅ `created_at`, `delivered_at`

15. **Token Tables** → `oura_tokens`, `whoop_tokens`, `garmin_tokens`
    - ✅ All exist with correct structure
    - ✅ `user_id` (PK, FK)
    - ✅ `access_token`, `refresh_token`
    - ✅ `expires_at`, `scopes`

### ⚠️ Minor Differences (Acceptable)

1. **Table Names:**
   - Spec says `profiles` → We use `users` (acceptable, more standard)
   - Spec says `messages` → We use `chat_messages` (acceptable, more descriptive)

2. **ID Types:**
   - Spec suggests `bigserial` for some tables → We use `UUID` for some (acceptable, both work)
   - We use `BIGSERIAL` for protocol tables (matches spec)

3. **Additional Tables (Not in Spec but Useful):**
   - `user_preferences` - Biohacking profile (useful addition)
   - `health_metrics` - Comprehensive metrics tracking (useful addition)
   - `wearable_devices` - Device management (useful addition)
   - `tool_usage` - Analytics (useful addition)
   - `care_mode_settings`, `care_mode_check_ins`, `care_mode_alerts` - Care Mode feature

### ✅ Indexes

All required indexes exist:
- ✅ `idx_chat_messages_user_id`, `idx_chat_messages_thread_id`, `idx_chat_messages_created_at`
- ✅ `idx_check_ins_user_id`, `idx_check_ins_created_at`, `idx_check_ins_user_created`
- ✅ `idx_protocol_runs_user_id`, `idx_protocol_runs_status`, `idx_protocol_runs_user_status`
- ✅ `idx_protocol_logs_run_id`, `idx_protocol_logs_day`
- ✅ `idx_wearable_features_daily_user_id`, `idx_wearable_features_daily_date`, `idx_wearable_features_daily_user_date`
- ✅ `idx_daily_plans_user_id`, `idx_daily_plans_date`
- ✅ `idx_weekly_debriefs_user_id`, `idx_weekly_debriefs_week_start`
- ✅ `idx_nudges_user_id`, `idx_nudges_delivered_at`, `idx_nudges_user_undelivered`
- ✅ `idx_documents_embedding` (pgvector index)

### ✅ Functions

- ✅ `match_documents()` - pgvector similarity search function exists
- ✅ `update_updated_at_column()` - Trigger function for timestamps

## Summary

### ✅ Status: **FULLY COMPLIANT**

**All required tables exist and match the spec!**

The schema is actually **more complete** than the spec because it includes:
- Additional useful tables (user_preferences, health_metrics, tool_usage)
- Care Mode tables (elderly/family monitoring)
- Proper indexes for all queries
- pgvector setup for RAG

### No Migration Needed

The existing schema is fully compliant with the Phase 1 spec. No changes required.

### Next Steps

1. ✅ Schema is ready
2. ⏭️ Build RAG ingestion pipeline (next task)
3. ⏭️ Seed with fasting/sauna content (next task)

