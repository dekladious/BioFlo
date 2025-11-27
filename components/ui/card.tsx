import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type CardVariant = "default" | "hero" | "compact" | "ghost";
type StatusAccent = "primary" | "success" | "warning" | "danger" | "none";

const statusAccentMap: Record<Exclude<StatusAccent, "none">, string> = {
  primary: "border-[var(--accent-primary)]/60",
  success: "border-[var(--status-success)]/60",
  warning: "border-[var(--status-warning)]/60",
  danger: "border-[var(--status-danger)]/70",
};

const heroBackground =
  "bg-[radial-gradient(circle_at_20%_-20%,rgba(34,230,184,0.35),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(91,94,255,0.25),transparent_60%),var(--bg-elevated-soft)]";

function getVariantClasses(variant: CardVariant) {
  switch (variant) {
    case "hero":
      return `${heroBackground} border border-[var(--border-subtle)] shadow-card rounded-card`;
    case "compact":
      return "bg-[var(--bg-elevated-soft)] border border-[var(--border-subtle)] rounded-[1.5rem]";
    case "ghost":
      return "bg-[var(--bg-elevated-ghost)] border border-transparent rounded-[1.5rem]";
    default:
      return "bg-[var(--bg-elevated-soft)] border border-[var(--border-subtle)] rounded-card";
  }
}

export type CardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: CardVariant;
  statusAccent?: StatusAccent;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Card({
  title,
  subtitle,
  icon,
  actions,
  children,
  variant = "default",
  statusAccent = "none",
  className,
  footer,
}: CardProps) {
  const basePadding =
    variant === "hero" ? "px-5 py-6 sm:px-6 sm:py-7" : variant === "compact" ? "px-4 py-4" : "px-5 py-5";

  return (
    <div
      className={cn(
        "group transition-all duration-200",
        getVariantClasses(variant),
        basePadding,
        statusAccent !== "none" ? statusAccentMap[statusAccent] : "",
        variant !== "ghost" ? "shadow-card hover:shadow-card-hover hover:-translate-y-[1px]" : "",
        className
      )}
    >
      {(title || subtitle || icon || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            {typeof title === "string" ? (
              <h3 className={cn("text-sm font-medium text-main", variant === "hero" && "text-base md:text-lg font-semibold")}>
                {title}
              </h3>
            ) : (
              title
            )}
            {typeof subtitle === "string" ? <p className="text-xs text-soft">{subtitle}</p> : subtitle}
          </div>
          <div className="flex items-center gap-2">
            {icon && <div className="text-soft">{icon}</div>}
            {actions}
          </div>
        </div>
      )}

      <div>{children}</div>
      {footer && <div className="mt-4 border-t border-[var(--border-dim)] pt-4 text-sm text-muted">{footer}</div>}
    </div>
  );
}





