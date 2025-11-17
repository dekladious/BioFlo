"use client";

import Link from "next/link";
import { BookOpen, Target } from "lucide-react";

type ProtocolAndPlanProps = {
  protocol?: {
    name: string;
    day: number;
    totalDays: number;
  } | null;
  todayPlanFocus?: string;
};

export default function ProtocolAndPlan({ protocol, todayPlanFocus }: ProtocolAndPlanProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.045] backdrop-blur shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today's focus</h3>

      {/* Protocol */}
      {protocol && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-purple-400" />
            <span className="text-xs font-medium text-slate-900 dark:text-white">{protocol.name}</span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 ml-6">
            Day {protocol.day} of {protocol.totalDays}
          </div>
        </div>
      )}

      {/* Today Plan Focus */}
      {todayPlanFocus && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-sky-400" />
            <span className="text-xs font-medium text-slate-900 dark:text-white">Today's Plan</span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 ml-6 leading-relaxed">
            {todayPlanFocus}
          </div>
        </div>
      )}

      {!protocol && !todayPlanFocus && (
        <p className="text-xs text-slate-600 dark:text-slate-400">No active focus set.</p>
      )}

      <Link
        href="/dashboard"
        className="block text-xs text-sky-400 hover:text-sky-300 transition mt-2"
      >
        View full plan →
      </Link>
    </div>
  );
}

