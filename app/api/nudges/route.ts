import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Fetch user's nudges
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

    // Parse query parameters
    const url = new URL(req.url);
    const delivered = url.searchParams.get("delivered"); // 'true' or 'false' or null for all
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    let queryStr = `
      SELECT id, type, payload, channel, created_at, delivered_at
      FROM nudges
      WHERE user_id = $1
    `;
    const params: unknown[] = [user.id];

    if (delivered === "true") {
      queryStr += " AND delivered_at IS NOT NULL";
    } else if (delivered === "false") {
      queryStr += " AND delivered_at IS NULL";
    }

    queryStr += " ORDER BY created_at DESC LIMIT $2";
    params.push(limit);

    const nudges = await query<{
      id: number;
      type: string;
      payload: unknown;
      channel: string;
      created_at: Date;
      delivered_at: Date | null;
    }>(queryStr, params);

    logger.info("Nudges fetched", {
      userId,
      count: nudges.length,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        nudges: nudges.map((n) => ({
          id: n.id,
          type: n.type,
          payload: n.payload,
          channel: n.channel,
          createdAt: n.created_at.toISOString(),
          deliveredAt: n.delivered_at?.toISOString() || null,
        })),
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Nudges API error", error);
    return createErrorResponse("Failed to fetch nudges", requestId, 500);
  }
}

// POST: Mark nudge as delivered
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { nudgeId } = body;

    if (!nudgeId || typeof nudgeId !== "number") {
      return createErrorResponse("nudgeId is required and must be a number", requestId, 400);
    }

    // Get user ID from database
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Update nudge delivery status
    await query(
      `UPDATE nudges 
       SET delivered_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [nudgeId, user.id]
    );

    logger.info("Nudge marked as delivered", {
      userId,
      nudgeId,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        message: "Nudge marked as delivered",
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Nudge delivery API error", error);
    return createErrorResponse("Failed to mark nudge as delivered", requestId, 500);
  }
}

