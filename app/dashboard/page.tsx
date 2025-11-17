"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Sun,
  Moon,
  Clock,
  Target,
  Sparkles,
  Calendar,
  AlertCircle,
  X,
  CheckCircle2,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useCheckInReminder } from "@/lib/hooks/useCheckInReminder";
import WeeklyTrendsChart from "@/components/WeeklyTrendsChart";

type TodayPlan = {
  focus: string;
  summary?: string;
  morning: string[];
  afternoon: string[];
  evening: string[];
  notes?: string[];
};

type WeeklyDebrief = {
  headline?: string;
  summary: string;
  wins: string[];
  challenges: string[];
  patterns: string[];
  focus_for_next_week: string[];
  coach_message?: string;
};

type Nudge = {
  id: number;
  type: string;
  payload: {
    type: string;
    message: string;
    severity: "low" | "medium" | "high";
    data?: Record<string, unknown>;
  };
  channel: string;
  createdAt: string;
  deliveredAt: string | null;
};

type Protocol = {
  id: number;
  name: string;
  slug: string;
  config: {
    days?: number;
    [key: string]: unknown;
  };
  run: {
    id: number;
    status: string;
    startedAt: string;
    currentDay?: number;
    totalDays?: number;
    logs: Array<{
      dayIndex: number;
      completed: boolean;
    }>;
  };
};

type CheckIn = {
  created_at: string;
  mood: number | null;
  energy: number | null;
  sleep_quality: number | null;
};

type UserProfile = {
  firstName?: string;
  fullName?: string;
};

import { pane } from "@/lib/utils/theme";

function WelcomeStrip({ firstName }: { firstName?: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mb-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
        {greeting}{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Here's your plan for today.</p>
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const modeColors: Record<string, string> = {
    NORMAL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    TRAVEL: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    RECOVERY: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    DEEP_WORK: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${modeColors[mode] || modeColors.NORMAL}`}
    >
      {mode}
    </span>
  );
}

function TodayPlanCard({ plan, mode }: { plan: TodayPlan; mode: string }) {
  return (
    <div className={pane + " p-6 space-y-6"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="size-5 text-sky-400" />
          <h2 className="text-xl font-semibold">Today's Plan</h2>
        </div>
        <ModeBadge mode={mode} />
      </div>

      {/* Focus */}
      {plan.focus && (
        <div className="rounded-lg border border-sky-400/20 bg-sky-400/10 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="size-4 text-sky-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-sky-300 mb-1">Focus</div>
              <p className="text-sm text-slate-900 dark:text-white leading-relaxed">{plan.focus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {plan.summary && (
        <p className="text-sm text-slate-300 leading-relaxed">{plan.summary}</p>
      )}

      {/* Morning */}
      {plan.morning && plan.morning.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Sun className="size-4 text-amber-400" />
            <span>Morning</span>
          </div>
          <ul className="space-y-2 ml-6">
            {plan.morning.map((action, idx) => (
              <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                <span className="text-sky-400 mt-1">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Afternoon */}
      {plan.afternoon && plan.afternoon.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock className="size-4 text-orange-400" />
            <span>Afternoon</span>
          </div>
          <ul className="space-y-2 ml-6">
            {plan.afternoon.map((action, idx) => (
              <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                <span className="text-sky-400 mt-1">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evening */}
      {plan.evening && plan.evening.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Moon className="size-4 text-indigo-400" />
            <span>Evening</span>
          </div>
          <ul className="space-y-2 ml-6">
            {plan.evening.map((action, idx) => (
              <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                <span className="text-sky-400 mt-1">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {plan.notes && plan.notes.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Notes</div>
          <ul className="space-y-1">
            {plan.notes.map((note, idx) => (
              <li key={idx} className="text-sm text-slate-700 dark:text-slate-300">• {note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <Link
        href="/chat"
        className="block w-full rounded-lg bg-sky-400/20 border border-sky-400/30 px-4 py-2.5 text-sm font-medium text-sky-300 hover:bg-sky-400/30 transition text-center"
      >
        Open chat to refine this plan
      </Link>
    </div>
  );
}

function QuickCheckInWidget() {
  const [checkedInToday, setCheckedInToday] = useState<boolean | null>(null);
  const { settings, permission, requestPermission } = useCheckInReminder();

  useEffect(() => {
    fetch("/api/check-ins?range=1d")
      .then((res) => res.json())
      .then((data) => {
        const today = new Date().toISOString().split("T")[0];
        const todayCheckIn = data.data?.checkIns?.find(
          (ci: CheckIn) => ci.created_at.startsWith(today)
        );
        setCheckedInToday(!!todayCheckIn);
      })
      .catch(() => setCheckedInToday(null));
  }, []);

  if (checkedInToday === null) {
    return null;
  }

  if (checkedInToday) {
    return (
      <div className={pane + " p-4"}>
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle2 className="size-5 text-emerald-400" />
          <div>
            <div className="font-medium text-slate-900 dark:text-white">Checked in today ✓</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Great job tracking your progress!</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pane + " p-4 border-sky-400/30 bg-sky-400/5"}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Clock className="size-5 text-sky-400" />
          <div>
            <div className="font-medium text-slate-900 dark:text-white text-sm">How are you feeling today?</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Take a moment to log your mood</div>
          </div>
        </div>
        <Link
          href="/check-ins"
          className="rounded-lg bg-sky-400/20 border border-sky-400/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-400/30 transition"
        >
          Check In
        </Link>
      </div>
      {settings?.enabled && permission !== "granted" && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={requestPermission}
            className="text-xs text-sky-400 hover:text-sky-300 transition"
          >
            Enable daily reminders →
          </button>
        </div>
      )}
    </div>
  );
}

function ProtocolProgressCard({ protocol }: { protocol: Protocol | null }) {
  if (!protocol) {
    return (
      <div className={pane + " p-6"}>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-5 text-orange-400" />
          <h2 className="text-lg font-semibold">Protocols</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4 leading-relaxed">
          Want a structured plan? Try a 7- or 14-day protocol to reset sleep, calm anxiety, or boost energy.
        </p>
        <Link
          href="/protocols"
          className="inline-flex items-center gap-2 rounded-full bg-orange-500/20 border border-orange-500/30 px-4 py-2 text-xs font-medium text-orange-300 hover:bg-orange-500/30 transition"
        >
          Browse Protocols
        </Link>
      </div>
    );
  }

  const completedDays = protocol.run.logs.filter((log) => log.completed).length;
  const totalDays = protocol.run.totalDays || protocol.config.days || 1;
  const currentDay = protocol.run.currentDay || completedDays + 1;
  const progress = (completedDays / totalDays) * 100;
  const todayDayData = protocol.config.days?.[currentDay - 1] as { title?: string } | undefined;

  return (
    <div className={pane + " p-6 space-y-4"}>
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-orange-400" />
        <h2 className="text-lg font-semibold">Current Protocol</h2>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-slate-900 dark:text-white font-medium">{protocol.name}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400">Day {currentDay} of {totalDays}</span>
          <span className="text-slate-600 dark:text-slate-400">{completedDays} completed</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-orange-400 to-emerald-400 h-2.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {todayDayData?.title && (
        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Today</div>
          <p className="text-sm text-slate-900 dark:text-white">{todayDayData.title}</p>
        </div>
      )}
      <div className="flex gap-2">
        <Link
          href={`/protocols/${protocol.slug}#day-${currentDay}`}
          className="flex-1 rounded-lg bg-orange-500/20 border border-orange-500/30 px-4 py-2 text-xs font-medium text-orange-300 hover:bg-orange-500/30 transition text-center"
        >
          Open today's steps
        </Link>
        <Link
          href={`/chat?message=${encodeURIComponent(`Can you help me with Day ${currentDay} of the ${protocol.name} protocol?`)}`}
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition"
          title="Talk to coach about this"
        >
          💬
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [debrief, setDebrief] = useState<WeeklyDebrief | null>(null);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodayPlan();
    fetchWeeklyDebrief();
    fetchNudges();
    fetchProtocol();
    fetchCheckIns();
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const response = await fetch("/api/me");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const fullName = data.data.fullName || "";
          const firstName = fullName.split(" ")[0] || data.data.firstName || "";
          setProfile({
            firstName,
            fullName,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  }

  async function fetchTodayPlan() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/today-plan");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/sign-in";
          return;
        }
        setPlan(null);
        setError("Failed to load today's plan. Please try again.");
        return;
      }
      const data = await response.json();
      if (data.success && data.data) {
        setPlan(data.data.plan || null);
      } else {
        setPlan(null);
      }
    } catch (err) {
      console.error("Failed to fetch today's plan", err);
      setPlan(null);
      setError("Failed to load today's plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCheckIns() {
    try {
      const response = await fetch("/api/check-ins?range=7d");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCheckIns(data.data.checkIns || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch check-ins", err);
      setCheckIns([]);
    }
  }

  async function fetchWeeklyDebrief() {
    try {
      const response = await fetch("/api/weekly-debrief");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDebrief(data.data.debrief || null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch weekly debrief", err);
      setDebrief(null);
    }
  }

  async function fetchProtocol() {
    try {
      const response = await fetch("/api/protocols/current");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.active && data.data?.protocol) {
          setProtocol(data.data.protocol);
        } else {
          setProtocol(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch protocol", err);
      setProtocol(null);
    }
  }

  async function fetchNudges() {
    try {
      const response = await fetch("/api/nudges?delivered=false&limit=5");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setNudges(data.data.nudges || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch nudges", err);
      setNudges([]);
    }
  }

  async function markNudgeDelivered(nudgeId: number) {
    try {
      const response = await fetch("/api/nudges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nudgeId }),
      });
      if (response.ok) {
        setNudges((n) => n.filter((nudge) => nudge.id !== nudgeId));
      }
    } catch (err) {
      console.error("Failed to mark nudge as delivered", err);
      setNudges((n) => n.filter((nudge) => nudge.id !== nudgeId));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-sky-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading your plan...</p>
        </div>
      </div>
    );
  }

  const firstName = profile?.firstName;
  const mode = "NORMAL"; // TODO: Get from user preferences or profile

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
      {/* Welcome Strip */}
      <WelcomeStrip firstName={firstName} />

      {/* Main Layout: 2-column on desktop, single on mobile */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Today Plan + Check-in */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today Plan */}
          {plan ? (
            <TodayPlanCard plan={plan} mode={mode} />
          ) : (
            <div className={pane + " p-6 text-center"}>
              <p className="text-slate-400 mb-4">No plan available for today.</p>
              <button
                onClick={fetchTodayPlan}
                className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition"
              >
                Generate Plan
              </button>
            </div>
          )}

          {/* Check-in Widget */}
          <QuickCheckInWidget />

          {/* Error State */}
          {error && (
            <div className={pane + " p-4 border-red-400/30 bg-red-400/5"}>
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={fetchTodayPlan}
                className="mt-3 text-sm text-red-400 hover:text-red-300 transition"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Trends + Debrief + Protocol + Nudges */}
        <div className="space-y-6">
          {/* Weekly Trends */}
          <div className={pane + " p-6"}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="size-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Weekly Trends</h2>
            </div>
            <WeeklyTrendsChart checkIns={checkIns} />
          </div>

          {/* Weekly Debrief */}
          {debrief && (
            <div className={pane + " p-6 space-y-4"}>
              <div className="flex items-center gap-2">
                <Calendar className="size-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">This Week's Summary</h2>
              </div>
              {debrief.headline && (
                <p className="text-sm font-medium text-slate-900 dark:text-white">{debrief.headline}</p>
              )}
              {debrief.summary && (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{debrief.summary}</p>
              )}
              {debrief.wins && debrief.wins.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Wins</div>
                  <ul className="space-y-1">
                    {debrief.wins.slice(0, 2).map((win, idx) => (
                      <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">•</span>
                        <span>{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {debrief.challenges && debrief.challenges.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2">Challenges</div>
                  <ul className="space-y-1">
                    {debrief.challenges.slice(0, 2).map((challenge, idx) => (
                      <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                        <span className="text-amber-400 mt-1">•</span>
                        <span>{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {debrief.focus_for_next_week && debrief.focus_for_next_week.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2">Focus for Next Week</div>
                  <ul className="space-y-1">
                    {debrief.focus_for_next_week.slice(0, 2).map((focus, idx) => (
                      <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                        <span className="text-sky-400 mt-1">•</span>
                        <span>{focus}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Protocol Progress */}
          <ProtocolProgressCard protocol={protocol} />

          {/* Nudges */}
          {nudges.length > 0 && (
            <div className={pane + " p-6 space-y-3"}>
              <div className="flex items-center gap-2">
                <AlertCircle className="size-5 text-amber-400" />
                <h2 className="text-lg font-semibold">Coach Alerts</h2>
              </div>
              {nudges.map((nudge) => {
                const severityColors = {
                  high: "border-red-400/50 bg-red-400/10",
                  medium: "border-amber-400/50 bg-amber-400/10",
                  low: "border-blue-400/50 bg-blue-400/10",
                };
                return (
                  <div
                    key={nudge.id}
                    className={`rounded-lg border p-4 ${severityColors[nudge.payload.severity] || severityColors.low}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-slate-900 dark:text-white flex-1">{nudge.payload.message}</p>
                      <button
                        onClick={() => markNudgeDelivered(nudge.id)}
                        className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
                        aria-label="Dismiss"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
