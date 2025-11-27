/**
 * Ultrahuman API Client
 * 
 * Handles OAuth token management and API requests to Ultrahuman
 */

import { query, queryOne } from "@/lib/db/client";
import { ULTRAHUMAN_CONFIG, ULTRAHUMAN_ENDPOINTS, getUltrahumanCredentials } from "./config";
import type {
  UltrahumanTokenResponse,
  UltrahumanTokenRecord,
  UltrahumanProfile,
  UltrahumanSleepData,
  UltrahumanRecoveryData,
  UltrahumanHeartRateData,
  UltrahumanHrvData,
  UltrahumanActivityData,
  UltrahumanTemperatureData,
  UltrahumanGlucoseData,
  UltrahumanDailySummary,
  UltrahumanApiResponse,
} from "./types";

// ============================================
// Token Management
// ============================================

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<UltrahumanTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getUltrahumanCredentials();

  const response = await fetch(ULTRAHUMAN_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<UltrahumanTokenResponse> {
  const { clientId, clientSecret } = getUltrahumanCredentials();

  const response = await fetch(ULTRAHUMAN_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Save tokens to database
 */
export async function saveTokens(
  userId: string,
  tokens: UltrahumanTokenResponse,
  ultrahumanUserId?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const scopes = tokens.scope.split(" ");

  await query(
    `INSERT INTO ultrahuman_tokens (user_id, access_token, refresh_token, expires_at, scopes, ultrahuman_user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       expires_at = EXCLUDED.expires_at,
       scopes = EXCLUDED.scopes,
       ultrahuman_user_id = COALESCE(EXCLUDED.ultrahuman_user_id, ultrahuman_tokens.ultrahuman_user_id),
       updated_at = NOW()`,
    [userId, tokens.access_token, tokens.refresh_token, expiresAt, scopes, ultrahumanUserId]
  );

  // Also update wearable_devices table
  await query(
    `INSERT INTO wearable_devices (user_id, device_type, device_name, is_active, last_sync_at)
     VALUES ($1, 'ultrahuman', 'Ultrahuman Ring', true, NOW())
     ON CONFLICT (user_id, device_type) DO UPDATE SET
       is_active = true,
       updated_at = NOW()`,
    [userId]
  );
}

/**
 * Get tokens from database
 */
export async function getTokens(userId: string): Promise<UltrahumanTokenRecord | null> {
  return queryOne<UltrahumanTokenRecord>(
    "SELECT * FROM ultrahuman_tokens WHERE user_id = $1",
    [userId]
  );
}

/**
 * Delete tokens (disconnect device)
 */
export async function deleteTokens(userId: string): Promise<void> {
  await query("DELETE FROM ultrahuman_tokens WHERE user_id = $1", [userId]);
  await query(
    "UPDATE wearable_devices SET is_active = false WHERE user_id = $1 AND device_type = 'ultrahuman'",
    [userId]
  );
}

/**
 * Get valid access token (refreshes if needed)
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokens = await getTokens(userId);
  if (!tokens) return null;

  // Check if token needs refresh (1 hour buffer)
  const expiresAt = new Date(tokens.expires_at);
  const needsRefresh = expiresAt.getTime() - Date.now() < ULTRAHUMAN_CONFIG.tokenRefreshBufferMs;

  if (needsRefresh && tokens.refresh_token) {
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      await saveTokens(userId, newTokens, tokens.ultrahuman_user_id);
      return newTokens.access_token;
    } catch (error) {
      console.error("Failed to refresh Ultrahuman token:", error);
      return null;
    }
  }

  return tokens.access_token;
}

// ============================================
// API Requests
// ============================================

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  accessToken: string,
  endpoint: string,
  params?: Record<string, string>
): Promise<UltrahumanApiResponse<T>> {
  const url = new URL(`${ULTRAHUMAN_CONFIG.baseUrl}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      return { success: false, error: { code: "UNAUTHORIZED", message: "Token expired or invalid" } };
    }

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: { code: "API_ERROR", message: error } };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: { code: "NETWORK_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
    };
  }
}

// ============================================
// Data Fetching Methods
// ============================================

/**
 * Get user profile
 */
export async function getProfile(accessToken: string): Promise<UltrahumanProfile | null> {
  const response = await apiRequest<UltrahumanProfile>(accessToken, ULTRAHUMAN_ENDPOINTS.profile);
  return response.success ? response.data ?? null : null;
}

/**
 * Get sleep data for a specific date
 */
export async function getSleepData(
  accessToken: string,
  date: string
): Promise<UltrahumanSleepData | null> {
  const response = await apiRequest<UltrahumanSleepData>(accessToken, ULTRAHUMAN_ENDPOINTS.sleep, { date });
  return response.success ? response.data ?? null : null;
}

/**
 * Get recovery data for a specific date
 */
export async function getRecoveryData(
  accessToken: string,
  date: string
): Promise<UltrahumanRecoveryData | null> {
  const response = await apiRequest<UltrahumanRecoveryData>(accessToken, ULTRAHUMAN_ENDPOINTS.recovery, { date });
  return response.success ? response.data ?? null : null;
}

/**
 * Get heart rate data for a specific date
 */
export async function getHeartRateData(
  accessToken: string,
  date: string
): Promise<UltrahumanHeartRateData | null> {
  const response = await apiRequest<UltrahumanHeartRateData>(accessToken, ULTRAHUMAN_ENDPOINTS.heartRate, { date });
  return response.success ? response.data ?? null : null;
}

/**
 * Get HRV data for a specific date
 */
export async function getHrvData(
  accessToken: string,
  date: string
): Promise<UltrahumanHrvData | null> {
  const response = await apiRequest<UltrahumanHrvData>(accessToken, ULTRAHUMAN_ENDPOINTS.hrv, { date });
  return response.success ? response.data ?? null : null;
}

/**
 * Get activity data for a specific date
 */
export async function getActivityData(
  accessToken: string,
  date: string
): Promise<UltrahumanActivityData | null> {
  const response = await apiRequest<UltrahumanActivityData>(accessToken, ULTRAHUMAN_ENDPOINTS.activity, { date });
  return response.success ? response.data ?? null : null;
}

/**
 * Get temperature data for a specific date
 */
export async function getTemperatureData(
  accessToken: string,
  date: string
): Promise<UltrahumanTemperatureData | null> {
  const response = await apiRequest<UltrahumanTemperatureData>(accessToken, ULTRAHUMAN_ENDPOINTS.temperature, { date });
  return response.success ? response.data ?? null : null;
}

/**
 * Get glucose data for a specific date (requires CGM)
 */
export async function getGlucoseData(
  accessToken: string,
  date: string
): Promise<UltrahumanGlucoseData | null> {
  const response = await apiRequest<UltrahumanGlucoseData>(accessToken, ULTRAHUMAN_ENDPOINTS.glucose, { date });
  return response.success ? response.data ?? null : null;
}

/**
 * Fetch all data for a specific date and combine into summary
 */
export async function fetchDailySummary(
  accessToken: string,
  date: string
): Promise<UltrahumanDailySummary> {
  // Fetch all data in parallel
  const [sleep, recovery, heartRate, hrv, activity, temperature] = await Promise.all([
    getSleepData(accessToken, date),
    getRecoveryData(accessToken, date),
    getHeartRateData(accessToken, date),
    getHrvData(accessToken, date),
    getActivityData(accessToken, date),
    getTemperatureData(accessToken, date),
  ]);

  // Combine into summary
  const summary: UltrahumanDailySummary = {
    date,
    // Sleep
    sleep_total_minutes: sleep?.total_sleep_minutes,
    sleep_efficiency: sleep?.sleep_efficiency,
    sleep_score: sleep?.sleep_score,
    sleep_onset: sleep?.sleep_start,
    sleep_offset: sleep?.sleep_end,
    deep_sleep_minutes: sleep?.deep_sleep_minutes,
    rem_sleep_minutes: sleep?.rem_sleep_minutes,
    light_sleep_minutes: sleep?.light_sleep_minutes,
    // HRV
    hrv_rmssd: hrv?.hrv_rmssd ?? sleep?.hrv_rmssd,
    hrv_average: hrv?.hrv_average ?? sleep?.hrv_average,
    // Heart Rate
    resting_heart_rate: heartRate?.resting_heart_rate ?? sleep?.resting_heart_rate,
    avg_heart_rate: heartRate?.avg_heart_rate ?? sleep?.avg_heart_rate,
    // Activity
    steps: activity?.steps,
    active_calories: activity?.active_calories,
    active_minutes: activity?.active_minutes,
    movement_index: activity?.movement_index,
    // Recovery
    recovery_score: recovery?.recovery_score,
    readiness_score: recovery?.readiness_score,
    // Temperature
    skin_temperature_deviation: temperature?.skin_temperature_deviation,
  };

  return summary;
}

/**
 * Sync data for a user for a specific date range
 */
export async function syncUserData(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; daysProcessed: number; error?: string }> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return { success: false, daysProcessed: 0, error: "No valid access token" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  let daysProcessed = 0;

  try {
    // Process each day
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      const summary = await fetchDailySummary(accessToken, dateStr);

      // Store in wearable_features_daily
      await query(
        `INSERT INTO wearable_features_daily (
          user_id, date, sleep_total_minutes, sleep_efficiency, sleep_onset, sleep_offset,
          hrv_baseline, resting_hr, steps, readiness_score, source_flags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (user_id, date) DO UPDATE SET
          sleep_total_minutes = COALESCE(EXCLUDED.sleep_total_minutes, wearable_features_daily.sleep_total_minutes),
          sleep_efficiency = COALESCE(EXCLUDED.sleep_efficiency, wearable_features_daily.sleep_efficiency),
          sleep_onset = COALESCE(EXCLUDED.sleep_onset, wearable_features_daily.sleep_onset),
          sleep_offset = COALESCE(EXCLUDED.sleep_offset, wearable_features_daily.sleep_offset),
          hrv_baseline = COALESCE(EXCLUDED.hrv_baseline, wearable_features_daily.hrv_baseline),
          resting_hr = COALESCE(EXCLUDED.resting_hr, wearable_features_daily.resting_hr),
          steps = COALESCE(EXCLUDED.steps, wearable_features_daily.steps),
          readiness_score = COALESCE(EXCLUDED.readiness_score, wearable_features_daily.readiness_score),
          source_flags = array_cat(wearable_features_daily.source_flags, EXCLUDED.source_flags)`,
        [
          userId,
          dateStr,
          summary.sleep_total_minutes,
          summary.sleep_efficiency,
          summary.sleep_onset,
          summary.sleep_offset,
          summary.hrv_rmssd,
          summary.resting_heart_rate,
          summary.steps,
          summary.readiness_score ?? summary.recovery_score,
          ["ultrahuman"],
        ]
      );

      // Store in health_metrics for backwards compatibility
      await query(
        `INSERT INTO health_metrics (
          user_id, date, source,
          sleep_duration_minutes, sleep_quality_score, sleep_deep_minutes, sleep_rem_minutes, sleep_light_minutes,
          hrv_rmssd_ms, resting_heart_rate, steps, active_calories, active_minutes,
          recovery_score, readiness_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (user_id, date, source) DO UPDATE SET
          sleep_duration_minutes = COALESCE(EXCLUDED.sleep_duration_minutes, health_metrics.sleep_duration_minutes),
          sleep_quality_score = COALESCE(EXCLUDED.sleep_quality_score, health_metrics.sleep_quality_score),
          sleep_deep_minutes = COALESCE(EXCLUDED.sleep_deep_minutes, health_metrics.sleep_deep_minutes),
          sleep_rem_minutes = COALESCE(EXCLUDED.sleep_rem_minutes, health_metrics.sleep_rem_minutes),
          sleep_light_minutes = COALESCE(EXCLUDED.sleep_light_minutes, health_metrics.sleep_light_minutes),
          hrv_rmssd_ms = COALESCE(EXCLUDED.hrv_rmssd_ms, health_metrics.hrv_rmssd_ms),
          resting_heart_rate = COALESCE(EXCLUDED.resting_heart_rate, health_metrics.resting_heart_rate),
          steps = COALESCE(EXCLUDED.steps, health_metrics.steps),
          active_calories = COALESCE(EXCLUDED.active_calories, health_metrics.active_calories),
          active_minutes = COALESCE(EXCLUDED.active_minutes, health_metrics.active_minutes),
          recovery_score = COALESCE(EXCLUDED.recovery_score, health_metrics.recovery_score),
          readiness_score = COALESCE(EXCLUDED.readiness_score, health_metrics.readiness_score),
          updated_at = NOW()`,
        [
          userId,
          dateStr,
          "ultrahuman",
          summary.sleep_total_minutes,
          summary.sleep_score,
          summary.deep_sleep_minutes,
          summary.rem_sleep_minutes,
          summary.light_sleep_minutes,
          summary.hrv_rmssd,
          summary.resting_heart_rate,
          summary.steps,
          summary.active_calories,
          summary.active_minutes,
          summary.recovery_score,
          summary.readiness_score,
        ]
      );

      daysProcessed++;
      current.setDate(current.getDate() + 1);
    }

    // Update last sync time
    await query(
      "UPDATE wearable_devices SET last_sync_at = NOW() WHERE user_id = $1 AND device_type = 'ultrahuman'",
      [userId]
    );

    return { success: true, daysProcessed };
  } catch (error) {
    console.error("Error syncing Ultrahuman data:", error);
    return {
      success: false,
      daysProcessed,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if user has Ultrahuman connected
 */
export async function isConnected(userId: string): Promise<boolean> {
  const tokens = await getTokens(userId);
  return tokens !== null;
}

/**
 * Get connection status
 */
export async function getConnectionStatus(userId: string): Promise<{
  connected: boolean;
  lastSync?: Date;
  expiresAt?: Date;
}> {
  const tokens = await getTokens(userId);
  if (!tokens) {
    return { connected: false };
  }

  const device = await queryOne<{ last_sync_at: Date }>(
    "SELECT last_sync_at FROM wearable_devices WHERE user_id = $1 AND device_type = 'ultrahuman'",
    [userId]
  );

  return {
    connected: true,
    lastSync: device?.last_sync_at,
    expiresAt: new Date(tokens.expires_at),
  };
}

