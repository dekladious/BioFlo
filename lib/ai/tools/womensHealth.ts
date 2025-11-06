import { z } from "zod";
import { registerTool } from "./index";

type CyclePhase = "menstrual" | "follicular" | "ovulatory" | "luteal";

type CycleProtocol = {
  phase: CyclePhase;
  days: string;
  description: string;
  recommendations: {
    nutrition: string[];
    exercise: string[];
    supplements: Array<{
      name: string;
      dosage: string;
      timing: string;
      purpose: string;
    }>;
    lifestyle: string[];
  };
};

type WomensHealthProtocol = {
  title: string;
  description: string;
  cyclePhase?: CyclePhase;
  protocols: CycleProtocol[];
  generalProtocol: {
    nutrition: string[];
    exercise: string[];
    supplements: Array<{
      name: string;
      dosage: string;
      timing: string;
      purpose: string;
    }>;
    lifestyle: string[];
  };
  hormonalOptimization: {
    strategies: string[];
    supplements: Array<{
      name: string;
      dosage: string;
      timing: string;
      purpose: string;
    }>;
  };
  tips: string[];
  warnings: string[];
};

export const womensHealth = registerTool({
  name: "womensHealth",
  description: "Generate personalized biohacking protocols for women, including menstrual cycle-based optimization, hormonal health, and female-specific protocols.",
  input: z.object({
    goals: z.array(z.enum([
      "hormonal_balance",
      "cycle_optimization",
      "energy",
      "pcos",
      "menopause",
      "fertility",
      "performance",
      "weight_management",
      "mood",
      "libido",
    ])).min(1),
    cycleInfo: z.object({
      cycleLength: z.number().int().min(21).max(35).optional(), // days
      currentPhase: z.enum(["menstrual", "follicular", "ovulatory", "luteal"]).optional(),
      dayOfCycle: z.number().int().min(1).max(35).optional(),
      issues: z.array(z.enum(["irregular", "heavy_bleeding", "cramps", "pms", "mood_swings", "low_libido"])).optional(),
    }).optional(),
    age: z.number().int().min(18).max(100).optional(),
    lifeStage: z.enum(["reproductive", "perimenopause", "menopause", "postmenopause"]).optional(),
  }),
  async handler({ goals, cycleInfo, age, lifeStage }) {
    const isHormonalBalance = goals.includes("hormonal_balance");
    const isCycleOptimization = goals.includes("cycle_optimization");
    const isPCOS = goals.includes("pcos");
    const isMenopause = goals.includes("menopause");
    const isFertility = goals.includes("fertility");
    const isPerformance = goals.includes("performance");
    const isWeightManagement = goals.includes("weight_management");
    const isMood = goals.includes("mood");
    const isLibido = goals.includes("libido");

    const cycleLength = cycleInfo?.cycleLength || 28;
    const currentPhase = cycleInfo?.currentPhase;
    const dayOfCycle = cycleInfo?.dayOfCycle;
    const issues = cycleInfo?.issues || [];
    const userAge = age || 35;
    const stage = lifeStage || (userAge < 45 ? "reproductive" : userAge < 55 ? "perimenopause" : "menopause");

    // Build title
    const titleParts: string[] = [];
    if (isCycleOptimization) titleParts.push("Cycle Optimization");
    if (isHormonalBalance) titleParts.push("Hormonal Balance");
    if (isPCOS) titleParts.push("PCOS Support");
    if (isMenopause) titleParts.push("Menopause Support");
    if (titleParts.length === 0) titleParts.push("Women's Health Optimization");

    const title = `${titleParts.join(" & ")} Protocol`;

    // Build cycle-based protocols
    const protocols: CycleProtocol[] = [];

    // Menstrual Phase (Days 1-5)
    protocols.push({
      phase: "menstrual",
      days: "Days 1-5",
      description: "Support recovery and reduce inflammation during menstruation",
      recommendations: {
        nutrition: [
          "Increase iron-rich foods (lean meat, leafy greens, legumes)",
          "Anti-inflammatory foods (fatty fish, turmeric, ginger)",
          "Magnesium-rich foods (dark chocolate, nuts, seeds)",
          "Stay hydrated with electrolytes",
          "Reduce processed foods and sugar",
        ],
        exercise: [
          "Gentle movement: yoga, walking, stretching",
          "Avoid intense workouts",
          "Listen to your body - rest if needed",
          "Focus on recovery and restoration",
        ],
        supplements: [
          {
            name: "Iron (if needed)",
            dosage: "18mg (check levels first)",
            timing: "With vitamin C, away from coffee/tea",
            purpose: "Support iron levels during bleeding",
          },
          {
            name: "Magnesium",
            dosage: "400-600mg",
            timing: "Evening",
            purpose: "Reduce cramps and support relaxation",
          },
          {
            name: "Omega-3",
            dosage: "2-3g EPA/DHA",
            timing: "With meals",
            purpose: "Anti-inflammatory support",
          },
        ],
        lifestyle: [
          "Prioritize rest and recovery",
          "Reduce stress",
          "Warm baths or heating pads for cramps",
          "Supportive self-care practices",
        ],
      },
    });

    // Follicular Phase (Days 6-14)
    protocols.push({
      phase: "follicular",
      days: `Days 6-${Math.floor(cycleLength * 0.5)}`,
      description: "Build energy and strength as estrogen rises",
      recommendations: {
        nutrition: [
          "Higher carbohydrate tolerance - include complex carbs",
          "Adequate protein for muscle building",
          "Support liver function (cruciferous vegetables)",
          "B vitamins for energy production",
        ],
        exercise: [
          "Higher intensity workouts",
          "Strength training (best phase for building muscle)",
          "HIIT and endurance training",
          "Progressive overload",
        ],
        supplements: [
          {
            name: "B-Complex",
            dosage: "As directed",
            timing: "Morning",
            purpose: "Energy production and hormone metabolism",
          },
          {
            name: "DIM (Diindolylmethane)",
            dosage: "100-200mg",
            timing: "With meals",
            purpose: "Support estrogen metabolism",
          },
        ],
        lifestyle: [
          "Best time for challenging goals",
          "Higher energy and motivation",
          "Social activities and new projects",
        ],
      },
    });

    // Ovulatory Phase (Days 13-16)
    protocols.push({
      phase: "ovulatory",
      days: `Days ${Math.floor(cycleLength * 0.45)}-${Math.floor(cycleLength * 0.6)}`,
      description: "Peak energy and performance - maximize output",
      recommendations: {
        nutrition: [
          "Optimal nutrient timing",
          "Higher calorie needs (if training)",
          "Support liver function",
          "Anti-inflammatory foods",
        ],
        exercise: [
          "Peak performance phase",
          "Maximum intensity workouts",
          "Personal records (PRs) possible",
          "Competition or testing",
        ],
        supplements: [
          {
            name: "Zinc",
            dosage: "15-30mg",
            timing: "With food",
            purpose: "Hormone production and immune function",
          },
          {
            name: "Vitamin D3",
            dosage: "2000-5000 IU",
            timing: "With fat-containing meal",
            purpose: "Hormone support and mood",
          },
        ],
        lifestyle: [
          "Peak confidence and communication",
          "Best time for important decisions",
          "Social and relationship activities",
        ],
      },
    });

    // Luteal Phase (Days 15-28)
    protocols.push({
      phase: "luteal",
      days: `Days ${Math.floor(cycleLength * 0.55)}-${cycleLength}`,
      description: "Support progesterone, manage PMS, prepare for menstruation",
      recommendations: {
        nutrition: [
          "Higher protein and healthy fats",
          "Complex carbs for stable blood sugar",
          "Reduce sugar and processed foods",
          "Support serotonin production (tryptophan-rich foods)",
          "Magnesium-rich foods",
        ],
        exercise: [
          "Moderate intensity",
          "Strength maintenance (not building)",
          "Mind-body practices (yoga, pilates)",
          "Reduce intensity if PMS symptoms",
        ],
        supplements: [
          {
            name: "Magnesium",
            dosage: "400-600mg",
            timing: "Evening",
            purpose: "Reduce PMS symptoms, support sleep",
          },
          {
            name: "B6 (P5P)",
            dosage: "50-100mg",
            timing: "Morning",
            purpose: "Support progesterone and mood",
          },
          {
            name: "Evening Primrose Oil",
            dosage: "1000-2000mg",
            timing: "With meals",
            purpose: "PMS support, hormonal balance",
          },
          {
            name: "Chasteberry (Vitex)",
            dosage: "400-800mg",
            timing: "Morning",
            purpose: "Hormonal balance, PMS reduction",
          },
        ],
        lifestyle: [
          "Manage stress (cortisol competes with progesterone)",
          "Prioritize sleep",
          "Supportive self-care",
          "Reduce alcohol and caffeine if sensitive",
        ],
      },
    });

    // General protocol
    const generalProtocol = {
      nutrition: [
        "Balance blood sugar - eat protein, fat, and fiber at each meal",
        "Support liver function for hormone metabolism (cruciferous vegetables)",
        "Adequate healthy fats for hormone production (avocado, olive oil, fatty fish)",
        "Limit processed foods and sugar",
        "Support gut health (probiotics, fiber)",
      ],
      exercise: [
        "Cycle-based training approach",
        "Recovery is crucial - don't overtrain",
        "Include strength training for bone health",
        "Stress management practices",
      ],
      supplements: [
        {
          name: "Magnesium",
          dosage: "400-600mg",
          timing: "Evening",
          purpose: "Hormonal balance, sleep, stress",
        },
        {
          name: "Vitamin D3 + K2",
          dosage: "2000-5000 IU D3, 100-200mcg K2",
          timing: "With fat-containing meal",
          purpose: "Hormone support, bone health",
        },
        {
          name: "Omega-3",
          dosage: "2-3g EPA/DHA",
          timing: "With meals",
          purpose: "Anti-inflammatory, hormonal balance",
        },
        {
          name: "Probiotics",
          dosage: "10-50 billion CFU",
          timing: "With or without food",
          purpose: "Gut health, hormone metabolism",
        },
      ],
      lifestyle: [
        "Prioritize sleep (7-9 hours)",
        "Manage stress (cortisol affects hormones)",
        "Regular meal timing",
        "Support circadian rhythm",
        "Limit alcohol and processed foods",
      ],
    };

    // Hormonal optimization strategies
    const hormonalOptimization = {
      strategies: [
        "Track your cycle to understand your patterns",
        "Adjust nutrition and exercise based on cycle phase",
        "Support liver function for hormone metabolism",
        "Manage stress (cortisol can disrupt hormones)",
        "Optimize sleep (affects all hormones)",
        "Support gut health (affects hormone metabolism)",
        "Maintain healthy body composition",
        "Limit exposure to endocrine disruptors",
      ],
      supplements: [
        {
          name: "DIM (Diindolylmethane)",
          dosage: "100-200mg",
          timing: "With meals",
          purpose: "Support estrogen metabolism",
        },
        {
          name: "Myo-Inositol",
          dosage: "2-4g",
          timing: "Split doses, with meals",
          purpose: "PCOS support, hormonal balance (especially for PCOS)",
        },
        {
          name: "Vitex (Chasteberry)",
          dosage: "400-800mg",
          timing: "Morning",
          purpose: "Hormonal balance, PMS support",
        },
      ],
    };

    // PCOS-specific additions
    if (isPCOS) {
      hormonalOptimization.supplements.push({
        name: "Myo-Inositol + D-Chiro Inositol",
        dosage: "40:1 ratio, 2-4g myo-inositol",
        timing: "Split doses, with meals",
        purpose: "PCOS support, insulin sensitivity",
      });
      hormonalOptimization.strategies.push(
        "Focus on insulin sensitivity (low glycemic foods)",
        "Regular exercise for insulin sensitivity",
        "Consider low-carb or Mediterranean diet",
        "Support weight management if needed"
      );
    }

    // Menopause-specific additions
    if (isMenopause || stage === "menopause") {
      hormonalOptimization.supplements.push({
        name: "Black Cohosh",
        dosage: "20-80mg",
        timing: "Split doses",
        purpose: "Menopause symptom support",
      });
      hormonalOptimization.strategies.push(
        "Support bone health (calcium, vitamin D, weight-bearing exercise)",
        "Manage hot flashes (avoid triggers, cool environment)",
        "Support cardiovascular health",
        "Prioritize strength training for bone density"
      );
    }

    // Tips
    const tips = [
      "Track your cycle to understand your unique patterns",
      "Adjust your protocols based on cycle phase for optimal results",
      "Your body's needs change throughout your cycle - honor that",
      "Listen to your body - rest when needed",
      "Hormonal balance takes time - be patient and consistent",
      "Work with a healthcare provider for hormonal issues",
      "Support your body with proper nutrition and lifestyle",
    ];

    // Warnings
    const warnings: string[] = [
      "Consult with a healthcare provider, especially if you have hormonal imbalances, PCOS, or other medical conditions",
      "Hormonal protocols should be personalized - what works for one person may not work for another",
      "Track your symptoms and adjust protocols as needed",
      "If you experience severe PMS, irregular cycles, or other concerns, consult a healthcare provider",
      "Supplements can interact with medications - consult your healthcare provider",
    ];

    if (isFertility) {
      warnings.push("If trying to conceive, work with a fertility specialist");
      warnings.push("Some supplements may not be suitable during pregnancy");
    }

    const protocol: WomensHealthProtocol = {
      title,
      description: `A comprehensive women's health protocol designed to support ${goals.join(", ")}. This protocol includes cycle-based optimization and hormonal health strategies.`,
      cyclePhase: currentPhase,
      protocols,
      generalProtocol,
      hormonalOptimization,
      tips,
      warnings,
    };

    return {
      protocol,
      summary: `Your personalized women's health protocol focusing on: ${goals.join(", ")}. ${currentPhase ? `Currently in ${currentPhase} phase.` : ""} This protocol is tailored to your ${stage} life stage.`,
    };
  },
});

