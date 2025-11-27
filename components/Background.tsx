"use client";

import React from "react";

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient - uses CSS variable which changes with theme */}
      <div className="absolute inset-0" style={{ background: "var(--bg-hero)" }} />

      {/* Aurora wash - visible in dark mode, subtle in light mode */}
      <div className="absolute inset-0 mix-blend-screen dark:opacity-70 opacity-30">
        <div className="absolute -left-16 top-10 h-[520px] w-[520px] animate-pulse-glow rounded-full bg-[radial-gradient(circle,rgba(93,239,251,0.35),transparent_65%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(93,239,251,0.35),transparent_65%)]" />
        <div className="absolute -right-12 top-24 h-[420px] w-[420px] animate-pulse-glow rounded-full bg-[radial-gradient(circle,rgba(177,149,255,0.4),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-180px] left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,245,192,0.18),transparent_60%)] blur-3xl" />
      </div>

      {/* Fiber texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.12)_0px,rgba(255,255,255,0.12)_1px,transparent_1px,transparent_12px)]" />

      {/* Moving light streak - dark mode only */}
      <div className="absolute -inset-[25%] opacity-0 dark:opacity-[0.08] blur-3xl bg-[conic-gradient(from_120deg_at_20%_30%,rgba(93,239,251,0.45),transparent_35%),conic-gradient(from_-40deg_at_80%_70%,rgba(177,149,255,0.45),transparent_40%)] animate-fiber-sweep" />

      {/* Vignette - different for light/dark */}
      <div className="absolute inset-0 dark:bg-[radial-gradient(120%_80%_at_50%_120%,rgba(5,5,11,0.7),transparent_65%)] bg-[radial-gradient(120%_80%_at_50%_120%,rgba(248,250,252,0.3),transparent_65%)]" />
    </div>
  );
}
