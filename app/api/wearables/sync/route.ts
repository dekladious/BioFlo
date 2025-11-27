/**
 * Wearable Sync API Route
 * 
 * POST /api/wearables/sync - Trigger a manual sync
 * GET /api/wearables/sync - Get sync status
 */

import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";
import type { WearableProvider, SyncResult, DailyHealthSummary } from "@/lib/types/wearable";

export const runtime = "nodejs";

// Mock data generator for demo purposes
function generateMockHealthData(provider: WearableProvider, date: string): DailyHealthSummary {
  const baseReadiness = 60 + Math.random() * 30;
  const baseSleepMinutes = 360 + Math.random() * 120;
  
  return {
    date,
    provider,
    sleep: {
      date,
      totalMinutes: Math.round(baseSleepMinutes),
      deepSleepMinutes: Math.round(baseSleepMinutes * 0.15 + Math.random() * 30),
      remSleepMinutes: Math.round(baseSleepMinutes * 0.22 + Math.random() * 20),
      lightSleepMinutes: Math.round(baseSleepMinutes * 0.5),
      awakeMinutes: Math.round(10 + Math.random() * 30),
      sleepEfficiency: Math.round(85 + Math.random() * 12),
      sleepScore: Math.round(70 + Math.random() * 25),
      bedtime: "22:30",
      wakeTime: "06:30",
      latencyMinutes: Math.round(5 + Math.random() * 20),
      disturbances: Math.round(1 + Math.random() * 4),
    },
    hrv: {
      date,
      avgHrv: Math.round(45 + Math.random() * 35),
      minHrv: Math.round(30 + Math.random() * 20),
      maxHrv: Math.round(80 + Math.random() * 40),
      nightlyAvg: Math.round(50 + Math.random() * 30),
      morningReadiness: Math.round(baseReadiness),
    },
    heartRate: {
      date,
      restingHr: Math.round(52 + Math.random() * 15),
      avgHr: Math.round(65 + Math.random() * 15),
      minHr: Math.round(45 + Math.random() * 10),
      maxHr: Math.round(120 + Math.random() * 40),
    },
    activity: {
      date,
      steps: Math.round(5000 + Math.random() * 10000),
      activeMinutes: Math.round(30 + Math.random() * 60),
      caloriesBurned: Math.round(1800 + Math.random() * 800),
      distance: Math.round(3000 + Math.random() * 8000),
      workouts: [],
    },
    readiness: {
      date,
      score: Math.round(baseReadiness),
      contributors: {
        sleepBalance: Math.round(70 + Math.random() * 25),
        previousNightSleep: Math.round(65 + Math.random() * 30),
        activityBalance: Math.round(60 + Math.random() * 35),
        hrvBalance: Math.round(70 + Math.random() * 25),
        recoveryIndex: Math.round(65 + Math.random() * 30),
      },
      recommendation: baseReadiness >= 75 
        ? "Your recovery is strong. Good day for challenging workouts."
        : baseReadiness >= 55
        ? "Moderate recovery. Keep training moderate intensity."
        : "Focus on recovery today. Light movement recommended.",
    },
    syncedAt: new Date().toISOString(),
  };
}

// ============================================================================
// POST: Trigger manual sync
// ============================================================================

export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { provider, daysToSync = 7 } = body as {
      provider?: WearableProvider;
      daysToSync?: number;
    };

    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Get connected device(s)
    const deviceQuery = provider
      ? "SELECT id, device_type FROM wearable_devices WHERE user_id = $1 AND device_type = $2 AND connected = true"
      : "SELECT id, device_type FROM wearable_devices WHERE user_id = $1 AND connected = true";
    
    const params = provider ? [user.id, provider] : [user.id];
    const devices = await query<{ id: string; device_type: string }>(deviceQuery, params);

    if (devices.length === 0) {
      return createErrorResponse("No connected devices found", requestId, 404);
    }

    const syncResults: SyncResult[] = [];

    for (const device of devices) {
      const deviceProvider = device.device_type as WearableProvider;
      
      // In production, this would call the actual provider API
      // For now, we generate mock data
      const today = new Date();
      let daysProcessed = 0;
      const errors: string[] = [];

      for (let i = 0; i < daysToSync; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        try {
          const healthData = generateMockHealthData(deviceProvider, dateStr);

          // Save to database
          await query(
            `INSERT INTO wearable_features_daily (
              user_id, date, provider, 
              readiness_score, sleep_score, sleep_total_minutes, sleep_deep_minutes, sleep_rem_minutes,
              hrv_avg, hrv_min, hrv_max, resting_hr, avg_hr,
              steps, active_minutes, calories_burned,
              synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
            ON CONFLICT (user_id, date) DO UPDATE SET
              readiness_score = EXCLUDED.readiness_score,
              sleep_score = EXCLUDED.sleep_score,
              sleep_total_minutes = EXCLUDED.sleep_total_minutes,
              sleep_deep_minutes = EXCLUDED.sleep_deep_minutes,
              sleep_rem_minutes = EXCLUDED.sleep_rem_minutes,
              hrv_avg = EXCLUDED.hrv_avg,
              hrv_min = EXCLUDED.hrv_min,
              hrv_max = EXCLUDED.hrv_max,
              resting_hr = EXCLUDED.resting_hr,
              avg_hr = EXCLUDED.avg_hr,
              steps = EXCLUDED.steps,
              active_minutes = EXCLUDED.active_minutes,
              calories_burned = EXCLUDED.calories_burned,
              synced_at = NOW()`,
            [
              user.id,
              dateStr,
              deviceProvider,
              healthData.readiness?.score,
              healthData.sleep?.sleepScore,
              healthData.sleep?.totalMinutes,
              healthData.sleep?.deepSleepMinutes,
              healthData.sleep?.remSleepMinutes,
              healthData.hrv?.avgHrv,
              healthData.hrv?.minHrv,
              healthData.hrv?.maxHrv,
              healthData.heartRate?.restingHr,
              healthData.heartRate?.avgHr,
              healthData.activity?.steps,
              healthData.activity?.activeMinutes,
              healthData.activity?.caloriesBurned,
            ]
          );

          daysProcessed++;
        } catch (err) {
          errors.push(`Failed to sync ${dateStr}: ${err}`);
        }
      }

      // Update device last sync time
      await query(
        "UPDATE wearable_devices SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1",
        [device.id]
      );

      syncResults.push({
        success: errors.length === 0,
        provider: deviceProvider,
        syncedAt: new Date().toISOString(),
        daysProcessed,
        errors: errors.length > 0 ? errors : undefined,
        metrics: {
          sleep: daysProcessed,
          hrv: daysProcessed,
          activity: daysProcessed,
          readiness: daysProcessed,
        },
      });
    }

    logger.info("Wearable sync completed", { 
      userId, 
      devicesProcessed: devices.length, 
      totalDays: syncResults.reduce((sum, r) => sum + r.daysProcessed, 0),
      requestId 
    });

    return Response.json({
      success: true,
      data: {
        results: syncResults,
        summary: {
          devicesProcessed: devices.length,
          totalDaysProcessed: syncResults.reduce((sum, r) => sum + r.daysProcessed, 0),
          hasErrors: syncResults.some(r => r.errors && r.errors.length > 0),
        },
      },
      requestId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("Wearable sync error", error);
    return createErrorResponse("Failed to sync wearable data", requestId, 500);
  }
}

// ============================================================================
// GET: Get sync status and latest data
// ============================================================================

export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "7");

    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return Response.json({
        success: true,
        data: {
          hasData: false,
          dailyData: [],
          latestReadiness: null,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Get daily health data
    const dailyData = await query<{
      date: string;
      provider: string;
      readiness_score: number | null;
      sleep_score: number | null;
      sleep_total_minutes: number | null;
      hrv_avg: number | null;
      resting_hr: number | null;
      steps: number | null;
      active_minutes: number | null;
      synced_at: string;
    }>(
      `SELECT date, provider, readiness_score, sleep_score, sleep_total_minutes, 
              hrv_avg, resting_hr, steps, active_minutes, synced_at
       FROM wearable_features_daily
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date DESC`,
      [user.id]
    );

    const formattedData = dailyData.map(d => ({
      date: d.date,
      provider: d.provider,
      readinessScore: d.readiness_score,
      sleepScore: d.sleep_score,
      sleepMinutes: d.sleep_total_minutes,
      hrvAvg: d.hrv_avg,
      restingHr: d.resting_hr,
      steps: d.steps,
      activeMinutes: d.active_minutes,
      syncedAt: d.synced_at,
    }));

    const latestReadiness = formattedData[0]?.readinessScore || null;

    return Response.json({
      success: true,
      data: {
        hasData: dailyData.length > 0,
        dailyData: formattedData,
        latestReadiness,
        averages: dailyData.length > 0 ? {
          readiness: Math.round(dailyData.reduce((s, d) => s + (d.readiness_score || 0), 0) / dailyData.length),
          sleep: Math.round(dailyData.reduce((s, d) => s + (d.sleep_score || 0), 0) / dailyData.length),
          hrv: Math.round(dailyData.reduce((s, d) => s + (d.hrv_avg || 0), 0) / dailyData.length),
          steps: Math.round(dailyData.reduce((s, d) => s + (d.steps || 0), 0) / dailyData.length),
        } : null,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("Wearable sync status error", error);
    return createErrorResponse("Failed to get sync status", requestId, 500);
  }
}

