"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Check, Flame, Calendar, X, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  frequency: string;
  targetCount: number;
  isActive: boolean;
  completedToday: boolean;
  streak: number;
  weekProgress?: boolean[];
}

interface HabitStats {
  completedToday: number;
  totalActive: number;
  completionRate: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  health: "from-green-500 to-emerald-500",
  fitness: "from-orange-500 to-red-500",
  nutrition: "from-yellow-500 to-amber-500",
  mindfulness: "from-purple-500 to-indigo-500",
  sleep: "from-blue-500 to-cyan-500",
  productivity: "from-pink-500 to-rose-500",
  other: "from-gray-500 to-slate-500",
};

const HABIT_PRESETS = [
  { name: "Morning meditation", icon: "🧘", color: "bg-purple-500/20 text-purple-400", category: "mindfulness" },
  { name: "Drink 8 glasses of water", icon: "💧", color: "bg-blue-500/20 text-blue-400", category: "health" },
  { name: "Exercise 30 minutes", icon: "🏃", color: "bg-green-500/20 text-green-400", category: "fitness" },
  { name: "Read for 20 minutes", icon: "📚", color: "bg-amber-500/20 text-amber-400", category: "productivity" },
  { name: "No phone before bed", icon: "📵", color: "bg-red-500/20 text-red-400", category: "sleep" },
  { name: "Take supplements", icon: "💊", color: "bg-teal-500/20 text-teal-400", category: "health" },
  { name: "Journal", icon: "✍️", color: "bg-indigo-500/20 text-indigo-400", category: "mindfulness" },
  { name: "Cold shower", icon: "🚿", color: "bg-cyan-500/20 text-cyan-400", category: "health" },
];

function HabitCard({ habit, onToggle, loading }: { habit: Habit; onToggle: () => void; loading?: boolean }) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border p-4 transition-all cursor-pointer",
        habit.completedToday
          ? "border-green-500/30 bg-green-500/5"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "size-12 rounded-xl flex items-center justify-center text-xl transition",
          habit.completedToday ? "bg-green-500/20" : habit.color || "bg-white/10"
        )}>
          {loading ? <Loader2 className="size-5 animate-spin text-white/60" /> : 
           habit.completedToday ? <Check className="size-6 text-green-400" /> : habit.icon || "✨"}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium truncate transition",
            habit.completedToday ? "text-green-400 line-through" : "text-white"
          )}>
            {habit.name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {habit.streak > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-400">
                <Flame className="size-3" />
                {habit.streak} day streak
              </span>
            )}
            <span className="text-xs text-white/40 capitalize">{habit.frequency}</span>
          </div>
        </div>
        <div className={cn(
          "size-8 rounded-full border-2 flex items-center justify-center transition",
          habit.completedToday
            ? "border-green-500 bg-green-500"
            : "border-white/20 group-hover:border-white/40"
        )}>
          {habit.completedToday && <Check className="size-4 text-white" />}
        </div>
      </div>
    </div>
  );
}

function AddHabitModal({ isOpen, onClose, onAdd, loading }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (habit: Partial<Habit>) => void;
  loading?: boolean;
}) {
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState("✨");
  const [category, setCategory] = useState("health");

  if (!isOpen) return null;

  const handlePresetSelect = (preset: typeof HABIT_PRESETS[0]) => {
    onAdd({
      name: preset.name,
      icon: preset.icon,
      color: preset.color,
      category: preset.category,
      frequency: "daily",
    });
  };

  const handleCustomAdd = () => {
    if (customName.trim()) {
      onAdd({
        name: customName,
        icon: customIcon,
        color: "bg-accent-primary/20 text-accent-primary",
        category,
        frequency: "daily",
      });
      setCustomName("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/20 bg-[#1a1a1f] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Add New Habit</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            <X className="size-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-white/60 mb-3">Quick add from suggestions:</p>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {HABIT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                disabled={loading}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition text-left disabled:opacity-50"
              >
                <span className="text-lg">{preset.icon}</span>
                <span className="text-sm text-white/80 truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm text-white/60 mb-3">Or create a custom habit:</p>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={customIcon}
              onChange={(e) => setCustomIcon(e.target.value)}
              className="w-16 text-center rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xl focus:outline-none focus:border-accent-primary"
              maxLength={2}
            />
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Habit name..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
            />
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-white/60 mb-2">Category:</p>
            <div className="flex flex-wrap gap-2">
              {["health", "fitness", "nutrition", "mindfulness", "sleep", "productivity"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium capitalize transition",
                    category === cat
                      ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCustomAdd}
            disabled={!customName.trim() || loading}
            className="w-full py-3 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Add Habit
          </button>
        </div>
      </div>
    </div>
  );
}

function WeekView({ habits }: { habits: Habit[] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  // Calculate completion rate for each day based on weekProgress
  const dayCompletionRates = days.map((_, dayIdx) => {
    const habitsWithProgress = habits.filter(h => h.weekProgress && h.weekProgress.length > dayIdx);
    if (habitsWithProgress.length === 0) return 0;
    const completed = habitsWithProgress.filter(h => h.weekProgress![dayIdx]).length;
    return completed / habitsWithProgress.length;
  });

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="size-5 text-white/60" />
          <h3 className="font-semibold text-white">This Week</h3>
        </div>
        <span className="text-sm text-white/50">{habits.filter(h => h.completedToday).length}/{habits.length} today</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const isToday = idx === todayIndex;
          const completionRate = dayCompletionRates[idx];
          
          return (
            <div key={day} className="text-center">
              <p className={cn(
                "text-xs mb-2",
                isToday ? "text-accent-primary font-medium" : "text-white/40"
              )}>
                {day}
              </p>
              <div className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-sm font-medium",
                isToday && "ring-2 ring-accent-primary/50",
                completionRate >= 0.8 ? "bg-green-500/20 text-green-400" :
                completionRate >= 0.5 ? "bg-yellow-500/20 text-yellow-400" :
                completionRate > 0 ? "bg-red-500/20 text-red-400" :
                "bg-white/5 text-white/30"
              )}>
                {completionRate > 0 ? `${Math.round(completionRate * 100)}%` : '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StreakLeaderboard({ habits }: { habits: Habit[] }) {
  const sortedHabits = [...habits].filter(h => h.streak > 0).sort((a, b) => b.streak - a.streak);

  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 mb-4">
        <Flame className="size-5 text-orange-400" />
        <h3 className="font-semibold text-white">Top Streaks</h3>
      </div>
      <div className="space-y-3">
        {sortedHabits.slice(0, 5).map((habit, idx) => (
          <div key={habit.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className={cn(
                "size-6 rounded-full flex items-center justify-center text-xs font-bold",
                idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                idx === 1 ? "bg-gray-400/20 text-gray-400" :
                idx === 2 ? "bg-orange-700/20 text-orange-600" :
                "bg-white/10 text-white/50"
              )}>
                {idx + 1}
              </span>
              <span className="text-lg">{habit.icon || "✨"}</span>
              <span className="text-white/80 text-sm truncate max-w-[120px]">{habit.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-orange-400" />
              <span className="font-semibold text-orange-400">{habit.streak}</span>
              <span className="text-xs text-white/40">days</span>
            </div>
          </div>
        ))}
        {sortedHabits.length === 0 && (
          <p className="text-center text-white/40 py-4">Complete habits to start building streaks!</p>
        )}
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState<HabitStats>({ completedToday: 0, totalActive: 0, completionRate: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [addingHabit, setAddingHabit] = useState(false);

  // Fetch habits from API
  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/habits");
      if (!res.ok) throw new Error("Failed to fetch habits");
      const data = await res.json();
      setHabits(data.habits || []);
      setStats(data.stats || { completedToday: 0, totalActive: 0, completionRate: 0 });
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const toggleHabit = async (id: string) => {
    setTogglingId(id);
    
    // Optimistic update
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const newCompleted = !h.completedToday;
        return {
          ...h,
          completedToday: newCompleted,
          streak: newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1),
        };
      }
      return h;
    }));

    try {
      const res = await fetch("/api/habits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: id, action: "toggle" }),
      });
      
      if (!res.ok) throw new Error("Failed to toggle habit");
      
      // Refetch to get accurate streak data
      await fetchHabits();
    } catch (err) {
      console.error("Failed to toggle habit:", err);
      // Revert on error
      await fetchHabits();
    } finally {
      setTogglingId(null);
    }
  };

  const addHabit = async (habit: Partial<Habit>) => {
    setAddingHabit(true);
    
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: habit.name,
          description: habit.description,
          category: habit.category,
          frequency: habit.frequency,
          icon: habit.icon,
          color: habit.color,
        }),
      });

      if (!res.ok) throw new Error("Failed to add habit");
      
      setShowAddModal(false);
      await fetchHabits();
    } catch (err) {
      console.error("Failed to add habit:", err);
    } finally {
      setAddingHabit(false);
    }
  };

  // Group habits by category
  const habitsByCategory = habits.reduce((acc, habit) => {
    const cat = habit.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(habit);
    return acc;
  }, {} as Record<string, Habit[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-accent-primary mx-auto mb-3" />
          <p className="text-white/60">Loading habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Habits</h1>
          <p className="text-sm text-white/60">Build consistency, one day at a time</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-primary/20 px-4 py-2.5 font-medium text-white hover:bg-accent-primary/30 transition"
        >
          <Plus className="size-5" />
          Add Habit
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Progress */}
          <div className={cn(CARD, "flex items-center gap-6")}>
            <div className="relative size-24 shrink-0">
              <svg className="size-24 -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle
                  cx="48" cy="48" r="40"
                  fill="none"
                  stroke="url(#habitGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${stats.completionRate * 2.51} 251`}
                />
                <defs>
                  <linearGradient id="habitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22f3c8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{stats.completionRate}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-white">Today's Progress</p>
              <p className="text-white/60">{stats.completedToday} of {stats.totalActive} habits completed</p>
              {stats.completionRate === 100 && stats.totalActive > 0 && (
                <div className="flex items-center gap-2 mt-2 text-green-400">
                  <Sparkles className="size-4" />
                  <span className="text-sm font-medium">Perfect day! 🎉</span>
                </div>
              )}
            </div>
          </div>

          {/* Habits by Category */}
          {Object.keys(habitsByCategory).length === 0 ? (
            <div className={cn(CARD, "text-center py-12")}>
              <p className="text-white/60 mb-4">No habits yet. Start building your routine!</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-accent-primary/20 px-4 py-2 font-medium text-white hover:bg-accent-primary/30 transition"
              >
                <Plus className="size-4" />
                Add your first habit
              </button>
            </div>
          ) : (
            Object.entries(habitsByCategory).map(([category, categoryHabits]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("size-3 rounded-full bg-gradient-to-r", CATEGORY_COLORS[category] || CATEGORY_COLORS.other)} />
                  <h2 className="font-semibold text-white capitalize">{category}</h2>
                  <span className="text-sm text-white/40">
                    {categoryHabits.filter(h => h.completedToday).length}/{categoryHabits.length}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {categoryHabits.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      onToggle={() => toggleHabit(habit.id)}
                      loading={togglingId === habit.id}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WeekView habits={habits} />
          <StreakLeaderboard habits={habits} />

          {/* AI Insights */}
          <div className={cn(CARD, "bg-gradient-to-br from-accent-primary/10 to-purple-500/10 border-accent-primary/20")}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="size-5 text-accent-primary" />
              <h3 className="font-semibold text-white">AI Insights</h3>
            </div>
            <div className="space-y-3 text-sm text-white/80">
              {habits.length > 0 ? (
                <>
                  {habits.filter(h => h.streak > 5).length > 0 && (
                    <p>• Great consistency! Keep your streaks going strong.</p>
                  )}
                  {habits.filter(h => !h.completedToday).length > 0 && (
                    <p>• {habits.filter(h => !h.completedToday).length} habits remaining today.</p>
                  )}
                  <p>• Consistent habits compound over time for lasting change.</p>
                </>
              ) : (
                <p>• Add habits to start tracking your progress and get personalized insights.</p>
              )}
            </div>
            <Link
              href={`/chat?message=${encodeURIComponent("Help me improve my habit consistency")}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-accent-primary/30 px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/10 transition"
            >
              Get personalized advice
            </Link>
          </div>
        </div>
      </div>

      <AddHabitModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addHabit}
        loading={addingHabit}
      />
    </div>
  );
}
