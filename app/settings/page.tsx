"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  Download,
  Lock,
  Moon,
  Palette,
  Shield,
  Smartphone,
  Sun,
  Monitor,
  Target,
  ToggleLeft,
  ToggleRight,
  Trash2,
  User,
  Watch,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/components/ThemeProvider";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

type SectionId = "profile" | "health" | "notifications" | "appearance" | "integrations" | "privacy" | "account";

const sections: Array<{ id: SectionId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: "profile", label: "Profile", icon: User, description: "Your personal information" },
  { id: "health", label: "Health Goals", icon: Target, description: "Goals and preferences" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Alerts and reminders" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme and display" },
  { id: "integrations", label: "Integrations", icon: Watch, description: "Connected devices" },
  { id: "privacy", label: "Privacy & Data", icon: Shield, description: "Data controls" },
  { id: "account", label: "Account", icon: Lock, description: "Subscription and security" },
];

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn("transition", disabled && "opacity-50 cursor-not-allowed")}
    >
      {value ? <ToggleRight className="size-7 text-accent-primary" /> : <ToggleLeft className="size-7 text-white/40" />}
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/5 last:border-0">
      <div>
        <p className="font-medium text-white">{label}</p>
        {description && <p className="text-sm text-white/50">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  
  // Profile
  const [nickname, setNickname] = useState("User");
  const [birthYear, setBirthYear] = useState("1990");
  const [biologicalSex, setBiologicalSex] = useState("prefer-not-to-say");
  
  // Health Goals
  const [primaryGoal, setPrimaryGoal] = useState("optimize");
  const [sleepTarget, setSleepTarget] = useState("8");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [dietPreference, setDietPreference] = useState("none");
  
  // Notifications
  const [dailyReminder, setDailyReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [weeklyDebrief, setWeeklyDebrief] = useState(true);
  const [planUpdates, setPlanUpdates] = useState(true);
  const [coachNudges, setCoachNudges] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  
  // Appearance - use theme context
  const { theme, setTheme } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);
  
  // Privacy
  const [shareAnonymousData, setShareAnonymousData] = useState(false);
  const [aiMemory, setAiMemory] = useState(true);

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className={CARD}>
            <h2 className="text-lg font-semibold text-white mb-6">Profile</h2>
            <div className="space-y-1">
              <SettingRow label="Nickname" description="What should BioFlo call you?">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-40 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-primary"
                />
              </SettingRow>
              <SettingRow label="Birth Year" description="For age-appropriate recommendations">
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {Array.from({ length: 80 }, (_, i) => 2010 - i).map(year => (
                    <option key={year} value={year} className="bg-[#1a1a1f]">{year}</option>
                  ))}
                </select>
              </SettingRow>
              <SettingRow label="Biological Sex" description="Affects metabolic calculations">
                <select
                  value={biologicalSex}
                  onChange={(e) => setBiologicalSex(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="male" className="bg-[#1a1a1f]">Male</option>
                  <option value="female" className="bg-[#1a1a1f]">Female</option>
                  <option value="prefer-not-to-say" className="bg-[#1a1a1f]">Prefer not to say</option>
                </select>
              </SettingRow>
            </div>
          </div>
        );

      case "health":
        return (
          <div className={CARD}>
            <h2 className="text-lg font-semibold text-white mb-6">Health Goals</h2>
            <div className="space-y-1">
              <SettingRow label="Primary Goal">
                <select
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="optimize" className="bg-[#1a1a1f]">Optimize performance</option>
                  <option value="weight-loss" className="bg-[#1a1a1f]">Weight loss</option>
                  <option value="muscle-gain" className="bg-[#1a1a1f]">Muscle gain</option>
                  <option value="stress-management" className="bg-[#1a1a1f]">Stress management</option>
                  <option value="sleep-improvement" className="bg-[#1a1a1f]">Sleep improvement</option>
                  <option value="energy" className="bg-[#1a1a1f]">More energy</option>
                  <option value="longevity" className="bg-[#1a1a1f]">Longevity</option>
                </select>
              </SettingRow>
              <SettingRow label="Sleep Target" description="Hours per night">
                <select
                  value={sleepTarget}
                  onChange={(e) => setSleepTarget(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {["6", "6.5", "7", "7.5", "8", "8.5", "9"].map(h => (
                    <option key={h} value={h} className="bg-[#1a1a1f]">{h} hours</option>
                  ))}
                </select>
              </SettingRow>
              <SettingRow label="Activity Level">
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="sedentary" className="bg-[#1a1a1f]">Sedentary</option>
                  <option value="light" className="bg-[#1a1a1f]">Light (1-2 days/week)</option>
                  <option value="moderate" className="bg-[#1a1a1f]">Moderate (3-4 days/week)</option>
                  <option value="active" className="bg-[#1a1a1f]">Active (5-6 days/week)</option>
                  <option value="very-active" className="bg-[#1a1a1f]">Very active (daily)</option>
                </select>
              </SettingRow>
              <SettingRow label="Diet Preference">
                <select
                  value={dietPreference}
                  onChange={(e) => setDietPreference(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="none" className="bg-[#1a1a1f]">No preference</option>
                  <option value="vegetarian" className="bg-[#1a1a1f]">Vegetarian</option>
                  <option value="vegan" className="bg-[#1a1a1f]">Vegan</option>
                  <option value="keto" className="bg-[#1a1a1f]">Keto</option>
                  <option value="paleo" className="bg-[#1a1a1f]">Paleo</option>
                  <option value="mediterranean" className="bg-[#1a1a1f]">Mediterranean</option>
                </select>
              </SettingRow>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className={CARD}>
            <h2 className="text-lg font-semibold text-white mb-6">Notifications</h2>
            <div className="space-y-1">
              <SettingRow label="Daily Check-in Reminder" description="Get reminded to log your daily check-in">
                <div className="flex items-center gap-3">
                  {dailyReminder && (
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white focus:outline-none"
                    />
                  )}
                  <Toggle value={dailyReminder} onChange={setDailyReminder} />
                </div>
              </SettingRow>
              <SettingRow label="Weekly Debrief" description="Sunday summary of your week">
                <Toggle value={weeklyDebrief} onChange={setWeeklyDebrief} />
              </SettingRow>
              <SettingRow label="Plan Updates" description="When your daily plan changes">
                <Toggle value={planUpdates} onChange={setPlanUpdates} />
              </SettingRow>
              <SettingRow label="Coach Nudges" description="Proactive tips from BioFlo">
                <Toggle value={coachNudges} onChange={setCoachNudges} />
              </SettingRow>
              <SettingRow label="Email Digest" description="Weekly email summary">
                <Toggle value={emailDigest} onChange={setEmailDigest} />
              </SettingRow>
            </div>
          </div>
        );

      case "appearance":
        const themeOptions = [
          { value: "dark" as const, label: "Dark", icon: Moon },
          { value: "light" as const, label: "Light", icon: Sun },
          { value: "system" as const, label: "System", icon: Monitor },
        ];
        return (
          <div className={CARD}>
            <h2 className="text-lg font-semibold text-white mb-6">Appearance</h2>
            <div className="space-y-1">
              <SettingRow label="Theme" description="Choose your preferred color scheme">
                <div className="flex gap-2">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition",
                        theme === value 
                          ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30" 
                          : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="Reduced Motion" description="Minimize animations">
                <Toggle value={reducedMotion} onChange={setReducedMotion} />
              </SettingRow>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className={CARD}>
            <h2 className="text-lg font-semibold text-white mb-6">Integrations</h2>
            <div className="space-y-4">
              <Link href="/settings/integrations" className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-[#22f3c8]/20 flex items-center justify-center">
                    <Watch className="size-6 text-[#22f3c8]" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Wearable Devices</p>
                    <p className="text-sm text-white/50">Connect Ultrahuman, Apple Health, Garmin...</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-white/40" />
              </Link>
              <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <CalendarClock className="size-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Calendar</p>
                    <p className="text-sm text-white/50">Sync with Google Calendar, Outlook...</p>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-xl bg-white/10 text-sm text-white hover:bg-white/20 transition">Connect</button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Smartphone className="size-6 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Health Apps</p>
                    <p className="text-sm text-white/50">MyFitnessPal, Cronometer...</p>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-xl bg-white/10 text-sm text-white hover:bg-white/20 transition">Connect</button>
              </div>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className={CARD}>
            <h2 className="text-lg font-semibold text-white mb-6">Privacy & Data</h2>
            <div className="space-y-1">
              <SettingRow label="AI Memory" description="Let BioFlo remember context from chats">
                <Toggle value={aiMemory} onChange={setAiMemory} />
              </SettingRow>
              <SettingRow label="Anonymous Analytics" description="Help improve BioFlo with anonymous usage data">
                <Toggle value={shareAnonymousData} onChange={setShareAnonymousData} />
              </SettingRow>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <button className="flex items-center gap-3 w-full p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition text-left">
                <Download className="size-5 text-white/60" />
                <div>
                  <p className="font-medium text-white">Export My Data</p>
                  <p className="text-sm text-white/50">Download all your BioFlo data</p>
                </div>
              </button>
              <button className="flex items-center gap-3 w-full p-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition text-left">
                <Trash2 className="size-5 text-red-400" />
                <div>
                  <p className="font-medium text-red-400">Delete All Data</p>
                  <p className="text-sm text-white/50">Permanently remove all your data</p>
                </div>
              </button>
            </div>
          </div>
        );

      case "account":
        return (
          <div className={CARD}>
            <h2 className="text-lg font-semibold text-white mb-6">Account</h2>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-primary/20 to-purple-500/20 border border-accent-primary/30 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="size-5 text-accent-primary" />
                    <span className="font-semibold text-white">BioFlo Pro</span>
                  </div>
                  <p className="text-sm text-white/60 mt-1">Unlimited access to all features</p>
                </div>
                <Link href="/pricing" className="px-4 py-2 rounded-xl bg-white/10 text-sm text-white hover:bg-white/20 transition">
                  Manage
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              <button className="flex items-center gap-3 w-full p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition text-left">
                <Shield className="size-5 text-white/60" />
                <div>
                  <p className="font-medium text-white">Security</p>
                  <p className="text-sm text-white/50">Password, 2FA, sessions</p>
                </div>
                <ChevronRight className="size-5 text-white/40 ml-auto" />
              </button>
              <button className="flex items-center gap-3 w-full p-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition text-left">
                <Lock className="size-5 text-red-400" />
                <div>
                  <p className="font-medium text-red-400">Sign Out</p>
                  <p className="text-sm text-white/50">Log out of this device</p>
                </div>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-white/60">Manage your preferences and account</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        {/* Sidebar */}
        <nav className={cn(CARD, "h-fit")}>
          <div className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition",
                    isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="size-5" />
                  <div>
                    <p className="font-medium">{section.label}</p>
                    <p className="text-xs text-white/40">{section.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div>{renderSection()}</div>
      </div>
    </div>
  );
}
