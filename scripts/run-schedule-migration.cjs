require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env.local"), quiet: true });
const { Pool } = require("pg");
const sql = `
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS default_wake_time TIME DEFAULT '07:00',
ADD COLUMN IF NOT EXISTS default_sleep_time TIME DEFAULT '23:00',
ADD COLUMN IF NOT EXISTS work_schedule TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '17:00',
ADD COLUMN IF NOT EXISTS training_days TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS training_preferred_time TEXT DEFAULT 'afternoon',
ADD COLUMN IF NOT EXISTS primary_goal TEXT DEFAULT 'balanced',
ADD COLUMN IF NOT EXISTS health_conditions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS caffeine_cutoff_time TIME DEFAULT '14:00',
ADD COLUMN IF NOT EXISTS takes_supplements BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_wearable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS wearable_type TEXT;
CREATE TABLE IF NOT EXISTS daily_schedules (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, date DATE NOT NULL, wake_time TIME NOT NULL, sleep_time TIME NOT NULL, generated_from TEXT DEFAULT 'system', last_modified_by TEXT DEFAULT 'system', readiness_score INTEGER, goal_mode TEXT, ai_rationale TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, date));
CREATE TABLE IF NOT EXISTS schedule_blocks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), schedule_id UUID REFERENCES daily_schedules(id) ON DELETE CASCADE NOT NULL, start_time TIME NOT NULL, end_time TIME, block_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, linked_page TEXT, linked_data JSONB, completed BOOLEAN DEFAULT FALSE, skipped BOOLEAN DEFAULT FALSE, completed_at TIMESTAMPTZ, ai_rationale TEXT, editable BOOLEAN DEFAULT TRUE, priority INTEGER DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS schedule_templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, name TEXT NOT NULL, description TEXT, applies_to TEXT[] DEFAULT '{}', blocks JSONB NOT NULL DEFAULT '[]', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_daily_schedules_user_id ON daily_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_schedules_date ON daily_schedules(date DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_schedule_id ON schedule_blocks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_user_id ON schedule_templates(user_id);
`;
console.log("Running migration...");
console.log("DB:", !!process.env.DATABASE_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query(sql).then(() => { console.log("SUCCESS!"); pool.end(); }).catch(err => { console.log("Error:", err.message); pool.end(); });