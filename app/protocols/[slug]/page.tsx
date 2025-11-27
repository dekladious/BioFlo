"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  Play,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MetricPill } from "@/components/ui/metric-pill";
import { RingMetric } from "@/components/ui/ring-metric";
import { cn } from "@/lib/utils/cn";

type ProtocolConfig = {
  duration: number;
  tags?: string[];
  days: Array<{
    day: number;
    title: string;
    summary: string;
    actions: string[];
    education: string;
  }>;
};

type Protocol = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  config: ProtocolConfig;
};

type ActiveRun = {
  id: number;
  status: string;
  startedAt: string;
  state: unknown;
  currentDay?: number;
  totalDays?: number;
  logs: Array<{
    dayIndex: number;
    completed: boolean;
    notes: string | null;
  }>;
} | null;

export default function ProtocolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [activeRun, setActiveRun] = useState<ActiveRun>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [dayNotes, setDayNotes] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const fetchProtocol = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/protocols/${slug}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/sign-in");
          return;
        }
        throw new Error("Failed to fetch protocol");
      }
      const data = await response.json();
      if (data.success && data.data) {
        setProtocol(data.data.protocol);
        setActiveRun(data.data.activeRun);
        if (data.data.activeRun?.currentDay) {
          setSelectedDay(data.data.activeRun.currentDay);
        }
      }
    } catch (error) {
      console.error("Failed to fetch protocol", error);
    } finally {
      setLoading(false);
    }
  }, [router, slug]);

  useEffect(() => {
    fetchProtocol();
  }, [fetchProtocol]);

  useEffect(() => {
    // Load notes for selected day if active run exists
    if (activeRun) {
      const dayLog = activeRun.logs.find((log) => log.dayIndex === selectedDay);
      setDayNotes(dayLog?.notes || "");
    }
  }, [selectedDay, activeRun]);

  async function handleStartProtocol() {
    if (!protocol) return;
    setSaving(true);
    try {
      const response = await fetch("/api/protocols/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId: protocol.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to start protocol");
        return;
      }

      // Refresh to get active run
      await fetchProtocol();
      // Scroll to day 1
      setTimeout(() => {
        document.getElementById("day-content")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Failed to start protocol", error);
      alert("Failed to start protocol. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStopProtocol() {
    if (!activeRun) return;
    setSaving(true);
    try {
      const response = await fetch("/api/protocols/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolRunId: activeRun.id }),
      });

      if (!response.ok) {
        alert("Failed to stop protocol");
        return;
      }

      setShowStopConfirm(false);
      await fetchProtocol();
    } catch (error) {
      console.error("Failed to stop protocol", error);
      alert("Failed to stop protocol. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkDayComplete(dayIndex: number) {
    if (!activeRun) return;
    setSaving(true);
    try {
      const response = await fetch("/api/protocols/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolRunId: activeRun.id,
          dayIndex,
          completed: true,
          notes: dayNotes || null,
        }),
      });

      if (!response.ok) {
        alert("Failed to mark day as complete");
        return;
      }

      await fetchProtocol();
    } catch (error) {
      console.error("Failed to mark day complete", error);
      alert("Failed to update progress. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes(dayIndex: number) {
    if (!activeRun) return;
    setSaving(true);
    try {
      const response = await fetch("/api/protocols/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolRunId: activeRun.id,
          dayIndex,
          notes: dayNotes || null,
        }),
      });

      if (!response.ok) {
        alert("Failed to save notes");
        return;
      }

      // Refresh to update notes
      await fetchProtocol();
    } catch (error) {
      console.error("Failed to save notes", error);
      alert("Failed to save notes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-sky-400" />
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Protocol not found</p>
        <Link href="/protocols" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
          ← Back to protocols
        </Link>
      </div>
    );
  }

  const config = protocol.config;
  const currentDayData = config.days?.find((d) => d.day === selectedDay);
  const isDayComplete = activeRun?.logs.find((log) => log.dayIndex === selectedDay)?.completed || false;
  const currentDay = activeRun?.currentDay || 1;
  const totalDays = config.duration || config.days?.length || 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Card variant="hero" statusAccent="primary" className="space-y-6">
        <div className="flex flex-wrap items-start gap-4">
          <Link
            href="/protocols"
            className="rounded-2xl border border-border-subtle px-3 py-2 text-text-soft hover:text-text-main"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1 space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-text-soft">Protocol intelligence</p>
            <h1 className="text-3xl font-semibold text-text-main">{protocol.name}</h1>
            {protocol.description && <p className="text-sm text-text-soft">{protocol.description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill label="Duration" value={`${totalDays} days`} status="neutral" />
          {config.tags?.map((tag, idx) => (
            <MetricPill key={idx} label={tag} value="" status="neutral" />
          ))}
        </div>
        {!activeRun ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleStartProtocol}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full border border-teal bg-teal-soft px-5 py-2 text-sm font-semibold text-teal hover:bg-teal/20 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {saving ? "Starting…" : "Start this protocol"}
            </button>
            <Link
              href={`/chat?message=${encodeURIComponent(`Is the ${protocol.name} protocol right for me?`)}`}
              className="quick-action-chip border-border-subtle bg-white/5"
            >
              Ask coach about this
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <MetricPill
              label="Current day"
              value={`Day ${currentDay}/${totalDays}`}
              status="good"
              deltaLabel={`${Math.round((currentDay / totalDays) * 100)}%`}
            />
            <button
              onClick={() => setShowStopConfirm(true)}
              className="rounded-full border border-danger/40 bg-danger/10 px-4 py-1 text-xs font-semibold text-danger hover:bg-danger/20"
            >
              Stop protocol
            </button>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-soft">Overview</p>
            <h2 className="text-xl font-semibold text-text-main">What this protocol covers</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-white/5 p-4">
              <h3 className="text-sm font-medium text-text-main mb-2">What it’s for</h3>
              <p className="text-sm text-text-soft">
                {protocol.description || "A structured programme to help you reach your goal with predictable pacing."}
              </p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/5 p-4">
              <h3 className="text-sm font-medium text-text-main mb-2">What you’ll be doing</h3>
              <ul className="space-y-1 text-sm text-text-soft">
                {config.days?.slice(0, 4).map((day, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-teal mt-1">•</span>
                    {day.title}
                  </li>
                )) || <li>Daily steps that adapt to your plan</li>}
              </ul>
            </div>
          </div>
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning flex items-start gap-3">
            <AlertCircle className="size-4 mt-0.5" />
            Behavioural guidance only. No medication, fasting extremes, or unsupervised heat/cold therapy. Talk to your doctor
            if you have medical questions or adverse symptoms.
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-text-soft">Readiness snapshot</p>
          <RingMetric value={Math.min(100, Math.round((currentDay / totalDays) * 100))} label="Progress" status="good" />
          <div className="space-y-2 text-sm text-text-soft">
            <p>
              <strong className="text-text-main">Started:</strong>{" "}
              {activeRun
                ? new Date(activeRun.startedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Not running"}
            </p>
            <p>
              <strong className="text-text-main">Mode tie-in:</strong> Coach will adapt today’s plan when this run is active.
            </p>
          </div>
        </Card>
      </div>

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-text-main">Stop protocol?</h3>
            <p className="text-sm text-text-soft">
              Are you sure you want to stop this protocol? Your progress will be saved, but you’ll need to restart the run to continue later.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-main hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleStopProtocol}
                disabled={saving}
                className="flex-1 rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/80 disabled:opacity-60"
              >
                {saving ? "Stopping…" : "Stop protocol"}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Day-by-Day Section */}
      {activeRun && (
        <Card id="day-content" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-text-main">Day-by-day</h2>
            <div className="flex items-center gap-2">
              <MetricPill label="Today" value={`Day ${currentDay}`} status="good" />
              <MetricPill label="Completed" value={`${completedDays}/${totalDays}`} status="neutral" />
            </div>
          </div>

          {/* Day Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const isCompleted = activeRun.logs.find((log) => log.dayIndex === day)?.completed || false;
              const isToday = day === currentDay;
              const isSelected = day === selectedDay;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap border",
                    isSelected
                      ? "border-teal bg-teal-soft text-teal"
                      : isToday
                      ? "border-indigo bg-indigo-soft text-indigo"
                      : "border-border-subtle text-text-soft hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                    <span>Day {day}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Day Content */}
          {currentDayData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-text-main">
                  Day {selectedDay} · {currentDayData.title}
                </h3>
                {currentDayData.summary && (
                  <p className="text-sm text-text-soft leading-relaxed">{currentDayData.summary}</p>
                )}
              </div>

              {/* Today’s Actions */}
              {currentDayData.actions && currentDayData.actions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-text-main mb-3">Today’s actions</h4>
                  <ul className="space-y-2">
                    {currentDayData.actions.map((action, idx) => (
                      <li key={idx} className="text-sm text-text-main flex items-start gap-2">
                        <span className="text-teal mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Why this matters */}
              {currentDayData.education && (
                <div className="rounded-2xl border border-border-subtle bg-white/5 p-4">
                  <h4 className="text-sm font-medium text-text-main mb-2">Why this matters</h4>
                  <p className="text-sm text-text-soft leading-relaxed">{currentDayData.education}</p>
                </div>
              )}

              {/* Personal Notes */}
              <div>
                <h4 className="text-sm font-medium text-text-main mb-2">Personal notes</h4>
                <textarea
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  placeholder="Add your notes about today’s progress..."
                  className="w-full rounded-2xl border border-border-subtle bg-white/5 px-4 py-3 text-sm text-text-main placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none"
                  rows={4}
                />
                <button
                  onClick={() => handleSaveNotes(selectedDay)}
                  disabled={saving}
                  className="mt-2 rounded-full border border-border-subtle px-4 py-2 text-sm font-semibold text-text-main hover:bg-white/10 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save notes"}
                </button>
              </div>

              {/* Completion */}
              <div>
                {isDayComplete ? (
                  <div className="rounded-2xl border border-success/40 bg-success/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="size-5 text-success" />
                      <span className="text-sm font-medium text-success">Day completed</span>
                    </div>
                    <button
                      onClick={() => {
                        setDayNotes("");
                        handleSaveNotes(selectedDay);
                      }}
                      className="text-xs text-success hover:text-success/80 transition"
                    >
                      Edit notes
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleMarkDayComplete(selectedDay)}
                    disabled={saving || selectedDay !== currentDay}
                    className="w-full rounded-full bg-teal px-4 py-3 text-body font-semibold hover:bg-teal/80 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Mark day as complete
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Chat Integration */}
              <div className="rounded-2xl border border-indigo/40 bg-indigo-soft p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="size-5 text-indigo mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-indigo mb-1">
                      Want help adapting today’s steps?
                    </h4>
                    <p className="text-xs text-text-soft mb-3">
                      Ask the coach about adapting Day {selectedDay} to your schedule or challenges.
                    </p>
                    <Link
                      href={`/chat?message=${encodeURIComponent(
                        `Can you help me adapt Day ${selectedDay} of the ${protocol.name} protocol to my schedule?`
                      )}`}
                      className="inline-block rounded-full border border-indigo px-4 py-2 text-sm font-semibold text-indigo hover:bg-indigo-soft transition"
                    >
                      Ask the coach about today →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

