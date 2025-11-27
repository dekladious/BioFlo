"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "inline-grid size-9 place-items-center rounded-xl border transition",
        "border-[color:var(--border-subtle)] hover:bg-[color:var(--bg-card-hover)]",
        className
      )}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-4 text-amber-400" />
      ) : (
        <Moon className="size-4 text-[color:var(--text-soft)]" />
      )}
    </button>
  );
}
