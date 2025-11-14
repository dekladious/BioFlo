import { z } from "zod";
import { registerTool } from "./index";

type ColdPlungeProtocol = {
  name: string;
  description: string;
  temperature: string;
  duration: string;
  frequency: string;
  progression: {
    week1: string;
    week2: string;
    week3: string;
    week4: string;
  };
  safety: string[];
};

type SaunaProtocol = {
  name: string;
  description: string;
  temperature: string;
  duration: string;
  frequency: string;
  hydration: string;
  safety: string[];
};

type ContrastProtocol = {
  name: string;
  description: string;
  sequence: Array<{
    step: string;
    duration: string;
    temperature: string;
  }>;
  frequency: string;
  benefits: string[];
};

export const coldHotTherapy = registerTool({
  name: "coldHotTherapy",
  description: "Create personalized cold plunge and sauna protocols based on Huberman's research and best practices. Includes contrast therapy protocols for optimal recovery.",
  input: z.object({
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
    goals: z.array(z.enum(["recovery", "mood", "metabolism", "performance", "stress_reduction", "immune_support"])).default(["recovery"]),
    access: z.object({
      coldPlunge: z.boolean().default(false),
      sauna: z.boolean().default(false),
      coldShower: z.boolean().default(true),
      contrast: z.boolean().default(true),
    }).default({}),
    scheduleConstraints: z.object({
      daysPerWeek: z.number().min(1).max(7).optional(),
      preferredTime: z.enum(["morning", "afternoon", "evening", "post_workout"]).optional(),
    }).optional(),
  }),
  async handler({ experienceLevel, goals, access, scheduleConstraints }) {
    const daysPerWeek = scheduleConstraints?.daysPerWeek || 3;
    const preferredTime = scheduleConstraints?.preferredTime || "morning";

    // Cold Plunge Protocol (Huberman: 11 minutes per week)
    let coldPlunge: ColdPlungeProtocol | null = null;
    
    if (access.coldPlunge || access.coldShower) {
      if (experienceLevel === "beginner") {
        coldPlunge = {
          name: "Beginner Cold Exposure Protocol",
          description: "Start with cold showers and progress to cold plunges. Based on Huberman's research: 11 minutes per week total cold exposure provides maximum benefits.",
          temperature: "50-60°F (10-15°C) - Start warmer, gradually decrease",
          duration: "1-2 minutes per session",
          frequency: `${daysPerWeek} sessions per week (aim for 11 minutes total per week)`,
          progression: {
            week1: "Cold shower: 30 seconds cold at end of shower, 3x per week",
            week2: "Cold shower: 1 minute cold, 3-4x per week",
            week3: "Cold plunge/shower: 2 minutes at 55-60°F, 3-4x per week",
            week4: "Cold plunge: 2-3 minutes at 50-55°F, 3-4x per week (total 11 min/week)",
          },
          safety: [
            "Never force yourself - start gradually",
            "Breathe deeply and stay calm",
            "Exit immediately if you feel dizzy or nauseous",
            "Warm up gradually after (don't jump into hot water)",
            "Avoid if you have cardiovascular issues without medical clearance",
          ],
        };
      } else if (experienceLevel === "intermediate") {
        coldPlunge = {
          name: "Intermediate Cold Plunge Protocol",
          description: "Optimize cold exposure for recovery and performance. Target 11 minutes per week total exposure time.",
          temperature: "45-50°F (7-10°C)",
          duration: "3-5 minutes per session",
          frequency: `${daysPerWeek} sessions per week (aim for 11 minutes total per week)`,
          progression: {
            week1: "3 minutes at 50°F, 3x per week (9 minutes total)",
            week2: "3-4 minutes at 48°F, 3x per week (10-12 minutes total)",
            week3: "4 minutes at 45-48°F, 3x per week (12 minutes total)",
            week4: "3-4 minutes at 45°F, 3-4x per week (11 minutes total) - optimal",
          },
          safety: [
            "Monitor your response - adjust if needed",
            "Focus on controlled breathing",
            "Warm up naturally after (light movement, warm clothing)",
            "Stay hydrated",
          ],
        };
      } else {
        coldPlunge = {
          name: "Advanced Cold Plunge Protocol",
          description: "Maximum cold exposure benefits. Experienced practitioners can handle longer durations and colder temperatures.",
          temperature: "40-45°F (4-7°C)",
          duration: "5-11 minutes per session",
          frequency: `${daysPerWeek} sessions per week (aim for 11 minutes total per week)`,
          progression: {
            week1: "5 minutes at 45°F, 2-3x per week",
            week2: "5-7 minutes at 42-45°F, 2-3x per week",
            week3: "7-10 minutes at 40-45°F, 2x per week",
            week4: "10-11 minutes at 40-45°F, 1-2x per week (optimal for maximum benefits)",
          },
          safety: [
            "Only for experienced practitioners",
            "Always have someone nearby or within shouting distance",
            "Listen to your body - don't push beyond safe limits",
            "Warm up gradually and naturally",
            "Monitor for signs of hypothermia",
          ],
        };
      }
    }

    // Sauna Protocol
    let sauna: SaunaProtocol | null = null;
    
    if (access.sauna) {
      sauna = {
        name: "Sauna Protocol",
        description: "Heat exposure for recovery, cardiovascular health, and stress reduction. Optimal protocol: 15-20 minutes at 80-100°C (176-212°F), 2-4x per week.",
        temperature: "80-100°C (176-212°F)",
        duration: "15-20 minutes per session",
        frequency: `${daysPerWeek} sessions per week`,
        hydration: "Drink 500ml-1L of water before and after. Add electrolytes if doing extended sessions.",
        safety: [
          "Start with shorter sessions (10 minutes) and build up",
          "Exit immediately if you feel dizzy, nauseous, or unwell",
          "Stay hydrated - bring water into sauna if allowed",
          "Cool down gradually after (lukewarm shower, not cold immediately)",
          "Avoid alcohol before or after sauna",
          "Don't use sauna if pregnant, have cardiovascular issues, or are on certain medications",
        ],
      };
    }

    // Contrast Therapy Protocol
    let contrast: ContrastProtocol | null = null;
    
    if (access.contrast && (access.coldPlunge || access.coldShower) && access.sauna) {
      contrast = {
        name: "Contrast Therapy Protocol",
        description: "Alternating hot and cold exposure for enhanced recovery, circulation, and adaptation. Excellent for post-workout recovery.",
        sequence: [
          { step: "Hot (Sauna)", duration: "10-15 minutes", temperature: "80-90°C" },
          { step: "Cold (Plunge/Shower)", duration: "2-3 minutes", temperature: "10-15°C" },
          { step: "Hot (Sauna)", duration: "5-10 minutes", temperature: "80-90°C" },
          { step: "Cold (Plunge/Shower)", duration: "2-3 minutes", temperature: "10-15°C" },
          { step: "Warm Down", duration: "5 minutes", temperature: "Lukewarm shower" },
        ],
        frequency: `${daysPerWeek} sessions per week (ideal post-workout)`,
        benefits: [
          "Enhanced recovery and reduced muscle soreness",
          "Improved circulation and cardiovascular adaptation",
          "Increased dopamine and mood enhancement",
          "Better sleep quality",
          "Immune system support",
        ],
      };
    } else if (access.contrast && (access.coldPlunge || access.coldShower)) {
      // Contrast with cold shower only
      contrast = {
        name: "Contrast Shower Protocol",
        description: "Alternating hot and cold showers for recovery and adaptation. Accessible protocol using only your shower.",
        sequence: [
          { step: "Hot Shower", duration: "3-5 minutes", temperature: "Warm to hot" },
          { step: "Cold Shower", duration: "1-2 minutes", temperature: "Coldest setting" },
          { step: "Hot Shower", duration: "2-3 minutes", temperature: "Warm" },
          { step: "Cold Shower", duration: "1-2 minutes", temperature: "Coldest setting" },
          { step: "Warm Down", duration: "1 minute", temperature: "Lukewarm" },
        ],
        frequency: `${daysPerWeek} sessions per week (ideal post-workout or morning)`,
        benefits: [
          "Improved recovery",
          "Enhanced circulation",
          "Mood and energy boost",
          "Better sleep when done in evening",
        ],
      };
    }

    // Timing recommendations
    const timingRecommendations: string[] = [];
    
    if (preferredTime === "morning") {
      timingRecommendations.push("Morning cold exposure boosts dopamine and energy for the day");
      timingRecommendations.push("Best time: Within 1 hour of waking");
      timingRecommendations.push("Avoid cold exposure too close to bedtime (can interfere with sleep)");
    } else if (preferredTime === "post_workout") {
      timingRecommendations.push("Post-workout cold exposure enhances recovery and reduces inflammation");
      timingRecommendations.push("Best time: Within 30-60 minutes after training");
      timingRecommendations.push("Contrast therapy is especially effective post-workout");
    } else if (preferredTime === "evening") {
      timingRecommendations.push("Evening cold exposure can improve sleep quality");
      timingRecommendations.push("Best time: 2-3 hours before bedtime");
      timingRecommendations.push("Avoid too close to sleep (can be too stimulating)");
    }

    // Tips based on goals
    const tips: string[] = [];
    
    if (goals.includes("recovery")) {
      tips.push("Cold exposure post-workout reduces inflammation and speeds recovery");
      tips.push("Contrast therapy is especially effective for recovery");
      tips.push("Aim for 11 minutes total cold exposure per week for optimal recovery benefits");
    }
    
    if (goals.includes("mood")) {
      tips.push("Cold exposure increases dopamine and norepinephrine - great for mood");
      tips.push("Morning cold exposure provides sustained mood and energy benefits");
      tips.push("Consistency is key - regular exposure provides cumulative benefits");
    }
    
    if (goals.includes("metabolism")) {
      tips.push("Cold exposure activates brown fat and increases metabolic rate");
      tips.push("Regular cold exposure can improve insulin sensitivity");
      tips.push("Combine with proper nutrition for best metabolic benefits");
    }
    
    if (goals.includes("performance")) {
      tips.push("Cold exposure improves cardiovascular adaptation");
      tips.push("Post-workout cold can enhance recovery between training sessions");
      tips.push("Avoid cold exposure immediately before training (can reduce power output)");
    }
    
    if (goals.includes("stress_reduction")) {
      tips.push("Cold exposure trains your stress response system");
      tips.push("Controlled exposure builds resilience to stress");
      tips.push("Focus on breathing and staying calm during exposure");
    }

    tips.push("Stay consistent - benefits accumulate over time");
    tips.push("Listen to your body and adjust intensity as needed");
    tips.push("Track your sessions to maintain consistency");

    return {
      coldPlunge,
      sauna,
      contrast,
      timingRecommendations,
      tips,
      goals,
      experienceLevel,
    };
  },
});

