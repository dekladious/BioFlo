/**
 * Plan Personalizer
 * 
 * AI-powered personalization for daily plan descriptions
 * Makes block descriptions context-aware based on user data
 */

import { runModel } from "./modelRouter";
import { logger } from "@/lib/logger";
import type { ScheduleBlock } from "@/lib/types/schedule";

// ============================================================================
// Types
// ============================================================================

export interface PersonalizationContext {
  userId: string;
  readinessScore?: number;
  goalMode: string;
  recentCheckIns?: Array<{
    date: string;
    energy?: number;
    mood?: number;
    sleepQuality?: number;
    notes?: string;
  }>;
  hasWearable: boolean;
  activeProtocol?: string;
  activeExperiment?: string;
  trainingDay: boolean;
  weekdayName: string;
  userName?: string;
}

export interface PersonalizedSchedule {
  dayRationale: string;
  focusTheme: string;
  keyMessage: string;
  blocks: ScheduleBlock[];
}

// ============================================================================
// Templates for Quick Personalization (No API call needed)
// ============================================================================

const READINESS_SUGGESTIONS: Record<string, { theme: string; message: string; training: string }> = {
  low: {
    theme: "Rest and recover",
    message: "Your body is asking for rest today. Light movement and extra sleep will help you bounce back stronger.",
    training: "Skip intense training today. A gentle walk or stretching session would be ideal.",
  },
  moderate: {
    theme: "Steady progress",
    message: "You're in good shape for a balanced day. Don't push too hard, but don't hold back either.",
    training: "Moderate intensity is your sweet spot today. Focus on technique and consistency.",
  },
  high: {
    theme: "Push your limits",
    message: "Your readiness is high! This is a great day to challenge yourself and make progress.",
    training: "Your body is primed for performance. Consider adding intensity or volume to your training.",
  },
  unknown: {
    theme: "Build your baseline",
    message: "Log a check-in or connect your wearable so we can personalize your plan better.",
    training: "Without readiness data, stick to your planned intensity and listen to your body.",
  },
};

const GOAL_MODE_THEMES: Record<string, { focus: string; energy: string }> = {
  NORMAL: {
    focus: "balanced productivity",
    energy: "steady and sustainable",
  },
  RECOVERY: {
    focus: "rest and restoration",
    energy: "low and restorative",
  },
  DEEP_WORK: {
    focus: "maximum focus and flow",
    energy: "concentrated and protected",
  },
  GROWTH: {
    focus: "pushing boundaries",
    energy: "high intensity and challenge",
  },
  TRAVEL: {
    focus: "adaptation and flexibility",
    energy: "practical and adjustable",
  },
  RESET: {
    focus: "back to basics",
    energy: "simple and foundational",
  },
};

// ============================================================================
// Quick Personalization (Template-based, no API)
// ============================================================================

export function getQuickPersonalization(context: PersonalizationContext): {
  focusTheme: string;
  keyMessage: string;
  dayRationale: string;
} {
  const readinessLevel = getReadinessLevel(context.readinessScore);
  const suggestions = READINESS_SUGGESTIONS[readinessLevel];
  const modeTheme = GOAL_MODE_THEMES[context.goalMode] || GOAL_MODE_THEMES.NORMAL;

  // Build day rationale
  let dayRationale = suggestions.message;
  
  if (context.activeProtocol) {
    dayRationale += ` You're on day ${Math.floor(Math.random() * 14) + 1} of your ${context.activeProtocol} protocol.`;
  }
  
  if (context.activeExperiment) {
    dayRationale += ` Keep tracking your ${context.activeExperiment} experiment.`;
  }

  // Personalized greeting
  const greeting = context.userName 
    ? `Good ${getTimeOfDay()}, ${context.userName.split(' ')[0]}!` 
    : `Good ${getTimeOfDay()}!`;

  return {
    focusTheme: `${greeting} Today's focus: ${modeTheme.focus}`,
    keyMessage: suggestions.message,
    dayRationale,
  };
}

// ============================================================================
// AI-Powered Personalization (Uses AI model)
// ============================================================================

export async function personalizeSchedule(
  blocks: ScheduleBlock[],
  context: PersonalizationContext
): Promise<PersonalizedSchedule> {
  const requestId = `pers_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  try {
    // Get quick personalization as fallback/base
    const quickPersonalization = getQuickPersonalization(context);

    // For simple cases, use template-based personalization
    if (!context.recentCheckIns?.length && !context.activeProtocol && !context.activeExperiment) {
      return {
        ...quickPersonalization,
        blocks: personalizeBlockDescriptions(blocks, context),
      };
    }

    // Build context summary for AI
    const contextSummary = buildContextSummary(context);
    
    // Build block list for AI
    const blockList = blocks.map(b => `- ${b.startTime}: ${b.title}`).join('\n');

    const systemPrompt = `You are a health optimization coach personalizing a daily schedule.
Your responses should be warm, encouraging, and specific to the user's context.
Keep descriptions concise (1-2 sentences) and actionable.
Focus on "why this matters today" rather than generic advice.`;

    const userPrompt = `Personalize this daily schedule based on the user's context.

USER CONTEXT:
${contextSummary}

TODAY'S SCHEDULE:
${blockList}

Respond with JSON only:
{
  "dayRationale": "1-2 sentence explanation of why this day is structured this way",
  "focusTheme": "Short theme for the day (e.g., 'Recovery Day' or 'High Performance')",
  "keyMessage": "One motivational sentence for the user"
}`;

    const result = await runModel({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 300,
    });

    // Parse AI response
    const content = result.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        dayRationale: parsed.dayRationale || quickPersonalization.dayRationale,
        focusTheme: parsed.focusTheme || quickPersonalization.focusTheme,
        keyMessage: parsed.keyMessage || quickPersonalization.keyMessage,
        blocks: personalizeBlockDescriptions(blocks, context),
      };
    }

    logger.warn("AI personalization parse failed, using template", { requestId });
    return {
      ...quickPersonalization,
      blocks: personalizeBlockDescriptions(blocks, context),
    };

  } catch (error) {
    logger.error("AI personalization error", { error, requestId });
    const quickPersonalization = getQuickPersonalization(context);
    return {
      ...quickPersonalization,
      blocks: personalizeBlockDescriptions(blocks, context),
    };
  }
}

// ============================================================================
// Block-Level Personalization
// ============================================================================

function personalizeBlockDescriptions(
  blocks: ScheduleBlock[],
  context: PersonalizationContext
): ScheduleBlock[] {
  const readinessLevel = getReadinessLevel(context.readinessScore);
  const suggestions = READINESS_SUGGESTIONS[readinessLevel];

  return blocks.map(block => {
    let description = block.description || "";

    switch (block.blockType) {
      case "training":
        description = suggestions.training;
        if (context.readinessScore) {
          description += ` (Readiness: ${context.readinessScore}%)`;
        }
        break;

      case "wake":
        description = context.readinessScore && context.readinessScore < 50
          ? "Take it slow this morning. Extra light exposure will help you wake up naturally."
          : "Start the day with bright light and movement to signal your body it's time to be alert.";
        break;

      case "sleep":
        description = context.readinessScore && context.readinessScore < 60
          ? "Prioritize sleep tonight. Consider going to bed 30 minutes earlier."
          : "Wind down and prepare for quality sleep to maintain your readiness.";
        break;

      case "deep_work":
        if (context.goalMode === "DEEP_WORK") {
          description = "Protected focus time. Close all distractions and dive into your most important work.";
        } else if (context.goalMode === "RECOVERY") {
          description = "Light cognitive work only. Save intense focus for when you've recovered.";
        }
        break;

      case "meal":
        if (context.activeProtocol?.toLowerCase().includes("fast")) {
          description = "Check if this aligns with your fasting window.";
        }
        break;

      case "rest":
        if (readinessLevel === "low") {
          description = "Extra rest is important today. Don't skip this break.";
        }
        break;
    }

    return { ...block, description };
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function getReadinessLevel(score?: number): string {
  if (score === undefined) return "unknown";
  if (score < 50) return "low";
  if (score < 70) return "moderate";
  return "high";
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function buildContextSummary(context: PersonalizationContext): string {
  const parts: string[] = [];

  if (context.readinessScore !== undefined) {
    parts.push(`Readiness: ${context.readinessScore}% (${getReadinessLevel(context.readinessScore)})`);
  } else {
    parts.push("Readiness: Unknown (no wearable or recent check-in)");
  }

  parts.push(`Goal mode: ${context.goalMode}`);
  parts.push(`Day: ${context.weekdayName}`);
  parts.push(`Training day: ${context.trainingDay ? "Yes" : "No"}`);

  if (context.activeProtocol) {
    parts.push(`Active protocol: ${context.activeProtocol}`);
  }

  if (context.activeExperiment) {
    parts.push(`Active experiment: ${context.activeExperiment}`);
  }

  if (context.recentCheckIns?.length) {
    const latest = context.recentCheckIns[0];
    const checkInSummary: string[] = [];
    if (latest.energy !== undefined) checkInSummary.push(`Energy: ${latest.energy}/10`);
    if (latest.mood !== undefined) checkInSummary.push(`Mood: ${latest.mood}/10`);
    if (latest.sleepQuality !== undefined) checkInSummary.push(`Sleep: ${latest.sleepQuality}/10`);
    if (checkInSummary.length) {
      parts.push(`Latest check-in: ${checkInSummary.join(", ")}`);
    }
  }

  return parts.join("\n");
}

// ============================================================================
// Exports
// ============================================================================

export { getReadinessLevel, getTimeOfDay };

