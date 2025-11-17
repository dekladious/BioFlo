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
    const {
      goals, // Structured goals object
      struggles, // Array of main struggles
      routine, // Daily routine info (optional)
      motivation, // What motivates them (optional)
      preferences, // User preferences (dietary, activity, etc.)
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
    if (preferences) {
      await query(
        `INSERT INTO user_preferences (
          user_id, dietary_preference, fasting_protocol, sleep_goal_hours,
          activity_level, health_goals, biohacking_experience
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) DO UPDATE SET
          dietary_preference = EXCLUDED.dietary_preference,
          fasting_protocol = EXCLUDED.fasting_protocol,
          sleep_goal_hours = EXCLUDED.sleep_goal_hours,
          activity_level = EXCLUDED.activity_level,
          health_goals = EXCLUDED.health_goals,
          biohacking_experience = EXCLUDED.biohacking_experience,
          updated_at = NOW()`,
        [
          user.id,
          preferences.dietaryPreference || null,
          preferences.fastingProtocol || null,
          preferences.sleepGoalHours || null,
          preferences.activityLevel || null,
          preferences.healthGoals || null,
          preferences.biohackingExperience || null,
        ]
      );
    }

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

