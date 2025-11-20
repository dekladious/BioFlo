import { classifyRequest, RequestClassification } from "@/lib/ai/classifier";
import { buildTriageForBlocked } from "@/lib/ai/triage";
import { getAiUserId } from "@/lib/analytics/userId";
import { logAnalyticsEvent } from "@/lib/analytics/logging";
import { logger } from "@/lib/logger";

type ClassificationInput = {
  latestUserMessage: string;
  userId: string;
  ip: string;
  sessionId: string;
};

export type ClassificationOutcome = {
  aiUserId: string;
  classification: RequestClassification;
  triageMessage?: string;
};

export async function classifyAndHandleTriage({
  latestUserMessage,
  userId,
  ip,
  sessionId,
}: ClassificationInput): Promise<ClassificationOutcome> {
  const aiUserId = getAiUserId(userId, ip);
  const classification = await classifyRequest(latestUserMessage);

  logger.debug("Chat classification result", {
    userId,
    classification,
    sessionId,
  });

  if (!classification.allow_answer) {
    const triageMessage = buildTriageForBlocked(
      classification.topic,
      classification.risk
    );

    await logAnalyticsEvent({
      aiUserId,
      eventType: "chat_triage",
      sessionId,
      topic: classification.topic,
      risk: classification.risk,
      complexity: classification.complexity,
      success: false,
      metadata: { reason: "allow_answer=false" },
    }).catch(() => {});

    return { aiUserId, classification, triageMessage };
  }

  return { aiUserId, classification };
}

