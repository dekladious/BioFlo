import { buildChatContext } from "@/lib/ai/chat/context";
import { chooseModels, ModelChoice } from "@/lib/ai/modelRouter";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { CoachContext } from "@/lib/ai/prompts";
import { RequestClassification } from "@/lib/ai/classifier";
import { NormalizedMessage } from "@/lib/api/chat/validation";
import type { RagSource } from "@/lib/ai/rag";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatPipelineInput = {
  userId: string;
  userMessage: string;
  classification: RequestClassification;
  conversationMessages: NormalizedMessage[];
  domain?: string;
};

export type ChatPipelineResult = {
  baseCoachContext: CoachContext;
  ragContext: string;
  ragSources: RagSource[];
  userDbId: string | null;
  modelChoice: ModelChoice;
  enhancedMessages: LlmMessage[];
  systemPrompt: string;
};

export async function prepareChatPipeline({
  userId,
  userMessage,
  classification,
  conversationMessages,
  domain,
}: ChatPipelineInput): Promise<ChatPipelineResult> {
  const {
    coachContext: baseCoachContext,
    ragContext,
    ragSources,
    userDbId,
  } = await buildChatContext({
    clerkUserId: userId,
    userMessage,
    classification,
    domain,
  });

  const modelChoice = chooseModels(classification);
  const systemPrompt = buildSystemPrompt(ragContext);

  const recentMessages = conversationMessages.slice(-20);
  const llmMessages: LlmMessage[] = [
    { role: "system", content: systemPrompt },
    ...recentMessages,
  ];

  const userContextString = baseCoachContext.userProfile || "No profile data available";
  const protocolContextString =
    baseCoachContext.protocolStatus || "No active protocols";

  if (
    llmMessages.length > 1 &&
    llmMessages[llmMessages.length - 1].role === "user"
  ) {
    llmMessages[llmMessages.length - 1] = {
      role: "user",
      content: `[USER_CONTEXT]
${userContextString}

[PROTOCOL_STATUS]
${protocolContextString}

[USER_MESSAGE]
${llmMessages[llmMessages.length - 1].content}`,
    };
  }

  return {
    baseCoachContext,
    ragContext,
    ragSources,
    userDbId,
    modelChoice,
    enhancedMessages: llmMessages,
    systemPrompt,
  };
}

