/**
 * Micro-Lessons Types
 * 
 * Educational content for health optimization
 */

export type LessonCategory = 'sleep' | 'nutrition' | 'recovery' | 'stress' | 'fitness' | 'mindset' | 'biohacking' | 'hormones';

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: LessonCategory;
  readTimeMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  keyTakeaways: string[];
  relatedLessons?: string[];
  actionItems?: string[];
  sources?: { title: string; url?: string }[];
}

export interface LessonProgress {
  lessonId: string;
  completedAt?: string;
  bookmarked: boolean;
  notes?: string;
}

export interface LearningStats {
  totalCompleted: number;
  totalBookmarked: number;
  currentStreak: number;
  favoriteCategory?: LessonCategory;
  minutesLearned: number;
}

export const CATEGORY_CONFIG: Record<LessonCategory, { label: string; icon: string; color: string; description: string }> = {
  sleep: { label: 'Sleep', icon: '😴', color: '#6366f1', description: 'Optimize your rest and recovery' },
  nutrition: { label: 'Nutrition', icon: '🥗', color: '#22c55e', description: 'Fuel your body right' },
  recovery: { label: 'Recovery', icon: '🧊', color: '#06b6d4', description: 'Bounce back faster' },
  stress: { label: 'Stress', icon: '🧘', color: '#a855f7', description: 'Master your nervous system' },
  fitness: { label: 'Fitness', icon: '🏋️', color: '#ef4444', description: 'Build strength & endurance' },
  mindset: { label: 'Mindset', icon: '🧠', color: '#f97316', description: 'Train your mental game' },
  biohacking: { label: 'Biohacking', icon: '⚡', color: '#22f3c8', description: 'Advanced optimization' },
  hormones: { label: 'Hormones', icon: '⚗️', color: '#ec4899', description: 'Understand your chemistry' },
};

export const LESSONS: Lesson[] = [
  // Sleep
  {
    id: 'sleep-basics',
    title: 'The Science of Sleep Cycles',
    summary: 'Understand the stages of sleep and why each one matters for your health.',
    content: `Sleep occurs in cycles of roughly 90 minutes, alternating between light sleep, deep sleep, and REM sleep.

**Light Sleep (N1 & N2):** The transition phase. Your body starts to relax, heart rate slows, and body temperature drops. This stage makes up about 50% of your total sleep.

**Deep Sleep (N3):** The most restorative phase. Growth hormone is released, tissue repair occurs, and your immune system strengthens. Adults need 1-2 hours per night.

**REM Sleep:** Where dreams happen and memory consolidation occurs. Critical for learning and emotional processing. Increases in later sleep cycles.

**Why This Matters:** Waking mid-cycle leaves you groggy. Aim for sleep durations in 90-minute multiples (6, 7.5, or 9 hours).`,
    category: 'sleep',
    readTimeMinutes: 4,
    difficulty: 'beginner',
    tags: ['sleep cycles', 'rem', 'deep sleep', 'circadian'],
    keyTakeaways: [
      'Sleep cycles last about 90 minutes',
      'Deep sleep is most restorative',
      'REM is critical for memory',
      'Plan sleep in 90-minute multiples'
    ],
    actionItems: [
      'Calculate your ideal wake time based on 90-minute cycles',
      'Track your sleep stages with a wearable'
    ]
  },
  {
    id: 'sleep-environment',
    title: 'Creating the Perfect Sleep Environment',
    summary: 'Simple changes to your bedroom that can dramatically improve sleep quality.',
    content: `Your sleep environment has a massive impact on sleep quality. Here's how to optimize it:

**Temperature:** Keep your room cool (65-68°F / 18-20°C). Your body temperature naturally drops during sleep.

**Light:** Complete darkness is ideal. Use blackout curtains and cover LED lights. Even small amounts of light can disrupt melatonin production.

**Sound:** Consistent ambient noise (white noise, fan) is better than silence. It masks disruptive sounds.

**Bedding:** Invest in quality. Your mattress and pillow affect spinal alignment and temperature regulation.

**Air Quality:** Consider an air purifier. Clean, fresh air supports deeper sleep.`,
    category: 'sleep',
    readTimeMinutes: 3,
    difficulty: 'beginner',
    tags: ['sleep environment', 'bedroom', 'temperature', 'darkness'],
    keyTakeaways: [
      'Cool room (65-68°F) is optimal',
      'Complete darkness boosts melatonin',
      'White noise masks disruptions',
      'Quality bedding matters more than you think'
    ],
    actionItems: [
      'Set your thermostat to 67°F tonight',
      'Audit your room for light sources',
      'Try white noise for one week'
    ]
  },
  // Nutrition
  {
    id: 'protein-timing',
    title: 'Protein Timing for Muscle & Recovery',
    summary: 'When you eat protein matters almost as much as how much.',
    content: `Protein timing can optimize muscle protein synthesis (MPS) and recovery.

**Post-Workout Window:** The "anabolic window" is real but wider than once thought. Aim for 20-40g protein within 2 hours post-exercise.

**Distribution:** Spread protein across 4-5 meals. 0.4-0.5g/kg per meal maximizes MPS per sitting. Eating 100g in one meal is wasteful.

**Before Bed:** 40g casein or cottage cheese before sleep supports overnight recovery and muscle synthesis.

**Morning:** Break your fast with protein. It sets leptin sensitivity and stabilizes blood sugar for the day.

**Total Daily:** Most active adults need 1.6-2.2g/kg body weight for optimal results.`,
    category: 'nutrition',
    readTimeMinutes: 4,
    difficulty: 'intermediate',
    tags: ['protein', 'muscle', 'timing', 'recovery'],
    keyTakeaways: [
      'Distribute protein across 4-5 meals',
      '20-40g post-workout within 2 hours',
      '40g before bed supports overnight recovery',
      'Total: 1.6-2.2g/kg body weight daily'
    ],
    actionItems: [
      'Calculate your daily protein target',
      'Plan meals with 25-40g protein each',
      'Add casein/cottage cheese before bed'
    ]
  },
  {
    id: 'fasting-basics',
    title: 'Intermittent Fasting Fundamentals',
    summary: 'The science behind fasting and how to find the right protocol for you.',
    content: `Intermittent fasting (IF) cycles between eating and fasting periods. It's not about what you eat, but when.

**16:8 Protocol:** Fast 16 hours, eat within 8. Most popular and sustainable. Example: eat 12pm-8pm.

**Benefits:**
- Autophagy (cellular cleanup) starts around 16-18 hours
- Improved insulin sensitivity
- Reduced inflammation
- Mental clarity from ketone production

**Who Should Avoid IF:**
- Pregnant/breastfeeding women
- Those with eating disorder history
- Athletes with high training volume
- Anyone underweight

**Getting Started:** Don't jump to 16:8 immediately. Start with 12:12 and gradually extend your fasting window.`,
    category: 'nutrition',
    readTimeMinutes: 5,
    difficulty: 'beginner',
    tags: ['fasting', 'autophagy', '16:8', 'metabolism'],
    keyTakeaways: [
      '16:8 is the most sustainable protocol',
      'Autophagy kicks in around 16+ hours',
      'Not suitable for everyone',
      'Start gradually and adapt'
    ],
    actionItems: [
      'Start with a 12-hour eating window',
      'Track how you feel during fasts',
      'Extend fasting window by 30min/week'
    ]
  },
  // Recovery
  {
    id: 'cold-exposure',
    title: 'Cold Exposure for Recovery',
    summary: 'How deliberate cold exposure can boost recovery, mood, and resilience.',
    content: `Cold exposure triggers powerful physiological responses that enhance recovery and mental resilience.

**Benefits:**
- Dopamine increase of 200-300% (lasts hours)
- Reduced inflammation
- Improved circulation
- Brown fat activation
- Mental resilience training

**Protocols:**
- **Cold Shower:** 2-3 min at end of shower, as cold as tolerable
- **Ice Bath:** 50-59°F (10-15°C) for 2-10 minutes
- **Cold Plunge:** Similar to ice bath, more convenient

**Timing:** Avoid immediately after strength training (blunts hypertrophy). Great for non-lifting days or 4+ hours post-workout.

**Building Tolerance:** Start with 30 seconds cold at end of shower. Add 15 seconds each session.`,
    category: 'recovery',
    readTimeMinutes: 4,
    difficulty: 'intermediate',
    tags: ['cold exposure', 'cold plunge', 'dopamine', 'inflammation'],
    keyTakeaways: [
      '2-3 min cold exposure = major dopamine boost',
      'Avoid right after strength training',
      'Start with 30 seconds and build up',
      '50-59°F is the effective range'
    ],
    actionItems: [
      'End tomorrow\'s shower with 30 sec cold',
      'Track your mood after cold exposure',
      'Build to 2-3 minutes over 2 weeks'
    ]
  },
  // Stress
  {
    id: 'hrv-basics',
    title: 'Understanding HRV',
    summary: 'What heart rate variability tells you about stress, recovery, and readiness.',
    content: `Heart Rate Variability (HRV) measures the variation in time between heartbeats. Higher HRV generally indicates better recovery and stress resilience.

**What HRV Shows:**
- Autonomic nervous system balance
- Recovery status
- Stress load
- Training readiness

**Factors That Lower HRV:**
- Poor sleep
- Alcohol
- Overtraining
- Illness
- Chronic stress
- Dehydration

**Factors That Raise HRV:**
- Quality sleep
- Exercise (recovery dependent)
- Meditation/breathwork
- Cold exposure
- Good nutrition

**How to Track:** Morning readings are most reliable. Use the same device, same position, same time daily. Look at 7-day rolling average, not daily fluctuations.`,
    category: 'stress',
    readTimeMinutes: 4,
    difficulty: 'intermediate',
    tags: ['hrv', 'recovery', 'stress', 'nervous system'],
    keyTakeaways: [
      'Higher HRV = better recovery/resilience',
      'Track first thing in morning',
      'Focus on 7-day average, not daily',
      'Many lifestyle factors affect HRV'
    ],
    actionItems: [
      'Start tracking morning HRV',
      'Note what affects your readings',
      'Use HRV to guide training intensity'
    ]
  },
  {
    id: 'breathing-techniques',
    title: 'Breathwork for Instant Calm',
    summary: 'Simple breathing techniques to activate your parasympathetic nervous system.',
    content: `Your breath is the fastest way to shift your nervous system state. These techniques can calm you in minutes.

**Physiological Sigh (Fastest Reset):**
Two quick inhales through nose, one long exhale through mouth. 1-3 sighs can shift you from stress to calm.

**Box Breathing (4-4-4-4):**
Inhale 4 sec → Hold 4 sec → Exhale 4 sec → Hold 4 sec. Repeat 4+ times. Great for focus and calm.

**4-7-8 Breathing (For Sleep):**
Inhale 4 sec → Hold 7 sec → Exhale 8 sec. The long exhale activates parasympathetic response.

**When to Use:**
- Physiological sigh: Acute stress, immediate reset
- Box breathing: Before meetings, focus work
- 4-7-8: Falling asleep, anxiety

The exhale is key. Longer exhales = stronger calming effect.`,
    category: 'stress',
    readTimeMinutes: 3,
    difficulty: 'beginner',
    tags: ['breathing', 'stress relief', 'nervous system', 'sleep'],
    keyTakeaways: [
      'Physiological sigh = fastest stress reset',
      'Long exhales activate calm response',
      'Box breathing boosts focus',
      '4-7-8 is ideal for sleep'
    ],
    actionItems: [
      'Try 3 physiological sighs right now',
      'Use box breathing before your next meeting',
      'Practice 4-7-8 tonight before bed'
    ]
  },
  // Biohacking
  {
    id: 'light-exposure',
    title: 'Light Exposure & Circadian Rhythm',
    summary: 'How light controls your energy, sleep, and hormones.',
    content: `Light is the most powerful signal for your circadian rhythm. Use it strategically to optimize energy and sleep.

**Morning Sunlight (Critical):**
Get 10-30 min of sunlight within 1 hour of waking. This sets your circadian clock, boosts cortisol (good in AM), and programs melatonin release 14-16 hours later.

**Cloudy days:** You still get benefit—outdoor light is 10-50x brighter than indoor.

**Blue Light at Night:**
Block blue light 2-3 hours before bed. Blue light suppresses melatonin production. Use:
- Night mode on devices
- Blue light glasses
- Dim, warm lighting

**Red Light Therapy:**
Near-infrared and red light can boost mitochondrial function, skin health, and recovery. Best used morning or evening.

**Light Timing Rule:** Bright light in AM, dim/warm light in PM.`,
    category: 'biohacking',
    readTimeMinutes: 4,
    difficulty: 'beginner',
    tags: ['light', 'circadian', 'melatonin', 'morning routine'],
    keyTakeaways: [
      '10-30 min morning sunlight is essential',
      'Light sets melatonin release 14-16h later',
      'Block blue light 2-3h before bed',
      'Even cloudy days provide benefit'
    ],
    actionItems: [
      'Go outside within 1 hour of waking',
      'Set device night mode for 8pm',
      'Get blue light blocking glasses'
    ]
  },
];

export function getLessonsByCategory(category: LessonCategory): Lesson[] {
  return LESSONS.filter(l => l.category === category);
}

export function getRelatedLessons(lessonId: string): Lesson[] {
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return [];
  return LESSONS.filter(l => l.id !== lessonId && l.category === lesson.category).slice(0, 3);
}

