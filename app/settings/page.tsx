"use client";

import { useEffect, useState } from "react";

type Profile = {
  clerkUserId?: string;
  displayName?: string | null;
  prefs?: {
    dietaryPreference?: string | null;
    fastingProtocol?: string | null;
    sleepGoalHours?: number | null;
    activityLevel?: string | null;
    biohackingExperience?: string | null;
    supplements?: Array<{ name: string; dosage: string }> | null;
  } | null;
  goals?: string[] | null;
  email?: string | null;
};

const TABS = ["profile", "account", "appearance", "notifications"] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("profile");
  const [profile, setProfile] = useState<Profile>({
    displayName: "Daniel Ekladious",
    email: "Danielekladious@gmail.com",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setProfile((prev) => ({
          ...prev,
          displayName: data?.data?.displayName ?? prev.displayName ?? "Daniel Ekladious",
          email: data?.data?.email ?? prev.email ?? "Danielekladious@gmail.com",
          prefs: data?.data?.preferences || prev.prefs || null,
          goals: data?.data?.preferences?.health_goals || prev.goals || null,
        }));
      } catch (error) {
        console.warn("Failed to load profile", error);
      }
    })();
  }, []);

  async function save() {
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.displayName,
          prefs: {
            dietaryPreference: profile.prefs?.dietaryPreference || null,
            fastingProtocol: profile.prefs?.fastingProtocol || null,
            sleepGoalHours: profile.prefs?.sleepGoalHours || null,
            activityLevel: profile.prefs?.activityLevel || null,
            biohackingExperience: profile.prefs?.biohackingExperience || null,
            supplements: profile.prefs?.supplements || null,
          },
          goals: profile.goals || null,
        }),
      });
      if (res.ok) {
        // Show success message (you could add a toast here)
        console.log("Profile saved successfully");
      }
    } catch (error) {
      console.error("Failed to save profile", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[16px] border border-white/10 bg-white/[0.045] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06] md:p-8">
      <div className="grid gap-6 md:grid-cols-[240px,1fr]">
        <aside className="rounded-[16px] border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06]">
          <div className="border-b border-white/12 px-5 py-4 text-lg font-semibold text-white">Settings</div>
          <nav className="flex flex-col px-2 py-3">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`mx-1 rounded-xl px-4 py-2 text-left text-sm capitalize transition ${
                  tab === item ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/6"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <section className="rounded-[16px] border border-white/10 bg-white/[0.045] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06] md:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-24 place-items-center rounded-full bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 text-4xl font-bold text-white">
              A
            </div>
            <div>
              <div className="text-3xl font-semibold text-white">Daniel Ekladious</div>
              <div className="text-sm text-slate-400">Danielekladious@gmail.com</div>
            </div>
          </div>

          {tab === "profile" ? (
            <div className="mt-10 grid max-w-xl gap-5">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Name</label>
                <input
                  value={profile.displayName ?? ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, displayName: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Email</label>
                <input
                  value={profile.email ?? ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  placeholder="email@example.com"
                />
              </div>
              
              <div className="mt-6 border-t border-white/10 pt-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Biohacking Profile</h3>
                
                <div className="grid gap-5">
                  <div>
                    <label className="mb-1 block text-sm text-slate-400">Dietary Preference</label>
                    <select
                      value={profile.prefs?.dietaryPreference || ""}
                      onChange={(e) => setProfile((prev) => ({
                        ...prev,
                        prefs: { ...prev.prefs, dietaryPreference: e.target.value || null },
                      }))}
                      className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="standard">Standard</option>
                      <option value="keto">Keto</option>
                      <option value="vegan">Vegan</option>
                      <option value="vegetarian">Vegetarian</option>
                      <option value="pescatarian">Pescatarian</option>
                      <option value="carnivore">Carnivore</option>
                      <option value="paleo">Paleo</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm text-slate-400">Fasting Protocol</label>
                    <select
                      value={profile.prefs?.fastingProtocol || ""}
                      onChange={(e) => setProfile((prev) => ({
                        ...prev,
                        prefs: { ...prev.prefs, fastingProtocol: e.target.value || null },
                      }))}
                      className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="">None</option>
                      <option value="14:10">14:10</option>
                      <option value="16:8">16:8</option>
                      <option value="18:6">18:6</option>
                      <option value="OMAD">OMAD</option>
                      <option value="5:2">5:2</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm text-slate-400">Sleep Goal (hours)</label>
                    <input
                      type="number"
                      min="5"
                      max="10"
                      value={profile.prefs?.sleepGoalHours || ""}
                      onChange={(e) => setProfile((prev) => ({
                        ...prev,
                        prefs: { ...prev.prefs, sleepGoalHours: e.target.value ? parseInt(e.target.value) : null },
                      }))}
                      className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      placeholder="7-9"
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm text-slate-400">Activity Level</label>
                    <select
                      value={profile.prefs?.activityLevel || ""}
                      onChange={(e) => setProfile((prev) => ({
                        ...prev,
                        prefs: { ...prev.prefs, activityLevel: e.target.value || null },
                      }))}
                      className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="sedentary">Sedentary</option>
                      <option value="light">Light</option>
                      <option value="moderate">Moderate</option>
                      <option value="active">Active</option>
                      <option value="very_active">Very Active</option>
                      <option value="athlete">Athlete</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm text-slate-400">Biohacking Experience</label>
                    <select
                      value={profile.prefs?.biohackingExperience || ""}
                      onChange={(e) => setProfile((prev) => ({
                        ...prev,
                        prefs: { ...prev.prefs, biohackingExperience: e.target.value || null },
                      }))}
                      className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm text-slate-400">Health Goals (comma-separated)</label>
                    <input
                      value={Array.isArray(profile.goals) ? profile.goals.join(", ") : ""}
                      onChange={(e) => setProfile((prev) => ({
                        ...prev,
                        goals: e.target.value ? e.target.value.split(",").map(g => g.trim()).filter(Boolean) : null,
                      }))}
                      className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      placeholder="weight_loss, muscle_gain, longevity"
                    />
                    <p className="mt-1 text-xs text-slate-500">Examples: weight_loss, muscle_gain, longevity, performance, sleep</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-sm text-slate-400">Password</label>
                <input
                  type="password"
                  value="••••••••"
                  readOnly
                  className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
                />
                <p className="mt-1 text-xs text-slate-500">Manage your password from your account security page.</p>
              </div>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-3 font-medium text-black shadow-[0_12px_30px_rgba(56,189,248,0.35)] transition hover:brightness-110 disabled:opacity-50 will-change-transform md:w-auto"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          ) : (
            <div className="mt-10 rounded-xl border border-dashed border-white/15 bg-black/10 p-6 text-sm text-slate-400">
              {tab.charAt(0).toUpperCase() + tab.slice(1)} settings coming soon.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
