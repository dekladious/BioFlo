import { auth, currentUser } from "@clerk/nextjs/server";
import { getDbPool, queryOne, query } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Fetch user profile
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Check if database is available
    const pool = getDbPool();
    
    // Get or create user record
    let user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      // Create user record
      const result = await query<{ id: string }>(
        "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
        [userId]
      );
      user = result[0];
    }

    // Get preferences
    const preferences = await queryOne<{
      dietary_preference: string | null;
      fasting_protocol: string | null;
      sleep_goal_hours: number | null;
      activity_level: string | null;
      health_goals: string[] | null;
      supplements: unknown;
      biohacking_experience: string | null;
    }>(
      "SELECT dietary_preference, fasting_protocol, sleep_goal_hours, activity_level, health_goals, supplements, biohacking_experience FROM user_preferences WHERE user_id = $1",
      [user.id]
    );

    // Get Clerk user for email
    const clerkUser = await currentUser();

    return Response.json({
      success: true,
      data: {
        displayName: clerkUser?.firstName && clerkUser?.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser?.username || null,
        email: clerkUser?.emailAddresses[0]?.emailAddress || null,
        preferences: preferences || null,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Profile API error", error);
    
    // If database error, return basic profile from Clerk
    if (error instanceof Error && error.message.includes("DATABASE_URL")) {
      const clerkUser = await currentUser();
      return Response.json({
        success: true,
        data: {
          displayName: clerkUser?.firstName && clerkUser?.lastName
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser?.username || null,
          email: clerkUser?.emailAddresses[0]?.emailAddress || null,
          preferences: null,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    return createErrorResponse("Failed to fetch profile", requestId, 500);
  }
}

// PUT: Update user profile
export async function PUT(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { displayName, prefs, goals } = body;

    // Check if database is available
    try {
      const pool = getDbPool();
      
      // Get or create user record
      let user = await queryOne<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [userId]
      );

      if (!user) {
        const result = await query<{ id: string }>(
          "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        user = result[0];
      }

      // Update or insert preferences
      await query(
        `INSERT INTO user_preferences (
          user_id, dietary_preference, fasting_protocol, sleep_goal_hours,
          activity_level, health_goals, supplements, biohacking_experience
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          dietary_preference = EXCLUDED.dietary_preference,
          fasting_protocol = EXCLUDED.fasting_protocol,
          sleep_goal_hours = EXCLUDED.sleep_goal_hours,
          activity_level = EXCLUDED.activity_level,
          health_goals = EXCLUDED.health_goals,
          supplements = EXCLUDED.supplements,
          biohacking_experience = EXCLUDED.biohacking_experience,
          updated_at = NOW()`,
        [
          user.id,
          prefs?.dietaryPreference || null,
          prefs?.fastingProtocol || null,
          prefs?.sleepGoalHours || null,
          prefs?.activityLevel || null,
          goals || null,
          prefs?.supplements ? JSON.stringify(prefs.supplements) : null,
          prefs?.biohackingExperience || null,
        ]
      );

      logger.info("Profile updated", { userId, requestId });

      return Response.json({
        success: true,
        data: { message: "Profile updated successfully" },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (dbError: unknown) {
      // If database not available, just log and return success (graceful degradation)
      if (dbError instanceof Error && dbError.message.includes("DATABASE_URL")) {
        logger.warn("Database not configured, skipping profile save", { userId, requestId });
        return Response.json({
          success: true,
          data: { message: "Profile update skipped (database not configured)" },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
      throw dbError;
    }
  } catch (error: unknown) {
    logger.error("Profile update error", error);
    return createErrorResponse("Failed to update profile", requestId, 500);
  }
}

