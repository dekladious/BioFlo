import { auth, currentUser } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { ModelError, streamModel } from "@/lib/ai/modelRouter";
import { detectToolFromUserText, getTool } from "@/lib/ai/tools";
import { classifyRequest } from "@/lib/ai/classifier";
import { chooseModels } from "@/lib/ai/modelRouter";
import { buildRagContext, retrieveRelevantContext, getRelevantLongevityDocs, formatLongevityKnowledgeSnippets, getSleepContext, formatSleepContext, isSleepQuery } from "@/lib/ai/rag";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { judgeAnswer, rewriteUnsafeAnswer } from "@/lib/ai/safety";
import { generateWithFallback } from "@/lib/ai/fallback";
import { buildTriageForBlocked, buildGenericSafeAnswer } from "@/lib/ai/triage";
import { getAiUserId } from "@/lib/analytics/userId";
import { logAnalyticsEvent, logApiError } from "@/lib/analytics/logging";
import { CHAT, RATE_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { ClerkPublicMetadata } from "@/types";
import { getRequestMetadata, validateContentType, withTimeout, createErrorResponse } from "@/lib/api-utils";
import { queryOne } from "@/lib/db/client";
import "@/lib/ai/tools/mealPlanner"; // ensure tool registers
import "@/lib/ai/tools/supplementRecommender"; // ensure tool registers
import "@/lib/ai/tools/sleepOptimizer"; // ensure tool registers
import "@/lib/ai/tools/protocolBuilder"; // ensure tool registers
import "@/lib/ai/tools/womensHealth"; // ensure tool registers
import "@/lib/ai/tools/fastingPlanner"; // ensure tool registers
import "@/lib/ai/tools/coldHotTherapy"; // ensure tool registers
import "@/lib/ai/tools/stressManagement"; // ensure tool registers
import "@/lib/ai/tools/macroCalculator"; // ensure tool registers
import "@/lib/ai/tools/recoveryOptimizer"; // ensure tool registers

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

    // Rate limiting (skip in development if DISABLE_RATE_LIMIT is set)
    let rateLimitResult;
    const disableRateLimit = process.env.DISABLE_RATE_LIMIT === "true" || process.env.DISABLE_RATE_LIMIT === "1";
    const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
    // Log rate limit status for debugging
    logger.debug("Rate limit check", { 
      disableRateLimit, 
      isDevelopment, 
      DISABLE_RATE_LIMIT: process.env.DISABLE_RATE_LIMIT,
      NODE_ENV: process.env.NODE_ENV,
      userId,
      requestId 
    });
    
    if (disableRateLimit && isDevelopment) {
      // Skip rate limiting in dev mode if explicitly disabled
      logger.info("Rate limiting DISABLED in development", { userId, requestId });
      rateLimitResult = {
        success: true,
        remaining: RATE_LIMIT_CONFIG.maxRequests,
        resetAt: Date.now() + RATE_LIMIT_CONFIG.windowMs,
      };
    } else {
      const identifier = getRateLimitIdentifier(userId, ip);
      rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIG);
      logger.debug("Rate limit check result", { 
        success: rateLimitResult.success, 
        remaining: rateLimitResult.remaining,
        identifier,
        userId,
        requestId 
      });
      
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
            error: `Rate limit exceeded. You've used ${RATE_LIMIT_CONFIG.maxRequests} requests. Please try again in ${Math.ceil((rateLimitResult.retryAfter || 0) / 60)} minute${Math.ceil((rateLimitResult.retryAfter || 0) / 60) !== 1 ? 's' : ''}.`,
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
    }
    
    const responseHeaders = {
      "X-RateLimit-Limit": String(RATE_LIMIT_CONFIG.maxRequests),
      "X-RateLimit-Remaining": String(rateLimitResult.remaining ?? 0),
      "X-RateLimit-Reset": String(rateLimitResult.resetAt ?? Date.now()),
      "X-Request-Id": requestId,
    };
    
    // Paywall check
    const user = await currentUser();
    const isPro = Boolean((user?.publicMetadata as ClerkPublicMetadata)?.isPro);
    const bypassPaywall = process.env.BYPASS_PAYWALL === "true"; // For development/testing
    if (!isPro && !bypassPaywall) {
      logger.info("Chat API: Subscription required", { userId, requestId });
      return createErrorResponse("Subscription required", requestId, 402);
    }

    // Parse and validate request body
    const body = await req.json();
    const { messages, sessionId: incomingSessionId, domain } = body;
    const sessionIdForHistory = incomingSessionId || randomUUID();
    
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

    // Note: Triage and routing is now handled inside generateCoachReply
    // We still log for monitoring, but the gateway handles all routing

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
            
            if (result.fastingRecommendations) {
              lines.push("---");
              lines.push("");
              lines.push("### 🕐 Fasting Window Recommendation");
              lines.push("");
              lines.push(`**Suggested Protocol:** ${result.fastingRecommendations.suggestedProtocol}`);
              lines.push(`**Eating Window:** ${result.fastingRecommendations.eatingWindow}`);
              lines.push(`**Fasting Window:** ${result.fastingRecommendations.fastingWindow}`);
              lines.push("");
              lines.push("**Benefits:**");
              result.fastingRecommendations.benefits.forEach(benefit => {
                lines.push(`- ${benefit}`);
              });
              lines.push("");
              lines.push(`*${result.fastingRecommendations.notes}*`);
              lines.push("");
            }
            
            if (result.electrolyteRecommendations) {
              lines.push("---");
              lines.push("");
              lines.push("### 🧂 Electrolyte Recommendations");
              lines.push("");
              lines.push(`**Sodium:** ${result.electrolyteRecommendations.sodium}`);
              lines.push(`**Potassium:** ${result.electrolyteRecommendations.potassium}`);
              lines.push(`**Magnesium:** ${result.electrolyteRecommendations.magnesium}`);
              if (result.electrolyteRecommendations.notes) {
                lines.push("");
                lines.push(`*${result.electrolyteRecommendations.notes}*`);
              }
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
          } else if (tool.name === "womensHealth") {
            // Format women's health protocol response
            lines.push(`## 🌸 ${result.protocol?.title || "Women's Health Protocol"}`);
            lines.push("");
            lines.push(result.protocol?.description || result.summary || "");
            if (result.protocol?.cyclePhase) {
              lines.push(`**Current Cycle Phase:** ${result.protocol.cyclePhase.charAt(0).toUpperCase() + result.protocol.cyclePhase.slice(1)}`);
            }
            lines.push("");
            lines.push("---");
            lines.push("");

            // Cycle-based protocols
            if (result.protocol?.protocols && result.protocol.protocols.length > 0) {
              lines.push("### 📅 Cycle-Based Protocols");
              lines.push("");
              result.protocol.protocols.forEach((phaseProtocol, idx) => {
                lines.push(`#### ${phaseProtocol.phase.charAt(0).toUpperCase() + phaseProtocol.phase.slice(1)} Phase (${phaseProtocol.days})`);
                lines.push(phaseProtocol.description);
                lines.push("");
                
                lines.push("**Nutrition:**");
                phaseProtocol.recommendations.nutrition.forEach(rec => {
                  lines.push(`- ${rec}`);
                });
                lines.push("");

                lines.push("**Exercise:**");
                phaseProtocol.recommendations.exercise.forEach(rec => {
                  lines.push(`- ${rec}`);
                });
                lines.push("");

                if (phaseProtocol.recommendations.supplements.length > 0) {
                  lines.push("**Supplements:**");
                  phaseProtocol.recommendations.supplements.forEach(supp => {
                    lines.push(`- **${supp.name}:** ${supp.dosage} - ${supp.timing} (${supp.purpose})`);
                  });
                  lines.push("");
                }

                lines.push("**Lifestyle:**");
                phaseProtocol.recommendations.lifestyle.forEach(rec => {
                  lines.push(`- ${rec}`);
                });
                lines.push("");

                if (idx < result.protocol.protocols.length - 1) {
                  lines.push("---");
                  lines.push("");
                }
              });
            }

            // General protocol
            if (result.protocol?.generalProtocol) {
              lines.push("---");
              lines.push("");
              lines.push("### 💚 General Protocol (All Cycle Phases)");
              lines.push("");

              lines.push("**Nutrition:**");
              result.protocol.generalProtocol.nutrition.forEach(rec => {
                lines.push(`- ${rec}`);
              });
              lines.push("");

              lines.push("**Exercise:**");
              result.protocol.generalProtocol.exercise.forEach(rec => {
                lines.push(`- ${rec}`);
              });
              lines.push("");

              if (result.protocol.generalProtocol.supplements.length > 0) {
                lines.push("**Supplements:**");
                result.protocol.generalProtocol.supplements.forEach(supp => {
                  lines.push(`- **${supp.name}:** ${supp.dosage} - ${supp.timing} (${supp.purpose})`);
                });
                lines.push("");
              }

              lines.push("**Lifestyle:**");
              result.protocol.generalProtocol.lifestyle.forEach(rec => {
                lines.push(`- ${rec}`);
              });
              lines.push("");
            }

            // Hormonal optimization
            if (result.protocol?.hormonalOptimization) {
              lines.push("---");
              lines.push("");
              lines.push("### ⚖️ Hormonal Optimization");
              lines.push("");

              lines.push("**Strategies:**");
              result.protocol.hormonalOptimization.strategies.forEach(strategy => {
                lines.push(`- ${strategy}`);
              });
              lines.push("");

              if (result.protocol.hormonalOptimization.supplements.length > 0) {
                lines.push("**Supplements:**");
                result.protocol.hormonalOptimization.supplements.forEach(supp => {
                  lines.push(`- **${supp.name}:** ${supp.dosage} - ${supp.timing} (${supp.purpose})`);
                });
                lines.push("");
              }
            }

            // Tips
            if (result.protocol?.tips && result.protocol.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips");
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
          } else if (tool.name === "fastingPlanner") {
            // Format fasting planner response
            lines.push(`## 🕐 Fasting Protocol: ${result.protocol.name}`);
            lines.push("");
            lines.push(result.protocol.description);
            lines.push("");
            lines.push(`**Fasting Window:** ${result.protocol.fastingWindow}`);
            lines.push(`**Eating Window:** ${result.protocol.eatingWindow}`);
            lines.push("");
            lines.push("---");
            lines.push("");
            lines.push("### 📅 Schedule");
            lines.push("");
            lines.push(`**Fasting Period:** ${result.protocol.schedule.fastingStart} - ${result.protocol.schedule.fastingEnd}`);
            lines.push(`**Eating Period:** ${result.protocol.schedule.eatingStart} - ${result.protocol.schedule.eatingEnd}`);
            lines.push("");
            
            if (result.protocol.progression) {
              lines.push("---");
              lines.push("");
              lines.push("### 📈 4-Week Progression Plan");
              lines.push("");
              lines.push(`**Week 1:** ${result.protocol.progression.week1}`);
              lines.push(`**Week 2:** ${result.protocol.progression.week2}`);
              lines.push(`**Week 3:** ${result.protocol.progression.week3}`);
              lines.push(`**Week 4:** ${result.protocol.progression.week4}`);
              lines.push("");
            }
            
            lines.push("---");
            lines.push("");
            lines.push("### 🧂 Electrolyte Recommendations");
            lines.push("");
            lines.push(`**Sodium:** ${result.electrolytes.sodium}`);
            lines.push(`**Potassium:** ${result.electrolytes.potassium}`);
            lines.push(`**Magnesium:** ${result.electrolytes.magnesium}`);
            if (result.electrolytes.notes) {
              lines.push("");
              lines.push(`*${result.electrolytes.notes}*`);
            }
            lines.push("");
            
            lines.push("---");
            lines.push("");
            lines.push("### 🍽️ Breaking Your Fast");
            lines.push("");
            lines.push(`**${result.breakingFast.firstMeal}**`);
            lines.push(`**Timing:** ${result.breakingFast.timing}`);
            lines.push("");
            lines.push("**Recommended Foods:**");
            result.breakingFast.foods.forEach(food => {
              lines.push(`- ${food}`);
            });
            lines.push("");
            lines.push("**Avoid:**");
            result.breakingFast.avoid.forEach(item => {
              lines.push(`- ${item}`);
            });
            lines.push("");
            lines.push(`*${result.breakingFast.notes}*`);
            lines.push("");
            
            if (result.mealSuggestions) {
              lines.push("---");
              lines.push("");
              lines.push("### 🥗 Meal Suggestions");
              lines.push("");
              if (result.mealSuggestions.meal1) {
                lines.push("**Meal 1:**");
                result.mealSuggestions.meal1.forEach(suggestion => {
                  lines.push(`- ${suggestion}`);
                });
                lines.push("");
              }
              if (result.mealSuggestions.meal2) {
                lines.push("**Meal 2:**");
                result.mealSuggestions.meal2.forEach(suggestion => {
                  lines.push(`- ${suggestion}`);
                });
                lines.push("");
              }
              if (result.mealSuggestions.meal3) {
                lines.push("**Meal 3:**");
                result.mealSuggestions.meal3.forEach(suggestion => {
                  lines.push(`- ${suggestion}`);
                });
                lines.push("");
              }
            }
            
            if (result.tips && result.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips for Success");
              lines.push("");
              result.tips.forEach(tip => {
                lines.push(`- ${tip}`);
              });
              lines.push("");
            }
          } else if (tool.name === "coldHotTherapy") {
            // Format cold/hot therapy response
            lines.push(`## 🧊❄️ Cold & Heat Therapy Protocol`);
            lines.push("");
            
            if (result.coldPlunge) {
              lines.push("### 🧊 Cold Exposure Protocol");
              lines.push("");
              lines.push(`**${result.coldPlunge.name}**`);
              lines.push(result.coldPlunge.description);
              lines.push("");
              lines.push(`**Temperature:** ${result.coldPlunge.temperature}`);
              lines.push(`**Duration:** ${result.coldPlunge.duration}`);
              lines.push(`**Frequency:** ${result.coldPlunge.frequency}`);
              lines.push("");
              lines.push("**4-Week Progression:**");
              lines.push(`- Week 1: ${result.coldPlunge.progression.week1}`);
              lines.push(`- Week 2: ${result.coldPlunge.progression.week2}`);
              lines.push(`- Week 3: ${result.coldPlunge.progression.week3}`);
              lines.push(`- Week 4: ${result.coldPlunge.progression.week4}`);
              lines.push("");
              lines.push("**Safety Guidelines:**");
              result.coldPlunge.safety.forEach(safety => {
                lines.push(`- ${safety}`);
              });
              lines.push("");
              lines.push("---");
              lines.push("");
            }
            
            if (result.sauna) {
              lines.push("### 🔥 Sauna Protocol");
              lines.push("");
              lines.push(`**${result.sauna.name}**`);
              lines.push(result.sauna.description);
              lines.push("");
              lines.push(`**Temperature:** ${result.sauna.temperature}`);
              lines.push(`**Duration:** ${result.sauna.duration}`);
              lines.push(`**Frequency:** ${result.sauna.frequency}`);
              lines.push(`**Hydration:** ${result.sauna.hydration}`);
              lines.push("");
              lines.push("**Safety Guidelines:**");
              result.sauna.safety.forEach(safety => {
                lines.push(`- ${safety}`);
              });
              lines.push("");
              lines.push("---");
              lines.push("");
            }
            
            if (result.contrast) {
              lines.push("### 🔄 Contrast Therapy Protocol");
              lines.push("");
              lines.push(`**${result.contrast.name}**`);
              lines.push(result.contrast.description);
              lines.push("");
              lines.push("**Sequence:**");
              result.contrast.sequence.forEach((step, idx) => {
                lines.push(`${idx + 1}. **${step.step}** - ${step.duration} at ${step.temperature}`);
              });
              lines.push("");
              lines.push(`**Frequency:** ${result.contrast.frequency}`);
              lines.push("");
              lines.push("**Benefits:**");
              result.contrast.benefits.forEach(benefit => {
                lines.push(`- ${benefit}`);
              });
              lines.push("");
              lines.push("---");
              lines.push("");
            }
            
            if (result.timingRecommendations && result.timingRecommendations.length > 0) {
              lines.push("### ⏰ Timing Recommendations");
              lines.push("");
              result.timingRecommendations.forEach(rec => {
                lines.push(`- ${rec}`);
              });
              lines.push("");
              lines.push("---");
              lines.push("");
            }
            
            if (result.tips && result.tips.length > 0) {
              lines.push("### 💡 Tips for Success");
              lines.push("");
              result.tips.forEach(tip => {
                lines.push(`- ${tip}`);
              });
              lines.push("");
            }
          } else if (tool.name === "stressManagement") {
            // Format stress management response
            lines.push(`## 🧘 Stress Management Protocol`);
            lines.push("");
            
            if (result.breathingExercises && result.breathingExercises.length > 0) {
              lines.push("### 🌬️ Breathing Exercises");
              lines.push("");
              result.breathingExercises.forEach((exercise, idx) => {
                lines.push(`#### ${idx + 1}. ${exercise.name}`);
                lines.push(exercise.description);
                lines.push("");
                lines.push("**Steps:**");
                exercise.steps.forEach(step => {
                  lines.push(`- ${step}`);
                });
                lines.push("");
                lines.push(`**Duration:** ${exercise.duration}`);
                lines.push(`**Frequency:** ${exercise.frequency}`);
                lines.push("");
                lines.push("**Benefits:**");
                exercise.benefits.forEach(benefit => {
                  lines.push(`- ${benefit}`);
                });
                lines.push("");
                lines.push(`**When to Use:** ${exercise.whenToUse}`);
                lines.push("");
                if (idx < result.breathingExercises.length - 1) {
                  lines.push("---");
                  lines.push("");
                }
              });
            }
            
            if (result.meditation) {
              lines.push("---");
              lines.push("");
              lines.push("### 🧘 Meditation Protocol");
              lines.push("");
              lines.push(`**${result.meditation.name}**`);
              lines.push(result.meditation.description);
              lines.push("");
              lines.push(`**Duration:** ${result.meditation.duration}`);
              lines.push(`**Frequency:** ${result.meditation.frequency}`);
              lines.push("");
              lines.push("**Technique:**");
              result.meditation.technique.forEach(step => {
                lines.push(`- ${step}`);
              });
              lines.push("");
              lines.push("**Benefits:**");
              result.meditation.benefits.forEach(benefit => {
                lines.push(`- ${benefit}`);
              });
              lines.push("");
            }
            
            if (result.hrvProtocol) {
              lines.push("---");
              lines.push("");
              lines.push("### 📊 HRV Optimization Protocol");
              lines.push("");
              lines.push(`**${result.hrvProtocol.name}**`);
              lines.push(result.hrvProtocol.description);
              lines.push("");
              lines.push("**Exercises:**");
              result.hrvProtocol.exercises.forEach((exercise, idx) => {
                lines.push(`**${idx + 1}. ${exercise.name}** (${exercise.duration})`);
                exercise.instructions.forEach(instruction => {
                  lines.push(`- ${instruction}`);
                });
                lines.push("");
              });
              lines.push("**Tracking:**");
              result.hrvProtocol.tracking.forEach(item => {
                lines.push(`- ${item}`);
              });
              lines.push("");
              lines.push("**Goals:**");
              result.hrvProtocol.goals.forEach(goal => {
                lines.push(`- ${goal}`);
              });
              lines.push("");
            }
            
            if (result.adaptogens && result.adaptogens.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💊 Adaptogen Recommendations");
              lines.push("");
              result.adaptogens.forEach((adaptogen, idx) => {
                lines.push(`**${idx + 1}. ${adaptogen.name}**`);
                lines.push(`- **Dosage:** ${adaptogen.dosage}`);
                lines.push(`- **Timing:** ${adaptogen.timing}`);
                lines.push(`- **Purpose:** ${adaptogen.purpose}`);
                if (adaptogen.notes) {
                  lines.push(`- **Notes:** ${adaptogen.notes}`);
                }
                lines.push("");
              });
            }
            
            if (result.lifestyleRecommendations && result.lifestyleRecommendations.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💚 Lifestyle Recommendations");
              lines.push("");
              result.lifestyleRecommendations.forEach(rec => {
                lines.push(`- ${rec}`);
              });
              lines.push("");
            }
            
            if (result.dailyRoutine && result.dailyRoutine.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 📅 Suggested Daily Routine");
              lines.push("");
              result.dailyRoutine.forEach(item => {
                lines.push(`- ${item}`);
              });
              lines.push("");
            }
            
            if (result.tips && result.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips for Success");
              lines.push("");
              result.tips.forEach(tip => {
                lines.push(`- ${tip}`);
              });
              lines.push("");
            }
          } else if (tool.name === "macroCalculator") {
            // Format macro calculator response
            lines.push(`## 📊 Macro Calculator Results`);
            lines.push("");
            lines.push(`**Goal:** ${result.goal.charAt(0).toUpperCase() + result.goal.slice(1).replace(/_/g, " ")}`);
            lines.push(`**Activity Level:** ${result.activityLevel.charAt(0).toUpperCase() + result.activityLevel.slice(1).replace(/_/g, " ")}`);
            lines.push(`**Dietary Preference:** ${result.dietaryPreference.charAt(0).toUpperCase() + result.dietaryPreference.slice(1).replace(/_/g, " ")}`);
            lines.push("");
            lines.push("---");
            lines.push("");
            lines.push("### 🔥 Daily Calorie Targets");
            lines.push("");
            lines.push(`**BMR (Basal Metabolic Rate):** ${result.bmr} calories/day`);
            lines.push(`**TDEE (Total Daily Energy Expenditure):** ${result.tdee} calories/day`);
            lines.push(`**Target Calories:** ${result.targetCalories} calories/day`);
            if (result.deficitOrSurplus !== 0) {
              const sign = result.deficitOrSurplus > 0 ? "+" : "";
              lines.push(`**${result.deficitOrSurplus > 0 ? "Surplus" : "Deficit"}:** ${sign}${result.deficitOrSurplus} calories/day`);
            }
            lines.push("");
            lines.push("---");
            lines.push("");
            lines.push("### 🥩 Daily Macronutrient Targets");
            lines.push("");
            lines.push(`**Protein:** ${result.macros.protein}g (${result.macroPercentages.protein}%)`);
            lines.push(`**Carbohydrates:** ${result.macros.carbs}g (${result.macroPercentages.carbs}%)`);
            lines.push(`**Fat:** ${result.macros.fat}g (${result.macroPercentages.fat}%)`);
            lines.push(`**Total Calories:** ${result.macros.calories} kcal`);
            lines.push("");
            lines.push("---");
            lines.push("");
            lines.push("### 🍽️ Meal Distribution");
            lines.push("");
            result.mealDistribution.forEach((meal, idx) => {
              lines.push(`**${meal.meal}**${meal.timing ? ` (${meal.timing})` : ""}`);
              lines.push(`- Calories: ${meal.calories} kcal`);
              lines.push(`- Protein: ${meal.protein}g`);
              lines.push(`- Carbs: ${meal.carbs}g`);
              lines.push(`- Fat: ${meal.fat}g`);
              lines.push("");
            });
            
            if (result.tips && result.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips for Success");
              lines.push("");
              result.tips.forEach(tip => {
                lines.push(`- ${tip}`);
              });
              lines.push("");
            }
          } else if (tool.name === "recoveryOptimizer") {
            // Format recovery optimizer response
            lines.push(`## 💪 Recovery Optimization Protocol`);
            lines.push("");
            lines.push(`**Workout Type:** ${result.workoutType.charAt(0).toUpperCase() + result.workoutType.slice(1).replace(/_/g, " ")}`);
            lines.push(`**Intensity:** ${result.intensity.charAt(0).toUpperCase() + result.intensity.slice(1).replace(/_/g, " ")}`);
            lines.push(`**Recovery Time:** ${result.recoveryTime.charAt(0).toUpperCase() + result.recoveryTime.slice(1).replace(/_/g, " ")}`);
            lines.push("");
            lines.push("---");
            lines.push("");
            
            if (result.protocols && result.protocols.length > 0) {
              lines.push("### 📋 Recovery Protocols");
              lines.push("");
              result.protocols.forEach((protocol, idx) => {
                lines.push(`#### ${idx + 1}. ${protocol.name}`);
                lines.push(protocol.description);
                lines.push(`**Duration:** ${protocol.duration}`);
                lines.push("");
                protocol.steps.forEach(step => {
                  lines.push(`**${step.time} - ${step.action}**`);
                  step.details.forEach(detail => {
                    lines.push(`- ${detail}`);
                  });
                  lines.push("");
                });
                if (idx < result.protocols.length - 1) {
                  lines.push("---");
                  lines.push("");
                }
              });
            }
            
            if (result.sleepOptimization) {
              lines.push("---");
              lines.push("");
              lines.push("### 😴 Sleep Optimization for Recovery");
              lines.push("");
              lines.push(`**Target Duration:** ${result.sleepOptimization.duration}`);
              lines.push(`**Timing:** ${result.sleepOptimization.timing}`);
              lines.push("");
              lines.push("**Recommendations:**");
              result.sleepOptimization.recommendations.forEach(rec => {
                lines.push(`- ${rec}`);
              });
              lines.push("");
            }
            
            if (result.supplements && result.supplements.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💊 Recovery Supplements");
              lines.push("");
              result.supplements.forEach((supp, idx) => {
                lines.push(`**${idx + 1}. ${supp.name}**`);
                lines.push(`- **Dosage:** ${supp.dosage}`);
                lines.push(`- **Timing:** ${supp.timing}`);
                lines.push(`- **Purpose:** ${supp.purpose}`);
                if (supp.notes) {
                  lines.push(`- **Notes:** ${supp.notes}`);
                }
                lines.push("");
              });
            }
            
            if (result.activeRecovery && result.activeRecovery.activities.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 🚶 Active Recovery Activities");
              lines.push("");
              result.activeRecovery.activities.forEach((activity, idx) => {
                lines.push(`**${idx + 1}. ${activity.name}**`);
                lines.push(`- **Duration:** ${activity.duration}`);
                lines.push(`- **Intensity:** ${activity.intensity}`);
                lines.push("**Benefits:**");
                activity.benefits.forEach(benefit => {
                  lines.push(`- ${benefit}`);
                });
                lines.push("");
              });
            }
            
            if (result.nutritionTiming && result.nutritionTiming.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 🍽️ Nutrition Timing Recommendations");
              lines.push("");
              result.nutritionTiming.forEach(rec => {
                lines.push(`- ${rec}`);
              });
              lines.push("");
            }
            
            if (result.tips && result.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Recovery Tips");
              lines.push("");
              result.tips.forEach(tip => {
                lines.push(`- ${tip}`);
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

          // Track tool usage analytics (non-blocking)
          try {
            const { query } = await import("@/lib/db/client");
            const userRecord = await query<{ id: string }>(
              "SELECT id FROM users WHERE clerk_user_id = $1",
              [userId || ""]
            );
            if (userRecord.length > 0) {
              await query(
                "INSERT INTO tool_usage (user_id, tool_name, input_data, output_data) VALUES ($1, $2, $3, $4)",
                [
                  userRecord[0].id,
                  tool.name,
                  JSON.stringify(parsed.data),
                  JSON.stringify(result),
                ]
              );
            }
          } catch (dbError) {
            // Ignore database errors - analytics is non-critical
            logger.debug("Tool analytics tracking skipped", { error: dbError });
          }

          logger.info("Chat API: Tool executed successfully", { 
            userId, 
            toolName: tool.name, 
            requestId 
          });

          const toolText = lines.join("\n");

          return createStreamResponse({
            requestId,
            headers: responseHeaders,
            streamHandler: async (send) => {
              send({ type: "meta", sessionId: sessionIdForHistory });
              await streamTextChunks(toolText, send);
              await persistHistory({
                userId,
                sessionId: sessionIdForHistory,
                requestMessages: messages,
                assistantContent: toolText,
                provider: `tool:${tool.name}`,
              });
              logger.info("Chat API: Tool response streamed", {
                userId,
                toolName: tool.name,
                requestId,
              });
              send({ type: "done", sessionId: sessionIdForHistory });
            },
          });
        } catch (toolError: unknown) {
          const errorMessage = toolError instanceof Error ? toolError.message : String(toolError);
          const errorStack = toolError instanceof Error ? toolError.stack : undefined;
          logger.error("Chat API: Tool execution failed", {
            error: errorMessage,
            stack: errorStack,
            toolName: tool.name,
            userId,
            requestId,
          });
          
          // Provide more helpful error message
          const userFriendlyMessage = `Failed to generate ${tool.name === "sleepOptimizer" ? "sleep protocol" : tool.name === "mealPlanner" ? "meal plan" : "protocol"}. ${errorMessage.includes("database") || errorMessage.includes("connection") ? "Database connection issue. Please try again." : "Please try again or rephrase your request."}`;
          
          return createErrorResponse(userFriendlyMessage, requestId, 500);
        }
      }
    }

    // Load user profile for context
    let userProfile: { goals?: Record<string, unknown>; main_struggles?: string[]; preferences?: Record<string, unknown> } | null = null;
    let userDbId: string | null = null;
    try {
      const userRecord = await queryOne<{ id: string; goals?: Record<string, unknown>; main_struggles?: string[] }>(
        "SELECT id, goals, main_struggles FROM users WHERE clerk_user_id = $1",
        [userId]
      );
      if (userRecord) {
        userDbId = userRecord.id;
        // Ensure main_struggles is always an array (it might be stored as JSONB object or string)
        const struggles = userRecord.main_struggles;
        const strugglesArray = Array.isArray(struggles) 
          ? struggles 
          : typeof struggles === "string" 
            ? JSON.parse(struggles || "[]")
            : struggles && typeof struggles === "object"
              ? Object.values(struggles)
              : [];
        
        userProfile = {
          goals: userRecord.goals || {},
          main_struggles: strugglesArray,
        };
      }
    } catch (dbError) {
      logger.debug("Chat API: Failed to load user profile", { error: dbError, userId, requestId });
    }

    // Generate pseudonymous AI user ID for analytics
    const aiUserId = getAiUserId(userId, ip);

    // Step 1: Classify request (V2 Pipeline)
    const classification = await classifyRequest(userContent);
    logger.debug("Chat API: Request classified", {
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
        sessionId: sessionIdForHistory,
        topic: classification.topic,
        risk: classification.risk,
        complexity: classification.complexity,
        success: false,
        metadata: { reason: "allow_answer=false" },
      }).catch(() => {}); // Don't block on analytics

      return createStreamResponse({
        requestId,
        headers: responseHeaders,
        streamHandler: async (send) => {
          send({ type: "meta", sessionId: sessionIdForHistory });
          await streamTextChunks(triageMessage, send);
          send({ type: "done", sessionId: sessionIdForHistory });
        },
      });
    }

    // Step 3: Build RAG context (combine all sources)
    let combinedRagContext = "";
    let ragSources: { id: number; title: string | null; similarity: number }[] = [];

    // Detect sleep mode (from domain parameter or query content)
    const sleepMode = domain === "sleep" || isSleepQuery(userContent);

    // Retrieve sleep context (Matthew Walker content) if in sleep mode
    let sleepContext = "";
    if (sleepMode) {
      try {
        const sleepDocs = await getSleepContext(userContent, 8);
        if (sleepDocs.length > 0) {
          sleepContext = formatSleepContext(sleepDocs);
          ragSources.push(...sleepDocs.map(d => ({ id: typeof d.id === "number" ? d.id : parseInt(String(d.id || 0), 10), title: d.title || null, similarity: d.similarity })));
          logger.debug("Chat API: Sleep context retrieved", {
            userId,
            docCount: sleepDocs.length,
            requestId,
          });
        }
      } catch (sleepError) {
        logger.warn("Chat API: Sleep context retrieval failed", { error: sleepError, userId, requestId });
      }
    }

    // Retrieve longevity knowledge base documents (only if not in sleep mode)
    let longevityKnowledge = "";
    if (!sleepMode && classification.needs_rag) {
      try {
        const longevityDocs = await getRelevantLongevityDocs(userContent, {
          limit: 8,
        });
        if (longevityDocs.length > 0) {
          longevityKnowledge = formatLongevityKnowledgeSnippets(longevityDocs);
          ragSources.push(...longevityDocs.map(d => ({ id: typeof d.id === "number" ? d.id : parseInt(String(d.id || 0), 10), title: d.title || null, similarity: d.similarity })));
          logger.debug("Chat API: Longevity knowledge retrieved", {
            userId,
            docCount: longevityDocs.length,
            requestId,
          });
        }
      } catch (longevityError) {
        logger.warn("Chat API: Longevity knowledge retrieval failed", { error: longevityError, userId, requestId });
      }
    }

    // Retrieve general RAG context if needed
    let generalRagContext = "";
    if (classification.needs_rag && !sleepContext && !longevityKnowledge) {
      try {
        const ragResult = await buildRagContext(
          userContent,
          userDbId,
          6
        );
        generalRagContext = ragResult.context;
        ragSources.push(...ragResult.sources);
        logger.debug("Chat API: General RAG context retrieved", {
          userId,
          contextLength: generalRagContext.length,
          requestId,
        });
      } catch (ragError) {
        logger.warn("Chat API: RAG retrieval failed", { error: ragError, userId, requestId });
      }
    }

    // Combine all RAG contexts (prioritize sleep > longevity > general)
    combinedRagContext = sleepContext || longevityKnowledge || generalRagContext || "";

    // Step 4: Choose models
    const modelChoice = chooseModels(classification);

    // Step 5: Build system prompt with RAG context
    const systemPrompt = buildSystemPrompt(combinedRagContext);

    // Step 6: Prepare messages for LLM
    const normalizedMessages = messages
      .slice(-20)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" as const : "user" as const,
        content: m.content,
      }));

    const llmMessages = [
      { role: "system" as const, content: systemPrompt },
      ...normalizedMessages,
    ];

    // Get protocol status for context
    let protocolStatus = undefined;
    if (userDbId) {
      try {
        const { getProtocolStatusSummary } = await import("@/lib/utils/protocol-context");
        protocolStatus = await getProtocolStatusSummary(userDbId);
      } catch (protocolError) {
        logger.debug("Chat API: Failed to load protocol status", { error: protocolError, userId, requestId });
      }
    }

    // Build user context string for prompt
    const userContextString = userProfile
      ? `Goals: ${JSON.stringify(userProfile.goals || {})}\nMain struggles: ${Array.isArray(userProfile.main_struggles) ? userProfile.main_struggles.join(", ") : JSON.stringify(userProfile.main_struggles || [])}`
      : "No profile data available";

    const protocolContextString = protocolStatus || "No active protocols";

    // Add user context to the last user message
    const enhancedMessages = [...llmMessages];
    if (enhancedMessages.length > 1 && enhancedMessages[enhancedMessages.length - 1].role === "user") {
      enhancedMessages[enhancedMessages.length - 1] = {
        role: "user",
        content: `[USER_CONTEXT]
${userContextString}

[PROTOCOL_STATUS]
${protocolContextString}

[USER_MESSAGE]
${enhancedMessages[enhancedMessages.length - 1].content}`,
      };
    }

    return createStreamResponse({
      requestId,
      headers: responseHeaders,
      streamHandler: async (send) => {
        send({ type: "meta", sessionId: sessionIdForHistory });
        let assistantText = "";
        let judgeVerdict: "SAFE" | "WARN" | "BLOCK" | null = null;
        const startTime = Date.now();

        const onToken = (token: string) => {
          assistantText += token;
          send({ type: "token", value: token });
        };

        try {
          // Step 7: Generate answer with fallback (streaming)
          let assistantDraft: string;
          
          // Use streaming model for real-time token delivery
          try {
            await streamModel({
              provider: "openai",
              model: modelChoice.mainModel,
              system: systemPrompt,
              messages: enhancedMessages.filter(m => m.role !== "system"),
              timeout: 30000,
              maxTokens: 2000,
              onToken,
            });
            assistantDraft = assistantText;
          } catch (streamError) {
            // If streaming fails, try non-streaming fallback
            logger.warn("Chat API: Streaming failed, trying fallback", {
              error: streamError instanceof Error ? streamError.message : String(streamError),
              userId,
              requestId,
            });
            
            assistantDraft = await generateWithFallback({
              userQuestion: userContent,
              systemPrompt,
              messages: enhancedMessages,
              mainModel: modelChoice.mainModel,
              judgeModel: modelChoice.judgeModel,
            });
            
            // Stream the fallback response
            await streamTextChunks(assistantDraft, send);
            assistantText = assistantDraft;
          }

          // Step 8: Run safety judge if needed
          let finalAnswer = assistantDraft;
          
          if (modelChoice.useJudge && modelChoice.judgeModel && assistantDraft) {
            try {
              const verdict = await judgeAnswer({
                userQuestion: userContent,
                ragContext: combinedRagContext,
                assistantAnswer: assistantDraft,
                judgeModel: modelChoice.judgeModel,
              });

              judgeVerdict = verdict.verdict;

              if (verdict.verdict === "WARN" && verdict.needs_edit) {
                try {
                  finalAnswer = await rewriteUnsafeAnswer({
                    userQuestion: userContent,
                    ragContext: combinedRagContext,
                    unsafeAnswer: assistantDraft,
                    judgeModel: modelChoice.judgeModel,
                  });
                  // Replace the streamed content with rewritten version
                  // Note: This is a limitation - we've already streamed, but we'll update the final answer
                  assistantText = finalAnswer;
                } catch (rewriteError) {
                  logger.warn("Chat API: Rewrite failed, using original", {
                    error: rewriteError,
                    userId,
                    requestId,
                  });
                }
              } else if (verdict.verdict === "BLOCK") {
                finalAnswer = buildTriageForBlocked(
                  classification.topic,
                  classification.risk
                );
                assistantText = finalAnswer;
              }
            } catch (judgeError) {
              logger.error("Chat API: Safety judge failed", {
                error: judgeError,
                userId,
                requestId,
              });
              await logApiError({
                aiUserId,
                endpoint: "/api/chat",
                errorMessage: judgeError instanceof Error ? judgeError.message : String(judgeError),
                statusCode: 500,
              }).catch(() => {});
            }
          }

          // Step 9: Log analytics event
          await logAnalyticsEvent({
            aiUserId,
            eventType: "chat_response",
            sessionId: sessionIdForHistory,
            topic: classification.topic,
            risk: classification.risk,
            complexity: classification.complexity,
            needsRag: classification.needs_rag,
            modelUsed: modelChoice.mainModel,
            usedJudge: modelChoice.useJudge,
            judgeVerdict,
            messagesInSession: messages.length,
            answerLength: finalAnswer.length,
            ragDocsCount: ragSources.length,
            ragSources: ragSources.length > 0 ? ragSources : undefined,
            success: true,
          }).catch(() => {}); // Don't block on analytics

          // Persist history
          await persistHistory({
            userId,
            sessionId: sessionIdForHistory,
            requestMessages: messages,
            assistantContent: finalAnswer,
            provider: modelChoice.mainModel,
          });

          const latency = Date.now() - startTime;
          logger.info("Chat API: Request completed", {
            userId,
            messageCount: messages.length,
            requestId,
            latency,
            modelUsed: modelChoice.mainModel,
            usedJudge: modelChoice.useJudge,
          });

          send({ type: "done", sessionId: sessionIdForHistory });
        } catch (error) {
          logger.error("Chat API streaming error", error, userId);
          
          // Log error
          await logApiError({
            aiUserId,
            endpoint: "/api/chat",
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            statusCode: 500,
          }).catch(() => {});

          // Log analytics failure
          await logAnalyticsEvent({
            aiUserId,
            eventType: "chat_response",
            sessionId: sessionIdForHistory,
            topic: classification.topic,
            risk: classification.risk,
            complexity: classification.complexity,
            modelUsed: modelChoice.mainModel,
            success: false,
            errorCode: error instanceof Error ? error.message.substring(0, 50) : "unknown",
          }).catch(() => {});

          const message =
            error instanceof Error && process.env.NODE_ENV === "development"
              ? error.message
              : "An error occurred. Please try again.";
          send({ type: "error", error: message });
        }
      },
    });
  } catch (e: unknown) {
    const authResult = await auth().catch(() => ({ userId: null }));
    const userId = authResult.userId;
    
    // Log full error details for debugging
    const errorDetails = e instanceof Error 
      ? {
          message: e.message,
          stack: e.stack,
          name: e.name,
        }
      : { error: String(e) };
    
    logger.error("Chat API error", {
      ...errorDetails,
      userId,
      requestId,
    });
    
    // Check if it's a rate limit error from API provider
    const isRateLimitError = e instanceof Error && 
      (e.message.includes("Rate limit") || e.message.includes("rate limit") || e.message.includes("429"));
    
    if (isRateLimitError) {
      return createErrorResponse(
        e instanceof Error ? e.message : "Rate limit exceeded. Please try again later.",
        requestId,
        429
      );
    }
    
    // Check if it's an API key error
    const isApiKeyError = e instanceof Error && 
      (e.message.includes("API key") || 
       e.message.includes("MISSING_API_KEY") || 
       e.message.includes("AUTH_ERROR") ||
       e.message.includes("401") ||
       e.message.includes("Unauthorized"));
    
    if (isApiKeyError) {
      return createErrorResponse(
        "AI API key is missing or invalid. Please check your OPENAI_API_KEY and ANTHROPIC_API_KEY in .env.local",
        requestId,
        500
      );
    }
    
    // In development, show full error message
    const errorMessage = e instanceof Error 
      ? (process.env.NODE_ENV === "development" 
          ? `${e.message}${e.stack ? `\n\nStack: ${e.stack}` : ""}`
          : "An error occurred. Please try again.")
      : "An error occurred. Please try again.";
    
    return createErrorResponse(errorMessage, requestId, 500);
  }
}

type SendFn = (payload: Record<string, unknown>) => void;

function createStreamResponse({
  requestId,
  headers,
  streamHandler,
  abortSignal,
}: {
  requestId: string;
  headers: Record<string, string>;
  streamHandler: (send: SendFn) => Promise<void>;
  abortSignal?: AbortSignal;
}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Handle abort signal
      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          try {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  requestId,
                  type: "error",
                  error: "ERROR_USER_ABORTED_REQUEST",
                  details: {
                    title: "User aborted request.",
                    detail: "Tool call ended before result was received",
                    isRetryable: false,
                  },
                  isExpected: true,
                }) + "\n"
              )
            );
            controller.close();
          } catch (e) {
            // Stream may already be closed
          }
        });
      }

      const send: SendFn = (payload) => {
        // Check if aborted before sending
        if (abortSignal?.aborted) {
          controller.close();
          return;
        }
        try {
          controller.enqueue(encoder.encode(JSON.stringify({ requestId, ...payload }) + "\n"));
        } catch (e) {
          // Stream may be closed
        }
      };

      streamHandler(send)
        .then(() => {
          if (!abortSignal?.aborted) {
            controller.close();
          }
        })
        .catch((error) => {
          if (abortSignal?.aborted) {
            // Request was aborted, don't send error
            controller.close();
            return;
          }
          const message = error instanceof Error ? error.message : "Unknown error";
          try {
            send({ type: "error", error: message });
            controller.close();
          } catch (e) {
            // Stream may already be closed
          }
        });
    },
    cancel() {
      // Stream was cancelled (e.g., client disconnected)
      logger.debug("Stream cancelled", { requestId });
    },
  });

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function streamTextChunks(text: string, send: SendFn) {
  const chunkSize = 120;
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    if (chunk) {
      send({ type: "token", value: chunk });
    }
    await delay(20);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function persistHistory({
  userId,
  sessionId,
  requestMessages,
  assistantContent,
  provider,
}: {
  userId: string | null;
  sessionId: string;
  requestMessages: Array<{ role: string; content: string }>;
  assistantContent: string;
  provider: string;
}) {
  try {
    const { query, queryOne } = await import("@/lib/db/client");
    
    // Ensure user exists in database
    let userRecord = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId || ""]
    );
    
    if (!userRecord && userId) {
      // Create user if they don't exist
      try {
        const result = await query<{ id: string }>(
          "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        userRecord = result[0];
        logger.info("Created user record for chat history", { userId, userDbId: userRecord.id });
      } catch (createError) {
        logger.warn("Failed to create user record for chat history", { error: createError, userId });
        return; // Can't save history without user record
      }
    }
    
    if (!userRecord) {
      logger.debug("No user record available for chat history", { userId });
      return;
    }

    // Save messages - check if they already exist to avoid duplicates
    // Use a simple approach: check if message with same content exists in thread within last minute
    for (const msg of [...requestMessages, { role: "assistant" as const, content: assistantContent }]) {
      try {
        // Check if this exact message already exists in this thread (within last 5 minutes to avoid duplicates)
        const existing = await queryOne<{ id: string }>(
          `SELECT id FROM chat_messages 
           WHERE user_id = $1 AND thread_id = $2 AND role = $3 AND content = $4 
           AND created_at > NOW() - INTERVAL '5 minutes'`,
          [userRecord.id, sessionId, msg.role, msg.content]
        );
        
        if (!existing) {
          await query(
            `INSERT INTO chat_messages (user_id, thread_id, role, content, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              userRecord.id,
              sessionId,
              msg.role,
              msg.content,
              JSON.stringify({ provider }),
            ]
          );
        }
      } catch (msgError) {
        logger.debug("Failed to save individual message", { error: msgError, userId });
        // Continue with next message
      }
    }
    
    logger.debug("Chat history persisted", { userId, sessionId, messageCount: requestMessages.length + 1 });
  } catch (error) {
    logger.debug("Chat history save skipped", { error, userId });
  }
}

async function streamWithFallback({
  provider,
  system,
  messages,
  timeout,
  maxTokens,
  onToken,
}: {
  provider: "anthropic" | "openai";
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  timeout: number;
  maxTokens: number;
  onToken: (token: string) => void;
}): Promise<"anthropic" | "openai"> {
  let currentProvider = provider;
  try {
    await streamModel({
      provider: currentProvider,
      system,
      messages,
      timeout,
      maxTokens,
      onToken,
    });
    return currentProvider;
  } catch (error) {
    if (
      currentProvider === "openai" &&
      process.env.ANTHROPIC_API_KEY &&
      error instanceof ModelError
    ) {
      logger.warn("OpenAI streaming failed, falling back to Anthropic", {
        error: error.message,
      });
      currentProvider = "anthropic";
      await streamModel({
        provider: currentProvider,
        system,
        messages,
        timeout,
        maxTokens,
        onToken,
      });
      return currentProvider;
    }
    throw error;
  }
}
