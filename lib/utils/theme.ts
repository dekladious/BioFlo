/**
 * Theme Utilities
 * 
 * Shared utilities for consistent theme-aware styling
 */

/**
 * Pane/Card container with theme support
 */
export const pane = "rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.045] backdrop-blur shadow-sm";

/**
 * Text colors with theme support
 */
export const textColors = {
  primary: "text-slate-900 dark:text-white",
  secondary: "text-slate-600 dark:text-slate-400",
  tertiary: "text-slate-500 dark:text-slate-500",
  muted: "text-slate-400 dark:text-slate-500",
};

/**
 * Border colors with theme support
 */
export const borderColors = {
  default: "border-slate-200 dark:border-white/10",
  subtle: "border-slate-100 dark:border-white/5",
};

/**
 * Background colors with theme support
 */
export const bgColors = {
  card: "bg-white dark:bg-white/[0.045]",
  cardHover: "bg-slate-50 dark:bg-white/[0.06]",
  input: "bg-white dark:bg-white/5",
  overlay: "bg-white/65 dark:bg-[#0b1117]/65",
};

