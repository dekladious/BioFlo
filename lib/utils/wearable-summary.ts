/**
 * Wearable Summary Helper
 * 
 * Generates human-readable summaries from wearable_features_daily data
 * for use in AI context (Today Plan, Weekly Debrief, Chat)
 */

import { query } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export type WearableFeaturesRow = {
  date: Date;
  sleep_total_minutes: number | null;
  sleep_efficiency: number | null;
  sleep_onset: string | null;
  sleep_offset: string | null;
  hrv_baseline: number | null;
  resting_hr: number | null;
  steps: number | null;
  training_load: number | null;
  readiness_score: number | null;
  source_flags: string[] | null;
};

/**
 * Generate wearable summary for a user over a date range
 */
export async function generateWearableSummary(
  userId: string,
  days: number = 14
): Promise<string> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    const features = await query<WearableFeaturesRow>(
      `SELECT 
        date,
        sleep_total_minutes,
        sleep_efficiency,
        sleep_onset,
        sleep_offset,
        hrv_baseline,
        resting_hr,
        steps,
        training_load,
        readiness_score,
        source_flags
       FROM wearable_features_daily
       WHERE user_id = $1 AND date >= $2
       ORDER BY date DESC
       LIMIT $3`,
      [userId, startDateStr, days]
    );

    if (features.length === 0) {
      return ""; // No wearable data available
    }

    return formatWearableSummary(features, days);
  } catch (error) {
    logger.warn("Wearable summary generation failed", { error, userId });
    return ""; // Return empty string on error
  }
}

/**
 * Format wearable features into a readable summary string
 */
function formatWearableSummary(features: WearableFeaturesRow[], days: number): string {
  const summaries: string[] = [];

  // Sleep metrics
  const sleepData = features.filter((f) => f.sleep_total_minutes !== null);
  if (sleepData.length > 0) {
    const avgSleep = sleepData.reduce((sum, f) => sum + (f.sleep_total_minutes || 0), 0) / sleepData.length;
    const avgSleepHours = Math.floor(avgSleep / 60);
    const avgSleepMins = Math.round(avgSleep % 60);
    
    // Calculate baseline (first 7 days average)
    const baselineDays = Math.min(7, sleepData.length);
    const baselineSleep = sleepData
      .slice(-baselineDays)
      .reduce((sum, f) => sum + (f.sleep_total_minutes || 0), 0) / baselineDays;
    
    const sleepDiff = avgSleep - baselineSleep;
    const sleepDiffStr = sleepDiff > 0 ? `+${Math.round(sleepDiff)}m` : `${Math.round(sleepDiff)}m`;
    
    summaries.push(
      `avg sleep ${avgSleepHours}h${avgSleepMins}m (${sleepDiffStr} vs baseline)`
    );

    // Sleep efficiency
    const efficiencyData = features.filter((f) => f.sleep_efficiency !== null);
    if (efficiencyData.length > 0) {
      const avgEfficiency = efficiencyData.reduce((sum, f) => sum + (f.sleep_efficiency || 0), 0) / efficiencyData.length;
      summaries.push(`sleep efficiency ${Math.round(avgEfficiency)}%`);
    }
  }

  // HRV metrics
  const hrvData = features.filter((f) => f.hrv_baseline !== null);
  if (hrvData.length > 0) {
    const avgHRV = hrvData.reduce((sum, f) => sum + Number(f.hrv_baseline || 0), 0) / hrvData.length;
    const baselineHRV = hrvData
      .slice(-Math.min(7, hrvData.length))
      .reduce((sum, f) => sum + Number(f.hrv_baseline || 0), 0) / Math.min(7, hrvData.length);
    
    const hrvChange = ((avgHRV - baselineHRV) / baselineHRV) * 100;
    const hrvChangeStr = hrvChange > 0 ? `+${hrvChange.toFixed(1)}%` : `${hrvChange.toFixed(1)}%`;
    
    summaries.push(`HRV ${avgHRV.toFixed(1)}ms (${hrvChangeStr} vs baseline)`);
  }

  // Resting HR
  const hrData = features.filter((f) => f.resting_hr !== null);
  if (hrData.length > 0) {
    const avgHR = hrData.reduce((sum, f) => sum + (f.resting_hr || 0), 0) / hrData.length;
    summaries.push(`resting HR ${Math.round(avgHR)} bpm`);
  }

  // Steps/Activity
  const stepsData = features.filter((f) => f.steps !== null);
  if (stepsData.length > 0) {
    const avgSteps = stepsData.reduce((sum, f) => sum + (f.steps || 0), 0) / stepsData.length;
    summaries.push(`steps ~${Math.round(avgSteps)}/day`);
  }

  // Training load
  const loadData = features.filter((f) => f.training_load !== null);
  if (loadData.length > 0) {
    const avgLoad = loadData.reduce((sum, f) => sum + Number(f.training_load || 0), 0) / loadData.length;
    summaries.push(`training load ${avgLoad.toFixed(1)}`);
  }

  // Readiness score
  const readinessData = features.filter((f) => f.readiness_score !== null);
  if (readinessData.length > 0) {
    const avgReadiness = readinessData.reduce((sum, f) => sum + (f.readiness_score || 0), 0) / readinessData.length;
    summaries.push(`readiness ${Math.round(avgReadiness)}/100`);
  }

  // Sources
  const sources = new Set<string>();
  features.forEach((f) => {
    if (f.source_flags && Array.isArray(f.source_flags)) {
      f.source_flags.forEach((s) => sources.add(s));
    }
  });

  if (summaries.length === 0) {
    return "";
  }

  const sourceStr = sources.size > 0 ? ` (sources: ${Array.from(sources).join(", ")})` : "";
  return `Last ${days} days: ${summaries.join(", ")}${sourceStr}`;
}

/**
 * Get wearable summary for use in AI context
 * This is the main function to use in APIs
 */
export async function getWearableSummaryForContext(
  userDbId: string,
  days: number = 14
): Promise<string> {
  return generateWearableSummary(userDbId, days);
}

