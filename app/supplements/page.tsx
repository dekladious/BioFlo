"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Pill, Check, X, Sparkles, Flame, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

interface Supplement {
  id: string;
  name: string;
  brand?: string;
  dosage: string;
  timing: string;
  frequency: string;
  purpose?: string;
  takenToday: boolean;
  streak: number;
}

interface SupplementStats {
  takenToday: number;
  totalActive: number;
  adherenceRate: number;
}

const TIMING_LABELS: Record<string, { label: string; time: string; icon: string }> = {
  morning: { label: "Morning", time: "6-8 AM", icon: "🌅" },
  afternoon: { label: "Afternoon", time: "12-2 PM", icon: "☀️" },
  evening: { label: "Evening", time: "5-7 PM", icon: "🌆" },
  with_meals: { label: "With Meals", time: "Varies", icon: "🍽️" },
  before_bed: { label: "Before Bed", time: "9-11 PM", icon: "🌙" },
  as_needed: { label: "As Needed", time: "Anytime", icon: "⏰" },
};

const COMMON_SUPPLEMENTS = [
  { name: "Vitamin D3", dosage: "5000 IU", purpose: "Immune support", timing: "morning" },
  { name: "Omega-3", dosage: "2000mg", purpose: "Brain health", timing: "with_meals" },
  { name: "Magnesium", dosage: "400mg", purpose: "Sleep & relaxation", timing: "before_bed" },
  { name: "Creatine", dosage: "5g", purpose: "Performance", timing: "morning" },
  { name: "Ashwagandha", dosage: "600mg", purpose: "Stress adaptation", timing: "evening" },
  { name: "Zinc", dosage: "30mg", purpose: "Immune function", timing: "evening" },
  { name: "B Complex", dosage: "1 cap", purpose: "Energy", timing: "morning" },
  { name: "Probiotics", dosage: "1 cap", purpose: "Gut health", timing: "morning" },
];

function SupplementCard({ supplement, onToggle, loading }: { 
  supplement: Supplement; 
  onToggle: () => void;
  loading?: boolean;
}) {
  const timing = TIMING_LABELS[supplement.timing] || TIMING_LABELS.morning;
  
  return (
    <div className={cn(
      "rounded-2xl border p-4 transition cursor-pointer",
      supplement.takenToday 
        ? "border-green-500/30 bg-green-500/5" 
        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
    )} onClick={onToggle}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            "size-10 rounded-xl flex items-center justify-center shrink-0 text-lg",
            supplement.takenToday ? "bg-green-500/20" : "bg-white/10"
          )}>
            {loading ? <Loader2 className="size-4 animate-spin text-white/60" /> :
             supplement.takenToday ? <Check className="size-5 text-green-400" /> : timing.icon}
          </div>
          <div className="min-w-0">
            <h3 className={cn(
              "font-medium truncate",
              supplement.takenToday ? "text-green-400" : "text-white"
            )}>
              {supplement.name}
            </h3>
            <p className="text-xs text-white/50">{supplement.dosage}</p>
            {supplement.purpose && (
              <p className="text-xs text-white/40 mt-1 truncate">{supplement.purpose}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {supplement.streak > 0 && (
            <span className="flex items-center gap-1 text-xs text-orange-400">
              <Flame className="size-3" />
              {supplement.streak}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AddSupplementModal({ isOpen, onClose, onAdd, loading }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (supplement: Partial<Supplement>) => void;
  loading?: boolean;
}) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timing, setTiming] = useState("morning");
  const [purpose, setPurpose] = useState("");

  if (!isOpen) return null;

  const handlePresetSelect = (preset: typeof COMMON_SUPPLEMENTS[0]) => {
    onAdd({
      name: preset.name,
      dosage: preset.dosage,
      timing: preset.timing,
      purpose: preset.purpose,
      frequency: "daily",
    });
  };

  const handleCustomAdd = () => {
    if (name.trim() && dosage.trim()) {
      onAdd({ name, dosage, timing, purpose, frequency: "daily" });
      setName("");
      setDosage("");
      setPurpose("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/20 bg-[#1a1a1f] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Add Supplement</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            <X className="size-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-white/60 mb-3">Quick add popular supplements:</p>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {COMMON_SUPPLEMENTS.map((supp) => (
              <button
                key={supp.name}
                onClick={() => handlePresetSelect(supp)}
                disabled={loading}
                className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition text-left disabled:opacity-50"
              >
                <Pill className="size-4 text-white/40 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-white/80 truncate">{supp.name}</p>
                  <p className="text-xs text-white/40">{supp.dosage}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm text-white/60 mb-3">Or add custom:</p>
          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Supplement name..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="Dosage (e.g., 500mg)"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
              />
              <select
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:border-accent-primary"
              >
                {Object.entries(TIMING_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Purpose (optional)"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
            />
          </div>
          <button
            onClick={handleCustomAdd}
            disabled={!name.trim() || !dosage.trim() || loading}
            className="w-full py-3 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Add Supplement
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [stats, setStats] = useState<SupplementStats>({ takenToday: 0, totalActive: 0, adherenceRate: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Fetch supplements from API
  const fetchSupplements = useCallback(async () => {
    try {
      const res = await fetch("/api/supplements");
      if (!res.ok) throw new Error("Failed to fetch supplements");
      const data = await res.json();
      setSupplements(data.supplements || []);
      setStats(data.stats || { takenToday: 0, totalActive: 0, adherenceRate: 0 });
    } catch (err) {
      console.error("Failed to fetch supplements:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupplements();
  }, [fetchSupplements]);

  const toggleSupplement = async (id: string) => {
    setTogglingId(id);
    
    // Optimistic update
    setSupplements(prev => prev.map(s => 
      s.id === id ? { ...s, takenToday: !s.takenToday } : s
    ));

    try {
      const res = await fetch("/api/supplements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplementId: id, action: "toggle" }),
      });
      
      if (!res.ok) throw new Error("Failed to toggle supplement");
      await fetchSupplements();
    } catch (err) {
      console.error("Failed to toggle supplement:", err);
      await fetchSupplements();
    } finally {
      setTogglingId(null);
    }
  };

  const addSupplement = async (supplement: Partial<Supplement>) => {
    setAdding(true);
    
    try {
      const res = await fetch("/api/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplement),
      });

      if (!res.ok) throw new Error("Failed to add supplement");
      
      setShowAddModal(false);
      await fetchSupplements();
    } catch (err) {
      console.error("Failed to add supplement:", err);
    } finally {
      setAdding(false);
    }
  };

  // Group by timing
  const byTiming = supplements.reduce((acc, supp) => {
    const key = supp.timing || "morning";
    if (!acc[key]) acc[key] = [];
    acc[key].push(supp);
    return acc;
  }, {} as Record<string, Supplement[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-accent-primary mx-auto mb-3" />
          <p className="text-white/60">Loading supplements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Supplements</h1>
          <p className="text-sm text-white/60">Track your daily supplement routine</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-primary/20 px-4 py-2.5 font-medium text-white hover:bg-accent-primary/30 transition"
        >
          <Plus className="size-5" />
          Add Supplement
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
                  stroke="url(#suppGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${stats.adherenceRate * 2.51} 251`}
                />
                <defs>
                  <linearGradient id="suppGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22f3c8" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{stats.adherenceRate}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-white">Today's Adherence</p>
              <p className="text-white/60">{stats.takenToday} of {stats.totalActive} supplements taken</p>
              {stats.adherenceRate === 100 && stats.totalActive > 0 && (
                <p className="text-sm text-green-400 mt-1">✨ All supplements taken!</p>
              )}
            </div>
          </div>

          {/* Supplements by Timing */}
          {Object.keys(byTiming).length === 0 ? (
            <div className={cn(CARD, "text-center py-12")}>
              <Pill className="size-12 mx-auto text-white/20 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No supplements yet</h3>
              <p className="text-white/60 mb-4">Add supplements to start tracking your routine</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2.5 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition"
              >
                Add Your First Supplement
              </button>
            </div>
          ) : (
            Object.entries(byTiming).map(([timing, timingSupplements]) => {
              const timingInfo = TIMING_LABELS[timing] || TIMING_LABELS.morning;
              const taken = timingSupplements.filter(s => s.takenToday).length;
              
              return (
                <div key={timing}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{timingInfo.icon}</span>
                    <h2 className="font-semibold text-white">{timingInfo.label}</h2>
                    <span className="text-sm text-white/40">{taken}/{timingSupplements.length}</span>
                    <span className="text-xs text-white/30 ml-auto">{timingInfo.time}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {timingSupplements.map(supplement => (
                      <SupplementCard
                        key={supplement.id}
                        supplement={supplement}
                        onToggle={() => toggleSupplement(supplement.id)}
                        loading={togglingId === supplement.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
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
              {supplements.length > 0 ? (
                <>
                  <p>• {stats.adherenceRate}% adherence rate today.</p>
                  {supplements.filter(s => s.streak >= 7).length > 0 && (
                    <p>• Great consistency with your routine! 💪</p>
                  )}
                  <p>• Taking supplements at consistent times improves absorption.</p>
                </>
              ) : (
                <p>• Add supplements to get personalized insights and reminders.</p>
              )}
            </div>
            <Link
              href={`/chat?message=${encodeURIComponent("Review my supplement stack and suggest improvements")}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-accent-primary/30 px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/10 transition"
            >
              Get supplement advice
            </Link>
          </div>

          {/* Top Streaks */}
          {supplements.filter(s => s.streak > 0).length > 0 && (
            <div className={CARD}>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="size-5 text-orange-400" />
                <h3 className="font-semibold text-white">Consistency Streaks</h3>
              </div>
              <div className="space-y-2">
                {supplements
                  .filter(s => s.streak > 0)
                  .sort((a, b) => b.streak - a.streak)
                  .slice(0, 5)
                  .map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-white/80 truncate">{s.name}</span>
                      <span className="flex items-center gap-1 text-sm text-orange-400">
                        <Flame className="size-3" />
                        {s.streak} days
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddSupplementModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addSupplement}
        loading={adding}
      />
    </div>
  );
}
