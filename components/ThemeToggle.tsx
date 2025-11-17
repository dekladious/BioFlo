"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    
    // Get theme from localStorage or default to dark
    const stored = localStorage.getItem("bioflo-theme");
    const isDark = stored ? stored === "dark" : true;
    
    // Apply theme immediately
    const html = document.documentElement;
    if (isDark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    
    setDark(isDark);
  }, []);

  function toggle() {
    if (typeof window === "undefined") return;
    
    const next = !dark;
    setDark(next);
    
    const html = document.documentElement;
    if (next) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    
    localStorage.setItem("bioflo-theme", next ? "dark" : "light");
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="inline-grid size-9 place-items-center rounded-xl border border-white/10 hover:bg-white/10 transition"
      >
        <Sun className="size-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-grid size-9 place-items-center rounded-xl border border-white/10 dark:border-white/10 border-slate-300/20 hover:bg-white/10 dark:hover:bg-white/10 hover:bg-slate-100 transition"
    >
      {dark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-600" />}
    </button>
  );
}

