import { auth, currentUser } from "@clerk/nextjs/server";
import { BIOFLO_SYSTEM_PROMPT } from "@/lib/ai/policy";
import { runModel } from "@/lib/ai/modelRouter";
import { detectToolFromUserText, getTool } from "@/lib/ai/tools";
import { CHAT, RATE_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { ClerkPublicMetadata } from "@/types";
import { getRequestMetadata, validateContentType, withTimeout, createErrorResponse } from "@/lib/api-utils";
import "@/lib/ai/tools/mealPlanner"; // ensure tool registers

export const runtime = "nodejs";

// Rate limiting: 20 requests per 5 minutes per user
const RATE_LIMIT_CONFIG = RATE_LIMITS.CHAT;

// AI API timeout (30 seconds)
const AI_TIMEOUT_MS = 30000;

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

    // Authentication
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
    
    // Paywall check
    const user = await currentUser();
    const isPro = Boolean((user?.publicMetadata as ClerkPublicMetadata)?.isPro);
    if (!isPro) {
      logger.info("Chat API: Subscription required", { userId, requestId });
      return createErrorResponse("Subscription required", requestId, 402);
    }

    // Parse and validate request body
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

    // Get last user message for tool detection and safety checks
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const userContent = lastUser?.content || "";

    // Safety: Crisis keyword detection (server-side block)
    const crisisPattern = /(suicide|kill myself|self-harm|hurt myself|end my life)/i;
    if (crisisPattern.test(userContent)) {
      logger.warn("Chat API: Crisis keywords detected", { userId, requestId });
      const crisisMsg = "If you're in immediate danger, call your local emergency number now. You can also contact your local crisis line (e.g., 988 in the U.S.).";
      return Response.json({ 
        success: true,
        data: { text: crisisMsg },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Tool detection
    const maybeTool = detectToolFromUserText(userContent);
    if (maybeTool) {
      const tool = getTool(maybeTool.name);
      if (tool) {
        logger.info("Chat API: Tool detected", { userId, toolName: tool.name, requestId });
        
        const parsed = tool.input.safeParse(maybeTool.args);
        if (!parsed.success) {
          logger.warn("Chat API: Tool input validation failed", { 
            userId, 
            toolName: tool.name, 
            errors: parsed.error.errors,
            requestId 
          });
          return Response.json({ 
            success: true,
            data: { 
              text: "I couldn't parse your request for the meal plan. Try e.g., 'Plan a 2500 kcal pescatarian day (no nuts)'." 
            },
            requestId,
            timestamp: new Date().toISOString(),
          });
        }

        try {
          const result = await tool.handler(parsed.data);
          
          // Format enhanced meal plan response
          const lines: string[] = [];
          lines.push(`## 📋 Daily Meal Plan (${result.calories} kcal)`);
          lines.push("");
          lines.push(`**Macros:** Protein ${result.macros.protein}g (${result.macroPercentages?.protein || 30}%) · Carbs ${result.macros.carbs}g (${result.macroPercentages?.carbs || 40}%) · Fat ${result.macros.fat}g (${result.macroPercentages?.fat || 30}%)`);
          lines.push("");
          lines.push("---");
          lines.push("");
          
          for (const m of result.plan) {
            lines.push(`### ${m.name}${m.timing ? ` (${m.timing})` : ""}`);
            lines.push(`**${m.kcal} kcal** | Protein: ${m.protein}g | Carbs: ${m.carbs}g | Fat: ${m.fat}g`);
            lines.push("");
            m.items.forEach(item => {
              lines.push(`- ${item}`);
            });
            lines.push("");
          }
          
          if (result.tips && Array.isArray(result.tips) && result.tips.length > 0) {
            lines.push("---");
            lines.push("");
            lines.push("### 💡 Tips");
            result.tips.forEach(tip => {
              lines.push(`- ${tip}`);
            });
            lines.push("");
          }
          
          lines.push("---");
          lines.push("");
          lines.push("_Educational only. Not medical advice._");

          logger.info("Chat API: Tool executed successfully", { 
            userId, 
            toolName: tool.name, 
            requestId 
          });

          return Response.json({ 
            success: true,
            data: { text: lines.join("\n") },
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
        } catch (toolError: unknown) {
          logger.error("Chat API: Tool execution failed", toolError, userId);
          return createErrorResponse("Failed to generate meal plan. Please try again.", requestId, 500);
        }
      }
    }

    // Default: LLM response using model router
    const text = await withTimeout(
      runModel({
        provider: (process.env.AI_PROVIDER as "openai" | "anthropic") || "openai",
        system: BIOFLO_SYSTEM_PROMPT,
        messages: messages.slice(-20).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        timeout: AI_TIMEOUT_MS,
        maxTokens: 2000,
      }),
      AI_TIMEOUT_MS,
      "AI model request timeout"
    );
    
    logger.info("Chat API: Request completed", { 
      userId, 
      messageCount: messages.length,
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
    const authResult = await auth().catch(() => ({ userId: null }));
    const userId = authResult.userId;
    
    logger.error("Chat API error", e, userId);
    
    const errorMessage = e instanceof Error && process.env.NODE_ENV === "development" 
      ? e.message 
      : "An error occurred. Please try again.";
    
    return createErrorResponse(errorMessage, requestId, 500);
  }
}
