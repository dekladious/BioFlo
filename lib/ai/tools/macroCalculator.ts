import { z } from "zod";
import { registerTool } from "./index";

type MacroBreakdown = {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
};

type MacroPercentages = {
  protein: number;
  carbs: number;
  fat: number;
};

type MealDistribution = {
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timing?: string;
};

export const macroCalculator = registerTool({
  name: "macroCalculator",
  description: "Calculate optimal macronutrient breakdown based on goals, activity level, body composition, and dietary preferences. Supports keto, standard, and custom ratios.",
  input: z.object({
    goal: z.enum(["weight_loss", "muscle_gain", "maintenance", "performance", "body_recomposition"]).default("maintenance"),
    activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active", "athlete"]).default("moderate"),
    bodyStats: z.object({
      weight: z.number().min(30).max(300), // kg
      height: z.number().min(100).max(250).optional(), // cm
      age: z.number().min(18).max(100).optional(),
      bodyFat: z.number().min(5).max(50).optional(), // percentage
    }),
    dietaryPreference: z.enum(["standard", "keto", "low_carb", "high_carb", "high_protein", "paleo"]).default("standard"),
    mealsPerDay: z.number().min(1).max(6).default(3),
  }),
  async handler({ goal, activityLevel, bodyStats, dietaryPreference, mealsPerDay }, _context) {
    const { weight, height, age, bodyFat } = bodyStats;
    
    // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
    // If height/age not provided, use simplified calculation
    let bmr: number;
    if (height && age) {
      // Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
      // Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
      // Using average (assuming male for calculation, can be adjusted)
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      // Simplified: BMR ≈ weight(kg) × 22
      bmr = weight * 22;
    }

    // Activity Multipliers
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
      athlete: 2.0,
    };

    // Calculate TDEE (Total Daily Energy Expenditure)
    const tdee = Math.round(bmr * activityMultipliers[activityLevel]);

    // Adjust calories based on goal
    let targetCalories: number;
    let deficitOrSurplus: number;
    
    if (goal === "weight_loss") {
      deficitOrSurplus = -500; // 500 calorie deficit = ~1 lb/week
      targetCalories = Math.max(tdee + deficitOrSurplus, bmr * 1.1); // Don't go below 10% of BMR
    } else if (goal === "muscle_gain") {
      deficitOrSurplus = 300; // 300 calorie surplus for lean gains
      targetCalories = tdee + deficitOrSurplus;
    } else if (goal === "body_recomposition") {
      // Slight deficit or maintenance with high protein
      deficitOrSurplus = -200;
      targetCalories = tdee + deficitOrSurplus;
    } else if (goal === "performance") {
      // Maintenance to slight surplus for performance
      deficitOrSurplus = 100;
      targetCalories = tdee + deficitOrSurplus;
    } else {
      // Maintenance
      deficitOrSurplus = 0;
      targetCalories = tdee;
    }

    // Calculate macros based on dietary preference
    let macroPercentages: MacroPercentages;
    let macros: MacroBreakdown;

    if (dietaryPreference === "keto") {
      // Keto: High fat, moderate protein, very low carb
      macroPercentages = { protein: 20, carbs: 5, fat: 75 };
    } else if (dietaryPreference === "low_carb") {
      // Low carb: Moderate protein, low carb, moderate fat
      macroPercentages = { protein: 30, carbs: 20, fat: 50 };
    } else if (dietaryPreference === "high_carb") {
      // High carb: Moderate protein, high carb, low fat
      macroPercentages = { protein: 20, carbs: 60, fat: 20 };
    } else if (dietaryPreference === "high_protein") {
      // High protein: High protein, moderate carbs, moderate fat
      macroPercentages = { protein: 35, carbs: 35, fat: 30 };
    } else if (dietaryPreference === "paleo") {
      // Paleo: Moderate protein, moderate carbs, moderate fat
      macroPercentages = { protein: 30, carbs: 30, fat: 40 };
    } else {
      // Standard: Balanced macros
      if (goal === "muscle_gain") {
        macroPercentages = { protein: 30, carbs: 40, fat: 30 };
      } else if (goal === "weight_loss") {
        macroPercentages = { protein: 35, carbs: 35, fat: 30 };
      } else {
        macroPercentages = { protein: 30, carbs: 40, fat: 30 };
      }
    }

    // Adjust protein based on goal and body composition
    if (goal === "muscle_gain" || goal === "body_recomposition") {
      // Higher protein for muscle building: 2.2-2.5g per kg bodyweight
      const proteinGrams = Math.round(weight * 2.3);
      const proteinCalories = proteinGrams * 4;
      const proteinPercentage = Math.round((proteinCalories / targetCalories) * 100);
      
      // Adjust remaining calories between carbs and fat
      const remainingCalories = targetCalories - proteinCalories;
      const remainingCarbs = Math.round((remainingCalories * (macroPercentages.carbs / (macroPercentages.carbs + macroPercentages.fat))) / 4);
      const remainingFat = Math.round((remainingCalories * (macroPercentages.fat / (macroPercentages.carbs + macroPercentages.fat))) / 9);
      
      macros = {
        protein: proteinGrams,
        carbs: remainingCarbs,
        fat: remainingFat,
        calories: targetCalories,
      };
      
      macroPercentages = {
        protein: proteinPercentage,
        carbs: Math.round((remainingCarbs * 4 / targetCalories) * 100),
        fat: Math.round((remainingFat * 9 / targetCalories) * 100),
      };
    } else {
      // Standard calculation
      const proteinGrams = Math.round((targetCalories * (macroPercentages.protein / 100)) / 4);
      const carbGrams = Math.round((targetCalories * (macroPercentages.carbs / 100)) / 4);
      const fatGrams = Math.round((targetCalories * (macroPercentages.fat / 100)) / 9);
      
      macros = {
        protein: proteinGrams,
        carbs: carbGrams,
        fat: fatGrams,
        calories: targetCalories,
      };
    }

    // Meal Distribution
    const mealDistribution: MealDistribution[] = [];
    
    if (mealsPerDay === 1) {
      // OMAD
      mealDistribution.push({
        meal: "One Meal",
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        timing: "Within your eating window",
      });
    } else if (mealsPerDay === 2) {
      // 2 meals
      mealDistribution.push({
        meal: "Meal 1",
        calories: Math.round(macros.calories * 0.4),
        protein: Math.round(macros.protein * 0.4),
        carbs: Math.round(macros.carbs * 0.4),
        fat: Math.round(macros.fat * 0.4),
        timing: "Break fast / First meal",
      });
      mealDistribution.push({
        meal: "Meal 2",
        calories: Math.round(macros.calories * 0.6),
        protein: Math.round(macros.protein * 0.6),
        carbs: Math.round(macros.carbs * 0.6),
        fat: Math.round(macros.fat * 0.6),
        timing: "Main meal",
      });
    } else if (mealsPerDay === 3) {
      // 3 meals
      mealDistribution.push({
        meal: "Breakfast",
        calories: Math.round(macros.calories * 0.3),
        protein: Math.round(macros.protein * 0.3),
        carbs: Math.round(macros.carbs * 0.3),
        fat: Math.round(macros.fat * 0.3),
        timing: "Morning",
      });
      mealDistribution.push({
        meal: "Lunch",
        calories: Math.round(macros.calories * 0.35),
        protein: Math.round(macros.protein * 0.35),
        carbs: Math.round(macros.carbs * 0.35),
        fat: Math.round(macros.fat * 0.35),
        timing: "Midday",
      });
      mealDistribution.push({
        meal: "Dinner",
        calories: Math.round(macros.calories * 0.35),
        protein: Math.round(macros.protein * 0.35),
        carbs: Math.round(macros.carbs * 0.35),
        fat: Math.round(macros.fat * 0.35),
        timing: "Evening",
      });
    } else {
      // 4+ meals - distribute evenly
      const perMeal = 1 / mealsPerDay;
      const mealNames = ["Breakfast", "Mid-Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack"];
      
      for (let i = 0; i < mealsPerDay; i++) {
        mealDistribution.push({
          meal: mealNames[i] || `Meal ${i + 1}`,
          calories: Math.round(macros.calories * perMeal),
          protein: Math.round(macros.protein * perMeal),
          carbs: Math.round(macros.carbs * perMeal),
          fat: Math.round(macros.fat * perMeal),
          timing: i === 0 ? "Morning" : i === mealsPerDay - 1 ? "Evening" : undefined,
        });
      }
    }

    // Tips based on goal and preference
    const tips: string[] = [];
    
    if (goal === "weight_loss") {
      tips.push("Track your calories and macros consistently - accuracy is key");
      tips.push("Prioritize protein to preserve muscle mass during weight loss");
      tips.push("Be patient - sustainable weight loss is 0.5-1kg per week");
      tips.push("Adjust calories if weight loss stalls (reduce by 100-200 calories)");
    }
    
    if (goal === "muscle_gain") {
      tips.push("Ensure adequate protein (2.2-2.5g per kg bodyweight) for muscle growth");
      tips.push("Eat enough calories - you need a surplus to build muscle");
      tips.push("Time protein intake around workouts (pre and post-workout meals)");
      tips.push("Be patient - muscle gain is slow (0.25-0.5kg per month)");
    }
    
    if (dietaryPreference === "keto") {
      tips.push("Stay under 20-30g net carbs per day to maintain ketosis");
      tips.push("Track net carbs (total carbs - fiber)");
      tips.push("Ensure adequate electrolytes (sodium, potassium, magnesium)");
      tips.push("It may take 1-2 weeks to adapt to ketosis");
    }
    
    if (dietaryPreference === "high_protein") {
      tips.push("Distribute protein evenly across meals for optimal muscle protein synthesis");
      tips.push("Aim for 20-40g protein per meal");
      tips.push("Include complete protein sources (animal or combined plant proteins)");
    }

    tips.push("Use a food scale for accuracy, especially when starting");
    tips.push("Track for 2-4 weeks, then adjust based on results");
    tips.push("Stay hydrated - drink 2-3L of water per day");
    tips.push("Be flexible - 80/20 rule (80% adherence, 20% flexibility)");

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories: macros.calories,
      deficitOrSurplus,
      macros,
      macroPercentages,
      mealDistribution,
      tips,
      goal,
      dietaryPreference,
      activityLevel,
    };
  },
});

