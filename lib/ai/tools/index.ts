import { z } from "zod";

export type ToolDef<I, O> = {
  name: string;
  description: string;
  input: z.ZodType<I>;
  handler: (args: I) => Promise<O>;
};

const registry: Record<string, ToolDef<any, any>> = {};

export function registerTool<I, O>(def: ToolDef<I, O>) {
  registry[def.name] = def;
  return def;
}

export function getTool(name: string) {
  return registry[name];
}

export function listTools() {
  return Object.values(registry);
}

/**
 * Simple detector to trigger tools without full function-calling.
 * Returns the tool name + parsed args if a known pattern is recognized.
 * (We can upgrade to real tool-calling later.)
 */
export function detectToolFromUserText(text: string): { name: string; args: unknown } | null {
  const t = text.toLowerCase();

  // mealPlanner triggers
  const mealTriggers = /(meal plan|mealplan|plan my meals|macros|calorie|calories|daily menu|nutrition plan)/i.test(t);
  const cals = /(\d{3,4})\s?kcal|\b(\d{3,4})\s?cal\b/i.exec(text);
  if (mealTriggers) {
    const calories = Number(cals?.[1] || cals?.[2] || 2000);
    // crude prefs/exclusions parse
    const pesc = /pesc(etarian)?/i.test(text) ? "pescatarian" : undefined;
    const vegan = /vegan/i.test(text) ? "vegan" : undefined;
    const keto = /keto/i.test(text) ? "keto" : undefined;
    const excludes: string[] = [];
    if (/no nuts|avoid nuts/i.test(text)) excludes.push("nuts");
    if (/no dairy|avoid dairy/i.test(text)) excludes.push("dairy");
    return {
      name: "mealPlanner",
      args: {
        calories,
        dietaryPrefs: [pesc, vegan, keto].filter(Boolean),
        exclusions: excludes,
      }
    };
  }

  // supplementRecommender triggers
  const supplementTriggers = /(supplement|supplements|supplement stack|stack|nootropic|nootropics|vitamin|vitamins|recommend.*supplement|what.*supplement|need.*supplement)/i.test(t);
  if (supplementTriggers) {
    const goals: string[] = [];
    if (/(sleep|insomnia|sleep quality|better sleep)/i.test(t)) goals.push("sleep");
    if (/(longevity|anti.?aging|age|live longer)/i.test(t)) goals.push("longevity");
    if (/(performance|athletic|workout|exercise|training|strength|endurance)/i.test(t)) goals.push("performance");
    if (/(recovery|muscle recovery|post.?workout)/i.test(t)) goals.push("recovery");
    if (/(stress|anxiety|cortisol|calm|relax)/i.test(t)) goals.push("stress");
    if (/(cognitive|brain|memory|focus|mental|nootropic)/i.test(t)) goals.push("cognitive");
    if (/(methylation|mthfr|b12|genetic)/i.test(t)) goals.push("methylation");
    
    // Default to general if no specific goals
    if (goals.length === 0) goals.push("general");

    const budget = /(low budget|cheap|affordable)/i.test(t) ? "low" :
                   /(high budget|expensive|premium)/i.test(t) ? "high" :
                   /(unlimited|no budget)/i.test(t) ? "unlimited" : "medium";

    const experience = /(beginner|new to|just starting|first time)/i.test(t) ? "beginner" :
                       /(advanced|expert|experienced)/i.test(t) ? "advanced" : "intermediate";

    return {
      name: "supplementRecommender",
      args: {
        goals,
        budget,
        experience,
        currentSupplements: [],
        avoidInteractions: [],
      }
    };
  }

  // sleepOptimizer triggers
  const sleepTriggers = /(sleep|sleep.*optim|sleep.*protocol|circadian|insomnia|sleep.*schedule|sleep.*routine|better.*sleep|improve.*sleep|sleep.*quality|trouble.*sleep|can't.*sleep)/i.test(t);
  if (sleepTriggers && !/(protocol|plan|program|routine|schedule).*(for|to|optimize)/i.test(t)) {
    // Only trigger if it's specifically about sleep optimization, not protocol building
    const sleepIssues: string[] = [];
    if (/(falling.*asleep|can't.*fall.*asleep|trouble.*falling)/i.test(t)) sleepIssues.push("falling_asleep");
    if (/(staying.*asleep|wake.*up|can't.*stay)/i.test(t)) sleepIssues.push("staying_asleep");
    if (/(waking.*early|wake.*too.*early)/i.test(t)) sleepIssues.push("waking_early");
    if (/(poor.*quality|restless|unrefreshed)/i.test(t)) sleepIssues.push("poor_quality");
    if (/(fatigue|tired|exhausted)/i.test(t)) sleepIssues.push("fatigue");

    const goals: string[] = [];
    if (/(better.*sleep|improve.*sleep|sleep.*quality)/i.test(t)) goals.push("better_sleep");
    if (/(energy|energetic)/i.test(t)) goals.push("energy");
    if (/(performance|athletic)/i.test(t)) goals.push("performance");
    if (/(recovery)/i.test(t)) goals.push("recovery");

    return {
      name: "sleepOptimizer",
      args: {
        currentSleepSchedule: {
          sleepIssues: sleepIssues.length > 0 ? sleepIssues : undefined,
        },
        goals: goals.length > 0 ? goals : ["better_sleep"],
      }
    };
  }

  // protocolBuilder triggers (comprehensive protocol generation)
  const protocolTriggers = /(protocol|plan|program|routine|schedule).*(for|to|optimize|achieve|longevity|performance|weight|muscle|energy|stress|cognitive)/i.test(t) ||
                          /(create|build|generate|make).*(protocol|plan|program|routine|schedule)/i.test(t) ||
                          /(biohack|optimize).*(protocol|plan|program)/i.test(t);
  
  if (protocolTriggers) {
    const goals: string[] = [];
    if (/(longevity|live.*longer|anti.?aging)/i.test(t)) goals.push("longevity");
    if (/(performance|athletic|workout|training)/i.test(t)) goals.push("performance");
    if (/(weight.*loss|lose.*weight|fat.*loss)/i.test(t)) goals.push("weight_loss");
    if (/(muscle.*gain|build.*muscle|gain.*muscle)/i.test(t)) goals.push("muscle_gain");
    if (/(energy|energetic|energy.*levels)/i.test(t)) goals.push("energy");
    if (/(sleep|sleep.*quality|better.*sleep)/i.test(t)) goals.push("sleep");
    if (/(stress|stress.*reduction|anxiety|cortisol)/i.test(t)) goals.push("stress_reduction");
    if (/(cognitive|brain|memory|focus|mental)/i.test(t)) goals.push("cognitive_enhancement");
    if (/(recovery|recover)/i.test(t)) goals.push("recovery");
    if (/(hormone|hormonal|testosterone|estrogen)/i.test(t)) goals.push("hormonal_optimization");

    // Default goals if none detected
    if (goals.length === 0) {
      goals.push("energy", "sleep");
    }

    // Duration
    const duration = /(1.*week|one.*week)/i.test(t) ? "1_week" :
                     /(2.*week|two.*week)/i.test(t) ? "2_weeks" :
                     /(8.*week|eight.*week)/i.test(t) ? "8_weeks" :
                     /(12.*week|three.*month|3.*month)/i.test(t) ? "12_weeks" : "4_weeks";

    // Preferences
    const fasting = /(fast|fasting|intermittent.*fast|if)/i.test(t);
    const vegan = /(vegan|plant.*based)/i.test(t);
    const budget = /(low.*budget|cheap|affordable)/i.test(t) ? "low" :
                   /(high.*budget|premium|expensive)/i.test(t) ? "high" : "medium";
    const experience = /(beginner|new|just.*starting)/i.test(t) ? "beginner" :
                       /(advanced|expert|experienced)/i.test(t) ? "advanced" : "intermediate";
    const timeAvailable = /(minimal|little.*time|busy)/i.test(t) ? "minimal" :
                          /(extensive|lots.*time|plenty.*time)/i.test(t) ? "extensive" : "moderate";

    return {
      name: "protocolBuilder",
      args: {
        goals,
        duration,
        preferences: {
          fasting,
          vegan,
          budget,
          experience,
          timeAvailable,
        },
      }
    };
  }

  return null;
}
