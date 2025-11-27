"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Dumbbell, Clock, Flame, ChevronRight, X, Play, Check, Trophy, TrendingUp, Target, Sparkles, Timer, Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
}

interface Workout {
  id: string;
  name: string;
  type: string;
  duration?: number;
  calories?: number;
  heartRateAvg?: number;
  heartRateMax?: number;
  completed: boolean;
  date: string;
  exercises: Exercise[];
}

interface WorkoutStats {
  weeklyWorkouts: number;
  weeklyMinutes: number;
  weeklyCalories: number;
}

const EXERCISE_LIBRARY = [
  { name: "Bench Press", muscleGroup: "Chest" },
  { name: "Squat", muscleGroup: "Legs" },
  { name: "Deadlift", muscleGroup: "Back" },
  { name: "Overhead Press", muscleGroup: "Shoulders" },
  { name: "Barbell Row", muscleGroup: "Back" },
  { name: "Pull-ups", muscleGroup: "Back" },
  { name: "Dips", muscleGroup: "Chest" },
  { name: "Lunges", muscleGroup: "Legs" },
  { name: "Bicep Curls", muscleGroup: "Arms" },
  { name: "Tricep Extensions", muscleGroup: "Arms" },
];

const WORKOUT_TEMPLATES = [
  { name: "Push Day", type: "strength", exercises: ["Bench Press", "Overhead Press", "Dips", "Tricep Extensions"] },
  { name: "Pull Day", type: "strength", exercises: ["Deadlift", "Barbell Row", "Pull-ups", "Bicep Curls"] },
  { name: "Leg Day", type: "strength", exercises: ["Squat", "Lunges"] },
  { name: "Full Body", type: "strength", exercises: ["Squat", "Bench Press", "Barbell Row"] },
  { name: "Cardio Session", type: "cardio", exercises: [] },
  { name: "HIIT Workout", type: "hiit", exercises: [] },
];

function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-white">{workout.name}</h3>
          <p className="text-xs text-white/50">
            {new Date(workout.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        {workout.completed && (
          <div className="size-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="size-4 text-green-400" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-white/60">
        {workout.duration && (
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {workout.duration}m
          </span>
        )}
        {workout.exercises.length > 0 && (
          <span className="flex items-center gap-1">
            <Dumbbell className="size-3" />
            {workout.exercises.length} exercises
          </span>
        )}
        {workout.calories && (
          <span className="flex items-center gap-1">
            <Flame className="size-3" />
            {workout.calories} cal
          </span>
        )}
      </div>
    </div>
  );
}

function LogWorkoutModal({ isOpen, onClose, onLog, loading }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onLog: (workout: Partial<Workout>) => void;
  loading?: boolean;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("strength");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleTemplateSelect = (template: typeof WORKOUT_TEMPLATES[0]) => {
    setName(template.name);
    setType(template.type);
    setSelectedExercises(template.exercises);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    onLog({
      name,
      type,
      duration: duration ? parseInt(duration) : undefined,
      calories: calories ? parseInt(calories) : undefined,
      exercises: selectedExercises.map((ex, idx) => ({
        id: String(idx),
        name: ex,
        muscleGroup: EXERCISE_LIBRARY.find(e => e.name === ex)?.muscleGroup,
      })),
    });
  };

  const toggleExercise = (exerciseName: string) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseName) 
        ? prev.filter(e => e !== exerciseName)
        : [...prev, exerciseName]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/20 bg-[#1a1a1f] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Log Workout</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            <X className="size-6" />
          </button>
        </div>

        {/* Quick Templates */}
        <div className="mb-6">
          <p className="text-sm text-white/60 mb-3">Quick select template:</p>
          <div className="flex flex-wrap gap-2">
            {WORKOUT_TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => handleTemplateSelect(template)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition",
                  name === template.name
                    ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                )}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* Workout Details */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-white/60 mb-2 block">Workout Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Push Day"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">Calories</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="300"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">Type</label>
            <div className="flex gap-2">
              {["strength", "cardio", "hiit", "yoga"].map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm capitalize transition",
                    type === t
                      ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Exercises */}
        {type === "strength" && (
          <div className="mb-6">
            <label className="text-sm text-white/60 mb-2 block">Exercises (optional)</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {EXERCISE_LIBRARY.map((exercise) => (
                <button
                  key={exercise.name}
                  onClick={() => toggleExercise(exercise.name)}
                  className={cn(
                    "p-2 rounded-lg text-sm text-left transition",
                    selectedExercises.includes(exercise.name)
                      ? "bg-accent-primary/20 text-white border border-accent-primary/30"
                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  )}
                >
                  {exercise.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || loading}
          className="w-full py-3 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Log Workout
        </button>
      </div>
    </div>
  );
}

export default function TrainingPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<WorkoutStats>({ weeklyWorkouts: 0, weeklyMinutes: 0, weeklyCalories: 0 });
  const [showLogModal, setShowLogModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch workouts from API
  const fetchWorkouts = useCallback(async () => {
    try {
      const res = await fetch("/api/workouts?days=30");
      if (!res.ok) throw new Error("Failed to fetch workouts");
      const data = await res.json();
      setWorkouts(data.workouts || []);
      setStats(data.stats || { weeklyWorkouts: 0, weeklyMinutes: 0, weeklyCalories: 0 });
    } catch (err) {
      console.error("Failed to fetch workouts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const logWorkout = async (workout: Partial<Workout>) => {
    setSaving(true);
    
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workout.name,
          type: workout.type,
          duration: workout.duration,
          calories: workout.calories,
          exercises: workout.exercises?.map(e => ({ name: e.name, muscleGroup: e.muscleGroup })),
        }),
      });

      if (!res.ok) throw new Error("Failed to log workout");
      
      setShowLogModal(false);
      await fetchWorkouts();
    } catch (err) {
      console.error("Failed to log workout:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-accent-primary mx-auto mb-3" />
          <p className="text-white/60">Loading workouts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Training</h1>
          <p className="text-sm text-white/60">Track your workouts and progress</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-primary/20 px-4 py-2.5 font-medium text-white hover:bg-accent-primary/30 transition"
        >
          <Plus className="size-5" />
          Log Workout
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className={CARD}>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Dumbbell className="size-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.weeklyWorkouts}</p>
                  <p className="text-xs text-white/50">Workouts this week</p>
                </div>
              </div>
            </div>
            <div className={CARD}>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Timer className="size-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.weeklyMinutes}</p>
                  <p className="text-xs text-white/50">Minutes this week</p>
                </div>
              </div>
            </div>
            <div className={CARD}>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Flame className="size-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.weeklyCalories.toLocaleString()}</p>
                  <p className="text-xs text-white/50">Calories burned</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Workouts */}
          <div>
            <h2 className="font-semibold text-white mb-4">Recent Workouts</h2>
            {workouts.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {workouts.filter(w => w.completed).slice(0, 6).map(workout => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
            ) : (
              <div className={cn(CARD, "text-center py-12")}>
                <Dumbbell className="size-12 mx-auto text-white/20 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No workouts yet</h3>
                <p className="text-white/60 mb-4">Start logging your workouts to track progress</p>
                <button
                  onClick={() => setShowLogModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition"
                >
                  Log Your First Workout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Insights */}
          <div className={cn(CARD, "bg-gradient-to-br from-accent-primary/10 to-purple-500/10 border-accent-primary/20")}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-5 text-accent-primary" />
              <h3 className="font-semibold text-white">AI Insights</h3>
            </div>
            <div className="space-y-3 text-sm text-white/80">
              {workouts.length > 0 ? (
                <>
                  <p>• {stats.weeklyWorkouts} workouts logged this week.</p>
                  {stats.weeklyMinutes > 150 && <p>• Great job exceeding 150 min of exercise! 💪</p>}
                  <p>• Consistency is key - keep logging your sessions.</p>
                </>
              ) : (
                <p>• Log workouts to get personalized training insights.</p>
              )}
            </div>
            <Link
              href={`/chat?message=${encodeURIComponent("Analyze my training and suggest improvements")}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-accent-primary/30 px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/10 transition"
            >
              Get workout advice
            </Link>
          </div>

          {/* Quick Log */}
          <div className={CARD}>
            <div className="flex items-center gap-2 mb-4">
              <Play className="size-5 text-white/60" />
              <h3 className="font-semibold text-white">Quick Log</h3>
            </div>
            <div className="space-y-2">
              {WORKOUT_TEMPLATES.slice(0, 4).map((template) => (
                <button
                  key={template.name}
                  onClick={() => {
                    logWorkout({
                      name: template.name,
                      type: template.type,
                      duration: 45,
                      calories: 300,
                      exercises: template.exercises.map((ex, idx) => ({
                        id: String(idx),
                        name: ex,
                        muscleGroup: EXERCISE_LIBRARY.find(e => e.name === ex)?.muscleGroup,
                      })),
                    });
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition text-left"
                >
                  <span className="text-sm text-white/80">{template.name}</span>
                  <ChevronRight className="size-4 text-white/40" />
                </button>
              ))}
            </div>
          </div>

          {/* Weekly Goal */}
          <div className={CARD}>
            <div className="flex items-center gap-2 mb-4">
              <Target className="size-5 text-green-400" />
              <h3 className="font-semibold text-white">Weekly Goal</h3>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/60">Progress</span>
                <span className="text-white">{stats.weeklyWorkouts}/4 workouts</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                  style={{ width: `${Math.min(100, (stats.weeklyWorkouts / 4) * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-white/50">
              {stats.weeklyWorkouts >= 4 
                ? "🎉 Goal achieved! Great work!" 
                : `${4 - stats.weeklyWorkouts} more to reach your goal`}
            </p>
          </div>
        </div>
      </div>

      <LogWorkoutModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onLog={logWorkout}
        loading={saving}
      />
    </div>
  );
}
