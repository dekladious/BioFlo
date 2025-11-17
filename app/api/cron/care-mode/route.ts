import { query } from "@/lib/db/client";
import { detectDeviations, createCheckInPrompt, sendCareModeAlert } from "@/lib/utils/care-mode";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

/**
 * POST: Evaluate care mode for all enabled users
 * 
 * This endpoint should be called by a cron job periodically (e.g., every hour).
 * 
 * Query params:
 * - userId: Optional - if provided, only evaluate for this user
 */
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("userId");

    let userIds: string[] = [];

    if (targetUserId) {
      // Evaluate for specific user
      const user = await query<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1 OR id::text = $1",
        [targetUserId]
      );
      if (user.length > 0) {
        userIds = [user[0].id];
      }
    } else {
      // Get all users with care mode enabled
      const users = await query<{ id: string }>(
        `SELECT user_id as id FROM care_mode_settings WHERE enabled = TRUE`
      );
      userIds = users.map((u) => u.id);
    }

    if (userIds.length === 0) {
      return Response.json({
        success: true,
        data: {
          message: "No users with care mode enabled",
          processed: 0,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    let processed = 0;
    let deviationsDetected = 0;
    let alertsSent = 0;

    for (const userId of userIds) {
      try {
        // Get care mode settings
        const settings = await query<{
          contacts: unknown;
          check_in_timeout_hours: number;
        }>(
          "SELECT contacts, check_in_timeout_hours FROM care_mode_settings WHERE user_id = $1",
          [userId]
        );

        if (settings.length === 0) {
          continue;
        }

        const contacts = (settings[0].contacts as Array<{ name: string; email?: string; phone?: string }>) || [];
        const timeoutHours = settings[0].check_in_timeout_hours || 2;

        // Check for pending check-ins that haven't been responded to
        const pendingCheckIns = await query<{
          id: string;
          prompt_sent_at: Date;
        }>(
          `SELECT id, prompt_sent_at
           FROM care_mode_check_ins
           WHERE user_id = $1 AND responded_at IS NULL
           ORDER BY prompt_sent_at DESC
           LIMIT 1`,
          [userId]
        );

        // If there's a pending check-in, check if timeout has passed
        if (pendingCheckIns.length > 0) {
          const checkIn = pendingCheckIns[0];
          const timeoutMs = timeoutHours * 60 * 60 * 1000;
          const timeSincePrompt = new Date().getTime() - new Date(checkIn.prompt_sent_at).getTime();

          if (timeSincePrompt > timeoutMs) {
            // Timeout passed, send alerts to contacts
            const alertData = await query<{ response_data: unknown }>(
              "SELECT response_data FROM care_mode_check_ins WHERE id = $1",
              [checkIn.id]
            );

            const alert = alertData[0]?.response_data as { alert?: { message: string; severity: string } } || {
              alert: {
                message: "No response to check-in prompt",
                severity: "medium",
              },
            };

            await sendCareModeAlert(
              userId,
              checkIn.id,
              contacts,
              {
                detected: true,
                severity: (alert.alert?.severity as "low" | "medium" | "high") || "medium",
                message: alert.alert?.message || "No response to check-in prompt",
                data: {},
              }
            );

            alertsSent++;
            logger.info("Care mode alert sent (timeout)", {
              userId,
              checkInId: checkIn.id,
              contactsCount: contacts.length,
            });
          }
          // Skip deviation detection if there's already a pending check-in
          continue;
        }

        // Detect deviations
        const deviation = await detectDeviations(userId);

        if (deviation && deviation.detected) {
          // Create check-in prompt
          const checkInId = await createCheckInPrompt(userId, deviation);

          if (checkInId) {
            deviationsDetected++;
            logger.info("Care mode deviation detected, check-in prompt created", {
              userId,
              checkInId,
              severity: deviation.severity,
            });
          }
        }

        processed++;
      } catch (error) {
        logger.error("Failed to process user for care mode", { error, userId });
        // Continue with next user
      }
    }

    logger.info("Care mode cron completed", {
      processed,
      deviationsDetected,
      alertsSent,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        message: "Care mode evaluation completed",
        processed,
        deviationsDetected,
        alertsSent,
        totalUsers: userIds.length,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Care mode cron error", error);
    return createErrorResponse("Failed to evaluate care mode", requestId, 500);
  }
}

