import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

const PHASES = ["menstrual", "follicular", "ovulatory", "luteal", "perimenopause", "menopause"] as const;
type Phase = (typeof PHASES)[number];

type WomensHealthPayload = {
  cycleLength?: number | null;
  currentPhase?: Phase | null;
  dayOfCycle?: number | null;
  issues?: string[];
  notes?: string;
};

function normalizePayload(body: WomensHealthPayload) {
  const payload: WomensHealthPayload = {};
  if (typeof body.cycleLength === "number") {
    payload.cycleLength = Math.min(Math.max(body.cycleLength, 21), 40);
  }
  if (body.currentPhase && PHASES.includes(body.currentPhase)) {
    payload.currentPhase = body.currentPhase;
  }
  if (typeof body.dayOfCycle === "number") {
    payload.dayOfCycle = Math.max(1, Math.min(body.dayOfCycle, 40));
  }
  if (Array.isArray(body.issues)) {
    payload.issues = body.issues
      .map((issue) => issue.trim().toLowerCase().replace(/\s+/g, "_"))
      .slice(0, 6);
  }
  if (typeof body.notes === "string") {
    payload.notes = body.notes.slice(0, 500);
  }
  return payload;
}

export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const user = await queryOne<{ id: string }>("SELECT id FROM users WHERE clerk_user_id = $1", [userId]);
    if (!user) {
      return Response.json({
        success: true,
        data: {
          cycleLength: null,
          currentPhase: null,
          dayOfCycle: null,
          issues: [],
          notes: "",
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const profile = await queryOne<{
        cycle_length: number | null;
        current_phase: string | null;
        day_of_cycle: number | null;
        issues: string[] | null;
        notes: string | null;
      }>(
        `SELECT cycle_length, current_phase, day_of_cycle, issues, notes
         FROM womens_health_profiles
         WHERE user_id = $1`,
        [user.id]
      );

      if (!profile) {
        return Response.json({
          success: true,
          data: {
            cycleLength: null,
            currentPhase: null,
            dayOfCycle: null,
            issues: [],
            notes: "",
          },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }

      return Response.json({
        success: true,
        data: {
          cycleLength: profile.cycle_length,
          currentPhase: profile.current_phase,
          dayOfCycle: profile.day_of_cycle,
          issues: profile.issues || [],
          notes: profile.notes || "",
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn("Womens health profile table missing", { error });
      return Response.json({
        success: true,
        data: {
          cycleLength: null,
          currentPhase: null,
          dayOfCycle: null,
          issues: [],
          notes: "",
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("Womens health GET failed", error);
    return createErrorResponse("Failed to fetch women's health data", requestId, 500);
  }
}

export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    let user = await queryOne<{ id: string }>("SELECT id FROM users WHERE clerk_user_id = $1", [userId]);
    if (!user) {
      const inserted = await query<{ id: string }>(
        "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
        [userId]
      );
      user = inserted[0];
    }

    const body = normalizePayload(await req.json());

    try {
      await query(
        `INSERT INTO womens_health_profiles (user_id, cycle_length, current_phase, day_of_cycle, issues, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           cycle_length = EXCLUDED.cycle_length,
           current_phase = EXCLUDED.current_phase,
           day_of_cycle = EXCLUDED.day_of_cycle,
           issues = EXCLUDED.issues,
           notes = EXCLUDED.notes,
           updated_at = NOW()`,
        [
          user.id,
          body.cycleLength ?? null,
          body.currentPhase ?? null,
          body.dayOfCycle ?? null,
          JSON.stringify(body.issues || []),
          body.notes ?? null,
        ]
      );
    } catch (error) {
      logger.error("Failed to upsert womens_health_profiles", { error });
      return createErrorResponse(
        "Women's health feature requires the latest database schema. Please run migrations.",
        requestId,
        503
      );
    }

    return Response.json({
      success: true,
      data: {
        message: "Women's health profile updated",
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Womens health POST failed", error);
    return createErrorResponse("Failed to update women's health data", requestId, 500);
  }
}




