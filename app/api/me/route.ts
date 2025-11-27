import { auth, currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Get current user profile
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Get Clerk user data
    const clerkUser = await currentUser();

    // Get user record from database
    const user = await queryOne<{
      id: string;
      email: string | null;
      full_name: string | null;
      subscription_tier: string;
      subscription_status: string;
      goals: unknown;
      main_struggles: unknown;
      onboarding_completed: boolean | null;
      today_mode: string | null;
    }>(
      `SELECT id, email, full_name, subscription_tier, subscription_status, goals, main_struggles, onboarding_completed, today_mode
       FROM users
       WHERE clerk_user_id = $1`,
      [userId]
    );

    // If user doesn't exist in DB, return basic Clerk data (new user, needs onboarding)
    if (!user) {
      return Response.json({
        success: true,
        data: {
          clerkUserId: userId,
          email: clerkUser?.emailAddresses[0]?.emailAddress || null,
          fullName: clerkUser?.firstName && clerkUser?.lastName
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser?.username || null,
          subscriptionTier: "free",
          subscriptionStatus: "none",
          goals: {},
          mainStruggles: [],
          onboardingCompleted: false,
          needsOnboarding: true,
          todayMode: "NORMAL",
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info("User profile fetched", { userId, requestId });

    // Check if user has completed onboarding (either explicit flag or has goals set)
    const hasCompletedOnboarding = user.onboarding_completed === true || 
      (user.goals !== null && Object.keys(user.goals as object || {}).length > 0);

    return Response.json({
      success: true,
      data: {
        id: user.id,
        clerkUserId: userId,
        email: user.email || clerkUser?.emailAddresses[0]?.emailAddress || null,
        fullName: user.full_name || (clerkUser?.firstName && clerkUser?.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser?.username || null),
        subscriptionTier: user.subscription_tier || "free",
        subscriptionStatus: user.subscription_status || "none",
        goals: user.goals || {},
        mainStruggles: user.main_struggles || [],
        onboardingCompleted: hasCompletedOnboarding,
        needsOnboarding: !hasCompletedOnboarding,
        todayMode: user.today_mode || "NORMAL",
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("User profile API error", error);
    return createErrorResponse("Failed to fetch user profile", requestId, 500);
  }
}

