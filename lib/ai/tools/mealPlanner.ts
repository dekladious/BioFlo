import { z } from "zod";
import { registerTool } from "./index";

type PlanItem = { 
  name: string; 
  items: string[]; 
  kcal: number; 
  protein: number; 
  carbs: number; 
  fat: number;
  timing?: string;
};

type MealOption = {
  items: string[];
  excludes?: string[];
};

// Enhanced meal database with variety
const MEAL_DATABASE = {
  breakfast: {
    vegan: [
      { items: ["Tofu scramble (200g)", "Whole grain toast (2 slices)", "Spinach (50g)", "Avocado (1/2)"], excludes: [] },
      { items: ["Overnight oats (1 cup)", "Chia seeds (1 tbsp)", "Berries (100g)", "Almond butter (1 tbsp)"], excludes: ["nuts"] },
      { items: ["Quinoa porridge (1 cup)", "Banana (1 medium)", "Coconut milk (1/4 cup)", "Hemp seeds (1 tbsp)"], excludes: [] },
    ],
    pescatarian: [
      { items: ["Greek yogurt (200g)", "Mixed berries (100g)", "Granola (40g)", "Honey (1 tbsp)"], excludes: ["dairy"] },
      { items: ["Smoked salmon (100g)", "Scrambled eggs (2)", "Whole grain toast (1 slice)", "Avocado (1/4)"], excludes: [] },
      { items: ["Oatmeal (1 cup)", "Chia seeds (1 tbsp)", "Blueberries (80g)", "Greek yogurt (100g)"], excludes: ["dairy"] },
    ],
    standard: [
      { items: ["Scrambled eggs (3)", "Whole grain toast (2 slices)", "Spinach (50g)", "Avocado (1/2)"], excludes: [] },
      { items: ["Greek yogurt (200g)", "Berries (100g)", "Granola (50g)", "Honey (1 tbsp)"], excludes: ["dairy"] },
      { items: ["Oatmeal (1 cup)", "Banana (1 medium)", "Almond butter (1 tbsp)", "Protein powder (1 scoop)"], excludes: ["nuts"] },
    ],
    keto: [
      { items: ["Bacon (3 strips)", "Eggs (3)", "Avocado (1/2)", "Spinach (50g)"], excludes: [] },
      { items: ["Greek yogurt (150g)", "Almonds (30g)", "Chia seeds (1 tbsp)"], excludes: ["dairy", "nuts"] },
      { items: ["Smoked salmon (100g)", "Cream cheese (50g)", "Cucumber slices"], excludes: ["dairy"] },
    ],
  },
  lunch: {
    vegan: [
      { items: ["Tempeh bowl (150g)", "Quinoa (1 cup)", "Mixed greens (100g)", "Tahini dressing (2 tbsp)"], excludes: [] },
      { items: ["Lentil curry (1 cup)", "Brown rice (1 cup)", "Steamed broccoli (100g)"], excludes: [] },
      { items: ["Chickpea salad (200g)", "Whole grain wrap (1)", "Hummus (2 tbsp)", "Vegetables (mixed)"], excludes: [] },
    ],
    pescatarian: [
      { items: ["Grilled salmon (150g)", "Brown rice (1 cup)", "Steamed vegetables (150g)", "Lemon olive oil drizzle"], excludes: [] },
      { items: ["Tuna salad (150g)", "Mixed greens (100g)", "Quinoa (1/2 cup)", "Olive oil vinaigrette"], excludes: [] },
      { items: ["Baked cod (150g)", "Sweet potato (1 medium)", "Asparagus (100g)", "Tahini (1 tbsp)"], excludes: [] },
    ],
    standard: [
      { items: ["Grilled chicken breast (150g)", "Brown rice (1 cup)", "Steamed vegetables (150g)", "Olive oil (1 tbsp)"], excludes: [] },
      { items: ["Turkey wrap (120g)", "Whole grain wrap (1)", "Mixed greens", "Hummus (2 tbsp)"], excludes: [] },
      { items: ["Lean beef (120g)", "Quinoa (1 cup)", "Roasted vegetables (150g)", "Avocado (1/4)"], excludes: [] },
    ],
    keto: [
      { items: ["Grilled chicken (150g)", "Cauliflower rice (1 cup)", "Broccoli (100g)", "Butter (1 tbsp)"], excludes: ["dairy"] },
      { items: ["Salmon (150g)", "Zucchini noodles (1 cup)", "Pesto (2 tbsp)"], excludes: ["nuts"] },
      { items: ["Beef stir fry (150g)", "Mixed vegetables (150g)", "Coconut oil (1 tbsp)"], excludes: [] },
    ],
  },
  snack: [
    { items: ["Apple (1 medium)", "Almond butter (1 tbsp)"], excludes: ["nuts"] },
    { items: ["Protein shake (1 scoop)", "Almond milk (1 cup)"], excludes: ["dairy", "nuts"] },
    { items: ["Carrots (100g)", "Hummus (2 tbsp)"], excludes: [] },
    { items: ["Greek yogurt (150g)", "Berries (50g)"], excludes: ["dairy"] },
    { items: ["Rice cakes (2)", "Avocado (1/4)"], excludes: [] },
    { items: ["Cottage cheese (150g)", "Cucumber slices"], excludes: ["dairy"] },
    { items: ["Mixed nuts (30g)", "Dark chocolate (1 square)"], excludes: ["nuts"] },
    { items: ["Hard-boiled eggs (2)", "Salt & pepper"], excludes: [] },
  ],
  dinner: {
    vegan: [
      { items: ["Tofu stir fry (200g)", "Mixed vegetables (200g)", "Brown rice noodles (100g)", "Sesame oil (1 tbsp)"], excludes: [] },
      { items: ["Chickpea curry (1.5 cups)", "Brown rice (1 cup)", "Naan bread (1 piece)"], excludes: [] },
      { items: ["Lentil pasta (100g)", "Marinara sauce (1/2 cup)", "Nutritional yeast (2 tbsp)", "Side salad"], excludes: [] },
    ],
    pescatarian: [
      { items: ["Grilled shrimp (150g)", "Whole wheat pasta (100g)", "Garlic olive oil sauce", "Steamed vegetables (100g)"], excludes: [] },
      { items: ["Baked salmon (150g)", "Quinoa (1 cup)", "Roasted vegetables (150g)", "Lemon butter sauce"], excludes: ["dairy"] },
      { items: ["Tuna steak (150g)", "Sweet potato (1 medium)", "Green beans (100g)", "Tahini drizzle"], excludes: [] },
    ],
    standard: [
      { items: ["Lean beef (150g)", "Whole wheat pasta (100g)", "Marinara sauce (1/2 cup)", "Side salad"], excludes: [] },
      { items: ["Grilled chicken (150g)", "Quinoa (1 cup)", "Roasted vegetables (150g)", "Olive oil (1 tbsp)"], excludes: [] },
      { items: ["Turkey meatballs (150g)", "Zucchini noodles (1 cup)", "Tomato sauce (1/2 cup)", "Parmesan (1 tbsp)"], excludes: ["dairy"] },
    ],
    keto: [
      { items: ["Ribeye steak (150g)", "Cauliflower mash (1 cup)", "Asparagus (100g)", "Butter (1 tbsp)"], excludes: ["dairy"] },
      { items: ["Grilled chicken (150g)", "Zucchini noodles (1 cup)", "Alfredo sauce (1/4 cup)"], excludes: ["dairy"] },
      { items: ["Salmon (150g)", "Cauliflower rice (1 cup)", "Broccoli (100g)", "Coconut oil (1 tbsp)"], excludes: [] },
    ],
  },
};

export const mealPlanner = registerTool({
  name: "mealPlanner",
  description: "Generate a 1-day meal plan (3 meals + 2 snacks) with macros based on target calories and preferences.",
  input: z.object({
    calories: z.number().int().min(1200).max(5000),
    dietaryPrefs: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
  }),
  async handler({ calories, dietaryPrefs, exclusions }) {
    // Adaptive macro split based on calories
    // Higher calories = more carbs, lower calories = more protein
    let proteinPct = 0.30;
    let carbsPct = 0.40;
    let fatPct = 0.30;
    
    if (calories < 1500) {
      // Lower calorie: higher protein, lower carbs
      proteinPct = 0.35;
      carbsPct = 0.35;
      fatPct = 0.30;
    } else if (calories > 3000) {
      // Higher calorie: more balanced, higher carbs
      proteinPct = 0.25;
      carbsPct = 0.45;
      fatPct = 0.30;
    }

    const totalProtein = Math.round((calories * proteinPct) / 4);
    const totalCarbs = Math.round((calories * carbsPct) / 4);
    const totalFat = Math.round((calories * fatPct) / 9);

    // Meal distribution: Breakfast (25%), Lunch (30%), Snack 1 (10%), Snack 2 (10%), Dinner (25%)
    const parts = [0.25, 0.30, 0.10, 0.10, 0.25];

    function kcal(x: number) { return Math.round(calories * x); }
    function macroSplit(k: number, pct: number, cct: number, fct: number) {
      return {
        protein: Math.round((k * pct) / 4),
        carbs: Math.round((k * cct) / 4),
        fat: Math.round((k * fct) / 9),
      };
    }

    const avoid = new Set((exclusions || []).map(s => s.toLowerCase()));
    const pref = (dietaryPrefs || [])[0]?.toLowerCase() || "standard";
    const dietType = ["vegan", "pescatarian", "keto"].includes(pref) ? pref : "standard";

    // Helper to check if meal should be excluded
    function shouldExclude(meal: MealOption): boolean {
      if (!meal.excludes) return false;
      return meal.excludes.some(ex => avoid.has(ex));
    }

    // Helper to filter items based on exclusions
    function filterItems(items: string[]): string[] {
      return items.filter(item => {
        const low = item.toLowerCase();
        if (avoid.has("nuts") && /almond|peanut|nuts|walnut|pistachio/.test(low)) return false;
        if (avoid.has("dairy") && /(yogurt|cheese|milk|parmesan|cottage|butter|cream)/.test(low)) return false;
        if (avoid.has("gluten") && /(bread|pasta|wheat|wrap|naan|toast)/.test(low)) return false;
        if (avoid.has("eggs") && /egg/.test(low)) return false;
        if (avoid.has("soy") && /(tofu|tempeh|soy)/.test(low)) return false;
        return true;
      });
    }

    // Select meals with variety (random selection)
    function selectMeal(type: keyof typeof MEAL_DATABASE.breakfast, isSnack = false): string[] {
      if (isSnack) {
        const available = MEAL_DATABASE.snack.filter(s => !shouldExclude(s));
        const selected = available[Math.floor(Math.random() * available.length)] || MEAL_DATABASE.snack[0];
        return filterItems(selected.items);
      }

      const meals = MEAL_DATABASE[type][dietType as keyof typeof MEAL_DATABASE.breakfast] || 
                    MEAL_DATABASE[type].standard;
      const available = meals.filter(m => !shouldExclude(m));
      const selected = available[Math.floor(Math.random() * available.length)] || meals[0];
      return filterItems(selected.items);
    }

    const plan: PlanItem[] = [
      { 
        name: "Breakfast", 
        items: selectMeal("breakfast"), 
        kcal: kcal(parts[0]), 
        timing: "7:00 AM - 9:00 AM",
        ...macroSplit(kcal(parts[0]), proteinPct, carbsPct, fatPct)
      },
      { 
        name: "Lunch", 
        items: selectMeal("lunch"), 
        kcal: kcal(parts[1]), 
        timing: "12:00 PM - 2:00 PM",
        ...macroSplit(kcal(parts[1]), proteinPct, carbsPct, fatPct)
      },
      { 
        name: "Afternoon Snack", 
        items: selectMeal("breakfast", true), 
        kcal: kcal(parts[2]), 
        timing: "3:00 PM - 4:00 PM",
        ...macroSplit(kcal(parts[2]), proteinPct, carbsPct, fatPct)
      },
      { 
        name: "Evening Snack", 
        items: selectMeal("breakfast", true), 
        kcal: kcal(parts[3]), 
        timing: "7:00 PM - 8:00 PM",
        ...macroSplit(kcal(parts[3]), proteinPct, carbsPct, fatPct)
      },
      { 
        name: "Dinner", 
        items: selectMeal("dinner"), 
        kcal: kcal(parts[4]), 
        timing: "6:00 PM - 8:00 PM",
        ...macroSplit(kcal(parts[4]), proteinPct, carbsPct, fatPct)
      },
    ];

    return {
      calories,
      macros: { protein: totalProtein, carbs: totalCarbs, fat: totalFat },
      macroPercentages: { protein: Math.round(proteinPct * 100), carbs: Math.round(carbsPct * 100), fat: Math.round(fatPct * 100) },
      dietaryPrefs,
      exclusions,
      plan,
      tips: [
        "Adjust portion sizes based on your activity level",
        "Drink 2-3L of water throughout the day",
        "Consider meal prepping for easier adherence",
        "Track your macros using a food scale for accuracy",
      ],
      // Enhanced: Fasting window recommendations
      fastingRecommendations: dietaryPrefs.includes("keto") || calories < 1800
        ? {
            suggestedProtocol: "16:8 Intermittent Fasting",
            eatingWindow: "12:00 PM - 8:00 PM",
            fastingWindow: "8:00 PM - 12:00 PM (next day)",
            benefits: [
              "Improved insulin sensitivity",
              "Enhanced fat burning",
              "Better metabolic flexibility",
            ],
            notes: "This meal plan works well with a 16:8 fasting protocol. Adjust meal timing to fit your eating window.",
          }
        : calories < 2500
        ? {
            suggestedProtocol: "14:10 Intermittent Fasting",
            eatingWindow: "10:00 AM - 8:00 PM",
            fastingWindow: "8:00 PM - 10:00 AM (next day)",
            benefits: [
              "Metabolic benefits",
              "Improved digestion",
              "Better sleep quality",
            ],
            notes: "Optional fasting protocol. You can eat normally if preferred.",
          }
        : null,
      // Enhanced: Electrolyte recommendations
      electrolyteRecommendations: {
        sodium: "2,000-3,000 mg per day (add 1/8 tsp pink Himalayan salt to water if needed)",
        potassium: "2,000-3,000 mg per day (from foods: bananas, avocados, leafy greens, or supplement)",
        magnesium: "400-600 mg per day (magnesium glycinate before bed, or from foods: nuts, seeds, dark chocolate)",
        notes: "Especially important if you're doing intermittent fasting, low-carb, or high-intensity training.",
      },
    };
  }
});
