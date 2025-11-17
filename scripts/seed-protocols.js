#!/usr/bin/env node

/**
 * Seed Protocols Script
 * 
 * Creates 3-4 base protocols with JSON configs.
 * 
 * Usage:
 *   node scripts/seed-protocols.js
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Pool } from "pg";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found in .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const protocols = [
  {
    slug: "sleep-reset-14",
    name: "14-Day Sleep Reset",
    description: "A structured programme to reset your sleep by locking in consistent wake times, optimising light exposure, and building sustainable wind-down routines.",
    config: {
      duration: 14,
      tags: ["sleep", "circadian", "light", "beginner-friendly"],
      days: [
        {
          day: 1,
          title: "Lock in your wake time",
          summary: "Start by choosing a consistent wake time you can maintain.",
          actions: [
            "Pick a wake time you can keep ±1 hour, even on weekends.",
            "Set your alarm and place your phone across the room.",
            "Get 5–10 minutes of outdoor light within 30–60 minutes of waking.",
          ],
          education: "Consistent wake times anchor your circadian rhythm. Even if you go to bed late, waking at the same time helps reset your internal clock over time.",
        },
        {
          day: 2,
          title: "Morning light routine",
          summary: "Build a morning light exposure habit.",
          actions: [
            "Within 30 minutes of waking, get outside for 5–10 minutes (even if cloudy).",
            "If you can't get outside, sit near a bright window for 15–20 minutes.",
            "Avoid bright screens until after morning light exposure.",
          ],
          education: "Morning light exposure suppresses melatonin and signals to your brain that it's daytime. This helps regulate your sleep-wake cycle and improves evening sleep quality.",
        },
        {
          day: 3,
          title: "Dial in your caffeine",
          summary: "Optimise caffeine timing for better sleep.",
          actions: [
            "Set a caffeine cut-off time (ideally 8–10 hours before bed).",
            "If you drink coffee after 2pm, move it earlier or reduce the amount.",
            "Track how caffeine timing affects your evening sleep.",
          ],
          education: "Caffeine has a half-life of 5–6 hours. Drinking it too late can interfere with sleep onset and quality, even if you don't feel it.",
        },
        {
          day: 4,
          title: "Create your wind-down routine",
          summary: "Build a 30–60 minute pre-sleep routine.",
          actions: [
            "Start your wind-down 30–60 minutes before your target bedtime.",
            "Dim lights in your home (or use warm bulbs).",
            "Put away screens or use blue-light filters.",
            "Do something calming: read, stretch, journal, or listen to calming music.",
          ],
          education: "A consistent wind-down routine signals to your brain that it's time to prepare for sleep. This helps reduce racing thoughts and improves sleep onset.",
        },
        {
          day: 5,
          title: "Optimise your sleep environment",
          summary: "Make your bedroom ideal for sleep.",
          actions: [
            "Keep your bedroom cool (around 18–20°C / 64–68°F).",
            "Ensure your room is as dark as possible (blackout curtains or eye mask).",
            "Reduce noise (earplugs or white noise if needed).",
            "Keep your phone out of the bedroom or on silent.",
          ],
          education: "Your sleep environment directly impacts sleep quality. Cool, dark, and quiet conditions promote deeper, more restorative sleep.",
        },
        {
          day: 6,
          title: "Establish your bedtime",
          summary: "Set a consistent bedtime based on your wake time.",
          actions: [
            "Calculate your bedtime: wake time minus 7–9 hours (your sleep need).",
            "Aim to be in bed at this time consistently.",
            "If you're not sleepy, wait 15–20 minutes, then try again.",
            "Avoid staying in bed awake for more than 20 minutes.",
          ],
          education: "Consistent bedtimes, paired with consistent wake times, help regulate your circadian rhythm. If you can't sleep, get up briefly to avoid associating your bed with wakefulness.",
        },
        {
          day: 7,
          title: "Week 1 review",
          summary: "Reflect on your first week and adjust.",
          actions: [
            "Review what's working: which changes felt easiest?",
            "Identify what's challenging: what needs adjustment?",
            "Adjust your wake time or bedtime if needed (small changes, ±30 minutes).",
            "Commit to continuing for Week 2.",
          ],
          education: "The first week is about establishing patterns. It's normal to feel some adjustment. Small, consistent changes compound over time.",
        },
        {
          day: 8,
          title: "Deepen your morning routine",
          summary: "Expand your morning light and movement.",
          actions: [
            "Increase morning light exposure to 10–15 minutes if possible.",
            "Add 5–10 minutes of light movement (walk, stretch) after morning light.",
            "Keep your wake time consistent, even on weekends.",
          ],
          education: "Morning light combined with movement further strengthens your circadian signal. This helps improve daytime energy and evening sleep pressure.",
        },
        {
          day: 9,
          title: "Evening screen boundaries",
          summary: "Strictly limit screens before bed.",
          actions: [
            "Set a screen curfew 1–2 hours before bed.",
            "Use blue-light filters if you must use screens.",
            "Replace evening screen time with reading, conversation, or quiet activities.",
          ],
          education: "Blue light from screens suppresses melatonin production. Reducing screen time before bed helps your brain prepare for sleep naturally.",
        },
        {
          day: 10,
          title: "Manage evening stress",
          summary: "Add stress-reduction techniques to your wind-down.",
          actions: [
            "Try 5–10 minutes of deep breathing or meditation before bed.",
            "Write down tomorrow's tasks to clear your mind.",
            "Practice gratitude or journaling if helpful.",
          ],
          education: "Evening stress and racing thoughts are common sleep disruptors. Simple techniques like breathing exercises and journaling can help calm your mind.",
        },
        {
          day: 11,
          title: "Fine-tune your schedule",
          summary: "Optimise your sleep window based on how you feel.",
          actions: [
            "Notice if you're waking up naturally before your alarm.",
            "If you're consistently tired, try going to bed 15–30 minutes earlier.",
            "If you're waking up too early, you might be going to bed too early.",
            "Adjust gradually, not all at once.",
          ],
          education: "Your ideal sleep window may differ from the standard 8 hours. Pay attention to how you feel and adjust your schedule accordingly.",
        },
        {
          day: 12,
          title: "Weekend consistency",
          summary: "Maintain your schedule even on weekends.",
          actions: [
            "Keep your wake time within ±1 hour on weekends.",
            "If you stay up later, still wake at your usual time.",
            "You can nap if needed, but keep it short (20–30 minutes) and before 3pm.",
          ],
          education: "Weekend schedule shifts can disrupt your circadian rhythm. Maintaining consistency helps lock in your new sleep patterns.",
        },
        {
          day: 13,
          title: "Troubleshoot common issues",
          summary: "Address any remaining sleep challenges.",
          actions: [
            "If you're still struggling to fall asleep, review your wind-down routine.",
            "If you're waking up at night, check your sleep environment (temperature, noise).",
            "If you're tired during the day, ensure you're getting enough total sleep.",
            "Consider talking to the coach about specific challenges.",
          ],
          education: "Sleep improvement is a process. Some issues resolve with time, while others may need targeted adjustments. Don't hesitate to seek support.",
        },
        {
          day: 14,
          title: "Lock in your habits",
          summary: "Finalise your personalised sleep routine.",
          actions: [
            "Review your complete 14-day journey.",
            "Identify the 3–5 habits that made the biggest difference.",
            "Commit to maintaining these core habits going forward.",
            "Celebrate your progress!",
          ],
          education: "You've built a foundation for better sleep. The key is consistency. Stick with the habits that work for you, and your sleep will continue to improve.",
        },
      ],
    },
  },
  {
    slug: "calm-anxiety-7",
    name: "7-Day Calm Anxiety Kickstart",
    description: "A focused week to build foundational tools for managing anxiety through breathing, NSDR, journaling, and reducing stimulation.",
    config: {
      duration: 7,
      tags: ["anxiety", "stress", "breathing", "beginner-friendly"],
      days: [
        {
          day: 1,
          title: "Learn box breathing",
          summary: "Master a simple breathing technique you can use anywhere.",
          actions: [
            "Practice box breathing: inhale for 4 counts, hold for 4, exhale for 4, hold for 4.",
            "Repeat for 2–3 minutes, 2–3 times today.",
            "Use it whenever you feel anxious or stressed.",
          ],
          education: "Box breathing activates your parasympathetic nervous system, helping to calm your body's stress response. It's a portable tool you can use anytime.",
        },
        {
          day: 2,
          title: "Morning NSDR",
          summary: "Add a non-sleep deep rest session to your morning.",
          actions: [
            "Find a 10–20 minute NSDR or guided meditation (YouTube, apps).",
            "Do it in the morning, ideally after waking or mid-morning.",
            "Focus on deep relaxation, not sleep.",
          ],
          education: "NSDR (Non-Sleep Deep Rest) helps reset your nervous system and reduce baseline anxiety. Morning practice can set a calmer tone for the day.",
        },
        {
          day: 3,
          title: "Evening journaling",
          summary: "Start a simple anxiety journaling practice.",
          actions: [
            "Before bed, write down 2–3 things that caused anxiety today.",
            "For each, write one thing you can control and one thing you can't.",
            "End with one thing you're grateful for.",
          ],
          education: "Journaling helps externalise anxious thoughts and creates distance from them. It also helps identify patterns and what you can actually influence.",
        },
        {
          day: 4,
          title: "Reduce stimulation",
          summary: "Cut back on overstimulating activities.",
          actions: [
            "Limit news consumption to once per day (or skip it today).",
            "Reduce social media scrolling (set a timer if needed).",
            "Take breaks from screens every 60–90 minutes.",
            "Notice how reduced stimulation affects your anxiety levels.",
          ],
          education: "Constant stimulation can heighten anxiety. Reducing input gives your nervous system a chance to reset and lowers baseline stress.",
        },
        {
          day: 5,
          title: "Light movement",
          summary: "Add gentle movement to help regulate your nervous system.",
          actions: [
            "Take a 10–15 minute walk, ideally in nature if possible.",
            "Focus on your breath and surroundings, not your phone.",
            "Notice how movement affects your anxiety.",
          ],
          education: "Light movement helps regulate your nervous system and can reduce anxiety. Walking in nature has additional calming benefits.",
        },
        {
          day: 6,
          title: "Combine your tools",
          summary: "Practice using multiple techniques together.",
          actions: [
            "When you feel anxious, try: box breathing → short walk → journaling.",
            "Notice which combination works best for you.",
            "Create your personal anxiety toolkit.",
          ],
          education: "Different tools work for different situations. Having multiple options gives you flexibility and increases your sense of control.",
        },
        {
          day: 7,
          title: "Build your ongoing practice",
          summary: "Lock in the habits that work for you.",
          actions: [
            "Identify the 2–3 tools that helped most this week.",
            "Commit to using them daily or as needed.",
            "Remember: anxiety management is an ongoing practice, not a one-time fix.",
          ],
          education: "Anxiety management is a skill that improves with practice. Consistency with your chosen tools will help you build resilience over time.",
        },
      ],
    },
  },
  {
    slug: "energy-focus-10",
    name: "10-Day Energy & Focus Boost",
    description: "Optimise your energy and focus through consistent sleep-wake cycles, strategic movement, caffeine timing, and glucose-friendly nutrition patterns.",
    config: {
      duration: 10,
      tags: ["energy", "focus", "productivity", "intermediate"],
      days: [
        {
          day: 1,
          title: "Lock in your sleep-wake cycle",
          summary: "Establish consistent wake and bed times.",
          actions: [
            "Set a wake time you can maintain every day.",
            "Calculate your bedtime (wake time minus 7–9 hours).",
            "Get morning light within 30 minutes of waking.",
          ],
          education: "Consistent sleep-wake times are the foundation of stable energy. Your circadian rhythm regulates energy levels throughout the day.",
        },
        {
          day: 2,
          title: "Optimise caffeine timing",
          summary: "Time your caffeine for maximum focus and minimal crashes.",
          actions: [
            "Delay your first coffee by 90–120 minutes after waking.",
            "Set a caffeine cut-off time (8–10 hours before bed).",
            "Track how timing affects your afternoon energy.",
          ],
          education: "Delaying caffeine allows your natural cortisol to wake you up first, reducing tolerance. Cutting off early prevents evening crashes and sleep disruption.",
        },
        {
          day: 3,
          title: "Movement snacks",
          summary: "Add short movement breaks throughout the day.",
          actions: [
            "Take a 2–5 minute walk every 60–90 minutes.",
            "Do 10–20 squats or push-ups during breaks.",
            "Notice how movement affects your focus and energy.",
          ],
          education: "Short movement breaks improve blood flow to the brain, boost focus, and prevent energy crashes. They're more effective than long sedentary periods.",
        },
        {
          day: 4,
          title: "Glucose-friendly meals",
          summary: "Structure meals to maintain stable blood sugar.",
          actions: [
            "Start meals with protein or vegetables before carbs.",
            "Include protein in every meal.",
            "Avoid large carb-only meals that cause energy spikes and crashes.",
          ],
          education: "Stable blood sugar prevents energy crashes. Protein and fibre slow glucose absorption, providing steady energy throughout the day.",
        },
        {
          day: 5,
          title: "Morning deep work block",
          summary: "Schedule your most important work in the morning.",
          actions: [
            "Identify your 2–3 most important tasks for tomorrow.",
            "Schedule them for your first 2–3 hours after waking.",
            "Protect this time from meetings and distractions.",
          ],
          education: "Your cognitive performance peaks in the morning (2–4 hours after waking). Use this window for your most demanding work.",
        },
        {
          day: 6,
          title: "Afternoon recovery",
          summary: "Plan for the natural afternoon dip.",
          actions: [
            "Schedule lighter tasks for mid-afternoon (2–4pm).",
            "Take a 10–20 minute NSDR or rest break if possible.",
            "Use afternoon for meetings, admin, or less demanding work.",
          ],
          education: "Energy naturally dips in the afternoon. Working with this rhythm, rather than against it, improves overall productivity.",
        },
        {
          day: 7,
          title: "Evening wind-down",
          summary: "Protect your evening to preserve next-day energy.",
          actions: [
            "Stop work 1–2 hours before bed.",
            "Dim lights and reduce screens in the evening.",
            "Do something relaxing that doesn't require mental effort.",
          ],
          education: "Evening rest is crucial for next-day energy. Overstimulation in the evening can disrupt sleep and reduce next-day performance.",
        },
        {
          day: 8,
          title: "Hydration and energy",
          summary: "Optimise hydration for sustained energy.",
          actions: [
            "Drink water consistently throughout the day (not just when thirsty).",
            "Aim for 2–3 litres, adjusted for activity and climate.",
            "Notice how hydration affects your energy and focus.",
          ],
          education: "Even mild dehydration can reduce cognitive performance and energy. Consistent hydration supports optimal brain function.",
        },
        {
          day: 9,
          title: "Fine-tune your routine",
          summary: "Adjust based on what's working.",
          actions: [
            "Review which changes improved your energy most.",
            "Identify any remaining energy drains.",
            "Make small adjustments to optimise further.",
          ],
          education: "Energy optimisation is personal. Pay attention to what works for your body and schedule, and adjust accordingly.",
        },
        {
          day: 10,
          title: "Lock in your energy system",
          summary: "Commit to your personalised energy routine.",
          actions: [
            "Identify the 3–5 habits that boosted your energy most.",
            "Create a daily routine that includes these habits.",
            "Remember: consistency beats perfection.",
          ],
          education: "Sustainable energy comes from consistent habits. Focus on maintaining the routines that work for you, rather than trying to optimise everything.",
        },
      ],
    },
  },
  {
    slug: "recovery-mode-7",
    name: "7-Day Recovery Mode",
    description: "A focused week to support recovery when your body needs rest: backing off intensity, prioritising sleep, and adding parasympathetic work.",
    config: {
      duration: 7,
      tags: ["recovery", "rest", "stress", "intermediate"],
      days: [
        {
          day: 1,
          title: "Assess your recovery needs",
          summary: "Identify why you need recovery mode.",
          actions: [
            "Notice signs: low HRV, high resting HR, poor sleep, persistent fatigue.",
            "Identify stressors: overtraining, work stress, poor sleep, illness.",
            "Commit to prioritising recovery this week.",
          ],
          education: "Recovery is as important as training. Recognising when you need recovery prevents burnout and supports long-term progress.",
        },
        {
          day: 2,
          title: "Reduce training intensity",
          summary: "Back off from high-intensity activities.",
          actions: [
            "Replace intense workouts with light movement (walking, stretching, yoga).",
            "If you must train, reduce volume and intensity by 50–70%.",
            "Focus on movement quality over quantity.",
          ],
          education: "Reducing intensity allows your body to recover. Light movement maintains mobility without adding stress.",
        },
        {
          day: 3,
          title: "Prioritise sleep",
          summary: "Make sleep your top priority.",
          actions: [
            "Aim for 8–9 hours of sleep (or more if needed).",
            "Go to bed 30–60 minutes earlier than usual.",
            "Create ideal sleep conditions: cool, dark, quiet.",
          ],
          education: "Sleep is when your body repairs and recovers. Prioritising sleep accelerates recovery from stress and training.",
        },
        {
          day: 4,
          title: "Add parasympathetic work",
          summary: "Activate your rest-and-digest system.",
          actions: [
            "Do 10–20 minutes of NSDR or meditation daily.",
            "Practice deep breathing (box breathing or 4-7-8).",
            "Take warm baths or showers to promote relaxation.",
          ],
          education: "Parasympathetic activation (rest-and-digest) counteracts stress and supports recovery. These practices help your body shift into recovery mode.",
        },
        {
          day: 5,
          title: "Optimise nutrition for recovery",
          summary: "Support recovery with adequate nutrition.",
          actions: [
            "Ensure adequate protein intake (supports repair).",
            "Don't restrict calories if you're recovering from training stress.",
            "Include anti-inflammatory foods: vegetables, fruits, healthy fats.",
          ],
          education: "Adequate nutrition supports recovery. Protein repairs tissues, and anti-inflammatory foods reduce recovery time.",
        },
        {
          day: 6,
          title: "Manage life stress",
          summary: "Reduce non-training stressors where possible.",
          actions: [
            "Identify and reduce unnecessary commitments this week.",
            "Practice saying no to non-essential activities.",
            "Prioritise rest and recovery activities.",
          ],
          education: "Life stress adds to training stress. Reducing overall stress load accelerates recovery.",
        },
        {
          day: 7,
          title: "Plan your return",
          summary: "Gradually return to normal activity.",
          actions: [
            "Assess how you feel: energy, sleep, mood, HRV (if tracked).",
            "Plan a gradual return: start at 50% intensity, then build back.",
            "Continue prioritising sleep and recovery practices.",
          ],
          education: "Recovery is ongoing. Gradually returning to activity prevents re-injury and supports sustainable progress.",
        },
      ],
    },
  },
];

async function seedProtocols() {
  console.log("🌱 Seeding protocols...\n");

  try {
    for (const protocol of protocols) {
      // Check if protocol already exists
      const existing = await pool.query("SELECT id FROM protocols WHERE slug = $1", [protocol.slug]);

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping ${protocol.name} (already exists)`);
        continue;
      }

      // Insert protocol
      const result = await pool.query(
        `INSERT INTO protocols (slug, name, description, config)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [protocol.slug, protocol.name, protocol.description, JSON.stringify(protocol.config)]
      );

      console.log(`✅ Created: ${protocol.name} (ID: ${result.rows[0].id})`);
    }

    console.log("\n✅ Protocol seeding complete!");
    console.log(`\nSeeded ${protocols.length} protocol(s).`);
  } catch (error) {
    console.error("\n❌ Error seeding protocols:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedProtocols();

