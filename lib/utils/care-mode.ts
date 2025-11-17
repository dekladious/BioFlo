/**
 * Care Mode - Deviation Detection & Alerting
 * 
 * Monitors user patterns for unusual deviations:
 * - Unusual inactivity + high HR + poor sleep
 * - Total lack of data when normally present
 * 
 * If deviation detected → Send check-in prompt
 * If no response within timeout → Alert contacts
 */

import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export interface CareModeContact {
  name: string;
  email?: string;
  phone?: string;
}

export interface DeviationAlert {
  detected: boolean;
  severity: "low" | "medium" | "high";
  message: string;
  data: Record<string, unknown>;
}

/**
 * Detect deviations in user patterns
 * Returns alert if unusual patterns detected
 */
export async function detectDeviations(userId: string): Promise<DeviationAlert | null> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split("T")[0];

    // Get baseline (first 3 days of the 7-day window)
    const baselineStart = new Date();
    baselineStart.setDate(baselineStart.getDate() - 7);
    const baselineEnd = new Date();
    baselineEnd.setDate(baselineEnd.getDate() - 4);

    const baselineData = await query<{
      steps: number | null;
      resting_hr: number | null;
      sleep_total_minutes: number | null;
      date: Date;
    }>(
      `SELECT steps, resting_hr, sleep_total_minutes, date
       FROM wearable_features_daily
       WHERE user_id = $1 AND date >= $2 AND date < $3
       ORDER BY date ASC`,
      [userId, baselineStart.toISOString().split("T")[0], baselineEnd.toISOString().split("T")[0]]
    );

    // Get recent data (last 2 days)
    const recentStart = new Date();
    recentStart.setDate(recentStart.getDate() - 2);
    const recentData = await query<{
      steps: number | null;
      resting_hr: number | null;
      sleep_total_minutes: number | null;
      date: Date;
    }>(
      `SELECT steps, resting_hr, sleep_total_minutes, date
       FROM wearable_features_daily
       WHERE user_id = $1 AND date >= $2
       ORDER BY date DESC
       LIMIT 2`,
      [userId, recentStart.toISOString().split("T")[0]]
    );

    // Check 1: Total lack of data when normally present
    if (baselineData.length >= 2 && recentData.length === 0) {
      return {
        detected: true,
        severity: "high",
        message: "No wearable data received in the last 2 days, but data was present previously.",
        data: {
          type: "no_data",
          baselineDays: baselineData.length,
          recentDays: 0,
        },
      };
    }

    if (baselineData.length < 2 || recentData.length < 2) {
      return null; // Not enough data for comparison
    }

    // Calculate baselines
    const baselineSteps = baselineData
      .filter((d) => d.steps !== null)
      .reduce((sum, d) => sum + (d.steps || 0), 0) / baselineData.filter((d) => d.steps !== null).length;
    
    const baselineHR = baselineData
      .filter((d) => d.resting_hr !== null)
      .reduce((sum, d) => sum + (d.resting_hr || 0), 0) / baselineData.filter((d) => d.resting_hr !== null).length;
    
    const baselineSleep = baselineData
      .filter((d) => d.sleep_total_minutes !== null)
      .reduce((sum, d) => sum + (d.sleep_total_minutes || 0), 0) / baselineData.filter((d) => d.sleep_total_minutes !== null).length;

    // Calculate recent averages
    const recentSteps = recentData
      .filter((d) => d.steps !== null)
      .reduce((sum, d) => sum + (d.steps || 0), 0) / recentData.filter((d) => d.steps !== null).length;
    
    const recentHR = recentData
      .filter((d) => d.resting_hr !== null)
      .reduce((sum, d) => sum + (d.resting_hr || 0), 0) / recentData.filter((d) => d.resting_hr !== null).length;
    
    const recentSleep = recentData
      .filter((d) => d.sleep_total_minutes !== null)
      .reduce((sum, d) => sum + (d.sleep_total_minutes || 0), 0) / recentData.filter((d) => d.sleep_total_minutes !== null).length;

    // Check 2: Unusual inactivity + high HR + poor sleep
    const stepsDrop = ((baselineSteps - recentSteps) / baselineSteps) * 100;
    const hrIncrease = ((recentHR - baselineHR) / baselineHR) * 100;
    const sleepDrop = ((baselineSleep - recentSleep) / baselineSleep) * 100;

    // Deviation: Steps down >50%, HR up >15%, Sleep down >20%
    if (stepsDrop > 50 && hrIncrease > 15 && sleepDrop > 20) {
      return {
        detected: true,
        severity: "high",
        message: `Unusual pattern detected: activity down ${stepsDrop.toFixed(0)}%, heart rate up ${hrIncrease.toFixed(0)}%, sleep down ${sleepDrop.toFixed(0)}% vs baseline.`,
        data: {
          type: "pattern_deviation",
          stepsDrop: stepsDrop.toFixed(1),
          hrIncrease: hrIncrease.toFixed(1),
          sleepDrop: sleepDrop.toFixed(1),
          baselineSteps: Math.round(baselineSteps),
          recentSteps: Math.round(recentSteps),
          baselineHR: Math.round(baselineHR),
          recentHR: Math.round(recentHR),
          baselineSleep: Math.round(baselineSleep),
          recentSleep: Math.round(recentSleep),
        },
      };
    }

    // Check 3: Severe inactivity alone (steps down >70%)
    if (stepsDrop > 70) {
      return {
        detected: true,
        severity: "medium",
        message: `Significant drop in activity detected: ${stepsDrop.toFixed(0)}% decrease vs baseline.`,
        data: {
          type: "inactivity",
          stepsDrop: stepsDrop.toFixed(1),
          baselineSteps: Math.round(baselineSteps),
          recentSteps: Math.round(recentSteps),
        },
      };
    }

    return null;
  } catch (error) {
    logger.error("Care mode deviation detection failed", { error, userId });
    return null;
  }
}

/**
 * Create a check-in prompt for the user
 */
export async function createCheckInPrompt(userId: string, alert: DeviationAlert): Promise<string> {
  try {
    const result = await query<{ id: string }>(
      `INSERT INTO care_mode_check_ins (user_id, prompt_sent_at, response_data)
       VALUES ($1, NOW(), $2)
       RETURNING id`,
      [userId, JSON.stringify({ alert })]
    );

    logger.info("Care mode check-in prompt created", {
      userId,
      checkInId: result[0]?.id,
      severity: alert.severity,
    });

    return result[0]?.id || "";
  } catch (error) {
    logger.error("Failed to create check-in prompt", { error, userId });
    return "";
  }
}

/**
 * Record user response to check-in prompt
 */
export async function recordCheckInResponse(
  checkInId: string,
  userId: string,
  response: { okay: boolean; notes?: string }
): Promise<void> {
  try {
    await query(
      `UPDATE care_mode_check_ins
       SET responded_at = NOW(), response_data = $1
       WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(response), checkInId, userId]
    );

    logger.info("Care mode check-in response recorded", {
      userId,
      checkInId,
      okay: response.okay,
    });
  } catch (error) {
    logger.error("Failed to record check-in response", { error, userId, checkInId });
  }
}

/**
 * Send alerts to contacts (placeholder - would integrate with email/SMS service)
 */
export async function sendCareModeAlert(
  userId: string,
  checkInId: string | null,
  contacts: CareModeContact[],
  alert: DeviationAlert
): Promise<void> {
  try {
    // Create alert records
    for (const contact of contacts) {
      await query(
        `INSERT INTO care_mode_alerts (user_id, check_in_id, contact_name, contact_email, contact_phone, alert_sent_at, alert_type, alert_data)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'deviation', $6)`,
        [
          userId,
          checkInId,
          contact.name,
          contact.email || null,
          contact.phone || null,
          JSON.stringify(alert),
        ]
      );

      // TODO: Integrate with email/SMS service (e.g., SendGrid, Twilio)
      // For now, just log
      logger.info("Care mode alert would be sent", {
        userId,
        contact: contact.name,
        email: contact.email,
        phone: contact.phone,
        alertType: alert.severity,
      });
    }
  } catch (error) {
    logger.error("Failed to send care mode alerts", { error, userId });
  }
}

