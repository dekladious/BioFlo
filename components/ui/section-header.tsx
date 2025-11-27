import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4", className)}>
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.3em] text-text-soft">{eyebrow}</p>
        )}
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
        {description && <p className="max-w-2xl text-sm text-text-soft">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}




