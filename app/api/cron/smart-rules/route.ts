import { query } from "@/lib/db/client";
import { evaluateAllSmartRules, createNudge } from "@/lib/utils/smart-rules";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

/**
 * POST: Evaluate smart rules for all users (or specific user)
 * 
 * This endpoint should be called by a cron job or background worker.
 * Can be triggered manually for testing.
 * 
 * Query params:
 * - userId: Optional - if provided, only evaluate for this user
 * - limit: Optional - max number of users to process (default: 100)
 */
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    // Optional: Add authentication/authorization check for cron jobs
    // For now, we'll allow it but in production you'd want to verify
    // the request comes from your cron service (e.g., Vercel Cron, GitHub Actions, etc.)

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("userId");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

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
      // Get all active users (with subscription_status = 'active' or 'none' for free tier)
      const users = await query<{ id: string }>(
        `SELECT id FROM users 
         WHERE subscription_status IN ('active', 'none')
         LIMIT $1`,
        [limit]
      );
      userIds = users.map((u) => u.id);
    }

    if (userIds.length === 0) {
      return Response.json({
        success: true,
        data: {
          message: "No users to process",
          processed: 0,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    let processed = 0;
    let nudgesCreated = 0;

    for (const userId of userIds) {
      try {
        // Check if user already has recent nudges (avoid spam)
        const recentNudges = await query<{ id: number }>(
          `SELECT id FROM nudges
           WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
           LIMIT 1`,
          [userId]
        );

        // Skip if user already has nudges in last 24 hours
        if (recentNudges.length > 0) {
          logger.debug("Skipping user - recent nudges exist", { userId });
          continue;
        }

        // Evaluate all smart rules
        const nudges = await evaluateAllSmartRules(userId);

        // Create nudges (only create one per user to avoid spam)
        if (nudges.length > 0) {
          // Sort by severity (high > medium > low) and take the most important one
          const sortedNudges = nudges.sort((a, b) => {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
          });

          await createNudge(userId, sortedNudges[0], "in_app");
          nudgesCreated++;
        }

        processed++;
      } catch (error) {
        logger.error("Failed to process user for smart rules", { error, userId });
        // Continue with next user
      }
    }

    logger.info("Smart rules cron completed", {
      processed,
      nudgesCreated,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        message: "Smart rules evaluation completed",
        processed,
        nudgesCreated,
        totalUsers: userIds.length,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Smart rules cron error", error);
    return createErrorResponse("Failed to evaluate smart rules", requestId, 500);
  }
}

