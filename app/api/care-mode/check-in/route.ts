import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { recordCheckInResponse } from "@/lib/utils/care-mode";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Get pending check-ins
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

    // Get pending check-ins (not responded to)
    // Handle case where table might not exist
    let checkIns: Array<{
      id: string;
      prompt_sent_at: Date;
      response_data: unknown;
    }> = [];
    
    try {
      checkIns = await query<{
        id: string;
        prompt_sent_at: Date;
        response_data: unknown;
      }>(
        `SELECT id, prompt_sent_at, response_data
         FROM care_mode_check_ins
         WHERE user_id = $1 AND responded_at IS NULL
         ORDER BY prompt_sent_at DESC
         LIMIT 5`,
        [user.id]
      );
    } catch (dbError: unknown) {
      // If table doesn't exist, return empty array
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
        logger.warn("Care mode check-ins table does not exist, returning empty array", {
          userId,
          requestId,
        });
        checkIns = [];
      } else {
        throw dbError; // Re-throw other errors
      }
    }

    return Response.json({
      success: true,
      data: {
        checkIns: checkIns.map((ci) => ({
          id: ci.id,
          promptSentAt: ci.prompt_sent_at.toISOString(),
          alert: ci.response_data,
        })),
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Care mode check-ins API error", error);
    return createErrorResponse("Failed to fetch check-ins", requestId, 500);
  }
}

// POST: Respond to check-in prompt
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { checkInId, okay, notes } = body;

    if (!checkInId || typeof checkInId !== "string") {
      return createErrorResponse("checkInId is required", requestId, 400);
    }

    if (okay === undefined || typeof okay !== "boolean") {
      return createErrorResponse("okay is required and must be a boolean", requestId, 400);
    }

    // Get user ID from database
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Record response
    await recordCheckInResponse(checkInId, user.id, {
      okay,
      notes: notes || undefined,
    });

    logger.info("Care mode check-in response recorded", {
      userId,
      checkInId,
      okay,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        message: "Check-in response recorded",
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Care mode check-in response error", error);
    return createErrorResponse("Failed to record check-in response", requestId, 500);
  }
}

