import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// POST: Stop/abandon a protocol
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { protocolRunId } = body;

    if (!protocolRunId || typeof protocolRunId !== "number") {
      return createErrorResponse("protocolRunId is required and must be a number", requestId, 400);
    }

    // Get user ID from database
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Verify protocol run belongs to user and is active
    const protocolRun = await queryOne<{ id: number; status: string }>(
      "SELECT id, status FROM protocol_runs WHERE id = $1 AND user_id = $2",
      [protocolRunId, user.id]
    );

    if (!protocolRun) {
      return createErrorResponse("Protocol run not found", requestId, 404);
    }

    if (protocolRun.status !== "active") {
      return createErrorResponse("Protocol is not active", requestId, 400);
    }

    // Mark as abandoned
    await query(
      "UPDATE protocol_runs SET status = 'abandoned' WHERE id = $1",
      [protocolRunId]
    );

    logger.info("Protocol stopped", {
      userId,
      protocolRunId,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        message: "Protocol stopped successfully",
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Stop protocol API error", error);
    return createErrorResponse("Failed to stop protocol", requestId, 500);
  }
}

