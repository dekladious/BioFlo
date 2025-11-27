"use client";

import { useState } from "react";
import { X } from "lucide-react";

type OnboardingData = {
  dietaryPreference?: string;
  fastingProtocol?: string;
  sleepGoalHours?: number;
  activityLevel?: string;
  biohackingExperience?: string;
  healthGoals?: string[];
};

export function Onboarding({ onComplete }: { onComplete: (data: OnboardingData) => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({});
  const [skipped, setSkipped] = useState(false);

  const totalSteps = 5;

  function handleNext() {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  }

  function handleSkip() {
    setSkipped(true);
    onComplete({});
  }

  async function handleComplete() {
    // Save to onboarding API (triggers AI assessment)
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: {
            healthGoals: data.healthGoals || [],
            dietaryPreference: data.dietaryPreference,
            activityLevel: data.activityLevel,
          },
          struggles: [], // Can be enhanced later with a dedicated struggles step
          preferences: {
            dietaryPreference: data.dietaryPreference || null,
            fastingProtocol: data.fastingProtocol || null,
            sleepGoalHours: data.sleepGoalHours || null,
            activityLevel: data.activityLevel || null,
            biohackingExperience: data.biohackingExperience || null,
            healthGoals: data.healthGoals || [],
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding data");
      }

      const result = await response.json();
      // Store session ID for chat continuity
      if (result.data?.sessionId) {
        localStorage.setItem("bioflo-session-id", result.data.sessionId);
      }
    } catch (error) {
      console.error("Failed to save onboarding data", error);
    }
    onComplete(data);
  }

  if (skipped) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-[22px] border border-white/10 bg-white/[0.045] backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_60px_rgba(0,0,0,0.45)] p-6 md:p-8">
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
        >
          <X className="size-4" />
        </button>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
            <span>Welcome to BioFlo</span>
            <span>Step {step} of {totalSteps}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">What’s your dietary preference?</h2>
            <p className="text-slate-300">This helps us personalize your meal plans and recommendations.</p>
            <div className="grid gap-3">
              {["standard", "keto", "vegan", "vegetarian", "pescatarian", "carnivore", "paleo"].map((pref) => (
                <button
                  key={pref}
                  onClick={() => {
                    setData((d) => ({ ...d, dietaryPreference: pref }));
                    handleNext();
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06] hover:border-white/20 transition capitalize"
                >
                  {pref.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Do you practice intermittent fasting?</h2>
            <p className="text-slate-300">Select your current fasting protocol, or skip if you don’t fast.</p>
            <div className="grid gap-3">
              {["14:10", "16:8", "18:6", "OMAD", "5:2"].map((protocol) => (
                <button
                  key={protocol}
                  onClick={() => {
                    setData((d) => ({ ...d, fastingProtocol: protocol }));
                    handleNext();
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06] hover:border-white/20 transition"
                >
                  {protocol}
                </button>
              ))}
              <button
                onClick={handleNext}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06] hover:border-white/20 transition text-slate-400"
              >
                Skip (I don’t fast)
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">What’s your activity level?</h2>
            <p className="text-slate-300">This helps us calculate your macros and recovery needs.</p>
            <div className="grid gap-3">
              {[
                { value: "sedentary", label: "Sedentary", desc: "Little to no exercise" },
                { value: "light", label: "Light", desc: "Light exercise 1-3 days/week" },
                { value: "moderate", label: "Moderate", desc: "Moderate exercise 3-5 days/week" },
                { value: "active", label: "Active", desc: "Hard exercise 6-7 days/week" },
                { value: "very_active", label: "Very Active", desc: "Very hard exercise, physical job" },
                { value: "athlete", label: "Athlete", desc: "Professional athlete or intense training" },
              ].map((level) => (
                <button
                  key={level.value}
                  onClick={() => {
                    setData((d) => ({ ...d, activityLevel: level.value }));
                    handleNext();
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06] hover:border-white/20 transition"
                >
                  <div className="font-medium text-white">{level.label}</div>
                  <div className="text-sm text-slate-400">{level.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">What’s your biohacking experience level?</h2>
            <p className="text-slate-300">This helps us tailor protocol complexity to your needs.</p>
            <div className="grid gap-3">
              {[
                { value: "beginner", label: "Beginner", desc: "New to biohacking" },
                { value: "intermediate", label: "Intermediate", desc: "Some experience with protocols" },
                { value: "advanced", label: "Advanced", desc: "Experienced biohacker" },
              ].map((exp) => (
                <button
                  key={exp.value}
                  onClick={() => {
                    setData((d) => ({ ...d, biohackingExperience: exp.value }));
                    handleNext();
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06] hover:border-white/20 transition"
                >
                  <div className="font-medium text-white">{exp.label}</div>
                  <div className="text-sm text-slate-400">{exp.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">What are your health goals?</h2>
            <p className="text-slate-300">Select all that apply. We’ll personalize your protocols accordingly.</p>
            <div className="grid gap-3">
              {[
                "weight_loss",
                "muscle_gain",
                "longevity",
                "performance",
                "sleep",
                "stress_reduction",
                "hormonal_balance",
                "recovery",
              ].map((goal) => (
                <button
                  key={goal}
                  onClick={() => {
                    const current = data.healthGoals || [];
                    const updated = current.includes(goal)
                      ? current.filter((g) => g !== goal)
                      : [...current, goal];
                    setData((d) => ({ ...d, healthGoals: updated }));
                  }}
                  className={`rounded-xl border p-4 text-left transition capitalize ${
                    data.healthGoals?.includes(goal)
                      ? "border-sky-400/50 bg-sky-400/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:border-white/20"
                  }`}
                >
                  {goal.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleComplete}
                className="flex-1 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-3 font-medium text-black shadow-[0_12px_30px_rgba(56,189,248,0.35)] transition hover:brightness-110"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {step < 5 && (
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition"
              >
                Back
              </button>
            )}
            <button
              onClick={handleSkip}
              className="ml-auto rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

