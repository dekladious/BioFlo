import { z } from "zod";
import { registerTool } from "./index";

type SleepProtocol = {
  name: string;
  description: string;
  steps: Array<{
    time: string;
    action: string;
    duration?: string;
    notes?: string;
  }>;
};

type SleepRecommendation = {
  optimalBedtime: string;
  optimalWakeTime: string;
  totalSleepHours: number;
  protocols: SleepProtocol[];
  lightExposure: {
    morning: string;
    evening: string;
    blueLight: string;
  };
  temperature: {
    roomTemp: string;
    bodyPrep: string;
  };
  supplements?: Array<{
    name: string;
    dosage: string;
    timing: string;
    purpose: string;
  }>;
  environment: Array<{
    category: string;
    recommendations: string[];
  }>;
  tips: string[];
};

export const sleepOptimizer = registerTool({
  name: "sleepOptimizer",
  description: "Create personalized sleep optimization protocols based on circadian rhythm science, light exposure, temperature, and sleep hygiene best practices.",
  input: z.object({
    currentSleepSchedule: z.object({
      bedtime: z.string().optional(), // "22:30" or "10:30 PM"
      wakeTime: z.string().optional(), // "06:30" or "6:30 AM"
      sleepIssues: z.array(z.enum(["falling_asleep", "staying_asleep", "waking_early", "poor_quality", "fatigue"])).optional(),
    }).optional(),
    workSchedule: z.object({
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      timezone: z.string().optional(),
    }).optional(),
    lightExposure: z.object({
      morningSun: z.boolean().optional(),
      eveningExposure: z.boolean().optional(),
      screenTime: z.number().optional(), // hours before bed
    }).optional(),
    goals: z.array(z.enum(["better_sleep", "energy", "performance", "recovery"])).default(["better_sleep"]),
  }),
  async handler({ currentSleepSchedule, workSchedule, lightExposure: lightExposureInput, goals }) {
    // Parse current schedule
    const currentBedtime = currentSleepSchedule?.bedtime || "22:30";
    const currentWakeTime = currentSleepSchedule?.wakeTime || "06:30";
    
    // Calculate optimal sleep schedule (aim for 7-9 hours)
    const targetHours = 8; // Default 8 hours
    const wakeTimeHour = parseTime(currentWakeTime);
    
    // Calculate optimal bedtime (wake time - 8 hours)
    const optimalBedtimeHour = (wakeTimeHour - targetHours + 24) % 24;
    const optimalBedtime = formatTime(optimalBedtimeHour);
    const optimalWakeTime = currentWakeTime;

    // Build sleep protocols
    const protocols: SleepProtocol[] = [];

    // Protocol 1: Circadian Rhythm Alignment
    protocols.push({
      name: "Circadian Rhythm Alignment",
      description: "Optimize your body's internal clock for better sleep",
      steps: [
        {
          time: "Upon Waking",
          action: "View sunlight (or bright light) for 5-10 minutes",
          duration: "5-10 minutes",
          notes: "Within 1 hour of waking. Go outside if possible, or use bright light device (10,000 lux).",
        },
        {
          time: "Mid-Morning (if possible)",
          action: "Additional light exposure",
          duration: "5-10 minutes",
          notes: "Especially important if you woke before sunrise",
        },
        {
          time: "Evening (2-3 hours before bed)",
          action: "Dim lights, avoid bright screens",
          duration: "2-3 hours",
          notes: "Lower ambient lighting, use dimmers or candlelight",
        },
        {
          time: "1 hour before bed",
          action: "Complete darkness or very dim red light",
          duration: "1 hour",
          notes: "No screens, minimal light exposure",
        },
      ],
    });

    // Protocol 2: Temperature Optimization
    protocols.push({
      name: "Temperature Optimization",
      description: "Use temperature to signal sleep and improve sleep quality",
      steps: [
        {
          time: "Evening",
          action: "Cool down room temperature",
          notes: "Set room to 65-68°F (18-20°C)",
        },
        {
          time: "1-2 hours before bed",
          action: "Hot shower or bath",
          duration: "10-15 minutes",
          notes: "Raises core temp, then rapid drop promotes sleep",
        },
        {
          time: "Before bed",
          action: "Warm feet, cool body",
          notes: "Warm feet (socks) helps vasodilation and sleep onset",
        },
        {
          time: "During sleep",
          action: "Maintain cool room",
          notes: "Cool room temperature supports deep sleep",
        },
      ],
    });

    // Protocol 3: Sleep Hygiene
    const sleepIssues = currentSleepSchedule?.sleepIssues || [];
    const hasFallingAsleepIssue = sleepIssues.includes("falling_asleep");
    const hasStayingAsleepIssue = sleepIssues.includes("staying_asleep");
    const hasPoorQuality = sleepIssues.includes("poor_quality");

    protocols.push({
      name: "Sleep Hygiene Protocol",
      description: "Optimize your sleep environment and habits",
      steps: [
        {
          time: "2-3 hours before bed",
          action: "Avoid large meals",
          notes: "Light snack okay, but avoid heavy meals",
        },
        {
          time: "2 hours before bed",
          action: "Avoid caffeine",
          notes: "No coffee, tea, or caffeinated beverages",
        },
        {
          time: "1 hour before bed",
          action: "Wind-down routine",
          duration: "60 minutes",
          notes: "Reading, meditation, light stretching, journaling",
        },
        {
          time: "30 minutes before bed",
          action: "Put away devices",
          notes: "No phones, tablets, or screens",
        },
        {
          time: "Bedtime",
          action: "Consistent sleep schedule",
          notes: "Go to bed and wake at the same time daily (even weekends)",
        },
      ],
    });

    // Supplement recommendations
    const supplements: Array<{ name: string; dosage: string; timing: string; purpose: string }> = [];
    
    if (hasFallingAsleepIssue || hasPoorQuality) {
      supplements.push({
        name: "Magnesium Glycinate",
        dosage: "400-600mg",
        timing: "30-60 minutes before bed",
        purpose: "Promotes relaxation, improves sleep onset",
      });
      supplements.push({
        name: "L-Theanine",
        dosage: "200-400mg",
        timing: "30-60 minutes before bed",
        purpose: "Reduces anxiety, promotes calm",
      });
      supplements.push({
        name: "Apigenin",
        dosage: "50mg",
        timing: "30-60 minutes before bed",
        purpose: "Natural sedative, improves sleep depth",
      });
    }

    if (hasStayingAsleepIssue) {
      supplements.push({
        name: "Glycine",
        dosage: "3g",
        timing: "Before bed",
        purpose: "Improves sleep quality, maintains sleep",
      });
    }

    // Light exposure recommendations
    const lightExposureRecs = {
      morning: currentSleepSchedule?.bedtime 
        ? "View bright light (sunlight or 10,000 lux device) for 5-10 minutes within 1 hour of waking. This sets your circadian clock."
        : "Get 5-10 minutes of bright light exposure within 1 hour of waking",
      evening: "Dim lights 2-3 hours before bed. Avoid bright screens. Use blue light blocking glasses if needed.",
      blueLight: "Avoid screens 1-2 hours before bed. If necessary, use blue light blocking apps/glasses.",
    };

    // Temperature recommendations
    const temperature = {
      roomTemp: "65-68°F (18-20°C) - Cool room temperature promotes deep sleep",
      bodyPrep: "Hot shower/bath 1-2 hours before bed, then cool down. Warm feet (socks) can help sleep onset.",
    };

    // Environment recommendations
    const environment = [
      {
        category: "Lighting",
        recommendations: [
          "Complete darkness or very dim red light during sleep",
          "Blackout curtains if street lights are an issue",
          "Eye mask if needed",
          "Remove or cover LED lights from devices",
        ],
      },
      {
        category: "Temperature",
        recommendations: [
          "Cool room (65-68°F / 18-20°C)",
          "Comfortable bedding",
          "Breathable sleepwear",
          "Consider cooling mattress pad if needed",
        ],
      },
      {
        category: "Noise",
        recommendations: [
          "White noise machine or app if needed",
          "Earplugs if external noise is an issue",
          "Soundproofing if possible",
        ],
      },
      {
        category: "Bedroom",
        recommendations: [
          "Reserve bed for sleep and intimacy only",
          "Keep bedroom cool, dark, and quiet",
          "Remove distractions (TV, work materials)",
          "Comfortable mattress and pillows",
        ],
      },
    ];

    // Tips
    const tips = [
      "Consistency is key - go to bed and wake at the same time daily, even on weekends",
      "Get morning sunlight exposure - this is the most important factor for circadian alignment",
      "Avoid caffeine after 2 PM (or earlier if you're sensitive)",
      "Regular exercise improves sleep, but avoid intense workouts 2-3 hours before bed",
      "Keep a sleep diary to track patterns and identify issues",
      "Limit naps to 20-30 minutes, and only before 3 PM",
      "If you can't sleep after 20 minutes, get up and do something relaxing until you feel sleepy",
      "Limit alcohol - it may help you fall asleep but disrupts sleep quality",
    ];

    const recommendation: SleepRecommendation = {
      optimalBedtime,
      optimalWakeTime,
      totalSleepHours: targetHours,
      protocols,
      lightExposure: lightExposureRecs,
      temperature,
      environment,
      tips,
    };

    if (supplements.length > 0) {
      recommendation.supplements = supplements;
    }

    return {
      schedule: {
        current: {
          bedtime: currentBedtime,
          wakeTime: currentWakeTime,
        },
        optimal: {
          bedtime: optimalBedtime,
          wakeTime: optimalWakeTime,
          totalHours: targetHours,
        },
      },
      recommendation,
      goals,
    };
  },
});

// Helper functions
function parseTime(timeStr: string): number {
  try {
    // Handle "22:30" or "10:30 PM" format
    const cleaned = timeStr.trim().toUpperCase();
    const isPM = cleaned.includes("PM");
    const isAM = cleaned.includes("AM");
    
    const timeOnly = cleaned.replace(/(AM|PM)/g, "").trim();
    const parts = timeOnly.split(/[: ]/).filter(Boolean);
    
    if (parts.length < 1) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }
    
    const hours = Number(parts[0]);
    if (isNaN(hours) || hours < 0 || hours > 23) {
      throw new Error(`Invalid hour: ${parts[0]}`);
    }
    
    let hour24 = hours;
    if (isPM && hours !== 12) hour24 += 12;
    if (isAM && hours === 12) hour24 = 0;
    
    return hour24;
  } catch (error) {
    // Default to 6 AM if parsing fails
    console.warn(`Failed to parse time "${timeStr}", defaulting to 6 AM:`, error);
    return 6;
  }
}

function formatTime(hour: number): string {
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour12}:00 ${ampm}`;
}

