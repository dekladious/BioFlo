"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, SkipForward, ChevronRight, Clock, Sun, Moon, Coffee, Dumbbell, Briefcase, Target, Pill, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { ScheduleBlock, BlockType } from "@/lib/types/schedule";

interface Schedule {
  id: string;
  date: string;
  wakeTime: string;
  sleepTime: string;
  blocks: ScheduleBlock[];
}

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  wake: Sun,
  sleep: Moon,
  meal: Coffee,
  training: Dumbbell,
  work: Briefcase,
  deep_work: Target,
  rest: Coffee,
  wind_down: Moon,
  supplement: Pill,
  habit: Check,
  custom: Clock,
};

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isBlockActive(block: ScheduleBlock, currentMinutes: number): boolean {
  const start = timeToMinutes(block.startTime);
  const end = block.endTime ? timeToMinutes(block.endTime) : start + 30;
  return currentMinutes >= start && currentMinutes < end;
}

function isBlockPast(block: ScheduleBlock, currentMinutes: number): boolean {
  const end = block.endTime ? timeToMinutes(block.endTime) : timeToMinutes(block.startTime) + 30;
  return currentMinutes > end;
}

interface MiniBlockCardProps {
  block: ScheduleBlock;
  isActive: boolean;
  isPast: boolean;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  loading?: boolean;
}

function MiniBlockCard({ block, isActive, isPast, onComplete, onSkip, loading }: MiniBlockCardProps) {
  const Icon = BLOCK_ICONS[block.blockType] || Clock;
  const isCompleted = block.completed;
  const isSkipped = block.skipped;

  return (
    <div className={cn(
      "group relative flex items-center gap-3 rounded-xl border p-3 transition-all",
      isActive && !isCompleted && !isSkipped 
        ? "border-accent-primary/50 bg-accent-primary/10 shadow-[0_0_20px_rgba(45,212,191,0.15)]" 
        : isCompleted 
          ? "border-green-500/20 bg-green-500/5" 
          : isSkipped 
            ? "border-slate-500/20 bg-slate-500/5 opacity-50" 
            : isPast && !isCompleted 
              ? "border-amber-500/20 bg-amber-500/5" 
              : "border-white/5 bg-white/[0.02]"
    )}>
      {/* Time */}
      <span className={cn(
        "text-sm font-medium w-16 shrink-0",
        isActive ? "text-accent-primary" : isCompleted ? "text-green-400" : "text-white/60"
      )}>
        {formatTime(block.startTime)}
      </span>

      {/* Icon */}
      <div className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        isCompleted ? "bg-green-500/20" : isActive ? "bg-accent-primary/20" : "bg-white/5"
      )}>
        {isCompleted ? (
          <Check className="size-4 text-green-400" />
        ) : isSkipped ? (
          <SkipForward className="size-4 text-slate-400" />
        ) : (
          <Icon className={cn("size-4", isActive ? "text-accent-primary" : "text-white/60")} />
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isCompleted ? "text-green-300 line-through" : isSkipped ? "text-slate-500 line-through" : "text-white"
        )}>
          {block.title}
        </p>
        {isActive && !isCompleted && !isSkipped && (
          <span className="text-[10px] uppercase tracking-wide text-accent-primary">Now</span>
        )}
      </div>

      {/* Actions */}
      {!isCompleted && !isSkipped && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onComplete(block.id)}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-green-500/20 hover:text-green-400 transition"
            title="Complete"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          </button>
          <button
            onClick={() => onSkip(block.id)}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-500/20 hover:text-slate-300 transition"
            title="Skip"
          >
            <SkipForward className="size-3.5" />
          </button>
        </div>
      )}

      {/* Active indicator */}
      {isActive && !isCompleted && !isSkipped && (
        <div className="absolute -left-px top-2 bottom-2 w-0.5 bg-accent-primary rounded-full" />
      )}
    </div>
  );
}

interface TodayScheduleProps {
  onRegeneratePlan?: () => void;
}

export function TodaySchedule({ onRegeneratePlan }: TodayScheduleProps) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinutes(getCurrentTimeMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch schedule
  useEffect(() => {
    async function fetchSchedule() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/schedule");
        if (!res.ok) throw new Error("Failed to load schedule");
        const data = await res.json();
        setSchedule(data.data?.schedule || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  const handleComplete = async (blockId: string) => {
    setActionLoading(blockId);
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, action: "complete" }),
      });
      if (!res.ok) throw new Error("Failed to complete");
      setSchedule(prev => prev ? {
        ...prev,
        blocks: prev.blocks.map(b => 
          b.id === blockId ? { ...b, completed: true, completedAt: new Date().toISOString() } : b
        ),
      } : prev);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkip = async (blockId: string) => {
    setActionLoading(blockId);
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, action: "skip" }),
      });
      if (!res.ok) throw new Error("Failed to skip");
      setSchedule(prev => prev ? {
        ...prev,
        blocks: prev.blocks.map(b => 
          b.id === blockId ? { ...b, skipped: true } : b
        ),
      } : prev);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Get visible blocks: active + next 3 upcoming
  const visibleBlocks = useMemo(() => {
    if (!schedule) return [];
    
    const activeBlock = schedule.blocks.find(b => 
      isBlockActive(b, currentMinutes) && !b.completed && !b.skipped
    );
    
    const upcomingBlocks = schedule.blocks
      .filter(b => !isBlockPast(b, currentMinutes) && !isBlockActive(b, currentMinutes) && !b.completed && !b.skipped)
      .slice(0, activeBlock ? 2 : 3);
    
    return activeBlock ? [activeBlock, ...upcomingBlocks] : upcomingBlocks;
  }, [schedule, currentMinutes]);

  const completedCount = schedule?.blocks.filter(b => b.completed).length || 0;
  const totalCount = schedule?.blocks.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs text-accent-primary hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!schedule || visibleBlocks.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="mx-auto size-10 text-white/20 mb-3" />
        <p className="text-sm text-white/60">No upcoming tasks</p>
        <p className="text-xs text-white/40 mt-1">All done for today! 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-xs text-white/50 mb-2">
        <span>{completedCount}/{totalCount} complete</span>
        <span>{Math.round((completedCount / Math.max(totalCount, 1)) * 100)}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-white/10 mb-4">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all"
          style={{ width: `${(completedCount / Math.max(totalCount, 1)) * 100}%` }}
        />
      </div>

      {/* Blocks */}
      {visibleBlocks.map(block => (
        <MiniBlockCard
          key={block.id}
          block={block}
          isActive={isBlockActive(block, currentMinutes)}
          isPast={isBlockPast(block, currentMinutes)}
          onComplete={handleComplete}
          onSkip={handleSkip}
          loading={actionLoading === block.id}
        />
      ))}

      {/* View full schedule link */}
      <Link
        href="/plan"
        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-3 text-sm text-white/70 hover:bg-white/[0.05] hover:text-white transition mt-4"
      >
        View full schedule
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

