import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getProtocolStatusSummary } from "@/lib/utils/protocol-context";
import { 
  getExperimentDigest, 
  getCareStatusDigest, 
  getWomensHealthDigest,
  getHabitDigest,
  getSupplementDigest,
  getCheckInDigest,
} from "@/lib/utils/context-summaries";
import type { RequestClassification } from "@/lib/ai/classifier";
import { buildRagBundle } from "@/lib/ai/rag";
import type { RagSource } from "@/lib/ai/rag";
import { isSleepQuery } from "@/lib/ai/rag";
import type { CoachContext } from "@/lib/ai/prompts";

export type BuildChatContextInput = {
  clerkUserId: string;
  userMessage: string;
  classification: RequestClassification;
  domain?: string;
};

export type BuildChatContextResult = {
  coachContext: CoachContext;
  ragContext: string;
  ragSources: RagSource[];
  userDbId: string | null;
  sleepMode: boolean;
};

/**
 * Resolve user-specific context (profile, protocols, RAG snippets) for chat replies.
 * Centralising this logic keeps the API routes small and guarantees both streaming
 * and non-streaming chat paths use the exact same data preparation.
 */
export async function buildChatContext({
  clerkUserId,
  userMessage,
  classification,
  domain,
}: BuildChatContextInput): Promise<BuildChatContextResult> {
  let userProfileString = "No profile data available";
  let userDbId: string | null = null;
  let todayMode = "NORMAL";

  let userRecord:
    | {
        id: string;
        goals?: Record<string, unknown>;
        main_struggles?: string[] | Record<string, unknown> | string;
        today_mode?: string | null;
      }
    | null = null;

  try {
    userRecord = await queryOne<{
      id: string;
      goals?: Record<string, unknown>;
      main_struggles?: string[] | Record<string, unknown> | string;
      today_mode?: string | null;
    }>("SELECT id, goals, main_struggles, today_mode FROM users WHERE clerk_user_id = $1", [
      clerkUserId,
    ]);

    if (userRecord) {
      userDbId = userRecord.id;
      todayMode = (userRecord.today_mode as string) || "NORMAL";

      const rawStruggles = userRecord.main_struggles;
      const strugglesArray = Array.isArray(rawStruggles)
        ? rawStruggles
        : typeof rawStruggles === "string"
        ? JSON.parse(rawStruggles || "[]")
        : rawStruggles && typeof rawStruggles === "object"
        ? Object.values(rawStruggles)
        : [];

      userProfileString = `Goals: ${JSON.stringify(
        userRecord.goals || {}
      )}\nMain struggles: ${strugglesArray.join(", ") || "None listed"}`;
    }
  } catch (error) {
    logger.debug("Chat context: failed to load user profile", {
      error,
      clerkUserId,
    });
  }

  const sleepMode = domain === "sleep" || isSleepQuery(userMessage);
  const ragBundle = await buildRagBundle({
    userMessage,
    userId: userDbId,
    classification,
    sleepMode,
    maxDocs: 6,
  });

  let protocolStatus: string | undefined;
  let experimentsSummary: string | undefined;
  let careStatusSummary: string | undefined;
  let womensHealthSummary: string | undefined;
  let habitsSummary: string | undefined;
  let supplementsSummary: string | undefined;
  let checkInsSummary: string | undefined;
  
  if (userDbId) {
    try {
      protocolStatus = await getProtocolStatusSummary(userDbId);
    } catch (error) {
      logger.debug("Chat context: failed to load protocol status", {
        error,
        clerkUserId,
      });
    }

    // Fetch all user context data in parallel
    const [
      experimentDigest, 
      careDigest, 
      womensDigest,
      habitDigest,
      supplementDigest,
      checkInDigest,
    ] = await Promise.all([
      getExperimentDigest(userDbId, 3),
      getCareStatusDigest(userDbId),
      getWomensHealthDigest(userDbId),
      getHabitDigest(userDbId),
      getSupplementDigest(userDbId),
      getCheckInDigest(userDbId, 7),
    ]);

    experimentsSummary = experimentDigest.summary;
    careStatusSummary = careDigest.summary;
    womensHealthSummary = womensDigest.summary;
    habitsSummary = habitDigest.summary;
    supplementsSummary = supplementDigest.summary;
    checkInsSummary = checkInDigest.summary;
  }

  // Build enhanced check-ins summary that includes trends
  let enhancedCheckInsSummary = "No recent check-ins available";
  if (checkInsSummary) {
    enhancedCheckInsSummary = checkInsSummary;
  }

  const coachContext: CoachContext = {
    userProfile: userProfileString,
    recentCheckIns: enhancedCheckInsSummary,
    wearableSummary: undefined,
    protocolStatus: protocolStatus || "No active protocols",
    knowledgeSnippets: ragBundle.combinedContext || undefined,
    todayMode,
    sleepMode,
    experimentsSummary: experimentsSummary || "No experiments logged",
    careStatus: careStatusSummary,
    womensHealthSummary,
    habitsSummary: habitsSummary || "No habits tracked",
    supplementsSummary: supplementsSummary || "No supplements tracked",
  };

  return {
    coachContext,
    ragContext: ragBundle.combinedContext || "",
    ragSources: ragBundle.sources,
    userDbId,
    sleepMode,
  };
}

