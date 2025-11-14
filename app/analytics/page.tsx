"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Clock,
  Heart,
  Moon,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

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

const pane =
  "rounded-[16px] border border-white/10 bg-white/[0.045] backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)]";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"health" | "tools">("health");
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [toolUsage, setToolUsage] = useState<ToolUsage[]>([]);
  const [totalUsage, setTotalUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [daysRange, setDaysRange] = useState(7);

  useEffect(() => {
    setLoading(true);
    if (activeTab === "health") {
      fetch(`/api/health/metrics?days=${daysRange}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setHealthMetrics(data.data.metrics || []);
            setHealthSummary(data.data.summary || null);
          } else {
            setHealthMetrics([]);
            setHealthSummary(null);
          }
        })
        .catch(() => {
          setHealthMetrics([]);
          setHealthSummary(null);
        })
        .finally(() => setLoading(false));
    } else {
      fetch("/api/analytics/tools")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setToolUsage(data.data.toolUsage || []);
            setTotalUsage(data.data.totalUsage || 0);
          } else {
            setToolUsage([]);
            setTotalUsage(0);
          }
        })
        .catch(() => {
          setToolUsage([]);
          setTotalUsage(0);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab, daysRange]);

  function formatValue(value: number | null | undefined, unit: string = "", decimals: number = 1): string {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    return `${value.toFixed(decimals)}${unit}`;
  }

  function MetricCard({
    title,
    value,
    unit,
    icon: Icon,
    color,
    trend,
    subtitle,
  }: {
    title: string;
    value: number | null | undefined;
    unit?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    trend?: "up" | "down" | "neutral";
    subtitle?: string;
  }) {
    const trendColor =
      trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-400";
    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

    return (
      <div className={`${pane} p-5`}>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg ${color} p-2`}>
              <Icon className="size-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-300">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {TrendIcon && <TrendIcon className={`size-4 ${trendColor}`} />}
        </div>
        <div className="text-3xl font-bold text-white">
          {value !== null && value !== undefined ? `${formatValue(value, unit)}` : "—"}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-4">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Analytics</h1>
            <p className="mt-2 text-slate-400">Track your health metrics and tool usage</p>
          </div>
          {activeTab === "health" && (
            <div className="flex items-center gap-2">
              <select
                value={daysRange}
                onChange={(e) => setDaysRange(Number(e.target.value))}
                className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          )}
        </div>

        <div className="mb-6 flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab("health")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "health"
                ? "border-b-2 border-sky-400 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Health Metrics
          </button>
          <button
            onClick={() => setActiveTab("tools")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "tools"
                ? "border-b-2 border-sky-400 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tool Usage
          </button>
        </div>

        {loading ? (
          <div className={`${pane} p-8 text-center text-slate-400`}>Loading analytics...</div>
        ) : activeTab === "health" ? (
          <>
            {healthSummary && (
              <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Sleep"
                  value={healthSummary.avgSleepHours}
                  unit="h"
                  icon={Moon}
                  color="bg-indigo-500/20"
                  subtitle="Avg per night"
                />
                <MetricCard
                  title="Sleep Quality"
                  value={healthSummary.avgSleepQuality}
                  unit="/100"
                  icon={Target}
                  color="bg-purple-500/20"
                  subtitle="Avg score"
                />
                <MetricCard
                  title="Steps"
                  value={healthSummary.avgSteps}
                  icon={Activity}
                  color="bg-emerald-500/20"
                  subtitle="Daily average"
                />
                <MetricCard
                  title="Recovery"
                  value={healthSummary.avgRecovery}
                  unit="/100"
                  icon={Heart}
                  color="bg-rose-500/20"
                  subtitle="Avg score"
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                title="HRV"
                value={healthSummary?.avgHRV}
                unit="ms"
                icon={Activity}
                color="bg-cyan-500/20"
                subtitle="Heart Rate Variability"
              />
              <MetricCard
                title="Resting HR"
                value={healthSummary?.avgRHR}
                unit="bpm"
                icon={Heart}
                color="bg-red-500/20"
                subtitle="Average"
              />
              <MetricCard
                title="Stress Level"
                value={healthSummary?.avgStress}
                unit="/100"
                icon={Zap}
                color="bg-orange-500/20"
                subtitle="Average"
              />
              <MetricCard
                title="Energy Level"
                value={healthSummary?.avgEnergy}
                unit="/10"
                icon={Zap}
                color="bg-yellow-500/20"
                subtitle="Average"
              />
              <MetricCard
                title="Weight"
                value={healthSummary?.latestWeight}
                unit="kg"
                icon={Target}
                color="bg-blue-500/20"
                subtitle="Latest"
              />
            </div>

            {healthMetrics.length > 0 ? (
              <div className={`${pane} mt-6 overflow-hidden`}>
                <div className="border-b border-white/10 p-4">
                  <h2 className="text-lg font-semibold text-white">Recent Data</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Sleep</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Steps</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">HRV</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">RHR</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                          Recovery
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {healthMetrics.slice(0, 10).map((metric) => (
                        <tr key={metric.id} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-sm text-white">
                            {new Date(metric.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {metric.sleep?.durationMinutes
                              ? `${(metric.sleep.durationMinutes / 60).toFixed(1)}h`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {metric.activity?.steps?.toLocaleString() || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {formatValue(metric.sleep?.hrvAvg, "ms", 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {metric.heartRate?.resting ? `${metric.heartRate.resting} bpm` : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {formatValue(metric.recovery?.score, "/100", 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400 capitalize">
                            {metric.source || "manual"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className={`${pane} mt-6 p-8 text-center`}>
                <Activity className="mx-auto mb-4 size-12 text-slate-400" />
                <p className="mb-4 text-slate-400">No health data yet.</p>
                <p className="text-sm text-slate-500">
                  Connect a wearable device or manually enter data to start tracking.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                    <Plus className="mr-2 inline size-4" />
                    Connect Device
                  </button>
                  <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                    <Plus className="mr-2 inline size-4" />
                    Manual Entry
                  </button>
                </div>
              </div>
            )}

            <div className={`${pane} mt-6 p-6`}>
              <h3 className="mb-4 text-lg font-semibold text-white">Wearable Integrations</h3>
              <p className="mb-4 text-sm text-slate-400">
                Connect your wearable device to automatically sync health data:
              </p>
              <div className="grid gap-3 md:grid-cols-4">
                {["Oura Ring", "Apple Health", "Garmin", "WHOOP"].map((device) => (
                  <button
                    key={device}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/5"
                  >
                    <div className="size-8 rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400" />
                    <span className="text-sm text-slate-300">{device}</span>
                    <span className="ml-auto text-xs text-slate-500">Coming soon</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : toolUsage.length === 0 ? (
          <div className={`${pane} p-8 text-center`}>
            <BarChart3 className="mx-auto mb-4 size-12 text-slate-400" />
            <p className="text-slate-400">No tool usage data yet. Start using tools to see analytics!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className={`${pane} p-6`}>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="size-5 text-sky-400" />
                <h2 className="text-lg font-semibold text-white">Total Usage</h2>
              </div>
              <div className="text-4xl font-bold text-white">{totalUsage}</div>
              <p className="mt-2 text-sm text-slate-400">Total tool executions</p>
            </div>

            <div className={`${pane} p-6`}>
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="size-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Tool Usage</h2>
              </div>
              <div className="space-y-3">
                {toolUsage.map((tool) => (
                  <div
                    key={tool.toolName}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white capitalize">
                        {tool.toolName.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="size-3" />
                        {new Date(tool.lastUsed).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{tool.usageCount}</div>
                      <div className="text-xs text-slate-400">uses</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


