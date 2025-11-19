/**
 * Safety Judge & Rewriting
 * 
 * Uses Claude 4.5 to judge answer safety and rewrite unsafe content.
 */

import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { classifyRequest, type Topic } from "./classifier";

export type JudgeVerdict = {
  verdict: "SAFE" | "WARN" | "BLOCK";
  reasons: string[];
  needs_edit: boolean;
};

const JUDGE_SYSTEM_PROMPT = `You are a safety and factuality judge for a health-adjacent educational assistant.

You never invent content; you only evaluate.

You must enforce:
- No drug/supplement dosages, frequencies, titration schedules.
- No diagnosing diseases.
- No prescribing or changing medications.
- Fasting/sauna/cold training must include: "not a doctor", "consult your clinician".
- Acute emergency-like symptoms must be escalated to medical care, not self-care.

Check whether the answer:
1) is safe,
2) is reasonably grounded in RAG_CONTEXT or generic health education,
3) respects "I am not a doctor / talk to your clinician" for high-risk topics.

Output only JSON:
{
  "verdict": "SAFE" | "WARN" | "BLOCK",
  "reasons": ["reason1", "reason2"],
  "needs_edit": true | false
}

Verdict meanings:
- "SAFE": Answer is safe and compliant
- "WARN": Answer has minor issues but can be edited to be safe
- "BLOCK": Answer is unsafe and should not be shown (use triage message instead)`;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = env.anthropic.apiKey();
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Judge an assistant answer for safety and factuality
 */
export async function judgeAnswer(params: {
  userQuestion: string;
  ragContext: string;
  assistantAnswer: string;
  judgeModel: string;
}): Promise<JudgeVerdict> {
  const { userQuestion, ragContext, assistantAnswer, judgeModel } = params;
  const client = getAnthropicClient();

  try {
    const userPrompt = `USER_QUESTION:
${userQuestion}

RAG_CONTEXT:
${ragContext || "(no RAG context provided)"}

ASSISTANT_ANSWER:
${assistantAnswer}

Evaluate this answer for safety and factuality. Respond with JSON only.`;

    const message = await client.messages.create({
      model: judgeModel,
      max_tokens: 500,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from judge");
    }

    const text = content.text;
    const parsed = JSON.parse(text) as Partial<JudgeVerdict>;

    return {
      verdict: (parsed.verdict as "SAFE" | "WARN" | "BLOCK") || "SAFE",
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      needs_edit: parsed.needs_edit ?? false,
    };
  } catch (error) {
    logger.error("Safety judge failed", { error, userQuestion: userQuestion.substring(0, 100) });
    
    // Safe default: block if we can't judge
    return {
      verdict: "BLOCK",
      reasons: ["Judge evaluation failed"],
      needs_edit: false,
    };
  }
}

/**
 * Rewrite an unsafe answer to make it safe
 */
export async function rewriteUnsafeAnswer(params: {
  userQuestion: string;
  ragContext: string;
  unsafeAnswer: string;
  judgeModel: string;
}): Promise<string> {
  const { userQuestion, ragContext, unsafeAnswer, judgeModel } = params;
  const client = getAnthropicClient();

  const rewriteSystemPrompt = `You are a safety editor for a health-adjacent educational assistant.

Rewrite the answer so it is safe and compliant with these rules:
- Remove dosages, prescriptions, or instructions that exceed safety guidelines.
- Add appropriate disclaimers ("I am not a doctor", "consult your clinician") for high-risk topics.
- Keep as much useful educational content as possible.
- Maintain the same helpful, calm tone.

Return ONLY the rewritten answer text, no JSON, no explanations.`;

  try {
    const userPrompt = `USER_QUESTION:
${userQuestion}

RAG_CONTEXT:
${ragContext || "(no RAG context provided)"}

UNSAFE_ANSWER:
${unsafeAnswer}

Rewrite this answer to be safe and compliant. Return only the rewritten answer.`;

    const message = await client.messages.create({
      model: judgeModel,
      max_tokens: 2000,
      system: rewriteSystemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from rewrite");
    }

    return content.text;
  } catch (error) {
    logger.error("Answer rewrite failed", { error, userQuestion: userQuestion.substring(0, 100) });
    throw error; // Let caller handle fallback
  }
}

/**
 * Triage Category enum for routing decisions
 */
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
 * Triage user message to determine routing category
 */
export async function triageUserMessage(userMessage: string): Promise<TriageResult> {
  const classification = await classifyRequest(userMessage);

  // Map classifier topics to triage categories
  if (classification.topic === "emotional_crisis") {
    return {
      category: "MENTAL_HEALTH_CRISIS",
      reason: "Emotional crisis detected",
    };
  }

  if (classification.topic === "medical_acute") {
    return {
      category: "MEDICAL_EMERGENCY_SIGNS",
      reason: "Acute medical symptoms detected",
    };
  }

  if (classification.risk === "high" && (classification.topic === "fasting" || classification.topic === "supplements_safety")) {
    return {
      category: "EXTREME_RISK_BIOHACK",
      reason: "Extreme risk biohack protocol detected",
    };
  }

  if (classification.risk === "medium" && ["fasting", "sauna_cold", "supplements_safety"].includes(classification.topic)) {
    return {
      category: "MODERATE_RISK_BIOHACK",
      reason: "Moderate risk biohack topic detected",
    };
  }

  if (classification.topic === "condition_support" || classification.topic === "lab_interpretation_general") {
    return {
      category: "MEDICAL_SYMPTOMS_NON_URGENT",
      reason: "Medical/wellness topic requiring professional guidance",
    };
  }

  if (classification.topic === "anxiety" || classification.topic === "stress") {
    return {
      category: "MENTAL_HEALTH_NON_CRISIS",
      reason: "Mental health topic (non-crisis)",
    };
  }

  return {
    category: "GENERAL_WELLNESS",
    reason: "General wellness question",
  };
}

/**
 * Get fixed crisis response for emergency situations
 */
export function getCrisisResponse(category: TriageCategory): string {
  if (category === "MENTAL_HEALTH_CRISIS") {
    return `I'm really glad you reached out. When thoughts about self-harm or suicide are present, you deserve immediate, real-world support.

Please contact:
- Your local emergency number or crisis hotline
- Your GP or mental health service
- Someone you trust

You are not weak or broken for feeling this way. A clinician can assess what's going on and build a plan with you.

I can help later with sleep hygiene, routines, and micro-habits once you're connected with support, but right now the priority is your safety and having another human involved offline as soon as possible.`;
  }

  if (category === "MEDICAL_EMERGENCY_SIGNS") {
    return `I can't safely help with acute medical symptoms like chest pain, stroke-like symptoms, or severe breathing issues.

Please seek immediate medical care:
- Call your local emergency number
- Go to the nearest emergency department
- Contact your GP or on-call clinician

These symptoms require in-person evaluation by a healthcare professional.`;
  }

  return `I understand you're looking for guidance. However, I want to make sure I'm providing safe, appropriate advice.

For medical concerns, I'd strongly recommend consulting with a healthcare professional who can provide personalized guidance based on your specific situation.`;
}

/**
 * Detect biohack topic from user message (simple keyword-based)
 */
export function detectBiohackTopic(userMessage: string): string | null {
  const lower = userMessage.toLowerCase();
  
  if (lower.includes("fast") || lower.includes("fasting") || lower.includes("intermittent")) {
    return "fasting";
  }
  if (lower.includes("sauna") || lower.includes("cold") || lower.includes("ice bath") || lower.includes("cryotherapy")) {
    return "sauna_cold";
  }
  if (lower.includes("supplement") || lower.includes("vitamin") || lower.includes("mineral")) {
    return "supplements";
  }
  if (lower.includes("keto") || lower.includes("ketogenic")) {
    return "keto";
  }
  if (lower.includes("carnivore")) {
    return "carnivore";
  }
  
  return null;
}

/**
 * Review reply safety (simple check)
 */
export async function reviewReplySafety(reply: string): Promise<{ safe: boolean; issues: string[] }> {
  const issues: string[] = [];
  const lower = reply.toLowerCase();

  // Check for dangerous patterns
  if (lower.match(/\d+\s*(mg|g|ml|tablet|pill|dose|dosage)/i)) {
    issues.push("Contains specific dosages");
  }
  if (lower.includes("prescribe") || lower.includes("prescription")) {
    issues.push("Contains prescription language");
  }
  if (lower.includes("diagnose") || lower.includes("diagnosis")) {
    issues.push("Contains diagnostic language");
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}
