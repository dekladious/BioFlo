import { auth, currentUser } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { generateOnboardingAssessment, CoachContext } from "@/lib/ai/gateway";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    
    // Support both old and new onboarding data formats
    const {
      goals, // Structured goals object (new: { primaryGoal, healthGoals })
      struggles, // Array of main struggles (legacy)
      routine, // Daily routine info (optional)
      motivation, // What motivates them (optional)
      preferences, // User preferences (dietary, activity, etc.)
      schedule, // New: { wakeTime, sleepTime, workSchedule, trainingDays, trainingPreferredTime }
      wearable, // New: { hasWearable, wearableType }
    } = body;

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
      if (result.length === 0 || !result[0]) {
        throw new Error("Failed to create user record");
      }
      user = result[0];
    }

    // Update user profile with goals and main_struggles
    await query(
      `UPDATE users 
       SET goals = $1, main_struggles = $2, updated_at = NOW()
       WHERE id = $3`,
      [
        goals ? JSON.stringify(goals) : null,
        struggles ? JSON.stringify(struggles) : null,
        user.id,
      ]
    );

    // Update or insert user preferences if provided
    if (preferences || schedule) {
      await query(
        `INSERT INTO user_preferences (
          user_id, dietary_preference, fasting_protocol, sleep_goal_hours,
          activity_level, health_goals, biohacking_experience,
          default_wake_time, default_sleep_time, work_schedule, training_days, training_preferred_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (user_id) DO UPDATE SET
          dietary_preference = COALESCE(EXCLUDED.dietary_preference, user_preferences.dietary_preference),
          fasting_protocol = COALESCE(EXCLUDED.fasting_protocol, user_preferences.fasting_protocol),
          sleep_goal_hours = COALESCE(EXCLUDED.sleep_goal_hours, user_preferences.sleep_goal_hours),
          activity_level = COALESCE(EXCLUDED.activity_level, user_preferences.activity_level),
          health_goals = COALESCE(EXCLUDED.health_goals, user_preferences.health_goals),
          biohacking_experience = COALESCE(EXCLUDED.biohacking_experience, user_preferences.biohacking_experience),
          default_wake_time = COALESCE(EXCLUDED.default_wake_time, user_preferences.default_wake_time),
          default_sleep_time = COALESCE(EXCLUDED.default_sleep_time, user_preferences.default_sleep_time),
          work_schedule = COALESCE(EXCLUDED.work_schedule, user_preferences.work_schedule),
          training_days = COALESCE(EXCLUDED.training_days, user_preferences.training_days),
          training_preferred_time = COALESCE(EXCLUDED.training_preferred_time, user_preferences.training_preferred_time),
          updated_at = NOW()`,
        [
          user.id,
          preferences?.dietaryPreference || null,
          preferences?.fastingProtocol || null,
          preferences?.sleepGoalHours || null,
          preferences?.activityLevel || null,
          goals?.healthGoals ? JSON.stringify(goals.healthGoals) : (preferences?.healthGoals || null),
          preferences?.biohackingExperience || null,
          schedule?.wakeTime || null,
          schedule?.sleepTime || null,
          schedule?.workSchedule || null,
          schedule?.trainingDays ? JSON.stringify(schedule.trainingDays) : null,
          schedule?.trainingPreferredTime || null,
        ]
      );
    }

    // Update wearable info if provided
    if (wearable?.hasWearable && wearable.wearableType) {
      await query(
        `INSERT INTO wearable_devices (user_id, device_type, connected, last_sync_at)
         VALUES ($1, $2, false, NULL)
         ON CONFLICT (user_id, device_type) DO NOTHING`,
        [user.id, wearable.wearableType]
      );
    }

    // Mark onboarding as complete
    await query(
      `UPDATE users SET onboarding_completed = true, onboarding_completed_at = NOW() WHERE id = $1`,
      [user.id]
    );

    // Generate AI onboarding assessment
    const context: CoachContext = {
      userId,
      messages: [],
      profile: {
        goals: goals || {},
        mainStruggles: struggles || [],
        preferences: preferences || {},
      },
    };

    let assessmentMessage = "";
    try {
      assessmentMessage = await generateOnboardingAssessment(context);
    } catch (aiError) {
      logger.error("Onboarding API: AI assessment failed", { error: aiError, userId, requestId });
      // Continue with default message if AI fails
      assessmentMessage =
        "Welcome to BioFlo! I'm here to help you optimize your health and performance. Based on your goals, I'll create personalized protocols and recommendations. Let's get started!";
    }

    // Store initial messages (user onboarding summary + AI assessment)
    const sessionId = randomUUID();
    const onboardingSummary = `I've completed onboarding. My goals: ${JSON.stringify(goals || {})}. Main struggles: ${struggles?.join(", ") || "None specified"}.`;

    try {
      // Save user message (onboarding summary)
      await query(
        `INSERT INTO chat_messages (user_id, thread_id, role, content, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          sessionId,
          "user",
          onboardingSummary,
          JSON.stringify({ source: "onboarding" }),
        ]
      );

      // Save AI assessment message
      await query(
        `INSERT INTO chat_messages (user_id, thread_id, role, content, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          sessionId,
          "assistant",
          assessmentMessage,
          JSON.stringify({ source: "onboarding_assessment", provider: "gateway" }),
        ]
      );
    } catch (dbError) {
      logger.warn("Onboarding API: Failed to save initial messages", {
        error: dbError,
        userId,
        requestId,
      });
      // Continue even if message saving fails
    }

    logger.info("Onboarding completed", {
      userId,
      hasGoals: !!goals,
      strugglesCount: struggles?.length || 0,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        message: "Onboarding completed successfully",
        assessment: assessmentMessage,
        sessionId,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Onboarding API error", error);
    return createErrorResponse("Failed to complete onboarding", requestId, 500);
  }
}

