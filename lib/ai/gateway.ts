/**
 * AI Gateway - Centralized AI orchestration for BioFlo
 * 
 * Implements the routing logic from the BioFlo AI Safety & Prompt Specification.
 * Handles triage, model selection, and specialized prompt routing.
 */

import { streamModel, runModel, ModelError } from "./modelRouter";
import { logger } from "@/lib/logger";
import {
  triageUserMessage,
  getCrisisResponse,
  detectBiohackTopic,
  reviewReplySafety,
  TriageCategory,
} from "./safety";
import {
  buildMainCoachPrompt,
  buildOnboardingAssessmentPrompt,
  buildTodayPlanPrompt,
  buildWeeklyDebriefPrompt,
  buildModerateRiskBiohackPrompt,
  buildExtremeRiskBiohackPrompt,
  buildRestrictedMedicalWellnessPrompt,
  CoachContext,
} from "./prompts";

export type { CoachContext };

export type TodayPlan = {
  focus: string;
  summary: string;
  morning: string[];
  afternoon: string[];
  evening: string[];
  notes?: string[];
};

export type WeeklyDebrief = {
  headline: string;
  summary: string;
  wins: string[];
  challenges: string[];
  patterns: string[];
  focus_for_next_week: string[];
  coach_message: string;
};

/**
 * Generate a coach reply in a conversation
 * Implements full routing logic based on triage classification
 */
export async function generateCoachReply(
  context: CoachContext,
  latestUserMessage: string,
  onToken?: (token: string) => void | Promise<void>
): Promise<string> {
  // Step 1: Triage the user message
  const triage = await triageUserMessage(latestUserMessage);
  logger.info("AI Gateway: Triage result", {
    category: triage.category,
    reason: triage.reason,
    userId: context.userId,
  });

  // Step 2: Route based on triage category
  switch (triage.category) {
    case "MENTAL_HEALTH_CRISIS":
    case "MEDICAL_EMERGENCY_SIGNS":
      // Return fixed response immediately (no AI call)
      return getCrisisResponse(triage.category);

    case "EXTREME_RISK_BIOHACK":
      return handleExtremeRiskBiohack(latestUserMessage, onToken);

    case "MODERATE_RISK_BIOHACK":
      const topicHint = detectBiohackTopic(latestUserMessage);
      return handleModerateRiskBiohack(latestUserMessage, topicHint || undefined, onToken);

    case "MEDICAL_SYMPTOMS_NON_URGENT":
      return handleRestrictedMedicalWellness(latestUserMessage, onToken);

    case "GENERAL_WELLNESS":
    case "MENTAL_HEALTH_NON_CRISIS":
    default:
      // Normal coaching flow
      return handleMainCoachReply(context, latestUserMessage, onToken);
  }
}

/**
 * Handle main coach reply (normal coaching flow)
 */
async function handleMainCoachReply(
  context: CoachContext,
  latestUserMessage: string,
  onToken?: (token: string) => void | Promise<void>
): Promise<string> {
  const { system, user } = buildMainCoachPrompt(context, latestUserMessage);

  // GPT-5 for conversational responses
  let fullResponse = "";
  const tokenHandler = onToken || ((token: string) => {
    fullResponse += token;
  });

  try {
    await streamModel({
      provider: "openai",
      system,
      messages: [{ role: "user", content: user }],
      timeout: 30000,
      maxTokens: 2000,
      onToken: tokenHandler,
    });

    // Post-generation safety review
    const safetyReview = await reviewReplySafety(fullResponse);
    if (!safetyReview.safe) {
      logger.warn("AI Gateway: Safety review flagged response", {
        issues: safetyReview.issues,
        userId: context.userId,
      });
      // Return a safer fallback message
      return `I understand you're looking for guidance. However, I want to make sure I'm providing safe, appropriate advice.

For medical concerns, I'd strongly recommend consulting with a healthcare professional who can provide personalized guidance based on your specific situation.

For general wellness and lifestyle questions, I'm happy to help with evidence-based recommendations around sleep, movement, nutrition patterns, and stress management.

What specific area would you like to focus on?`;
    }

    return fullResponse;
  } catch (error) {
    logger.error("AI Gateway: Coach reply failed", { error, userId: context.userId });
    if (error instanceof ModelError && error.provider === "openai") {
      // Fallback to Claude 4.5
      logger.warn("AI Gateway: Falling back to Claude 4.5", { userId: context.userId });
      await streamModel({
        provider: "anthropic",
        system,
        messages: [{ role: "user", content: user }],
        timeout: 30000,
        maxTokens: 2000,
        onToken: tokenHandler,
      });
      return fullResponse;
    }
    throw error;
  }
}

/**
 * Handle moderate-risk biohack request
 */
async function handleModerateRiskBiohack(
  latestUserMessage: string,
  topicHint: string | undefined,
  onToken?: (token: string) => void | Promise<void>
): Promise<string> {
  const { system, user } = buildModerateRiskBiohackPrompt(latestUserMessage, topicHint);

  let fullResponse = "";
  const tokenHandler = onToken || ((token: string) => {
    fullResponse += token;
  });

  try {
    // Use Claude 4.5 for structured, safety-focused responses
    await streamModel({
      provider: "anthropic",
      system,
      messages: [{ role: "user", content: user }],
      timeout: 30000,
      maxTokens: 2000,
      onToken: tokenHandler,
    });
    return fullResponse;
  } catch (error) {
    logger.error("AI Gateway: Moderate-risk biohack handler failed", { error });
    // Fallback to GPT-5
    if (error instanceof ModelError && error.provider === "anthropic") {
      await streamModel({
        provider: "openai",
        system,
        messages: [{ role: "user", content: user }],
        timeout: 30000,
        maxTokens: 2000,
        onToken: tokenHandler,
      });
      return fullResponse;
    }
    throw error;
  }
}

/**
 * Handle extreme-risk biohack request (refusal)
 */
async function handleExtremeRiskBiohack(
  latestUserMessage: string,
  onToken?: (token: string) => void | Promise<void>
): Promise<string> {
  const { system, user } = buildExtremeRiskBiohackPrompt(latestUserMessage);

  let fullResponse = "";
  const tokenHandler = onToken || ((token: string) => {
    fullResponse += token;
  });

  try {
    await streamModel({
      provider: "anthropic",
      system,
      messages: [{ role: "user", content: user }],
      timeout: 30000,
      maxTokens: 1500,
      onToken: tokenHandler,
    });
    return fullResponse;
  } catch (error) {
    logger.error("AI Gateway: Extreme-risk biohack handler failed", { error });
    // Fallback to GPT-5
    if (error instanceof ModelError && error.provider === "anthropic") {
      await streamModel({
        provider: "openai",
        system,
        messages: [{ role: "user", content: user }],
        timeout: 30000,
        maxTokens: 1500,
        onToken: tokenHandler,
      });
      return fullResponse;
    }
    throw error;
  }
}

/**
 * Handle restricted medical/wellness query
 */
async function handleRestrictedMedicalWellness(
  latestUserMessage: string,
  onToken?: (token: string) => void | Promise<void>
): Promise<string> {
  const { system, user } = buildRestrictedMedicalWellnessPrompt(latestUserMessage);

  let fullResponse = "";
  const tokenHandler = onToken || ((token: string) => {
    fullResponse += token;
  });

  try {
    await streamModel({
      provider: "anthropic",
      system,
      messages: [{ role: "user", content: user }],
      timeout: 30000,
      maxTokens: 1500,
      onToken: tokenHandler,
    });
    return fullResponse;
  } catch (error) {
    logger.error("AI Gateway: Restricted medical handler failed", { error });
    // Fallback to GPT-5
    if (error instanceof ModelError && error.provider === "anthropic") {
      await streamModel({
        provider: "openai",
        system,
        messages: [{ role: "user", content: user }],
        timeout: 30000,
        maxTokens: 1500,
        onToken: tokenHandler,
      });
      return fullResponse;
    }
    throw error;
  }
}

/**
 * Generate today's personalized plan (JSON output)
 * Uses Claude 4.5 for structured planning
 */
export async function generateTodayPlan(
  context: CoachContext,
  todayDate: string
): Promise<TodayPlan> {
  const { system, user } = buildTodayPlanPrompt(context, todayDate);

  let fullResponse = "";
  try {
    // Claude 4.5 for structured JSON
    await streamModel({
      provider: "anthropic",
      system,
      messages: [{ role: "user", content: user }],
      timeout: 30000,
      maxTokens: 1500,
      onToken: (token) => {
        fullResponse += token;
      },
    });

    // Parse JSON response
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as TodayPlan;
    }
    throw new Error("Failed to parse plan JSON");
  } catch (error) {
    logger.error("AI Gateway: Today plan generation failed", { error, userId: context.userId });
    // Fallback to GPT-5 if Claude fails
    if (error instanceof ModelError && error.provider === "anthropic") {
      await streamModel({
        provider: "openai",
        system,
        messages: [{ role: "user", content: user }],
        timeout: 30000,
        maxTokens: 1500,
        onToken: (token) => {
          fullResponse += token;
        },
      });
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as TodayPlan;
      }
    }
    // Return default plan if parsing fails
    return {
      focus: "Focus on maintaining consistency with your health goals today.",
      summary: "A day focused on consistency and small, meaningful actions.",
      morning: ["Check in with how you're feeling", "Follow your morning routine"],
      afternoon: ["Take breaks as needed", "Stay hydrated"],
      evening: ["Wind down before bed", "Prepare for tomorrow"],
      notes: ["Remember: small steps lead to big changes"],
    };
  }
}

/**
 * Generate weekly debrief (JSON output)
 * Uses Claude 4.5 for comprehensive summarization
 */
export async function generateWeeklyDebrief(context: {
  weekRange?: string;
  weeklyCheckIns?: string;
  weeklyWearableSummary?: string;
  weeklyProtocolStatus?: string;
  weeklyConversationSummary?: string;
}): Promise<WeeklyDebrief> {
  const { system, user } = buildWeeklyDebriefPrompt(context);

  let fullResponse = "";
  try {
    // Claude 4.5 for structured JSON
    await streamModel({
      provider: "anthropic",
      system,
      messages: [{ role: "user", content: user }],
      timeout: 30000,
      maxTokens: 2000,
      onToken: (token) => {
        fullResponse += token;
      },
    });

    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as WeeklyDebrief;
    }
    throw new Error("Failed to parse debrief JSON");
  } catch (error) {
    logger.error("AI Gateway: Weekly debrief generation failed", { error });
    // Fallback to GPT-5
    if (error instanceof ModelError && error.provider === "anthropic") {
      await streamModel({
        provider: "openai",
        system,
        messages: [{ role: "user", content: user }],
        timeout: 30000,
        maxTokens: 2000,
        onToken: (token) => {
          fullResponse += token;
        },
      });
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as WeeklyDebrief;
      }
    }
    // Return default debrief
    return {
      headline: "Week in Review",
      summary: "This week showed consistent engagement with your health goals.",
      wins: ["Continued progress on your goals"],
      challenges: [],
      patterns: ["Regular check-ins maintained"],
      focus_for_next_week: ["Keep up the momentum", "Focus on consistency"],
      coach_message: "Great work this week! Keep building on your progress.",
    };
  }
}

/**
 * Generate onboarding assessment after user completes onboarding
 * Uses Claude 4.5 for comprehensive assessment
 */
export async function generateOnboardingAssessment(onboardingData: {
  goals?: string[];
  mainStruggles?: string[];
  routine?: {
    wakeTime?: string;
    bedtime?: string;
    caffeine?: string;
    screens?: string;
    movement?: string;
  };
  motivation?: string;
  notes?: string;
}): Promise<string> {
  const { system, user } = buildOnboardingAssessmentPrompt(onboardingData);

  let fullResponse = "";
  try {
    // Claude 4.5 for thoughtful assessment
    await streamModel({
      provider: "anthropic",
      system,
      messages: [{ role: "user", content: user }],
      timeout: 30000,
      maxTokens: 1000,
      onToken: (token) => {
        fullResponse += token;
      },
    });
    return fullResponse;
  } catch (error) {
    logger.error("AI Gateway: Onboarding assessment failed", { error });
    // Fallback to GPT-5
    if (error instanceof ModelError && error.provider === "anthropic") {
      await streamModel({
        provider: "openai",
        system,
        messages: [{ role: "user", content: user }],
        timeout: 30000,
        maxTokens: 1000,
        onToken: (token) => {
          fullResponse += token;
        },
      });
      return fullResponse;
    }
    return "Welcome to BioFlo! I'm here to help you optimize your health and performance. Let's get started by understanding your goals and creating a personalized plan.";
  }
}
