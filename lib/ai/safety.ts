/**
 * Safety & Triage Classifier
 * 
 * Classifies user messages into safety categories before AI processing.
 * Implements the comprehensive triage system from the BioFlo AI Safety Specification.
 */

import { runModel } from "./modelRouter";
import { logger } from "@/lib/logger";
import { CRISIS_RESPONSES } from "./policy";

export type TriageCategory =
  | "GENERAL_WELLNESS"
  | "MENTAL_HEALTH_NON_CRISIS"
  | "MENTAL_HEALTH_CRISIS"
  | "MEDICAL_SYMPTOMS_NON_URGENT"
  | "MEDICAL_EMERGENCY_SIGNS"
  | "MODERATE_RISK_BIOHACK"
  | "EXTREME_RISK_BIOHACK";

export type TriageResult = {
  category: TriageCategory;
  reason: string;
};

/**
 * Triage user message to determine safety category and routing
 * 
 * Uses deterministic keyword matching first, then AI classification for ambiguous cases.
 */
export async function triageUserMessage(userMessage: string): Promise<TriageResult> {
  const normalized = userMessage.toLowerCase().trim();

  // First pass: Deterministic keyword detection for critical cases
  const crisisKeywords = [
    "suicide",
    "kill myself",
    "end my life",
    "want to die",
    "self harm",
    "hurt myself",
    "cutting",
    "overdose",
    "harm myself",
    "want to hurt",
    "planning suicide",
    "voices telling me",
  ];

  const emergencyKeywords = [
    "chest pain",
    "can't breathe",
    "difficulty breathing",
    "trouble breathing",
    "stroke",
    "heart attack",
    "severe pain",
    "unconscious",
    "severe bleeding",
    "choking",
    "face drooping",
    "arm weakness",
    "speech difficulty",
    "severe allergic reaction",
    "swelling of tongue",
    "very high fever",
  ];

  // Check for mental health crisis
  if (crisisKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      category: "MENTAL_HEALTH_CRISIS",
      reason: "Detected crisis keywords indicating self-harm or suicidal ideation",
    };
  }

  // Check for medical emergency
  if (emergencyKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      category: "MEDICAL_EMERGENCY_SIGNS",
      reason: "Detected emergency keywords indicating life-threatening symptoms",
    };
  }

  // Second pass: Biohack detection (before general medical/mental health)
  const moderateBiohackKeywords = [
    "3 day fast",
    "three day fast",
    "3-day water fast",
    "water fast for 3 days",
    "sauna protocol",
    "sauna session",
    "ice bath",
    "cold plunge",
    "short ice bath",
    "1-2 minute ice bath",
  ];

  const extremeBiohackKeywords = [
    "5 day fast",
    "7 day fast",
    "extended fast",
    "dry fast",
    "multi-day fast",
    "extreme cold",
    "extreme heat",
    "very cold",
    "very hot",
    "challenge",
    "as long as possible",
    "high-dose supplement",
    "experimental compound",
    "research chemical",
    "illegal substance",
  ];

  const hasModerateBiohack = moderateBiohackKeywords.some((keyword) =>
    normalized.includes(keyword)
  );
  const hasExtremeBiohack = extremeBiohackKeywords.some((keyword) =>
    normalized.includes(keyword)
  );

  if (hasExtremeBiohack) {
    return {
      category: "EXTREME_RISK_BIOHACK",
      reason: "Detected extreme biohacking keywords indicating high-risk protocols",
    };
  }

  if (hasModerateBiohack) {
    return {
      category: "MODERATE_RISK_BIOHACK",
      reason: "Detected moderate biohacking keywords (3-day fast, sauna, short ice bath)",
    };
  }

  // Third pass: Mental health non-crisis indicators
  const mentalHealthKeywords = [
    "anxiety",
    "depressed",
    "depression",
    "stressed",
    "overwhelmed",
    "panic",
    "worried",
    "sad",
    "low mood",
    "feeling down",
    "burnout",
    "trouble sleeping",
    "emotional difficulty",
  ];

  const hasMentalHealthKeywords = mentalHealthKeywords.some((keyword) =>
    normalized.includes(keyword)
  );

  // Fourth pass: Medical symptoms (non-urgent)
  const medicalKeywords = [
    "pain",
    "ache",
    "symptom",
    "diagnosis",
    "condition",
    "disease",
    "illness",
    "sick",
    "nausea",
    "dizziness",
    "headache",
    "chronic",
    "medication",
    "treatment",
  ];

  const hasMedicalKeywords = medicalKeywords.some((keyword) => normalized.includes(keyword));

  // If we have high confidence from keywords, return early
  if (hasMentalHealthKeywords && !crisisKeywords.some((k) => normalized.includes(k))) {
    return {
      category: "MENTAL_HEALTH_NON_CRISIS",
      reason: "Detected mental health keywords without crisis indicators",
    };
  }

  if (hasMedicalKeywords && !emergencyKeywords.some((k) => normalized.includes(k))) {
    return {
      category: "MEDICAL_SYMPTOMS_NON_URGENT",
      reason: "Detected medical keywords without emergency indicators",
    };
  }

  // Fifth pass: AI classification for ambiguous cases
  // Use AI when query is ambiguous or we need higher confidence
  if (hasMentalHealthKeywords || hasMedicalKeywords || normalized.length > 50) {
    try {
      const aiClassification = await classifyWithAI(userMessage);
      return aiClassification;
    } catch (error) {
      logger.warn("Triage: AI classification failed, using keyword fallback", {
        error,
        query: userMessage.substring(0, 100),
      });
      // Fallback to keyword-based classification
      if (hasMentalHealthKeywords) {
        return {
          category: "MENTAL_HEALTH_NON_CRISIS",
          reason: "Keyword fallback: mental health indicators detected",
        };
      }
      if (hasMedicalKeywords) {
        return {
          category: "MEDICAL_SYMPTOMS_NON_URGENT",
          reason: "Keyword fallback: medical indicators detected",
        };
      }
    }
  }

  // Default: General wellness
  return {
    category: "GENERAL_WELLNESS",
    reason: "No specific safety concerns detected",
  };
}

/**
 * Use AI to classify ambiguous queries using the triage prompt
 */
async function classifyWithAI(userMessage: string): Promise<TriageResult> {
  const triagePrompt = `You are a SAFETY AND TRIAGE classifier for an AI health, wellness, and biohacking coach.

Your job is to decide how SAFE it is for the coach to respond normally to the user's message.

Classify the USER_MESSAGE into exactly ONE of the following categories:

- GENERAL_WELLNESS
  - General questions about sleep, stress, habits, exercise, nutrition patterns, light, biohacking concepts, performance, or productivity that do NOT describe specific medical symptoms or mental health crises.

- MENTAL_HEALTH_NON_CRISIS
  - Anxiety, stress, worry, feeling low, trouble sleeping, burnout, or general emotional difficulty.
  - NO mention of self-harm, wanting to die, suicide, harming others, or voices telling them to hurt themselves.

- MENTAL_HEALTH_CRISIS
  - Any mention or clear implication of:
    - Wanting to die.
    - Wanting to hurt themselves (self-harm).
    - Planning suicide.
    - Hearing voices telling them to harm themselves or others.
    - Wanting to harm other people.
  - If there is any doubt: choose MENTAL_HEALTH_CRISIS.

- MEDICAL_SYMPTOMS_NON_URGENT
  - Physical symptoms, medical conditions, or medication questions that seem uncomfortable but not immediately life-threatening.
  - Examples: mild pain, chronic discomfort, long-standing conditions, curiosity about lab results, non-urgent questions about treatment.
  - NO emergency red flags.

- MEDICAL_EMERGENCY_SIGNS
  - Any possible signs of an acute or life-threatening emergency, including but not limited to:
    - Chest pain, pressure, or heaviness.
    - Trouble breathing or feeling like they cannot breathe.
    - Symptoms of stroke (face drooping, arm weakness, speech difficulty).
    - Sudden, severe headache unlike anything before.
    - Severe allergic reaction (trouble breathing, swelling of tongue or throat).
    - Severe bleeding, recent major trauma, very high fever with confusion.
  - If there is any doubt between NON_URGENT and EMERGENCY_SIGNS, choose MEDICAL_EMERGENCY_SIGNS.

- MODERATE_RISK_BIOHACK
  - User is asking how to do or apply a moderately intense biohacking protocol such as:
    - A ~3-day water fast for an otherwise healthy adult.
    - Reasonable sauna use (e.g. 10–30 minute sessions a few times per week).
    - Short ice baths (around 1–2 minutes) for generally healthy people.
  - These practices are allowed to be discussed but must be wrapped in:
    - Doctor consultation advice.
    - Clear "who this is NOT for" criteria.
    - Clear STOP conditions if symptoms appear.
    - Emphasis that they are optional, not necessary for health.

- EXTREME_RISK_BIOHACK
  - User is asking for clearly extreme or high-risk interventions, such as:
    - Fasting for more than 3 days, repeated 5–7 day fasts, dry fasting.
    - Very long or extreme-temperature sauna "challenges".
    - Very long or very cold immersion challenges.
    - High-dose supplement stacks, experimental compounds, research chemicals, or anything illegal or obviously risky.
  - If in doubt between MODERATE_RISK_BIOHACK and EXTREME_RISK_BIOHACK, choose EXTREME_RISK_BIOHACK.

USER_MESSAGE:

${userMessage}

OUTPUT FORMAT

Return ONLY a JSON object:

{
  "category": "ONE_OF_THE_CATEGORIES_ABOVE",
  "reason": "Very brief explanation of why you chose this category"
}

GUIDELINES
- When safety is ambiguous, choose the MORE SERIOUS category.
- Do NOT answer the user directly. You are only classifying.`;

  try {
    const response = await runModel({
      provider: "openai", // Use GPT-5 for classification
      system: "You are a safety classifier. Return ONLY valid JSON matching the specified format.",
      messages: [{ role: "user", content: triagePrompt }],
      timeout: 5000,
      maxTokens: 200,
    });

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { category: string; reason: string };
      const category = parsed.category.toUpperCase() as TriageCategory;

      // Validate category
      const validCategories: TriageCategory[] = [
        "GENERAL_WELLNESS",
        "MENTAL_HEALTH_NON_CRISIS",
        "MENTAL_HEALTH_CRISIS",
        "MEDICAL_SYMPTOMS_NON_URGENT",
        "MEDICAL_EMERGENCY_SIGNS",
        "MODERATE_RISK_BIOHACK",
        "EXTREME_RISK_BIOHACK",
      ];

      if (validCategories.includes(category)) {
        return {
          category,
          reason: parsed.reason || "AI classification",
        };
      }
    }

    // Fallback if AI returns invalid format
    logger.warn("Triage: AI returned invalid category format", { response });
    return {
      category: "GENERAL_WELLNESS",
      reason: "AI classification failed, defaulting to general wellness",
    };
  } catch (error) {
    logger.error("Triage: AI classification error", { error });
    throw error;
  }
}

/**
 * Get fixed crisis/emergency response (no AI call)
 */
export function getCrisisResponse(category: TriageCategory): string {
  if (category === "MENTAL_HEALTH_CRISIS") {
    return CRISIS_RESPONSES.MENTAL_HEALTH_CRISIS;
  }

  if (category === "MEDICAL_EMERGENCY_SIGNS") {
    return CRISIS_RESPONSES.MEDICAL_EMERGENCY_SIGNS;
  }

  return "";
}

/**
 * Detect biohack topic from user message for context
 */
export function detectBiohackTopic(userMessage: string): string | null {
  const normalized = userMessage.toLowerCase();

  if (normalized.includes("fast") || normalized.includes("fasting")) {
    if (normalized.includes("3") || normalized.includes("three")) {
      return "3-day water fast";
    }
    return "fasting";
  }

  if (normalized.includes("sauna")) {
    return "sauna";
  }

  if (normalized.includes("ice bath") || normalized.includes("cold plunge") || normalized.includes("cold immersion")) {
    return "short ice bath";
  }

  return null;
}

/**
 * Post-generation safety reviewer
 * Checks if AI response violates safety rules
 */
export async function reviewReplySafety(draftReply: string): Promise<{
  safe: boolean;
  issues: string[];
}> {
  const reviewPrompt = `You are a SAFETY REVIEWER for an AI health, wellness, and biohacking coach.

You will receive a DRAFT_REPLY that the coach intends to send to the user.

Your job is to check if the reply violates any of these rules:

- No diagnosis of medical or psychiatric conditions.
- No specific medication or supplement dosing instructions.
- No advice to start, stop, or change prescribed medications.
- No encouragement to ignore or delay seeing a doctor.
- No extreme or clearly high-risk biohacking instructions:
  - Fasting longer than ~3 days, dry fasting, repeated multi-day fasts.
  - Extreme cold or heat exposure challenges.
  - High-dose supplement stacks, experimental drugs, illegal substances.
- No minimising or dismissing emergency symptoms (chest pain, trouble breathing, stroke signs, suicidal intent).
- No implication that the AI replaces doctors or emergency services.

DRAFT_REPLY:

${draftReply}

OUTPUT FORMAT

Return ONLY a JSON object:

{
  "safe": true or false,
  "issues": [
    "Describe any problematic parts if safe is false"
  ]
}

GUIDELINES
- If in doubt, set "safe": false and explain why.
- Do NOT rewrite the reply; only judge it.`;

  try {
    const response = await runModel({
      provider: "openai",
      system: "You are a safety reviewer. Return ONLY valid JSON matching the specified format.",
      messages: [{ role: "user", content: reviewPrompt }],
      timeout: 5000,
      maxTokens: 300,
    });

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { safe: boolean; issues?: string[] };
      return {
        safe: parsed.safe ?? true,
        issues: parsed.issues || [],
      };
    }

    // Fallback: assume safe if we can't parse
    logger.warn("Safety reviewer: Could not parse response", { response });
    return { safe: true, issues: [] };
  } catch (error) {
    logger.error("Safety reviewer: Error", { error });
    // On error, assume safe to avoid blocking legitimate responses
    return { safe: true, issues: [] };
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use triageUserMessage instead
 */
export async function classifyQuery(userQuery: string): Promise<{
  category: TriageCategory;
  confidence: "high" | "medium" | "low";
  requiresImmediateAction: boolean;
}> {
  const triage = await triageUserMessage(userQuery);
  return {
    category: triage.category,
    confidence: "high",
    requiresImmediateAction:
      triage.category === "MENTAL_HEALTH_CRISIS" || triage.category === "MEDICAL_EMERGENCY_SIGNS",
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getCrisisResponse instead
 */
export function checkResponseSafety(response: string): {
  isSafe: boolean;
  issues: string[];
} {
  // Simple keyword-based check (legacy)
  const issues: string[] = [];
  const normalized = response.toLowerCase();

  const diagnosisPatterns = [
    /\byou have\s+\w+\s+disease/,
    /\byou are\s+diagnosed\s+with/,
    /\bdiagnosis:\s*\w+/,
    /\byou're\s+suffering\s+from/,
  ];

  if (diagnosisPatterns.some((pattern) => pattern.test(normalized))) {
    issues.push("Contains diagnosis-like statements");
  }

  const medicationPatterns = [
    /\btake\s+\d+\s+mg\s+of\s+\w+/,
    /\bstop\s+taking\s+your\s+medication/,
    /\bstart\s+taking\s+\w+\s+medication/,
    /\bprescribe\s+\w+/,
  ];

  if (medicationPatterns.some((pattern) => pattern.test(normalized))) {
    issues.push("Contains medication instructions");
  }

  return {
    isSafe: issues.length === 0,
    issues,
  };
}
