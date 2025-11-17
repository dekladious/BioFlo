import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Get current active protocol
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Get user ID from database
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Get active protocol run
    const protocolRun = await queryOne<{
      id: number;
      protocol_id: number;
      status: string;
      started_at: Date;
      state: unknown;
      protocol_name: string;
      protocol_slug: string;
      protocol_config: unknown;
    }>(
      `SELECT 
        pr.id,
        pr.protocol_id,
        pr.status,
        pr.started_at,
        pr.state,
        p.name as protocol_name,
        p.slug as protocol_slug,
        p.config as protocol_config
       FROM protocol_runs pr
       JOIN protocols p ON pr.protocol_id = p.id
       WHERE pr.user_id = $1 AND pr.status = 'active'
       ORDER BY pr.started_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (!protocolRun) {
      return Response.json({
        success: true,
        data: {
          active: false,
          protocol: null,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Get protocol logs for progress tracking
    const logs = await query<{
      day_index: number;
      completed: boolean;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT day_index, completed, notes, created_at
       FROM protocol_logs
       WHERE protocol_run_id = $1
       ORDER BY day_index ASC`,
      [protocolRun.id]
    );

    // Calculate current day from state or logs
    const state = protocolRun.state as { current_day?: number; day?: number } | null;
    const config = protocolRun.protocol_config as { duration?: number; days?: unknown[] } | null;
    const totalDays = config?.duration || (config?.days?.length || 0);
    
    let currentDay = state?.current_day || state?.day || 1;
    // If we have completed logs, current day should be at least the next uncompleted day
    const completedDays = logs.filter((log) => log.completed).map((log) => log.day_index);
    if (completedDays.length > 0) {
      const maxCompleted = Math.max(...completedDays);
      currentDay = Math.max(currentDay, maxCompleted + 1);
    }
    // Don't exceed total days
    currentDay = Math.min(currentDay, totalDays || 1);

    logger.info("Current protocol fetched", {
      userId,
      protocolRunId: protocolRun.id,
      currentDay,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        active: true,
        protocol: {
          id: protocolRun.protocol_id,
          name: protocolRun.protocol_name,
          slug: protocolRun.protocol_slug,
          config: protocolRun.protocol_config,
          run: {
            id: protocolRun.id,
            status: protocolRun.status,
            startedAt: protocolRun.started_at.toISOString(),
            state: protocolRun.state,
            currentDay,
            totalDays,
            logs: logs.map((log) => ({
              dayIndex: log.day_index,
              completed: log.completed,
              notes: log.notes,
              createdAt: log.created_at.toISOString(),
            })),
          },
        },
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Current protocol API error", error);
    return createErrorResponse("Failed to fetch current protocol", requestId, 500);
  }
}

