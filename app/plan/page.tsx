"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Clock, Check, SkipForward, ChevronLeft, ChevronRight, Dumbbell, Coffee, Sun, Moon, Briefcase, Target, Pill, Loader2, RefreshCw, AlertCircle, Edit3, X, Save, MessageSquare, Zap, Play, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { ScheduleBlock, BlockType } from "@/lib/types/schedule";

interface Schedule {
  id: string; date: string; wakeTime: string; sleepTime: string;
  goalMode?: string; readinessScore?: number; aiRationale?: string;
  generatedFrom: string; lastModifiedBy: string; blocks: ScheduleBlock[];
}

interface ScheduleSummary {
  focus: string; keyMessage: string; warnings?: string[]; opportunities?: string[];
}

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  wake: Sun, sleep: Moon, meal: Coffee, training: Dumbbell, work: Briefcase,
  deep_work: Target, rest: Coffee, wind_down: Moon, supplement: Pill, habit: Check, custom: Clock,
};

const BLOCK_COLORS: Record<BlockType, { text: string; bg: string; border: string }> = {
  wake: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  sleep: { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  meal: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  training: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  work: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  deep_work: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  rest: { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  wind_down: { text: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30" },
  supplement: { text: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" },
  habit: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  custom: { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30" },
};

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getCurrentTimeMinutes(): number { const now = new Date(); return now.getHours() * 60 + now.getMinutes(); }
function timeToMinutes(time: string): number { const [h, m] = time.split(":").map(Number); return h * 60 + m; }
function isBlockActive(block: ScheduleBlock, cm: number): boolean {
  const s = timeToMinutes(block.startTime);
  const e = block.endTime ? timeToMinutes(block.endTime) : s + 30;
  return cm >= s && cm < e;
}
function isBlockPast(block: ScheduleBlock, cm: number): boolean {
  const e = block.endTime ? timeToMinutes(block.endTime) : timeToMinutes(block.startTime) + 30;
  return cm > e;
}

interface BlockCardProps {
  block: ScheduleBlock; isActive: boolean; isPast: boolean; isToday: boolean;
  onComplete: (id: string) => void; onSkip: (id: string) => void;
  onEdit: (block: ScheduleBlock) => void; loading?: boolean;
}

function BlockCard({ block, isActive, isPast, isToday, onComplete, onSkip, onEdit, loading }: BlockCardProps) {
  const Icon = BLOCK_ICONS[block.blockType] || Clock;
  const colors = BLOCK_COLORS[block.blockType] || BLOCK_COLORS.custom;
  const isCompleted = block.completed;
  const isSkipped = block.skipped;

  return (
    <div className={cn(
      "group relative flex gap-4 rounded-2xl border p-4 transition-all duration-200",
      isActive && !isCompleted && !isSkipped 
        ? "border-accent-primary/50 bg-gradient-to-r from-accent-primary/15 to-accent-primary/5 shadow-[0_0_40px_rgba(45,212,191,0.2)] ring-1 ring-accent-primary/20" 
        : isCompleted 
          ? "border-green-500/30 bg-green-500/5" 
          : isSkipped 
            ? "border-slate-500/30 bg-slate-500/5 opacity-50" 
            : isPast && !isCompleted && isToday 
              ? "border-amber-500/20 bg-amber-500/5" 
              : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
    )}>
      {/* Time Column */}
      <div className="flex flex-col items-center w-20 shrink-0 pt-1">
        <span className={cn(
          "text-lg font-semibold transition-colors",
          isActive ? "text-accent-primary" : isCompleted ? "text-green-400" : "text-white"
        )}>
          {formatTime(block.startTime)}
        </span>
        {block.endTime && <span className="text-xs text-slate-500">to {formatTime(block.endTime)}</span>}
      </div>

      {/* Icon */}
      <div className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl transition-all",
        isCompleted ? "bg-green-500/20 ring-1 ring-green-500/30" 
          : isSkipped ? "bg-slate-500/20" 
          : isActive ? cn(colors.bg, "ring-2 ring-accent-primary/30")
          : colors.bg
      )}>
        {isCompleted ? <Check className="size-6 text-green-400" /> 
          : isSkipped ? <SkipForward className="size-6 text-slate-400" /> 
          : isActive ? <Play className={cn("size-5", colors.text)} />
          : <Icon className={cn("size-6", colors.text)} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-medium",
                isCompleted ? "text-green-300 line-through" 
                  : isSkipped ? "text-slate-500 line-through" 
                  : "text-white"
              )}>
                {block.title}
              </h3>
              {isActive && !isCompleted && !isSkipped && (
                <span className="flex items-center gap-1 rounded-full bg-accent-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-primary animate-pulse">
                  <span className="size-1.5 rounded-full bg-accent-primary" />
                  Now
                </span>
              )}
              {isPast && !isCompleted && !isSkipped && isToday && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  Missed
                </span>
              )}
            </div>
            <span className={cn(
              "inline-block mt-1 rounded-full border px-2 py-0.5 text-xs capitalize",
              colors.bg, colors.text, colors.border
            )}>
              {block.blockType.replace("_", " ")}
            </span>
          </div>
          {isToday && !isCompleted && !isSkipped && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(block)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition" title="Edit">
                <Edit3 className="size-4" />
              </button>
              <button onClick={() => onComplete(block.id)} disabled={loading} className="rounded-lg p-2 text-slate-400 hover:bg-green-500/20 hover:text-green-400 transition" title="Complete">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </button>
              <button onClick={() => onSkip(block.id)} disabled={loading} className="rounded-lg p-2 text-slate-400 hover:bg-slate-500/20 hover:text-slate-300 transition" title="Skip">
                <SkipForward className="size-4" />
              </button>
            </div>
          )}
        </div>
        {block.description && <p className="mt-2 text-sm text-slate-400 leading-relaxed">{block.description}</p>}
        {block.linkedPage && (
          <Link href={block.linkedPage} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-accent-primary hover:bg-white/10 transition">
            View details <ChevronRight className="size-4" />
          </Link>
        )}
      </div>

      {/* Active indicator bar */}
      {isActive && !isCompleted && !isSkipped && (
        <div className="absolute -left-px top-4 bottom-4 w-1 bg-gradient-to-b from-accent-primary to-accent-secondary rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
      )}
    </div>
  );
}

// Current time indicator line
function TimeIndicator({ currentMinutes, wakeTime, sleepTime }: { currentMinutes: number; wakeTime: string; sleepTime: string }) {
  const wakeMinutes = timeToMinutes(wakeTime);
  const sleepMinutes = timeToMinutes(sleepTime);
  const dayLength = sleepMinutes - wakeMinutes;
  
  if (currentMinutes < wakeMinutes || currentMinutes > sleepMinutes || dayLength <= 0) {
    return null;
  }

  const progress = ((currentMinutes - wakeMinutes) / dayLength) * 100;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative my-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-accent-primary/20 px-3 py-1.5 text-xs font-medium text-accent-primary">
          <div className="size-2 rounded-full bg-accent-primary animate-pulse" />
          {timeStr}
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-accent-primary/50 to-transparent" />
      </div>
      <p className="mt-1 text-xs text-slate-500">{Math.round(progress)}% through your scheduled day</p>
    </div>
  );
}

interface EditModalProps { block: ScheduleBlock; onSave: (u: { title?: string; description?: string; startTime?: string }) => void; onClose: () => void; loading: boolean; }

function EditModal({ block, onSave, onClose, loading }: EditModalProps) {
  const [title, setTitle] = useState(block.title);
  const [description, setDescription] = useState(block.description || "");
  const [startTime, setStartTime] = useState(block.startTime);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ title, description, startTime }); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a12] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Edit Block</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"><X className="size-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-300 mb-1">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-accent-primary focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1">Time</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-accent-primary focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-accent-primary focus:outline-none resize-none" /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-primary/20 px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/30 transition disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlanPage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [summary, setSummary] = useState<ScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes());
  const [selectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  useEffect(() => { const i = setInterval(() => setCurrentMinutes(getCurrentTimeMinutes()), 60000); return () => clearInterval(i); }, []);

  useEffect(() => {
    async function fetchSchedule() {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/schedule?date=${selectedDate}`);
        if (!res.ok) throw new Error("Failed to load schedule");
        const data = await res.json();
        setSchedule(data.data.schedule); setSummary(data.data.summary || null);
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to load schedule"); }
      finally { setLoading(false); }
    }
    fetchSchedule();
  }, [selectedDate]);

  const handleComplete = async (blockId: string) => {
    setActionLoading(blockId);
    try {
      const res = await fetch("/api/schedule", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockId, action: "complete" }) });
      if (!res.ok) throw new Error("Failed to update");
      setSchedule(prev => prev ? { ...prev, blocks: prev.blocks.map(b => b.id === blockId ? { ...b, completed: true, completedAt: new Date().toISOString() } : b) } : prev);
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const handleSkip = async (blockId: string) => {
    setActionLoading(blockId);
    try {
      const res = await fetch("/api/schedule", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockId, action: "skip" }) });
      if (!res.ok) throw new Error("Failed to update");
      setSchedule(prev => prev ? { ...prev, blocks: prev.blocks.map(b => b.id === blockId ? { ...b, skipped: true } : b) } : prev);
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const handleEditSave = async (updates: { title?: string; description?: string; startTime?: string }) => {
    if (!editingBlock) return;
    setActionLoading(editingBlock.id);
    try {
      const res = await fetch("/api/schedule", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockId: editingBlock.id, action: "update", updates }) });
      if (!res.ok) throw new Error("Failed to update");
      setSchedule(prev => prev ? { ...prev, lastModifiedBy: "user", blocks: prev.blocks.map(b => b.id === editingBlock.id ? { ...b, ...updates } : b) } : prev);
      setEditingBlock(null);
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const handleRegenerate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/schedule?date=${selectedDate}&refresh=1`);
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      setSchedule(data.data.schedule); setSummary(data.data.summary || null);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to regenerate"); } finally { setLoading(false); }
  };

  const { completedCount, skippedCount, totalCount } = useMemo(() => {
    if (!schedule) return { completedCount: 0, skippedCount: 0, totalCount: 0 };
    return { completedCount: schedule.blocks.filter(b => b.completed).length, skippedCount: schedule.blocks.filter(b => b.skipped).length, totalCount: schedule.blocks.length };
  }, [schedule]);

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"><ChevronLeft className="size-5" /></Link>
              <div><h1 className="text-lg font-semibold text-white">Daily Plan</h1><p className="text-sm text-slate-400">{formatDate(selectedDate)}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/chat?prompt=${encodeURIComponent("Help me adjust today's schedule")}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 transition"><MessageSquare className="size-4" />Ask Coach</Link>
              <button onClick={handleRegenerate} disabled={loading} className="flex items-center gap-2 rounded-lg bg-accent-primary/20 px-3 py-2 text-sm font-medium text-white hover:bg-accent-primary/30 transition disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Regenerate</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Summary Card */}
        {summary && !loading && schedule && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-accent-primary/30 to-accent-secondary/20 p-3 shadow-lg shadow-accent-primary/10">
                <Zap className="size-6 text-accent-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-lg">{summary.focus}</span>
                  {schedule?.goalMode && (
                    <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-xs font-medium text-purple-300">
                      {schedule.goalMode}
                    </span>
                  )}
                  {schedule?.readinessScore && (
                    <span className="rounded-full bg-accent-primary/10 border border-accent-primary/30 px-2.5 py-0.5 text-xs font-medium text-accent-primary">
                      Readiness {schedule.readinessScore}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{summary.keyMessage}</p>
                {schedule?.lastModifiedBy === "user" && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Edit3 className="size-3" /> You've customized this schedule
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-4xl font-bold text-white">{completedCount}<span className="text-2xl text-white/40">/{totalCount}</span></div>
                <div className="text-xs text-slate-400 mt-1">
                  {completedCount === totalCount 
                    ? "🎉 All done!" 
                    : skippedCount > 0 
                      ? `${skippedCount} skipped` 
                      : "tasks complete"}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Day progress</span>
                <span>{Math.round((completedCount / Math.max(totalCount, 1)) * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500 ease-out"
                  style={{ width: `${(completedCount / Math.max(totalCount, 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Warnings / Opportunities */}
            {summary.warnings && summary.warnings.length > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <AlertCircle className="size-5 text-amber-400 shrink-0" />
                <span className="text-sm text-amber-300">{summary.warnings[0]}</span>
              </div>
            )}
            {summary.opportunities && summary.opportunities.length > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 p-3">
                <TrendingUp className="size-5 text-green-400 shrink-0" />
                <span className="text-sm text-green-300">{summary.opportunities[0]}</span>
              </div>
            )}
          </div>
        )}

        {loading && <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-accent-primary" /></div>}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto size-8 text-red-400 mb-2" /><p className="text-red-300">{error}</p>
            <button onClick={handleRegenerate} className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30 transition">Try Again</button>
          </div>
        )}

        {/* Time indicator for today */}
        {!loading && !error && schedule && isToday && schedule.blocks.length > 0 && (
          <TimeIndicator 
            currentMinutes={currentMinutes} 
            wakeTime={schedule.wakeTime} 
            sleepTime={schedule.sleepTime} 
          />
        )}

        {!loading && !error && schedule && (
          <div className="space-y-3">
            {schedule.blocks.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                <Clock className="mx-auto size-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No schedule yet</h3>
                <p className="text-sm text-slate-400 mb-6">Generate a personalized daily plan based on your preferences.</p>
                <button onClick={handleRegenerate} className="inline-flex items-center gap-2 rounded-xl bg-accent-primary/20 px-5 py-2.5 font-medium text-white hover:bg-accent-primary/30 transition">
                  <RefreshCw className="size-4" />Generate Plan
                </button>
              </div>
            ) : (
              <>
                {/* Group blocks by time period */}
                {(() => {
                  const pastBlocks = schedule.blocks.filter(b => isToday && isBlockPast(b, currentMinutes) && !b.completed && !b.skipped);
                  const activeBlock = schedule.blocks.find(b => isToday && isBlockActive(b, currentMinutes) && !b.completed && !b.skipped);
                  const upcomingBlocks = schedule.blocks.filter(b => !isBlockPast(b, currentMinutes) && !isBlockActive(b, currentMinutes));
                  const completedBlocks = schedule.blocks.filter(b => b.completed || b.skipped);
                  
                  return (
                    <>
                      {/* Active block (highlighted) */}
                      {activeBlock && (
                        <div className="mb-4">
                          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-primary">
                            <span className="size-2 rounded-full bg-accent-primary animate-pulse" />
                            Happening Now
                          </p>
                          <BlockCard 
                            block={activeBlock} 
                            isActive={true} 
                            isPast={false} 
                            isToday={isToday} 
                            onComplete={handleComplete} 
                            onSkip={handleSkip} 
                            onEdit={setEditingBlock} 
                            loading={actionLoading === activeBlock.id} 
                          />
                        </div>
                      )}

                      {/* Upcoming blocks */}
                      {upcomingBlocks.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                            Coming Up ({upcomingBlocks.length})
                          </p>
                          <div className="space-y-3">
                            {upcomingBlocks.map(block => (
                              <BlockCard 
                                key={block.id} 
                                block={block} 
                                isActive={false} 
                                isPast={false} 
                                isToday={isToday} 
                                onComplete={handleComplete} 
                                onSkip={handleSkip} 
                                onEdit={setEditingBlock} 
                                loading={actionLoading === block.id} 
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missed blocks (past, not completed) */}
                      {isToday && pastBlocks.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-500">
                            Missed ({pastBlocks.length})
                          </p>
                          <div className="space-y-3">
                            {pastBlocks.map(block => (
                              <BlockCard 
                                key={block.id} 
                                block={block} 
                                isActive={false} 
                                isPast={true} 
                                isToday={isToday} 
                                onComplete={handleComplete} 
                                onSkip={handleSkip} 
                                onEdit={setEditingBlock} 
                                loading={actionLoading === block.id} 
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Completed blocks */}
                      {completedBlocks.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-green-500">
                            Completed ({completedBlocks.length})
                          </p>
                          <div className="space-y-3">
                            {completedBlocks.map(block => (
                              <BlockCard 
                                key={block.id} 
                                block={block} 
                                isActive={false} 
                                isPast={isBlockPast(block, currentMinutes)} 
                                isToday={isToday} 
                                onComplete={handleComplete} 
                                onSkip={handleSkip} 
                                onEdit={setEditingBlock} 
                                loading={actionLoading === block.id} 
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Not today - show all blocks in order */}
                      {!isToday && schedule.blocks.map(block => (
                        <BlockCard 
                          key={block.id} 
                          block={block} 
                          isActive={false} 
                          isPast={false} 
                          isToday={false} 
                          onComplete={handleComplete} 
                          onSkip={handleSkip} 
                          onEdit={setEditingBlock} 
                          loading={actionLoading === block.id} 
                        />
                      ))}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </main>

      {editingBlock && <EditModal block={editingBlock} onSave={handleEditSave} onClose={() => setEditingBlock(null)} loading={actionLoading === editingBlock.id} />}
    </div>
  );
}