import { z } from "zod";
import { registerTool } from "./index";

type ProtocolStep = {
  day: number;
  category: string;
  action: string;
  details: string;
  timing?: string;
  notes?: string;
};

type ProtocolPhase = {
  name: string;
  duration: string;
  description: string;
  goals: string[];
  steps: ProtocolStep[];
};

type ProtocolOutput = {
  title: string;
  description: string;
  goals: string[];
  duration: string;
  phases: ProtocolPhase[];
  dailyRoutine: Array<{
    time: string;
    actions: string[];
  }>;
  metrics: Array<{
    metric: string;
    howToMeasure: string;
    target?: string;
  }>;
  supplements?: Array<{
    name: string;
    dosage: string;
    timing: string;
    purpose: string;
  }>;
  tips: string[];
  warnings: string[];
};

export const protocolBuilder = registerTool({
  name: "protocolBuilder",
  description: "Generate comprehensive, personalized biohacking protocols combining nutrition, sleep, exercise, supplements, and recovery. Creates multi-phase protocols tailored to user goals and current state.",
  input: z.object({
    goals: z.array(z.enum([
      "longevity",
      "performance",
      "weight_loss",
      "muscle_gain",
      "energy",
      "sleep",
      "stress_reduction",
      "cognitive_enhancement",
      "recovery",
      "hormonal_optimization",
    ])).min(1),
    currentState: z.object({
      age: z.number().int().min(18).max(100).optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
      sleepHours: z.number().min(4).max(12).optional(),
      currentIssues: z.array(z.string()).optional(),
      dietaryRestrictions: z.array(z.string()).optional(),
      medicalConditions: z.array(z.string()).optional(),
    }).optional(),
    preferences: z.object({
      fasting: z.boolean().optional(),
      vegan: z.boolean().optional(),
      budget: z.enum(["low", "medium", "high"]).optional(),
      timeAvailable: z.enum(["minimal", "moderate", "extensive"]).optional(),
      experience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    }).optional(),
    duration: z.enum(["1_week", "2_weeks", "4_weeks", "8_weeks", "12_weeks"]).default("4_weeks"),
  }),
  async handler({ goals, currentState, preferences, duration }, _context) {
    const durationWeeks = {
      "1_week": 1,
      "2_weeks": 2,
      "4_weeks": 4,
      "8_weeks": 8,
      "12_weeks": 12,
    }[duration];

    const isLongevity = goals.includes("longevity");
    const isPerformance = goals.includes("performance");
    const isWeightLoss = goals.includes("weight_loss");
    const isMuscleGain = goals.includes("muscle_gain");
    const isEnergy = goals.includes("energy");
    const isSleep = goals.includes("sleep");
    const isStress = goals.includes("stress_reduction");
    const isCognitive = goals.includes("cognitive_enhancement");
    const isRecovery = goals.includes("recovery");
    const isHormonal = goals.includes("hormonal_optimization");

    const isFemale = currentState?.gender === "female";
    const age = currentState?.age || 35;
    const activityLevel = currentState?.activityLevel || "moderate";
    const experience = preferences?.experience || "intermediate";
    const timeAvailable = preferences?.timeAvailable || "moderate";
    const budget = preferences?.budget || "medium";
    const fasting = preferences?.fasting || false;
    const vegan = preferences?.vegan || false;

    // Generate protocol title
    const titleParts: string[] = [];
    if (isLongevity) titleParts.push("Longevity");
    if (isPerformance) titleParts.push("Performance");
    if (isWeightLoss) titleParts.push("Weight Loss");
    if (isMuscleGain) titleParts.push("Muscle Gain");
    if (isEnergy) titleParts.push("Energy");
    if (isSleep) titleParts.push("Sleep Optimization");
    if (isStress) titleParts.push("Stress Reduction");
    if (isCognitive) titleParts.push("Cognitive Enhancement");
    if (titleParts.length === 0) titleParts.push("Biohacking");

    const title = `${titleParts.join(" & ")} Protocol - ${durationWeeks} Week${durationWeeks > 1 ? "s" : ""}`;

    // Build phases
    const phases: ProtocolPhase[] = [];

    // Phase 1: Foundation (Week 1)
    phases.push({
      name: "Foundation & Adaptation",
      duration: "Week 1",
      description: "Establish baseline habits and introduce core protocols gradually",
      goals: ["Habit formation", "Baseline measurement", "Gentle introduction"],
      steps: buildFoundationSteps(goals, isFemale, fasting, vegan, timeAvailable),
    });

    // Phase 2: Optimization (Weeks 2-3 or 2-4)
    if (durationWeeks >= 4) {
      phases.push({
        name: "Optimization & Intensification",
        duration: `Weeks 2-${Math.min(4, Math.ceil(durationWeeks / 2))}`,
        description: "Intensify protocols and optimize based on initial results",
        goals: ["Optimize protocols", "Increase intensity", "Track progress"],
        steps: buildOptimizationSteps(goals, isFemale, activityLevel, experience),
      });
    }

    // Phase 3: Mastery (Weeks 5-8 or later)
    if (durationWeeks >= 8) {
      phases.push({
        name: "Mastery & Maintenance",
        duration: `Weeks ${Math.ceil(durationWeeks / 2) + 1}-${durationWeeks}`,
        description: "Advanced protocols and long-term maintenance strategies",
        goals: ["Advanced techniques", "Habit maintenance", "Long-term sustainability"],
        steps: buildMasterySteps(goals, isFemale, experience),
      });
    }

    // Daily routine
    const dailyRoutine = buildDailyRoutine(goals, isFemale, fasting, timeAvailable, activityLevel);

    // Metrics to track
    const metrics = buildMetrics(goals, isFemale);

    // Supplements (if applicable)
    const supplements = buildSupplements(goals, budget, isFemale);

    // Tips
    const tips = [
      "Consistency is more important than perfection - aim for 80% adherence",
      "Track your progress daily to identify what's working",
      "Listen to your body and adjust protocols as needed",
      "Start with one phase at a time if feeling overwhelmed",
      "Celebrate small wins and progress markers",
    ];

    // Warnings
    const warnings: string[] = [
      "Consult your healthcare provider before starting any new protocol, especially if you have medical conditions",
      "Stop any protocol that causes discomfort or adverse effects",
      "This protocol is for educational purposes only and not medical advice",
    ];

    if (fasting) {
      warnings.push("Intermittent fasting may not be suitable for everyone - monitor your energy levels and adjust as needed");
    }

    if (isFemale && isHormonal) {
      warnings.push("Hormonal protocols for women should consider menstrual cycle phases - consult with a healthcare provider");
    }

    const protocol: ProtocolOutput = {
      title,
      description: `A comprehensive ${durationWeeks}-week biohacking protocol designed to help you achieve: ${goals.join(", ")}. This protocol combines evidence-based practices from nutrition, sleep optimization, exercise, supplementation, and recovery.`,
      goals,
      duration: `${durationWeeks} weeks`,
      phases,
      dailyRoutine,
      metrics,
      tips,
      warnings,
    };

    if (supplements.length > 0) {
      protocol.supplements = supplements;
    }

    return {
      protocol,
      summary: `Your personalized ${durationWeeks}-week protocol focusing on: ${goals.join(", ")}. This protocol is tailored to your ${experience} experience level and ${timeAvailable} time availability.`,
    };
  },
});

// Helper functions to build protocol steps
function buildFoundationSteps(
  goals: string[],
  isFemale: boolean,
  fasting: boolean,
  vegan: boolean,
  timeAvailable: string
): ProtocolStep[] {
  const steps: ProtocolStep[] = [];
  let day = 1;

  // Sleep optimization (universal)
  steps.push({
    day: day++,
    category: "Sleep",
    action: "Establish consistent sleep schedule",
    details: "Go to bed and wake at the same time daily. Aim for 7-9 hours of sleep.",
    timing: "Evening",
    notes: "Set alarms for both bedtime and wake time",
  });

  steps.push({
    day: day++,
    category: "Sleep",
    action: "Morning sunlight exposure",
    details: "View bright light (sunlight or 10,000 lux device) for 5-10 minutes within 1 hour of waking.",
    timing: "Morning",
    notes: "This sets your circadian clock",
  });

  // Nutrition
  if (!fasting) {
    steps.push({
      day: day++,
      category: "Nutrition",
      action: "Track daily nutrition",
      details: "Start tracking your meals and macros. Aim for balanced nutrition with adequate protein.",
      timing: "All day",
      notes: "Use a food tracking app or journal",
    });
  } else {
    steps.push({
      day: day++,
      category: "Nutrition",
      action: "Begin intermittent fasting",
      details: "Start with 12-hour fasting window (e.g., 8 PM - 8 AM). Gradually extend if comfortable.",
      timing: "Evening to morning",
      notes: "Stay hydrated with water, tea, or black coffee during fasting window",
    });
  }

  // Exercise
  if (timeAvailable !== "minimal") {
    steps.push({
      day: day++,
      category: "Exercise",
      action: "Establish baseline activity",
      details: "Begin with 3-4 days/week of movement. Start with walking, light cardio, or bodyweight exercises.",
      timing: "Morning or afternoon",
      notes: "Focus on consistency over intensity in the first week",
    });
  }

  // Stress management
  steps.push({
    day: day++,
    category: "Stress",
    action: "Daily breathing exercises",
    details: "Practice 5-10 minutes of deep breathing or meditation daily.",
    timing: "Morning or evening",
    notes: "Try box breathing (4-4-4-4) or physiological sighs",
  });

  // Hydration
  steps.push({
    day: 7,
    category: "Hydration",
    action: "Optimize hydration",
    details: "Aim for 2-3L of water daily. Add electrolytes if needed.",
    timing: "Throughout day",
    notes: "Monitor urine color - pale yellow is ideal",
  });

  return steps;
}

function buildOptimizationSteps(
  goals: string[],
  isFemale: boolean,
  activityLevel: string,
  experience: string
): ProtocolStep[] {
  const steps: ProtocolStep[] = [];
  let day = 8;

  // Advanced sleep
  steps.push({
    day: day++,
    category: "Sleep",
    action: "Optimize sleep environment",
    details: "Cool room (65-68°F), complete darkness, white noise if needed.",
    timing: "Evening",
    notes: "Remove all light sources, use blackout curtains",
  });

  // Exercise intensification
  if (activityLevel !== "sedentary") {
    steps.push({
      day: day++,
      category: "Exercise",
      action: "Increase training intensity",
      details: "Add resistance training or higher intensity cardio. Aim for 4-5 sessions/week.",
      timing: "Morning or afternoon",
      notes: "Allow for rest days and recovery",
    });
  }

  // Cold/hot therapy (for advanced)
  if (experience === "advanced") {
    steps.push({
      day: day++,
      category: "Recovery",
      action: "Introduce cold exposure",
      details: "Start with 30-60 second cold showers. Gradually increase duration.",
      timing: "Morning or post-workout",
      notes: "Start with lukewarm and gradually decrease temperature",
    });
  }

  // Nutrition optimization
  steps.push({
    day: day++,
    category: "Nutrition",
    action: "Optimize meal timing",
    details: "Align meals with circadian rhythm. Larger meals earlier in day if possible.",
    timing: "Throughout day",
    notes: "Consider time-restricted eating if not already fasting",
  });

  return steps;
}

function buildMasterySteps(goals: string[], isFemale: boolean, experience: string): ProtocolStep[] {
  const steps: ProtocolStep[] = [];
  let day = 29;

  // Advanced protocols
  if (experience === "advanced") {
    steps.push({
      day: day++,
      category: "Recovery",
      action: "Sauna protocol",
      details: "15-20 minutes sauna sessions 2-3x/week for recovery and longevity.",
      timing: "Post-workout or evening",
      notes: "Stay hydrated, cool down gradually",
    });
  }

  // Long-term habits
  steps.push({
    day: day++,
    category: "Lifestyle",
    action: "Habit stacking",
    details: "Combine multiple protocols into daily routines for long-term sustainability.",
    timing: "Throughout day",
    notes: "Create morning and evening routines",
  });

  return steps;
}

function buildDailyRoutine(
  goals: string[],
  isFemale: boolean,
  fasting: boolean,
  timeAvailable: string,
  activityLevel: string
): Array<{ time: string; actions: string[] }> {
  const routine: Array<{ time: string; actions: string[] }> = [];

  routine.push({
    time: "6:00-7:00 AM",
    actions: [
      "Wake at consistent time",
      "View bright light (sunlight) for 5-10 minutes",
      "Hydrate with water (16-32 oz)",
      fasting ? "Continue fasting (if doing IF)" : "Light breakfast or fast",
    ],
  });

  routine.push({
    time: "7:00-9:00 AM",
    actions: [
      timeAvailable !== "minimal" ? "Morning exercise (if preferred)" : "Light movement or stretching",
      "Healthy breakfast (if not fasting)",
      "Meditation or breathing exercises (5-10 min)",
    ],
  });

  routine.push({
    time: "9:00 AM - 12:00 PM",
    actions: [
      "Work/productive activities",
      "Stay hydrated",
      "Take any morning supplements",
    ],
  });

  routine.push({
    time: "12:00-2:00 PM",
    actions: [
      "Lunch (if not fasting)",
      "Get natural light exposure if possible",
      "Light walk if time permits",
    ],
  });

  routine.push({
    time: "2:00-6:00 PM",
    actions: [
      activityLevel !== "sedentary" ? "Afternoon workout (if preferred)" : "Continue work/activities",
      "Stay hydrated",
      "Afternoon snack if needed",
    ],
  });

  routine.push({
    time: "6:00-8:00 PM",
    actions: [
      "Dinner (if not fasting)",
      "Start dimming lights",
      "Avoid screens or use blue light blockers",
    ],
  });

  routine.push({
    time: "8:00-10:00 PM",
    actions: [
      "Wind-down routine",
      "Reading, journaling, or light stretching",
      "Prepare for sleep",
      "Take sleep supplements if using (30-60 min before bed)",
    ],
  });

  routine.push({
    time: "10:00 PM",
    actions: [
      "Target bedtime",
      "Complete darkness",
      "Cool room temperature (65-68°F)",
    ],
  });

  return routine;
}

function buildMetrics(goals: string[], isFemale: boolean): Array<{ metric: string; howToMeasure: string; target?: string }> {
  const metrics: Array<{ metric: string; howToMeasure: string; target?: string }> = [];

  // Universal metrics
  metrics.push({
    metric: "Sleep Quality",
    howToMeasure: "Track sleep duration, wake-ups, and how refreshed you feel",
    target: "7-9 hours, minimal wake-ups, feel refreshed",
  });

  metrics.push({
    metric: "Energy Levels",
    howToMeasure: "Rate energy 1-10 throughout the day",
    target: "Consistent 7-8/10 throughout day",
  });

  // Goal-specific metrics
  if (goals.includes("weight_loss")) {
    metrics.push({
      metric: "Weight",
      howToMeasure: "Weekly weigh-in at same time (morning, after bathroom)",
      target: "0.5-1% body weight per week",
    });
  }

  if (goals.includes("performance")) {
    metrics.push({
      metric: "Workout Performance",
      howToMeasure: "Track strength, endurance, or speed metrics",
      target: "Progressive improvement",
    });
  }

  if (goals.includes("stress_reduction")) {
    metrics.push({
      metric: "Stress Levels",
      howToMeasure: "Rate stress 1-10 daily, track HRV if available",
      target: "Lower stress ratings, improved HRV",
    });
  }

  return metrics;
}

function buildSupplements(goals: string[], budget: string, isFemale: boolean): Array<{ name: string; dosage: string; timing: string; purpose: string }> {
  const supplements: Array<{ name: string; dosage: string; timing: string; purpose: string }> = [];

  // Foundation supplements
  if (budget !== "low") {
    supplements.push({
      name: "Vitamin D3 + K2",
      dosage: "2000-5000 IU D3, 100-200mcg K2",
      timing: "Morning with food",
      purpose: "Immune function, bone health",
    });

    supplements.push({
      name: "Magnesium",
      dosage: "400-600mg",
      timing: "Evening",
      purpose: "Sleep quality, recovery",
    });
  }

  // Goal-specific supplements
  if (goals.includes("sleep")) {
    supplements.push({
      name: "L-Theanine",
      dosage: "200-400mg",
      timing: "30-60 min before bed",
      purpose: "Promotes calm and sleep",
    });
  }

  if (goals.includes("longevity") && budget === "high") {
    supplements.push({
      name: "NMN",
      dosage: "250-500mg",
      timing: "Morning",
      purpose: "NAD+ support, longevity",
    });
  }

  return supplements;
}

