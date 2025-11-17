import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { generateWeeklyDebrief, CoachContext } from "@/lib/ai/gateway";
import { getWearableSummaryForContext } from "@/lib/utils/wearable-summary";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Fetch or generate weekly debrief
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

    // Calculate week boundaries (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Check if debrief already exists for this week
    const cachedDebrief = await queryOne<{ debrief: unknown }>(
      "SELECT debrief FROM weekly_debriefs WHERE user_id = $1 AND week_start = $2",
      [user.id, weekStartStr]
    );

    if (cachedDebrief) {
      logger.info("Weekly Debrief: Returning cached debrief", {
        userId,
        weekStart: weekStartStr,
        requestId,
      });
      return Response.json({
        success: true,
        data: {
          debrief: cachedDebrief.debrief,
          cached: true,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Generate new debrief
    logger.info("Weekly Debrief: Generating new debrief", {
      userId,
      weekStart: weekStartStr,
      requestId,
    });

    // Load user profile
    const profile = await queryOne<{
      goals?: unknown;
      main_struggles?: string[];
    }>("SELECT goals, main_struggles FROM users WHERE id = $1", [user.id]);

    // Load check-ins for this week
    const checkIns = await query<{
      mood: number | null;
      energy: number | null;
      sleep_quality: number | null;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT mood, energy, sleep_quality, notes, created_at
       FROM check_ins
       WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
       ORDER BY created_at DESC`,
      [user.id, weekStart.toISOString(), weekEnd.toISOString()]
    );

    // Generate wearable summary for this week using helper
    const daysDiff = Math.ceil((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const wearableSummary = await getWearableSummaryForContext(user.id, daysDiff);

    // Build check-ins summary
    const summaries: string[] = [];

    if (checkIns.length > 0) {
      const avgMood = checkIns
        .filter((c) => c.mood !== null)
        .reduce((sum, c) => sum + (c.mood || 0), 0) /
        checkIns.filter((c) => c.mood !== null).length;
      
      const avgEnergy = checkIns
        .filter((c) => c.energy !== null)
        .reduce((sum, c) => sum + (c.energy || 0), 0) /
        checkIns.filter((c) => c.energy !== null).length;

      summaries.push(`Check-ins: ${checkIns.length} entries, avg mood ${avgMood ? avgMood.toFixed(1) : "N/A"}/10, avg energy ${avgEnergy ? avgEnergy.toFixed(1) : "N/A"}/10`);
    }

    if (wearableSummary) {
      summaries.push(wearableSummary);
    }

    const combinedSummary = summaries.join(". ");

    // Build context for AI Gateway
    const context: CoachContext = {
      userId,
      messages: [], // Could include recent chat messages for context
      profile: {
        goals: (profile?.goals as Record<string, unknown>) || {},
        mainStruggles: profile?.main_struggles || [],
      },
      wearableSummary: combinedSummary || undefined,
    };

    // Generate debrief using AI Gateway
    const debrief = await generateWeeklyDebrief(context);

    // Cache the debrief
    await query(
      `INSERT INTO weekly_debriefs (user_id, week_start, week_end, debrief)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, week_start) DO UPDATE SET debrief = EXCLUDED.debrief`,
      [user.id, weekStartStr, weekEndStr, JSON.stringify(debrief)]
    );

    logger.info("Weekly Debrief: Generated and cached", {
      userId,
      weekStart: weekStartStr,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        debrief,
        cached: false,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Weekly Debrief API error", error);
    return createErrorResponse("Failed to generate weekly debrief", requestId, 500);
  }
}

