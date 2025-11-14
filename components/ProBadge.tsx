"use client";

import { useUser } from "@clerk/nextjs";

export function ProBadge() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) return null;
  
  const isPro = Boolean((user?.publicMetadata as Record<string, unknown> | undefined)?.isPro);

  if (!isPro) return null;

  return (
    <span className="ml-1.5 rounded-full border border-amber-500/30 bg-amber-600/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
      Pro
    </span>
  );
}

