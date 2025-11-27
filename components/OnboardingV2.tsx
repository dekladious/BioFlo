"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Moon,
  Sun,
  Zap,
  Brain,
  Dumbbell,
  Heart,
  Apple,
  Clock,
  Target,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ============================================================================
// Types
// ============================================================================

interface OnboardingData {
  // Step 1: Goals
  primaryGoals: string[];
  
  // Step 2: Current State
  energyLevel: number;
  stressLevel: number;
  sleepQuality: number;
  
  // Step 3: Sleep
  wakeTime: string;
  bedTime: string;
  sleepIssues: string[];
  
  // Step 4: Training
  trainingFrequency: string;
  trainingPreferences: string[];
  fitnessLevel: string;
  
  // Step 5: Nutrition
  dietaryStyle: string;
  intermittentFasting: boolean;
  eatingWindow?: { start: string; end: string };
  
  // Step 6: Work & Lifestyle
  workStyle: string;
  focusChallenges: string[];
  
  // Step 7: Health Focus
  healthConcerns: string[];
  
  // Step 8: Preferences
  coachingStyle: string;
  notificationPreference: string;
}

interface OnboardingV2Props {
  onComplete: (data: OnboardingData) => Promise<void>;
  onSkip?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const GOALS = [
  { id: "sleep", label: "Better sleep", icon: Moon },
  { id: "energy", label: "More energy", icon: Zap },
  { id: "focus", label: "Sharper focus", icon: Brain },
  { id: "fitness", label: "Build fitness", icon: Dumbbell },
  { id: "stress", label: "Reduce stress", icon: Heart },
  { id: "nutrition", label: "Eat healthier", icon: Apple },
  { id: "longevity", label: "Longevity", icon: Sparkles },
  { id: "recovery", label: "Faster recovery", icon: Target },
];

const SLEEP_ISSUES = [
  { id: "falling_asleep", label: "Falling asleep" },
  { id: "staying_asleep", label: "Staying asleep" },
  { id: "waking_tired", label: "Waking up tired" },
  { id: "inconsistent", label: "Inconsistent schedule" },
  { id: "none", label: "No issues" },
];

const TRAINING_PREFERENCES = [
  { id: "strength", label: "Strength training" },
  { id: "cardio", label: "Cardio / Running" },
  { id: "hiit", label: "HIIT" },
  { id: "yoga", label: "Yoga / Mobility" },
  { id: "sports", label: "Sports" },
  { id: "walking", label: "Walking" },
];

const FOCUS_CHALLENGES = [
  { id: "distractions", label: "Too many distractions" },
  { id: "energy_dips", label: "Energy dips" },
  { id: "motivation", label: "Motivation" },
  { id: "overwhelm", label: "Feeling overwhelmed" },
  { id: "time", label: "Not enough time" },
];

const HEALTH_CONCERNS = [
  { id: "anxiety", label: "Anxiety" },
  { id: "mood", label: "Low mood" },
  { id: "digestion", label: "Digestion" },
  { id: "weight", label: "Weight management" },
  { id: "inflammation", label: "Inflammation" },
  { id: "hormones", label: "Hormonal balance" },
  { id: "none", label: "None specific" },
];

// ============================================================================
// Components
// ============================================================================

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === current
              ? "w-8 bg-accent-primary"
              : i < current
              ? "w-4 bg-accent-primary/50"
              : "w-4 bg-white/10"
          )}
        />
      ))}
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
  icon: Icon,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 text-left transition",
        selected
          ? "border-accent-primary bg-accent-primary/10 text-white"
          : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      {Icon && (
        <Icon className={cn("size-5", selected ? "text-accent-primary" : "text-white/50")} />
      )}
      <span className="flex-1">{children}</span>
      {selected && <Check className="size-4 text-accent-primary" />}
    </button>
  );
}

function SliderInput({
  value,
  onChange,
  min = 1,
  max = 10,
  labels,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  labels?: { low: string; high: string };
}) {
  return (
    <div className="space-y-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-accent-primary"
      />
      <div className="flex justify-between text-xs text-white/50">
        <span>{labels?.low || min}</span>
        <span className="text-lg font-bold text-accent-primary">{value}</span>
        <span>{labels?.high || max}</span>
      </div>
    </div>
  );
}

function TimeInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-white/60">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white focus:border-accent-primary focus:outline-none"
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function OnboardingV2({ onComplete, onSkip }: OnboardingV2Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    primaryGoals: [],
    energyLevel: 5,
    stressLevel: 5,
    sleepQuality: 5,
    wakeTime: "07:00",
    bedTime: "23:00",
    sleepIssues: [],
    trainingFrequency: "3-4x",
    trainingPreferences: [],
    fitnessLevel: "intermediate",
    dietaryStyle: "balanced",
    intermittentFasting: false,
    workStyle: "office",
    focusChallenges: [],
    healthConcerns: [],
    coachingStyle: "balanced",
    notificationPreference: "moderate",
  });

  const totalSteps = 8;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const toggleArrayItem = (key: keyof OnboardingData, item: string) => {
    const arr = data[key] as string[];
    if (arr.includes(item)) {
      updateData({ [key]: arr.filter((i) => i !== item) });
    } else {
      updateData({ [key]: [...arr, item] });
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await onComplete(data);
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Step content
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">What are your main goals?</h2>
              <p className="mt-2 text-white/60">Select all that apply. We'll personalize your experience.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((goal) => (
                <OptionButton
                  key={goal.id}
                  selected={data.primaryGoals.includes(goal.id)}
                  onClick={() => toggleArrayItem("primaryGoals", goal.id)}
                  icon={goal.icon}
                >
                  {goal.label}
                </OptionButton>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white">How are you feeling lately?</h2>
              <p className="mt-2 text-white/60">This helps us understand your baseline.</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-white">Energy Level</label>
                <SliderInput
                  value={data.energyLevel}
                  onChange={(v) => updateData({ energyLevel: v })}
                  labels={{ low: "Exhausted", high: "Energized" }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white">Stress Level</label>
                <SliderInput
                  value={data.stressLevel}
                  onChange={(v) => updateData({ stressLevel: v })}
                  labels={{ low: "Calm", high: "Overwhelmed" }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white">Sleep Quality</label>
                <SliderInput
                  value={data.sleepQuality}
                  onChange={(v) => updateData({ sleepQuality: v })}
                  labels={{ low: "Poor", high: "Excellent" }}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Tell us about your sleep</h2>
              <p className="mt-2 text-white/60">Sleep is foundational to everything else.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TimeInput
                label="Typical wake time"
                value={data.wakeTime}
                onChange={(v) => updateData({ wakeTime: v })}
              />
              <TimeInput
                label="Typical bed time"
                value={data.bedTime}
                onChange={(v) => updateData({ bedTime: v })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white">Any sleep challenges?</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SLEEP_ISSUES.map((issue) => (
                  <OptionButton
                    key={issue.id}
                    selected={data.sleepIssues.includes(issue.id)}
                    onClick={() => toggleArrayItem("sleepIssues", issue.id)}
                  >
                    {issue.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">How do you like to train?</h2>
              <p className="mt-2 text-white/60">We'll tailor recommendations to your style.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-white">Training frequency</label>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {["1-2x", "3-4x", "5-6x", "Daily"].map((freq) => (
                  <OptionButton
                    key={freq}
                    selected={data.trainingFrequency === freq}
                    onClick={() => updateData({ trainingFrequency: freq })}
                  >
                    {freq}
                  </OptionButton>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white">What activities do you enjoy?</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TRAINING_PREFERENCES.map((pref) => (
                  <OptionButton
                    key={pref.id}
                    selected={data.trainingPreferences.includes(pref.id)}
                    onClick={() => toggleArrayItem("trainingPreferences", pref.id)}
                  >
                    {pref.label}
                  </OptionButton>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white">Fitness level</label>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["beginner", "intermediate", "advanced"].map((level) => (
                  <OptionButton
                    key={level}
                    selected={data.fitnessLevel === level}
                    onClick={() => updateData({ fitnessLevel: level })}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </OptionButton>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Nutrition preferences</h2>
              <p className="mt-2 text-white/60">We'll factor this into meal timing and recommendations.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-white">Dietary style</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {["balanced", "low_carb", "keto", "vegetarian", "vegan", "paleo"].map((style) => (
                  <OptionButton
                    key={style}
                    selected={data.dietaryStyle === style}
                    onClick={() => updateData({ dietaryStyle: style })}
                  >
                    {style.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </OptionButton>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white">Do you practice intermittent fasting?</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <OptionButton
                  selected={data.intermittentFasting}
                  onClick={() => updateData({ intermittentFasting: true })}
                >
                  Yes
                </OptionButton>
                <OptionButton
                  selected={!data.intermittentFasting}
                  onClick={() => updateData({ intermittentFasting: false })}
                >
                  No
                </OptionButton>
              </div>
            </div>
            {data.intermittentFasting && (
              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="Eating window starts"
                  value={data.eatingWindow?.start || "12:00"}
                  onChange={(v) => updateData({ eatingWindow: { ...data.eatingWindow, start: v, end: data.eatingWindow?.end || "20:00" } })}
                />
                <TimeInput
                  label="Eating window ends"
                  value={data.eatingWindow?.end || "20:00"}
                  onChange={(v) => updateData({ eatingWindow: { ...data.eatingWindow, start: data.eatingWindow?.start || "12:00", end: v } })}
                />
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Work & focus style</h2>
              <p className="mt-2 text-white/60">Help us optimize your productive hours.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-white">Work environment</label>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["office", "remote", "hybrid"].map((style) => (
                  <OptionButton
                    key={style}
                    selected={data.workStyle === style}
                    onClick={() => updateData({ workStyle: style })}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </OptionButton>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white">What challenges your focus?</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {FOCUS_CHALLENGES.map((challenge) => (
                  <OptionButton
                    key={challenge.id}
                    selected={data.focusChallenges.includes(challenge.id)}
                    onClick={() => toggleArrayItem("focusChallenges", challenge.id)}
                  >
                    {challenge.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Any specific health focus?</h2>
              <p className="mt-2 text-white/60">We'll prioritize recommendations in these areas.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {HEALTH_CONCERNS.map((concern) => (
                <OptionButton
                  key={concern.id}
                  selected={data.healthConcerns.includes(concern.id)}
                  onClick={() => toggleArrayItem("healthConcerns", concern.id)}
                >
                  {concern.label}
                </OptionButton>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Almost done! Final preferences</h2>
              <p className="mt-2 text-white/60">How would you like BioFlo to coach you?</p>
            </div>
            <div>
              <label className="text-sm font-medium text-white">Coaching style</label>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <OptionButton
                  selected={data.coachingStyle === "gentle"}
                  onClick={() => updateData({ coachingStyle: "gentle" })}
                >
                  Gentle
                </OptionButton>
                <OptionButton
                  selected={data.coachingStyle === "balanced"}
                  onClick={() => updateData({ coachingStyle: "balanced" })}
                >
                  Balanced
                </OptionButton>
                <OptionButton
                  selected={data.coachingStyle === "tough"}
                  onClick={() => updateData({ coachingStyle: "tough" })}
                >
                  Tough love
                </OptionButton>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white">Notification preferences</label>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <OptionButton
                  selected={data.notificationPreference === "minimal"}
                  onClick={() => updateData({ notificationPreference: "minimal" })}
                >
                  Minimal
                </OptionButton>
                <OptionButton
                  selected={data.notificationPreference === "moderate"}
                  onClick={() => updateData({ notificationPreference: "moderate" })}
                >
                  Moderate
                </OptionButton>
                <OptionButton
                  selected={data.notificationPreference === "frequent"}
                  onClick={() => updateData({ notificationPreference: "frequent" })}
                >
                  Frequent
                </OptionButton>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return data.primaryGoals.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a12]/95 backdrop-blur-md p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <StepIndicator current={step} total={totalSteps} />
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-white/50 hover:text-white transition"
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-white/60 transition hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>

          {step < totalSteps - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 rounded-xl bg-accent-primary/20 px-6 py-2.5 font-medium text-white transition hover:bg-accent-primary/30 disabled:opacity-50"
            >
              Continue
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-accent-primary px-6 py-2.5 font-medium text-white transition hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating your plan...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate my plan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

