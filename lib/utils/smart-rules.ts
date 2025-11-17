/**
 * Smart Automation Rules
 * 
 * Evaluates user data and creates nudges based on patterns:
 * - Sleep debt: Low sleep for 3+ days
 * - Overreaching: HRV down + HR up vs baseline
 * - Inactivity: Low steps for several days
 */

import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export type NudgeType = "sleep_debt" | "overreaching" | "inactivity" | "hrv_down" | "low_steps";

export interface NudgePayload {
  type: NudgeType;
  message: string;
  severity: "low" | "medium" | "high";
  data?: Record<string, unknown>;
}

/**
 * Evaluate sleep debt rule
 * Creates nudge if last 3 days sleep < threshold (default 7 hours = 420 minutes)
 */
export async function evaluateSleepDebtRule(
  userId: string,
  thresholdMinutes: number = 420
): Promise<NudgePayload | null> {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const startDate = threeDaysAgo.toISOString().split("T")[0];

    const sleepData = await query<{ sleep_total_minutes: number | null; date: Date }>(
      `SELECT sleep_total_minutes, date
       FROM wearable_features_daily
       WHERE user_id = $1 AND date >= $2 AND sleep_total_minutes IS NOT NULL
       ORDER BY date DESC
       LIMIT 3`,
      [userId, startDate]
    );

    if (sleepData.length < 3) {
      return null; // Not enough data
    }

    const avgSleep = sleepData.reduce((sum, d) => sum + (d.sleep_total_minutes || 0), 0) / sleepData.length;

    if (avgSleep < thresholdMinutes) {
      const hours = Math.floor(avgSleep / 60);
      const minutes = Math.round(avgSleep % 60);
      const deficit = thresholdMinutes - avgSleep;
      const deficitHours = Math.floor(deficit / 60);

      return {
        type: "sleep_debt",
        message: `You've been getting less sleep than optimal (avg ${hours}h${minutes}m vs ${Math.floor(thresholdMinutes / 60)}h target). Consider prioritizing rest and recovery.`,
        severity: avgSleep < thresholdMinutes * 0.8 ? "high" : "medium",
        data: {
          avgSleepMinutes: Math.round(avgSleep),
          thresholdMinutes,
          deficitMinutes: Math.round(deficit),
          days: sleepData.length,
        },
      };
    }

    return null;
  } catch (error) {
    logger.error("Sleep debt rule evaluation failed", { error, userId });
    return null;
  }
}

/**
 * Evaluate overreaching rule
 * Creates nudge if HRV down AND resting HR up vs 30-day baseline
 */
export async function evaluateOverreachingRule(userId: string): Promise<NudgePayload | null> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    const recentDaysAgo = new Date();
    recentDaysAgo.setDate(recentDaysAgo.getDate() - 7);
    const recentStartDate = recentDaysAgo.toISOString().split("T")[0];

    // Get baseline (first 7 days of the 30-day window)
    const baselineData = await query<{
      hrv_baseline: number | null;
      resting_hr: number | null;
    }>(
      `SELECT hrv_baseline, resting_hr
       FROM wearable_features_daily
       WHERE user_id = $1 AND date >= $2 AND date < $3
         AND hrv_baseline IS NOT NULL AND resting_hr IS NOT NULL
       ORDER BY date ASC
       LIMIT 7`,
      [userId, startDate, recentStartDate]
    );

    // Get recent data (last 7 days)
    const recentData = await query<{
      hrv_baseline: number | null;
      resting_hr: number | null;
    }>(
      `SELECT hrv_baseline, resting_hr
       FROM wearable_features_daily
       WHERE user_id = $1 AND date >= $2
         AND hrv_baseline IS NOT NULL AND resting_hr IS NOT NULL
       ORDER BY date DESC
       LIMIT 7`,
      [userId, recentStartDate]
    );

    if (baselineData.length < 3 || recentData.length < 3) {
      return null; // Not enough data
    }

    const baselineHRV =
      baselineData.reduce((sum, d) => sum + Number(d.hrv_baseline || 0), 0) / baselineData.length;
    const baselineHR = baselineData.reduce((sum, d) => sum + (d.resting_hr || 0), 0) / baselineData.length;

    const recentHRV = recentData.reduce((sum, d) => sum + Number(d.hrv_baseline || 0), 0) / recentData.length;
    const recentHR = recentData.reduce((sum, d) => sum + (d.resting_hr || 0), 0) / recentData.length;

    const hrvChange = ((recentHRV - baselineHRV) / baselineHRV) * 100;
    const hrChange = ((recentHR - baselineHR) / baselineHR) * 100;

    // Overreaching: HRV down by >10% AND HR up by >5%
    if (hrvChange < -10 && hrChange > 5) {
      return {
        type: "overreaching",
        message: `Your HRV is down ${Math.abs(hrvChange).toFixed(1)}% and resting HR is up ${hrChange.toFixed(1)}% vs baseline. This suggests overreaching - consider easing off training and prioritizing recovery.`,
        severity: hrvChange < -20 ? "high" : "medium",
        data: {
          baselineHRV: baselineHRV.toFixed(1),
          recentHRV: recentHRV.toFixed(1),
          baselineHR: Math.round(baselineHR),
          recentHR: Math.round(recentHR),
          hrvChange: hrvChange.toFixed(1),
          hrChange: hrChange.toFixed(1),
        },
      };
    }

    return null;
  } catch (error) {
    logger.error("Overreaching rule evaluation failed", { error, userId });
    return null;
  }
}

/**
 * Evaluate inactivity rule
 * Creates nudge if steps very low for several days (default: <5000 steps for 3+ days)
 */
export async function evaluateInactivityRule(
  userId: string,
  thresholdSteps: number = 5000,
  minDays: number = 3
): Promise<NudgePayload | null> {
  try {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - minDays);
    const startDate = daysAgo.toISOString().split("T")[0];

    const stepData = await query<{ steps: number | null; date: Date }>(
      `SELECT steps, date
       FROM wearable_features_daily
       WHERE user_id = $1 AND date >= $2 AND steps IS NOT NULL
       ORDER BY date DESC
       LIMIT ${minDays}`,
      [userId, startDate]
    );

    if (stepData.length < minDays) {
      return null; // Not enough data
    }

    const lowStepDays = stepData.filter((d) => (d.steps || 0) < thresholdSteps).length;

    if (lowStepDays >= minDays) {
      const avgSteps = stepData.reduce((sum, d) => sum + (d.steps || 0), 0) / stepData.length;

      return {
        type: "inactivity",
        message: `You've been less active recently (avg ${Math.round(avgSteps)} steps/day). Consider adding some light movement or walks to your routine.`,
        severity: avgSteps < thresholdSteps * 0.5 ? "medium" : "low",
        data: {
          avgSteps: Math.round(avgSteps),
          thresholdSteps,
          lowStepDays,
          totalDays: stepData.length,
        },
      };
    }

    return null;
  } catch (error) {
    logger.error("Inactivity rule evaluation failed", { error, userId });
    return null;
  }
}

/**
 * Evaluate all smart rules for a user
 * Returns array of nudges to create
 */
export async function evaluateAllSmartRules(userId: string): Promise<NudgePayload[]> {
  const nudges: NudgePayload[] = [];

  // Sleep debt
  const sleepNudge = await evaluateSleepDebtRule(userId);
  if (sleepNudge) nudges.push(sleepNudge);

  // Overreaching
  const overreachingNudge = await evaluateOverreachingRule(userId);
  if (overreachingNudge) nudges.push(overreachingNudge);

  // Inactivity
  const inactivityNudge = await evaluateInactivityRule(userId);
  if (inactivityNudge) nudges.push(inactivityNudge);

  return nudges;
}

/**
 * Create a nudge in the database
 */
export async function createNudge(
  userId: string,
  nudge: NudgePayload,
  channel: "in_app" | "push" | "email" = "in_app"
): Promise<void> {
  try {
    await query(
      `INSERT INTO nudges (user_id, type, payload, channel)
       VALUES ($1, $2, $3, $4)`,
      [userId, nudge.type, JSON.stringify(nudge), channel]
    );

    logger.info("Nudge created", {
      userId,
      type: nudge.type,
      severity: nudge.severity,
      channel,
    });
  } catch (error) {
    logger.error("Failed to create nudge", { error, userId, nudge });
  }
}

