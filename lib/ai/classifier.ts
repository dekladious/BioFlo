/**
 * Request Classifier
 * 
 * Uses cheap model to classify user messages and decide routing, RAG needs, and safety.
 */

import OpenAI from "openai";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type Topic =
  | "sleep"
  | "anxiety"
  | "stress"
  | "nutrition"
  | "meal_planning"
  | "supplements_general"
  | "supplements_safety"
  | "exercise"
  | "longevity"
  | "fasting"
  | "sauna_cold"
  | "condition_support"
  | "lab_interpretation_general"
  | "metrics_analysis"
  | "wearable_analysis"
  | "general"
  | "emotional_crisis"
  | "medical_acute"
  | "other";

export type RequestClassification = {
  topic: Topic;
  complexity: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
  needs_rag: boolean;
  needs_wearables: boolean;
  allow_answer: boolean;
};

const CLASSIFIER_SYSTEM_PROMPT = `You are a classifier for a biohacking/health optimisation assistant.

You never answer questions, only label them.

You must respond ONLY in JSON matching this exact structure:
{
  "topic": string,
  "complexity": "low" | "medium" | "high",
  "risk": "low" | "medium" | "high",
  "needs_rag": boolean,
  "needs_wearables": boolean,
  "allow_answer": boolean
}

Topic options:
- "sleep": sleep quality, insomnia, circadian rhythm, naps
- "anxiety": anxiety, stress, worry, panic
- "stress": stress management, cortisol, burnout
- "nutrition": general nutrition, macros, meal timing
- "meal_planning": specific meal plans, recipes, meal prep
- "supplements_general": general supplement questions, what supplements exist
- "supplements_safety": supplement dosages, interactions, safety
- "exercise": workouts, training, fitness
- "longevity": lifespan, healthspan, aging
- "fasting": intermittent fasting, extended fasting, fasting protocols
- "sauna_cold": sauna, cold exposure, heat/cold therapy
- "condition_support": lifestyle support for medical conditions (not diagnosis)
- "lab_interpretation_general": general lab value education (not diagnosis)
- "metrics_analysis": analyzing health metrics, trends
- "wearable_analysis": HRV, sleep stages, step counts, wearable data
- "general": general health questions
- "emotional_crisis": self-harm, suicide, severe mental health crisis
- "medical_acute": chest pain, stroke symptoms, severe breathing issues
- "other": anything else

Complexity:
- "low": simple factual questions, basic explanations
- "medium": requires some reasoning, multi-step answers
- "high": complex synthesis, multiple domains, advanced reasoning needed

Risk:
- "low": general education, no protocols, no acute issues
- "medium": biohacking protocols (fasting, sauna/cold, supplements) but not acute/emergency
- "high": supplement or drug dosages, long fasts, extreme protocols, acute symptoms, emotional crisis

needs_rag: true when question refers to experts (Attia/Walker/etc), detailed explanations, protocols, or advanced education

needs_wearables: true when user refers to wearables, HRV, sleep stages, step counts, readiness scores, etc.

allow_answer:
- false if:
  * self-harm / suicide / eating disorder encouragement
  * explicit medication or supplement dosing (mg, tablets per day, titration schedules)
  * clear signs of acute emergency (chest pain, stroke-like symptoms, severe shortness of breath)
- true otherwise`;

let openaiClient: OpenAI | null = null;

/**
 * Build a full classification object with safe defaults.
 */
function buildClassification(
  overrides: Partial<RequestClassification> = {}
): RequestClassification {
  return {
    topic: (overrides.topic as Topic) || "general",
    complexity: overrides.complexity || "low",
    risk: overrides.risk || "low",
    needs_rag: overrides.needs_rag ?? false,
    needs_wearables: overrides.needs_wearables ?? false,
    allow_answer: overrides.allow_answer ?? true,
  };
}

/**
 * Deterministic keyword-based classification for critical cases.
 * Ensures we never miss obvious crisis/emergency content if the LLM call fails.
 */
export function detectDeterministicClassification(
  userMessage: string
): RequestClassification | null {
  const text = userMessage.toLowerCase();

  const crisisPatterns = [
    "kill myself",
    "kill myself.",
    "suicide",
    "end my life",
    "want to die",
    "wish i was dead",
    "hurt myself",
    "self harm",
    "harm myself",
    "hurt someone",
    "voices telling me",
  ];

  if (crisisPatterns.some((pattern) => text.includes(pattern))) {
    return buildClassification({
      topic: "emotional_crisis",
      complexity: "high",
      risk: "high",
      allow_answer: false,
    });
  }

  const emergencyPatterns = [
    "chest pain",
    "face drooping",
    "stroke",
    "can't breathe",
    "cannot breathe",
    "trouble breathing",
    "shortness of breath",
    "severe allergic",
    "throat is swelling",
    "heart attack",
  ];

  if (emergencyPatterns.some((pattern) => text.includes(pattern))) {
    return buildClassification({
      topic: "medical_acute",
      complexity: "high",
      risk: "high",
      allow_answer: false,
    });
  }

  const extremeBiohackPatterns = [
    "7-day fast",
    "7 day fast",
    "dry fast",
    "dry fasting",
    "water fast for a week",
    "water-only fast",
    "multi-day fast",
    "stacking extreme stressors",
    "sauna endurance",
  ];

  if (extremeBiohackPatterns.some((pattern) => text.includes(pattern))) {
    return buildClassification({
      topic: "fasting",
      complexity: "high",
      risk: "high",
      allow_answer: false,
      needs_rag: false,
    });
  }

  const moderateBiohackPatterns = [
    "3-day fast",
    "3 day fast",
    "three day fast",
    "extended fast",
    "prolonged fast",
    "ice bath protocol",
    "sauna protocol",
  ];

  if (moderateBiohackPatterns.some((pattern) => text.includes(pattern))) {
    return buildClassification({
      topic: "fasting",
      complexity: "medium",
      risk: "medium",
      allow_answer: true,
      needs_rag: true,
    });
  }

  return null;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = env.openai.apiKey();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Classify a user message to determine routing, RAG needs, and safety
 */
export async function classifyRequest(
  userMessage: string
): Promise<RequestClassification> {
  const client = getOpenAIClient();
  const model = env.openai.cheapModel();

  const deterministic = detectDeterministicClassification(userMessage);
  if (deterministic) {
    return deterministic;
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Classify this user message:\n\n"${userMessage}"\n\nRespond with ONLY valid JSON, no other text.`,
        },
      ],
      temperature: 0.1, // Low temperature for consistent classification
      max_completion_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from classifier");
    }

    const parsed = JSON.parse(content) as Partial<RequestClassification>;

    // Validate and provide safe defaults
    const classification = buildClassification(parsed);

    // Safety override: if topic is crisis/acute, force allow_answer = false
    if (
      classification.topic === "emotional_crisis" ||
      classification.topic === "medical_acute"
    ) {
      classification.allow_answer = false;
      classification.risk = "high";
    }

    return classification;
  } catch (error) {
    logger.error("Classification failed", { error, userMessage: userMessage.substring(0, 100) });
    
    // Return safe defaults on error
    const fallback = detectDeterministicClassification(userMessage);
    if (fallback) {
      return fallback;
    }

    return buildClassification();
  }
}

