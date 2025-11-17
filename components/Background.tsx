"use client";

import React from "react";

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base */}
      <div className="absolute inset-0 bg-white dark:bg-[#0b1117]" />

      {/* Fiber texture (ultra subtle diagonal) - only visible in dark mode */}
      <div
        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.06] opacity-0
                      bg-[repeating-linear-gradient(115deg,rgba(0,0,0,0.1)_0px,rgba(0,0,0,0.1)_1px,transparent_1px,transparent_12px)]
                      dark:bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.7)_0px,rgba(255,255,255,0.7)_1px,transparent_1px,transparent_12px)]"
      />

      {/* Dual soft hotspots (cyan/emerald) */}
      <div
        className="absolute inset-0
        bg-[radial-gradient(70%_60%_at_30%_20%,rgba(56,189,248,0.05),transparent_55%),
            radial-gradient(70%_60%_at_80%_80%,rgba(16,185,129,0.05),transparent_55%)]
        dark:bg-[radial-gradient(70%_60%_at_30%_20%,rgba(56,189,248,0.10),transparent_55%),
            radial-gradient(70%_60%_at_80%_80%,rgba(16,185,129,0.10),transparent_55%)]"
      />

      {/* Top light falloff - only in dark mode */}
      <div className="absolute inset-0 dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_35%)]" />

      {/* Bottom vignette - only in dark mode */}
      <div className="absolute inset-0 dark:bg-[radial-gradient(120%_80%_at_50%_120%,rgba(0,0,0,0.55),transparent_60%)]" />

      {/* Optional: moving light streak (very subtle) */}
      <div
        className="absolute -inset-[20%] opacity-[0.06] dark:opacity-[0.12] blur-3xl
           bg-[conic-gradient(from_140deg_at_20%_40%,rgba(96,165,250,0.3),transparent_35%),conic-gradient(from_-20deg_at_80%_70%,rgba(52,211,153,0.3),transparent_40%)]
           dark:bg-[conic-gradient(from_140deg_at_20%_40%,#60a5fa,transparent_35%),conic-gradient(from_-20deg_at_80%_70%,#34d399,transparent_40%)]
           animate-fiber-sweep"
      />
    </div>
  );
}

