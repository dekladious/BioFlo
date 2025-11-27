/**
 * Health Logger Tool
 * Allows AI to log health data on behalf of users through conversation
 */

import { query, queryOne } from "@/lib/db/client";
import { z } from "zod";

// Schema for health data input
const healthDataSchema = z.object({
  date: z.string().optional().default(() => new Date().toISOString().split("T")[0]),
  // Sleep
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.number().min(1).max(10).optional(),
  // Vitals
  restingHeartRate: z.number().min(30).max(220).optional(),
  bloodPressureSystolic: z.number().min(70).max(250).optional(),
  bloodPressureDiastolic: z.number().min(40).max(150).optional(),
  bloodGlucose: z.number().min(20).max(600).optional(),
  bloodOxygen: z.number().min(70).max(100).optional(),
  temperature: z.number().min(35).max(42).optional(),
  // Body
  weight: z.number().min(20).max(300).optional(),
  // Wellness
  energyLevel: z.number().min(1).max(10).optional(),
  moodScore: z.number().min(1).max(10).optional(),
  stressLevel: z.number().min(1).max(10).optional(),
  // Activity
  steps: z.number().min(0).optional(),
  activeMinutes: z.number().min(0).optional(),
  workoutMinutes: z.number().min(0).optional(),
  // Lifestyle
  waterMl: z.number().min(0).optional(),
  caffeineMg: z.number().min(0).optional(),
  alcoholUnits: z.number().min(0).optional(),
  meditationMinutes: z.number().min(0).optional(),
  // Notes
  notes: z.string().optional(),
});

export type HealthDataInput = z.infer<typeof healthDataSchema>;

/**
 * Log health data for a user
 */
export async function logHealthData(
  userId: string,
  data: HealthDataInput
): Promise<{ success: boolean; message: string; logged: string[] }> {
  try {
    const validated = healthDataSchema.parse(data);
    const logged: string[] = [];

    // Map input to database columns
    const sleepDurationMinutes = validated.sleepHours
      ? Math.round(validated.sleepHours * 60)
      : null;

    const result = await queryOne<{ id: string }>(
      `INSERT INTO health_metrics (
        user_id, date, source,
        sleep_duration_minutes, sleep_quality_score,
        resting_heart_rate,
        blood_pressure_systolic, blood_pressure_diastolic,
        blood_glucose_mg_dl, blood_oxygen_percent, temperature_celsius,
        weight_kg,
        energy_level, mood_score, stress_level,
        steps, active_minutes, workout_duration_minutes,
        hydration_ml, caffeine_mg, alcohol_units, meditation_minutes,
        notes
      ) VALUES (
        $1, $2, 'manual',
        $3, $4,
        $5,
        $6, $7,
        $8, $9, $10,
        $11,
        $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20, $21,
        $22
      )
      ON CONFLICT (user_id, date, source) DO UPDATE SET
        sleep_duration_minutes = COALESCE(EXCLUDED.sleep_duration_minutes, health_metrics.sleep_duration_minutes),
        sleep_quality_score = COALESCE(EXCLUDED.sleep_quality_score, health_metrics.sleep_quality_score),
        resting_heart_rate = COALESCE(EXCLUDED.resting_heart_rate, health_metrics.resting_heart_rate),
        blood_pressure_systolic = COALESCE(EXCLUDED.blood_pressure_systolic, health_metrics.blood_pressure_systolic),
        blood_pressure_diastolic = COALESCE(EXCLUDED.blood_pressure_diastolic, health_metrics.blood_pressure_diastolic),
        blood_glucose_mg_dl = COALESCE(EXCLUDED.blood_glucose_mg_dl, health_metrics.blood_glucose_mg_dl),
        blood_oxygen_percent = COALESCE(EXCLUDED.blood_oxygen_percent, health_metrics.blood_oxygen_percent),
        temperature_celsius = COALESCE(EXCLUDED.temperature_celsius, health_metrics.temperature_celsius),
        weight_kg = COALESCE(EXCLUDED.weight_kg, health_metrics.weight_kg),
        energy_level = COALESCE(EXCLUDED.energy_level, health_metrics.energy_level),
        mood_score = COALESCE(EXCLUDED.mood_score, health_metrics.mood_score),
        stress_level = COALESCE(EXCLUDED.stress_level, health_metrics.stress_level),
        steps = COALESCE(EXCLUDED.steps, health_metrics.steps),
        active_minutes = COALESCE(EXCLUDED.active_minutes, health_metrics.active_minutes),
        workout_duration_minutes = COALESCE(EXCLUDED.workout_duration_minutes, health_metrics.workout_duration_minutes),
        hydration_ml = COALESCE(EXCLUDED.hydration_ml, health_metrics.hydration_ml),
        caffeine_mg = COALESCE(EXCLUDED.caffeine_mg, health_metrics.caffeine_mg),
        alcohol_units = COALESCE(EXCLUDED.alcohol_units, health_metrics.alcohol_units),
        meditation_minutes = COALESCE(EXCLUDED.meditation_minutes, health_metrics.meditation_minutes),
        notes = COALESCE(EXCLUDED.notes, health_metrics.notes),
        updated_at = NOW()
      RETURNING id`,
      [
        userId,
        validated.date,
        sleepDurationMinutes,
        validated.sleepQuality,
        validated.restingHeartRate,
        validated.bloodPressureSystolic,
        validated.bloodPressureDiastolic,
        validated.bloodGlucose,
        validated.bloodOxygen,
        validated.temperature,
        validated.weight,
        validated.energyLevel,
        validated.moodScore,
        validated.stressLevel,
        validated.steps,
        validated.activeMinutes,
        validated.workoutMinutes,
        validated.waterMl,
        validated.caffeineMg,
        validated.alcoholUnits,
        validated.meditationMinutes,
        validated.notes,
      ]
    );

    // Track what was logged
    if (validated.sleepHours) logged.push(`${validated.sleepHours} hours of sleep`);
    if (validated.sleepQuality) logged.push(`sleep quality: ${validated.sleepQuality}/10`);
    if (validated.restingHeartRate) logged.push(`resting heart rate: ${validated.restingHeartRate} bpm`);
    if (validated.bloodPressureSystolic && validated.bloodPressureDiastolic) {
      logged.push(`blood pressure: ${validated.bloodPressureSystolic}/${validated.bloodPressureDiastolic}`);
    }
    if (validated.bloodGlucose) logged.push(`blood glucose: ${validated.bloodGlucose} mg/dL`);
    if (validated.bloodOxygen) logged.push(`blood oxygen: ${validated.bloodOxygen}%`);
    if (validated.temperature) logged.push(`temperature: ${validated.temperature}°C`);
    if (validated.weight) logged.push(`weight: ${validated.weight} kg`);
    if (validated.energyLevel) logged.push(`energy level: ${validated.energyLevel}/10`);
    if (validated.moodScore) logged.push(`mood: ${validated.moodScore}/10`);
    if (validated.stressLevel) logged.push(`stress level: ${validated.stressLevel}/10`);
    if (validated.steps) logged.push(`${validated.steps.toLocaleString()} steps`);
    if (validated.activeMinutes) logged.push(`${validated.activeMinutes} active minutes`);
    if (validated.workoutMinutes) logged.push(`${validated.workoutMinutes} min workout`);
    if (validated.waterMl) logged.push(`${validated.waterMl}ml water`);
    if (validated.caffeineMg) logged.push(`${validated.caffeineMg}mg caffeine`);
    if (validated.meditationMinutes) logged.push(`${validated.meditationMinutes} min meditation`);

    return {
      success: true,
      message: `Health data logged successfully for ${validated.date}`,
      logged,
    };
  } catch (error) {
    console.error("Failed to log health data:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to log health data",
      logged: [],
    };
  }
}

/**
 * Get recent health data for context
 */
export async function getRecentHealthData(
  userId: string,
  days: number = 7
): Promise<{
  entries: Array<{
    date: string;
    sleepHours: number | null;
    sleepQuality: number | null;
    restingHeartRate: number | null;
    energyLevel: number | null;
    moodScore: number | null;
    stressLevel: number | null;
    steps: number | null;
    weight: number | null;
  }>;
  averages: {
    sleepHours: number | null;
    sleepQuality: number | null;
    restingHeartRate: number | null;
    energyLevel: number | null;
    moodScore: number | null;
    stressLevel: number | null;
    steps: number | null;
  };
  trends: {
    sleepTrend: "improving" | "declining" | "stable" | "unknown";
    energyTrend: "improving" | "declining" | "stable" | "unknown";
    moodTrend: "improving" | "declining" | "stable" | "unknown";
  };
}> {
  const limitedDays = Math.min(Math.max(days, 1), 90);

  const entries = await query<{
    date: string;
    sleep_duration_minutes: number | null;
    sleep_quality_score: number | null;
    resting_heart_rate: number | null;
    energy_level: number | null;
    mood_score: number | null;
    stress_level: number | null;
    steps: number | null;
    weight_kg: number | null;
  }>(
    `SELECT date, sleep_duration_minutes, sleep_quality_score, resting_heart_rate,
            energy_level, mood_score, stress_level, steps, weight_kg
     FROM health_metrics 
     WHERE user_id = $1 
     AND date >= CURRENT_DATE - INTERVAL '${limitedDays} days'
     ORDER BY date DESC`,
    [userId]
  );

  // Format entries
  const formattedEntries = entries.map((e) => ({
    date: e.date,
    sleepHours: e.sleep_duration_minutes ? Math.round((e.sleep_duration_minutes / 60) * 10) / 10 : null,
    sleepQuality: e.sleep_quality_score,
    restingHeartRate: e.resting_heart_rate,
    energyLevel: e.energy_level,
    moodScore: e.mood_score,
    stressLevel: e.stress_level,
    steps: e.steps,
    weight: e.weight_kg,
  }));

  // Calculate averages
  const calcAvg = (values: (number | null)[]) => {
    const valid = values.filter((v) => v !== null) as number[];
    return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null;
  };

  const averages = {
    sleepHours: calcAvg(formattedEntries.map((e) => e.sleepHours)),
    sleepQuality: calcAvg(formattedEntries.map((e) => e.sleepQuality)),
    restingHeartRate: calcAvg(formattedEntries.map((e) => e.restingHeartRate)),
    energyLevel: calcAvg(formattedEntries.map((e) => e.energyLevel)),
    moodScore: calcAvg(formattedEntries.map((e) => e.moodScore)),
    stressLevel: calcAvg(formattedEntries.map((e) => e.stressLevel)),
    steps: calcAvg(formattedEntries.map((e) => e.steps)),
  };

  // Calculate trends (compare first half to second half)
  const calcTrend = (values: (number | null)[]): "improving" | "declining" | "stable" | "unknown" => {
    const valid = values.filter((v) => v !== null) as number[];
    if (valid.length < 4) return "unknown";
    const mid = Math.floor(valid.length / 2);
    const firstHalf = valid.slice(0, mid);
    const secondHalf = valid.slice(mid);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = ((secondAvg - firstAvg) / firstAvg) * 100;
    if (diff > 5) return "improving";
    if (diff < -5) return "declining";
    return "stable";
  };

  const trends = {
    sleepTrend: calcTrend(formattedEntries.map((e) => e.sleepHours)),
    energyTrend: calcTrend(formattedEntries.map((e) => e.energyLevel)),
    moodTrend: calcTrend(formattedEntries.map((e) => e.moodScore)),
  };

  return { entries: formattedEntries, averages, trends };
}

/**
 * Tool definition for the AI
 */
export const healthLoggerTool = {
  name: "log_health_data",
  description: `Log health metrics for the user. Use this when the user shares health data like sleep, blood pressure, weight, energy levels, mood, steps, etc. 
  
Ask clarifying questions if needed to get accurate data. For example:
- "How many hours did you sleep?" 
- "On a scale of 1-10, how would you rate your energy today?"
- "What was your blood pressure reading?"

Always confirm what you've logged with the user.`,
  parameters: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description: "Date to log for (YYYY-MM-DD format). Defaults to today.",
      },
      sleepHours: {
        type: "number",
        description: "Hours of sleep (e.g., 7.5)",
      },
      sleepQuality: {
        type: "number",
        description: "Sleep quality rating 1-10",
      },
      restingHeartRate: {
        type: "number",
        description: "Resting heart rate in bpm",
      },
      bloodPressureSystolic: {
        type: "number",
        description: "Systolic blood pressure (top number)",
      },
      bloodPressureDiastolic: {
        type: "number",
        description: "Diastolic blood pressure (bottom number)",
      },
      bloodGlucose: {
        type: "number",
        description: "Blood glucose in mg/dL",
      },
      bloodOxygen: {
        type: "number",
        description: "Blood oxygen saturation percentage",
      },
      temperature: {
        type: "number",
        description: "Body temperature in Celsius",
      },
      weight: {
        type: "number",
        description: "Body weight in kg",
      },
      energyLevel: {
        type: "number",
        description: "Energy level 1-10",
      },
      moodScore: {
        type: "number",
        description: "Mood score 1-10",
      },
      stressLevel: {
        type: "number",
        description: "Stress level 1-10",
      },
      steps: {
        type: "number",
        description: "Step count",
      },
      activeMinutes: {
        type: "number",
        description: "Active minutes",
      },
      workoutMinutes: {
        type: "number",
        description: "Workout duration in minutes",
      },
      waterMl: {
        type: "number",
        description: "Water intake in ml",
      },
      caffeineMg: {
        type: "number",
        description: "Caffeine intake in mg",
      },
      alcoholUnits: {
        type: "number",
        description: "Alcohol units consumed",
      },
      meditationMinutes: {
        type: "number",
        description: "Meditation duration in minutes",
      },
      notes: {
        type: "string",
        description: "Additional notes about the day",
      },
    },
  },
};

/**
 * Tool definition for getting health data
 */
export const getHealthDataTool = {
  name: "get_health_data",
  description: `Retrieve the user's recent health data to provide personalized advice. Use this to understand their current health patterns, trends, and baselines before giving recommendations.`,
  parameters: {
    type: "object",
    properties: {
      days: {
        type: "number",
        description: "Number of days to look back (default: 7, max: 90)",
      },
    },
  },
};

