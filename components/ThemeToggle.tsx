"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function applyTheme(isDark: boolean) {
  const html = document.documentElement;
  html.classList.toggle("dark", isDark);
  if (typeof window !== "undefined") {
    localStorage.setItem("bioflo-theme", isDark ? "dark" : "light");
  }
}

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    const stored = localStorage.getItem("bioflo-theme");
    return stored ? stored === "dark" : true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    applyTheme(dark);
  }, [dark]);

  const toggle = () => {
    const next = !dark;
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-grid size-9 place-items-center rounded-xl border border-white/10 dark:border-white/10 border-slate-300/20 hover:bg-white/10 dark:hover:bg-white/10 hover:bg-slate-100 transition"
    >
      <span suppressHydrationWarning>
        {dark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-600" />}
      </span>
    </button>
  );
}

