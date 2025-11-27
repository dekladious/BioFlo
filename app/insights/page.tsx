"use client";

import { useState } from "react";
import { Brain, Search, Sparkles, TrendingUp, TrendingDown, AlertCircle, Lightbulb, ArrowRight, Zap, Moon, Heart, Activity } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

interface Correlation {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  strength: number; // 0-100
  description: string;
}

interface Pattern {
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

interface Insight {
  id: string;
  category: "sleep" | "energy" | "stress" | "performance";
  question: string;
  answer: string;
  correlations: Correlation[];
  recommendations: string[];
}

const QUICK_QUESTIONS = [
  "Why am I tired today?",
  "What's affecting my sleep?",
  "Why is my HRV low?",
  "What helps my energy?",
  "Why am I stressed?",
  "What improves my mood?",
];

const MOCK_CORRELATIONS: Correlation[] = [
  { factor: "Late bedtime (after 11pm)", impact: "negative", strength: 85, description: "Strongly linked to lower energy next day" },
  { factor: "Morning exercise", impact: "positive", strength: 72, description: "Improves mood and focus for 6+ hours" },
  { factor: "Screen time before bed", impact: "negative", strength: 68, description: "Reduces deep sleep by ~15%" },
  { factor: "8+ hours sleep", impact: "positive", strength: 90, description: "Consistently improves all metrics" },
  { factor: "Alcohol consumption", impact: "negative", strength: 78, description: "Disrupts REM sleep significantly" },
  { factor: "Meditation practice", impact: "positive", strength: 65, description: "Reduces stress levels next day" },
];

const MOCK_PATTERNS: Pattern[] = [
  { title: "Sunday Dip", description: "Your energy tends to drop on Sundays, possibly due to late Saturday nights", confidence: 82, actionable: true },
  { title: "Caffeine Sensitivity", description: "Coffee after 2pm correlates with 23% worse sleep quality", confidence: 75, actionable: true },
  { title: "Exercise Recovery", description: "You need 2 rest days after intense workouts for optimal HRV", confidence: 68, actionable: true },
];

const CATEGORY_ICONS = {
  sleep: Moon,
  energy: Zap,
  stress: Heart,
  performance: Activity,
};

function CorrelationBar({ correlation }: { correlation: Correlation }) {
  return (
    <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-white">{correlation.factor}</span>
        <span className={cn(
          "flex items-center gap-1 text-sm font-medium",
          correlation.impact === "positive" ? "text-green-400" : 
          correlation.impact === "negative" ? "text-red-400" : "text-white/60"
        )}>
          {correlation.impact === "positive" ? <TrendingUp className="size-4" /> : 
           correlation.impact === "negative" ? <TrendingDown className="size-4" /> : null}
          {correlation.strength}% correlation
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
        <div 
          className={cn(
            "h-full rounded-full",
            correlation.impact === "positive" ? "bg-green-500" : 
            correlation.impact === "negative" ? "bg-red-500" : "bg-white/40"
          )}
          style={{ width: `${correlation.strength}%` }}
        />
      </div>
      <p className="text-sm text-white/60">{correlation.description}</p>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  return (
    <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-5 text-yellow-400" />
          <span className="font-medium text-white">{pattern.title}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
          {pattern.confidence}% confident
        </span>
      </div>
      <p className="text-sm text-white/70 mb-3">{pattern.description}</p>
      {pattern.actionable && (
        <button className="flex items-center gap-1 text-sm text-accent-primary hover:text-accent-primary/80 transition">
          Get recommendations <ArrowRight className="size-4" />
        </button>
      )}
    </div>
  );
}

function AskBioFlo({ onAsk }: { onAsk: (question: string) => void }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onAsk(query);
      setQuery("");
    }
  };

  return (
    <div className={cn(CARD, "bg-gradient-to-br from-accent-primary/10 to-purple-500/10 border-accent-primary/20")}>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="size-6 text-accent-primary" />
        <h2 className="text-lg font-semibold text-white">Ask BioFlo</h2>
      </div>
      <p className="text-white/60 mb-4">
        Ask any health question and get insights based on your data
      </p>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Why am I feeling tired today?"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-accent-primary"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-accent-primary/20 text-white font-medium hover:bg-accent-primary/30 transition"
        >
          Analyze
        </button>
      </form>
      <div className="flex flex-wrap gap-2 mt-4">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function InsightResult({ question }: { question: string }) {
  // Mock AI response based on question
  const getResponse = () => {
    if (question.toLowerCase().includes("tired") || question.toLowerCase().includes("energy")) {
      return {
        answer: "Based on your data from the past week, your fatigue today is likely due to a combination of factors: you went to bed 1.5 hours later than usual last night (12:30 AM vs your 11 PM average), and your deep sleep was only 14% compared to your 20% baseline. Additionally, you skipped your morning workout which typically boosts your energy by mid-morning.",
        correlations: MOCK_CORRELATIONS.slice(0, 4),
        recommendations: [
          "Aim for a 10:30 PM bedtime tonight to recover your sleep debt",
          "Take a 20-minute walk this afternoon to boost energy without disrupting tonight's sleep",
          "Avoid caffeine after 2 PM to improve sleep quality tonight",
        ],
      };
    }
    return {
      answer: "I've analyzed your recent health data and found several interesting patterns. Your overall trends show improvement in sleep consistency, though stress levels have been elevated this week.",
      correlations: MOCK_CORRELATIONS.slice(2, 5),
      recommendations: [
        "Consider a 10-minute meditation before bed",
        "Your HRV responds well to morning exercise - try to maintain consistency",
        "Hydration tends to improve your afternoon focus",
      ],
    };
  };

  const response = getResponse();

  return (
    <div className={CARD}>
      <div className="flex items-start gap-3 mb-6">
        <div className="size-10 rounded-xl bg-accent-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="size-5 text-accent-primary" />
        </div>
        <div>
          <p className="text-sm text-white/50 mb-1">Your question:</p>
          <p className="font-medium text-white">{question}</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 mb-6">
        <p className="text-white/80 leading-relaxed">{response.answer}</p>
      </div>

      <h3 className="font-semibold text-white mb-3">Key Factors</h3>
      <div className="space-y-3 mb-6">
        {response.correlations.map((c, idx) => (
          <CorrelationBar key={idx} correlation={c} />
        ))}
      </div>

      <h3 className="font-semibold text-white mb-3">Recommendations</h3>
      <div className="space-y-2">
        {response.recommendations.map((rec, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="size-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-medium text-green-400">{idx + 1}</span>
            </div>
            <p className="text-sm text-white/80">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Insights</h1>
        <p className="text-sm text-white/60">Understand what's affecting your health</p>
      </div>

      {/* Ask BioFlo */}
      <AskBioFlo onAsk={setActiveQuestion} />

      {/* Active Insight */}
      {activeQuestion && <InsightResult question={activeQuestion} />}

      {/* Detected Patterns */}
      {!activeQuestion && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="size-5 text-yellow-400" />
              <h2 className="font-semibold text-white">Detected Patterns</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {MOCK_PATTERNS.map((pattern, idx) => (
                <PatternCard key={idx} pattern={pattern} />
              ))}
            </div>
          </div>

          {/* Top Correlations */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="size-5 text-white/60" />
              <h2 className="font-semibold text-white">Your Top Correlations</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {MOCK_CORRELATIONS.slice(0, 4).map((c, idx) => (
                <CorrelationBar key={idx} correlation={c} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
