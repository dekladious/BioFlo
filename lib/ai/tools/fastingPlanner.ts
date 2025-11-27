import { z } from "zod";
import { registerTool } from "./index";

type FastingProtocol = {
  name: string;
  description: string;
  fastingWindow: string; // e.g., "16 hours"
  eatingWindow: string; // e.g., "8 hours"
  schedule: {
    fastingStart: string; // e.g., "8:00 PM"
    fastingEnd: string; // e.g., "12:00 PM"
    eatingStart: string; // e.g., "12:00 PM"
    eatingEnd: string; // e.g., "8:00 PM"
  };
  progression?: {
    week1: string;
    week2: string;
    week3: string;
    week4: string;
  };
};

type ElectrolyteRecommendation = {
  sodium: string;
  potassium: string;
  magnesium: string;
  notes?: string;
};

type BreakingFastProtocol = {
  firstMeal: string;
  timing: string;
  foods: string[];
  avoid: string[];
  notes: string;
};

export const fastingPlanner = registerTool({
  name: "fastingPlanner",
  description: "Create personalized intermittent fasting protocols based on experience level, goals, and schedule constraints. Includes electrolyte recommendations and breaking fast protocols.",
  input: z.object({
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
    goals: z.array(z.enum(["weight_loss", "autophagy", "metabolic_health", "mental_clarity", "longevity", "performance"])).default(["metabolic_health"]),
    scheduleConstraints: z.object({
      workStart: z.string().optional(), // e.g., "9:00 AM"
      workEnd: z.string().optional(), // e.g., "5:00 PM"
      preferredEatingWindow: z.string().optional(), // e.g., "12:00 PM - 8:00 PM"
    }).optional(),
    activityLevel: z.enum(["sedentary", "moderate", "high", "athlete"]).default("moderate"),
    currentProtocol: z.string().optional(), // e.g., "none", "12:12", "16:8"
  }),
  async handler({ experienceLevel, goals, scheduleConstraints, activityLevel, currentProtocol }, _context) {
    // Determine protocol based on experience level and goals
    let protocol: FastingProtocol;
    
    if (experienceLevel === "beginner") {
      // Beginners: Start with 12:12 or 14:10, progress to 16:8
      protocol = {
        name: "16:8 Intermittent Fasting (Beginner-Friendly)",
        description: "A gentle introduction to intermittent fasting. Fast for 16 hours, eat within an 8-hour window. This protocol is sustainable and effective for weight loss and metabolic health.",
        fastingWindow: "16 hours",
        eatingWindow: "8 hours",
        schedule: {
          fastingStart: scheduleConstraints?.preferredEatingWindow 
            ? calculateFastingStart(scheduleConstraints.preferredEatingWindow, 8)
            : "8:00 PM",
          fastingEnd: scheduleConstraints?.preferredEatingWindow
            ? calculateEatingStart(scheduleConstraints.preferredEatingWindow)
            : "12:00 PM",
          eatingStart: scheduleConstraints?.preferredEatingWindow
            ? calculateEatingStart(scheduleConstraints.preferredEatingWindow)
            : "12:00 PM",
          eatingEnd: scheduleConstraints?.preferredEatingWindow
            ? calculateEatingEnd(scheduleConstraints.preferredEatingWindow)
            : "8:00 PM",
        },
        progression: {
          week1: "Start with 12:12 (fast 12 hours, eat 12 hours) to ease into fasting",
          week2: "Progress to 14:10 (fast 14 hours, eat 10 hours)",
          week3: "Move to 15:9 (fast 15 hours, eat 9 hours)",
          week4: "Reach 16:8 (fast 16 hours, eat 8 hours) - your target protocol",
        },
      };
    } else if (experienceLevel === "intermediate") {
      // Intermediate: 16:8, 18:6, or OMAD
      const useOMAD = goals.includes("autophagy") || goals.includes("weight_loss");
      
      if (useOMAD) {
        protocol = {
          name: "OMAD (One Meal A Day)",
          description: "Eat one large meal per day within a 1-hour window. Excellent for autophagy, weight loss, and mental clarity. Best for those comfortable with longer fasts.",
          fastingWindow: "23 hours",
          eatingWindow: "1 hour",
          schedule: {
            fastingStart: scheduleConstraints?.preferredEatingWindow
              ? calculateFastingStart(scheduleConstraints.preferredEatingWindow, 1)
              : "2:00 PM",
            fastingEnd: scheduleConstraints?.preferredEatingWindow
              ? calculateEatingStart(scheduleConstraints.preferredEatingWindow)
              : "1:00 PM",
            eatingStart: scheduleConstraints?.preferredEatingWindow
              ? calculateEatingStart(scheduleConstraints.preferredEatingWindow)
              : "1:00 PM",
            eatingEnd: scheduleConstraints?.preferredEatingWindow
              ? calculateEatingEnd(scheduleConstraints.preferredEatingWindow)
              : "2:00 PM",
          },
        };
      } else {
        protocol = {
          name: "18:6 Intermittent Fasting",
          description: "Fast for 18 hours, eat within a 6-hour window. Great balance between metabolic benefits and sustainability. Ideal for weight loss and metabolic health.",
          fastingWindow: "18 hours",
          eatingWindow: "6 hours",
          schedule: {
            fastingStart: scheduleConstraints?.preferredEatingWindow
              ? calculateFastingStart(scheduleConstraints.preferredEatingWindow, 6)
              : "7:00 PM",
            fastingEnd: scheduleConstraints?.preferredEatingWindow
              ? calculateEatingStart(scheduleConstraints.preferredEatingWindow)
              : "1:00 PM",
            eatingStart: scheduleConstraints?.preferredEatingWindow
              ? calculateEatingStart(scheduleConstraints.preferredEatingWindow)
              : "1:00 PM",
            eatingEnd: scheduleConstraints?.preferredEatingWindow
              ? calculateEatingEnd(scheduleConstraints.preferredEatingWindow)
              : "7:00 PM",
          },
        };
      }
    } else {
      // Advanced: OMAD, 20:4, or 5:2
      const useExtended = goals.includes("autophagy") || goals.includes("longevity");
      
      if (useExtended) {
        protocol = {
          name: "20:4 Intermittent Fasting (Warrior Diet)",
          description: "Fast for 20 hours, eat within a 4-hour window. Advanced protocol for maximum autophagy and metabolic benefits. Requires experience with fasting.",
          fastingWindow: "20 hours",
          eatingWindow: "4 hours",
          schedule: {
            fastingStart: scheduleConstraints?.preferredEatingWindow
              ? calculateFastingStart(scheduleConstraints.preferredEatingWindow, 4)
              : "6:00 PM",
            fastingEnd: scheduleConstraints?.preferredEatingWindow
              ? calculateEatingStart(scheduleConstraints.preferredEatingWindow)
              : "2:00 PM",
            eatingStart: scheduleConstraints?.preferredEatingWindow
              ? calculateEatingStart(scheduleConstraints.preferredEatingWindow)
              : "2:00 PM",
            eatingEnd: scheduleConstraints?.preferredEatingWindow
              ? calculateEatingEnd(scheduleConstraints.preferredEatingWindow)
              : "6:00 PM",
          },
        };
      } else {
        protocol = {
          name: "5:2 Fasting Protocol",
          description: "Eat normally for 5 days, restrict calories to 500-600 on 2 non-consecutive days. Flexible approach that fits busy schedules.",
          fastingWindow: "2 days per week (500-600 calories)",
          eatingWindow: "5 days per week (normal eating)",
          schedule: {
            fastingStart: "Monday & Thursday (example)",
            fastingEnd: "Tuesday & Friday",
            eatingStart: "Tuesday & Friday",
            eatingEnd: "Wednesday & Saturday",
          },
        };
      }
    }

    // Electrolyte recommendations based on fasting duration
    const fastingHours = parseInt(protocol.fastingWindow) || 16;
    const electrolytes: ElectrolyteRecommendation = {
      sodium: fastingHours >= 18 
        ? "3,000-5,000 mg per day (add 1/4 tsp pink Himalayan salt to water)"
        : "2,000-3,000 mg per day (add 1/8 tsp pink Himalayan salt to water)",
      potassium: fastingHours >= 18
        ? "3,000-4,000 mg per day (use NoSalt or potassium chloride supplement)"
        : "2,000-3,000 mg per day (from food or supplement)",
      magnesium: "400-600 mg per day (magnesium glycinate or citrate, take before bed)",
      notes: fastingHours >= 18
        ? "Critical for extended fasts. Add electrolytes to water throughout the day to prevent headaches, fatigue, and muscle cramps."
        : "Important for maintaining energy and preventing headaches. Add to water, especially during the first few hours of fasting.",
    };

    // Breaking fast protocol
    const breakingFast: BreakingFastProtocol = {
      firstMeal: "Break your fast with protein and healthy fats",
      timing: "Start eating at " + protocol.schedule.eatingStart,
      foods: [
        "Lean protein (chicken, fish, eggs, or plant-based)",
        "Healthy fats (avocado, olive oil, nuts)",
        "Non-starchy vegetables (leafy greens, broccoli, bell peppers)",
        "Small amount of complex carbs (sweet potato, quinoa) if needed",
      ],
      avoid: [
        "Large amounts of sugar or refined carbs (causes insulin spike)",
        "Processed foods",
        "Large meals immediately (start with moderate portion)",
        "Alcohol (breaks fast and adds empty calories)",
      ],
      notes: "Start with a moderate meal (400-600 calories). Wait 30-60 minutes before your main meal to allow your digestive system to activate gradually.",
    };

    // Meal suggestions for eating window
    const mealSuggestions = generateMealSuggestions(protocol.eatingWindow, activityLevel, goals);

    // Tips based on goals
    const tips: string[] = [];
    
    if (goals.includes("weight_loss")) {
      tips.push("Focus on whole foods and avoid overeating during your eating window");
      tips.push("Track your calories to ensure you're in a deficit (if weight loss is the goal)");
    }
    
    if (goals.includes("autophagy")) {
      tips.push("Longer fasts (18+ hours) maximize autophagy benefits");
      tips.push("Consider adding green tea or black coffee during fasting window (doesn't break fast)");
    }
    
    if (goals.includes("metabolic_health")) {
      tips.push("Consistency is key - stick to your eating window daily");
      tips.push("Focus on whole foods and avoid processed foods");
    }
    
    if (goals.includes("mental_clarity")) {
      tips.push("Many people experience increased focus and mental clarity during fasting");
      tips.push("Consider scheduling important work during your fasting window");
    }
    
    if (activityLevel === "athlete" || activityLevel === "high") {
      tips.push("Time your workouts near the end of your eating window for optimal performance");
      tips.push("Ensure adequate protein intake (1.6-2.2g per kg body weight)");
      tips.push("Consider shorter fasts (14:10) on heavy training days");
    }

    tips.push("Stay hydrated - drink 2-3L of water throughout the day");
    tips.push("Listen to your body - if you feel unwell, break your fast");
    tips.push("Start gradually - don't jump into extended fasts if you're new to fasting");

    return {
      protocol,
      electrolytes,
      breakingFast,
      mealSuggestions,
      tips,
      goals,
      experienceLevel,
      activityLevel,
    };
  },
});

// Helper functions
function calculateFastingStart(eatingWindow: string, eatingHours: number): string {
  // Parse eating window like "12:00 PM - 8:00 PM"
  const match = eatingWindow.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    const hour = parseInt(match[1]);
    const ampm = match[3].toUpperCase();
    let hour24 = hour;
    if (ampm === "PM" && hour !== 12) hour24 += 12;
    if (ampm === "AM" && hour === 12) hour24 = 0;
    
    // Calculate fasting start (eating end - eating hours)
    const fastingStartHour = (hour24 - eatingHours + 24) % 24;
    return formatTime(fastingStartHour);
  }
  return "8:00 PM";
}

function calculateEatingStart(eatingWindow: string): string {
  const match = eatingWindow.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    return match[0];
  }
  return "12:00 PM";
}

function calculateEatingEnd(eatingWindow: string): string {
  const parts = eatingWindow.split("-");
  if (parts.length === 2) {
    const endMatch = parts[1].trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (endMatch) {
      return endMatch[0];
    }
  }
  return "8:00 PM";
}

function formatTime(hour24: number): string {
  const hour = hour24 % 12 || 12;
  const ampm = hour24 < 12 ? "AM" : "PM";
  return `${hour}:00 ${ampm}`;
}

function generateMealSuggestions(eatingWindow: string, activityLevel: string, goals: string[]): {
  meal1: string[];
  meal2?: string[];
  meal3?: string[];
} {
  const isOMAD = eatingWindow.includes("1 hour") || eatingWindow.includes("OMAD");
  const isExtended = eatingWindow.includes("4 hours") || eatingWindow.includes("6 hours");
  
  if (isOMAD) {
    return {
      meal1: [
        "Large balanced meal: Protein (150-200g), healthy fats (avocado, olive oil), vegetables, and complex carbs",
        "Example: Grilled salmon (200g) + roasted vegetables + sweet potato + avocado",
        "Aim for 1,200-1,800 calories depending on your needs",
      ],
    };
  }
  
  if (isExtended) {
    return {
      meal1: [
        "First meal (break fast): Protein + healthy fats + vegetables",
        "Example: Grilled chicken (150g) + mixed greens + avocado + olive oil",
      ],
      meal2: [
        "Second meal (2-3 hours later): Balanced meal with protein, carbs, and fats",
        "Example: Salmon (150g) + quinoa + roasted vegetables",
      ],
    };
  }
  
  // Standard 16:8 or 18:6
  return {
    meal1: [
      "First meal (break fast): Protein + healthy fats + vegetables",
      "Example: Eggs (3-4) + avocado + spinach + whole grain toast",
    ],
    meal2: [
      "Second meal (mid-eating window): Balanced meal",
      "Example: Grilled chicken (150g) + brown rice + steamed vegetables",
    ],
    meal3: [
      "Final meal (end of eating window): Protein + vegetables + healthy fats",
      "Example: Salmon (150g) + roasted vegetables + olive oil",
    ],
  };
}

