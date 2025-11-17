import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// POST: Start a protocol
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { protocolId } = body;

    if (!protocolId || typeof protocolId !== "number") {
      return createErrorResponse("protocolId is required and must be a number", requestId, 400);
    }

    // Get user ID from database
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Verify protocol exists
    const protocol = await queryOne<{ id: number; config: unknown }>(
      "SELECT id, config FROM protocols WHERE id = $1",
      [protocolId]
    );

    if (!protocol) {
      return createErrorResponse("Protocol not found", requestId, 404);
    }

    // Check if user already has ANY active protocol run
    const existingActiveRun = await queryOne<{ id: number; protocol_id: number }>(
      "SELECT id, protocol_id FROM protocol_runs WHERE user_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1",
      [user.id]
    );

    if (existingActiveRun) {
      // If trying to start the same protocol, return existing run
      if (existingActiveRun.protocol_id === protocolId) {
        return Response.json({
          success: true,
          data: {
            message: "Protocol already active",
            protocolRunId: existingActiveRun.id,
          },
          requestId,
          timestamp: new Date().toISOString(),
          });
      }
      // If different protocol, mark old one as abandoned
      await query(
        "UPDATE protocol_runs SET status = 'abandoned' WHERE id = $1",
        [existingActiveRun.id]
      );
      logger.info("Protocol abandoned", {
        userId,
        abandonedRunId: existingActiveRun.id,
        newProtocolId: protocolId,
        requestId,
      });
    }

    // Create new protocol run
    const result = await query<{ id: number }>(
      `INSERT INTO protocol_runs (user_id, protocol_id, status, state)
       VALUES ($1, $2, 'active', $3)
       RETURNING id`,
      [user.id, protocolId, JSON.stringify({ day: 1, started: new Date().toISOString() })]
    );

    const protocolRunId = result[0]?.id;
    if (!protocolRunId) {
      throw new Error("Failed to create protocol run");
    }

    logger.info("Protocol started", {
      userId,
      protocolId,
      protocolRunId,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        message: "Protocol started successfully",
        protocolRunId,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Start protocol API error", error);
    return createErrorResponse("Failed to start protocol", requestId, 500);
  }
}

