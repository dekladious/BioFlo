import { z } from "zod";
import { registerTool } from "./index";

type BreathingExercise = {
  name: string;
  description: string;
  steps: string[];
  duration: string;
  frequency: string;
  benefits: string[];
  whenToUse: string;
};

type MeditationProtocol = {
  name: string;
  description: string;
  duration: string;
  frequency: string;
  technique: string[];
  benefits: string[];
};

type HRVProtocol = {
  name: string;
  description: string;
  exercises: Array<{
    name: string;
    duration: string;
    instructions: string[];
  }>;
  tracking: string[];
  goals: string[];
};

type AdaptogenRecommendation = {
  name: string;
  dosage: string;
  timing: string;
  purpose: string;
  notes?: string;
};

export const stressManagement = registerTool({
  name: "stressManagement",
  description: "Create personalized stress management protocols including breathing exercises (Huberman's physiological sighs, box breathing), meditation, HRV optimization, and adaptogen recommendations.",
  input: z.object({
    stressLevel: z.enum(["low", "moderate", "high", "chronic"]).default("moderate"),
    stressSources: z.array(z.string()).optional(),
    timeAvailable: z.enum(["minimal", "moderate", "extensive"]).default("moderate"),
    preferences: z.object({
      breathing: z.boolean().default(true),
      meditation: z.boolean().default(true),
      exercise: z.boolean().default(true),
      supplements: z.boolean().default(true),
    }).default({}),
    goals: z.array(z.enum(["reduce_stress", "improve_sleep", "enhance_focus", "manage_anxiety", "improve_hrv", "cortisol_optimization"])).default(["reduce_stress"]),
  }),
  async handler({ stressLevel, stressSources, timeAvailable, preferences, goals }) {
    // Breathing Exercises
    const breathingExercises: BreathingExercise[] = [];

    // Physiological Sigh (Huberman)
    if (preferences.breathing !== false) {
      breathingExercises.push({
        name: "Physiological Sigh (Huberman Protocol)",
        description: "Double inhale through the nose, followed by a long exhale through the mouth. This is the fastest way to reduce stress and calm the nervous system.",
        steps: [
          "Inhale deeply through your nose (fill your lungs)",
          "Take a second, shorter inhale through your nose (top off your lungs)",
          "Exhale slowly and completely through your mouth (longer than the inhales)",
          "Repeat 3-5 times",
        ],
        duration: "1-2 minutes",
        frequency: "As needed when stressed, or 2-3x per day for maintenance",
        benefits: [
          "Rapid stress reduction (works in seconds)",
          "Activates parasympathetic nervous system",
          "Reduces cortisol",
          "Improves focus and mental clarity",
        ],
        whenToUse: "Anytime you feel stressed, anxious, or need to reset. Especially effective before important tasks or after stressful events.",
      });

      // Box Breathing
      breathingExercises.push({
        name: "Box Breathing (4-4-4-4)",
        description: "Equal duration inhale, hold, exhale, hold. Excellent for stress management and focus.",
        steps: [
          "Inhale through your nose for 4 counts",
          "Hold your breath for 4 counts",
          "Exhale through your mouth for 4 counts",
          "Hold empty for 4 counts",
          "Repeat for 4-8 cycles",
        ],
        duration: "2-5 minutes",
        frequency: "2-3x per day, or as needed",
        benefits: [
          "Calms the nervous system",
          "Improves focus and concentration",
          "Reduces anxiety",
          "Enhances sleep quality when done before bed",
        ],
        whenToUse: "Before important meetings, when feeling anxious, or as part of a daily routine.",
      });

      // 4-7-8 Breathing
      if (goals.includes("improve_sleep") || goals.includes("manage_anxiety")) {
        breathingExercises.push({
          name: "4-7-8 Breathing (Relaxing Breath)",
          description: "Inhale for 4, hold for 7, exhale for 8. Promotes deep relaxation.",
          steps: [
            "Inhale through your nose for 4 counts",
            "Hold your breath for 7 counts",
            "Exhale through your mouth for 8 counts (make a 'whoosh' sound)",
            "Repeat 4-8 cycles",
          ],
          duration: "2-5 minutes",
          frequency: "Before bed, or 2x per day",
          benefits: [
            "Promotes deep relaxation",
            "Reduces anxiety",
            "Improves sleep quality",
            "Calms racing thoughts",
          ],
          whenToUse: "Before sleep, during panic attacks, or when feeling overwhelmed.",
        });
      }
    }

    // Meditation Protocol
    let meditation: MeditationProtocol | null = null;
    
    if (preferences.meditation !== false) {
      const duration = timeAvailable === "minimal" ? "5-10 minutes" : timeAvailable === "moderate" ? "10-20 minutes" : "20-30 minutes";
      
      meditation = {
        name: "Mindfulness Meditation Protocol",
        description: "Structured meditation practice for stress reduction, improved focus, and emotional regulation.",
        duration,
        frequency: timeAvailable === "minimal" ? "Once daily" : "1-2x per day",
        technique: [
          "Find a quiet, comfortable place to sit or lie down",
          "Close your eyes or soften your gaze",
          "Focus on your breath - notice the sensation of breathing",
          "When your mind wanders (it will), gently return attention to your breath",
          "Start with shorter sessions and gradually increase duration",
          "Use guided meditations if helpful (apps like Headspace, Calm, or Insight Timer)",
        ],
        benefits: [
          "Reduces cortisol and stress hormones",
          "Improves emotional regulation",
          "Enhances focus and attention",
          "Better sleep quality",
          "Increased self-awareness",
        ],
      };
    }

    // HRV Optimization Protocol
    let hrvProtocol: HRVProtocol | null = null;
    
    if (goals.includes("improve_hrv") || stressLevel === "high" || stressLevel === "chronic") {
      hrvProtocol = {
        name: "HRV Optimization Protocol",
        description: "Heart Rate Variability (HRV) is a key indicator of recovery and stress resilience. Higher HRV = better recovery and lower stress.",
        exercises: [
          {
            name: "Coherent Breathing",
            duration: "5-10 minutes",
            instructions: [
              "Breathe at 5-6 breaths per minute (inhale 5 seconds, exhale 5 seconds)",
              "Use a metronome or app to maintain rhythm",
              "Focus on smooth, even breaths",
              "Practice daily, ideally in the morning",
            ],
          },
          {
            name: "Resonance Frequency Breathing",
            duration: "10-20 minutes",
            instructions: [
              "Find your personal resonance frequency (usually 4.5-6.5 breaths per minute)",
              "Use HRV biofeedback device or app to find optimal rate",
              "Practice at your resonance frequency daily",
              "Track HRV improvements over time",
            ],
          },
        ],
        tracking: [
          "Use HRV tracking device (Oura, WHOOP, HRV4Training app)",
          "Measure HRV first thing in the morning",
          "Track trends over time (daily fluctuations are normal)",
          "Higher HRV = better recovery and lower stress",
          "Lower HRV = may need more rest or stress reduction",
        ],
        goals: [
          "Increase baseline HRV over time",
          "Improve recovery between training sessions",
          "Better stress resilience",
          "Enhanced sleep quality",
        ],
      };
    }

    // Adaptogen Recommendations
    const adaptogens: AdaptogenRecommendation[] = [];
    
    if (preferences.supplements !== false) {
      if (stressLevel === "high" || stressLevel === "chronic" || goals.includes("reduce_stress")) {
        adaptogens.push({
          name: "Ashwagandha",
          dosage: "300-600mg (KSM-66 or Sensoril extract)",
          timing: "Once daily, with food (morning or evening)",
          purpose: "Reduces cortisol, improves stress resilience, enhances sleep",
          notes: "Take consistently for 4-8 weeks to see benefits. May cause drowsiness in some - take in evening if so.",
        });

        adaptogens.push({
          name: "Rhodiola Rosea",
          dosage: "200-400mg (3% rosavins, 1% salidroside)",
          timing: "Morning, on empty stomach",
          purpose: "Reduces fatigue, improves mental performance under stress, enhances mood",
          notes: "Cycle 4-6 weeks on, 2 weeks off. Avoid if you have anxiety or are sensitive to stimulants.",
        });
      }

      if (goals.includes("improve_sleep") || goals.includes("manage_anxiety")) {
        adaptogens.push({
          name: "L-Theanine",
          dosage: "200-400mg",
          timing: "Evening, 30-60 minutes before bed, or as needed for stress",
          purpose: "Promotes relaxation without drowsiness, reduces anxiety, improves sleep quality",
          notes: "Can be taken with caffeine to reduce jitters. Very safe, minimal side effects.",
        });

        adaptogens.push({
          name: "Magnesium Glycinate",
          dosage: "400-600mg elemental magnesium",
          timing: "Evening, 30-60 minutes before bed",
          purpose: "Calms nervous system, improves sleep quality, reduces muscle tension",
          notes: "Highly bioavailable form. Start with 400mg and increase if needed.",
        });
      }

      if (goals.includes("cortisol_optimization") || stressLevel === "chronic") {
        adaptogens.push({
          name: "Phosphatidylserine",
          dosage: "400-600mg",
          timing: "Evening, with food",
          purpose: "Reduces cortisol, improves cognitive function under stress, enhances recovery",
          notes: "Especially effective for exercise-induced stress. Take consistently for best results.",
        });
      }
    }

    // Lifestyle Recommendations
    const lifestyleRecommendations: string[] = [];
    
    if (preferences.exercise !== false) {
      lifestyleRecommendations.push("Regular exercise (150 minutes moderate or 75 minutes vigorous per week) reduces stress and improves mood");
      lifestyleRecommendations.push("Yoga or tai chi combine movement with breathwork - excellent for stress management");
      lifestyleRecommendations.push("Nature walks or 'forest bathing' reduce cortisol and improve mood");
    }

    lifestyleRecommendations.push("Prioritize sleep - aim for 7-9 hours of quality sleep per night");
    lifestyleRecommendations.push("Limit caffeine (especially after 2pm) - can increase cortisol and anxiety");
    lifestyleRecommendations.push("Reduce alcohol - disrupts sleep and increases stress");
    lifestyleRecommendations.push("Social connection - spend time with supportive friends and family");
    lifestyleRecommendations.push("Time in nature - even 20 minutes can reduce stress");
    
    if (stressSources && stressSources.length > 0) {
      lifestyleRecommendations.push("Address root causes: Consider therapy, boundary setting, or lifestyle changes to reduce stress sources");
    }

    // Daily Routine Suggestions
    const dailyRoutine: string[] = [];
    
    if (timeAvailable === "minimal") {
      dailyRoutine.push("Morning: 2-3 physiological sighs upon waking");
      dailyRoutine.push("Midday: 2-minute box breathing break");
      dailyRoutine.push("Evening: 5-minute meditation or 4-7-8 breathing before bed");
    } else if (timeAvailable === "moderate") {
      dailyRoutine.push("Morning: 5-minute meditation + physiological sighs");
      dailyRoutine.push("Midday: 5-minute breathing break (box breathing or physiological sighs)");
      dailyRoutine.push("Evening: 10-minute meditation + 4-7-8 breathing before bed");
    } else {
      dailyRoutine.push("Morning: 10-15 minute meditation + HRV breathing practice");
      dailyRoutine.push("Midday: 5-minute breathing break");
      dailyRoutine.push("Afternoon: 10-minute walk in nature or light exercise");
      dailyRoutine.push("Evening: 15-20 minute meditation + 4-7-8 breathing before bed");
    }

    // Tips
    const tips: string[] = [];
    tips.push("Consistency is key - small daily practices are more effective than occasional long sessions");
    tips.push("Start small - even 2-3 minutes of breathing exercises can make a difference");
    tips.push("Track your progress - notice how you feel before and after practices");
    tips.push("Combine techniques - breathing + meditation + supplements work synergistically");
    tips.push("Be patient - stress reduction takes time, especially if stress is chronic");
    tips.push("Listen to your body - adjust practices based on what feels right for you");

    return {
      breathingExercises,
      meditation,
      hrvProtocol,
      adaptogens,
      lifestyleRecommendations,
      dailyRoutine,
      tips,
      stressLevel,
      goals,
    };
  },
});

