/**
 * Theme Utilities
 * 
 * Shared utilities for consistent theme-aware styling
 */

/**
 * Pane/Card container with theme support
 */
export const pane =
  "glass-panel rounded-3xl border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/[0.035] backdrop-blur-2xl shadow-glass";

export const paneMuted =
  "glass-panel-muted rounded-3xl border border-white/5 dark:border-white/5 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl shadow-glass-soft";

/**
 * Text colors with theme support
 */
export const textColors = {
  primary: "text-white dark:text-white text-slate-900",
  secondary: "text-slate-200 dark:text-slate-300 text-slate-600",
  tertiary: "text-slate-400 dark:text-slate-500",
  muted: "text-slate-500 dark:text-slate-500",
};

/**
 * Border colors with theme support
 */
export const borderColors = {
  default: "border-white/10 dark:border-white/10 border-slate-200",
  subtle: "border-white/5 dark:border-white/5 border-slate-100",
};

/**
 * Background colors with theme support
 */
export const bgColors = {
  card: "bg-white/70 dark:bg-white/[0.035]",
  cardHover: "bg-white/80 dark:bg-white/[0.06]",
  input: "bg-white dark:bg-white/5",
  overlay: "bg-white/70 dark:bg-[#05050b]/65",
};

/**
 * Utility classes
 */
export const gradientText = "gradient-text";
export const quickAction = "quick-action";
export const metricChip = "metric-chip";
export const dividerGlow = "divider-glow";

