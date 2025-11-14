import { z } from "zod";
import { registerTool } from "./index";

type RecoveryProtocol = {
  name: string;
  description: string;
  duration: string;
  steps: Array<{
    time: string;
    action: string;
    details: string[];
  }>;
};

type SupplementRecommendation = {
  name: string;
  dosage: string;
  timing: string;
  purpose: string;
  notes?: string;
};

type SleepOptimization = {
  recommendations: string[];
  timing: string;
  duration: string;
};

type ActiveRecovery = {
  activities: Array<{
    name: string;
    duration: string;
    intensity: string;
    benefits: string[];
  }>;
};

export const recoveryOptimizer = registerTool({
  name: "recoveryOptimizer",
  description: "Create personalized recovery protocols for post-workout recovery, including nutrition timing, sleep optimization, supplements, and active recovery recommendations.",
  input: z.object({
    workoutType: z.enum(["strength", "cardio", "hiit", "endurance", "mixed", "sport"]).default("mixed"),
    intensity: z.enum(["low", "moderate", "high", "very_high"]).default("moderate"),
    recoveryTime: z.enum(["same_day", "next_day", "48_hours", "72_hours"]).default("next_day"),
    sleepQuality: z.enum(["poor", "fair", "good", "excellent"]).default("good"),
    stressLevel: z.enum(["low", "moderate", "high"]).default("moderate"),
    goals: z.array(z.enum(["muscle_gain", "endurance", "performance", "fatigue_reduction", "injury_prevention"])).default(["performance"]),
  }),
  async handler({ workoutType, intensity, recoveryTime, sleepQuality, stressLevel, goals }) {
    // Recovery Protocol
    const protocols: RecoveryProtocol[] = [];

    // Immediate Post-Workout (0-30 minutes)
    protocols.push({
      name: "Immediate Post-Workout Recovery (0-30 minutes)",
      description: "Critical window for recovery - focus on hydration, protein, and light movement.",
      duration: "30 minutes",
      steps: [
        {
          time: "0-10 minutes",
          action: "Cool Down & Hydration",
          details: [
            "5-10 minute light walk or gentle movement",
            "Drink 500ml-1L of water with electrolytes",
            "Deep breathing to activate parasympathetic nervous system",
          ],
        },
        {
          time: "10-30 minutes",
          action: "Nutrition Window",
          details: [
            "Consume 20-40g protein (whey, casein, or whole food)",
            "30-60g fast-digesting carbs (if training was intense or >60 min)",
            "Example: Protein shake + banana, or Greek yogurt + berries",
            "If doing intermittent fasting, break fast within 2 hours post-workout",
          ],
        },
      ],
    });

    // Short-Term Recovery (30 minutes - 4 hours)
    protocols.push({
      name: "Short-Term Recovery (30 minutes - 4 hours)",
      description: "Continue recovery with proper nutrition, hydration, and light activity.",
      duration: "4 hours",
      steps: [
        {
          time: "1-2 hours post-workout",
          action: "Main Meal",
          details: [
            "Balanced meal with protein, carbs, and healthy fats",
            "Aim for 30-40g protein, complex carbs, vegetables",
            "Example: Grilled chicken + sweet potato + vegetables",
          ],
        },
        {
          time: "2-4 hours post-workout",
          action: "Active Recovery (Optional)",
          details: [
            "Light walk (10-20 minutes)",
            "Gentle stretching or yoga",
            "Foam rolling or self-massage",
            "Avoid intense activity - let your body recover",
          ],
        },
      ],
    });

    // Sleep Optimization for Recovery
    let sleepOptimization: SleepOptimization | null = null;
    
    if (sleepQuality === "poor" || sleepQuality === "fair" || recoveryTime === "same_day") {
      sleepOptimization = {
        recommendations: [
          "Prioritize 7-9 hours of sleep tonight",
          "Keep room temperature cool (65-68°F / 18-20°C)",
          "Avoid screens 1-2 hours before bed",
          "Consider magnesium supplement (400mg) before bed",
          "Dark, quiet room - use blackout curtains if needed",
          "Consistent sleep schedule - go to bed at same time",
        ],
        timing: "8-10 hours before your next training session",
        duration: "7-9 hours",
      };
    } else {
      sleepOptimization = {
        recommendations: [
          "Maintain 7-9 hours of quality sleep",
          "Keep consistent sleep schedule",
          "Ensure room is dark and cool",
        ],
        timing: "Standard sleep schedule",
        duration: "7-9 hours",
      };
    }

    // Supplement Recommendations
    const supplements: SupplementRecommendation[] = [];

    if (workoutType === "strength" || goals.includes("muscle_gain")) {
      supplements.push({
        name: "Creatine Monohydrate",
        dosage: "3-5g daily",
        timing: "Post-workout or anytime (timing doesn't matter)",
        purpose: "Improves strength, power, and muscle recovery",
        notes: "Take consistently - benefits accumulate over time. Can cause slight water retention.",
      });

      supplements.push({
        name: "BCAA or Essential Amino Acids (EAA)",
        dosage: "5-10g",
        timing: "During or immediately post-workout",
        purpose: "Reduces muscle soreness and supports muscle protein synthesis",
        notes: "Optional if consuming adequate protein. More beneficial during fasted training.",
      });
    }

    if (intensity === "high" || intensity === "very_high" || workoutType === "hiit") {
      supplements.push({
        name: "Beta-Alanine",
        dosage: "3-5g daily",
        timing: "Post-workout or split doses",
        purpose: "Reduces fatigue during high-intensity exercise, improves endurance",
        notes: "May cause tingling sensation (harmless). Take consistently for benefits.",
      });
    }

    if (sleepQuality === "poor" || recoveryTime === "same_day") {
      supplements.push({
        name: "Magnesium Glycinate",
        dosage: "400-600mg",
        timing: "30-60 minutes before bed",
        purpose: "Improves sleep quality, reduces muscle tension, supports recovery",
        notes: "Highly bioavailable form. Start with 400mg.",
      });

      supplements.push({
        name: "Zinc",
        dosage: "15-30mg",
        timing: "Evening, with food",
        purpose: "Supports immune function and recovery",
        notes: "Don't exceed 40mg daily. Can interfere with copper absorption if taken long-term.",
      });
    }

    if (workoutType === "endurance" || workoutType === "cardio") {
      supplements.push({
        name: "Electrolytes",
        dosage: "As needed based on sweat loss",
        timing: "During and post-workout",
        purpose: "Replenish sodium, potassium, magnesium lost through sweat",
        notes: "Especially important for long-duration or high-intensity sessions.",
      });
    }

    // Active Recovery Recommendations
    const activeRecovery: ActiveRecovery = {
      activities: [],
    };

    if (recoveryTime === "same_day" || recoveryTime === "next_day") {
      activeRecovery.activities.push({
        name: "Light Walking",
        duration: "10-20 minutes",
        intensity: "Very light (conversational pace)",
        benefits: [
          "Promotes blood flow and nutrient delivery",
          "Reduces muscle stiffness",
          "Aids in waste product removal",
        ],
      });

      activeRecovery.activities.push({
        name: "Gentle Stretching or Yoga",
        duration: "15-30 minutes",
        intensity: "Low intensity",
        benefits: [
          "Improves flexibility and range of motion",
          "Reduces muscle tension",
          "Promotes relaxation",
        ],
      });

      activeRecovery.activities.push({
        name: "Foam Rolling / Self-Massage",
        duration: "10-15 minutes",
        intensity: "Moderate pressure",
        benefits: [
          "Reduces muscle soreness",
          "Improves mobility",
          "Breaks up adhesions",
        ],
      });
    }

    if (recoveryTime === "48_hours" || recoveryTime === "72_hours") {
      activeRecovery.activities.push({
        name: "Swimming or Water Activities",
        duration: "20-30 minutes",
        intensity: "Low to moderate",
        benefits: [
          "Low-impact recovery",
          "Promotes circulation",
          "Reduces joint stress",
        ],
      });
    }

    // Nutrition Timing Recommendations
    const nutritionTiming: string[] = [];
    
    if (workoutType === "strength" || goals.includes("muscle_gain")) {
      nutritionTiming.push("Post-workout protein window: Consume 20-40g protein within 2 hours");
      nutritionTiming.push("Distribute protein evenly across meals (4-5 meals with 20-40g each)");
      nutritionTiming.push("Pre-workout meal: 2-3 hours before training (if not fasted)");
    }
    
    if (workoutType === "endurance" || workoutType === "cardio") {
      nutritionTiming.push("Pre-workout: Small meal 1-2 hours before (carbs + protein)");
      nutritionTiming.push("During workout: 30-60g carbs per hour if >60 minutes");
      nutritionTiming.push("Post-workout: Protein + carbs within 30-60 minutes");
    }
    
    if (workoutType === "hiit") {
      nutritionTiming.push("Post-workout: Fast-digesting carbs + protein within 30 minutes");
      nutritionTiming.push("Replenish glycogen stores quickly after high-intensity sessions");
    }

    // Tips
    const tips: string[] = [];
    
    tips.push("Hydration is critical - drink water consistently throughout the day");
    tips.push("Sleep is the most important recovery tool - prioritize 7-9 hours");
    tips.push("Listen to your body - if you're still sore, take an extra rest day");
    tips.push("Consistency beats perfection - small daily recovery habits compound");
    
    if (stressLevel === "high") {
      tips.push("High stress impairs recovery - consider stress management techniques");
      tips.push("Reduce training volume or intensity if stress is chronic");
    }
    
    if (recoveryTime === "same_day") {
      tips.push("Same-day recovery requires excellent sleep and nutrition");
      tips.push("Consider reducing intensity if training again the same day");
    }

    return {
      protocols,
      sleepOptimization,
      supplements,
      activeRecovery,
      nutritionTiming,
      tips,
      workoutType,
      intensity,
      recoveryTime,
    };
  },
});

