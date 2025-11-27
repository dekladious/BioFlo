"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Shield, ToggleLeft, ToggleRight, X, Settings } from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
import {
  BiofloPreferences,
  DEFAULT_PREFERENCES,
  loadPreferences,
  subscribeToPreferences,
  updatePreferences,
} from "@/lib/preferences";

function SettingToggle({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] px-4 py-3 text-left text-sm transition hover:bg-[color:var(--bg-card-hover)]"
    >
      <div>
        <p className="font-medium text-[color:var(--text-primary)]">{label}</p>
        {helper && <p className="text-xs text-[color:var(--text-soft)]">{helper}</p>}
      </div>
      {value ? (
        <ToggleRight className="size-6 text-[color:var(--accent-primary)]" />
      ) : (
        <ToggleLeft className="size-6 text-[color:var(--text-soft)]" />
      )}
    </button>
  );
}

export function SettingsCog() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<BiofloPreferences>(DEFAULT_PREFERENCES);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setPreferences(loadPreferences());
    const unsubscribe = subscribeToPreferences(setPreferences);
    return unsubscribe;
  }, []);

  const handlePreferenceChange = <K extends keyof BiofloPreferences>(key: K, value: BiofloPreferences[K]) => {
    const next = updatePreferences({ [key]: value });
    setPreferences(next);
  };

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] text-[color:var(--text-primary)] shadow-[var(--shadow-card)] transition hover:bg-[color:var(--bg-card-hover)]"
        aria-label="Open settings"
      >
        <Settings className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 backdrop-blur-sm">
          <div className="relative m-4 w-full max-w-md rounded-3xl border border-[color:var(--border-card)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)]">Preferences</p>
                <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">BioFlo settings</h2>
                <p className="text-sm text-[color:var(--text-soft)]">
                  Tune the experience without digging through multiple pages.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[color:var(--border-subtle)] p-2 text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]"
                aria-label="Close settings"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--text-soft)]">Experience</p>
                <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4">
                  <p className="mb-2 text-sm font-semibold text-[color:var(--text-primary)]">Theme</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleThemeChange("dark")}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        resolvedTheme === "dark"
                          ? "border-[color:var(--accent-primary)]/60 bg-[color:var(--accent-primary)]/15 text-[color:var(--accent-primary)]"
                          : "border-[color:var(--border-subtle)] text-[color:var(--text-soft)] hover:border-[color:var(--border-strong)]"
                      }`}
                    >
                      <Moon className="size-4" />
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => handleThemeChange("light")}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        resolvedTheme === "light"
                          ? "border-[color:var(--accent-primary)]/60 bg-[color:var(--accent-primary)]/15 text-[color:var(--accent-primary)]"
                          : "border-[color:var(--border-subtle)] text-[color:var(--text-soft)] hover:border-[color:var(--border-strong)]"
                      }`}
                    >
                      <Sun className="size-4" />
                      Light
                    </button>
                  </div>
                </div>
                <SettingToggle
                  label="Streaming chat"
                  helper="Render replies token-by-token like ChatGPT."
                  value={preferences.streamingResponses}
                  onChange={(next) => handlePreferenceChange("streamingResponses", next)}
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--text-soft)]">Safety & nudges</p>
                <SettingToggle
                  label="Care alerts"
                  helper="Allow escalations if deviations go unanswered."
                  value={preferences.careAlerts}
                  onChange={(next) => handlePreferenceChange("careAlerts", next)}
                />
                <SettingToggle
                  label="Check-in reminders"
                  helper="Daily pulse nudges for mood, energy, and sleep."
                  value={preferences.checkInReminders}
                  onChange={(next) => handlePreferenceChange("checkInReminders", next)}
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--text-soft)]">Telemetry</p>
                <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
                  <div className="mb-3 flex items-center gap-2 text-[color:var(--text-primary)]">
                    <Shield className="size-4 text-[color:var(--accent-primary)]" />
                    <p className="font-semibold">Anonymous analytics</p>
                  </div>
                  <p className="text-xs text-[color:var(--text-soft)]">
                    Opt in to share anonymous usage so we can improve guardrails and performance.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <SettingToggle
                      label="Share anonymised stats"
                      value={preferences.telemetryOptIn}
                      onChange={(next) => handlePreferenceChange("telemetryOptIn", next)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
