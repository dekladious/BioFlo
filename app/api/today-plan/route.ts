import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { generateTodayPlan, CoachContext } from "@/lib/ai/gateway";
import { getWearableSummaryForContext } from "@/lib/utils/wearable-summary";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Fetch or generate today's plan
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

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Check if plan already exists for today
    const cachedPlan = await queryOne<{ plan: unknown }>(
      "SELECT plan FROM daily_plans WHERE user_id = $1 AND date = $2",
      [user.id, today]
    );

    if (cachedPlan) {
      logger.info("Today Plan: Returning cached plan", { userId, date: today, requestId });
      return Response.json({
        success: true,
        data: {
          plan: cachedPlan.plan,
          cached: true,
          date: today,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Generate new plan
    logger.info("Today Plan: Generating new plan", { userId, date: today, requestId });

    // Load user profile
    const profile = await queryOne<{
      goals?: unknown;
      main_struggles?: string[];
    }>("SELECT goals, main_struggles FROM users WHERE id = $1", [user.id]);

    // Load last 7-14 days of check-ins
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const checkIns = await query<{
      mood: number | null;
      energy: number | null;
      sleep_quality: number | null;
      created_at: Date;
    }>(
      `SELECT mood, energy, sleep_quality, created_at
       FROM check_ins
       WHERE user_id = $1 AND created_at >= $2
       ORDER BY created_at DESC`,
      [user.id, fourteenDaysAgo.toISOString()]
    );

    // Generate wearable summary using helper
    const wearableSummary = await getWearableSummaryForContext(user.id, 14);

    // Build check-ins summary
    let checkInsSummary = "";
    if (checkIns.length > 0) {
      const avgMood = checkIns
        .filter((c) => c.mood !== null)
        .reduce((sum, c) => sum + (c.mood || 0), 0) /
        checkIns.filter((c) => c.mood !== null).length;
      
      const avgEnergy = checkIns
        .filter((c) => c.energy !== null)
        .reduce((sum, c) => sum + (c.energy || 0), 0) /
        checkIns.filter((c) => c.energy !== null).length;

      checkInsSummary = `Recent check-ins: avg mood ${avgMood ? avgMood.toFixed(1) : "N/A"}/10, avg energy ${avgEnergy ? avgEnergy.toFixed(1) : "N/A"}/10`;
    }

    // Combine summaries
    const combinedSummary = [wearableSummary, checkInsSummary].filter(Boolean).join(". ");

    // Build context for AI Gateway
    const context: CoachContext = {
      userId,
      messages: [],
      profile: {
        goals: (profile?.goals as Record<string, unknown>) || {},
        mainStruggles: profile?.main_struggles || [],
      },
      wearableSummary: combinedSummary || undefined,
    };

    // Generate plan using AI Gateway
    const plan = await generateTodayPlan(context);

    // Cache the plan
    await query(
      `INSERT INTO daily_plans (user_id, date, plan)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET plan = EXCLUDED.plan`,
      [user.id, today, JSON.stringify(plan)]
    );

    logger.info("Today Plan: Generated and cached", { userId, date: today, requestId });

    return Response.json({
      success: true,
      data: {
        plan,
        cached: false,
        date: today,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Today Plan API error", error);
    return createErrorResponse("Failed to generate today's plan", requestId, 500);
  }
}

