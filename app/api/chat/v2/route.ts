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

import { auth, currentUser } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { classifyRequest } from "@/lib/ai/classifier";
import { chooseModels } from "@/lib/ai/modelRouter";
import { buildRagContext, canAnswerFromContext } from "@/lib/ai/rag";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { judgeAnswer, rewriteUnsafeAnswer } from "@/lib/ai/safety";
import { generateWithFallback } from "@/lib/ai/fallback";
import { buildTriageForBlocked, buildGenericSafeAnswer } from "@/lib/ai/triage";
import { getAiUserId } from "@/lib/analytics/userId";
import { logAnalyticsEvent, logApiError } from "@/lib/analytics/logging";
import { logger } from "@/lib/logger";
import { queryOne } from "@/lib/db/client";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";
import { ClerkPublicMetadata } from "@/types";

export const runtime = "nodejs";

type ChatRequestBody = {
  messages: { role: "user" | "assistant"; content: string }[];
  sessionId?: string;
  metadata?: Record<string, any>;
};

export async function POST(req: Request) {
  const { ip, requestId } = getRequestMetadata(req);
  const startTime = Date.now();

  try {
    // Authentication
    const { userId } = await auth();
    if (!userId) {
      logger.warn("Chat V2 API: Unauthorized", { requestId, ip });
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Get user for subscription check
    const user = await currentUser();
    const isPro = Boolean((user?.publicMetadata as ClerkPublicMetadata)?.isPro);
    const bypassPaywall = process.env.BYPASS_PAYWALL === "true";
    if (!isPro && !bypassPaywall) {
      logger.info("Chat V2 API: Subscription required", { userId, requestId });
      return createErrorResponse("Subscription required", requestId, 402);
    }

    // Parse request body
    const body: ChatRequestBody = await req.json();
    const { messages, sessionId: incomingSessionId, metadata } = body;
    const sessionId = incomingSessionId || randomUUID();

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return createErrorResponse("Invalid messages format", requestId, 400);
    }

    // Get latest user message
    const latestUserMessage = messages
      .filter((m) => m.role === "user")
      .slice(-1)[0]?.content || "";

    if (!latestUserMessage.trim()) {
      return createErrorResponse("No user message found", requestId, 400);
    }

    // Get user's database ID for RAG filtering
    let userDbId: string | null = null;
    try {
      const userRecord = await queryOne<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [userId]
      );
      userDbId = userRecord?.id || null;
    } catch (dbError) {
      logger.debug("Chat V2 API: Could not fetch user DB ID", { error: dbError, userId, requestId });
    }

    // Generate pseudonymous AI user ID for analytics
    const aiUserId = getAiUserId(userId, ip);

    // Step 1: Classify request
    const classification = await classifyRequest(latestUserMessage);
    logger.debug("Chat V2 API: Request classified", {
      userId,
      classification,
      requestId,
    });

    // Step 2: Pre-answer safety gate
    if (!classification.allow_answer) {
      const triageMessage = buildTriageForBlocked(
        classification.topic,
        classification.risk
      );

      // Log triage event
      await logAnalyticsEvent({
        aiUserId,
        eventType: "chat_triage",
        sessionId,
        topic: classification.topic,
        risk: classification.risk,
        complexity: classification.complexity,
        success: false,
        metadata: { reason: "allow_answer=false" },
      });

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

    // Step 3: Build RAG context if needed
    let ragContext = "";
    let ragSources: { id: number; title: string | null; similarity: number }[] = [];
    let canAnswerFromRag: boolean | null = null;

    if (classification.needs_rag) {
      try {
        const ragResult = await buildRagContext(
          latestUserMessage,
          userDbId,
          6
        );
        ragContext = ragResult.context;
        ragSources = ragResult.sources;

        // Optional: Check if we can answer from context (for medium/high risk)
        if (classification.risk !== "low" && ragContext) {
          canAnswerFromRag = await canAnswerFromContext(
            latestUserMessage,
            ragContext
          );
        }
      } catch (ragError) {
        logger.warn("Chat V2 API: RAG retrieval failed", {
          error: ragError,
          userId,
          requestId,
        });
        // Continue without RAG context
      }
    }

    // Step 4: Choose models
    const modelChoice = chooseModels(classification);

    // Step 5: Build system prompt
    const systemPrompt = buildSystemPrompt(ragContext);

    // Step 6: Compose messages for LLM
    const llmMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
    ];

    // Step 7: Generate answer with fallback
    let assistantDraft: string;
    try {
      assistantDraft = await generateWithFallback({
        userQuestion: latestUserMessage,
        systemPrompt,
        messages: llmMessages,
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

    // Step 9: Log analytics event
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
      messagesInSession: messages.length,
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

