import { z } from "zod";
import { registerTool } from "./index";

type SupplementRecommendation = {
  name: string;
  dosage: string;
  timing: string;
  purpose: string;
  duration?: string;
  notes?: string;
  cost?: string;
};

type SupplementStack = {
  supplements: SupplementRecommendation[];
  totalCost?: string;
  timingSchedule: Array<{
    time: string;
    supplements: string[];
    notes?: string;
  }>;
  interactions?: string[];
  precautions?: string[];
};

// Supplement database based on evidence-based biohacking protocols
const SUPPLEMENT_DATABASE = {
  sleep: [
    {
      name: "Magnesium Glycinate",
      dosage: "400-600mg",
      timing: "30-60 minutes before bed",
      purpose: "Promotes relaxation, improves sleep quality",
      cost: "£0.10-0.15/day",
      notes: "Most bioavailable form, reduces muscle tension",
    },
    {
      name: "L-Theanine",
      dosage: "200-400mg",
      timing: "30-60 minutes before bed",
      purpose: "Reduces anxiety, promotes calm",
      cost: "£0.08-0.12/day",
      notes: "Can be taken with magnesium, from green tea",
    },
    {
      name: "Apigenin",
      dosage: "50mg",
      timing: "30-60 minutes before bed",
      purpose: "Natural sedative, improves sleep depth",
      cost: "£0.15-0.25/day",
      notes: "Found in chamomile tea, or as supplement",
    },
    {
      name: "Glycine",
      dosage: "3g",
      timing: "Before bed",
      purpose: "Improves sleep quality, lowers body temperature",
      cost: "£0.05-0.10/day",
      notes: "Can improve deep sleep duration",
    },
  ],
  longevity: [
    {
      name: "NMN (Nicotinamide Mononucleotide)",
      dosage: "250-500mg",
      timing: "Morning, on empty stomach",
      purpose: "NAD+ precursor, cellular energy, longevity",
      cost: "£1.50-3.00/day",
      notes: "Research on longevity, may slow aging",
    },
    {
      name: "Resveratrol",
      dosage: "250-500mg",
      timing: "With fat-containing meal",
      purpose: "Sirtuin activation, longevity pathways",
      cost: "£0.50-1.00/day",
      notes: "Fat-soluble, take with food",
    },
    {
      name: "Metformin (prescription)",
      dosage: "500-1000mg",
      timing: "As prescribed by doctor",
      purpose: "Longevity, insulin sensitivity",
      cost: "Prescription cost",
      notes: "Requires medical consultation, off-label use",
    },
    {
      name: "Omega-3 (EPA/DHA)",
      dosage: "2-3g EPA/DHA combined",
      timing: "With meals",
      purpose: "Anti-inflammatory, cardiovascular health",
      cost: "£0.30-0.60/day",
      notes: "High-quality fish oil, third-party tested",
    },
  ],
  performance: [
    {
      name: "Creatine Monohydrate",
      dosage: "5g daily (or 20g loading for 5 days)",
      timing: "Post-workout or anytime",
      purpose: "Strength, power output, muscle recovery",
      cost: "£0.05-0.10/day",
      notes: "Most researched supplement, very safe",
    },
    {
      name: "Beta-Alanine",
      dosage: "3-5g daily",
      timing: "Pre-workout or split doses",
      purpose: "Endurance, reduces fatigue",
      cost: "£0.15-0.25/day",
      notes: "May cause tingling (normal), build up over time",
    },
    {
      name: "Citrulline Malate",
      dosage: "6-8g",
      timing: "30 minutes before workout",
      purpose: "Increased blood flow, endurance",
      cost: "£0.20-0.35/day",
      notes: "Improves workout performance and recovery",
    },
    {
      name: "Beetroot Powder",
      dosage: "5-10g",
      timing: "30-60 minutes before workout",
      purpose: "Nitric oxide, endurance",
      cost: "£0.25-0.40/day",
      notes: "Natural source of nitrates",
    },
  ],
  recovery: [
    {
      name: "Magnesium",
      dosage: "400-600mg",
      timing: "Evening or post-workout",
      purpose: "Muscle recovery, sleep quality",
      cost: "£0.10-0.15/day",
      notes: "Essential for muscle function",
    },
    {
      name: "Zinc",
      dosage: "15-30mg",
      timing: "With food",
      purpose: "Immune function, recovery",
      cost: "£0.05-0.10/day",
      notes: "Don't exceed 40mg/day, take with food",
    },
    {
      name: "Vitamin D3",
      dosage: "2000-5000 IU",
      timing: "With fat-containing meal",
      purpose: "Immune function, recovery, mood",
      cost: "£0.05-0.10/day",
      notes: "Fat-soluble, take with meal, test levels regularly",
    },
    {
      name: "BCAAs (optional)",
      dosage: "5-10g",
      timing: "During/after workout",
      purpose: "Muscle recovery (debated efficacy)",
      cost: "£0.30-0.50/day",
      notes: "Not essential if adequate protein intake",
    },
  ],
  stress: [
    {
      name: "Ashwagandha",
      dosage: "300-600mg",
      timing: "Evening or as needed",
      purpose: "Adaptogen, reduces cortisol, stress",
      cost: "£0.20-0.35/day",
      notes: "KSM-66 or Sensoril extracts, cycle 8-12 weeks",
    },
    {
      name: "Rhodiola Rosea",
      dosage: "400-600mg",
      timing: "Morning (can cause alertness)",
      purpose: "Adaptogen, stress resilience, energy",
      cost: "£0.25-0.40/day",
      notes: "Take in morning, may interfere with sleep",
    },
    {
      name: "Phosphatidylserine",
      dosage: "300-600mg",
      timing: "Evening or before stressful events",
      purpose: "Cortisol reduction, cognitive function",
      cost: "£0.50-0.80/day",
      notes: "Effective for stress and cortisol management",
    },
    {
      name: "L-Theanine",
      dosage: "200-400mg",
      timing: "As needed or daily",
      purpose: "Anxiety reduction, calm focus",
      cost: "£0.08-0.12/day",
      notes: "Can be taken with caffeine for focused energy",
    },
  ],
  methylation: [
    {
      name: "Methylcobalamin (B12)",
      dosage: "1000-5000mcg",
      timing: "Morning, sublingual or injection",
      purpose: "Methylation support, energy, neurological health",
      cost: "£0.15-0.50/day",
      notes: "Methylated form, sublingual or injectable preferred",
    },
    {
      name: "Methyl Folate (5-MTHF)",
      dosage: "400-800mcg",
      timing: "With B12",
      purpose: "Methylation support, MTHFR support",
      cost: "£0.10-0.20/day",
      notes: "Methylated form, essential if MTHFR mutation",
    },
    {
      name: "B6 (P5P)",
      dosage: "50-100mg",
      timing: "With other B vitamins",
      purpose: "Methylation cofactor, neurotransmitter support",
      cost: "£0.05-0.10/day",
      notes: "Active form (P5P), don't exceed 100mg long-term",
    },
    {
      name: "TMG (Trimethylglycine)",
      dosage: "500-2000mg",
      timing: "With B vitamins",
      purpose: "Methyl donor, homocysteine reduction",
      cost: "£0.20-0.40/day",
      notes: "Supports methylation cycle",
    },
  ],
  cognitive: [
    {
      name: "Lion's Mane",
      dosage: "500-1000mg",
      timing: "Morning or split doses",
      purpose: "Cognitive function, nerve growth factor",
      cost: "£0.40-0.70/day",
      notes: "Extract preferred, may improve memory and focus",
    },
    {
      name: "Alpha-GPC",
      dosage: "300-600mg",
      timing: "Morning or pre-cognitive work",
      purpose: "Acetylcholine support, cognitive enhancement",
      cost: "£0.50-1.00/day",
      notes: "Powerful cognitive enhancer, use strategically",
    },
    {
      name: "Bacopa Monnieri",
      dosage: "300-600mg",
      timing: "With food",
      purpose: "Memory, learning, cognitive function",
      cost: "£0.25-0.45/day",
      notes: "Takes 4-8 weeks to show effects",
    },
    {
      name: "Omega-3 (DHA)",
      dosage: "1-2g DHA",
      timing: "With meals",
      purpose: "Brain health, cognitive function",
      cost: "£0.30-0.60/day",
      notes: "DHA is critical for brain health",
    },
  ],
  general: [
    {
      name: "Multivitamin",
      dosage: "As directed",
      timing: "With food",
      purpose: "Foundation nutrition, fill gaps",
      cost: "£0.20-0.50/day",
      notes: "High-quality, third-party tested",
    },
    {
      name: "Vitamin D3 + K2",
      dosage: "2000-5000 IU D3, 100-200mcg K2",
      timing: "With fat-containing meal",
      purpose: "Bone health, immune function, cardiovascular",
      cost: "£0.10-0.20/day",
      notes: "K2 helps direct calcium to bones",
    },
    {
      name: "Magnesium",
      dosage: "400-600mg",
      timing: "Evening",
      purpose: "Essential mineral, most people deficient",
      cost: "£0.10-0.15/day",
      notes: "Glycinate or citrate form preferred",
    },
    {
      name: "Probiotics",
      dosage: "10-50 billion CFU",
      timing: "With or without food",
      purpose: "Gut health, immune function",
      cost: "£0.30-0.60/day",
      notes: "Strain-specific for different benefits",
    },
  ],
};

export const supplementRecommender = registerTool({
  name: "supplementRecommender",
  description: "Recommend supplements based on goals, current state, and biohacking protocols. Provides dosages, timing, stacking, and safety information.",
  input: z.object({
    goals: z.array(z.enum(["sleep", "longevity", "performance", "recovery", "stress", "cognitive", "methylation", "general"])).min(1),
    currentSupplements: z.array(z.string()).default([]),
    budget: z.enum(["low", "medium", "high", "unlimited"]).default("medium"),
    experience: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
    avoidInteractions: z.array(z.string()).default([]),
    timingPreferences: z.object({
      morning: z.boolean().default(true),
      afternoon: z.boolean().default(false),
      evening: z.boolean().default(true),
      withMeals: z.boolean().default(true),
    }).optional(),
  }),
  async handler({ goals, currentSupplements, budget, experience, avoidInteractions, timingPreferences }) {
    const recommendations: SupplementRecommendation[] = [];
    const usedSupplements = new Set<string>();
    const interactions: string[] = [];
    const precautions: string[] = [];

    // Budget constraints
    const budgetLimits = {
      low: 5, // Maximum number of supplements
      medium: 8,
      high: 12,
      unlimited: 20,
    };

    const maxSupplements = budgetLimits[budget];

    // Collect supplements based on goals (prioritized)
    for (const goal of goals) {
      const goalSupplements = SUPPLEMENT_DATABASE[goal as keyof typeof SUPPLEMENT_DATABASE] || [];
      
      for (const supp of goalSupplements) {
        // Skip if already recommended
        if (usedSupplements.has(supp.name.toLowerCase())) continue;
        
        // Skip if user wants to avoid it
        if (avoidInteractions.some(avoid => supp.name.toLowerCase().includes(avoid.toLowerCase()))) continue;

        // Check budget (for expensive supplements)
        if (budget === "low" && (supp.cost && parseFloat(supp.cost.replace("£", "").split("-")[0]) > 0.50)) {
          continue;
        }

        recommendations.push(supp);
        usedSupplements.add(supp.name.toLowerCase());

        // Limit total supplements based on budget
        if (recommendations.length >= maxSupplements) break;
      }

      if (recommendations.length >= maxSupplements) break;
    }

    // Remove any current supplements from recommendations (user already has them)
    const currentLower = currentSupplements.map(s => s.toLowerCase());
    const filteredRecommendations = recommendations.filter(
      supp => !currentLower.some(current => supp.name.toLowerCase().includes(current) || current.includes(supp.name.toLowerCase()))
    );

    // For beginners, simplify and prioritize essentials
    if (experience === "beginner" && filteredRecommendations.length > 5) {
      // Prioritize: general, sleep, recovery
      const priorityOrder = ["general", "sleep", "recovery", "stress"];
      const prioritized = filteredRecommendations
        .sort((a, b) => {
          const aPriority = goals.findIndex(g => 
            Object.entries(SUPPLEMENT_DATABASE).find(([key, supps]) => 
              supps.includes(a) && key === g
            )
          );
          const bPriority = goals.findIndex(g => 
            Object.entries(SUPPLEMENT_DATABASE).find(([key, supps]) => 
              supps.includes(b) && key === g
            )
          );
          return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
        })
        .slice(0, 5);
      
      filteredRecommendations.splice(0, filteredRecommendations.length, ...prioritized);
    }

    // Build timing schedule
    const timingSchedule: Array<{ time: string; supplements: string[]; notes?: string }> = [];
    const morning: string[] = [];
    const afternoon: string[] = [];
    const evening: string[] = [];
    const withMeals: string[] = [];

    filteredRecommendations.forEach(supp => {
      const timing = supp.timing.toLowerCase();
      
      if (timing.includes("morning") || timing.includes("empty stomach")) {
        morning.push(supp.name);
      } else if (timing.includes("evening") || timing.includes("bed") || timing.includes("before bed")) {
        evening.push(supp.name);
      } else if (timing.includes("workout") || timing.includes("pre-workout")) {
        afternoon.push(supp.name);
      } else {
        withMeals.push(supp.name);
      }
    });

    if (morning.length > 0) {
      timingSchedule.push({
        time: "Morning (upon waking)",
        supplements: morning,
        notes: "Take on empty stomach unless specified otherwise",
      });
    }

    if (afternoon.length > 0) {
      timingSchedule.push({
        time: "Pre/Post Workout",
        supplements: afternoon,
      });
    }

    if (withMeals.length > 0 && morning.length === 0) {
      timingSchedule.push({
        time: "With Meals",
        supplements: withMeals,
        notes: "Take with food to improve absorption",
      });
    }

    if (evening.length > 0) {
      timingSchedule.push({
        time: "Evening (30-60 min before bed)",
        supplements: evening,
        notes: "Promotes sleep and recovery",
      });
    }

    // Calculate approximate cost
    const costs = filteredRecommendations
      .map(s => {
        if (!s.cost) return 0;
        const costStr = s.cost.replace("£", "").split("-")[0];
        return parseFloat(costStr) || 0;
      })
      .filter(c => c > 0);

    const dailyCost = costs.reduce((sum, cost) => sum + cost, 0);
    const monthlyCost = dailyCost * 30;

    // Add interactions and precautions
    if (filteredRecommendations.some(s => s.name.includes("Magnesium")) && 
        filteredRecommendations.some(s => s.name.includes("Zinc"))) {
      interactions.push("Magnesium and Zinc compete for absorption - take 2 hours apart");
    }

    if (filteredRecommendations.some(s => s.name.includes("Iron")) && 
        filteredRecommendations.some(s => s.name.includes("Calcium"))) {
      interactions.push("Iron and Calcium compete for absorption - take separately");
    }

    if (experience === "beginner") {
      precautions.push("Start with one supplement at a time to assess tolerance");
      precautions.push("Consult healthcare provider before starting new supplements");
    }

    if (filteredRecommendations.some(s => s.name.includes("Metformin"))) {
      precautions.push("Metformin requires medical consultation and prescription");
    }

    const stack: SupplementStack = {
      supplements: filteredRecommendations,
      timingSchedule,
      interactions: interactions.length > 0 ? interactions : undefined,
      precautions: precautions.length > 0 ? precautions : undefined,
    };

    if (dailyCost > 0) {
      stack.totalCost = `~£${dailyCost.toFixed(2)}/day (~£${monthlyCost.toFixed(2)}/month)`;
    }

    return {
      goals,
      experience,
      budget,
      stack,
      recommendations: `Based on your goals (${goals.join(", ")}), experience level (${experience}), and budget (${budget}), here are my recommendations.`,
    };
  },
});

