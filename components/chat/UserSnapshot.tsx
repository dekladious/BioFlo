"use client";

type UserSnapshotProps = {
  goals?: string[];
  mode?: string;
  currentFocus?: string;
};

export default function UserSnapshot({ goals = [], mode = "NORMAL", currentFocus }: UserSnapshotProps) {
  const modeColors: Record<string, string> = {
    NORMAL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    TRAVEL: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    RECOVERY: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    DEEP_WORK: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.045] backdrop-blur shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">You at a glance</h3>

      {/* Goals */}
      {goals.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-2">
            {goals.map((goal, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-full text-xs font-medium bg-sky-400/20 text-sky-300 border border-sky-400/30"
              >
                {goal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mode */}
      <div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${modeColors[mode] || modeColors.NORMAL}`}>
          {mode}
        </span>
      </div>

      {/* Current Focus */}
      {currentFocus && (
        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="font-medium text-slate-700 dark:text-slate-300">Focus:</span> {currentFocus}
          </p>
        </div>
      )}
    </div>
  );
}

