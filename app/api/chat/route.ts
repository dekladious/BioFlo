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
import "@/lib/ai/tools/supplementRecommender"; // ensure tool registers
import "@/lib/ai/tools/sleepOptimizer"; // ensure tool registers
import "@/lib/ai/tools/protocolBuilder"; // ensure tool registers

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
          
          // Format tool response based on tool type
          const lines: string[] = [];
          
          if (tool.name === "mealPlanner") {
            // Format meal plan response
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
          } else if (tool.name === "supplementRecommender") {
            // Format supplement recommendation response
            lines.push(`## 💊 Supplement Recommendations`);
            lines.push("");
            lines.push(result.recommendations || `Based on your goals: **${result.goals?.join(", ")}**`);
            lines.push("");
            lines.push(`**Experience Level:** ${result.experience} | **Budget:** ${result.budget}`);
            if (result.stack?.totalCost) {
              lines.push(`**Estimated Cost:** ${result.stack.totalCost}`);
            }
            lines.push("");
            lines.push("---");
            lines.push("");
            
            // Supplement list
            lines.push("### Recommended Supplements");
            lines.push("");
            result.stack?.supplements?.forEach((supp, idx) => {
              lines.push(`**${idx + 1}. ${supp.name}**`);
              lines.push(`- **Dosage:** ${supp.dosage}`);
              lines.push(`- **Timing:** ${supp.timing}`);
              lines.push(`- **Purpose:** ${supp.purpose}`);
              if (supp.duration) lines.push(`- **Duration:** ${supp.duration}`);
              if (supp.cost) lines.push(`- **Cost:** ${supp.cost}`);
              if (supp.notes) lines.push(`- **Notes:** ${supp.notes}`);
              lines.push("");
            });
            
            // Timing schedule
            if (result.stack?.timingSchedule && result.stack.timingSchedule.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### ⏰ Timing Schedule");
              lines.push("");
              result.stack.timingSchedule.forEach(schedule => {
                lines.push(`**${schedule.time}**`);
                schedule.supplements.forEach(supp => {
                  lines.push(`- ${supp}`);
                });
                if (schedule.notes) {
                  lines.push(`  *${schedule.notes}*`);
                }
                lines.push("");
              });
            }
            
            // Interactions
            if (result.stack?.interactions && result.stack.interactions.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### ⚠️ Interactions to Consider");
              lines.push("");
              result.stack.interactions.forEach(interaction => {
                lines.push(`- ${interaction}`);
              });
              lines.push("");
            }
            
            // Precautions
            if (result.stack?.precautions && result.stack.precautions.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### ⚠️ Precautions");
              lines.push("");
              result.stack.precautions.forEach(precaution => {
                lines.push(`- ${precaution}`);
              });
              lines.push("");
            }
          } else if (tool.name === "sleepOptimizer") {
            // Format sleep optimization response
            lines.push(`## 😴 Sleep Optimization Protocol`);
            lines.push("");
            
            if (result.schedule) {
              lines.push("### 📅 Sleep Schedule");
              lines.push("");
              lines.push(`**Current:** Bedtime ${result.schedule.current?.bedtime || "N/A"}, Wake ${result.schedule.current?.wakeTime || "N/A"}`);
              lines.push(`**Optimal:** Bedtime ${result.schedule.optimal?.bedtime}, Wake ${result.schedule.optimal?.wakeTime}`);
              lines.push(`**Target Sleep:** ${result.schedule.optimal?.totalHours} hours`);
              lines.push("");
              lines.push("---");
              lines.push("");
            }
            
            // Protocols
            if (result.recommendation?.protocols && result.recommendation.protocols.length > 0) {
              result.recommendation.protocols.forEach((protocol, idx) => {
                lines.push(`### ${idx + 1}. ${protocol.name}`);
                lines.push(protocol.description);
                lines.push("");
                protocol.steps.forEach(step => {
                  lines.push(`**${step.time}**`);
                  lines.push(`- ${step.action}${step.duration ? ` (${step.duration})` : ""}`);
                  if (step.notes) {
                    lines.push(`  *${step.notes}*`);
                  }
                  lines.push("");
                });
                if (idx < result.recommendation.protocols.length - 1) {
                  lines.push("---");
                  lines.push("");
                }
              });
            }
            
            // Light exposure
            if (result.recommendation?.lightExposure) {
              lines.push("---");
              lines.push("");
              lines.push("### ☀️ Light Exposure Protocol");
              lines.push("");
              lines.push(`**Morning:** ${result.recommendation.lightExposure.morning}`);
              lines.push(`**Evening:** ${result.recommendation.lightExposure.evening}`);
              lines.push(`**Blue Light:** ${result.recommendation.lightExposure.blueLight}`);
              lines.push("");
            }
            
            // Temperature
            if (result.recommendation?.temperature) {
              lines.push("---");
              lines.push("");
              lines.push("### 🌡️ Temperature Optimization");
              lines.push("");
              lines.push(`**Room Temperature:** ${result.recommendation.temperature.roomTemp}`);
              lines.push(`**Body Preparation:** ${result.recommendation.temperature.bodyPrep}`);
              lines.push("");
            }
            
            // Supplements
            if (result.recommendation?.supplements && result.recommendation.supplements.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💊 Sleep Supplements (Optional)");
              lines.push("");
              result.recommendation.supplements.forEach(supp => {
                lines.push(`**${supp.name}**`);
                lines.push(`- Dosage: ${supp.dosage}`);
                lines.push(`- Timing: ${supp.timing}`);
                lines.push(`- Purpose: ${supp.purpose}`);
                lines.push("");
              });
            }
            
            // Environment
            if (result.recommendation?.environment && result.recommendation.environment.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 🏠 Sleep Environment");
              lines.push("");
              result.recommendation.environment.forEach(env => {
                lines.push(`**${env.category}**`);
                env.recommendations.forEach(rec => {
                  lines.push(`- ${rec}`);
                });
                lines.push("");
              });
            }
            
            // Tips
            if (result.recommendation?.tips && result.recommendation.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Sleep Tips");
              lines.push("");
              result.recommendation.tips.forEach(tip => {
                lines.push(`- ${tip}`);
              });
              lines.push("");
            }
          } else if (tool.name === "protocolBuilder") {
            // Format protocol builder response
            lines.push(`## 🎯 ${result.protocol?.title || "Personalized Biohacking Protocol"}`);
            lines.push("");
            lines.push(result.protocol?.description || result.summary || "");
            lines.push("");
            lines.push(`**Duration:** ${result.protocol?.duration || "4 weeks"}`);
            lines.push(`**Goals:** ${result.protocol?.goals?.join(", ") || "Optimization"}`);
            lines.push("");
            lines.push("---");
            lines.push("");

            // Protocol phases
            if (result.protocol?.phases && result.protocol.phases.length > 0) {
              lines.push("### 📋 Protocol Phases");
              lines.push("");
              result.protocol.phases.forEach((phase, idx) => {
                lines.push(`#### Phase ${idx + 1}: ${phase.name}`);
                lines.push(`**Duration:** ${phase.duration}`);
                lines.push(`**Description:** ${phase.description}`);
                lines.push(`**Goals:** ${phase.goals.join(", ")}`);
                lines.push("");
                
                if (phase.steps && phase.steps.length > 0) {
                  lines.push("**Key Steps:**");
                  phase.steps.forEach(step => {
                    lines.push(`- **Day ${step.day} - ${step.category}:** ${step.action}`);
                    lines.push(`  - ${step.details}`);
                    if (step.timing) lines.push(`  - Timing: ${step.timing}`);
                    if (step.notes) lines.push(`  - Note: ${step.notes}`);
                    lines.push("");
                  });
                }
                
                if (idx < result.protocol.phases.length - 1) {
                  lines.push("---");
                  lines.push("");
                }
              });
            }

            // Daily routine
            if (result.protocol?.dailyRoutine && result.protocol.dailyRoutine.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### ⏰ Daily Routine");
              lines.push("");
              result.protocol.dailyRoutine.forEach(slot => {
                lines.push(`**${slot.time}**`);
                slot.actions.forEach(action => {
                  lines.push(`- ${action}`);
                });
                lines.push("");
              });
            }

            // Metrics
            if (result.protocol?.metrics && result.protocol.metrics.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 📊 Metrics to Track");
              lines.push("");
              result.protocol.metrics.forEach(metric => {
                lines.push(`**${metric.metric}**`);
                lines.push(`- How to measure: ${metric.howToMeasure}`);
                if (metric.target) {
                  lines.push(`- Target: ${metric.target}`);
                }
                lines.push("");
              });
            }

            // Supplements
            if (result.protocol?.supplements && result.protocol.supplements.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💊 Recommended Supplements");
              lines.push("");
              result.protocol.supplements.forEach(supp => {
                lines.push(`**${supp.name}**`);
                lines.push(`- Dosage: ${supp.dosage}`);
                lines.push(`- Timing: ${supp.timing}`);
                lines.push(`- Purpose: ${supp.purpose}`);
                lines.push("");
              });
            }

            // Tips
            if (result.protocol?.tips && result.protocol.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips for Success");
              lines.push("");
              result.protocol.tips.forEach(tip => {
                lines.push(`- ${tip}`);
              });
              lines.push("");
            }

            // Warnings
            if (result.protocol?.warnings && result.protocol.warnings.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### ⚠️ Important Warnings");
              lines.push("");
              result.protocol.warnings.forEach(warning => {
                lines.push(`- ${warning}`);
              });
              lines.push("");
            }
          } else {
            // Generic tool response
            lines.push(JSON.stringify(result, null, 2));
          }
          
          lines.push("---");
          lines.push("");
          lines.push("_Educational only. Not medical advice. Consult your healthcare provider before starting new supplements._");

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
    // PRIMARY: Anthropic Claude 4.5 (as per architecture)
    // Fallback to OpenAI if Anthropic is not available
    const provider = (process.env.AI_PROVIDER as "openai" | "anthropic") || "anthropic";
    const text = await withTimeout(
      runModel({
        provider,
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
