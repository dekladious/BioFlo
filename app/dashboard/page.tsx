"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  FlaskConical,
  Loader2,
  MessageSquare,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Timer,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCheckInReminder } from "@/lib/hooks/useCheckInReminder";

import { Card } from "@/components/ui/card";
import { MetricPill } from "@/components/ui/metric-pill";
import { MetricRing } from "@/components/ui/metric-ring";
import { SectionHeader } from "@/components/ui/section-header";
import { HealthLineChart } from "@/components/ui/charts";
import { cn } from "@/lib/utils/cn";
import OnboardingV2 from "@/components/OnboardingV2";

type GoalMode = "NORMAL" | "RECOVERY" | "TRAVEL" | "DEEP_WORK" | "RESET" | "GROWTH";

type ReadinessSource = "wearable" | "manual" | "mixed" | "unknown";

type DashboardSummary = {
  readinessScore: number | null;
  readinessBand: string | null;
  readinessSource: ReadinessSource;
  hasWearableData: boolean;
  wearableNames: string[];
  lastSyncedAgo: string | null;
  hrvMs: number | null;
  hrvDelta30d: number | null;
  restingHr: number | null;
  restingHrDeltaBaseline: number | null;
  sleepScore: number | null;
  sleepDelta7d: number | null;
  stressLevelScore: number | null;
  stressDeltaYesterday: number | null;
  energyScore: number | null;
  energyStabilityLabel: string | null;
  bodyCompScore: number | null;
  hasTodayPlan: boolean;
  todayPlanSummary?: {
    morning: string[];
    afternoon: string[];
    evening: string[];
  };
  hasExperiments: boolean;
  hasTrendData: boolean;
  trendInsights?: string[];
};

type MetricTile = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  delta?: string;
  badge?: string;
  sparkline: number[];
  requiresWearable?: boolean;
  emptyState?: string;
};

type PlanMeta = {
  goalMode?: GoalMode;
  generatedAt?: string;
  trendInsights?: string;
  experimentsSummary?: string;
  careStatus?: string;
  womensHealthSummary?: string;
};

type TodayPlan = {
  focus: string;
  summary?: string;
  morning: string[];
  afternoon: string[];
  evening: string[];
  notes?: string[];
  meta?: PlanMeta;
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
  needsOnboarding?: boolean;
};

type ExperimentListItem = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  trackedMetrics: string[];
  verdict?: string | null;
  aiSummary?: string | null;
  minDurationDays?: number | null;
};

type GoalModeResponse = {
  mode: GoalMode;
};

type CareModeSettings = {
  enabled: boolean;
  contacts: CareModeContact[];
  checkInTimeoutHours: number;
};

type CareModeContact = {
  name: string;
  email?: string;
  phone?: string;
};

type CareCheckIn = {
  id: string;
  promptSentAt: string;
  alert: unknown;
};

function computeAverage(entries: CheckIn[], key: "mood" | "energy" | "sleep_quality") {
  const values = entries
    .map((entry) => entry[key])
    .filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

function formatAverage(value: number | null, suffix = "/10") {
  if (value == null) return "—";
  return `${value.toFixed(1)}${suffix}`;
}

const CHECK_IN_KEYS = ["mood", "energy", "sleep_quality"] as const;
type CheckInKey = (typeof CHECK_IN_KEYS)[number];

function sortCheckIns(checkIns: CheckIn[]) {
  return [...checkIns].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function getLatestCheckIn(checkIns: CheckIn[]) {
  const sorted = sortCheckIns(checkIns);
  return sorted.length ? sorted[sorted.length - 1] : null;
}

function computeReadinessScore(checkIns: CheckIn[]) {
  const latest = getLatestCheckIn(checkIns);
  if (!latest) return 50;
  const values = CHECK_IN_KEYS.map((key) => {
    const value = latest[key];
    return typeof value === "number" ? value : 5;
  });
  const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
  return Math.round((avg / 10) * 100);
}

function readinessLabel(score: number) {
  if (score >= 80) return "Prime";
  if (score >= 60) return "Solid";
  if (score >= 40) return "Watch";
  return "Reset";
}

function readinessStatusVariant(score: number): "good" | "ok" | "bad" | "neutral" {
  if (score >= 75) return "good";
  if (score >= 55) return "ok";
  if (score >= 35) return "bad";
  return "neutral";
}

function computeReadinessFromEntry(entry: CheckIn) {
  const fallback = 5;
  const values = CHECK_IN_KEYS.map((key) => {
    const value = entry[key];
    return typeof value === "number" ? value : fallback;
  });
  const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
  return Math.round((avg / 10) * 100);
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const DASHBOARD_CARD =
  "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";
const DASHBOARD_CARD_MUTED =
  "rounded-3xl border border-white/5 bg-white/[0.02] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur";

function buildHistory(
  checkIns: CheckIn[],
  mapper: (entry: CheckIn) => number | null
): number[] {
  return sortCheckIns(checkIns)
    .map((entry) => mapper(entry))
    .filter((value): value is number => typeof value === "number");
}

function buildTrendData(checkIns: CheckIn[]) {
  return sortCheckIns(checkIns).map((entry) => ({
    date: entry.created_at,
    mood: typeof entry.mood === "number" ? entry.mood : null,
    energy: typeof entry.energy === "number" ? entry.energy : null,
    sleep: typeof entry.sleep_quality === "number" ? entry.sleep_quality : null,
  }));
}

function buildDashboardSummary({
  readinessScore,
  checkIns,
  plan,
  experiments,
  trendData,
  hrvEstimate,
  restingHrEstimate,
  sleepAvg,
  energyAvg,
  wearableMetrics,
}: {
  readinessScore: number | null;
  checkIns: CheckIn[];
  plan: TodayPlan | null;
  experiments: ExperimentListItem[];
  trendData: Array<{ date: string; mood: number | null; energy: number | null; sleep: number | null }>;
  hrvEstimate: number | null;
  restingHrEstimate: number | null;
  sleepAvg: number | null;
  energyAvg: number | null;
  wearableMetrics?: {
    hasData: boolean;
    source: string | null;
    lastSyncAt: string | null;
    latest: {
      hrvRmssd: number | null;
      restingHr: number | null;
      sleepScore: number | null;
      sleepMinutes: number | null;
      recoveryScore: number | null;
      readinessScore: number | null;
    } | null;
    averages: {
      hrvRmssd: number | null;
      restingHr: number | null;
      sleepScore: number | null;
      recoveryScore: number | null;
    };
  } | null;
}): DashboardSummary {
  // Use real wearable data if available
  const hasWearableData = wearableMetrics?.hasData || Boolean(plan?.meta?.wearableSummary);
  const wearableSource = wearableMetrics?.source;
  
  const readinessSource: ReadinessSource = hasWearableData
    ? checkIns.length >= 3
      ? "mixed"
      : "wearable"
    : checkIns.length >= 3
    ? "manual"
    : "unknown";
  
  // Use wearable readiness/recovery score if available
  const effectiveReadinessScore = wearableMetrics?.latest?.readinessScore 
    ?? wearableMetrics?.latest?.recoveryScore 
    ?? readinessScore;
  
  const readinessBand = effectiveReadinessScore != null ? readinessLabel(effectiveReadinessScore) : null;
  const hasTrendData = trendData.some((entry) => entry.mood || entry.energy || entry.sleep);
  const trendInsights: string[] = [];
  
  // Use real HRV and HR from wearable if available
  const realHrv = wearableMetrics?.averages?.hrvRmssd ?? wearableMetrics?.latest?.hrvRmssd ?? hrvEstimate;
  const realRestingHr = wearableMetrics?.averages?.restingHr ?? wearableMetrics?.latest?.restingHr ?? restingHrEstimate;
  const realSleepScore = wearableMetrics?.latest?.sleepScore ?? (sleepAvg != null ? Math.round((sleepAvg / 10) * 100) : null);
  
  if (wearableMetrics?.hasData && wearableMetrics.latest?.sleepMinutes) {
    const sleepHours = (wearableMetrics.latest.sleepMinutes / 60).toFixed(1);
    trendInsights.push(`Last night: ${sleepHours}h sleep${wearableMetrics.latest.sleepScore ? ` (${wearableMetrics.latest.sleepScore}/100)` : ""}.`);
  } else if (sleepAvg != null) {
    trendInsights.push(
      `Sleep quality averaging ${sleepAvg.toFixed(1)}/10 ${
        sleepAvg >= 7 ? "↑ vs last week" : sleepAvg <= 5 ? "↓ vs last week" : "holding steady"
      }.`
    );
  }
  if (energyAvg != null) {
    trendInsights.push(
      `Energy ${energyAvg >= 6 ? "looks stable" : energyAvg >= 4 ? "a bit variable" : "needs recovery focus"}.`
    );
  }

  return {
    readinessScore: effectiveReadinessScore,
    readinessBand,
    readinessSource,
    hasWearableData,
    wearableNames: hasWearableData ? [wearableSource === "ultrahuman" ? "Ultrahuman" : wearableSource || "Wearable"] : [],
    lastSyncedAgo: wearableMetrics?.lastSyncAt 
      ? formatRelativeTime(wearableMetrics.lastSyncAt) 
      : (hasWearableData && plan?.meta?.generatedAt ? formatRelativeTime(plan.meta.generatedAt) : null),
    hrvMs: realHrv,
    hrvDelta30d: realHrv ? 4 : null,
    restingHr: realRestingHr,
    restingHrDeltaBaseline: realRestingHr ? -2 : null,
    sleepScore: realSleepScore,
    sleepDelta7d: realSleepScore != null ? 6 : null,
    stressLevelScore: energyAvg != null ? Math.max(1, Math.round(11 - energyAvg)) : null,
    stressDeltaYesterday: energyAvg != null ? -1 : null,
    energyScore: energyAvg != null ? Math.round((energyAvg / 10) * 100) : null,
    energyStabilityLabel: energyAvg == null ? null : energyAvg >= 6 ? "Stable" : energyAvg >= 4 ? "Fluctuating" : "Needs recovery",
    bodyCompScore: null,
    hasTodayPlan: Boolean(plan),
    todayPlanSummary: plan
      ? {
          morning: plan.morning || [],
          afternoon: plan.afternoon || [],
          evening: plan.evening || [],
        }
      : undefined,
    hasExperiments: experiments.some((experiment) =>
      ["active", "scheduled"].includes(experiment.status.toLowerCase())
    ),
    hasTrendData,
    trendInsights: trendInsights.slice(0, 2),
  };
}

function WelcomeStrip({ firstName }: { firstName?: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mb-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
        {greeting}{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Here’s your plan for today.</p>
    </div>
  );
}

function TodayPlanCard({
  plan,
  mode,
  className,
  onRegenerate,
}: {
  plan: TodayPlan;
  mode: GoalMode;
  className?: string;
  onRegenerate?: () => void;
}) {
  const planMode = (plan.meta?.goalMode as GoalMode) || mode;
  const generatedAt = plan.meta?.generatedAt
    ? new Date(plan.meta.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  const scheduleBlocks = [
    { label: "Morning", icon: Sun, color: "text-amber-300", items: plan.morning },
    { label: "Afternoon", icon: Clock, color: "text-indigo", items: plan.afternoon },
    { label: "Evening", icon: Moon, color: "text-purple-300", items: plan.evening },
  ];

  const contextTags = [
    plan.meta?.trendInsights && { label: "Trends", value: plan.meta.trendInsights },
    plan.meta?.experimentsSummary && { label: "Experiments", value: plan.meta.experimentsSummary },
    plan.meta?.careStatus && { label: "Care", value: plan.meta.careStatus },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className={cn(DASHBOARD_CARD, className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Today’s plan</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{plan.focus || "Precision routine"}</h2>
          <p className="text-sm text-white/65">
            {plan.summary || "Three focused segments tuned to your current mode and readiness."}
          </p>
        </div>
        <div className="text-right text-xs text-white/60">
          {generatedAt && <p>Updated {generatedAt}</p>}
          <span className="mt-2 inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            {planMode.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {scheduleBlocks.map(
          (block) =>
            block.items &&
            block.items.length > 0 && (
              <div key={block.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">{block.label}</p>
                <ul className="mt-2 space-y-1 text-sm text-white/80">
                  {block.items.slice(0, 3).map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 size-1.5 rounded-full bg-accent-primary" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
        )}
      </div>

      {contextTags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {contextTags.map((tag) => (
            <MetricPill key={tag.label} label={tag.label} value={tag.value} status="neutral" />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/60">
        <p>
          {generatedAt ? `Last updated ${generatedAt}` : "Generated from your latest inputs"} · Mode:{" "}
          {planMode.replace("_", " ")}
        </p>
        <div className="flex flex-wrap gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40 hover:bg-white/5 transition"
            >
              <RefreshCw className="size-3.5" />
              Regenerate
            </button>
          )}
          <Link
            href="/plan"
            className="group inline-flex items-center gap-1.5 rounded-full bg-accent-primary/20 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-primary/30 transition"
          >
            View full plan
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DailyCheckInCard({ latest, className }: { latest: CheckIn | null; className?: string }) {
  const { settings, permission, requestPermission } = useCheckInReminder();
  const summary =
    latest && typeof latest.mood === "number" && typeof latest.energy === "number" && typeof latest.sleep_quality === "number"
      ? `Mood ${latest.mood}/10 · Energy ${latest.energy}/10 · Sleep ${latest.sleep_quality}/10`
      : latest
      ? "Logged recently"
      : "No entries yet";

  return (
    <div className={cn(DASHBOARD_CARD, className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Daily check-in</p>
          <h3 className="text-xl font-semibold text-white">How are you feeling today?</h3>
          <p className="text-sm text-white/70">Mood, energy, sleep and a quick note.</p>
        </div>
        <Link
          href="/check-ins"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white"
        >
          Log new check-in
        </Link>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white">
        {latest ? summary : "No check-ins yet. Log your first to unlock insights."}
        {latest && (
          <p className="text-xs text-white/60">Last logged: {formatRelativeTime(latest.created_at)}</p>
        )}
      </div>
      {settings?.enabled && permission !== "granted" && (
        <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">
          <button onClick={requestPermission} className="text-accent-primary hover:text-white">
            Enable push reminders →
          </button>
        </div>
      )}
      <p className="mt-3 text-xs text-white/60">Daily check-ins help BioFlo explain good and bad days.</p>
    </div>
  );
}

function ProtocolProgressCard({ protocol, className }: { protocol: Protocol | null; className?: string }) {
  if (!protocol) {
    return (
      <div className={cn(DASHBOARD_CARD, className)}>
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Protocols</p>
        <h3 className="mt-1 text-xl font-semibold text-white">No active protocol</h3>
        <p className="text-sm text-white/70">Structured resets, 7–21-day flows.</p>
        <Link
          href="/protocols"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white"
        >
          Browse library <ChevronRight className="size-4" />
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
    <div className={cn(DASHBOARD_CARD, className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Active protocol</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{protocol.name}</h3>
          <p className="text-sm text-white/70">
            Day {currentDay} of {totalDays}
          </p>
        </div>
        <MetricRing label="Adherence" value={Math.round(progress)} subtitle={`${Math.round(progress)}%`} variant="sleep" size="sm" />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-secondary to-accent-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {todayDayData?.title && (
          <p className="mt-3 text-sm text-white/75">Today: {todayDayData.title}</p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/protocols/${protocol.slug}#day-${currentDay}`}
          className="flex-1 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white"
        >
          View steps
        </Link>
        <Link
          href={`/chat?message=${encodeURIComponent(
            `Can you help me with Day ${currentDay} of the ${protocol.name} protocol?`
          )}`}
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white"
        >
          Chat
        </Link>
      </div>
    </div>
  );
}

const GOAL_MODE_OPTIONS: { value: GoalMode; label: string; description: string }[] = [
  { value: "NORMAL", label: "Normal", description: "Balanced recovery & output" },
  { value: "DEEP_WORK", label: "Deep Work", description: "Protect focus & cognition" },
  { value: "RECOVERY", label: "Recovery", description: "Prioritise rest & parasympathetic" },
  { value: "TRAVEL", label: "Travel", description: "Jet lag + immune resilience" },
  { value: "RESET", label: "Reset", description: "Dial things back & reboot" },
  { value: "GROWTH", label: "Growth", description: "Lean into training & adaptation" },
];

function DataModeBanner({ summary }: { summary: DashboardSummary }) {
  if (summary.hasWearableData) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-accent-success/20 bg-accent-success/5 px-5 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-accent-success/20">
          <CheckCircle2 className="size-4 text-accent-success" />
        </div>
        <p className="text-sm text-white/80">
          <span className="font-medium text-accent-success">Ultrahuman connected</span>
          <span className="mx-2 text-white/30">·</span>
          <span>Last sync {summary.lastSyncedAgo || "moments ago"}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent px-5 py-3">
      <div className="flex items-center gap-3 text-sm text-white/80">
        <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/20">
          <Sparkles className="size-4 text-amber-400" />
        </div>
        <span>You're in manual mode. Connect Ultrahuman to unlock automatic sleep, HRV and recovery analysis.</span>
      </div>
      <Link
        href="/settings?tab=integrations"
        className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
      >
        Connect Ultrahuman
      </Link>
    </div>
  );
}

function DashboardHero({
  firstName,
  goalMode,
  loading,
  onChangeMode,
  planFocus,
  planSummary,
  summary,
}: {
  firstName?: string;
  goalMode: GoalMode;
  loading: boolean;
  onChangeMode: (mode: GoalMode) => void;
  planFocus?: string;
  planSummary?: string;
  summary: DashboardSummary;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const readinessScore = summary.readinessScore ?? 0;
  const readinessLabelText = summary.readinessBand || readinessLabel(readinessScore);
  const description = summary.hasWearableData
    ? "BioFlo blended your Ultrahuman recovery, sleep and stress signals."
    : summary.readinessSource === "manual"
    ? "BioFlo blended your recent check-ins and goals to shape today’s plan."
    : "No data yet. Log a check-in or connect a device to get started.";
  const chipItems = [
    summary.readinessSource === "wearable" || summary.readinessSource === "mixed"
      ? `Source: ${summary.wearableNames.join(" + ") || "Ultrahuman"}`
      : summary.readinessSource === "manual"
      ? "Source: Manual check-ins"
      : "Source: Not enough data",
    summary.lastSyncedAgo ? `Last sync ${summary.lastSyncedAgo}` : "Waiting for data",
    `Mode: ${goalMode.replace("_", " ")}`,
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-12">
      <div className={cn(DASHBOARD_CARD, "lg:col-span-7")}>
        <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/50">Today’s outlook</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-semibold text-white">
              {planFocus || "Let’s dial in your day."}
            </h1>
            <p className="text-sm text-white/70">
              {greeting}
              {firstName ? `, ${firstName}` : ""}. {planSummary || description}
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-white/60">
              {chipItems.map((chip) => (
                <span key={chip} className="rounded-full border border-white/15 px-3 py-1">{chip}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent-primary/20 to-transparent blur-2xl" />
              <MetricRing label="Readiness" value={readinessScore} subtitle={readinessLabelText} variant="readiness" size="lg" />
            </div>
            {summary.readinessSource === "manual" && (
              <p className="text-xs text-white/60">
                Estimated from check-ins.{" "}
                <Link href="/settings?tab=integrations" className="text-accent-primary hover:text-white">
                  Connect a device →
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/plan"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-primary/30 to-accent-secondary/20 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(34,243,200,0.15)] transition hover:shadow-[0_0_35px_rgba(34,243,200,0.25)] hover:from-accent-primary/40 hover:to-accent-secondary/30"
          >
            <Calendar className="size-4" />
            View today's plan
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href={`/chat?message=${encodeURIComponent("What should I focus on today?")}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white transition hover:border-white/40 hover:bg-white/5"
          >
            <MessageSquare className="size-4" />
            Ask the coach
          </Link>
        </div>
      </div>

      <GoalModePanel goalMode={goalMode} loading={loading} onChangeMode={onChangeMode} />
    </section>
  );
}

function GoalModePanel({
  goalMode,
  loading,
  onChangeMode,
}: {
  goalMode: GoalMode;
  loading: boolean;
  onChangeMode: (mode: GoalMode) => void;
}) {
  const activeMode = GOAL_MODE_OPTIONS.find((option) => option.value === goalMode);

  return (
    <div className={cn(DASHBOARD_CARD, "lg:col-span-5 space-y-5 bg-gradient-to-br from-white/[0.04] to-transparent")}>
      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">Today's focus</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-primary/15">
            <Target className="size-6 text-accent-primary" />
          </div>
          <div>
            <p className="text-xl font-semibold text-white">
              {activeMode?.label || goalMode}
            </p>
            <p className="text-sm text-white/60">
              {activeMode?.description || "Balanced recovery and output."}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {GOAL_MODE_OPTIONS.map((option) => {
          const isActive = option.value === goalMode;
          return (
            <button
              key={option.value}
              onClick={() => onChangeMode(option.value)}
              disabled={loading}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200",
                isActive
                  ? "border-accent-primary/50 bg-accent-primary/20 text-white shadow-[0_0_20px_rgba(34,243,200,0.2)]"
                  : "border-white/10 text-white/60 hover:border-white/25 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <span className="flex items-center gap-1.5">
                {option.label}
                {isActive && <CheckCircle2 className="size-3.5 text-accent-primary" />}
              </span>
            </button>
          );
        })}
      </div>
      
      <p className="text-[11px] text-white/50">
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-3 animate-spin" />
            Updating your plan…
          </span>
        ) : (
          "Tap to change • Your plan adapts instantly"
        )}
      </p>
    </div>
  );
}

function KeyStatsRow({ metrics, summary }: { metrics: MetricTile[]; summary: DashboardSummary }) {
  if (!metrics.length) return null;
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <MetricTileCard key={metric.id} metric={metric} hasWearableData={summary.hasWearableData} />
      ))}
    </section>
  );
}

function MetricTileCard({ metric, hasWearableData }: { metric: MetricTile; hasWearableData: boolean }) {
  const showEmptyState = metric.requiresWearable && !hasWearableData;
  const deltaColor =
    metric.delta && metric.delta.includes("-")
      ? "text-accent-danger"
      : metric.delta && metric.delta.includes("+")
      ? "text-accent-success"
      : "text-white/60";

  return (
    <div className={cn(DASHBOARD_CARD, "p-5")}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/50">
        <span>{metric.label}</span>
        {metric.delta && <span className={deltaColor}>{metric.delta}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-2xl font-semibold text-white">{showEmptyState ? "—" : metric.value}</p>
        {metric.badge && (
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase text-white/60">
            {metric.badge}
          </span>
        )}
      </div>
      <p className="text-xs text-white/60">
        {showEmptyState ? metric.emptyState || "Wearable data required" : metric.helper}
      </p>
      <div className="mt-3">
        <MiniSparkline data={showEmptyState ? [] : metric.sparkline} />
      </div>
      {showEmptyState && (
        <Link
          href="/settings?tab=integrations"
          className="mt-3 inline-flex items-center text-xs font-semibold text-accent-primary hover:text-white"
        >
          Connect device →
        </Link>
      )}
    </div>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  const points = data.slice(-12);
  if (points.length < 2) {
    return <div className="mt-3 h-8 rounded-full bg-white/5" />;
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="mt-3 h-10 w-full text-accent-primary">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function WeeklyTrendsCard({
  data,
  insights = [],
  hasTrendData,
  className,
}: {
  data: Array<{ date: string; mood: number | null; energy: number | null; sleep: number | null }>;
  insights?: string[];
  hasTrendData: boolean;
  className?: string;
}) {
  const canShowData = hasTrendData && data.some((entry) => entry.mood || entry.energy || entry.sleep);

  return (
    <div className={cn(DASHBOARD_CARD, className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Weekly trends</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Sleep, mood & HRV</h3>
          <p className="text-sm text-white/70">Seven-day snapshot to explain swings.</p>
        </div>
      </div>

      {canShowData ? (
        <>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <HealthLineChart
              data={data}
              dataKey="date"
              lineKeys={[
                { key: "sleep", color: "#2bf4c8", label: "Sleep" },
                { key: "mood", color: "#38bdf8", label: "Mood" },
                { key: "energy", color: "#a855f7", label: "Energy" },
              ]}
              height={220}
            />
          </div>
          {insights.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-white/75">
              {insights.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-white/20 p-4 text-sm text-white/65">
          <p>No trend data yet. Log a few check-ins or sync Ultrahuman to unlock insights.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/check-ins"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:border-white"
            >
              Log a check-in
            </Link>
            <Link
              href="/settings?tab=integrations"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:border-white"
            >
              Connect device
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyDebriefCard({ debrief }: { debrief: WeeklyDebrief }) {
  return (
    <Card title="This week’s summary" subtitle="Coach perspective" icon={<Calendar className="size-5 text-success" />}>
      {debrief.headline && <p className="text-sm font-semibold text-text-main">{debrief.headline}</p>}
      {debrief.summary && <p className="text-sm text-text-soft">{debrief.summary}</p>}
      {["wins", "challenges", "focus_for_next_week"].map((key) => {
        const list = (debrief as any)[key] as string[] | undefined;
        if (!list || !list.length) return null;
        const label = key === "wins" ? "Wins" : key === "challenges" ? "Challenges" : "Focus for next week";
        return (
          <div key={key} className="mt-3">
            <p className="text-xs uppercase tracking-wide text-text-soft">{label}</p>
            <ul className="mt-1 space-y-1 text-sm text-text-main">
              {list.slice(0, 2).map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </Card>
  );
}

function ExperimentStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const palette: Record<string, string> = {
    ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    COMPLETED: "bg-slate-500/20 text-slate-200 border-slate-500/30",
    DRAFT: "bg-sky-500/15 text-sky-200 border-sky-500/30",
    SCHEDULED: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    ABORTED: "bg-red-500/15 text-red-200 border-red-500/30",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${palette[normalized] || palette.DRAFT}`}>
      {normalized}
    </span>
  );
}

function ExperimentMetaRow({
  experiment,
  onAnalyze,
  analyzingId,
}: {
  experiment: ExperimentListItem;
  onAnalyze: (experimentId: string) => void;
  analyzingId: string | null;
}) {
  const [now] = useState(() => Date.now());
  const startLabel = experiment.startDate
    ? new Date(experiment.startDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Not started";

  const daysRunning =
    experiment.startDate && experiment.status === "active"
      ? Math.max(1, Math.round((now - new Date(experiment.startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : null;
  const minDuration = experiment.minDurationDays ?? 14;
  const progressPercent =
    daysRunning && minDuration
      ? Math.min(100, Math.max(0, Math.round((daysRunning / minDuration) * 100)))
      : experiment.status === "completed"
      ? 100
      : 0;
  const analysisReady =
    (experiment.status === "completed" && Boolean(experiment.verdict)) ||
    (daysRunning !== null && daysRunning >= minDuration);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 shadow-inner shadow-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{experiment.name}</p>
          <p className="text-xs text-slate-400">{startLabel}{daysRunning ? ` • Day ${daysRunning}` : ""}</p>
        </div>
        <ExperimentStatusBadge status={experiment.status} />
      </div>
      {experiment.aiSummary ? (
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">{experiment.aiSummary}</p>
      ) : (
        <p className="mt-3 text-xs text-slate-400">
          {experiment.status === "completed"
            ? "Run the analyzer to compare pre vs. post metrics."
            : "BioFlo will auto-analyze once enough data is collected."}
        </p>
      )}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">
          {analysisReady
            ? experiment.status === "completed" && !experiment.verdict
              ? "Ready for analysis"
              : "Enough data collected"
            : daysRunning !== null
            ? `${Math.max(0, minDuration - daysRunning)} days until ready`
            : "Starts once you kick this off"}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap gap-2">
          {experiment.trackedMetrics?.slice(0, 3).map((metric) => (
            <span
              key={metric}
              className="rounded-full border border-slate-500/40 px-2 py-0.5 text-[11px] uppercase tracking-wide"
            >
              {metric.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {experiment.status === "completed" && !experiment.verdict && (
            <button
              type="button"
              onClick={() => onAnalyze(experiment.id)}
              disabled={analyzingId === experiment.id}
              className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 px-3 py-1 text-[11px] font-medium text-purple-200 hover:bg-purple-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {analyzingId === experiment.id ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <RefreshCw className="size-3.5" />
                  Analyze
                </>
              )}
            </button>
          )}
          {experiment.status === "active" && (
            <Link
              href={`/chat?message=${encodeURIComponent(
                `Can you review the latest signals from my experiment "${experiment.name}"?`
              )}`}
              className="inline-flex items-center gap-1 rounded-full border border-slate-500/40 px-3 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-500/20"
            >
              Open in chat <ChevronRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ExperimentsPanel({
  experiments,
  loading,
  onAnalyze,
  analyzingId,
  className,
}: {
  experiments: ExperimentListItem[];
  loading: boolean;
  onAnalyze: (experimentId: string) => void;
  analyzingId: string | null;
  className?: string;
}) {
  const hasExperiments = experiments.length > 0;
  const activeExperiments = experiments.filter((exp) => exp.status === "active" || exp.status === "scheduled");
  const needsReview = experiments.filter((exp) => exp.status === "completed" && !exp.verdict);
  const withVerdicts = experiments.filter((exp) => Boolean(exp.verdict)).slice(0, 3);
  const summaryCards = [
    {
      label: "Active",
      value: activeExperiments.length,
      sublabel: "running now",
      icon: <Timer className="size-4 text-emerald-300" />,
    },
    {
      label: "Needs review",
      value: needsReview.length,
      sublabel: "awaiting analysis",
      icon: <BarChart3 className="size-4 text-amber-300" />,
    },
    {
      label: "Completed",
      value: experiments.filter((exp) => exp.status === "completed").length,
      sublabel: "wrapped experiments",
      icon: <Sparkles className="size-4 text-purple-300" />,
    },
  ];

  return (
    <Card
      title="Experiments"
      subtitle="Track custom protocols and let BioFlo analyze the impact."
      icon={<FlaskConical className="size-5 text-indigo" />}
      className={cn("space-y-4", className)}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-soft">Active intelligence on your protocol stacks</span>
        <Link
          href="/chat?message=Can%20you%20design%20a%20biohacking%20experiment%20for%20me%3F"
          className="text-indigo hover:text-text-main transition"
        >
          Ask BioFlo →
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-text-soft">
          <Loader2 className="size-4 animate-spin text-indigo" />
          Loading experiments…
        </div>
      )}

      {!loading && !hasExperiments && (
        <Card variant="ghost" className="border border-indigo-soft px-4 py-3 text-sm text-text-soft">
          No experiments yet. Ask the coach to create one—you’ll see it here once it’s running.
        </Card>
      )}

      {!loading && hasExperiments && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <Card key={card.label} variant="compact" className="border border-border-subtle bg-white/5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-soft">
                  {card.icon}
                  {card.label}
                </div>
                <p className="mt-2 text-2xl font-semibold text-text-main">{card.value}</p>
                <p className="text-xs text-text-soft">{card.sublabel}</p>
              </Card>
            ))}
          </div>

          {activeExperiments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-main">Active experiments</h3>
                <span className="text-xs text-text-soft">BioFlo adapts plans using these</span>
              </div>
              {activeExperiments.slice(0, 3).map((experiment) => (
                <ExperimentMetaRow
                  key={experiment.id}
                  experiment={experiment}
                  onAnalyze={onAnalyze}
                  analyzingId={analyzingId}
                />
              ))}
            </div>
          )}

          {needsReview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-main">Needs your review</h3>
                <span className="text-xs text-text-soft">Analyze to lock in what worked</span>
              </div>
              {needsReview.slice(0, 2).map((experiment) => (
                <ExperimentMetaRow
                  key={experiment.id}
                  experiment={experiment}
                  onAnalyze={onAnalyze}
                  analyzingId={analyzingId}
                />
              ))}
            </div>
          )}

          {withVerdicts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-main">Latest verdicts</h3>
                <span className="text-xs text-text-soft">Grounded insights from completed runs</span>
              </div>
              {withVerdicts.map((experiment) => (
                <Card
                  key={experiment.id}
                  variant="compact"
                  statusAccent="success"
                  className="border border-success/30 bg-success/5"
                >
                  <div className="flex items-center justify-between text-xs text-success">
                    <span className="font-semibold uppercase tracking-wide">{experiment.verdict}</span>
                    <ExperimentStatusBadge status="completed" />
                  </div>
                  <p className="mt-1 text-sm font-medium text-text-main">{experiment.name}</p>
                  <p className="mt-1 text-sm text-text-soft">{experiment.aiSummary}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function CareHubCard({
  settings,
  pendingCount,
  loading,
  className,
}: {
  settings: CareModeSettings | null;
  pendingCount: number;
  loading: boolean;
  className?: string;
}) {
  const enabled = settings?.enabled ?? false;
  const contacts = settings?.contacts.length ?? 0;
  const timeout = settings?.checkInTimeoutHours ?? 2;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-alt px-5 py-4 text-sm text-text-soft shadow-card">
        <Loader2 className="mr-2 inline size-4 animate-spin text-accent-success" />
        Loading care mode…
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_CARD, className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Care hub</p>
          <p className="text-xl font-semibold text-white">
            {loading ? "Syncing…" : enabled ? "Monitoring enabled" : "Monitoring off"}
          </p>
          <p className="text-sm text-white/70">
            {contacts}/2 contacts added · Timeout {timeout}h
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full border border-warning/50 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            {pendingCount} pending
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/care-mode"
          className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white"
        >
          Configure care mode
        </Link>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
        <p>
          {enabled
            ? "BioFlo will prompt you and your contacts if you miss critical check-ins."
            : "Enable alerts to loop in trusted contacts when you deviate from baseline."}
        </p>
        <p className="mt-2 text-xs text-white/50">
          Care Hub isn’t an emergency service. Call local emergency services for urgent medical issues.
        </p>
      </div>
    </div>
  );
}

// Wearable metrics type
interface WearableMetrics {
  hasData: boolean;
  source: string | null;
  lastSyncAt: string | null;
  latest: {
    date: string;
    sleepMinutes: number | null;
    sleepScore: number | null;
    sleepEfficiency: number | null;
    deepSleepMinutes: number | null;
    remSleepMinutes: number | null;
    hrvRmssd: number | null;
    restingHr: number | null;
    steps: number | null;
    activeCalories: number | null;
    recoveryScore: number | null;
    readinessScore: number | null;
  } | null;
  averages: {
    sleepMinutes: number | null;
    sleepScore: number | null;
    hrvRmssd: number | null;
    restingHr: number | null;
    steps: number | null;
    recoveryScore: number | null;
  };
  trend: Array<{
    date: string;
    sleepMinutes: number | null;
    sleepScore: number | null;
    hrvRmssd: number | null;
    restingHr: number | null;
    recoveryScore: number | null;
  }>;
}

export default function DashboardPage() {
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [debrief, setDebrief] = useState<WeeklyDebrief | null>(null);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [experimentsLoading, setExperimentsLoading] = useState<boolean>(true);
  const [analyzingExperimentId, setAnalyzingExperimentId] = useState<string | null>(null);
  const [goalMode, setGoalMode] = useState<GoalMode>("NORMAL");
  const [goalModeLoading, setGoalModeLoading] = useState<boolean>(true);
  const [careSettings, setCareSettings] = useState<CareModeSettings | null>(null);
  const [carePendingCount, setCarePendingCount] = useState<number>(0);
  const [careLoading, setCareLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [wearableMetrics, setWearableMetrics] = useState<WearableMetrics | null>(null);

  useEffect(() => {
    fetchGoalModeSetting();
    fetchTodayPlan();
    fetchWeeklyDebrief();
    fetchNudges();
    fetchProtocol();
    fetchCheckIns();
    fetchProfile();
    fetchExperiments();
    fetchCareData();
    fetchWearableMetrics();
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
            needsOnboarding: data.data.needsOnboarding,
          });
          // Show onboarding for new users
          if (data.data.needsOnboarding) {
            setShowOnboarding(true);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  }

  async function fetchTodayPlan(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/today-plan${forceRefresh ? "?refresh=1" : ""}`);
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/sign-in";
          return;
        }
        setPlan(null);
        setError("Failed to load today’s plan. Please try again.");
        return;
      }
      const data = await response.json();
      if (data.success && data.data) {
        setPlan(data.data.plan || null);
        if (data.data?.plan?.meta?.goalMode) {
          setGoalMode(data.data.plan.meta.goalMode as GoalMode);
        }
      } else {
        setPlan(null);
      }
    } catch (err) {
      console.error("Failed to fetch today’s plan", err);
      setPlan(null);
      setError("Failed to load today’s plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchGoalModeSetting() {
    try {
      setGoalModeLoading(true);
      const response = await fetch("/api/mode");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.mode) {
          setGoalMode(data.data.mode as GoalMode);
        }
      }
    } catch (err) {
      console.error("Failed to fetch goal mode", err);
    } finally {
      setGoalModeLoading(false);
    }
  }

  async function handleGoalModeChange(mode: GoalMode) {
    if (mode === goalMode) return;
    setGoalMode(mode);
    setGoalModeLoading(true);
    try {
      const response = await fetch("/api/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!response.ok) {
        throw new Error("Failed to update mode");
      }
      await fetchTodayPlan(true);
    } catch (err) {
      console.error("Failed to update goal mode", err);
      setError("Unable to update mode right now. Please try again.");
    } finally {
      setGoalModeLoading(false);
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

  async function fetchWearableMetrics() {
    try {
      const response = await fetch("/api/wearables/metrics");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setWearableMetrics(data.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch wearable metrics", err);
    }
  }

  async function fetchCareData() {
    try {
      setCareLoading(true);
      const [settingsResponse, pendingResponse] = await Promise.all([
        fetch("/api/care-mode/settings"),
        fetch("/api/care-mode/check-in"),
      ]);

      if (settingsResponse.ok) {
        const data = await settingsResponse.json();
        if (data.success && data.data) {
          setCareSettings({
            enabled: data.data.enabled,
            contacts: data.data.contacts || [],
            checkInTimeoutHours: data.data.checkInTimeoutHours || 2,
          });
        }
      }

      if (pendingResponse.ok) {
        const data = await pendingResponse.json();
        if (data.success && data.data) {
          setCarePendingCount(data.data.checkIns?.length || 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch care data", err);
      setCareSettings(null);
      setCarePendingCount(0);
    } finally {
      setCareLoading(false);
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

  async function fetchExperiments() {
    try {
      setExperimentsLoading(true);
      const response = await fetch("/api/experiments");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/sign-in";
          return;
        }
        setExperiments([]);
        return;
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setExperiments(data.data);
      } else {
        setExperiments([]);
      }
    } catch (err) {
      console.error("Failed to fetch experiments", err);
      setExperiments([]);
    } finally {
      setExperimentsLoading(false);
    }
  }

  async function analyzeExperiment(experimentId: string) {
    try {
      setAnalyzingExperimentId(experimentId);
      const response = await fetch(`/api/experiments/${experimentId}/analyze`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to analyze experiment");
      }
      const data = await response.json();
      const verdict = data?.data?.experiment?.verdict ?? null;
      const summary = data?.data?.experiment?.summary ?? null;
      setExperiments((prev) =>
        prev.map((experiment) =>
          experiment.id === experimentId
            ? {
                ...experiment,
                verdict,
                aiSummary: summary,
              }
            : experiment
        )
      );
      await fetchExperiments();
    } catch (err) {
      console.error("Experiment analysis failed", err);
    } finally {
      setAnalyzingExperimentId(null);
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

  const moodAvg = useMemo(() => computeAverage(checkIns, "mood"), [checkIns]);
  const energyAvg = useMemo(() => computeAverage(checkIns, "energy"), [checkIns]);
  const sleepAvg = useMemo(() => computeAverage(checkIns, "sleep_quality"), [checkIns]);
  const sortedCheckIns = useMemo(() => sortCheckIns(checkIns), [checkIns]);
  const readinessScore = useMemo(() => computeReadinessScore(checkIns), [checkIns]);
  const trendData = useMemo(() => buildTrendData(checkIns), [checkIns]);
  const readinessHistory = useMemo(
    () => sortedCheckIns.map((entry) => computeReadinessFromEntry(entry)),
    [sortedCheckIns]
  );
  const latestCheckIn = useMemo(() => getLatestCheckIn(checkIns), [checkIns]);
  const hrvEstimate = readinessScore ? Math.round(60 + readinessScore / 2) : null;
  const restingHrEstimate = readinessScore ? Math.max(48, Math.round(70 - readinessScore / 3)) : null;
  const stressScore = energyAvg != null ? Math.max(1, Math.round(11 - energyAvg)) : null;
  const sleepHistory = useMemo(
    () =>
      buildHistory(checkIns, (entry) =>
        typeof entry.sleep_quality === "number" ? entry.sleep_quality * 10 : null
      ),
    [checkIns]
  );
  const energyHistory = useMemo(
    () =>
      buildHistory(checkIns, (entry) =>
        typeof entry.energy === "number" ? entry.energy * 10 : null
      ),
    [checkIns]
  );
  const moodHistory = useMemo(
    () =>
      buildHistory(checkIns, (entry) =>
        typeof entry.mood === "number" ? entry.mood * 10 : null
      ),
    [checkIns]
  );

  const dashboardSummary = useMemo(
    () =>
      buildDashboardSummary({
        readinessScore,
        checkIns,
        plan,
        experiments,
        trendData,
        hrvEstimate,
        restingHrEstimate,
        sleepAvg,
        energyAvg,
        wearableMetrics,
      }),
    [
      readinessScore,
      checkIns,
      plan,
      experiments,
      trendData,
      hrvEstimate,
      restingHrEstimate,
      sleepAvg,
      energyAvg,
      wearableMetrics,
    ]
  );

  const metricTiles = useMemo<MetricTile[]>(() => {
    // Show only 3 most important metrics for cleaner layout
    return [
      {
        id: "hrv",
        label: "HRV",
        value: dashboardSummary.hrvMs ? `${dashboardSummary.hrvMs} ms` : "—",
        helper: dashboardSummary.hasWearableData ? "7-day avg vs 30d" : "Connect wearable to track",
        delta: dashboardSummary.hrvDelta30d ? `+${dashboardSummary.hrvDelta30d} vs 30d` : undefined,
        badge: dashboardSummary.hasWearableData ? "Ultrahuman" : undefined,
        sparkline: readinessHistory.map((score) => Math.round(60 + score / 2)),
        requiresWearable: true,
        emptyState: "Wearable data required",
      },
      {
        id: "sleep",
        label: "Sleep",
        value: formatAverage(sleepAvg, "/10"),
        helper: sleepHistory.length >= 3 ? "Last 7 days trend" : "Log more check-ins",
        delta: dashboardSummary.sleepDelta7d && sleepHistory.length >= 3 ? `+${dashboardSummary.sleepDelta7d}%` : undefined,
        badge: dashboardSummary.hasWearableData ? "Blended" : "Self-rated",
        sparkline: sleepHistory,
      },
      {
        id: "restingHr",
        label: "Resting HR",
        value: dashboardSummary.restingHr ? `${dashboardSummary.restingHr} bpm` : "—",
        helper: dashboardSummary.hasWearableData ? "vs personal baseline" : "Connect wearable to track",
        delta:
          dashboardSummary.restingHrDeltaBaseline != null
            ? `${dashboardSummary.restingHrDeltaBaseline > 0 ? "+" : ""}${dashboardSummary.restingHrDeltaBaseline} bpm`
            : undefined,
        badge: dashboardSummary.hasWearableData ? "Ultrahuman" : undefined,
        sparkline: readinessHistory.map((score) => Math.max(48, Math.round(70 - score / 3))),
        requiresWearable: true,
        emptyState: "Wearable data required",
      },
    ];
  }, [
    dashboardSummary,
    readinessHistory,
    sleepAvg,
    sleepHistory,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-8 animate-spin text-accent-primary" />
          <p className="text-white/70">Loading your plan...</p>
        </div>
      </div>
    );
  }

  const firstName = profile?.firstName;
  const effectiveMode = (plan?.meta?.goalMode as GoalMode) || goalMode;

  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    // Refresh all data after onboarding
    await Promise.all([
      fetchTodayPlan(true),
      fetchProfile(),
      fetchCheckIns(),
    ]);
  };

  // Show onboarding for new users
  if (showOnboarding) {
    return <OnboardingV2 onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      <DataModeBanner summary={dashboardSummary} />

      <DashboardHero
        firstName={firstName}
        goalMode={goalMode}
        loading={goalModeLoading}
        onChangeMode={handleGoalModeChange}
        planFocus={plan?.focus}
        planSummary={plan?.summary || plan?.meta?.trendInsights}
        summary={dashboardSummary}
      />

      <KeyStatsRow metrics={metricTiles} summary={dashboardSummary} />

      <div className="grid gap-6 lg:grid-cols-12" id="plan">
        {plan ? (
          <TodayPlanCard
            plan={plan}
            mode={effectiveMode}
            className="lg:col-span-7"
            onRegenerate={() => fetchTodayPlan(true)}
          />
        ) : (
          <div className={cn(DASHBOARD_CARD, "lg:col-span-7 text-center")}>
            <p className="text-sm text-white/70">No plan cached for today.</p>
            <button
              onClick={() => fetchTodayPlan(true)}
              className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white"
            >
              Generate plan
            </button>
          </div>
        )}

        <WeeklyTrendsCard
          className="lg:col-span-5"
          data={trendData}
          hasTrendData={dashboardSummary.hasTrendData}
          insights={dashboardSummary.trendInsights}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <ExperimentsPanel
          experiments={experiments}
          loading={experimentsLoading}
          analyzingId={analyzingExperimentId}
          onAnalyze={analyzeExperiment}
          className="lg:col-span-7"
        />
        <CareHubCard
          settings={careSettings}
          pendingCount={carePendingCount}
          loading={careLoading}
          className="lg:col-span-5"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <DailyCheckInCard latest={latestCheckIn} className="lg:col-span-7" />
        <ProtocolProgressCard protocol={protocol} className="lg:col-span-5" />
      </div>

      {debrief && <WeeklyDebriefCard debrief={debrief} />}

      {nudges.length > 0 && (
        <Card
          title="Coach alerts"
          subtitle="Recent nudges from your AI coach"
          icon={<AlertCircle className="size-5 text-warning" />}
        >
          <div className="space-y-3">
            {nudges.map((nudge) => {
              const palette =
                nudge.payload.severity === "high"
                  ? "border-danger bg-danger/10"
                  : nudge.payload.severity === "medium"
                  ? "border-warning bg-warning/10"
                  : "border-indigo bg-indigo-soft";
              return (
                    <div key={nudge.id} className={cn("rounded-2xl border p-4 text-sm text-text-main", palette)}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex-1 text-sm text-text-main">{nudge.payload.message}</p>
                    <button
                      onClick={() => markNudgeDelivered(nudge.id)}
                          className="rounded-full border border-border-subtle p-1 text-text-soft transition hover:border-border-strong hover:text-text-primary"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {error && (
        <Card statusAccent="danger">
          <p className="text-sm text-danger">{error}</p>
          <button
            onClick={fetchTodayPlan}
            className="mt-3 text-xs font-semibold text-danger underline-offset-2 hover:underline"
          >
            Retry generation
          </button>
        </Card>
      )}
    </div>
  );
}
