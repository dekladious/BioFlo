export type CheckInMetricRow = {
  mood: number | null;
  energy: number | null;
  sleep_quality: number | null;
  created_at: Date;
};

function average(values: Array<number | null>): number | null {
  const filtered = values.filter((v): v is number => typeof v === "number");
  if (!filtered.length) return null;
  const sum = filtered.reduce((total, value) => total + value, 0);
  return sum / filtered.length;
}

function formatDelta(current: number | null, previous: number | null, label: string): string {
  if (current == null) {
    return `${label} data missing`;
  }
  if (previous == null) {
    return `${label} avg ${current.toFixed(1)}`;
  }
  const delta = current - previous;
  if (Math.abs(delta) < 0.1) {
    return `${label} stable at ${current.toFixed(1)}`;
  }
  const arrow = delta > 0 ? "↑" : "↓";
  return `${label} ${current.toFixed(1)} (${arrow}${Math.abs(delta).toFixed(1)})`;
}

export function buildCheckInSummaries(checkIns: CheckInMetricRow[]) {
  if (!checkIns.length) {
    return {
      recentSummary: "No check-ins logged recently.",
      trendSummary: "No trend data available.",
    };
  }

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const last7 = checkIns.filter(
    (entry) => now - new Date(entry.created_at).getTime() <= sevenDays
  );
  const prev7 = checkIns.filter((entry) => {
    const diff = now - new Date(entry.created_at).getTime();
    return diff > sevenDays && diff <= sevenDays * 2;
  });

  const last7Mood = average(last7.map((entry) => entry.mood));
  const last7Energy = average(last7.map((entry) => entry.energy));
  const last7Sleep = average(last7.map((entry) => entry.sleep_quality));

  const prev7Mood = average(prev7.map((entry) => entry.mood));
  const prev7Energy = average(prev7.map((entry) => entry.energy));
  const prev7Sleep = average(prev7.map((entry) => entry.sleep_quality));

  const trendParts = [
    formatDelta(last7Mood, prev7Mood, "Mood"),
    formatDelta(last7Energy, prev7Energy, "Energy"),
    formatDelta(last7Sleep, prev7Sleep, "Sleep quality"),
  ];

  const recentEntries = checkIns.slice(0, 3);
  const recentSummary = recentEntries
    .map((entry) => {
      const date = new Date(entry.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const mood = entry.mood != null ? `${entry.mood}/10 mood` : "mood n/a";
      const energy = entry.energy != null ? `${entry.energy}/10 energy` : "energy n/a";
      const sleep =
        entry.sleep_quality != null ? `${entry.sleep_quality}/10 sleep` : "sleep n/a";
      return `• ${date}: ${mood}, ${energy}, ${sleep}`;
    })
    .join("\n");

  return {
    recentSummary: recentSummary || "No recent check-ins logged.",
    trendSummary: trendParts.join(" · "),
  };
}




