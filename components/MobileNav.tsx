"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Home,
  MessageSquare,
  Calendar,
  Target,
  Dumbbell,
  Utensils,
  Moon,
  ClipboardCheck,
  Brain,
  FlaskConical,
  BarChart3,
  BookOpen,
  Heart,
  Link2,
  ChevronDown,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface NavItem {
  href?: string;
  label: string;
  icon: React.ElementType;
  items?: { href: string; label: string; icon: React.ElementType }[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/plan", label: "Plan", icon: Calendar },
  {
    label: "Track",
    icon: Target,
    items: [
      { href: "/habits", label: "Habits", icon: Target },
      { href: "/training", label: "Training", icon: Dumbbell },
      { href: "/nutrition", label: "Nutrition", icon: Utensils },
      { href: "/sleep", label: "Sleep", icon: Moon },
      { href: "/check-ins", label: "Check-ins", icon: ClipboardCheck },
    ],
  },
  {
    label: "Analyze",
    icon: Brain,
    items: [
      { href: "/insights", label: "Insights", icon: Brain },
      { href: "/experiments", label: "Experiments", icon: FlaskConical },
      { href: "/debrief", label: "Weekly Debrief", icon: BarChart3 },
    ],
  },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  {
    label: "More",
    icon: Settings,
    items: [
      { href: "/protocols", label: "Protocols", icon: BookOpen },
      { href: "/care-mode", label: "Care Hub", icon: Heart },
      { href: "/settings/integrations", label: "Integrations", icon: Link2 },
    ],
  },
];

function AccordionNav({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = item.icon;
  const isActive = item.items?.some(sub => pathname === sub.href || pathname.startsWith(`${sub.href}/`));

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
          isActive
            ? "border border-[color:var(--accent-primary)]/40 bg-[color:var(--accent-primary)]/10 text-[color:var(--text-primary)]"
            : "text-[color:var(--text-soft)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="size-5" />
          <span>{item.label}</span>
        </div>
        <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="ml-4 mt-1 space-y-1 border-l border-[color:var(--border-subtle)] pl-4">
          {item.items?.map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
            return (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  isSubActive
                    ? "bg-[color:var(--bg-card)] text-[color:var(--text-primary)]"
                    : "text-[color:var(--text-soft)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
                )}
              >
                <SubIcon className="size-4" />
                <span>{sub.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const closeNav = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-4 z-50 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/80 p-2 text-[color:var(--text-primary)] backdrop-blur-lg transition hover:border-[color:var(--accent-primary)]/60 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeNav}
        />
      )}

      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 transform border-l border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-alt)] shadow-[var(--shadow-card)] backdrop-blur-xl transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] p-4">
            <Link href="/" className="flex items-center gap-2" onClick={closeNav}>
              <div className="size-7 rounded-xl bg-gradient-to-br from-[color:var(--accent-primary)] to-[color:var(--accent-secondary)] shadow-[var(--shadow-card)]" />
              <span className="text-sm font-semibold tracking-tight text-[color:var(--text-primary)]">BioFlo</span>
            </Link>
            <button
              onClick={closeNav}
              className="rounded-xl p-1.5 text-[color:var(--text-soft)] transition hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {NAV_ITEMS.map((item) => {
              if (item.items) {
                return <AccordionNav key={item.label} item={item} pathname={pathname} onNavigate={closeNav} />;
              }

              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  onClick={closeNav}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "border border-[color:var(--accent-primary)]/40 bg-[color:var(--accent-primary)]/10 text-[color:var(--text-primary)]"
                      : "text-[color:var(--text-soft)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
                  )}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[color:var(--border-subtle)] p-4">
            <Link
              href="/settings"
              onClick={closeNav}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[color:var(--text-soft)] transition hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
            >
              <Settings className="size-5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
