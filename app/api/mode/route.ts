import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

const GOAL_MODES = ["NORMAL", "RECOVERY", "TRAVEL", "DEEP_WORK", "RESET", "GROWTH"] as const;
type GoalMode = (typeof GOAL_MODES)[number];

function sanitizeMode(mode?: string | null): GoalMode {
  if (!mode) return "NORMAL";
  const upper = mode.toUpperCase();
  return (GOAL_MODES as readonly string[]).includes(upper) ? (upper as GoalMode) : "NORMAL";
}

export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    let mode: GoalMode = "NORMAL";
    try {
      const record = await queryOne<{ today_mode: string | null }>(
        "SELECT today_mode FROM users WHERE clerk_user_id = $1",
        [userId]
      );
      mode = sanitizeMode(record?.today_mode);
    } catch (error) {
      logger.warn("Goal mode column missing or query failed; defaulting to NORMAL", {
        error,
        userId,
      });
    }

    return Response.json({
      success: true,
      data: { mode },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Goal mode GET failed", error);
    return createErrorResponse("Failed to fetch goal mode", requestId, 500);
  }
}

export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const desiredMode = sanitizeMode(body?.mode);

    let user = await queryOne<{ id: string }>("SELECT id FROM users WHERE clerk_user_id = $1", [userId]);
    if (!user) {
      const inserted = await query<{ id: string }>(
        "INSERT INTO users (clerk_user_id, today_mode) VALUES ($1, $2) RETURNING id",
        [userId, desiredMode]
      );
      user = inserted[0];
    } else {
      try {
        await query("UPDATE users SET today_mode = $1, updated_at = NOW() WHERE id = $2", [
          desiredMode,
          user.id,
        ]);
      } catch (error) {
        logger.error("Failed to update today_mode column", { error, userId });
        return createErrorResponse(
          "Goal mode requires the latest database schema. Please run migrations.",
          requestId,
          503
        );
      }
    }

    return Response.json({
      success: true,
      data: { mode: desiredMode },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Goal mode POST failed", error);
    return createErrorResponse("Failed to update goal mode", requestId, 500);
  }
}




