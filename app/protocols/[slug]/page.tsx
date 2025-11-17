"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Play,
  X,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

const pane = "rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur shadow-sm";

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

  useEffect(() => {
    fetchProtocol();
  }, [slug]);

  useEffect(() => {
    // Load notes for selected day if active run exists
    if (activeRun) {
      const dayLog = activeRun.logs.find((log) => log.dayIndex === selectedDay);
      setDayNotes(dayLog?.notes || "");
    }
  }, [selectedDay, activeRun]);

  async function fetchProtocol() {
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
        // Set selected day to current day if active, otherwise day 1
        if (data.data.activeRun?.currentDay) {
          setSelectedDay(data.data.activeRun.currentDay);
        }
      }
    } catch (error) {
      console.error("Failed to fetch protocol", error);
    } finally {
      setLoading(false);
    }
  }

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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/protocols"
          className="rounded-lg p-2 hover:bg-white/10 transition text-slate-400 hover:text-white"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{protocol.name}</h1>
          {protocol.description && (
            <p className="text-sm text-slate-400 mt-1">{protocol.description}</p>
          )}
        </div>
      </div>

      {/* Duration & Tags */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-sky-400/20 text-sky-300 border border-sky-400/30">
          {totalDays} days
        </span>
        {config.tags?.map((tag, idx) => (
          <span
            key={idx}
            className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Overview Section */}
      <div className={pane + " p-6 space-y-4"}>
        <h2 className="text-lg font-semibold">Overview</h2>

        {/* What this protocol is for */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-2">What this protocol is for</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {protocol.description || "A structured programme to help you achieve your health goals."}
          </p>
        </div>

        {/* What you'll be doing */}
        {config.days && config.days.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">What you'll be doing</h3>
            <ul className="space-y-1">
              {config.days.slice(0, 5).map((day, idx) => (
                <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                  <span className="text-sky-400 mt-1">•</span>
                  <span>{day.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Safety Note */}
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300 leading-relaxed">
              This protocol focuses on behavioural changes like light, timing, and routines. It does not replace medical advice. If you have a sleep disorder or medical condition, talk to your doctor first.
            </p>
          </div>
        </div>

        {/* CTA */}
        {!activeRun ? (
          <button
            onClick={handleStartProtocol}
            disabled={saving}
            className="w-full rounded-lg bg-sky-400 px-4 py-3 text-white font-medium hover:bg-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Start this protocol
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4">
              <p className="text-sm text-emerald-300">
                You're currently on Day {currentDay} of {totalDays}.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/protocols/${slug}#day-${currentDay}`}
                className="flex-1 rounded-lg bg-sky-400 px-4 py-3 text-white font-medium hover:bg-sky-500 transition text-center"
              >
                Go to today's steps
              </Link>
              <button
                onClick={() => setShowStopConfirm(true)}
                className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-400/20 transition"
              >
                Stop protocol
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={pane + " p-6 max-w-md w-full space-y-4"}>
            <h3 className="text-lg font-semibold">Stop protocol?</h3>
            <p className="text-sm text-slate-400">
              Are you sure you want to stop this protocol? Your progress will be saved, but you'll need to start over if you want to continue later.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStopProtocol}
                disabled={saving}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition disabled:opacity-50"
              >
                {saving ? "Stopping..." : "Stop protocol"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day-by-Day Section */}
      {activeRun && (
        <div id="day-content" className={pane + " p-6 space-y-6"}>
          <h2 className="text-lg font-semibold">Day-by-day</h2>

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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    isSelected
                      ? "bg-sky-400 text-white"
                      : isToday
                      ? "bg-sky-400/20 text-sky-300 border border-sky-400/30"
                      : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                  }`}
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
                <h3 className="text-xl font-semibold mb-2">
                  Day {selectedDay} – {currentDayData.title}
                </h3>
                {currentDayData.summary && (
                  <p className="text-sm text-slate-400 leading-relaxed">{currentDayData.summary}</p>
                )}
              </div>

              {/* Today's Actions */}
              {currentDayData.actions && currentDayData.actions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Today's actions</h4>
                  <ul className="space-y-2">
                    {currentDayData.actions.map((action, idx) => (
                      <li key={idx} className="text-sm text-slate-200 flex items-start gap-2">
                        <span className="text-sky-400 mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Why this matters */}
              {currentDayData.education && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Why this matters</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{currentDayData.education}</p>
                </div>
              )}

              {/* Personal Notes */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Personal notes</h4>
                <textarea
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  placeholder="Add your notes about today's progress..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 resize-none"
                  rows={4}
                />
                <button
                  onClick={() => handleSaveNotes(selectedDay)}
                  disabled={saving}
                  className="mt-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save notes"}
                </button>
              </div>

              {/* Completion */}
              <div>
                {isDayComplete ? (
                  <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="size-5 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-300">Day completed</span>
                    </div>
                    <button
                      onClick={() => {
                        setDayNotes("");
                        handleSaveNotes(selectedDay);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Edit notes
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleMarkDayComplete(selectedDay)}
                    disabled={saving || selectedDay !== currentDay}
                    className="w-full rounded-lg bg-emerald-400 px-4 py-3 text-white font-medium hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
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
              <div className="rounded-lg border border-sky-400/30 bg-sky-400/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="size-5 text-sky-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-sky-300 mb-1">
                      Want help adapting today's steps?
                    </h4>
                    <p className="text-xs text-sky-400/80 mb-3">
                      Ask the coach about adapting Day {selectedDay} to your schedule or challenges.
                    </p>
                    <Link
                      href={`/chat?message=${encodeURIComponent(`Can you help me adapt Day ${selectedDay} of the ${protocol.name} protocol to my schedule?`)}`}
                      className="inline-block rounded-lg bg-sky-400/20 border border-sky-400/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-400/30 transition"
                    >
                      Ask the coach about today →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <SafetyDisclaimer variant="compact" />
    </div>
  );
}

