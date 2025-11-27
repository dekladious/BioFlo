"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus, Trophy, Target, ChevronLeft, ChevronRight, Sparkles, Calendar, Zap, Moon, Heart, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

interface WeeklyMetric {
  name: string;
  icon: React.ElementType;
  value: string;
  change: number;
  trend: "up" | "down" | "stable";
  color: string;
}

interface Win {
  title: string;
  description: string;
}

interface Improvement {
  area: string;
  suggestion: string;
  impact: "high" | "medium" | "low";
}

interface WeekData {
  weekStart: string;
  weekEnd: string;
  overallScore: number;
  scoreChange: number;
  metrics: WeeklyMetric[];
  wins: Win[];
  improvements: Improvement[];
  aiSummary: string;
  focusAreas: string[];
}

const MOCK_WEEK_DATA: WeekData = {
  weekStart: new Date(Date.now() - 6 * 86400000).toISOString(),
  weekEnd: new Date().toISOString(),
  overallScore: 78,
  scoreChange: 5,
  metrics: [
    { name: "Sleep", icon: Moon, value: "7.2h avg", change: 8, trend: "up", color: "text-indigo-400" },
    { name: "Energy", icon: Zap, value: "7.4/10", change: 12, trend: "up", color: "text-yellow-400" },
    { name: "Stress", icon: Heart, value: "4.2/10", change: -15, trend: "down", color: "text-red-400" },
    { name: "Activity", icon: Dumbbell, value: "4 workouts", change: 0, trend: "stable", color: "text-green-400" },
  ],
  wins: [
    { title: "Sleep consistency improved", description: "You went to bed within 30 minutes of your target 5 out of 7 nights" },
    { title: "Hit protein goals", description: "Averaged 142g protein daily, up from 118g last week" },
    { title: "Meditation streak", description: "Completed 7 days of morning meditation" },
  ],
  improvements: [
    { area: "Hydration", suggestion: "You averaged 5 glasses of water daily. Aim for 8 to improve energy.", impact: "high" },
    { area: "Evening routine", suggestion: "Screen time before bed was high on 4 nights. Consider a wind-down routine.", impact: "medium" },
    { area: "Recovery", suggestion: "HRV was lower after leg days. Consider adding an extra rest day.", impact: "low" },
  ],
  aiSummary: "This was a strong week overall. Your sleep improvements are paying dividends - energy is up 12% and you're reporting better focus during work. The meditation habit is establishing well. Main opportunity: hydration is lagging and likely affecting your afternoon energy dips. Consider setting water reminders.",
  focusAreas: ["Increase water intake to 8 glasses", "Maintain sleep consistency", "Add one more protein-rich snack"],
};

function MetricCard({ metric }: { metric: WeeklyMetric }) {
  const Icon = metric.icon;
  const TrendIcon = metric.trend === "up" ? TrendingUp : metric.trend === "down" ? TrendingDown : Minus;
  
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-5", metric.color)} />
          <span className="text-sm text-white/60">{metric.name}</span>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium",
          metric.trend === "up" ? "text-green-400" : metric.trend === "down" ? "text-red-400" : "text-white/40"
        )}>
          <TrendIcon className="size-3" />
          {metric.change > 0 ? "+" : ""}{metric.change}%
        </div>
      </div>
      <p className="text-xl font-bold text-white">{metric.value}</p>
    </div>
  );
}

function WinCard({ win }: { win: Win }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
      <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
        <Trophy className="size-4 text-green-400" />
      </div>
      <div>
        <p className="font-medium text-white">{win.title}</p>
        <p className="text-sm text-white/60">{win.description}</p>
      </div>
    </div>
  );
}

function ImprovementCard({ improvement }: { improvement: Improvement }) {
  const impactColors = {
    high: "bg-red-500/20 text-red-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-white/10 text-white/60",
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/10">
      <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
        <Target className="size-4 text-white/60" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-white">{improvement.area}</p>
          <span className={cn("px-2 py-0.5 rounded-full text-xs capitalize", impactColors[improvement.impact])}>
            {improvement.impact} impact
          </span>
        </div>
        <p className="text-sm text-white/60">{improvement.suggestion}</p>
      </div>
    </div>
  );
}

export default function DebriefPage() {
  const [weekData] = useState<WeekData>(MOCK_WEEK_DATA);
  const [weekOffset, setWeekOffset] = useState(0);

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      {/* Header with Week Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Weekly Debrief</h1>
          <p className="text-sm text-white/60">Your health summary and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="size-10 rounded-xl border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/5 transition"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <Calendar className="size-4 text-white/60" />
            <span className="text-sm text-white">
              {isCurrentWeek ? "This Week" : formatDateRange(weekData.weekStart, weekData.weekEnd)}
            </span>
          </div>
          <button
            onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
            disabled={isCurrentWeek}
            className="size-10 rounded-xl border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/5 disabled:opacity-30 transition"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Overall Score */}
      <div className={cn(CARD, "flex items-center gap-8")}>
        <div className="relative size-32">
          <svg className="size-32 -rotate-90">
            <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
            <circle
              cx="64" cy="64" r="56"
              fill="none"
              stroke="url(#weekGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${weekData.overallScore * 3.52} 352`}
            />
            <defs>
              <linearGradient id="weekGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22f3c8" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{weekData.overallScore}</span>
            <span className="text-xs text-white/50">Week Score</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-semibold text-white">Overall Health Score</h2>
            <span className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium",
              weekData.scoreChange > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {weekData.scoreChange > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {weekData.scoreChange > 0 ? "+" : ""}{weekData.scoreChange} vs last week
            </span>
          </div>
          <p className="text-white/60">Based on sleep, energy, stress, and activity data</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <h2 className="font-semibold text-white mb-4">Key Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {weekData.metrics.map((metric, idx) => (
            <MetricCard key={idx} metric={metric} />
          ))}
        </div>
      </div>

      {/* AI Summary */}
      <div className={cn(CARD, "bg-gradient-to-br from-accent-primary/10 to-purple-500/10 border-accent-primary/20")}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-5 text-accent-primary" />
          <h2 className="font-semibold text-white">AI Summary</h2>
        </div>
        <p className="text-white/80 leading-relaxed">{weekData.aiSummary}</p>
      </div>

      {/* Wins & Improvements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wins */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="size-5 text-green-400" />
            <h2 className="font-semibold text-white">This Week's Wins</h2>
          </div>
          <div className="space-y-3">
            {weekData.wins.map((win, idx) => (
              <WinCard key={idx} win={win} />
            ))}
          </div>
        </div>

        {/* Areas to Improve */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-5 text-white/60" />
            <h2 className="font-semibold text-white">Areas to Improve</h2>
          </div>
          <div className="space-y-3">
            {weekData.improvements.map((imp, idx) => (
              <ImprovementCard key={idx} improvement={imp} />
            ))}
          </div>
        </div>
      </div>

      {/* Next Week Focus */}
      <div className={CARD}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="size-5 text-white/60" />
          <h2 className="font-semibold text-white">Focus for Next Week</h2>
        </div>
        <div className="space-y-2">
          {weekData.focusAreas.map((focus, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="size-6 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-accent-primary">{idx + 1}</span>
              </div>
              <p className="text-white/80">{focus}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
