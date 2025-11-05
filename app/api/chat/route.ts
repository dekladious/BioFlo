import OpenAI from "openai";
import { auth, currentUser } from "@clerk/nextjs/server";
import { CHAT } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { ClerkPublicMetadata } from "@/types";
import { getRequestMetadata, validateContentType, withTimeout, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// Rate limiting: 20 requests per 5 minutes per user
const RATE_LIMIT_CONFIG = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20,
};

// OpenAI API timeout (30 seconds)
const OPENAI_TIMEOUT_MS = 30000;

export async function POST(req: Request) {
  const { ip, requestId } = getRequestMetadata(req);
  
  try {
    // Validate Content-Type
    if (!validateContentType(req)) {
      logger.warn("Chat API: Invalid Content-Type", { requestId, ip });
      return createErrorResponse("Content-Type must be application/json", requestId, 400);
    }

    // Validate request size (10MB max)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      logger.warn("Chat API: Request too large", { requestId, contentLength });
      return createErrorResponse("Request payload too large", requestId, 413);
    }

    const { userId } = await auth();
    if (!userId) {
      logger.warn("Chat API: Unauthorized request", { requestId, ip });
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Rate limiting
    const identifier = getRateLimitIdentifier(userId, ip);
    const rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIG);
    
    if (!rateLimitResult.success) {
      logger.warn("Chat API: Rate limit exceeded", { 
        userId, 
        identifier, 
        retryAfter: rateLimitResult.retryAfter,
        requestId,
      });
      return Response.json(
        { 
          success: false,
          error: "Rate limit exceeded", 
          retryAfter: rateLimitResult.retryAfter,
          requestId,
          timestamp: new Date().toISOString(),
        }, 
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 0),
            "X-RateLimit-Limit": String(RATE_LIMIT_CONFIG.maxRequests),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetAt),
            "X-Request-Id": requestId,
          },
        }
      );
    }
    
    const user = await currentUser();
    const isPro = Boolean((user?.publicMetadata as ClerkPublicMetadata)?.isPro);
    if (!isPro) {
      logger.info("Chat API: Subscription required", { userId, requestId });
      return createErrorResponse("Subscription required", requestId, 402);
    }

    const body = await req.json();
    const { messages } = body;
    
    // Input validation
    if (!Array.isArray(messages)) {
      logger.warn("Chat API: Invalid messages format", { requestId, userId });
      return createErrorResponse("Messages must be an array", requestId, 400);
    }
    if (messages.length === 0) {
      logger.warn("Chat API: Empty messages", { requestId, userId });
      return createErrorResponse("Messages cannot be empty", requestId, 400);
    }
    if (messages.length > CHAT.MAX_MESSAGES) {
      logger.warn("Chat API: Too many messages", { requestId, userId, count: messages.length });
      return createErrorResponse(`Maximum ${CHAT.MAX_MESSAGES} messages allowed`, requestId, 400);
    }
    
    // Validate message format and length
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        logger.warn("Chat API: Invalid message format", { requestId, userId });
        return createErrorResponse("Invalid message format", requestId, 400);
      }
      if (msg.content.length > CHAT.MAX_MESSAGE_LENGTH) {
        logger.warn("Chat API: Message too long", { requestId, userId, length: msg.content.length });
        return createErrorResponse(`Message too long (max ${CHAT.MAX_MESSAGE_LENGTH} characters)`, requestId, 400);
      }
    }

    const openaiKey = env.openai.apiKey();
    const client = new OpenAI({ 
      apiKey: openaiKey,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 2,
    });
    
    // Create completion with timeout
    const completion = await withTimeout(
      client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are BioFlo, a supportive, highly actionable biohacking coach. Be concise. Do not diagnose. Add: 'Educational only; not medical advice.' at the end." },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 2000, // Limit response length
      }),
      OPENAI_TIMEOUT_MS,
      "OpenAI API request timeout"
    );

    const text = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    logger.info("Chat API: Request completed", { 
      userId, 
      messageCount: messages.length,
      tokens: completion.usage?.total_tokens,
      requestId,
    });
    
    return Response.json({ 
      success: true,
      data: { text },
      requestId,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "X-RateLimit-Limit": String(RATE_LIMIT_CONFIG.maxRequests),
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        "X-RateLimit-Reset": String(rateLimitResult.resetAt),
        "X-Request-Id": requestId,
        "Content-Type": "application/json",
      },
    });
  } catch (e: unknown) {
    const authResult = await auth();
    const userId = authResult.userId;
    
    logger.error("Chat API error", e, userId);
    
    const errorMessage = e instanceof Error && process.env.NODE_ENV === "development" 
      ? e.message 
      : "An error occurred. Please try again.";
    
    return createErrorResponse(errorMessage || "Server error", requestId, 500);
  }
}
