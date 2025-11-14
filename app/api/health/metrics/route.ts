import { auth } from "@clerk/nextjs/server";

import { getDbPool, query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { createErrorResponse, getRequestMetadata } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Fetch health metrics
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7", 10);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    try {
      let pool;
      try {
        pool = getDbPool();
      } catch (poolError) {
        if (poolError instanceof Error && poolError.message.includes("DATABASE_URL")) {
          logger.warn("Database not configured, returning empty health metrics", { userId, requestId });
          return Response.json({
            success: true,
            data: { metrics: [], summary: null },
            requestId,
            timestamp: new Date().toISOString(),
          });
        }
        throw poolError;
      }

      const user = await queryOne<{ id: string }>("SELECT id FROM users WHERE clerk_user_id = $1", [userId]);

      if (!user) {
        return Response.json({
          success: true,
          data: { metrics: [], summary: null },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }

      let dateQuery = "";
      const queryParams: any[] = [user.id];

      if (startDate && endDate) {
        dateQuery = "AND date >= $2 AND date <= $3";
        queryParams.push(startDate, endDate);
      } else {
        dateQuery = `AND date >= CURRENT_DATE - INTERVAL '${days} days'`;
      }

      const metrics = await query<{
        id: string;
        date: Date;
        sleep_duration_minutes: number | null;
        sleep_quality_score: number | null;
        hrv_avg_ms: number | null;
        steps: number | null;
        active_calories: number | null;
        resting_heart_rate: number | null;
        recovery_score: number | null;
        stress_level: number | null;
        weight_kg: number | null;
        energy_level: number | null;
        source: string | null;
      }>(
        `SELECT 
          id, date,
          sleep_duration_minutes, sleep_quality_score, hrv_avg_ms,
          steps, active_calories,
          resting_heart_rate, recovery_score, stress_level,
          weight_kg, energy_level, source
        FROM health_metrics
        WHERE user_id = $1 ${dateQuery}
        ORDER BY date DESC`,
        queryParams
      );

      const validMetrics = metrics.filter((m) => m.date);

      const summary =
        validMetrics.length > 0
          ? {
              avgSleepHours: average(validMetrics.map((m) => m.sleep_duration_minutes)) / 60 || null,
              avgSleepQuality: average(validMetrics.map((m) => m.sleep_quality_score)) || null,
              avgHRV: average(validMetrics.map((m) => m.hrv_avg_ms)) || null,
              avgSteps: average(validMetrics.map((m) => m.steps)) || null,
              avgRHR: average(validMetrics.map((m) => m.resting_heart_rate)) || null,
              avgRecovery: average(validMetrics.map((m) => m.recovery_score)) || null,
              avgStress: average(validMetrics.map((m) => m.stress_level)) || null,
              avgEnergy: average(validMetrics.map((m) => m.energy_level)) || null,
              latestWeight: validMetrics.find((m) => m.weight_kg)?.weight_kg || null,
            }
          : null;

      return Response.json({
        success: true,
        data: {
          metrics: metrics.map((m) => ({
            id: m.id,
            date: m.date.toISOString().split("T")[0],
            sleep: {
              durationMinutes: m.sleep_duration_minutes,
              qualityScore: m.sleep_quality_score,
              hrvAvg: m.hrv_avg_ms,
            },
            activity: {
              steps: m.steps,
              activeCalories: m.active_calories,
            },
            heartRate: {
              resting: m.resting_heart_rate,
            },
            recovery: {
              score: m.recovery_score,
            },
            stress: {
              level: m.stress_level,
            },
            body: {
              weightKg: m.weight_kg,
            },
            energy: {
              level: m.energy_level,
            },
            source: m.source,
          })),
          summary,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (dbError) {
      logger.error("Database error in health metrics GET", { error: dbError, userId, requestId });

      if (
        dbError instanceof Error &&
        (dbError.message.includes("DATABASE_URL") ||
          dbError.message.includes("does not exist") ||
          dbError.message.includes("relation") ||
          dbError.message.includes("table"))
      ) {
        logger.warn("Database not configured or table missing, returning empty health metrics", {
          error: dbError.message,
          userId,
          requestId,
        });
        return Response.json({
          success: true,
          data: { metrics: [], summary: null },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }

      throw dbError;
    }
  } catch (error) {
    logger.error("Health metrics API error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(`Failed to fetch health metrics: ${message}`, requestId, 500);
  }
}

// POST: Save health metrics
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const {
      date,
      sleep,
      activity,
      heartRate,
      recovery,
      stress,
      body: bodyMetrics,
      energy,
      source = "manual",
    } = body;

    if (!date) {
      return createErrorResponse("date is required", requestId, 400);
    }

    try {
      let pool;
      try {
        pool = getDbPool();
      } catch (poolError) {
        if (poolError instanceof Error && poolError.message.includes("DATABASE_URL")) {
          logger.warn("Database not configured, skipping health metrics save", { userId, requestId });
          return Response.json({
            success: true,
            data: { message: "Health metrics save skipped (database not configured)" },
            requestId,
            timestamp: new Date().toISOString(),
          });
        }
        throw poolError;
      }

      let user = await queryOne<{ id: string }>("SELECT id FROM users WHERE clerk_user_id = $1", [userId]);

      if (!user) {
        const result = await query<{ id: string }>(
          "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        if (!result[0]) {
          throw new Error("Failed to create user record");
        }
        user = result[0];
      }

      await query(
        `INSERT INTO health_metrics (
          user_id, date, source,
          sleep_duration_minutes, sleep_quality_score, hrv_avg_ms,
          steps, active_calories,
          resting_heart_rate, recovery_score, stress_level,
          weight_kg, energy_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (user_id, date, source) 
        DO UPDATE SET
          sleep_duration_minutes = COALESCE(EXCLUDED.sleep_duration_minutes, health_metrics.sleep_duration_minutes),
          sleep_quality_score = COALESCE(EXCLUDED.sleep_quality_score, health_metrics.sleep_quality_score),
          hrv_avg_ms = COALESCE(EXCLUDED.hrv_avg_ms, health_metrics.hrv_avg_ms),
          steps = COALESCE(EXCLUDED.steps, health_metrics.steps),
          active_calories = COALESCE(EXCLUDED.active_calories, health_metrics.active_calories),
          resting_heart_rate = COALESCE(EXCLUDED.resting_heart_rate, health_metrics.resting_heart_rate),
          recovery_score = COALESCE(EXCLUDED.recovery_score, health_metrics.recovery_score),
          stress_level = COALESCE(EXCLUDED.stress_level, health_metrics.stress_level),
          weight_kg = COALESCE(EXCLUDED.weight_kg, health_metrics.weight_kg),
          energy_level = COALESCE(EXCLUDED.energy_level, health_metrics.energy_level),
          updated_at = NOW()`,
        [
          user.id,
          date,
          source,
          sleep?.durationMinutes ?? null,
          sleep?.qualityScore ?? null,
          sleep?.hrvAvg ?? null,
          activity?.steps ?? null,
          activity?.activeCalories ?? null,
          heartRate?.resting ?? null,
          recovery?.score ?? null,
          stress?.level ?? null,
          bodyMetrics?.weightKg ?? null,
          energy?.level ?? null,
        ]
      );

      logger.info("Health metrics saved", { userId, date, source, requestId });

      return Response.json({
        success: true,
        data: { message: "Health metrics saved" },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (dbError) {
      logger.error("Database error in health metrics POST", { error: dbError, userId, requestId });

      if (
        dbError instanceof Error &&
        (dbError.message.includes("DATABASE_URL") ||
          dbError.message.includes("does not exist") ||
          dbError.message.includes("relation") ||
          dbError.message.includes("table"))
      ) {
        logger.warn("Database not configured or table missing, skipping health metrics save", {
          error: dbError.message,
          userId,
          requestId,
        });
        return Response.json({
          success: true,
          data: { message: "Health metrics save skipped (database not configured or table missing)" },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }

      throw dbError;
    }
  } catch (error) {
    logger.error("Health metrics save error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(`Failed to save health metrics: ${message}`, requestId);
  }
}

function average(values: Array<number | null | undefined>): number {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (!valid.length) return NaN;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}


