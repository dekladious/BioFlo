"use client";

import React from "react";

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base */}
      <div className="absolute inset-0 bg-[#0b1117]" />

      {/* Fiber texture (ultra subtle diagonal) */}
      <div
        className="absolute inset-0 opacity-[0.06]
                      bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.7)_0px,rgba(255,255,255,0.7)_1px,transparent_1px,transparent_12px)]"
      />

      {/* Dual soft hotspots (cyan/emerald) */}
      <div
        className="absolute inset-0
        bg-[radial-gradient(70%_60%_at_30%_20%,rgba(56,189,248,0.10),transparent_55%),
            radial-gradient(70%_60%_at_80%_80%,rgba(16,185,129,0.10),transparent_55%)]"
      />

      {/* Top light falloff */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_35%)]" />

      {/* Bottom vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,rgba(0,0,0,0.55),transparent_60%)]" />

      {/* Optional: moving light streak (very subtle) */}
      <div
        className="absolute -inset-[20%] opacity-[0.12] blur-3xl
           bg-[conic-gradient(from_140deg_at_20%_40%,#60a5fa,transparent_35%),conic-gradient(from_-20deg_at_80%_70%,#34d399,transparent_40%)]
           animate-fiber-sweep"
      />
    </div>
  );
}

