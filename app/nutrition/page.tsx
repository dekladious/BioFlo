"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Apple, Droplets, Coffee, Utensils, X, Sparkles, Loader2, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

interface Meal {
  id: string;
  type: string;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

interface NutritionData {
  meals: Meal[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    waterMl: number;
  };
  water: {
    totalMl: number;
    glasses: number;
    targetMl: number;
  };
}

const MEAL_TYPES = [
  { type: "breakfast", label: "Breakfast", icon: "🍳", time: "7-9 AM" },
  { type: "lunch", label: "Lunch", icon: "🥗", time: "12-2 PM" },
  { type: "dinner", label: "Dinner", icon: "🍽️", time: "6-8 PM" },
  { type: "snack", label: "Snack", icon: "🍎", time: "Anytime" },
];

function MacroRing({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const percentage = Math.min(100, Math.round((value / target) * 100));
  
  return (
    <div className="text-center">
      <div className="relative size-20 mx-auto mb-2">
        <svg className="size-20 -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.01} 201`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{value}g</span>
        </div>
      </div>
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-xs text-white/40">{target}g goal</p>
    </div>
  );
}

function MealCard({ meal, onDelete }: { meal: Meal; onDelete?: () => void }) {
  const mealInfo = MEAL_TYPES.find(m => m.type === meal.type) || MEAL_TYPES[3];
  
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-lg">
            {mealInfo.icon}
          </div>
          <div>
            <h4 className="font-medium text-white">{meal.name}</h4>
            <p className="text-xs text-white/50">{meal.time} • {mealInfo.label}</p>
          </div>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="text-white/30 hover:text-white/60 transition">
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs">
        <span className="text-white">{meal.calories} cal</span>
        <span className="text-blue-400">P: {meal.protein}g</span>
        <span className="text-yellow-400">C: {meal.carbs}g</span>
        <span className="text-red-400">F: {meal.fat}g</span>
      </div>
    </div>
  );
}

function AddMealModal({ isOpen, onClose, onAdd, loading }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (meal: Partial<Meal>) => void;
  loading?: boolean;
}) {
  const [mealType, setMealType] = useState("breakfast");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    onAdd({
      type: mealType,
      name,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
    });
    
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-[#1a1a1f] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Log Meal</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            <X className="size-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Meal Type */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Meal Type</label>
            <div className="flex gap-2">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type.type}
                  onClick={() => setMealType(type.type)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm transition",
                    mealType === type.type
                      ? "bg-accent-primary/20 text-white border border-accent-primary/30"
                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  )}
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meal Name */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">What did you eat?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Grilled chicken salad"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
            />
          </div>

          {/* Macros */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Calories</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="400"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div>
              <label className="text-xs text-blue-400/80 mb-1 block">Protein</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="30"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div>
              <label className="text-xs text-yellow-400/80 mb-1 block">Carbs</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="40"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div>
              <label className="text-xs text-red-400/80 mb-1 block">Fat</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="15"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            className="w-full py-3 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Log Meal
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const [data, setData] = useState<NutritionData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch nutrition data from API
  const fetchNutrition = useCallback(async () => {
    try {
      const res = await fetch("/api/nutrition");
      if (!res.ok) throw new Error("Failed to fetch nutrition");
      const nutritionData = await res.json();
      setData(nutritionData);
    } catch (err) {
      console.error("Failed to fetch nutrition:", err);
      // Set defaults
      setData({
        meals: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        targets: { calories: 2200, protein: 150, carbs: 250, fat: 70, waterMl: 2000 },
        water: { totalMl: 0, glasses: 0, targetMl: 2000 },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNutrition();
  }, [fetchNutrition]);

  const addMeal = async (meal: Partial<Meal>) => {
    setSaving(true);
    
    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "meal",
          mealType: meal.type,
          name: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
        }),
      });

      if (!res.ok) throw new Error("Failed to add meal");
      
      setShowAddModal(false);
      await fetchNutrition();
    } catch (err) {
      console.error("Failed to add meal:", err);
    } finally {
      setSaving(false);
    }
  };

  const addWater = async () => {
    if (!data) return;
    
    try {
      await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "water", amountMl: 250 }),
      });
      await fetchNutrition();
    } catch (err) {
      console.error("Failed to add water:", err);
    }
  };

  const setWaterGlasses = async (glasses: number) => {
    try {
      await fetch("/api/nutrition", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_water", glasses }),
      });
      await fetchNutrition();
    } catch (err) {
      console.error("Failed to set water:", err);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-accent-primary mx-auto mb-3" />
          <p className="text-white/60">Loading nutrition...</p>
        </div>
      </div>
    );
  }

  const caloriePercentage = Math.round((data.totals.calories / data.targets.calories) * 100);

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Nutrition</h1>
          <p className="text-sm text-white/60">Track your meals and macros</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-primary/20 px-4 py-2.5 font-medium text-white hover:bg-accent-primary/30 transition"
        >
          <Plus className="size-5" />
          Log Meal
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calories Overview */}
          <div className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Today's Calories</h3>
              <span className="text-sm text-white/60">{data.totals.calories} / {data.targets.calories}</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-4">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  caloriePercentage > 100 
                    ? "bg-red-500" 
                    : caloriePercentage > 80 
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                      : "bg-gradient-to-r from-accent-primary to-green-400"
                )}
                style={{ width: `${Math.min(100, caloriePercentage)}%` }}
              />
            </div>
            
            {/* Macros */}
            <div className="grid grid-cols-3 gap-4">
              <MacroRing label="Protein" value={data.totals.protein} target={data.targets.protein} color="#60a5fa" />
              <MacroRing label="Carbs" value={data.totals.carbs} target={data.targets.carbs} color="#facc15" />
              <MacroRing label="Fat" value={data.totals.fat} target={data.targets.fat} color="#f87171" />
            </div>
          </div>

          {/* Today's Meals */}
          <div>
            <h2 className="font-semibold text-white mb-4">Today's Meals</h2>
            {data.meals.length > 0 ? (
              <div className="space-y-3">
                {data.meals.map(meal => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
            ) : (
              <div className={cn(CARD, "text-center py-12")}>
                <Utensils className="size-12 mx-auto text-white/20 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No meals logged yet</h3>
                <p className="text-white/60 mb-4">Start tracking your nutrition</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition"
                >
                  Log Your First Meal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Water Intake */}
          <div className={CARD}>
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="size-5 text-blue-400" />
              <h3 className="font-semibold text-white">Water Intake</h3>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                onClick={() => data.water.glasses > 0 && setWaterGlasses(data.water.glasses - 1)}
                className="size-10 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition"
              >
                <Minus className="size-4" />
              </button>
              <div className="text-center px-4">
                <span className="text-4xl font-bold text-white">{data.water.glasses}</span>
                <span className="text-lg text-white/40"> / 8</span>
                <p className="text-xs text-white/50 mt-1">{data.water.totalMl}ml of {data.water.targetMl}ml</p>
              </div>
              <button
                onClick={addWater}
                className="size-10 rounded-full border border-blue-500/30 bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {[...Array(8)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setWaterGlasses(i + 1)}
                  className={cn(
                    "aspect-square rounded-lg transition",
                    i < data.water.glasses ? "bg-blue-500/30" : "bg-white/5"
                  )}
                />
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className={cn(CARD, "bg-gradient-to-br from-accent-primary/10 to-purple-500/10 border-accent-primary/20")}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-5 text-accent-primary" />
              <h3 className="font-semibold text-white">AI Insights</h3>
            </div>
            <div className="space-y-3 text-sm text-white/80">
              {data.meals.length > 0 ? (
                <>
                  <p>• {data.totals.calories} calories consumed so far.</p>
                  {data.totals.protein < data.targets.protein * 0.5 && (
                    <p>• Consider adding more protein to your next meal.</p>
                  )}
                  {data.water.glasses < 4 && (
                    <p>• Don't forget to stay hydrated! 💧</p>
                  )}
                </>
              ) : (
                <p>• Log meals to get personalized nutrition insights.</p>
              )}
            </div>
            <Link
              href={`/chat?message=${encodeURIComponent("Analyze my nutrition and suggest improvements")}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-accent-primary/30 px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/10 transition"
            >
              Get nutrition advice
            </Link>
          </div>
        </div>
      </div>

      <AddMealModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addMeal}
        loading={saving}
      />
    </div>
  );
}
