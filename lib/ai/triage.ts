/**
 * Triage Message Builders
 * 
 * Helper functions to build safe triage/refusal messages for blocked requests.
 */

import type { Topic } from "./classifier";

export function buildTriageForBlocked(
  topic: Topic,
  risk: "low" | "medium" | "high"
): string {
  if (topic === "emotional_crisis") {
    return `I'm really glad you reached out. When thoughts about self-harm or suicide are present, you deserve immediate, real-world support.

Please contact:
- Your local emergency number or crisis hotline
- Your GP or mental health service
- Someone you trust

You are not weak or broken for feeling this way. A clinician can assess what's going on and build a plan with you.

I can help later with sleep hygiene, routines, and micro-habits once you're connected with support, but right now the priority is your safety and having another human involved offline as soon as possible.`;
  }

  if (topic === "medical_acute") {
    return `I can't safely help with acute medical symptoms like chest pain, stroke-like symptoms, or severe breathing issues.

Please seek immediate medical care:
- Call your local emergency number
- Go to the nearest emergency department
- Contact your GP or on-call clinician

These symptoms require in-person evaluation by a healthcare professional.`;
  }

  if (risk === "high" && (topic.includes("supplement") || topic === "fasting")) {
    return `I can't provide specific dosages, titration schedules, or detailed protocols for ${topic === "fasting" ? "extended fasting" : "supplements"} without medical oversight.

For ${topic === "fasting" ? "fasting protocols" : "supplement guidance"}:
- Discuss with your clinician or a qualified healthcare provider
- They can assess your individual needs, health status, and any contraindications
- They can provide personalised guidance that's safe for you

I'm happy to discuss general principles, mechanisms, and educational information, but specific protocols should be developed with professional input.`;
  }

  // Generic safe refusal
  return `I'm not able to provide guidance on this topic safely without more context or professional oversight.

I'd recommend:
- Consulting with your healthcare provider or a qualified professional
- They can assess your individual situation and provide personalised guidance

I'm here to help with general health optimisation, sleep, nutrition, exercise, and lifestyle habits. Feel free to ask about those topics!`;
}

export function buildGenericSafeAnswer(topic: Topic): string {
  const topicMessages: Record<string, string> = {
    sleep: `Here are some general principles for better sleep:

- Maintain a consistent sleep schedule (same wake time, even on weekends)
- Get morning light exposure within 30-60 minutes of waking
- Avoid caffeine 8-10 hours before bedtime
- Keep your bedroom cool, dark, and quiet
- Limit screens and bright light in the hour before bed
- Avoid large meals and alcohol close to bedtime

If you're experiencing persistent sleep issues, consider speaking with a sleep specialist or your GP.`,
    
    anxiety: `Here are some general strategies for managing anxiety:

- Regular exercise, especially rhythmic cardio
- Daily morning light exposure
- Simple breathing exercises (slow exhales, box breathing)
- Journaling and cognitive reframing
- Building predictable routines
- Social connection

If anxiety is persistent, disabling, or severe, please seek support from a mental health professional.`,
    
    nutrition: `Here are some general nutrition principles:

- Focus on whole, minimally processed foods
- Adequate protein (typically 1.6-2.0g per kg bodyweight for many adults)
- Plenty of vegetables and fibre
- Stay hydrated
- Consider meal timing relative to your sleep and activity

For personalised nutrition guidance, consider working with a registered dietitian.`,
  };

  return (
    topicMessages[topic] ||
    `I'd be happy to help with ${topic}, but I'd need more specific information about your situation to provide useful guidance.

Consider:
- What specific aspect of ${topic} are you interested in?
- What are your goals or concerns?
- What have you tried already?

I can then provide more targeted, evidence-informed suggestions.`
  );
}

