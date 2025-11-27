import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type MiniStatCardProps = {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  status?: "good" | "ok" | "bad" | "neutral";
  className?: string;
};

const STATUS_BORDER: Record<NonNullable<MiniStatCardProps["status"]>, string> = {
  good: "border-accent-success/50",
  ok: "border-accent-warning/50",
  bad: "border-accent-danger/50",
  neutral: "border-border-subtle",
};

const STATUS_TEXT: Record<NonNullable<MiniStatCardProps["status"]>, string> = {
  good: "text-accent-success",
  ok: "text-accent-warning",
  bad: "text-accent-danger",
  neutral: "text-text-soft",
};

export function MiniStatCard({
  label,
  value,
  unit,
  delta,
  status = "neutral",
  className,
}: MiniStatCardProps) {
  const deltaIcon =
    delta && delta.startsWith("-") ? (
      <ArrowDownRight className="size-4" />
    ) : (
      <ArrowUpRight className="size-4" />
    );

  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface-alt px-4 py-3 shadow-card",
        STATUS_BORDER[status],
        className
      )}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-soft">
        <span>{label}</span>
        {delta && (
          <span className={cn("inline-flex items-center gap-1", STATUS_TEXT[status])}>
            {deltaIcon}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <p className="text-2xl font-semibold text-text-primary">{value}</p>
        {unit && <span className="text-sm text-text-soft">{unit}</span>}
      </div>
    </div>
  );
}




