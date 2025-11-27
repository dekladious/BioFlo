/**
 * Tool Response Formatters
 * 
 * Centralized formatters for AI tool responses.
 * Reduces code duplication from 980+ lines to ~200 lines.
 * 
 * @module lib/ai/tools/formatters
 */

// ============================================
// Types
// ============================================

type ToolResult = Record<string, unknown>;

type FormatterFn = (result: ToolResult) => string[];

// ============================================
// Helper Functions
// ============================================

/**
 * Safely convert unknown value to array
 */
export function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Safely iterate over array-like values
 */
export function forEachItem<T>(
  value: unknown, 
  handler: (item: T, index: number) => void
): void {
  if (Array.isArray(value)) {
    (value as T[]).forEach(handler);
  }
}

/**
 * Format a section header with emoji
 */
function section(emoji: string, title: string, level = 2): string {
  const prefix = "#".repeat(level);
  return `${prefix} ${emoji} ${title}`;
}

/**
 * Format a list of items with bullets
 */
function bulletList(items: unknown[], prefix = "-"): string[] {
  return toArray<string>(items).map(item => `${prefix} ${item}`);
}

/**
 * Format key-value pairs
 */
function kvPair(key: string, value: unknown): string {
  return `**${key}:** ${value}`;
}

// ============================================
// Shared Formatters
// ============================================

/**
 * Format supplement list (used by multiple tools)
 */
function formatSupplements(supplements: unknown[]): string[] {
  const lines: string[] = [];
  forEachItem<Record<string, unknown>>(supplements, (supp, idx) => {
    lines.push(`**${idx + 1}. ${supp.name}**`);
    if (supp.dosage) lines.push(`- **Dosage:** ${supp.dosage}`);
    if (supp.timing) lines.push(`- **Timing:** ${supp.timing}`);
    if (supp.purpose) lines.push(`- **Purpose:** ${supp.purpose}`);
    if (supp.notes) lines.push(`- **Notes:** ${supp.notes}`);
    lines.push("");
  });
  return lines;
}

/**
 * Format tips section
 */
function formatTips(tips: unknown[]): string[] {
  if (!toArray(tips).length) return [];
  return [
    "---",
    "",
    section("💡", "Tips for Success", 3),
    "",
    ...bulletList(tips),
    "",
  ];
}

/**
 * Format warnings section
 */
function formatWarnings(warnings: unknown[]): string[] {
  if (!toArray(warnings).length) return [];
  return [
    "---",
    "",
    section("⚠️", "Important Warnings", 3),
    "",
    ...bulletList(warnings),
    "",
  ];
}

// ============================================
// Tool-Specific Formatters
// ============================================

const formatMealPlan: FormatterFn = (result) => {
  const lines: string[] = [];
  
  lines.push(section("📋", `Daily Meal Plan (${result.calories} kcal)`));
  lines.push("");
  lines.push(`**Macros:** Protein ${result.macros?.protein || 0}g · Carbs ${result.macros?.carbs || 0}g · Fat ${result.macros?.fat || 0}g`);
  lines.push("");
  lines.push("---");
  lines.push("");
  
  forEachItem<Record<string, unknown>>(result.plan, (meal) => {
    lines.push(`### ${meal.name}${meal.timing ? ` (${meal.timing})` : ""}`);
    lines.push(`**${meal.kcal} kcal** | Protein: ${meal.protein}g | Carbs: ${meal.carbs}g | Fat: ${meal.fat}g`);
    lines.push("");
    lines.push(...bulletList(meal.items));
    lines.push("");
  });
  
  // Fasting recommendations
  if (result.fastingRecommendations) {
    const fr = result.fastingRecommendations as Record<string, unknown>;
    lines.push("---", "", section("🕐", "Fasting Window Recommendation", 3), "");
    lines.push(kvPair("Suggested Protocol", fr.suggestedProtocol));
    lines.push(kvPair("Eating Window", fr.eatingWindow));
    lines.push(kvPair("Fasting Window", fr.fastingWindow));
    lines.push("", "**Benefits:**", ...bulletList(fr.benefits), "");
    if (fr.notes) lines.push(`*${fr.notes}*`, "");
  }
  
  // Electrolytes
  if (result.electrolyteRecommendations) {
    const er = result.electrolyteRecommendations as Record<string, unknown>;
    lines.push("---", "", section("🧂", "Electrolyte Recommendations", 3), "");
    lines.push(kvPair("Sodium", er.sodium));
    lines.push(kvPair("Potassium", er.potassium));
    lines.push(kvPair("Magnesium", er.magnesium));
    if (er.notes) lines.push("", `*${er.notes}*`);
    lines.push("");
  }
  
  lines.push(...formatTips(result.tips as unknown[]));
  
  return lines;
};

const formatSupplementRecommender: FormatterFn = (result) => {
  const lines: string[] = [];
  
  lines.push(section("💊", "Supplement Recommendations"));
  lines.push("");
  lines.push(result.recommendations as string || `Based on your goals: **${toArray(result.goals).join(", ")}**`);
  lines.push("");
  lines.push(`**Experience Level:** ${result.experience} | **Budget:** ${result.budget}`);
  if (result.stack?.totalCost) lines.push(`**Estimated Cost:** ${result.stack.totalCost}`);
  lines.push("", "---", "", "### Recommended Supplements", "");
  
  lines.push(...formatSupplements(result.stack?.supplements as unknown[]));
  
  // Timing schedule
  const schedule = result.stack?.timingSchedule;
  if (toArray(schedule).length) {
    lines.push("---", "", section("⏰", "Timing Schedule", 3), "");
    forEachItem<Record<string, unknown>>(schedule, (slot) => {
      lines.push(`**${slot.time}**`);
      lines.push(...bulletList(slot.supplements));
      if (slot.notes) lines.push(`  *${slot.notes}*`);
      lines.push("");
    });
  }
  
  // Interactions
  if (toArray(result.stack?.interactions).length) {
    lines.push("---", "", section("⚠️", "Interactions to Consider", 3), "");
    lines.push(...bulletList(result.stack?.interactions), "");
  }
  
  // Precautions
  if (toArray(result.stack?.precautions).length) {
    lines.push("---", "", section("⚠️", "Precautions", 3), "");
    lines.push(...bulletList(result.stack?.precautions), "");
  }
  
  return lines;
};

const formatSleepOptimizer: FormatterFn = (result) => {
  const lines: string[] = [];
  
  lines.push(section("😴", "Sleep Optimization Protocol"));
  lines.push("");
  
  // Schedule
  if (result.schedule) {
    const s = result.schedule as Record<string, unknown>;
    lines.push("### 📅 Sleep Schedule", "");
    if (s.current) {
      const c = s.current as Record<string, unknown>;
      lines.push(`**Current:** Bedtime ${c.bedtime || "N/A"}, Wake ${c.wakeTime || "N/A"}`);
    }
    if (s.optimal) {
      const o = s.optimal as Record<string, unknown>;
      lines.push(`**Optimal:** Bedtime ${o.bedtime}, Wake ${o.wakeTime}`);
      lines.push(`**Target Sleep:** ${o.totalHours} hours`);
    }
    lines.push("", "---", "");
  }
  
  // Protocols
  const protocols = result.recommendation?.protocols;
  if (toArray(protocols).length) {
    forEachItem<Record<string, unknown>>(protocols, (protocol, idx) => {
      lines.push(`### ${idx + 1}. ${protocol.name}`);
      lines.push(protocol.description as string);
      lines.push("");
      forEachItem<Record<string, unknown>>(protocol.steps, (step) => {
        lines.push(`**${step.time}**`);
        lines.push(`- ${step.action}${step.duration ? ` (${step.duration})` : ""}`);
        if (step.notes) lines.push(`  *${step.notes}*`);
        lines.push("");
      });
      if (idx < toArray(protocols).length - 1) lines.push("---", "");
    });
  }
  
  // Light exposure
  if (result.recommendation?.lightExposure) {
    const le = result.recommendation.lightExposure as Record<string, unknown>;
    lines.push("---", "", section("☀️", "Light Exposure Protocol", 3), "");
    lines.push(kvPair("Morning", le.morning));
    lines.push(kvPair("Evening", le.evening));
    lines.push(kvPair("Blue Light", le.blueLight));
    lines.push("");
  }
  
  // Temperature
  if (result.recommendation?.temperature) {
    const t = result.recommendation.temperature as Record<string, unknown>;
    lines.push("---", "", section("🌡️", "Temperature Optimization", 3), "");
    lines.push(kvPair("Room Temperature", t.roomTemp));
    lines.push(kvPair("Body Preparation", t.bodyPrep));
    lines.push("");
  }
  
  // Supplements
  if (toArray(result.recommendation?.supplements).length) {
    lines.push("---", "", section("💊", "Sleep Supplements (Optional)", 3), "");
    lines.push(...formatSupplements(result.recommendation?.supplements as unknown[]));
  }
  
  // Environment
  const env = result.recommendation?.environment;
  if (toArray(env).length) {
    lines.push("---", "", section("🏠", "Sleep Environment", 3), "");
    forEachItem<Record<string, unknown>>(env, (item) => {
      lines.push(`**${item.category}**`);
      lines.push(...bulletList(item.recommendations));
      lines.push("");
    });
  }
  
  lines.push(...formatTips(result.recommendation?.tips as unknown[]));
  
  return lines;
};

const formatFastingPlanner: FormatterFn = (result) => {
  const lines: string[] = [];
  const p = result.protocol as Record<string, unknown>;
  
  lines.push(section("🕐", `Fasting Protocol: ${p.name}`));
  lines.push("");
  lines.push(p.description as string);
  lines.push("");
  lines.push(kvPair("Fasting Window", p.fastingWindow));
  lines.push(kvPair("Eating Window", p.eatingWindow));
  lines.push("", "---", "", "### 📅 Schedule", "");
  
  const sched = p.schedule as Record<string, unknown>;
  lines.push(`**Fasting Period:** ${sched.fastingStart} - ${sched.fastingEnd}`);
  lines.push(`**Eating Period:** ${sched.eatingStart} - ${sched.eatingEnd}`);
  lines.push("");
  
  if (p.progression) {
    const prog = p.progression as Record<string, unknown>;
    lines.push("---", "", "### 📈 4-Week Progression Plan", "");
    lines.push(`**Week 1:** ${prog.week1}`);
    lines.push(`**Week 2:** ${prog.week2}`);
    lines.push(`**Week 3:** ${prog.week3}`);
    lines.push(`**Week 4:** ${prog.week4}`);
    lines.push("");
  }
  
  const e = result.electrolytes as Record<string, unknown>;
  lines.push("---", "", section("🧂", "Electrolyte Recommendations", 3), "");
  lines.push(kvPair("Sodium", e.sodium));
  lines.push(kvPair("Potassium", e.potassium));
  lines.push(kvPair("Magnesium", e.magnesium));
  if (e.notes) lines.push("", `*${e.notes}*`);
  lines.push("");
  
  const bf = result.breakingFast as Record<string, unknown>;
  lines.push("---", "", section("🍽️", "Breaking Your Fast", 3), "");
  lines.push(`**${bf.firstMeal}**`);
  lines.push(kvPair("Timing", bf.timing));
  lines.push("", "**Recommended Foods:**", ...bulletList(bf.foods), "");
  lines.push("**Avoid:**", ...bulletList(bf.avoid), "");
  lines.push(`*${bf.notes}*`, "");
  
  lines.push(...formatTips(result.tips as unknown[]));
  
  return lines;
};

const formatColdHotTherapy: FormatterFn = (result) => {
  const lines: string[] = [];
  
  lines.push(section("🧊❄️", "Cold & Heat Therapy Protocol"));
  lines.push("");
  
  if (result.coldPlunge) {
    const cp = result.coldPlunge as Record<string, unknown>;
    lines.push("### 🧊 Cold Exposure Protocol", "");
    lines.push(`**${cp.name}**`);
    lines.push(cp.description as string);
    lines.push("");
    lines.push(kvPair("Temperature", cp.temperature));
    lines.push(kvPair("Duration", cp.duration));
    lines.push(kvPair("Frequency", cp.frequency));
    lines.push("");
    
    const prog = cp.progression as Record<string, unknown>;
    lines.push("**4-Week Progression:**");
    lines.push(`- Week 1: ${prog.week1}`);
    lines.push(`- Week 2: ${prog.week2}`);
    lines.push(`- Week 3: ${prog.week3}`);
    lines.push(`- Week 4: ${prog.week4}`);
    lines.push("");
    lines.push("**Safety Guidelines:**", ...bulletList(cp.safety), "");
    lines.push("---", "");
  }
  
  if (result.sauna) {
    const s = result.sauna as Record<string, unknown>;
    lines.push("### 🔥 Sauna Protocol", "");
    lines.push(`**${s.name}**`);
    lines.push(s.description as string);
    lines.push("");
    lines.push(kvPair("Temperature", s.temperature));
    lines.push(kvPair("Duration", s.duration));
    lines.push(kvPair("Frequency", s.frequency));
    lines.push(kvPair("Hydration", s.hydration));
    lines.push("");
    lines.push("**Safety Guidelines:**", ...bulletList(s.safety), "");
    lines.push("---", "");
  }
  
  if (result.contrast) {
    const c = result.contrast as Record<string, unknown>;
    lines.push("### 🔄 Contrast Therapy Protocol", "");
    lines.push(`**${c.name}**`);
    lines.push(c.description as string);
    lines.push("", "**Sequence:**");
    forEachItem<Record<string, unknown>>(c.sequence, (step, idx) => {
      lines.push(`${idx + 1}. **${step.step}** - ${step.duration} at ${step.temperature}`);
    });
    lines.push("");
    lines.push(kvPair("Frequency", c.frequency));
    lines.push("", "**Benefits:**", ...bulletList(c.benefits), "");
    lines.push("---", "");
  }
  
  if (toArray(result.timingRecommendations).length) {
    lines.push(section("⏰", "Timing Recommendations", 3), "");
    lines.push(...bulletList(result.timingRecommendations), "");
    lines.push("---", "");
  }
  
  lines.push(...formatTips(result.tips as unknown[]));
  
  return lines;
};

const formatStressManagement: FormatterFn = (result) => {
  const lines: string[] = [];
  
  lines.push(section("🧘", "Stress Management Protocol"));
  lines.push("");
  
  // Breathing exercises
  const breathing = result.breathingExercises;
  if (toArray(breathing).length) {
    lines.push(section("🌬️", "Breathing Exercises", 3), "");
    forEachItem<Record<string, unknown>>(breathing, (ex, idx) => {
      lines.push(`#### ${idx + 1}. ${ex.name}`);
      lines.push(ex.description as string, "");
      lines.push("**Steps:**", ...bulletList(ex.steps), "");
      lines.push(kvPair("Duration", ex.duration));
      lines.push(kvPair("Frequency", ex.frequency));
      lines.push("", "**Benefits:**", ...bulletList(ex.benefits), "");
      lines.push(kvPair("When to Use", ex.whenToUse));
      lines.push("");
      if (idx < toArray(breathing).length - 1) lines.push("---", "");
    });
  }
  
  // Meditation
  if (result.meditation) {
    const m = result.meditation as Record<string, unknown>;
    lines.push("---", "", section("🧘", "Meditation Protocol", 3), "");
    lines.push(`**${m.name}**`);
    lines.push(m.description as string);
    lines.push("");
    lines.push(kvPair("Duration", m.duration));
    lines.push(kvPair("Frequency", m.frequency));
    lines.push("", "**Technique:**", ...bulletList(m.technique), "");
    lines.push("**Benefits:**", ...bulletList(m.benefits), "");
  }
  
  // HRV Protocol
  if (result.hrvProtocol) {
    const h = result.hrvProtocol as Record<string, unknown>;
    lines.push("---", "", section("📊", "HRV Optimization Protocol", 3), "");
    lines.push(`**${h.name}**`);
    lines.push(h.description as string);
    lines.push("", "**Exercises:**");
    forEachItem<Record<string, unknown>>(h.exercises, (ex, idx) => {
      lines.push(`**${idx + 1}. ${ex.name}** (${ex.duration})`);
      lines.push(...bulletList(ex.instructions));
      lines.push("");
    });
    lines.push("**Tracking:**", ...bulletList(h.tracking), "");
    lines.push("**Goals:**", ...bulletList(h.goals), "");
  }
  
  // Adaptogens
  if (toArray(result.adaptogens).length) {
    lines.push("---", "", section("💊", "Adaptogen Recommendations", 3), "");
    lines.push(...formatSupplements(result.adaptogens as unknown[]));
  }
  
  // Lifestyle
  if (toArray(result.lifestyleRecommendations).length) {
    lines.push("---", "", section("💚", "Lifestyle Recommendations", 3), "");
    lines.push(...bulletList(result.lifestyleRecommendations), "");
  }
  
  // Daily routine
  if (toArray(result.dailyRoutine).length) {
    lines.push("---", "", section("📅", "Suggested Daily Routine", 3), "");
    lines.push(...bulletList(result.dailyRoutine), "");
  }
  
  lines.push(...formatTips(result.tips as unknown[]));
  
  return lines;
};

const formatMacroCalculator: FormatterFn = (result) => {
  const lines: string[] = [];
  
  lines.push(section("📊", "Macro Calculator Results"));
  lines.push("");
  lines.push(kvPair("Goal", String(result.goal).replace(/_/g, " ")));
  lines.push(kvPair("Activity Level", String(result.activityLevel).replace(/_/g, " ")));
  lines.push(kvPair("Dietary Preference", String(result.dietaryPreference).replace(/_/g, " ")));
  lines.push("", "---", "", section("🔥", "Daily Calorie Targets", 3), "");
  lines.push(kvPair("BMR", `${result.bmr} calories/day`));
  lines.push(kvPair("TDEE", `${result.tdee} calories/day`));
  lines.push(kvPair("Target Calories", `${result.targetCalories} calories/day`));
  
  if (result.deficitOrSurplus !== 0) {
    const sign = (result.deficitOrSurplus as number) > 0 ? "+" : "";
    const label = (result.deficitOrSurplus as number) > 0 ? "Surplus" : "Deficit";
    lines.push(kvPair(label, `${sign}${result.deficitOrSurplus} calories/day`));
  }
  
  const m = result.macros as Record<string, unknown>;
  const mp = result.macroPercentages as Record<string, unknown>;
  lines.push("", "---", "", section("🥩", "Daily Macronutrient Targets", 3), "");
  lines.push(kvPair("Protein", `${m.protein}g (${mp.protein}%)`));
  lines.push(kvPair("Carbohydrates", `${m.carbs}g (${mp.carbs}%)`));
  lines.push(kvPair("Fat", `${m.fat}g (${mp.fat}%)`));
  lines.push(kvPair("Total Calories", `${m.calories} kcal`));
  
  lines.push("", "---", "", section("🍽️", "Meal Distribution", 3), "");
  forEachItem<Record<string, unknown>>(result.mealDistribution, (meal) => {
    lines.push(`**${meal.meal}**${meal.timing ? ` (${meal.timing})` : ""}`);
    lines.push(`- Calories: ${meal.calories} kcal`);
    lines.push(`- Protein: ${meal.protein}g`);
    lines.push(`- Carbs: ${meal.carbs}g`);
    lines.push(`- Fat: ${meal.fat}g`);
    lines.push("");
  });
  
  lines.push(...formatTips(result.tips as unknown[]));
  
  return lines;
};

const formatRecoveryOptimizer: FormatterFn = (result) => {
  const lines: string[] = [];
  
  lines.push(section("💪", "Recovery Optimization Protocol"));
  lines.push("");
  lines.push(kvPair("Workout Type", String(result.workoutType).replace(/_/g, " ")));
  lines.push(kvPair("Intensity", String(result.intensity).replace(/_/g, " ")));
  lines.push(kvPair("Recovery Time", String(result.recoveryTime).replace(/_/g, " ")));
  lines.push("", "---", "");
  
  // Recovery protocols
  if (toArray(result.protocols).length) {
    lines.push(section("📋", "Recovery Protocols", 3), "");
    forEachItem<Record<string, unknown>>(result.protocols, (p, idx) => {
      lines.push(`#### ${idx + 1}. ${p.name}`);
      lines.push(p.description as string);
      lines.push(kvPair("Duration", p.duration));
      lines.push("");
      forEachItem<Record<string, unknown>>(p.steps, (step) => {
        lines.push(`**${step.time} - ${step.action}**`);
        lines.push(...bulletList(step.details));
        lines.push("");
      });
      if (idx < toArray(result.protocols).length - 1) lines.push("---", "");
    });
  }
  
  // Sleep optimization
  if (result.sleepOptimization) {
    const s = result.sleepOptimization as Record<string, unknown>;
    lines.push("---", "", section("😴", "Sleep Optimization for Recovery", 3), "");
    lines.push(kvPair("Target Duration", s.duration));
    lines.push(kvPair("Timing", s.timing));
    lines.push("", "**Recommendations:**", ...bulletList(s.recommendations), "");
  }
  
  // Supplements
  if (toArray(result.supplements).length) {
    lines.push("---", "", section("💊", "Recovery Supplements", 3), "");
    lines.push(...formatSupplements(result.supplements as unknown[]));
  }
  
  // Active recovery
  if (result.activeRecovery?.activities?.length) {
    lines.push("---", "", section("🚶", "Active Recovery Activities", 3), "");
    forEachItem<Record<string, unknown>>(result.activeRecovery.activities, (a, idx) => {
      lines.push(`**${idx + 1}. ${a.name}**`);
      lines.push(`- **Duration:** ${a.duration}`);
      lines.push(`- **Intensity:** ${a.intensity}`);
      lines.push("**Benefits:**", ...bulletList(a.benefits));
      lines.push("");
    });
  }
  
  // Nutrition timing
  if (toArray(result.nutritionTiming).length) {
    lines.push("---", "", section("🍽️", "Nutrition Timing Recommendations", 3), "");
    lines.push(...bulletList(result.nutritionTiming), "");
  }
  
  lines.push(...formatTips(result.tips as unknown[]));
  
  return lines;
};

// Placeholder formatters for other tools
const formatProtocolBuilder: FormatterFn = (result) => {
  const lines: string[] = [];
  const p = result.protocol as Record<string, unknown>;
  
  lines.push(section("🎯", p?.title as string || "Personalized Biohacking Protocol"));
  lines.push("");
  lines.push(p?.description as string || result.summary as string || "");
  lines.push("");
  lines.push(kvPair("Duration", p?.duration || "4 weeks"));
  lines.push(kvPair("Goals", toArray(p?.goals).join(", ") || "Optimization"));
  lines.push("", "---", "");
  
  // Simplified - full implementation would follow same pattern
  return lines;
};

const formatWomensHealth: FormatterFn = (result) => {
  const lines: string[] = [];
  const p = result.protocol as Record<string, unknown>;
  
  lines.push(section("🌸", p?.title as string || "Women's Health Protocol"));
  lines.push("");
  lines.push(p?.description as string || result.summary as string || "");
  if (p?.cyclePhase) {
    lines.push(kvPair("Current Cycle Phase", String(p.cyclePhase)));
  }
  lines.push("", "---", "");
  
  // Simplified - full implementation would follow same pattern
  return lines;
};

const formatExperiments: FormatterFn = (result) => {
  const lines: string[] = [];
  lines.push(section("🧪", "Experiment Design"));
  lines.push("");
  lines.push(JSON.stringify(result, null, 2));
  return lines;
};

// ============================================
// Formatter Registry
// ============================================

/**
 * Registry of tool formatters
 */
export const TOOL_FORMATTERS: Record<string, FormatterFn> = {
  mealPlanner: formatMealPlan,
  supplementRecommender: formatSupplementRecommender,
  sleepOptimizer: formatSleepOptimizer,
  fastingPlanner: formatFastingPlanner,
  coldHotTherapy: formatColdHotTherapy,
  stressManagement: formatStressManagement,
  macroCalculator: formatMacroCalculator,
  recoveryOptimizer: formatRecoveryOptimizer,
  protocolBuilder: formatProtocolBuilder,
  womensHealth: formatWomensHealth,
  experiments: formatExperiments,
};

/**
 * Format tool result using appropriate formatter
 * 
 * @param toolName - Name of the tool
 * @param result - Tool execution result
 * @returns Formatted markdown string
 */
export function formatToolResult(toolName: string, result: ToolResult): string {
  const formatter = TOOL_FORMATTERS[toolName];
  
  if (!formatter) {
    // Fallback for unknown tools
    return JSON.stringify(result, null, 2);
  }
  
  const lines = formatter(result);
  
  // Add standard footer
  lines.push("---", "");
  lines.push("_Educational only. Not medical advice. Consult your healthcare provider before starting new supplements._");
  
  return lines.join("\n");
}

/**
 * Check if a tool has a registered formatter
 */
export function hasFormatter(toolName: string): boolean {
  return toolName in TOOL_FORMATTERS;
}

