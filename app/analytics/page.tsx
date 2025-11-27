"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Heart,
  Moon,
  Plus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { HealthLineChart } from "@/components/ui/charts";
import { cn } from "@/lib/utils/cn";

type HealthMetric = {
  id: string;
  date: string;
  sleep?: {
    durationMinutes: number | null;
    qualityScore: number | null;
    hrvAvg: number | null;
  };
  activity?: {
    steps: number | null;
    activeCalories: number | null;
  };
  heartRate?: {
    resting: number | null;
  };
  recovery?: {
    score: number | null;
  };
  stress?: {
    level: number | null;
  };
  body?: {
    weightKg: number | null;
  };
  energy?: {
    level: number | null;
  };
  source: string | null;
};

type HealthSummary = {
  avgSleepHours: number | null;
  avgSleepQuality: number | null;
  avgHRV: number | null;
  avgSteps: number | null;
  avgRHR: number | null;
  avgRecovery: number | null;
  avgStress: number | null;
  avgEnergy: number | null;
  latestWeight: number | null;
};

type ToolUsage = {
  toolName: string;
  usageCount: number;
  lastUsed: string;
};

const heroActions = [
  { href: "/dashboard#goal-mode", label: "Adjust goal mode", helper: "Normal • recovery • deep work" },
  { href: "/check-ins", label: "Update check-ins", helper: "Mood • sleep • energy" },
  { href: "/care-mode", label: "Care hub", helper: "Escalations & contacts" },
];

const TABS = [
  { id: "health", label: "Health signals" },
  { id: "tools", label: "Tool usage" },
] as const;

const RANGE_OPTIONS = [7, 14, 30];

const formatValue = (value: number | null | undefined, unit = "", decimals = 1): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(decimals)}${unit}`;
};

type MetricCardProps = {
  title: string;
  value: number | null | undefined;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
};

function MetricCard({ title, value, unit, icon: Icon, color, trend, subtitle }: MetricCardProps) {
  const trendColor =
    trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-text-soft";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-2xl p-2", color)}>
            <Icon className="size-4 text-text-main" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-main">{title}</h3>
            {subtitle && <p className="text-xs text-text-soft">{subtitle}</p>}
          </div>
        </div>
        {TrendIcon && <TrendIcon className={cn("size-4", trendColor)} />}
      </div>
      <div className="text-3xl font-semibold text-text-main">
        {value !== null && value !== undefined ? `${formatValue(value, unit)}` : "—"}
      </div>
    </Card>
  );
}

type HeroStat = { label: string; value: string; helper: string };

function AnalyticsHero({ stats }: { stats: HeroStat[] }) {
  return (
    <Card variant="hero" statusAccent="primary" className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-text-soft">Performance telemetry</p>
        <h1 className="text-3xl font-semibold text-text-main">
          Holistic analytics with <span className="text-teal">AI context.</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-text-soft">
          Compare biosignals with tool usage to see how protocols, plans, and experiments influence recovery, focus, and mood.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} variant="compact" className="border border-border-subtle bg-white/5">
            <p className="text-xs uppercase tracking-wide text-text-soft">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-text-main">{stat.value}</p>
            <p className="text-[11px] text-text-soft">{stat.helper}</p>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {heroActions.map((action) => (
          <a key={action.href} href={action.href} className="quick-action-chip border-border-subtle bg-white/5">
            <Sparkles className="size-4 text-teal" />
            <div className="text-left">
              <p className="text-xs font-semibold text-text-main">{action.label}</p>
              <p className="text-[10px] text-text-soft">{action.helper}</p>
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"health" | "tools">("health");
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [toolUsage, setToolUsage] = useState<ToolUsage[]>([]);
  const [totalUsage, setTotalUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [daysRange, setDaysRange] = useState(7);

  const fetchHealthMetrics = useCallback(async (range: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/health/metrics?days=${range}`);
      const data = await response.json();
      if (data.success) {
        setHealthMetrics(data.data.metrics || []);
        setHealthSummary(data.data.summary || null);
      } else {
        setHealthMetrics([]);
        setHealthSummary(null);
      }
    } catch {
      setHealthMetrics([]);
      setHealthSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchToolAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics/tools");
      const data = await response.json();
      if (data.success) {
        setToolUsage(data.data.toolUsage || []);
        setTotalUsage(data.data.totalUsage || 0);
      } else {
        setToolUsage([]);
        setTotalUsage(0);
      }
    } catch {
      setToolUsage([]);
      setTotalUsage(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "health") {
      fetchHealthMetrics(daysRange);
    } else {
      fetchToolAnalytics();
    }
  }, [activeTab, daysRange, fetchHealthMetrics, fetchToolAnalytics]);

  const heroStats = useMemo(
    () => [
      {
        label: "Avg sleep",
        value: formatValue(healthSummary?.avgSleepHours, "h"),
        helper: "per night",
      },
      {
        label: "Avg HRV",
        value: formatValue(healthSummary?.avgHRV, "ms", 0),
        helper: "latest window",
      },
      {
        label: "Tool actions (7d)",
        value: totalUsage ? totalUsage.toLocaleString() : "—",
        helper: "coach + automation",
      },
    ],
    [healthSummary?.avgSleepHours, healthSummary?.avgHRV, totalUsage]
  );

  const multiMetricData = useMemo(() => {
    return healthMetrics.map((metric) => ({
      date: metric.date,
      sleep: metric.sleep?.durationMinutes ? Number((metric.sleep.durationMinutes / 60).toFixed(2)) : null,
      hrv: metric.sleep?.hrvAvg ?? null,
      recovery: metric.recovery?.score ?? null,
    }));
  }, [healthMetrics]);

  const renderHealthView = () => {
    if (loading) {
      return <Card className="p-8 text-center text-text-soft">Loading analytics…</Card>;
    }

    return (
      <div className="space-y-6">
        {healthSummary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Sleep" value={healthSummary.avgSleepHours} unit="h" icon={Moon} color="bg-indigo/10" subtitle="Avg per night" />
            <MetricCard title="Sleep quality" value={healthSummary.avgSleepQuality} unit="/100" icon={Target} color="bg-purple-500/20" subtitle="Avg score" />
            <MetricCard title="Steps" value={healthSummary.avgSteps} icon={Activity} color="bg-emerald-500/20" subtitle="Daily average" />
            <MetricCard title="Recovery" value={healthSummary.avgRecovery} unit="/100" icon={Heart} color="bg-rose-500/20" subtitle="Avg score" />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard title="HRV" value={healthSummary?.avgHRV} unit="ms" icon={Activity} color="bg-cyan-500/20" subtitle="Heart rate variability" />
          <MetricCard title="Resting HR" value={healthSummary?.avgRHR} unit="bpm" icon={Heart} color="bg-red-500/20" subtitle="Average" />
          <MetricCard title="Stress level" value={healthSummary?.avgStress} unit="/100" icon={Zap} color="bg-orange-500/20" subtitle="Average" />
          <MetricCard title="Energy" value={healthSummary?.avgEnergy} unit="/10" icon={Zap} color="bg-yellow-500/20" subtitle="Average" />
          <MetricCard title="Weight" value={healthSummary?.latestWeight} unit="kg" icon={Target} color="bg-blue-500/20" subtitle="Latest" />
        </div>

        <Card title="Bio signal comparison" subtitle="Sleep vs HRV vs recovery">
          {healthMetrics.length ? (
            <HealthLineChart
              data={multiMetricData}
              dataKey="date"
              lineKeys={[
                { key: "sleep", color: "#22e6b8", label: "Sleep (h)" },
                { key: "hrv", color: "#5b5eff", label: "HRV (ms)" },
                { key: "recovery", color: "#fb7185", label: "Recovery (/100)" },
              ]}
              height={280}
            />
          ) : (
            <p className="text-sm text-text-soft">Log some data points to unlock this chart.</p>
          )}
        </Card>

        {healthMetrics.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="border-b border-border-subtle px-4 py-3">
              <h2 className="text-lg font-semibold text-text-main">Recent data</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text-main">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-text-soft">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Sleep</th>
                    <th className="px-4 py-3">Steps</th>
                    <th className="px-4 py-3">HRV</th>
                    <th className="px-4 py-3">RHR</th>
                    <th className="px-4 py-3">Recovery</th>
                    <th className="px-4 py-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60">
                  {healthMetrics.slice(0, 10).map((metric) => (
                    <tr key={metric.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">{new Date(metric.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {metric.sleep?.durationMinutes ? `${(metric.sleep.durationMinutes / 60).toFixed(1)}h` : "—"}
                      </td>
                      <td className="px-4 py-3">{metric.activity?.steps?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-3">{formatValue(metric.sleep?.hrvAvg, "ms", 0)}</td>
                      <td className="px-4 py-3">
                        {metric.heartRate?.resting ? `${metric.heartRate.resting} bpm` : "—"}
                      </td>
                      <td className="px-4 py-3">{formatValue(metric.recovery?.score, "/100", 0)}</td>
                      <td className="px-4 py-3 capitalize text-text-soft">{metric.source || "manual"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <Activity className="mx-auto mb-4 size-12 text-text-soft" />
            <p className="mb-2 text-text-main">No health data yet.</p>
            <p className="text-sm text-text-soft">Connect a wearable or log entries to unlock full analytics.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button className="rounded-full border border-border-subtle px-4 py-2 text-sm text-text-main transition hover:bg-white/5">
                <Plus className="mr-2 inline size-4" />
                Connect device
              </button>
              <button className="rounded-full border border-border-subtle px-4 py-2 text-sm text-text-main transition hover:bg-white/5">
                <Plus className="mr-2 inline size-4" />
                Manual entry
              </button>
            </div>
          </Card>
        )}

        <Card title="Wearable integrations" subtitle="Connect your preferred device to sync automatically">
          <div className="grid gap-3 md:grid-cols-4">
            {["Oura Ring", "Apple Health", "Garmin", "WHOOP"].map((device) => (
              <button
                key={device}
                className="flex items-center gap-2 rounded-2xl border border-border-subtle bg-white/5 px-3 py-2 text-left text-sm text-text-main transition hover:bg-white/10"
              >
                <div className="size-8 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400" />
                <span>{device}</span>
                <span className="ml-auto text-xs text-text-soft">Soon</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  const renderToolView = () => {
    if (loading) {
      return <Card className="p-8 text-center text-text-soft">Loading analytics…</Card>;
    }

    if (toolUsage.length === 0) {
      return (
        <Card className="p-8 text-center">
          <BarChart3 className="mx-auto mb-4 size-12 text-text-soft" />
          <p className="mb-2 text-text-main">No tool usage recorded yet.</p>
          <p className="text-sm text-text-soft">Interact with the coach, protocols, and experiments to see insights here.</p>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-wide text-text-soft">Total actions (7d)</p>
            <p className="mt-2 text-3xl font-semibold text-text-main">{totalUsage.toLocaleString()}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-text-soft">Most used tool</p>
            <p className="mt-2 text-lg font-semibold text-text-main">{toolUsage[0]?.toolName ?? "—"}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-text-soft">Last interaction</p>
            <p className="mt-2 text-lg font-semibold text-text-main">
              {toolUsage[0]?.lastUsed ? new Date(toolUsage[0].lastUsed).toLocaleString() : "—"}
            </p>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border-subtle px-4 py-3">
            <h2 className="text-lg font-semibold text-text-main">Tool breakdown</h2>
          </div>
          <div className="divide-y divide-border-subtle/60">
            {toolUsage.map((tool) => (
              <div key={tool.toolName} className="flex items-center justify-between px-4 py-3 text-text-main">
                <div>
                  <p className="text-sm font-semibold">{tool.toolName}</p>
                  <p className="text-xs text-text-soft">Last used {new Date(tool.lastUsed).toLocaleString()}</p>
                </div>
                <span className="text-lg font-semibold">{tool.usageCount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <AnalyticsHero stats={heroStats} />

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold",
                  activeTab === tab.id ? "bg-teal text-black" : "text-text-soft border border-border-subtle"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-soft">
            <span>Date range:</span>
            {RANGE_OPTIONS.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDaysRange(range)}
                disabled={activeTab !== "health"}
                className={cn(
                  "rounded-full border px-3 py-1",
                  daysRange === range ? "border-teal text-teal" : "border-border-subtle text-text-soft",
                  activeTab !== "health" && "opacity-50 cursor-not-allowed"
                )}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">{activeTab === "health" ? renderHealthView() : renderToolView()}</div>
      </Card>
    </div>
  );
}

