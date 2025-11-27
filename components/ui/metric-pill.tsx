"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type MetricPillStatus = "good" | "ok" | "bad" | "neutral";

const statusStyles: Record<MetricPillStatus, string> = {
  good: "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40",
  ok: "bg-[rgba(251,191,36,0.12)] text-[var(--status-warning)] border border-[var(--status-warning)]/40",
  bad: "bg-[rgba(251,113,133,0.12)] text-[var(--status-danger)] border border-[var(--status-danger)]/35",
  neutral: "bg-[rgba(148,163,184,0.12)] text-[var(--text-soft)] border border-[var(--border-subtle)]",
};

export type MetricPillProps = {
  label?: string;
  value: string | number;
  deltaLabel?: string;
  status?: MetricPillStatus;
  icon?: ReactNode;
  onClick?: () => void;
  interactive?: boolean;
  className?: string;
};

export function MetricPill({
  label,
  value,
  deltaLabel,
  status = "neutral",
  icon,
  onClick,
  interactive,
  className,
}: MetricPillProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs md:text-[13px] transition focus:outline-none",
        statusStyles[status],
        interactive ? "hover:shadow-card focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/60" : "",
        className
      )}
    >
      {icon && <span className="text-sm">{icon}</span>}
      <div className="flex flex-col text-left leading-snug">
        {label && <span className="text-[10px] uppercase tracking-wide text-faint">{label}</span>}
        <span className="font-semibold text-main">{value}</span>
      </div>
      {deltaLabel && <span className="text-[11px] text-faint">{deltaLabel}</span>}
    </Component>
  );
}





