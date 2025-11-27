"use client";

import { useState } from "react";
import { Moon, Sun, Clock, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Sparkles, Bed, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

interface SleepData {
  date: string;
  score: number;
  duration: number; // hours
  bedTime: string;
  wakeTime: string;
  deep: number; // percentage
  rem: number;
  light: number;
  awake: number;
  hrv: number;
  restingHr: number;
}

const MOCK_SLEEP_DATA: SleepData[] = [
  { date: new Date().toISOString(), score: 82, duration: 7.5, bedTime: "22:30", wakeTime: "06:00", deep: 18, rem: 22, light: 52, awake: 8, hrv: 45, restingHr: 58 },
  { date: new Date(Date.now() - 86400000).toISOString(), score: 75, duration: 6.8, bedTime: "23:15", wakeTime: "06:00", deep: 15, rem: 20, light: 55, awake: 10, hrv: 42, restingHr: 60 },
  { date: new Date(Date.now() - 86400000 * 2).toISOString(), score: 88, duration: 8.0, bedTime: "22:00", wakeTime: "06:00", deep: 22, rem: 24, light: 48, awake: 6, hrv: 52, restingHr: 55 },
  { date: new Date(Date.now() - 86400000 * 3).toISOString(), score: 70, duration: 6.2, bedTime: "00:30", wakeTime: "06:45", deep: 12, rem: 18, light: 58, awake: 12, hrv: 38, restingHr: 62 },
  { date: new Date(Date.now() - 86400000 * 4).toISOString(), score: 85, duration: 7.8, bedTime: "22:15", wakeTime: "06:00", deep: 20, rem: 23, light: 50, awake: 7, hrv: 48, restingHr: 56 },
  { date: new Date(Date.now() - 86400000 * 5).toISOString(), score: 78, duration: 7.0, bedTime: "23:00", wakeTime: "06:00", deep: 16, rem: 21, light: 54, awake: 9, hrv: 44, restingHr: 59 },
  { date: new Date(Date.now() - 86400000 * 6).toISOString(), score: 90, duration: 8.2, bedTime: "21:45", wakeTime: "06:00", deep: 24, rem: 25, light: 45, awake: 6, hrv: 55, restingHr: 54 },
];

function SleepScoreRing({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 85) return "text-green-400";
    if (s >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreGradient = (s: number) => {
    if (s >= 85) return "#22c55e";
    if (s >= 70) return "#eab308";
    return "#ef4444";
  };

  return (
    <div className="relative size-32">
      <svg className="size-32 -rotate-90">
        <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle
          cx="64" cy="64" r="56"
          fill="none"
          stroke={getScoreGradient(score)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${score * 3.52} 352`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold", getScoreColor(score))}>{score}</span>
        <span className="text-xs text-white/50">Sleep Score</span>
      </div>
    </div>
  );
}

function SleepStagesBar({ deep, rem, light, awake }: { deep: number; rem: number; light: number; awake: number }) {
  return (
    <div>
      <div className="flex h-6 rounded-full overflow-hidden">
        <div className="bg-indigo-600" style={{ width: `${deep}%` }} title={`Deep: ${deep}%`} />
        <div className="bg-purple-500" style={{ width: `${rem}%` }} title={`REM: ${rem}%`} />
        <div className="bg-blue-400" style={{ width: `${light}%` }} title={`Light: ${light}%`} />
        <div className="bg-white/20" style={{ width: `${awake}%` }} title={`Awake: ${awake}%`} />
      </div>
      <div className="flex items-center justify-between mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-indigo-600" />
          <span className="text-white/60">Deep {deep}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-purple-500" />
          <span className="text-white/60">REM {rem}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-blue-400" />
          <span className="text-white/60">Light {light}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-white/20" />
          <span className="text-white/60">Awake {awake}%</span>
        </div>
      </div>
    </div>
  );
}

function WeeklyTrend({ data }: { data: SleepData[] }) {
  const avgScore = Math.round(data.reduce((acc, d) => acc + d.score, 0) / data.length);
  const avgDuration = (data.reduce((acc, d) => acc + d.duration, 0) / data.length).toFixed(1);
  
  const prevWeekAvg = 78; // Mock previous week
  const trend = avgScore - prevWeekAvg;

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">7-Day Trend</h3>
        <div className={cn(
          "flex items-center gap-1 text-sm",
          trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-white/60"
        )}>
          {trend > 0 ? <TrendingUp className="size-4" /> : trend < 0 ? <TrendingDown className="size-4" /> : <Minus className="size-4" />}
          {trend > 0 ? "+" : ""}{trend} vs last week
        </div>
      </div>
      
      <div className="flex items-end justify-between gap-2 h-24 mb-4">
        {data.slice().reverse().map((day, idx) => {
          const height = (day.score / 100) * 100;
          const isToday = idx === data.length - 1;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-full rounded-t transition-all",
                  day.score >= 85 ? "bg-green-500" : day.score >= 70 ? "bg-yellow-500" : "bg-red-500",
                  isToday && "ring-2 ring-white/30"
                )}
                style={{ height: `${height}%` }}
              />
              <span className={cn("text-[10px]", isToday ? "text-white font-medium" : "text-white/40")}>
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
        <div>
          <p className="text-xs text-white/50">Avg Score</p>
          <p className="text-lg font-semibold text-white">{avgScore}</p>
        </div>
        <div>
          <p className="text-xs text-white/50">Avg Duration</p>
          <p className="text-lg font-semibold text-white">{avgDuration}h</p>
        </div>
      </div>
    </div>
  );
}

export default function SleepPage() {
  const [sleepData] = useState<SleepData[]>(MOCK_SLEEP_DATA);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  
  const selectedDay = sleepData[selectedDayIndex];
  const isToday = selectedDayIndex === 0;

  const navigateDay = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedDayIndex < sleepData.length - 1) {
      setSelectedDayIndex(prev => prev + 1);
    } else if (direction === 'next' && selectedDayIndex > 0) {
      setSelectedDayIndex(prev => prev - 1);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday) return "Last Night";
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sleep</h1>
          <p className="text-sm text-white/60">Track and optimize your rest</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDay('prev')}
            disabled={selectedDayIndex >= sleepData.length - 1}
            className="size-10 rounded-xl border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/5 disabled:opacity-30 transition"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="text-sm text-white/80 min-w-[140px] text-center">{formatDate(selectedDay.date)}</span>
          <button
            onClick={() => navigateDay('next')}
            disabled={selectedDayIndex <= 0}
            className="size-10 rounded-xl border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/5 disabled:opacity-30 transition"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Sleep Card */}
      <div className={cn(CARD, "flex flex-col md:flex-row items-center gap-8")}>
        <SleepScoreRing score={selectedDay.score} />
        
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Bed className="size-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">Duration</p>
                <p className="text-lg font-semibold text-white">{selectedDay.duration}h</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Moon className="size-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">Bedtime</p>
                <p className="text-lg font-semibold text-white">{selectedDay.bedTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Sun className="size-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">Wake Time</p>
                <p className="text-lg font-semibold text-white">{selectedDay.wakeTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Zap className="size-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">HRV</p>
                <p className="text-lg font-semibold text-white">{selectedDay.hrv} ms</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sleep Stages */}
      <div className={CARD}>
        <h3 className="font-semibold text-white mb-4">Sleep Stages</h3>
        <SleepStagesBar
          deep={selectedDay.deep}
          rem={selectedDay.rem}
          light={selectedDay.light}
          awake={selectedDay.awake}
        />
      </div>

      {/* Weekly Trend */}
      <WeeklyTrend data={sleepData} />

      {/* AI Insights */}
      <div className={cn(CARD, "bg-gradient-to-br from-accent-primary/10 to-purple-500/10 border-accent-primary/20")}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-5 text-accent-primary" />
          <h3 className="font-semibold text-white">AI Insights</h3>
        </div>
        <div className="space-y-3">
          {selectedDay.score >= 85 ? (
            <p className="text-white/80">
              Great sleep last night! Your deep sleep was optimal at {selectedDay.deep}%, which supports muscle recovery and memory consolidation. Keep up your current bedtime routine.
            </p>
          ) : selectedDay.score >= 70 ? (
            <p className="text-white/80">
              Decent sleep, but there's room for improvement. Your REM sleep was slightly below optimal. Consider limiting screen time 1 hour before bed to improve sleep quality.
            </p>
          ) : (
            <p className="text-white/80">
              Your sleep quality was below optimal. Late bedtime and reduced deep sleep may affect your energy today. Try to get to bed by 22:30 tonight for better recovery.
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white/70">
              {selectedDay.bedTime > "23:00" ? "Late bedtime" : "Good bedtime"}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white/70">
              {selectedDay.deep >= 20 ? "Good deep sleep" : "Low deep sleep"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
