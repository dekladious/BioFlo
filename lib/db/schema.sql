-- BioFlo Database Schema
-- For Postgres (Neon, Supabase, or Railway)

-- Users table (extends Clerk user data)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT,
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_metrics_updated_at BEFORE UPDATE ON health_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wearable_devices_updated_at BEFORE UPDATE ON wearable_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

