import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// POST: Update protocol progress
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { protocolRunId, dayIndex, completed, notes } = body;

    if (!protocolRunId || typeof protocolRunId !== "number") {
      return createErrorResponse("protocolRunId is required and must be a number", requestId, 400);
    }

    if (dayIndex === undefined || typeof dayIndex !== "number") {
      return createErrorResponse("dayIndex is required and must be a number", requestId, 400);
    }

    // Get user ID from database
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Verify protocol run belongs to user
    const protocolRun = await queryOne<{ id: number; protocol_id: number }>(
      "SELECT id, protocol_id FROM protocol_runs WHERE id = $1 AND user_id = $2",
      [protocolRunId, user.id]
    );

    if (!protocolRun) {
      return createErrorResponse("Protocol run not found", requestId, 404);
    }

    // Upsert protocol log
    await query(
      `INSERT INTO protocol_logs (protocol_run_id, day_index, completed, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (protocol_run_id, day_index) DO UPDATE SET
         completed = EXCLUDED.completed,
         notes = EXCLUDED.notes,
         created_at = NOW()`,
      [protocolRunId, dayIndex, completed !== undefined ? completed : true, notes || null]
    );

    // Get protocol config to check if this is the last day
    const protocolInfo = await queryOne<{
      protocol_id: number;
      config: unknown;
    }>(
      `SELECT pr.protocol_id, p.config
       FROM protocol_runs pr
       JOIN protocols p ON pr.protocol_id = p.id
       WHERE pr.id = $1`,
      [protocolRunId]
    );

    const config = protocolInfo?.config as { duration?: number; days?: unknown[] } | null;
    const totalDays = config?.duration || (config?.days?.length || 0);

    // Update protocol run state
    const currentState = await queryOne<{ state: unknown }>(
      "SELECT state FROM protocol_runs WHERE id = $1",
      [protocolRunId]
    );

    const state = (currentState?.state as { current_day?: number; day?: number } | null) || {};
    const currentDay = state.current_day || state.day || 1;
    
    // Update current_day to max(current_day, dayIndex + 1) if completed
    const updatedCurrentDay = completed
      ? Math.max(currentDay, dayIndex + 1)
      : currentDay;

    const updatedState = {
      ...state,
      current_day: updatedCurrentDay,
      lastCompletedDay: completed ? dayIndex : state.lastCompletedDay,
      lastUpdated: new Date().toISOString(),
    };

    await query(
      "UPDATE protocol_runs SET state = $1 WHERE id = $2",
      [JSON.stringify(updatedState), protocolRunId]
    );

    // If this is the last day and it's completed, mark the run as completed
    if (completed && dayIndex >= totalDays) {
      await query(
        "UPDATE protocol_runs SET status = 'completed', completed_at = NOW() WHERE id = $1",
        [protocolRunId]
      );
      logger.info("Protocol completed", {
        userId,
        protocolRunId,
        totalDays,
        requestId,
      });
    }

    logger.info("Protocol progress updated", {
      userId,
      protocolRunId,
      dayIndex,
      completed,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        message: "Progress updated successfully",
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Protocol progress API error", error);
    return createErrorResponse("Failed to update protocol progress", requestId, 500);
  }
}

