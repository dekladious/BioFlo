"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Sparkles, ChevronDown, Target, Dumbbell, Utensils, Moon, ClipboardCheck, Brain, FlaskConical, BarChart3, Settings, Link2, BookOpen, Heart, MessageSquare, Pill } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { ProBadge } from "@/components/ProBadge";
import { cn } from "@/lib/utils/cn";

// Navigation structure with dropdowns
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plan", label: "Plan" },
  {
    label: "Track",
    items: [
      { href: "/habits", label: "Habits", icon: Target, description: "Daily habit tracking" },
      { href: "/training", label: "Training", icon: Dumbbell, description: "Workout logging" },
      { href: "/nutrition", label: "Nutrition", icon: Utensils, description: "Meal & macro tracking" },
      { href: "/supplements", label: "Supplements", icon: Pill, description: "Supplement routine" },
      { href: "/sleep", label: "Sleep", icon: Moon, description: "Sleep insights" },
      { href: "/check-ins", label: "Check-ins", icon: ClipboardCheck, description: "Daily check-ins" },
    ],
  },
  {
    label: "Analyze",
    items: [
      { href: "/insights", label: "Insights", icon: Brain, description: "Root-cause analysis" },
      { href: "/experiments", label: "Experiments", icon: FlaskConical, description: "Health experiments" },
      { href: "/debrief", label: "Weekly Debrief", icon: BarChart3, description: "Weekly summary" },
    ],
  },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  {
    label: "More",
    items: [
      { href: "/protocols", label: "Protocols", icon: BookOpen, description: "Protocol library" },
      { href: "/care-mode", label: "Care Hub", icon: Heart, description: "Caregiver features" },
      { href: "/settings/integrations", label: "Integrations", icon: Link2, description: "Connect devices" },
      { href: "/settings", label: "Settings", icon: Settings, description: "Preferences & account" },
    ],
  },
];

function NavDropdown({ label, items, pathname }: { 
  label: string; 
  items: { href: string; label: string; icon: React.ElementType; description: string }[];
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = items.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={cn(
          "flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition",
          isActive
            ? "bg-[color:var(--bg-app)] text-[color:var(--text-primary)] shadow-inner"
            : "text-[color:var(--text-soft)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
        )}
      >
        {label}
        <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-1/2 top-full z-50 pt-2 -translate-x-1/2">
          <div className="w-64 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-elevated)] p-2 shadow-[var(--shadow-card)]">
            {items.map((item) => {
              const Icon = item.icon;
              const isItemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl p-3 transition",
                    isItemActive
                      ? "bg-[color:var(--accent-primary)]/15"
                      : "hover:bg-[color:var(--bg-card-hover)]"
                  )}
                >
                  <div className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    isItemActive ? "bg-[color:var(--accent-primary)]/20" : "bg-[color:var(--bg-card)]"
                  )}>
                    <Icon className={cn("size-4", isItemActive ? "text-[color:var(--accent-primary)]" : "text-[color:var(--text-soft)]")} />
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium", isItemActive ? "text-[color:var(--accent-primary)]" : "text-[color:var(--text-primary)]")}>{item.label}</p>
                    <p className="text-xs text-[color:var(--text-soft)]">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-app)]/90 backdrop-blur-2xl">
      <div className="mx-auto flex w-full items-center gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--accent-primary)] to-[color:var(--accent-secondary)] shadow-[var(--shadow-card)]">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-[color:var(--text-primary)]">BioFlo</p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-soft)]">AI coaching</p>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-alt)] px-1 py-1 shadow-[var(--shadow-card)] md:flex">
          {NAV_ITEMS.map((item) => {
            if ('items' in item) {
              return (
                <NavDropdown 
                  key={item.label} 
                  label={item.label} 
                  items={item.items} 
                  pathname={pathname} 
                />
              );
            }
            
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition",
                  isActive
                    ? "bg-[color:var(--bg-app)] text-[color:var(--text-primary)] shadow-inner"
                    : "text-[color:var(--text-soft)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <StatusChip />
          <ThemeToggle />
          <SignedOut>
            <Link
              href="/sign-in"
              className="rounded-full border border-[color:var(--border-subtle)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-primary)] transition hover:border-[color:var(--accent-primary)] hover:text-[color:var(--accent-primary)]"
            >
              Sign in
            </Link>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] px-2 py-1">
              <UserButton afterSignOutUrl="/" />
              <ProBadge />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

function StatusChip() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] px-3 py-1 text-xs font-medium text-[color:var(--text-soft)]">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--accent-success)] opacity-40" />
        <span className="relative inline-flex size-2 rounded-full bg-[color:var(--accent-success)]" />
      </span>
      Systems nominal
    </span>
  );
}
