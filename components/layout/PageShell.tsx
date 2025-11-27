import { Children, isValidElement, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  fullBleed?: boolean;
};

export function PageShell({ children, className, fullBleed }: PageShellProps) {
  const childArray = Children.toArray(children);
  const childRequestsBleed = childArray.some(
    (child) => isValidElement(child) && child.props?.["data-shell"] === "full"
  );
  const shouldBleed =
    typeof fullBleed === "boolean" ? fullBleed : childRequestsBleed || true;

  const shellClass = shouldBleed
    ? "w-full px-4 pb-12 pt-8 sm:px-6 lg:px-10"
    : "mx-auto w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-10 xl:max-w-7xl";

  return <div className={cn(shellClass, className)}>{children}</div>;
}


