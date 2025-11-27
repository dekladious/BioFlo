/**
 * Wearable Metrics API
 * 
 * GET /api/wearables/metrics
 * 
 * Returns aggregated wearable metrics for the current user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";

interface WearableMetrics {
  hasData: boolean;
  source: string | null;
  lastSyncAt: string | null;
  // Latest day metrics
  latest: {
    date: string;
    sleepMinutes: number | null;
    sleepScore: number | null;
    sleepEfficiency: number | null;
    deepSleepMinutes: number | null;
    remSleepMinutes: number | null;
    hrvRmssd: number | null;
    restingHr: number | null;
    steps: number | null;
    activeCalories: number | null;
    recoveryScore: number | null;
    readinessScore: number | null;
  } | null;
  // 7-day averages
  averages: {
    sleepMinutes: number | null;
    sleepScore: number | null;
    hrvRmssd: number | null;
    restingHr: number | null;
    steps: number | null;
    recoveryScore: number | null;
  };
  // 7-day trend data
  trend: Array<{
    date: string;
    sleepMinutes: number | null;
    sleepScore: number | null;
    hrvRmssd: number | null;
    restingHr: number | null;
    recoveryScore: number | null;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get internal user ID
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [clerkUserId]
    );

    if (!user) {
      return NextResponse.json({ 
        success: true, 
        data: { hasData: false, source: null, lastSyncAt: null, latest: null, averages: {}, trend: [] } 
      });
    }

    // Check for connected wearable device
    const device = await queryOne<{ device_type: string; last_sync_at: Date }>(
      `SELECT device_type, last_sync_at 
       FROM wearable_devices 
       WHERE user_id = $1 AND is_active = true
       ORDER BY last_sync_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (!device) {
      return NextResponse.json({ 
        success: true, 
        data: { hasData: false, source: null, lastSyncAt: null, latest: null, averages: {}, trend: [] } 
      });
    }

    // Get latest day's metrics
    const latest = await queryOne<{
      date: string;
      sleep_duration_minutes: number | null;
      sleep_quality_score: number | null;
      sleep_deep_minutes: number | null;
      sleep_rem_minutes: number | null;
      hrv_rmssd_ms: number | null;
      resting_heart_rate: number | null;
      steps: number | null;
      active_calories: number | null;
      recovery_score: number | null;
      readiness_score: number | null;
    }>(
      `SELECT 
        date::text,
        sleep_duration_minutes,
        sleep_quality_score,
        sleep_deep_minutes,
        sleep_rem_minutes,
        hrv_rmssd_ms,
        resting_heart_rate,
        steps,
        active_calories,
        recovery_score,
        readiness_score
       FROM health_metrics
       WHERE user_id = $1 AND source = $2
       ORDER BY date DESC
       LIMIT 1`,
      [user.id, device.device_type]
    );

    // Get 7-day averages
    const averages = await queryOne<{
      avg_sleep_minutes: number | null;
      avg_sleep_score: number | null;
      avg_hrv: number | null;
      avg_resting_hr: number | null;
      avg_steps: number | null;
      avg_recovery: number | null;
    }>(
      `SELECT 
        ROUND(AVG(sleep_duration_minutes)) as avg_sleep_minutes,
        ROUND(AVG(sleep_quality_score)) as avg_sleep_score,
        ROUND(AVG(hrv_rmssd_ms)) as avg_hrv,
        ROUND(AVG(resting_heart_rate)) as avg_resting_hr,
        ROUND(AVG(steps)) as avg_steps,
        ROUND(AVG(COALESCE(recovery_score, readiness_score))) as avg_recovery
       FROM health_metrics
       WHERE user_id = $1 
         AND source = $2
         AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      [user.id, device.device_type]
    );

    // Get 7-day trend
    const trend = await query<{
      date: string;
      sleep_duration_minutes: number | null;
      sleep_quality_score: number | null;
      hrv_rmssd_ms: number | null;
      resting_heart_rate: number | null;
      recovery_score: number | null;
    }>(
      `SELECT 
        date::text,
        sleep_duration_minutes,
        sleep_quality_score,
        hrv_rmssd_ms,
        resting_heart_rate,
        COALESCE(recovery_score, readiness_score) as recovery_score
       FROM health_metrics
       WHERE user_id = $1 
         AND source = $2
         AND date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY date ASC`,
      [user.id, device.device_type]
    );

    // Calculate sleep efficiency from wearable_features_daily if available
    let sleepEfficiency = null;
    if (latest) {
      const features = await queryOne<{ sleep_efficiency: number }>(
        `SELECT sleep_efficiency 
         FROM wearable_features_daily 
         WHERE user_id = $1 AND date = $2::date`,
        [user.id, latest.date]
      );
      sleepEfficiency = features?.sleep_efficiency ?? null;
    }

    const metrics: WearableMetrics = {
      hasData: Boolean(latest),
      source: device.device_type,
      lastSyncAt: device.last_sync_at?.toISOString() ?? null,
      latest: latest ? {
        date: latest.date,
        sleepMinutes: latest.sleep_duration_minutes,
        sleepScore: latest.sleep_quality_score,
        sleepEfficiency,
        deepSleepMinutes: latest.sleep_deep_minutes,
        remSleepMinutes: latest.sleep_rem_minutes,
        hrvRmssd: latest.hrv_rmssd_ms,
        restingHr: latest.resting_heart_rate,
        steps: latest.steps,
        activeCalories: latest.active_calories,
        recoveryScore: latest.recovery_score,
        readinessScore: latest.readiness_score,
      } : null,
      averages: {
        sleepMinutes: averages?.avg_sleep_minutes ?? null,
        sleepScore: averages?.avg_sleep_score ?? null,
        hrvRmssd: averages?.avg_hrv ?? null,
        restingHr: averages?.avg_resting_hr ?? null,
        steps: averages?.avg_steps ?? null,
        recoveryScore: averages?.avg_recovery ?? null,
      },
      trend: trend.map(row => ({
        date: row.date,
        sleepMinutes: row.sleep_duration_minutes,
        sleepScore: row.sleep_quality_score,
        hrvRmssd: row.hrv_rmssd_ms,
        restingHr: row.resting_heart_rate,
        recoveryScore: row.recovery_score,
      })),
    };

    return NextResponse.json({ success: true, data: metrics });

  } catch (error) {
    console.error("Error fetching wearable metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

