-- For Postgres (Neon, Supabase, or Railway)

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (extends Clerk user data)
-- Note: This aligns with 'profiles' in the spec - using 'users' for consistency with existing code
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled')),
  goals JSONB DEFAULT '{}', -- Structured from onboarding
  main_struggles JSONB DEFAULT '{}', -- Main struggles from onboarding
  today_mode TEXT NOT NULL DEFAULT 'NORMAL' CHECK (today_mode IN ('NORMAL', 'RECOVERY', 'TRAVEL', 'DEEP_WORK', 'RESET', 'GROWTH')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB, -- tool usage, tokens, model used, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences (biohacking profile)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dietary_preference TEXT, -- 'keto', 'vegan', 'carnivore', 'pescatarian', etc.
  fasting_protocol TEXT, -- '16:8', '18:6', 'OMAD', '5:2', etc.
  sleep_goal_hours INTEGER,
  activity_level TEXT, -- 'sedentary', 'moderate', 'active', 'athlete'
  health_goals TEXT[], -- ['weight_loss', 'muscle_gain', 'longevity', etc.]
  supplements JSONB, -- current supplements array
  genetic_testing BOOLEAN DEFAULT FALSE,
  biohacking_experience TEXT, -- 'beginner', 'intermediate', 'advanced'
  check_in_reminder_enabled BOOLEAN DEFAULT TRUE, -- Enable daily check-in reminders
  check_in_reminder_time TIME DEFAULT '20:00', -- Default reminder time (8 PM)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Women's health profiles (cycle tracking & context)
CREATE TABLE IF NOT EXISTS womens_health_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cycle_length INTEGER CHECK (cycle_length BETWEEN 21 AND 40),
  current_phase TEXT CHECK (current_phase IN ('menstrual', 'follicular', 'ovulatory', 'luteal', 'perimenopause', 'menopause')),
  day_of_cycle INTEGER,
  issues TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tool usage analytics
CREATE TABLE IF NOT EXISTS tool_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Health metrics tracking (for wearables and manual entry)
CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Sleep metrics
  sleep_duration_minutes INTEGER,
  sleep_quality_score DECIMAL(3,1), -- 0-100
  sleep_deep_minutes INTEGER,
  sleep_rem_minutes INTEGER,
  sleep_light_minutes INTEGER,
  sleep_awake_minutes INTEGER,
  hrv_avg_ms DECIMAL(6,2), -- Heart Rate Variability average
  hrv_rmssd_ms DECIMAL(6,2), -- HRV RMSSD
  -- Activity metrics
  steps INTEGER,
  active_calories INTEGER,
  total_calories INTEGER,
  active_minutes INTEGER,
  workout_duration_minutes INTEGER,
  -- Heart rate metrics
  resting_heart_rate INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  -- Recovery metrics
  recovery_score DECIMAL(3,1), -- 0-100
  readiness_score DECIMAL(3,1), -- 0-100
  -- Stress metrics
  stress_level DECIMAL(3,1), -- 0-100
  -- Body metrics
  weight_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  muscle_mass_kg DECIMAL(5,2),
  -- Nutrition (daily totals)
  calories_consumed INTEGER,
  protein_g DECIMAL(6,2),
  carbs_g DECIMAL(6,2),
  fat_g DECIMAL(6,2),
  -- Mood/Energy
  energy_level INTEGER, -- 1-10
  mood_score INTEGER, -- 1-10
  -- Wearable source
  source TEXT, -- 'oura', 'apple_health', 'garmin', 'whoop', 'manual'
  source_data JSONB, -- Raw data from wearable API
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date, source) -- One record per user per day per source
);

-- Wearable device connections
CREATE TABLE IF NOT EXISTS wearable_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL, -- 'oura', 'apple_health', 'garmin', 'whoop'
  device_name TEXT,
  access_token_encrypted TEXT, -- Encrypted OAuth token
  refresh_token_encrypted TEXT, -- Encrypted refresh token
  expires_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, device_type) -- One device per type per user
);

-- Knowledge base documents (for RAG)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  chunk TEXT NOT NULL,
  summary TEXT,
  metadata JSONB,
  visibility TEXT DEFAULT 'global' CHECK (visibility IN ('global', 'private')),
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Check-ins (subjective daily check-ins)
CREATE TABLE IF NOT EXISTS check_ins (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 10),
  energy INTEGER CHECK (energy >= 1 AND energy <= 10),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom experiments / interventions
CREATE TABLE IF NOT EXISTS user_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  experiment_type TEXT,
  hypothesis TEXT,
  success_criteria TEXT,
  tracked_metrics TEXT[] DEFAULT '{}',
  min_duration_days INTEGER CHECK (min_duration_days >= 1) DEFAULT 7,
  start_date DATE,
  end_date DATE,
  status TEXT CHECK (status IN ('draft','scheduled','active','completed','aborted')) DEFAULT 'draft',
  created_by_ai BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_experiment_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES user_experiments(id) ON DELETE CASCADE NOT NULL,
  phase TEXT CHECK (phase IN ('pre','during','post')) NOT NULL,
  metrics JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, phase)
);

CREATE TABLE IF NOT EXISTS user_experiment_feedback (
  experiment_id UUID PRIMARY KEY REFERENCES user_experiments(id) ON DELETE CASCADE,
  system_label TEXT CHECK (system_label IN ('promising','neutral','not_helpful')) DEFAULT 'neutral',
  user_label TEXT CHECK (user_label IN ('success','neutral','failure')),
  user_notes TEXT,
  ai_summary TEXT,
  ai_summary_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protocols (available protocol templates)
CREATE TABLE IF NOT EXISTS protocols (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}', -- Defines steps/days
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protocol runs (user's active/completed protocols)
CREATE TABLE IF NOT EXISTS protocol_runs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  protocol_id BIGINT REFERENCES protocols(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  state JSONB DEFAULT '{}' -- Current progress state
);

-- Protocol logs (daily completion tracking)
CREATE TABLE IF NOT EXISTS protocol_logs (
  id BIGSERIAL PRIMARY KEY,
  protocol_run_id BIGINT REFERENCES protocol_runs(id) ON DELETE CASCADE NOT NULL,
  day_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wearable token tables (OAuth tokens for cloud-based wearables)
CREATE TABLE IF NOT EXISTS oura_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Should be encrypted in production
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whoop_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS garmin_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ultrahuman tokens (Ring AIR / M1 CGM)
CREATE TABLE IF NOT EXISTS ultrahuman_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  ultrahuman_user_id TEXT, -- Ultrahuman's user ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw wearable data tables (one per domain)
CREATE TABLE IF NOT EXISTS wearable_raw_sleep (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('oura', 'whoop', 'garmin', 'apple', 'google', 'ultrahuman')),
  provider_id TEXT, -- Their record ID
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  raw JSONB NOT NULL, -- Full provider payload
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wearable_raw_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('oura', 'whoop', 'garmin', 'apple', 'google', 'ultrahuman')),
  provider_id TEXT,
  date DATE NOT NULL,
  raw JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wearable_raw_hr (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('oura', 'whoop', 'garmin', 'apple', 'google', 'ultrahuman')),
  provider_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  raw JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated daily features (key table for AI context)
CREATE TABLE IF NOT EXISTS wearable_features_daily (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  sleep_total_minutes INTEGER,
  sleep_efficiency INTEGER, -- 0-100
  sleep_onset TIME,
  sleep_offset TIME,
  hrv_baseline NUMERIC,
  resting_hr NUMERIC,
  steps INTEGER,
  training_load NUMERIC,
  readiness_score INTEGER, -- 0-100
  source_flags TEXT[] DEFAULT '{}', -- e.g. ["oura", "apple"]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date) -- One row per user per day
);

-- Daily plans (cached AI-generated daily plans)
CREATE TABLE IF NOT EXISTS daily_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  plan JSONB NOT NULL, -- Structured plan with focus, morningActions, afternoonActions, eveningActions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Weekly debriefs (cached AI-generated weekly summaries)
CREATE TABLE IF NOT EXISTS weekly_debriefs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  debrief JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Nudges (smart notifications/reminders)
CREATE TABLE IF NOT EXISTS nudges (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- e.g. 'inactivity', 'bad_sleep', 'hrv_down'
  payload JSONB DEFAULT '{}',
  channel TEXT CHECK (channel IN ('in_app', 'push', 'email')) DEFAULT 'in_app',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_name ON tool_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_date ON health_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON health_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_user_id ON wearable_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Indexes for new Phase 1 tables
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON check_ins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_created ON check_ins(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_experiments_user_id ON user_experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_experiments_status ON user_experiments(status);
CREATE INDEX IF NOT EXISTS idx_user_experiment_windows_experiment_id ON user_experiment_windows(experiment_id);

CREATE INDEX IF NOT EXISTS idx_protocol_runs_user_id ON protocol_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_protocol_runs_status ON protocol_runs(status);
CREATE INDEX IF NOT EXISTS idx_protocol_runs_user_status ON protocol_runs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_protocol_logs_run_id ON protocol_logs(protocol_run_id);
CREATE INDEX IF NOT EXISTS idx_protocol_logs_day ON protocol_logs(protocol_run_id, day_index);

CREATE INDEX IF NOT EXISTS idx_wearable_raw_sleep_user_id ON wearable_raw_sleep(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_raw_sleep_source ON wearable_raw_sleep(source);
CREATE INDEX IF NOT EXISTS idx_wearable_raw_sleep_start_time ON wearable_raw_sleep(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_raw_activity_user_id ON wearable_raw_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_raw_activity_date ON wearable_raw_activity(date DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_raw_hr_user_id ON wearable_raw_hr(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_raw_hr_timestamp ON wearable_raw_hr(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_features_daily_user_id ON wearable_features_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_features_daily_date ON wearable_features_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_features_daily_user_date ON wearable_features_daily(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_plans_user_id ON daily_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_debriefs_user_id ON weekly_debriefs(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_debriefs_week_start ON weekly_debriefs(week_start DESC);

CREATE INDEX IF NOT EXISTS idx_nudges_user_id ON nudges(user_id);
CREATE INDEX IF NOT EXISTS idx_nudges_delivered_at ON nudges(delivered_at);
CREATE INDEX IF NOT EXISTS idx_nudges_user_undelivered ON nudges(user_id, delivered_at) WHERE delivered_at IS NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_womens_health_profiles_updated_at ON womens_health_profiles;
CREATE TRIGGER update_womens_health_profiles_updated_at BEFORE UPDATE ON womens_health_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_health_metrics_updated_at ON health_metrics;
CREATE TRIGGER update_health_metrics_updated_at BEFORE UPDATE ON health_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wearable_devices_updated_at ON wearable_devices;
CREATE TRIGGER update_wearable_devices_updated_at BEFORE UPDATE ON wearable_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_experiments_updated_at ON user_experiments;
CREATE TRIGGER update_user_experiments_updated_at BEFORE UPDATE ON user_experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_experiment_feedback_updated_at ON user_experiment_feedback;
CREATE TRIGGER update_user_experiment_feedback_updated_at BEFORE UPDATE ON user_experiment_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oura_tokens_updated_at ON oura_tokens;
CREATE TRIGGER update_oura_tokens_updated_at BEFORE UPDATE ON oura_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whoop_tokens_updated_at ON whoop_tokens;
CREATE TRIGGER update_whoop_tokens_updated_at BEFORE UPDATE ON whoop_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_garmin_tokens_updated_at ON garmin_tokens;
CREATE TRIGGER update_garmin_tokens_updated_at BEFORE UPDATE ON garmin_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ultrahuman_tokens_updated_at ON ultrahuman_tokens;
CREATE TRIGGER update_ultrahuman_tokens_updated_at BEFORE UPDATE ON ultrahuman_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Care Mode (elderly/family monitoring)
CREATE TABLE IF NOT EXISTS care_mode_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  contacts JSONB DEFAULT '[]', -- Array of {name, email, phone} objects
  check_in_timeout_hours INTEGER DEFAULT 2, -- Hours to wait before alerting contacts
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_mode_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt_sent_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP, -- NULL if not responded
  response_data JSONB, -- User's response if any
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_mode_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  check_in_id UUID REFERENCES care_mode_check_ins(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  alert_sent_at TIMESTAMP NOT NULL,
  alert_type TEXT DEFAULT 'deviation', -- 'deviation', 'no_response'
  alert_data JSONB, -- Details about what triggered the alert
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_mode_check_ins_user_id ON care_mode_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_care_mode_check_ins_prompt_sent ON care_mode_check_ins(prompt_sent_at);
CREATE INDEX IF NOT EXISTS idx_care_mode_alerts_user_id ON care_mode_alerts(user_id);

DROP TRIGGER IF EXISTS update_care_mode_settings_updated_at ON care_mode_settings;
CREATE TRIGGER update_care_mode_settings_updated_at BEFORE UPDATE ON care_mode_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Similarity search helper
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 5,
  target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  chunk TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.user_id,
    d.title,
    d.chunk,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE d.embedding IS NOT NULL
    AND (
      target_user_id IS NULL
      OR d.user_id IS NULL
      OR d.user_id = target_user_id
    )
  ORDER BY d.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
END;
$$;
