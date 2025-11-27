/**
 * Wearable Integration Types
 * 
 * Types for wearable device connections and health metrics
 */

// ============================================================================
// Device Types
// ============================================================================

export type WearableProvider = 'ultrahuman' | 'oura' | 'whoop' | 'apple_health' | 'garmin' | 'fitbit';

export type ConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error' | 'expired';

export interface WearableDevice {
  id: string;
  userId: string;
  provider: WearableProvider;
  deviceName?: string;
  status: ConnectionStatus;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  lastSyncAt?: string;
  syncFrequencyMinutes: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Health Metrics Types
// ============================================================================

export interface SleepData {
  date: string;
  totalMinutes: number;
  deepSleepMinutes: number;
  remSleepMinutes: number;
  lightSleepMinutes: number;
  awakeMinutes: number;
  sleepEfficiency: number; // 0-100
  sleepScore?: number; // Provider's sleep score (0-100)
  bedtime: string;
  wakeTime: string;
  latencyMinutes?: number; // Time to fall asleep
  disturbances?: number;
}

export interface HrvData {
  date: string;
  avgHrv: number; // ms
  minHrv?: number;
  maxHrv?: number;
  rmssd?: number;
  sdnn?: number;
  nightlyAvg?: number;
  morningReadiness?: number;
}

export interface HeartRateData {
  date: string;
  restingHr: number; // bpm
  avgHr: number;
  minHr: number;
  maxHr: number;
  hrZones?: {
    zone1Minutes: number; // Rest
    zone2Minutes: number; // Fat burn
    zone3Minutes: number; // Cardio
    zone4Minutes: number; // Peak
  };
}

export interface ActivityData {
  date: string;
  steps: number;
  activeMinutes: number;
  caloriesBurned: number;
  distance?: number; // meters
  floors?: number;
  workouts: {
    type: string;
    durationMinutes: number;
    caloriesBurned: number;
    avgHr?: number;
    maxHr?: number;
  }[];
}

export interface ReadinessData {
  date: string;
  score: number; // 0-100
  contributors: {
    sleepBalance?: number;
    previousNightSleep?: number;
    activityBalance?: number;
    bodyTemperature?: number;
    hrvBalance?: number;
    recoveryIndex?: number;
    restingHeartRate?: number;
  };
  recommendation?: string;
}

export interface BodyMetrics {
  date: string;
  weight?: number; // kg
  bodyFatPercentage?: number;
  muscleMass?: number; // kg
  waterPercentage?: number;
  boneMass?: number; // kg
  visceralFat?: number;
  metabolicAge?: number;
  bmr?: number; // kcal
}

// ============================================================================
// Daily Summary
// ============================================================================

export interface DailyHealthSummary {
  date: string;
  provider: WearableProvider;
  sleep?: SleepData;
  hrv?: HrvData;
  heartRate?: HeartRateData;
  activity?: ActivityData;
  readiness?: ReadinessData;
  bodyMetrics?: BodyMetrics;
  syncedAt: string;
}

// ============================================================================
// Provider-Specific Types (Ultrahuman)
// ============================================================================

export interface UltrahumanMetrics {
  date: string;
  movementIndex: number;
  sleepIndex: number;
  recoveryScore: number;
  readinessScore: number;
  hrvScore: number;
  restingHr: number;
  bodyBattery?: number;
  stressScore?: number;
  skinTemperature?: number;
  bloodOxygen?: number;
}

// ============================================================================
// Sync & Integration Types
// ============================================================================

export interface SyncResult {
  success: boolean;
  provider: WearableProvider;
  syncedAt: string;
  daysProcessed: number;
  errors?: string[];
  metrics?: {
    sleep: number;
    hrv: number;
    activity: number;
    readiness: number;
  };
}

export interface IntegrationConfig {
  provider: WearableProvider;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getProviderDisplayName(provider: WearableProvider): string {
  const names: Record<WearableProvider, string> = {
    ultrahuman: 'Ultrahuman',
    oura: 'Oura Ring',
    whoop: 'WHOOP',
    apple_health: 'Apple Health',
    garmin: 'Garmin',
    fitbit: 'Fitbit',
  };
  return names[provider];
}

export function getProviderIcon(provider: WearableProvider): string {
  const icons: Record<WearableProvider, string> = {
    ultrahuman: '💍',
    oura: '💍',
    whoop: '⌚',
    apple_health: '🍎',
    garmin: '⌚',
    fitbit: '⌚',
  };
  return icons[provider];
}

export function calculateSleepQuality(sleep: SleepData): number {
  // Simple sleep quality calculation
  const efficiencyScore = sleep.sleepEfficiency * 0.4;
  const durationScore = Math.min(sleep.totalMinutes / 480, 1) * 100 * 0.3; // 8 hours optimal
  const deepSleepScore = Math.min(sleep.deepSleepMinutes / 90, 1) * 100 * 0.15; // 90 min optimal
  const remScore = Math.min(sleep.remSleepMinutes / 120, 1) * 100 * 0.15; // 2 hours optimal
  
  return Math.round(efficiencyScore + durationScore + deepSleepScore + remScore);
}

export function getReadinessLabel(score: number): string {
  if (score >= 85) return 'Optimal';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Low';
  return 'Poor';
}

export function getReadinessColor(score: number): string {
  if (score >= 85) return 'text-green-400';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  if (score >= 30) return 'text-orange-400';
  return 'text-red-400';
}

