/**
 * BioFlo Chat API Route V2
 * 
 * Implements the new multi-stage AI pipeline:
 * - Request classification
 * - Model routing (cheap vs expensive)
 * - RAG context building
 * - Safety judging
 * - Fallback handling
 * - Analytics logging
 */

import { randomUUID } from "crypto";
import { judgeAnswer, rewriteUnsafeAnswer } from "@/lib/ai/safety";
import { generateWithFallback } from "@/lib/ai/fallback";
import { buildTriageForBlocked, buildGenericSafeAnswer } from "@/lib/ai/triage";
import { getAiUserId } from "@/lib/analytics/userId";
import { logAnalyticsEvent, logApiError } from "@/lib/analytics/logging";
import { logger } from "@/lib/logger";
import { persistChatHistory } from "@/lib/ai/chat/history";
import { createErrorResponse } from "@/lib/api-utils";
import { ChatValidationError, validateAndNormalizeMessages } from "@/lib/api/chat/validation";
import { enforceChatGuards } from "@/lib/api/chat/guard";
import { classifyAndHandleTriage } from "@/lib/api/chat/classification";
import { prepareChatPipeline } from "@/lib/api/chat/pipeline";
import { canAnswerFromContext } from "@/lib/ai/rag";

export const runtime = "nodejs";

type ChatRequestBody = {
  messages: { role: "user" | "assistant"; content: string }[];
  sessionId?: string;
  metadata?: Record<string, any>;
};

export async function POST(req: Request) {
  const startTime = Date.now();
  let requestId = "";
  let ip = "";
  let userId = "";

  try {
    const guard = await enforceChatGuards(req);
    if (!guard.ok) {
      return guard.response;
    }
    userId = guard.userId;
    ip = guard.ip;
    requestId = guard.requestId;

    // Parse request body
    const body: ChatRequestBody = await req.json();
    const { messages, sessionId: incomingSessionId, metadata } = body;
    const sessionId = incomingSessionId || randomUUID();

    let conversationMessages;
    let latestUserMessage: string;

    try {
      const validation = validateAndNormalizeMessages(messages);
      conversationMessages = validation.normalizedMessages;
      latestUserMessage = validation.latestUserMessage;
    } catch (error) {
      if (error instanceof ChatValidationError) {
        logger.warn(`Chat V2 API: ${error.message}`, { requestId, userId });
        return createErrorResponse(error.message, requestId, 400);
      }
      throw error;
    }

    const classificationOutcome = await classifyAndHandleTriage({
      latestUserMessage,
      userId,
      ip,
      sessionId,
    });
    aiUserId = classificationOutcome.aiUserId;
    const { classification, triageMessage } = classificationOutcome;

    if (triageMessage) {
      return Response.json(
        {
          reply: triageMessage,
          metadata: {
            triage: true,
            topic: classification.topic,
            risk: classification.risk,
          },
        },
        { status: 200 }
      );
    }

    const pipeline = await prepareChatPipeline({
      userId,
      userMessage: latestUserMessage,
      classification,
      conversationMessages,
      domain: metadata?.domain,
    });
    const {
      ragContext,
      ragSources,
      userDbId,
      modelChoice,
      enhancedMessages,
      systemPrompt,
    } = pipeline;

    let canAnswerFromRag: boolean | null = null;
    if (classification.risk !== "low" && ragContext) {
      try {
        canAnswerFromRag = await canAnswerFromContext(
          latestUserMessage,
          ragContext
        );
      } catch (ragCheckError) {
        logger.debug("Chat V2 API: Context-only answer check failed", {
          error: ragCheckError,
          userId,
          requestId,
        });
      }
    }

    // Step 7: Generate answer with fallback
    let assistantDraft: string;
    try {
      assistantDraft = await generateWithFallback({
        userQuestion: latestUserMessage,
        systemPrompt,
        messages: enhancedMessages,
        mainModel: modelChoice.mainModel,
        judgeModel: modelChoice.judgeModel,
      });
    } catch (genError) {
      logger.error("Chat V2 API: Generation failed", {
        error: genError,
        userId,
        requestId,
      });

      // Log error
      await logApiError({
        aiUserId,
        endpoint: "/api/chat/v2",
        errorMessage: genError instanceof Error ? genError.message : String(genError),
        errorStack: genError instanceof Error ? genError.stack : undefined,
        statusCode: 500,
      });

      // Return generic safe answer
      const safeAnswer = buildGenericSafeAnswer(classification.topic);
      
      await logAnalyticsEvent({
        aiUserId,
        eventType: "chat_response",
        sessionId,
        topic: classification.topic,
        risk: classification.risk,
        complexity: classification.complexity,
        needsRag: classification.needs_rag,
        modelUsed: modelChoice.mainModel,
        usedJudge: false,
        judgeVerdict: null,
        answerLength: safeAnswer.length,
        success: false,
        errorCode: "generation_failed",
      });

      return Response.json({ reply: safeAnswer }, { status: 200 });
    }

    // Step 8: Run safety judge if needed
    let finalAnswer = assistantDraft;
    let judgeVerdict: "SAFE" | "WARN" | "BLOCK" | null = null;

    if (modelChoice.useJudge && modelChoice.judgeModel) {
      try {
        const verdict = await judgeAnswer({
          userQuestion: latestUserMessage,
          ragContext,
          assistantAnswer: assistantDraft,
          judgeModel: modelChoice.judgeModel,
        });

        judgeVerdict = verdict.verdict;

        if (verdict.verdict === "SAFE") {
          finalAnswer = assistantDraft;
        } else if (verdict.verdict === "WARN") {
          try {
            finalAnswer = await rewriteUnsafeAnswer({
              userQuestion: latestUserMessage,
              ragContext,
              unsafeAnswer: assistantDraft,
              judgeModel: modelChoice.judgeModel,
            });
          } catch (rewriteError) {
            logger.warn("Chat V2 API: Rewrite failed, using generic answer", {
              error: rewriteError,
              userId,
              requestId,
            });
            finalAnswer = buildGenericSafeAnswer(classification.topic);
          }
        } else if (verdict.verdict === "BLOCK") {
          finalAnswer = buildTriageForBlocked(
            classification.topic,
            classification.risk
          );
        }
      } catch (judgeError) {
        logger.error("Chat V2 API: Safety judge failed", {
          error: judgeError,
          userId,
          requestId,
        });
        // Continue with original answer if judge fails (but log it)
        await logApiError({
          aiUserId,
          endpoint: "/api/chat/v2",
          errorMessage: judgeError instanceof Error ? judgeError.message : String(judgeError),
          statusCode: 500,
        });
      }
    }

    // Step 9: Persist chat history + log analytics
    await persistChatHistory({
      userId,
      sessionId,
      requestMessages: conversationMessages,
      assistantContent: finalAnswer,
      provider: modelChoice.mainModel,
    });

    await logAnalyticsEvent({
      aiUserId,
      eventType: "chat_response",
      sessionId,
      topic: classification.topic,
      risk: classification.risk,
      complexity: classification.complexity,
      needsRag: classification.needs_rag,
      canAnswerFromContext: canAnswerFromRag,
      modelUsed: modelChoice.mainModel,
      usedJudge: modelChoice.useJudge,
      judgeVerdict,
      messagesInSession: conversationMessages.length,
      answerLength: finalAnswer.length,
      ragDocsCount: ragSources.length,
      ragSources: ragSources.length > 0 ? ragSources : undefined,
      success: true,
    });

    const latency = Date.now() - startTime;
    logger.info("Chat V2 API: Response generated", {
      userId,
      requestId,
      latency,
      modelUsed: modelChoice.mainModel,
      usedJudge: modelChoice.useJudge,
    });

    // Step 10: Return response
    return Response.json(
      {
        reply: finalAnswer,
        metadata: {
          topic: classification.topic,
          risk: classification.risk,
          modelUsed: modelChoice.mainModel,
          usedJudge: modelChoice.useJudge,
          judgeVerdict,
          ragDocsCount: ragSources.length,
        },
      },
      {
        status: 200,
        headers: {
          "X-Request-Id": requestId,
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Chat V2 API: Unexpected error", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    // Log API error
    const aiUserId = getAiUserId(undefined, ip);
    await logApiError({
      aiUserId,
      endpoint: "/api/chat/v2",
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
    });

    return createErrorResponse(
      "An error occurred while processing your request",
      requestId,
      500
    );
  }
}

