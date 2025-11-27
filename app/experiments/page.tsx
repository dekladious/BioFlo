"use client";

import { useState } from "react";
import { Plus, FlaskConical, Calendar, TrendingUp, TrendingDown, Minus, Check, X, Clock, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

type ExperimentStatus = "active" | "completed" | "paused" | "scheduled";
type ExperimentVerdict = "positive" | "negative" | "inconclusive" | null;

interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  variable: string;
  metric: string;
  status: ExperimentStatus;
  startDate: string;
  endDate: string;
  durationDays: number;
  currentDay: number;
  baselineValue: number;
  currentValue: number;
  verdict: ExperimentVerdict;
  notes?: string;
}

const EXPERIMENT_TEMPLATES = [
  { name: "No caffeine after 2pm", variable: "Caffeine timing", metric: "Sleep quality", duration: 14 },
  { name: "Morning cold shower", variable: "Cold exposure", metric: "Energy levels", duration: 21 },
  { name: "10min daily meditation", variable: "Meditation", metric: "Stress levels", duration: 14 },
  { name: "No screens 1hr before bed", variable: "Screen time", metric: "Sleep onset", duration: 14 },
  { name: "8000+ steps daily", variable: "Daily movement", metric: "Overall mood", duration: 21 },
  { name: "Protein with breakfast", variable: "Nutrition timing", metric: "Morning energy", duration: 14 },
];

const MOCK_EXPERIMENTS: Experiment[] = [
  {
    id: "1",
    name: "No caffeine after 2pm",
    hypothesis: "Cutting caffeine after 2pm will improve my sleep quality",
    variable: "Caffeine timing",
    metric: "Sleep score",
    status: "active",
    startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    durationDays: 14,
    currentDay: 7,
    baselineValue: 72,
    currentValue: 78,
    verdict: null,
  },
  {
    id: "2",
    name: "Morning cold shower",
    hypothesis: "Cold showers will increase my morning energy",
    variable: "Cold exposure",
    metric: "Energy rating",
    status: "completed",
    startDate: new Date(Date.now() - 28 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    durationDays: 21,
    currentDay: 21,
    baselineValue: 6.2,
    currentValue: 7.8,
    verdict: "positive",
    notes: "Energy improved by 26%. Will continue practice.",
  },
  {
    id: "3",
    name: "10min daily meditation",
    hypothesis: "Regular meditation will reduce my stress levels",
    variable: "Meditation",
    metric: "Stress rating",
    status: "completed",
    startDate: new Date(Date.now() - 35 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 21 * 86400000).toISOString(),
    durationDays: 14,
    currentDay: 14,
    baselineValue: 6.8,
    currentValue: 6.5,
    verdict: "inconclusive",
    notes: "Small improvement but not statistically significant.",
  },
];

const STATUS_STYLES: Record<ExperimentStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/20", text: "text-green-400", label: "Active" },
  completed: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Completed" },
  paused: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Paused" },
  scheduled: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Scheduled" },
};

const VERDICT_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  positive: { bg: "bg-green-500/20", text: "text-green-400", icon: TrendingUp },
  negative: { bg: "bg-red-500/20", text: "text-red-400", icon: TrendingDown },
  inconclusive: { bg: "bg-white/10", text: "text-white/60", icon: Minus },
};

function ExperimentCard({ experiment, onClick }: { experiment: Experiment; onClick: () => void }) {
  const status = STATUS_STYLES[experiment.status];
  const change = experiment.currentValue - experiment.baselineValue;
  const changePercent = ((change / experiment.baselineValue) * 100).toFixed(1);
  const isPositive = change > 0;

  return (
    <div
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <FlaskConical className="size-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">{experiment.name}</h3>
            <p className="text-xs text-white/50">Tracking: {experiment.metric}</p>
          </div>
        </div>
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", status.bg, status.text)}>
          {status.label}
        </span>
      </div>

      {experiment.status === "active" && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Day {experiment.currentDay} of {experiment.durationDays}</span>
            <span>{Math.round((experiment.currentDay / experiment.durationDays) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-primary to-purple-500"
              style={{ width: `${(experiment.currentDay / experiment.durationDays) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="text-sm">
          <span className="text-white/50">Baseline: </span>
          <span className="text-white">{experiment.baselineValue}</span>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium",
          isPositive ? "text-green-400" : change < 0 ? "text-red-400" : "text-white/60"
        )}>
          {isPositive ? <TrendingUp className="size-4" /> : change < 0 ? <TrendingDown className="size-4" /> : <Minus className="size-4" />}
          {isPositive ? "+" : ""}{changePercent}%
        </div>
      </div>

      {experiment.verdict && (
        <div className={cn(
          "mt-3 px-3 py-2 rounded-lg flex items-center gap-2",
          VERDICT_STYLES[experiment.verdict].bg
        )}>
          {(() => {
            const VerdictIcon = VERDICT_STYLES[experiment.verdict].icon;
            return <VerdictIcon className={cn("size-4", VERDICT_STYLES[experiment.verdict].text)} />;
          })()}
          <span className={cn("text-sm font-medium capitalize", VERDICT_STYLES[experiment.verdict].text)}>
            {experiment.verdict}
          </span>
        </div>
      )}
    </div>
  );
}

function CreateExperimentModal({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (name: string, duration: number) => void }) {
  const [customName, setCustomName] = useState("");
  const [duration, setDuration] = useState(14);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-[#1a1a1f] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Start New Experiment</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            <X className="size-6" />
          </button>
        </div>

        <p className="text-sm text-white/60 mb-4">Choose a template or create your own:</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {EXPERIMENT_TEMPLATES.map((template) => (
            <button
              key={template.name}
              onClick={() => { onCreate(template.name, template.duration); onClose(); }}
              className="p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition text-left"
            >
              <p className="text-sm font-medium text-white mb-1">{template.name}</p>
              <p className="text-xs text-white/50">{template.duration} days • {template.metric}</p>
            </button>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm text-white/60 mb-3">Or create custom:</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Experiment name..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary mb-3"
          />
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-white/60">Duration:</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:outline-none"
            >
              <option value={7} className="bg-[#1a1a1f]">7 days</option>
              <option value={14} className="bg-[#1a1a1f]">14 days</option>
              <option value={21} className="bg-[#1a1a1f]">21 days</option>
              <option value={30} className="bg-[#1a1a1f]">30 days</option>
            </select>
          </div>
          <button
            onClick={() => { if (customName) { onCreate(customName, duration); onClose(); } }}
            disabled={!customName}
            className="w-full py-3 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Experiment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>(MOCK_EXPERIMENTS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<"all" | ExperimentStatus>("all");

  const activeExperiments = experiments.filter(e => e.status === "active");
  const completedExperiments = experiments.filter(e => e.status === "completed");
  const positiveResults = completedExperiments.filter(e => e.verdict === "positive").length;

  const filteredExperiments = filter === "all" 
    ? experiments 
    : experiments.filter(e => e.status === filter);

  const createExperiment = (name: string, duration: number) => {
    const newExp: Experiment = {
      id: Date.now().toString(),
      name,
      hypothesis: `Testing if ${name.toLowerCase()} improves my health`,
      variable: name,
      metric: "Overall score",
      status: "active",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + duration * 86400000).toISOString(),
      durationDays: duration,
      currentDay: 1,
      baselineValue: 70,
      currentValue: 70,
      verdict: null,
    };
    setExperiments(prev => [newExp, ...prev]);
  };

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Experiments</h1>
          <p className="text-sm text-white/60">Test what works for your body</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-primary/20 px-4 py-2.5 font-medium text-white hover:bg-accent-primary/30 transition"
        >
          <Plus className="size-5" />
          New Experiment
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className={CARD}>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <FlaskConical className="size-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeExperiments.length}</p>
              <p className="text-xs text-white/50">Active experiments</p>
            </div>
          </div>
        </div>
        <div className={CARD}>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Check className="size-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completedExperiments.length}</p>
              <p className="text-xs text-white/50">Completed</p>
            </div>
          </div>
        </div>
        <div className={CARD}>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="size-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{positiveResults}</p>
              <p className="text-xs text-white/50">Positive results</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggestion */}
      <div className={cn(CARD, "bg-gradient-to-br from-accent-primary/10 to-purple-500/10 border-accent-primary/20")}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-5 text-accent-primary" />
          <span className="font-semibold text-white">AI Suggestion</span>
        </div>
        <p className="text-white/80 mb-3">
          Based on your sleep data, you might benefit from testing <strong>"No screens 1 hour before bed"</strong>. 
          Your current average screen time ends 23 minutes before sleep.
        </p>
        <button className="flex items-center gap-2 text-accent-primary hover:text-accent-primary/80 transition">
          Start this experiment <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "completed", label: "Completed" }].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as typeof filter)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition",
              filter === f.value
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Experiments List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredExperiments.map((exp) => (
          <ExperimentCard key={exp.id} experiment={exp} onClick={() => {}} />
        ))}
      </div>

      {filteredExperiments.length === 0 && (
        <div className={cn(CARD, "text-center py-12")}>
          <FlaskConical className="size-12 mx-auto text-white/20 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No experiments yet</h3>
          <p className="text-white/60 mb-4">Start testing what works for your health</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition"
          >
            Start Your First Experiment
          </button>
        </div>
      )}

      <CreateExperimentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createExperiment}
      />
    </div>
  );
}
