export type BiofloPreferences = {
  theme: "dark" | "light";
  accentColor: "default" | "cyan" | "violet" | "emerald";
  language: string;
  spokenLanguage: string;
  voice: string;
  streamingResponses: boolean;
  careAlerts: boolean;
  checkInReminders: boolean;
  telemetryOptIn: boolean;
  showAdditionalModels: boolean;
};

export const DEFAULT_PREFERENCES: BiofloPreferences = {
  theme: "dark",
  accentColor: "default",
  language: "auto",
  spokenLanguage: "auto",
  voice: "spruce",
  streamingResponses: true,
  careAlerts: true,
  checkInReminders: true,
  telemetryOptIn: false,
  showAdditionalModels: false,
};

const PREF_KEY = "bioflo-preferences";
export const PREFERENCES_EVENT = "bioflo-preferences-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

function applyTheme(theme: "dark" | "light") {
  if (!isBrowser()) return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  window.localStorage.setItem("bioflo-theme", theme);
}

export function loadPreferences(): BiofloPreferences {
  if (!isBrowser()) {
    return DEFAULT_PREFERENCES;
  }
  try {
    const stored = window.localStorage.getItem(PREF_KEY);
    if (!stored) {
      applyTheme(DEFAULT_PREFERENCES.theme);
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(stored) as Partial<BiofloPreferences>;
    const prefs = { ...DEFAULT_PREFERENCES, ...parsed };
    applyTheme(prefs.theme);
    return prefs;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function persistPreferences(next: BiofloPreferences) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PREF_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent<BiofloPreferences>(PREFERENCES_EVENT, { detail: next })
  );
}

export function updatePreferences(partial: Partial<BiofloPreferences>) {
  const current = loadPreferences();
  const next = { ...current, ...partial };
  if (partial.theme && partial.theme !== current.theme) {
    applyTheme(partial.theme);
  }
  persistPreferences(next);
  return next;
}

export function subscribeToPreferences(
  listener: (next: BiofloPreferences) => void
) {
  if (!isBrowser()) return () => {};
  const handler: EventListener = (event) => {
    const custom = event as CustomEvent<BiofloPreferences>;
    listener(custom.detail);
  };
  window.addEventListener(PREFERENCES_EVENT, handler);
  return () => window.removeEventListener(PREFERENCES_EVENT, handler);
}

