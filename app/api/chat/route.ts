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
    // PRIMARY: Anthropic Claude 3.5 Sonnet (as per architecture)
    // Fallback to OpenAI if Anthropic is not available
    let text: string;
    let provider: "anthropic" | "openai" = (process.env.AI_PROVIDER as "openai" | "anthropic") || "anthropic";
    
    try {
      text = await withTimeout(
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
    } catch (primaryError: unknown) {
      // Check if it's a rate limit error from the API provider
      const isApiRateLimit = primaryError instanceof Error && 
        (primaryError.message.includes("Rate limit") || primaryError.message.includes("rate limit"));
      
      if (isApiRateLimit) {
        logger.warn("API provider rate limit hit", { 
          provider, 
          error: primaryError, 
          userId, 
          requestId 
        });
        
        // Fallback to OpenAI if Anthropic rate limited
        if (provider === "anthropic" && process.env.OPENAI_API_KEY) {
          logger.info("Anthropic rate limited, falling back to OpenAI", { userId, requestId });
          try {
            provider = "openai";
            text = await withTimeout(
              runModel({
                provider: "openai",
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
          } catch (fallbackError: unknown) {
            // If both are rate limited, throw a clearer error
            if (fallbackError instanceof Error && fallbackError.message.includes("Rate limit")) {
              throw new Error("Both AI providers are rate limited. Please wait a few minutes and try again, or check your API key limits.");
            }
            logger.error("Both Anthropic and OpenAI failed", { primaryError, fallbackError, userId, requestId });
            throw fallbackError;
          }
        } else {
          // No fallback available, throw clearer error
          throw new Error(`AI provider (${provider}) rate limit exceeded. This is from the API provider, not our system. Please wait a few minutes or check your API key limits.`);
        }
      } else {
        // Other error, try fallback if available
        if (provider === "anthropic" && process.env.OPENAI_API_KEY) {
          logger.warn("Anthropic API failed, falling back to OpenAI", { error: primaryError, userId, requestId });
          try {
            provider = "openai";
            text = await withTimeout(
              runModel({
                provider: "openai",
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
          } catch (fallbackError: unknown) {
            logger.error("Both Anthropic and OpenAI failed", { primaryError, fallbackError, userId, requestId });
            throw fallbackError;
          }
        } else {
          throw primaryError;
        }
      }
    }
    
    // Save chat history (non-blocking)
    const sessionIdForHistory = body.sessionId || crypto.randomUUID();
    try {
      const { query, queryOne } = await import("@/lib/db/client");
      const userRecord = await queryOne<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [userId || ""]
      );
      if (userRecord) {
        // Save all messages in the thread
        for (const msg of [...messages, { role: "assistant" as const, content: text }]) {
          await query(
            `INSERT INTO chat_messages (user_id, thread_id, role, content, metadata)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [
              userRecord.id,
              sessionIdForHistory,
              msg.role,
              msg.content,
              JSON.stringify({ provider, model: provider === "anthropic" ? "claude-4-5" : "gpt-4o" }),
            ]
          );
        }
      }
    } catch (dbError) {
      // Ignore database errors - history saving is non-critical
      logger.debug("Chat history save skipped", { error: dbError });
    }
    
    logger.info("Chat API: Request completed", { 
      userId, 
      messageCount: messages.length,
      requestId,
    });
    
    return Response.json({ 
      success: true,
      data: { text, sessionId: sessionIdForHistory },
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
      (e.message.includes("API key") || e.message.includes("MISSING_API_KEY") || e.message.includes("AUTH_ERROR"));
    
    if (isApiKeyError) {
      return createErrorResponse(
        "AI API key is missing or invalid. Please check your ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local",
        requestId,
        500
      );
    }
    
    const errorMessage = e instanceof Error && process.env.NODE_ENV === "development" 
      ? e.message 
      : "An error occurred. Please try again.";
    
    return createErrorResponse(errorMessage, requestId, 500);
  }
}
