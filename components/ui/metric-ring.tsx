import { useId } from "react";
import { cn } from "@/lib/utils/cn";

type MetricRingProps = {
  label: string;
  value: number; // 0 - 100
  subtitle?: string;
  variant?: "readiness" | "sleep" | "stress" | "recovery";
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  size?: "lg" | "md";
  className?: string;
};

const VARIANT_COLORS: Record<
  NonNullable<MetricRingProps["variant"]>,
  { start: string; end: string }
> = {
  readiness: { start: "#22d3ee", end: "#4ade80" },
  sleep: { start: "#38bdf8", end: "#a855f7" },
  stress: { start: "#facc15", end: "#fb7185" },
  recovery: { start: "#4ade80", end: "#22d3ee" },
};

export function MetricRing({
  label,
  value,
  subtitle,
  variant = "readiness",
  trend,
  trendLabel,
  size = "lg",
  className,
}: MetricRingProps) {
  const gradientId = useId();
  const dimension = size === "lg" ? 220 : 160;
  const strokeWidth = size === "lg" ? 14 : 10;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;
  const colors = VARIANT_COLORS[variant];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center rounded-3xl border border-border-subtle bg-surface-alt p-4 text-center shadow-card",
        className
      )}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className="pointer-events-none select-none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <p className="text-4xl font-semibold text-text-primary">
          {Math.round(clampedValue)}
          <span className="text-base text-text-soft">%</span>
        </p>
        {subtitle && <p className="text-sm text-text-soft">{subtitle}</p>}
        <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
        {trend && trendLabel && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              trend === "up"
                ? "text-accent-success bg-accent-success/10"
                : trend === "down"
                ? "text-accent-danger bg-accent-danger/10"
                : "text-text-soft bg-white/5"
            )}
          >
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}




