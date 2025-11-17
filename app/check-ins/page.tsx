"use client";

import { useEffect, useState } from "react";
import { Loader2, Calendar, TrendingUp } from "lucide-react";

type CheckIn = {
  id: number;
  mood: number | null;
  energy: number | null;
  sleep_quality: number | null;
  notes: string | null;
  created_at: string;
};

const pane =
  "rounded-[16px] border border-white/10 bg-white/[0.045] backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)]";

export default function CheckInsPage() {
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [fetching, setFetching] = useState(false);
  const [range, setRange] = useState("7d");

  useEffect(() => {
    fetchCheckIns();
  }, [range]);

  async function fetchCheckIns() {
    setFetching(true);
    try {
      const response = await fetch(`/api/check-ins?range=${range}`);
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/sign-in";
          return;
        }
        // Use empty array instead of throwing - allows page to render
        console.warn("Failed to fetch check-ins", response.status);
        setCheckIns([]);
        return;
      }
      const data = await response.json();
      if (data.success && data.data) {
        setCheckIns(data.data.checkIns || []);
      } else {
        setCheckIns([]);
      }
    } catch (error) {
      console.error("Failed to fetch check-ins", error);
      // Set empty array on error to allow page to render
      setCheckIns([]);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mood === null && energy === null && sleepQuality === null) {
      return; // At least one field required
    }

    setLoading(true);
    try {
      const response = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          energy,
          sleep_quality: sleepQuality,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || "Failed to save check-in";
        alert(`Failed to save check-in: ${errorMessage}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        // Reset form
        setMood(null);
        setEnergy(null);
        setSleepQuality(null);
        setNotes("");

        // Refresh check-ins
        await fetchCheckIns();
      } else {
        alert("Failed to save check-in. Please try again.");
      }
    } catch (error) {
      console.error("Failed to save check-in", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to save check-in: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }

  function ScoreInput({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number | null;
    onChange: (value: number | null) => void;
  }) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onChange(value === num ? null : num)}
              className={`flex-1 rounded-lg border p-2 text-sm font-medium transition ${
                value === num
                  ? "border-sky-400 bg-sky-400/20 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Calculate averages
  const avgMood =
    checkIns.filter((c) => c.mood !== null).length > 0
      ? checkIns
          .filter((c) => c.mood !== null)
          .reduce((sum, c) => sum + (c.mood || 0), 0) /
        checkIns.filter((c) => c.mood !== null).length
      : null;
  const avgEnergy =
    checkIns.filter((c) => c.energy !== null).length > 0
      ? checkIns
          .filter((c) => c.energy !== null)
          .reduce((sum, c) => sum + (c.energy || 0), 0) /
        checkIns.filter((c) => c.energy !== null).length
      : null;
  const avgSleep =
    checkIns.filter((c) => c.sleep_quality !== null).length > 0
      ? checkIns
          .filter((c) => c.sleep_quality !== null)
          .reduce((sum, c) => sum + (c.sleep_quality || 0), 0) /
        checkIns.filter((c) => c.sleep_quality !== null).length
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Check-ins</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={pane + " p-6 space-y-6"}>
        <h2 className="text-lg font-semibold">How are you feeling today?</h2>

        <ScoreInput label="Mood (1-10)" value={mood} onChange={setMood} />
        <ScoreInput label="Energy (1-10)" value={energy} onChange={setEnergy} />
        <ScoreInput
          label="Sleep Quality (1-10)"
          value={sleepQuality}
          onChange={setSleepQuality}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about how you're feeling..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400/50"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={loading || (mood === null && energy === null && sleepQuality === null)}
          className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-3 font-medium text-black shadow-[0_12px_30px_rgba(56,189,248,0.35)] transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Saving...
            </span>
          ) : (
            "Save Check-in"
          )}
        </button>
      </form>

      {/* Stats */}
      {(avgMood !== null || avgEnergy !== null || avgSleep !== null) && (
        <div className={pane + " p-6"}>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-5 text-sky-400" />
            <h2 className="text-lg font-semibold">Averages ({range})</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {avgMood !== null && (
              <div>
                <div className="text-xs text-slate-400">Mood</div>
                <div className="text-2xl font-semibold">{avgMood.toFixed(1)}</div>
              </div>
            )}
            {avgEnergy !== null && (
              <div>
                <div className="text-xs text-slate-400">Energy</div>
                <div className="text-2xl font-semibold">{avgEnergy.toFixed(1)}</div>
              </div>
            )}
            {avgSleep !== null && (
              <div>
                <div className="text-xs text-slate-400">Sleep</div>
                <div className="text-2xl font-semibold">{avgSleep.toFixed(1)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className={pane + " p-6"}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">History</h2>
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                  range === r
                    ? "border-sky-400 bg-sky-400/20 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : checkIns.length === 0 ? (
          <div className="py-8 text-center text-slate-400">No check-ins yet</div>
        ) : (
          <div className="space-y-3">
            {checkIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="size-4" />
                    {new Date(checkIn.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {checkIn.mood !== null && (
                    <div>
                      <span className="text-slate-400">Mood:</span>{" "}
                      <span className="font-medium">{checkIn.mood}/10</span>
                    </div>
                  )}
                  {checkIn.energy !== null && (
                    <div>
                      <span className="text-slate-400">Energy:</span>{" "}
                      <span className="font-medium">{checkIn.energy}/10</span>
                    </div>
                  )}
                  {checkIn.sleep_quality !== null && (
                    <div>
                      <span className="text-slate-400">Sleep:</span>{" "}
                      <span className="font-medium">{checkIn.sleep_quality}/10</span>
                    </div>
                  )}
                </div>
                {checkIn.notes && (
                  <div className="mt-2 text-sm text-slate-300">{checkIn.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

