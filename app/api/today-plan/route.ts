import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { generateTodayPlan, CoachContext } from "@/lib/ai/gateway";
import { getWearableSummaryForContext } from "@/lib/utils/wearable-summary";
import { getProtocolStatusSummary } from "@/lib/utils/protocol-context";
import {
  getExperimentDigest,
  getCareStatusDigest,
  getWomensHealthDigest,
} from "@/lib/utils/context-summaries";
import { buildCheckInSummaries } from "@/lib/utils/trends";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

const GOAL_MODES = ["NORMAL", "RECOVERY", "TRAVEL", "DEEP_WORK", "RESET", "GROWTH"] as const;
type GoalMode = (typeof GOAL_MODES)[number];

function sanitizeMode(mode?: string | null): GoalMode {
  if (!mode) return "NORMAL";
  const upper = mode.toUpperCase();
  return (GOAL_MODES as readonly string[]).includes(upper) ? (upper as GoalMode) : "NORMAL";
}

// GET: Fetch or generate today's plan
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "1";

    // Get user record
    const user = await queryOne<{
      id: string;
      goals?: unknown;
      main_struggles?: string[] | Record<string, unknown> | string;
      today_mode?: string | null;
    }>("SELECT id, goals, main_struggles, today_mode FROM users WHERE clerk_user_id = $1", [
      userId,
    ]);

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const goalMode = sanitizeMode(user.today_mode);

    // Check if plan already exists for today
    const cachedPlan = await queryOne<{ plan: unknown }>(
      "SELECT plan FROM daily_plans WHERE user_id = $1 AND date = $2",
      [user.id, today]
    );

    if (forceRefresh && cachedPlan) {
      await query("DELETE FROM daily_plans WHERE user_id = $1 AND date = $2", [user.id, today]);
    }

    if (!forceRefresh && cachedPlan) {
      const planObject = cachedPlan.plan as Record<string, any>;
      const planMode = planObject?.meta?.goalMode || "NORMAL";
      if (planMode === goalMode) {
        logger.info("Today Plan: Returning cached plan", { userId, date: today, requestId });
        return Response.json({
          success: true,
          data: {
            plan: planObject,
            cached: true,
            date: today,
          },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Generate new plan
    logger.info("Today Plan: Generating new plan", { userId, date: today, requestId });

    // Load user profile (goals / struggles)
    const userProfileString = (() => {
      const rawStruggles = user.main_struggles;
      const strugglesArray = Array.isArray(rawStruggles)
        ? rawStruggles
        : typeof rawStruggles === "string"
        ? JSON.parse(rawStruggles || "[]")
        : rawStruggles && typeof rawStruggles === "object"
        ? Object.values(rawStruggles)
        : [];

      return `Goals: ${JSON.stringify(user.goals || {})}
Main struggles: ${strugglesArray.join(", ") || "None listed"}`;
    })();

    // Load last 14 days of check-ins
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const checkInsQuery =
      "SELECT mood, energy, sleep_quality, created_at FROM check_ins WHERE user_id = $1 AND created_at >= $2 ORDER BY created_at DESC";
    const checkIns = await query<{
      mood: number | null;
      energy: number | null;
      sleep_quality: number | null;
      created_at: Date;
    }>(checkInsQuery, [user.id, fourteenDaysAgo.toISOString()]);

    const { recentSummary, trendSummary } = buildCheckInSummaries(checkIns);

    // Generate wearable summary using helper
    const wearableSummary = await getWearableSummaryForContext(user.id, 14);

    const protocolStatus = await getProtocolStatusSummary(user.id);
    const [experimentDigest, careDigest, womensDigest] = await Promise.all([
      getExperimentDigest(user.id, 4),
      getCareStatusDigest(user.id),
      getWomensHealthDigest(user.id),
    ]);

    const context: CoachContext = {
      userProfile: userProfileString,
      recentCheckIns: recentSummary,
      wearableSummary: wearableSummary || undefined,
      protocolStatus: protocolStatus || "No active protocols",
      todayMode: goalMode,
      experimentsSummary: experimentDigest.summary,
      trendInsights: trendSummary,
      careStatus: careDigest.summary,
      womensHealthSummary: womensDigest.summary,
    };

    // Generate plan using AI Gateway
    const plan = await generateTodayPlan(context, today);

    const planWithMeta = {
      ...plan,
      meta: {
        goalMode,
        generatedAt: new Date().toISOString(),
        trendInsights: trendSummary,
        experimentsSummary: experimentDigest.summary,
        careStatus: careDigest.summary,
        womensHealthSummary: womensDigest.summary,
      },
    };

    // Cache the plan
    await query(
      `INSERT INTO daily_plans (user_id, date, plan)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET plan = EXCLUDED.plan`,
      [user.id, today, JSON.stringify(planWithMeta)]
    );

    logger.info("Today Plan: Generated and cached", { userId, date: today, requestId });

    return Response.json({
      success: true,
      data: {
        plan: planWithMeta,
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

