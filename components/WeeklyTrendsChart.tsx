"use client";

import { useMemo } from "react";

type CheckIn = {
  created_at: string;
  mood: number | null;
  energy: number | null;
  sleep_quality: number | null;
};

type WeeklyTrendsChartProps = {
  checkIns: CheckIn[];
};

export default function WeeklyTrendsChart({ checkIns }: WeeklyTrendsChartProps) {
  const chartData = useMemo(() => {
    // Sort by date
    const sorted = [...checkIns].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Get last 7 days
    const last7Days = sorted.slice(-7);

    return last7Days.map((ci) => ({
      date: new Date(ci.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      mood: ci.mood ?? 0,
      energy: ci.energy ?? 0,
      sleepQuality: ci.sleep_quality ?? 0,
    }));
  }, [checkIns]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No check-in data yet. Start checking in to see your trends!
      </div>
    );
  }

  const maxValue = 10;
  const chartHeight = 120;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <span className="text-slate-400">Mood</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <span className="text-slate-400">Energy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          <span className="text-slate-400">Sleep</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 25, 50, 75, 100].map((percent) => (
            <div
              key={percent}
              className="border-t border-white/5"
              style={{ marginTop: percent === 0 ? 0 : -1 }}
            />
          ))}
        </div>

        {/* Chart bars */}
        <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
          {chartData.map((data, idx) => {
            const moodHeight = (data.mood / maxValue) * 100;
            const energyHeight = (data.energy / maxValue) * 100;
            const sleepHeight = (data.sleepQuality / maxValue) * 100;

            return (
              <div key={idx} className="flex-1 flex items-end gap-0.5 group relative">
                {/* Mood */}
                <div
                  className="w-full bg-blue-400/60 rounded-t transition-all hover:bg-blue-400"
                  style={{ height: `${moodHeight}%` }}
                  title={`Mood: ${data.mood}/10`}
                />
                {/* Energy */}
                <div
                  className="w-full bg-amber-400/60 rounded-t transition-all hover:bg-amber-400"
                  style={{ height: `${energyHeight}%` }}
                  title={`Energy: ${data.energy}/10`}
                />
                {/* Sleep */}
                <div
                  className="w-full bg-emerald-400/60 rounded-t transition-all hover:bg-emerald-400"
                  style={{ height: `${sleepHeight}%` }}
                  title={`Sleep: ${data.sleepQuality}/10`}
                />
                {/* Date label */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-slate-500 whitespace-nowrap">
                  {data.date.split(" ")[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-slate-500 mt-6 px-2">
        {chartData.map((data, idx) => (
          <div key={idx} className="text-center min-w-0">
            {data.date.split(" ")[1]}
          </div>
        ))}
      </div>
    </div>
  );
}

