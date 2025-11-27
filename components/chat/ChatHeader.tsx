"use client";

import { Sparkles } from "lucide-react";

type ChatHeaderProps = {
  subscriptionStatus?: "active" | "inactive" | "none";
  mode?: string;
};

export default function ChatHeader({ subscriptionStatus = "inactive", mode = "NORMAL" }: ChatHeaderProps) {
  const modeColors: Record<string, string> = {
    NORMAL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    TRAVEL: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    RECOVERY: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    DEEP_WORK: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };

  return (
    <div className="border-b border-slate-200 dark:border-white/10 pb-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 p-2">
            <Sparkles className="size-5 text-black" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">BioFlo Coach</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">AI health, sleep & performance coach</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {subscriptionStatus === "active" && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${modeColors[mode] || modeColors.NORMAL}`}>
            {mode}
          </span>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        ⚠️ BioFlo is not a doctor and can’t help in emergencies. If you’re in crisis or have severe symptoms, contact emergency services or a doctor.
      </div>
    </div>
  );
}

