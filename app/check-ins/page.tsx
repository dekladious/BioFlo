"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Calendar,
  TrendingUp,
  MessageSquare,
  PenLine,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { MetricPill } from "@/components/ui/metric-pill";
import { RingMetric } from "@/components/ui/ring-metric";
import { HealthLineChart } from "@/components/ui/charts";
import { cn } from "@/lib/utils/cn";

type CheckIn = {
  id: number;
  mood: number | null;
  energy: number | null;
  sleep_quality: number | null;
  notes: string | null;
  created_at: string;
};

type TrendPoint = {
  date: string;
  mood: number | null;
  energy: number | null;
  sleep: number | null;
};

export default function CheckInsPage() {
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [fetching, setFetching] = useState(false);
  const [range, setRange] = useState("7d");

  const fetchCheckIns = useCallback(async () => {
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
  }, [range]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

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

  const heroStats = [
    { label: "Mood average", value: avgMood ? `${avgMood.toFixed(1)}/10` : "—", helper: "last window" },
    { label: "Energy average", value: avgEnergy ? `${avgEnergy.toFixed(1)}/10` : "—", helper: "signal stability" },
    { label: "Sleep quality", value: avgSleep ? `${avgSleep.toFixed(1)}/10` : "—", helper: "consistency" },
  ];
  const heroActions = [
    { href: "#log", label: "Log check-in", helper: "Mood • energy • sleep", icon: PenLine },
    { href: "/chat", label: "Ask the coach", helper: "Reflect on patterns", icon: MessageSquare },
  ];

  return (
    <div className="space-y-10">
      <Card variant="hero" statusAccent="primary" className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-text-soft">Daily check-ins</p>
          <h1 className="text-3xl font-semibold text-text-main">Build emotional awareness with precision journaling.</h1>
          <p className="max-w-3xl text-base text-text-soft">
            Log mood, energy, and sleep quality in seconds. BioFlo feeds these signals into your protocols, nudges, and plans to spot trends early.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <RingMetric value={avgMood ? Math.round((avgMood / 10) * 100) : 0} label="Mood" status="neutral" caption={avgMood ? `${avgMood.toFixed(1)}/10` : "No data"} />
          <RingMetric value={avgEnergy ? Math.round((avgEnergy / 10) * 100) : 0} label="Energy" status="neutral" caption={avgEnergy ? `${avgEnergy.toFixed(1)}/10` : "No data"} />
          <RingMetric value={avgSleep ? Math.round((avgSleep / 10) * 100) : 0} label="Sleep" status="neutral" caption={avgSleep ? `${avgSleep.toFixed(1)}/10` : "No data"} />
        </div>

        <div className="flex flex-wrap gap-2">
          {heroActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="quick-action-chip border-border-subtle bg-white/5">
                <Icon className="size-4 text-teal" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-text-main">{action.label}</p>
                  <p className="text-[10px] text-text-soft">{action.helper}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card id="log" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-soft">Log today</p>
            <h2 className="text-lg font-semibold text-text-main">How are you feeling?</h2>
            <p className="text-sm text-text-soft">Mood, energy, and sleep quality feed straight into your plan.</p>
          </div>
          <div className="text-xs text-text-soft">{checkIns.length} entries this range</div>
        </div>

        <ScoreInput label="Mood (1-10)" value={mood} onChange={setMood} />
        <ScoreInput label="Energy (1-10)" value={energy} onChange={setEnergy} />
        <ScoreInput label="Sleep Quality (1-10)" value={sleepQuality} onChange={setSleepQuality} />

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-main">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any context about stress, workouts, recovery, etc."
            className="w-full rounded-2xl border border-border-subtle bg-white/5 px-3 py-2 text-sm text-text-main placeholder:text-text-soft focus:outline-none focus:border-teal"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={loading || (mood === null && energy === null && sleepQuality === null)}
          className="w-full rounded-full border border-teal bg-teal-soft px-5 py-3 font-semibold text-teal transition hover:bg-teal/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Saving…
            </span>
          ) : (
            "Save check-in"
          )}
        </button>
      </Card>

      <Card title="Trend overview" subtitle={`Average scores (${range})`}>
        {checkIns.length > 0 ? (
          <HealthLineChart
            data={checkIns.map((entry) => ({
              date: entry.created_at,
              mood: entry.mood,
              energy: entry.energy,
              sleep: entry.sleep_quality,
            }))}
            dataKey="date"
            lineKeys={[
              { key: "mood", color: "#22e6b8", label: "Mood" },
              { key: "energy", color: "#5b5eff", label: "Energy" },
              { key: "sleep", color: "#fb7185", label: "Sleep" },
            ]}
            height={260}
          />
        ) : (
          <p className="text-sm text-text-soft">Log a few entries to unlock trend visuals.</p>
        )}
      </Card>

      <Card title="History" subtitle="Your recent entries">
        <div className="mb-4 flex flex-wrap gap-2">
          {["7d", "30d", "90d"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                range === r ? "border-teal text-teal" : "border-border-subtle text-text-soft"
              )}
            >
              {r}
            </button>
          ))}
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-8 text-text-soft">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : checkIns.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-white/5 py-10 text-center text-text-soft">
            No check-ins yet
          </div>
        ) : (
          <div className="space-y-3">
            {checkIns.map((checkIn) => (
              <Card key={checkIn.id} className="border border-border-subtle bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-text-soft">
                  <Calendar className="size-4" />
                  {new Date(checkIn.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-text-main">
                  {checkIn.mood !== null && (
                    <div>
                      <span className="text-text-soft">Mood:</span> {checkIn.mood}/10
                    </div>
                  )}
                  {checkIn.energy !== null && (
                    <div>
                      <span className="text-text-soft">Energy:</span> {checkIn.energy}/10
                    </div>
                  )}
                  {checkIn.sleep_quality !== null && (
                    <div>
                      <span className="text-text-soft">Sleep:</span> {checkIn.sleep_quality}/10
                    </div>
                  )}
                </div>
                {checkIn.notes && <p className="mt-2 text-sm text-text-soft">{checkIn.notes}</p>}
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}


