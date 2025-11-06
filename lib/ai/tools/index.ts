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

  return null;
}
