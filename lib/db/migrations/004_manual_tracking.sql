-- Migration: Manual health tracking and workout/habit/supplement tables
-- Description: Adds support for users without wearables + workout/habit/supplement tracking

-- ============================================
-- 1. Add manual health entry fields to health_metrics
-- ============================================
ALTER TABLE health_metrics 
ADD COLUMN IF NOT EXISTS blood_pressure_systolic INTEGER,
ADD COLUMN IF NOT EXISTS blood_pressure_diastolic INTEGER,
ADD COLUMN IF NOT EXISTS blood_glucose_mg_dl DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS blood_oxygen_percent DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS temperature_celsius DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS hydration_ml INTEGER,
ADD COLUMN IF NOT EXISTS caffeine_mg INTEGER,
ADD COLUMN IF NOT EXISTS alcohol_units DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS meditation_minutes INTEGER,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 2. Workouts tracking
-- ============================================
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  workout_type TEXT CHECK (workout_type IN ('strength', 'cardio', 'hiit', 'yoga', 'mobility', 'sports', 'other')) DEFAULT 'strength',
  duration_minutes INTEGER,
  calories_burned INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  muscle_group TEXT,
  order_index INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight_kg DECIMAL(6,2),
  duration_seconds INTEGER, -- For timed exercises
  distance_meters INTEGER, -- For cardio
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Habits tracking
-- ============================================
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('health', 'fitness', 'nutrition', 'mindfulness', 'sleep', 'productivity', 'other')) DEFAULT 'health',
  frequency TEXT CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'weekly', 'custom')) DEFAULT 'daily',
  target_count INTEGER DEFAULT 1, -- How many times per frequency period
  reminder_time TIME,
  icon TEXT, -- Emoji or icon name
  color TEXT, -- Hex color for UI
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  UNIQUE(habit_id, completed_date) -- One completion per day
);

-- ============================================
-- 4. Supplements tracking
-- ============================================
CREATE TABLE IF NOT EXISTS user_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  dosage TEXT, -- e.g., "500mg", "2 capsules"
  timing TEXT CHECK (timing IN ('morning', 'afternoon', 'evening', 'with_meals', 'before_bed', 'as_needed')) DEFAULT 'morning',
  frequency TEXT CHECK (frequency IN ('daily', 'twice_daily', 'weekly', 'as_needed')) DEFAULT 'daily',
  purpose TEXT, -- What it's for
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id UUID REFERENCES user_supplements(id) ON DELETE CASCADE NOT NULL,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- ============================================
-- 5. Nutrition/Meals tracking
-- ============================================
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) NOT NULL,
  name TEXT,
  description TEXT,
  calories INTEGER,
  protein_g DECIMAL(6,2),
  carbs_g DECIMAL(6,2),
  fat_g DECIMAL(6,2),
  fiber_g DECIMAL(6,2),
  sugar_g DECIMAL(6,2),
  sodium_mg DECIMAL(7,2),
  image_url TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. Water/Hydration tracking
-- ============================================
CREATE TABLE IF NOT EXISTS hydration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount_ml INTEGER NOT NULL,
  beverage_type TEXT DEFAULT 'water', -- 'water', 'coffee', 'tea', 'other'
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. User data input preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_data_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  has_wearable BOOLEAN DEFAULT FALSE,
  primary_wearable TEXT, -- 'ultrahuman', 'oura', 'whoop', 'apple', 'garmin', 'none'
  manual_entry_enabled BOOLEAN DEFAULT TRUE,
  preferred_units TEXT CHECK (preferred_units IN ('metric', 'imperial')) DEFAULT 'metric',
  ai_data_collection_enabled BOOLEAN DEFAULT TRUE, -- Allow AI to ask questions and log data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON habits(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completed_date);

CREATE INDEX IF NOT EXISTS idx_user_supplements_user_id ON user_supplements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_supplements_active ON user_supplements(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_supplement_logs_supplement_id ON supplement_logs(supplement_id);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_taken_at ON supplement_logs(taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_logged_at ON meals(logged_at DESC);
-- Index on meals by user and date (use logged_at directly, query with date range)
CREATE INDEX IF NOT EXISTS idx_meals_user_logged ON meals(user_id, logged_at);

CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_id ON hydration_logs(user_id);
-- Index on hydration by user and date (use logged_at directly, query with date range)
CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_logged ON hydration_logs(user_id, logged_at);

-- ============================================
-- Triggers
-- ============================================
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_supplements_updated_at ON user_supplements;
CREATE TRIGGER update_user_supplements_updated_at BEFORE UPDATE ON user_supplements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_data_settings_updated_at ON user_data_settings;
CREATE TRIGGER update_user_data_settings_updated_at BEFORE UPDATE ON user_data_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

