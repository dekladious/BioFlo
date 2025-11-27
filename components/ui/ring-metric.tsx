"use client";

import { cn } from "@/lib/utils/cn";

type RingStatus = "good" | "ok" | "bad" | "neutral";
type RingSize = "sm" | "md" | "lg";

const sizeMap: Record<RingSize, number> = {
  sm: 70,
  md: 110,
  lg: 150,
};

const statusColorMap: Record<RingStatus, string> = {
  good: "var(--accent-primary)",
  ok: "var(--status-warning)",
  bad: "var(--status-danger)",
  neutral: "rgba(148,163,184,0.8)",
};

export type RingMetricProps = {
  value: number;
  label: string;
  caption?: string;
  status?: RingStatus;
  size?: RingSize;
  showValue?: boolean;
  className?: string;
};

export function RingMetric({
  value,
  label,
  caption,
  status = "neutral",
  size = "md",
  showValue = true,
  className,
}: RingMetricProps) {
  const diameter = sizeMap[size];
  const strokeWidth = size === "lg" ? 12 : size === "md" ? 10 : 8;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const dashOffset = circumference - (clampedValue / 100) * circumference;
  const statusColor = statusColorMap[status];

  return (
    <div className={cn("flex flex-col items-center text-center text-main", className)}>
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg width={diameter} height={diameter} className="-rotate-90 transform">
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            stroke={statusColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-semibold text-main", size === "lg" ? "text-4xl" : size === "md" ? "text-3xl" : "text-xl")}>
              {Math.round(clampedValue)}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-faint">score</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs uppercase tracking-[0.2em] text-faint">{label}</p>
        {caption && <p className="text-sm text-soft">{caption}</p>}
      </div>
    </div>
  );
}





