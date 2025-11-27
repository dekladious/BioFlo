/**
 * Ultrahuman API Response Types
 * 
 * These types map to the Ultrahuman Partner API responses
 */

// OAuth Token Response
export interface UltrahumanTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number; // seconds
  scope: string;
}

// User Profile
export interface UltrahumanProfile {
  id: string;
  email?: string;
  name?: string;
  timezone?: string;
  created_at?: string;
}

// Sleep Data
export interface UltrahumanSleepData {
  date: string; // YYYY-MM-DD
  sleep_start: string; // ISO timestamp
  sleep_end: string; // ISO timestamp
  total_sleep_minutes: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  light_sleep_minutes: number;
  awake_minutes: number;
  sleep_efficiency: number; // 0-100
  sleep_score: number; // 0-100
  sleep_latency_minutes?: number;
  times_awake?: number;
  // HRV during sleep
  hrv_average?: number;
  hrv_rmssd?: number;
  // HR during sleep
  resting_heart_rate?: number;
  avg_heart_rate?: number;
  min_heart_rate?: number;
  max_heart_rate?: number;
  // Temperature
  skin_temperature_deviation?: number;
  // Respiratory
  respiratory_rate?: number;
  // Raw stages data
  stages?: Array<{
    stage: "deep" | "rem" | "light" | "awake";
    start: string;
    end: string;
  }>;
}

// Recovery/Readiness
export interface UltrahumanRecoveryData {
  date: string;
  recovery_score: number; // 0-100
  recovery_level: "poor" | "fair" | "good" | "excellent";
  readiness_score?: number; // 0-100
  // Contributing factors
  sleep_score_contribution?: number;
  hrv_contribution?: number;
  activity_contribution?: number;
  // Recommendations
  recommended_strain?: "low" | "moderate" | "high";
}

// Heart Rate Data
export interface UltrahumanHeartRateData {
  date: string;
  resting_heart_rate: number;
  avg_heart_rate: number;
  min_heart_rate: number;
  max_heart_rate: number;
  // Intraday samples (optional, may be summarized)
  samples?: Array<{
    timestamp: string;
    bpm: number;
  }>;
}

// HRV Data
export interface UltrahumanHrvData {
  date: string;
  hrv_rmssd: number; // Root Mean Square of Successive Differences
  hrv_sdnn?: number; // Standard Deviation of NN intervals
  hrv_average: number;
  hrv_baseline?: number; // User's baseline HRV
  hrv_deviation?: number; // Deviation from baseline
  // Trend
  hrv_7day_avg?: number;
  hrv_30day_avg?: number;
}

// Activity Data
export interface UltrahumanActivityData {
  date: string;
  steps: number;
  active_calories: number;
  total_calories: number;
  active_minutes: number;
  distance_meters?: number;
  floors_climbed?: number;
  movement_index?: number; // 0-100
  // Activity breakdown
  sedentary_minutes?: number;
  lightly_active_minutes?: number;
  fairly_active_minutes?: number;
  very_active_minutes?: number;
  // Workouts
  workouts?: Array<{
    type: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    calories: number;
  }>;
}

// Temperature Data
export interface UltrahumanTemperatureData {
  date: string;
  skin_temperature_avg: number;
  skin_temperature_deviation: number; // Deviation from baseline
  skin_temperature_min?: number;
  skin_temperature_max?: number;
}

// CGM / Glucose Data
export interface UltrahumanGlucoseData {
  date: string;
  avg_glucose_mgdl: number;
  glucose_variability: number; // percentage
  time_in_range: number; // percentage (70-140 mg/dL)
  time_below_range?: number;
  time_above_range?: number;
  estimated_hba1c?: number;
  min_glucose?: number;
  max_glucose?: number;
  // Intraday readings
  readings?: Array<{
    timestamp: string;
    glucose_mgdl: number;
  }>;
}

// Metabolic & VO2 Max
export interface UltrahumanMetabolicData {
  date: string;
  metabolic_score?: number; // 0-100
  vo2_max?: number; // mL/kg/min
  vo2_max_level?: "poor" | "fair" | "good" | "excellent";
}

// Combined Daily Summary (what we'll store in wearable_features_daily)
export interface UltrahumanDailySummary {
  date: string;
  // Sleep
  sleep_total_minutes?: number;
  sleep_efficiency?: number;
  sleep_score?: number;
  sleep_onset?: string;
  sleep_offset?: string;
  deep_sleep_minutes?: number;
  rem_sleep_minutes?: number;
  light_sleep_minutes?: number;
  // HRV
  hrv_rmssd?: number;
  hrv_average?: number;
  // Heart Rate
  resting_heart_rate?: number;
  avg_heart_rate?: number;
  // Activity
  steps?: number;
  active_calories?: number;
  active_minutes?: number;
  movement_index?: number;
  // Recovery
  recovery_score?: number;
  readiness_score?: number;
  // Temperature
  skin_temperature_deviation?: number;
  // Metabolic
  metabolic_score?: number;
  vo2_max?: number;
  // Glucose (if CGM)
  avg_glucose?: number;
  glucose_variability?: number;
  time_in_range?: number;
}

// API Response wrapper
export interface UltrahumanApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Database token record
export interface UltrahumanTokenRecord {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  scopes: string[];
  ultrahuman_user_id?: string;
  created_at: Date;
  updated_at: Date;
}

