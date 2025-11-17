import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Get reminder settings
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Get reminder settings from user_preferences or return defaults
    const prefs = await queryOne<{ check_in_reminder_enabled: boolean; check_in_reminder_time: string | null }>(
      `SELECT check_in_reminder_enabled, check_in_reminder_time 
       FROM user_preferences 
       WHERE user_id = $1`,
      [user.id]
    );

    return Response.json({
      success: true,
      data: {
        enabled: prefs?.check_in_reminder_enabled ?? true,
        time: prefs?.check_in_reminder_time ?? "20:00", // Default 8 PM
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Reminder settings API error", error);
    return createErrorResponse("Failed to fetch reminder settings", requestId, 500);
  }
}

// POST: Update reminder settings
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { enabled, time } = body;

    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Validate time format (HH:MM)
    if (time && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return createErrorResponse("Invalid time format. Use HH:MM (24-hour format)", requestId, 400);
    }

    // Update or insert reminder settings
    await query(
      `INSERT INTO user_preferences (user_id, check_in_reminder_enabled, check_in_reminder_time)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         check_in_reminder_enabled = EXCLUDED.check_in_reminder_enabled,
         check_in_reminder_time = EXCLUDED.check_in_reminder_time,
         updated_at = NOW()`,
      [user.id, enabled !== false, time || "20:00"]
    );

    logger.info("Reminder settings updated", { userId, enabled, time, requestId });

    return Response.json({
      success: true,
      data: { message: "Reminder settings updated" },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Reminder settings update error", error);
    return createErrorResponse("Failed to update reminder settings", requestId, 500);
  }
}

