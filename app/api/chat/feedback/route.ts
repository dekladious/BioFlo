import { auth } from "@clerk/nextjs/server";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";
import { getAiUserId } from "@/lib/analytics/userId";
import { logAnalyticsEvent } from "@/lib/analytics/logging";
import { logger } from "@/lib/logger";

type FeedbackBody = {
  sessionId?: string | null;
  message: string;
  sentiment: "up" | "down";
};

export async function POST(req: Request) {
  const { ip, requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = (await req.json()) as FeedbackBody;
    const { sessionId, message, sentiment } = body;

    if (!message || typeof message !== "string") {
      return createErrorResponse("Message is required", requestId, 400);
    }

    if (sentiment !== "up" && sentiment !== "down") {
      return createErrorResponse("Invalid sentiment value", requestId, 400);
    }

    const aiUserId = getAiUserId(userId, ip);
    const messagePreview = message.slice(0, 500);

    await logAnalyticsEvent({
      aiUserId,
      eventType: "chat_feedback",
      sessionId: sessionId || null,
      success: sentiment === "up",
      metadata: {
        sentiment,
        messagePreview,
      },
    });

    return new Response(
      JSON.stringify({ success: true, requestId }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
      }
    );
  } catch (error) {
    logger.error("Chat feedback error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createErrorResponse("Failed to record feedback", requestId, 500);
  }
}




