"use client";

type CheckIn = {
  created_at: string;
  mood: number | null;
  energy: number | null;
  sleep_quality: number | null;
};

type RecentTrendsProps = {
  checkIns: CheckIn[];
  wearableData?: {
    sleepAvg?: number;
    sleepGoal?: number;
    hrvTrend?: string;
    stepsAvg?: number;
    stepsGoal?: number;
  };
};

export default function RecentTrends({ checkIns, wearableData }: RecentTrendsProps) {
  // Calculate trends from last 7 days
  const last7Days = [...checkIns]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-7);

  const moodValues = last7Days.map((c) => c.mood).filter((v): v is number => v !== null);
  const energyValues = last7Days.map((c) => c.energy).filter((v): v is number => v !== null);
  const sleepValues = last7Days.map((c) => c.sleep_quality).filter((v): v is number => v !== null);

  const moodTrend = moodValues.length >= 2
    ? `${moodValues[0]}/10 → ${moodValues[moodValues.length - 1]}/10`
    : moodValues.length === 1
    ? `${moodValues[0]}/10`
    : null;

  const energyTrend = energyValues.length >= 2
    ? `${energyValues[0]}/10 → ${energyValues[energyValues.length - 1]}/10`
    : energyValues.length === 1
    ? `${energyValues[0]}/10`
    : null;

  const sleepRange = sleepValues.length > 0
    ? `${Math.min(...sleepValues)}–${Math.max(...sleepValues)}/10`
    : null;

  if (last7Days.length === 0 && !wearableData) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.045] backdrop-blur shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Recent trends</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">No data yet. Start checking in to see trends!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.045] backdrop-blur shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent trends</h3>

      <div className="space-y-2 text-xs">
        {/* Mood */}
        {moodTrend && (
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Mood:</span>
            <span className="text-slate-900 dark:text-white font-medium">{moodTrend}</span>
          </div>
        )}

        {/* Energy */}
        {energyTrend && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Energy:</span>
            <span className="text-white font-medium">{energyTrend}</span>
          </div>
        )}

        {/* Sleep Quality */}
        {sleepRange && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Sleep quality:</span>
            <span className="text-white font-medium">{sleepRange}</span>
          </div>
        )}

        {/* Wearables */}
        {wearableData && (
          <>
            {wearableData.sleepAvg !== undefined && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Sleep:</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    avg {Math.floor(wearableData.sleepAvg / 60)}h{wearableData.sleepAvg % 60}
                    {wearableData.sleepGoal && ` (goal ~${Math.floor(wearableData.sleepGoal / 60)}h)`}
                  </span>
                </div>
              </div>
            )}

            {wearableData.hrvTrend && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">HRV:</span>
                <span className="text-slate-900 dark:text-white font-medium">{wearableData.hrvTrend}</span>
              </div>
            )}

            {wearableData.stepsAvg !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Steps:</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  ~{(wearableData.stepsAvg / 1000).toFixed(1)}k/day
                  {wearableData.stepsGoal && ` (goal ${wearableData.stepsGoal / 1000}k)`}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

