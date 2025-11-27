import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { detectToolFromUserText, getTool } from "@/lib/ai/tools";
import { judgeAnswer, rewriteUnsafeAnswer } from "@/lib/ai/safety";
import { generateWithFallback } from "@/lib/ai/fallback";
import { buildTriageForBlocked, buildGenericSafeAnswer } from "@/lib/ai/triage";
import { getAiUserId } from "@/lib/analytics/userId";
import { logAnalyticsEvent, logApiError } from "@/lib/analytics/logging";
import { persistChatHistory } from "@/lib/ai/chat/history";
import {
  createStreamResponse,
  streamTextChunks,
  streamWithFallback,
} from "@/lib/ai/chat/streaming";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-utils";
import { ChatValidationError, validateAndNormalizeMessages } from "@/lib/api/chat/validation";
import { enforceChatGuards } from "@/lib/api/chat/guard";
import { classifyAndHandleTriage } from "@/lib/api/chat/classification";
import { prepareChatPipeline } from "@/lib/api/chat/pipeline";
import "@/lib/ai/tools/mealPlanner";
import "@/lib/ai/tools/supplementRecommender";
import "@/lib/ai/tools/sleepOptimizer";
import "@/lib/ai/tools/protocolBuilder";
import "@/lib/ai/tools/womensHealth";
import "@/lib/ai/tools/fastingPlanner";
import "@/lib/ai/tools/coldHotTherapy";
import "@/lib/ai/tools/stressManagement";
import "@/lib/ai/tools/macroCalculator";
import "@/lib/ai/tools/recoveryOptimizer";
import "@/lib/ai/tools/experiments";

export const runtime = "nodejs";

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const forEachItem = <T>(value: unknown, handler: (item: T, index: number) => void) => {
  if (Array.isArray(value)) {
    (value as T[]).forEach(handler);
  }
};

export async function POST(req: Request) {
  let requestId = "";
  let ip = "";
  let userId = "";
  let aiUserId = "";

  try {
    const guard = await enforceChatGuards(req);
    if (!guard.ok) {
      return guard.response;
    }
    userId = guard.userId;
    ip = guard.ip;
    requestId = guard.requestId;
    const responseHeaders = guard.responseHeaders;

    // Parse and validate request body
    const body = await req.json();
    const { messages, sessionId: incomingSessionId, domain } = body;
    const sessionIdForHistory = incomingSessionId || randomUUID();

    let conversationMessages;
    let userContent: string;

    try {
      const validation = validateAndNormalizeMessages(messages);
      conversationMessages = validation.normalizedMessages;
      userContent = validation.latestUserMessage;
    } catch (error) {
      if (error instanceof ChatValidationError) {
        logger.warn(`Chat API: ${error.message}`, { requestId, userId });
        return createErrorResponse(error.message, requestId, 400);
      }
      throw error;
    }

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
            errors: parsed.error.issues,
            requestId,
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
          const result = await tool.handler(parsed.data, { userId, requestId });
          
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
            
            const mealPlanEntries = Array.isArray(result.plan)
              ? (result.plan as Array<Record<string, any>>)
              : [];
            for (const m of mealPlanEntries) {
              lines.push(`### ${m.name}${m.timing ? ` (${m.timing})` : ""}`);
              lines.push(`**${m.kcal} kcal** | Protein: ${m.protein}g | Carbs: ${m.carbs}g | Fat: ${m.fat}g`);
              lines.push("");
              for (const item of toArray<string>(m.items)) {
                lines.push(`- ${item}`);
              }
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
              for (const benefit of toArray<string>(result.fastingRecommendations.benefits)) {
                lines.push(`- ${benefit}`);
              }
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
            
            if (Array.isArray(result.tips) && result.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips");
              for (const tip of toArray<string>(result.tips)) {
                lines.push(`- ${tip}`);
              }
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
            const supplementStack = Array.isArray(result.stack?.supplements)
              ? (result.stack?.supplements as Array<Record<string, any>>)
              : [];
            supplementStack.forEach((supp, idx) => {
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
              const timingSchedule = Array.isArray(result.stack.timingSchedule)
                ? (result.stack.timingSchedule as Array<Record<string, any>>)
                : [];
              timingSchedule.forEach((schedule) => {
                lines.push(`**${schedule.time}**`);
                for (const supp of toArray<string>(schedule.supplements)) {
                  lines.push(`- ${supp}`);
                }
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
              for (const interaction of toArray<string>(result.stack.interactions)) {
                lines.push(`- ${interaction}`);
              }
              lines.push("");
            }
            
            // Precautions
            if (result.stack?.precautions && result.stack.precautions.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### ⚠️ Precautions");
              lines.push("");
              for (const precaution of toArray<string>(result.stack.precautions)) {
                lines.push(`- ${precaution}`);
              }
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
              const protocols = result.recommendation.protocols as Array<Record<string, any>>;
              protocols.forEach((protocol, idx) => {
                lines.push(`### ${idx + 1}. ${protocol.name}`);
                lines.push(protocol.description);
                lines.push("");
                for (const step of toArray<Record<string, any>>(protocol.steps)) {
                  lines.push(`**${step.time}**`);
                  lines.push(`- ${step.action}${step.duration ? ` (${step.duration})` : ""}`);
                  if (step.notes) {
                    lines.push(`  *${step.notes}*`);
                  }
                  lines.push("");
                }
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
              for (const supp of toArray<Record<string, any>>(result.recommendation.supplements)) {
                lines.push(`**${supp.name}**`);
                lines.push(`- Dosage: ${supp.dosage}`);
                lines.push(`- Timing: ${supp.timing}`);
                lines.push(`- Purpose: ${supp.purpose}`);
                lines.push("");
              }
            }
            
            // Environment
            if (result.recommendation?.environment && result.recommendation.environment.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 🏠 Sleep Environment");
              lines.push("");
              for (const env of toArray<Record<string, any>>(result.recommendation.environment)) {
                lines.push(`**${env.category}**`);
                for (const rec of toArray<string>(env.recommendations)) {
                  lines.push(`- ${rec}`);
                }
                lines.push("");
              }
            }
            
            // Tips
            if (result.recommendation?.tips && result.recommendation.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Sleep Tips");
              lines.push("");
              for (const tip of toArray<string>(result.recommendation.tips)) {
                lines.push(`- ${tip}`);
              }
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
              const protocolPhases = result.protocol.phases as Array<Record<string, any>>;
              protocolPhases.forEach((phase, idx) => {
                lines.push(`#### Phase ${idx + 1}: ${phase.name}`);
                lines.push(`**Duration:** ${phase.duration}`);
                lines.push(`**Description:** ${phase.description}`);
                lines.push(`**Goals:** ${phase.goals.join(", ")}`);
                lines.push("");
                
                if (phase.steps && phase.steps.length > 0) {
                  lines.push("**Key Steps:**");
                  for (const step of toArray<Record<string, any>>(phase.steps)) {
                    lines.push(`- **Day ${step.day} - ${step.category}:** ${step.action}`);
                    lines.push(`  - ${step.details}`);
                    if (step.timing) lines.push(`  - Timing: ${step.timing}`);
                    if (step.notes) lines.push(`  - Note: ${step.notes}`);
                    lines.push("");
                  }
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
              for (const slot of toArray<Record<string, any>>(result.protocol.dailyRoutine)) {
                lines.push(`**${slot.time}**`);
                for (const action of toArray<string>(slot.actions)) {
                  lines.push(`- ${action}`);
                }
                lines.push("");
              }
            }

            // Metrics
            if (result.protocol?.metrics && result.protocol.metrics.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 📊 Metrics to Track");
              lines.push("");
              for (const metric of toArray<Record<string, any>>(result.protocol.metrics)) {
                lines.push(`**${metric.metric}**`);
                lines.push(`- How to measure: ${metric.howToMeasure}`);
                if (metric.target) {
                  lines.push(`- Target: ${metric.target}`);
                }
                lines.push("");
              }
            }

            // Supplements
            if (result.protocol?.supplements && result.protocol.supplements.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💊 Recommended Supplements");
              lines.push("");
              for (const supp of toArray<Record<string, any>>(result.protocol.supplements)) {
                lines.push(`**${supp.name}**`);
                lines.push(`- Dosage: ${supp.dosage}`);
                lines.push(`- Timing: ${supp.timing}`);
                lines.push(`- Purpose: ${supp.purpose}`);
                lines.push("");
              }
            }

            // Tips
            if (result.protocol?.tips && result.protocol.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips for Success");
              lines.push("");
              for (const tip of toArray<string>(result.protocol.tips)) {
                lines.push(`- ${tip}`);
              }
              lines.push("");
            }

            // Warnings
            if (result.protocol?.warnings && result.protocol.warnings.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### ⚠️ Important Warnings");
              lines.push("");
              for (const warning of toArray<string>(result.protocol.warnings)) {
                lines.push(`- ${warning}`);
              }
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
              const cycleProtocols = result.protocol.protocols as Array<Record<string, any>>;
              cycleProtocols.forEach((phaseProtocol, idx) => {
                lines.push(`#### ${phaseProtocol.phase.charAt(0).toUpperCase() + phaseProtocol.phase.slice(1)} Phase (${phaseProtocol.days})`);
                lines.push(phaseProtocol.description);
                lines.push("");
                
                lines.push("**Nutrition:**");
                for (const rec of toArray<string>(phaseProtocol.recommendations?.nutrition)) {
                  lines.push(`- ${rec}`);
                }
                lines.push("");

                lines.push("**Exercise:**");
                for (const rec of toArray<string>(phaseProtocol.recommendations?.exercise)) {
                  lines.push(`- ${rec}`);
                }
                lines.push("");

                if (phaseProtocol.recommendations?.supplements?.length > 0) {
                  lines.push("**Supplements:**");
                  for (const supp of toArray<Record<string, any>>(phaseProtocol.recommendations?.supplements)) {
                    lines.push(`- **${supp.name}:** ${supp.dosage} - ${supp.timing} (${supp.purpose})`);
                  }
                  lines.push("");
                }

                lines.push("**Lifestyle:**");
                for (const rec of toArray<string>(phaseProtocol.recommendations?.lifestyle)) {
                  lines.push(`- ${rec}`);
                }
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
              for (const rec of toArray<string>(result.protocol.generalProtocol.nutrition)) {
                lines.push(`- ${rec}`);
              }
              lines.push("");

              lines.push("**Exercise:**");
              for (const rec of toArray<string>(result.protocol.generalProtocol.exercise)) {
                lines.push(`- ${rec}`);
              }
              lines.push("");

              if (result.protocol.generalProtocol.supplements.length > 0) {
                lines.push("**Supplements:**");
                for (const supp of toArray<Record<string, any>>(result.protocol.generalProtocol.supplements)) {
                  lines.push(`- **${supp.name}:** ${supp.dosage} - ${supp.timing} (${supp.purpose})`);
                }
                lines.push("");
              }

              lines.push("**Lifestyle:**");
              for (const rec of toArray<string>(result.protocol.generalProtocol.lifestyle)) {
                lines.push(`- ${rec}`);
              }
              lines.push("");
            }

            // Hormonal optimization
            if (result.protocol?.hormonalOptimization) {
              lines.push("---");
              lines.push("");
              lines.push("### ⚖️ Hormonal Optimization");
              lines.push("");

              lines.push("**Strategies:**");
              for (const strategy of toArray<string>(result.protocol.hormonalOptimization.strategies)) {
                lines.push(`- ${strategy}`);
              }
              lines.push("");

              if (result.protocol.hormonalOptimization.supplements.length > 0) {
                lines.push("**Supplements:**");
                for (const supp of toArray<Record<string, any>>(result.protocol.hormonalOptimization.supplements)) {
                  lines.push(`- **${supp.name}:** ${supp.dosage} - ${supp.timing} (${supp.purpose})`);
                }
                lines.push("");
              }
            }

            // Tips
            if (result.protocol?.tips && result.protocol.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips");
              lines.push("");
              for (const tip of toArray<string>(result.protocol.tips)) {
                lines.push(`- ${tip}`);
              }
              lines.push("");
            }

            // Warnings
            if (result.protocol?.warnings && result.protocol.warnings.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### ⚠️ Important Warnings");
              lines.push("");
              for (const warning of toArray<string>(result.protocol.warnings)) {
                lines.push(`- ${warning}`);
              }
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
            for (const food of toArray<string>(result.breakingFast.foods)) {
              lines.push(`- ${food}`);
            }
            lines.push("");
            lines.push("**Avoid:**");
            for (const item of toArray<string>(result.breakingFast.avoid)) {
              lines.push(`- ${item}`);
            }
            lines.push("");
            lines.push(`*${result.breakingFast.notes}*`);
            lines.push("");
            
            if (result.mealSuggestions) {
              lines.push("---");
              lines.push("");
              lines.push("### 🥗 Meal Suggestions");
              lines.push("");
              const meal1 = toArray<string>(result.mealSuggestions.meal1);
              if (meal1.length) {
                lines.push("**Meal 1:**");
                for (const suggestion of meal1) {
                  lines.push(`- ${suggestion}`);
                }
                lines.push("");
              }
              const meal2 = toArray<string>(result.mealSuggestions.meal2);
              if (meal2.length) {
                lines.push("**Meal 2:**");
                for (const suggestion of meal2) {
                  lines.push(`- ${suggestion}`);
                }
                lines.push("");
              }
              const meal3 = toArray<string>(result.mealSuggestions.meal3);
              if (meal3.length) {
                lines.push("**Meal 3:**");
                for (const suggestion of meal3) {
                  lines.push(`- ${suggestion}`);
                }
                lines.push("");
              }
            }
            
            if (result.tips && result.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips for Success");
              lines.push("");
              for (const tip of toArray<string>(result.tips)) {
                lines.push(`- ${tip}`);
              }
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
              forEachItem<string>(result.coldPlunge.safety, (safety) => {
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
              forEachItem<string>(result.sauna.safety, (safety) => {
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
              const contrastSequence = Array.isArray(result.contrast.sequence)
                ? (result.contrast.sequence as Array<Record<string, any>>)
                : [];
              contrastSequence.forEach((step, idx) => {
                lines.push(`${idx + 1}. **${step.step}** - ${step.duration} at ${step.temperature}`);
              });
              lines.push("");
              lines.push(`**Frequency:** ${result.contrast.frequency}`);
              lines.push("");
              lines.push("**Benefits:**");
              forEachItem<string>(result.contrast.benefits, (benefit) => {
                lines.push(`- ${benefit}`);
              });
              lines.push("");
              lines.push("---");
              lines.push("");
            }
            
            if (result.timingRecommendations && result.timingRecommendations.length > 0) {
              lines.push("### ⏰ Timing Recommendations");
              lines.push("");
              forEachItem<string>(result.timingRecommendations, (rec) => {
                lines.push(`- ${rec}`);
              });
              lines.push("");
              lines.push("---");
              lines.push("");
            }
            
            if (result.tips && result.tips.length > 0) {
              lines.push("### 💡 Tips for Success");
              lines.push("");
              forEachItem<string>(result.tips, (tip) => {
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
              const breathingExercises = result.breathingExercises as Array<Record<string, any>>;
              breathingExercises.forEach((exercise, idx) => {
                lines.push(`#### ${idx + 1}. ${exercise.name}`);
                lines.push(exercise.description);
                lines.push("");
                lines.push("**Steps:**");
                forEachItem<string>(exercise.steps, (step) => {
                  lines.push(`- ${step}`);
                });
                lines.push("");
                lines.push(`**Duration:** ${exercise.duration}`);
                lines.push(`**Frequency:** ${exercise.frequency}`);
                lines.push("");
                lines.push("**Benefits:**");
                forEachItem<string>(exercise.benefits, (benefit) => {
                  lines.push(`- ${benefit}`);
                });
                lines.push("");
                lines.push(`**When to Use:** ${exercise.whenToUse}`);
                lines.push("");
                if (idx < breathingExercises.length - 1) {
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
              forEachItem<string>(result.meditation.technique, (step) => {
                lines.push(`- ${step}`);
              });
              lines.push("");
              lines.push("**Benefits:**");
              forEachItem<string>(result.meditation.benefits, (benefit) => {
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
              const hrvExercises = result.hrvProtocol.exercises as Array<Record<string, any>>;
              hrvExercises.forEach((exercise, idx) => {
                lines.push(`**${idx + 1}. ${exercise.name}** (${exercise.duration})`);
                forEachItem<string>(exercise.instructions, (instruction) => {
                  lines.push(`- ${instruction}`);
                });
                lines.push("");
              });
              lines.push("**Tracking:**");
              forEachItem<string>(result.hrvProtocol.tracking, (item) => {
                lines.push(`- ${item}`);
              });
              lines.push("");
              lines.push("**Goals:**");
              forEachItem<string>(result.hrvProtocol.goals, (goal) => {
                lines.push(`- ${goal}`);
              });
              lines.push("");
            }
            
            if (result.adaptogens && result.adaptogens.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💊 Adaptogen Recommendations");
              lines.push("");
              forEachItem<Record<string, any>>(result.adaptogens, (adaptogen, idx) => {
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
              forEachItem<string>(result.lifestyleRecommendations, (rec) => {
                lines.push(`- ${rec}`);
              });
              lines.push("");
            }
            
            if (result.dailyRoutine && result.dailyRoutine.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 📅 Suggested Daily Routine");
              lines.push("");
              forEachItem<string>(result.dailyRoutine, (item) => {
                lines.push(`- ${item}`);
              });
              lines.push("");
            }
            
            if (result.tips && result.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Tips for Success");
              lines.push("");
              forEachItem<string>(result.tips, (tip) => {
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
            forEachItem<Record<string, any>>(result.mealDistribution, (meal, idx) => {
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
              forEachItem<string>(result.tips, (tip) => {
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
              const recoveryProtocols = result.protocols as Array<Record<string, any>>;
              recoveryProtocols.forEach((protocol, idx) => {
                lines.push(`#### ${idx + 1}. ${protocol.name}`);
                lines.push(protocol.description);
                lines.push(`**Duration:** ${protocol.duration}`);
                lines.push("");
                forEachItem<Record<string, any>>(protocol.steps, (step) => {
                  lines.push(`**${step.time} - ${step.action}**`);
                  forEachItem<string>(step.details, (detail) => {
                    lines.push(`- ${detail}`);
                  });
                  lines.push("");
                });
                if (idx < recoveryProtocols.length - 1) {
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
              forEachItem<string>(result.sleepOptimization.recommendations, (rec) => {
                lines.push(`- ${rec}`);
              });
              lines.push("");
            }
            
            if (result.supplements && result.supplements.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💊 Recovery Supplements");
              lines.push("");
              forEachItem<Record<string, any>>(result.supplements, (supp, idx) => {
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
              const activities = result.activeRecovery.activities as Array<Record<string, any>>;
              activities.forEach((activity, idx) => {
                lines.push(`**${idx + 1}. ${activity.name}**`);
                lines.push(`- **Duration:** ${activity.duration}`);
                lines.push(`- **Intensity:** ${activity.intensity}`);
                lines.push("**Benefits:**");
                forEachItem<string>(activity.benefits, (benefit) => {
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
              forEachItem<string>(result.nutritionTiming, (rec) => {
                lines.push(`- ${rec}`);
              });
              lines.push("");
            }
            
            if (result.tips && result.tips.length > 0) {
              lines.push("---");
              lines.push("");
              lines.push("### 💡 Recovery Tips");
              lines.push("");
              forEachItem<string>(result.tips, (tip) => {
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
              await persistChatHistory({
                userId,
                sessionId: sessionIdForHistory,
                requestMessages: conversationMessages,
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

    const classificationOutcome = await classifyAndHandleTriage({
      latestUserMessage: userContent,
      userId,
      ip,
      sessionId: sessionIdForHistory,
    });
    aiUserId = classificationOutcome.aiUserId;
    const { classification, triageMessage } = classificationOutcome;

    if (triageMessage) {
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

    const pipeline = await prepareChatPipeline({
      userId,
      userMessage: userContent,
      classification,
      conversationMessages,
      domain,
    });
    const {
      ragContext: combinedRagContext,
      ragSources,
      userDbId,
      modelChoice,
      enhancedMessages,
      systemPrompt,
    } = pipeline;

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
            const nonSystemMessages = enhancedMessages.filter(
              (m): m is { role: "user" | "assistant"; content: string } =>
                m.role === "user" || m.role === "assistant"
            );
            await streamWithFallback({
              provider: "openai",
              system: systemPrompt,
              messages: nonSystemMessages,
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
            messagesInSession: conversationMessages.length,
            answerLength: finalAnswer.length,
            ragDocsCount: ragSources.length,
            ragSources: ragSources.length > 0 ? ragSources : undefined,
            success: true,
          }).catch(() => {}); // Don't block on analytics

          // Persist history
          await persistChatHistory({
            userId,
            sessionId: sessionIdForHistory,
            requestMessages: conversationMessages,
            assistantContent: finalAnswer,
            provider: modelChoice.mainModel,
          });

          const latency = Date.now() - startTime;
          logger.info("Chat API: Request completed", {
            userId,
            messageCount: conversationMessages.length,
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
