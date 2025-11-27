"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MetricPill } from "@/components/ui/metric-pill";
import { RingMetric } from "@/components/ui/ring-metric";
import { cn } from "@/lib/utils/cn";

type Protocol = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  config: {
    duration?: number;
    tags?: string[];
    days?: unknown[];
  };
};

type CurrentProtocol = {
  active: boolean;
  protocol: {
    id: number;
    name: string;
    slug: string;
    config: {
      duration?: number;
      days?: unknown[];
    };
    run: {
      id: number;
      status: string;
      startedAt: string;
      currentDay?: number;
      totalDays?: number;
      logs: Array<{
        dayIndex: number;
        completed: boolean;
      }>;
    };
  } | null;
};

export default function ProtocolsPage() {
  const router = useRouter();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [currentProtocol, setCurrentProtocol] = useState<CurrentProtocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);

  const fetchProtocols = useCallback(async () => {
    try {
      const response = await fetch("/api/protocols");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/sign-in");
          return;
        }
        console.warn("Failed to fetch protocols", response.status);
        setProtocols([]);
        return;
      }
      const data = await response.json();
      if (data.success && data.data) {
        setProtocols(data.data.protocols || []);
      } else {
        setProtocols([]);
      }
    } catch (error) {
      console.error("Failed to fetch protocols", error);
      setProtocols([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchCurrentProtocol = useCallback(async () => {
    try {
      const response = await fetch("/api/protocols/current");
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        setCurrentProtocol(null);
        return;
      }
      const data = await response.json();
      if (data.success && data.data) {
        setCurrentProtocol(data.data);
      } else {
        setCurrentProtocol(null);
      }
    } catch (error) {
      console.error("Failed to fetch current protocol", error);
      setCurrentProtocol(null);
    }
  }, []);

  useEffect(() => {
    fetchProtocols();
    fetchCurrentProtocol();
  }, [fetchProtocols, fetchCurrentProtocol]);

  async function handleStartProtocol(protocolId: number) {
    // Check if there’s an active protocol
    if (currentProtocol?.active && currentProtocol.protocol) {
      const confirmStart = confirm(
        `You already have an active protocol (${currentProtocol.protocol.name}). Do you want to pause/stop it and start this one instead?`
      );
      if (!confirmStart) return;
    }

    setStarting(protocolId);
    try {
      const response = await fetch("/api/protocols/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to start protocol");
        return;
      }

      const data = await response.json();
      if (data.success) {
        await fetchCurrentProtocol();
        // Navigate to protocol detail page
        const protocol = protocols.find((p) => p.id === protocolId);
        if (protocol) {
          router.push(`/protocols/${protocol.slug}`);
        }
      } else {
        alert("Failed to start protocol. Please try again.");
      }
    } catch (error) {
      console.error("Failed to start protocol", error);
      alert("Failed to start protocol. Please try again.");
    } finally {
      setStarting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-sky-400" />
      </div>
    );
  }

  const currentDay = currentProtocol?.protocol?.run?.currentDay || 1;
  const totalDays = currentProtocol?.protocol?.run?.totalDays || currentProtocol?.protocol?.config?.duration || 1;
  const completedDays = currentProtocol?.protocol?.run?.logs?.filter((l) => l.completed).length || 0;
  const todayDayData = currentProtocol?.protocol?.config?.days?.[currentDay - 1] as
    | { title?: string }
    | undefined;
  const durations = protocols
    .map((protocol) => protocol.config?.duration || protocol.config?.days?.length || 0)
    .filter((value) => value && Number.isFinite(value));
  const averageDuration =
    durations.length > 0 ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 14;
  const heroStats = [
    {
      label: "Active protocol",
      value: currentProtocol?.active && currentProtocol.protocol ? currentProtocol.protocol.name : "None",
      helper: currentProtocol?.active ? `Day ${currentDay} of ${totalDays}` : "One stack at a time",
    },
    {
      label: "Library",
      value: `${protocols.length}+`,
      helper: "Sleep • calm • energy • recovery",
    },
    {
      label: "Avg duration",
      value: `${averageDuration} days`,
      helper: "Designed for adherence",
    },
  ];
  const heroActions = [
    {
      href: "/chat?message=Can%20you%20design%20a%20protocol%20for%20me%3F",
      label: "Ask BioFlo",
      helper: "Custom run in 30s",
      icon: Sparkles,
    },
    {
      href: "#library",
      label: "Browse library",
      helper: "Sleep • calm • growth",
      icon: Target,
    },
  ];

  return (
    <div className="space-y-8">
      <Card variant="hero" statusAccent="primary" className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-text-soft">Protocol intelligence</p>
          <h1 className="text-3xl font-semibold text-text-main">
            Structured resets built for <span className="text-teal">elite adherence.</span>
          </h1>
          <p className="max-w-3xl text-base text-text-soft">
            BioFlo orchestrates 7–21 day stacks blending pacing, behavioural habits, and strict safety guardrails. Start
            a curated run or let the AI design a bespoke flow grounded in today’s plan, trends, and risk layer.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {heroStats.map((stat) => (
            <Card key={stat.label} variant="compact" className="border border-border-subtle bg-white/5">
              <p className="text-[11px] uppercase tracking-wide text-text-soft">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-text-main">{stat.value}</p>
              <p className="text-[11px] text-text-soft">{stat.helper}</p>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {heroActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="quick-action-chip border-border-subtle bg-white/5 hover:bg-white/10"
              >
                <Icon className="size-4 text-teal" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-text-main">{action.label}</p>
                  <p className="text-[10px] text-text-soft">{action.helper}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card variant="compact" className="border border-warning/30 bg-warning/10 text-warning">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <AlertCircle className="size-4" />
          Behavioural resets only — no medication, fasting extremes, or high-risk heat/cold stacks by default. Talk to
          your doctor for anything medical or if you experience adverse symptoms.
        </div>
      </Card>

      <Card statusAccent={currentProtocol?.active ? "primary" : "none"} className="space-y-5">
        {currentProtocol?.active && currentProtocol.protocol ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-soft">Current protocol</p>
                <h2 className="text-xl font-semibold text-text-main">{currentProtocol.protocol.name}</h2>
                <p className="text-sm text-text-soft">
                  Day {currentDay} of {totalDays} · Started{" "}
                  {new Date(currentProtocol.protocol.run.startedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <MetricPill
                label="Progress"
                value={`${Math.round((completedDays / totalDays) * 100)}%`}
                status="good"
                deltaLabel={`-${totalDays - completedDays}d left`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-text-soft">
                <span>{completedDays} completed</span>
                <span>
                  Day {currentDay} / {totalDays}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-chip">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal to-indigo transition-all"
                  style={{ width: `${Math.min(100, (completedDays / totalDays) * 100)}%` }}
                />
              </div>
            </div>
            {todayDayData?.title && (
              <div className="rounded-2xl border border-border-subtle bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-text-soft">Today’s focus</p>
                <p className="mt-1 text-sm font-semibold text-text-main">{todayDayData.title}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/protocols/${currentProtocol.protocol.slug}#day-${currentDay}`}
                className="flex-1 rounded-full border border-teal bg-teal-soft px-4 py-2 text-sm font-semibold text-teal hover:bg-teal/20"
              >
                Open today’s steps
              </Link>
              <Link
                href={`/chat?message=${encodeURIComponent(
                  `Can you help me adapt day ${currentDay} of ${currentProtocol.protocol.name}?`
                )}`}
                className="rounded-full border border-border-subtle px-4 py-2 text-sm text-text-main hover:bg-white/10"
              >
                Talk to coach
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-soft">No active protocol</p>
              <h2 className="text-xl font-semibold text-text-main">Choose a stack to run next.</h2>
              <p className="text-sm text-text-soft">
                Pick from curated programmes or ask the coach to adapt one to your current mode.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/chat?message=Design%20a%2014-day%20sleep%20reset%20for%20me"
                className="rounded-full border border-border-subtle px-4 py-2 text-sm text-text-main hover:bg-white/10"
              >
                Ask the coach
              </Link>
              <Link
                href="#library"
                className="rounded-full border border-teal bg-teal-soft px-4 py-2 text-sm font-semibold text-teal hover:bg-teal/20"
              >
                Browse library
              </Link>
            </div>
          </div>
        )}
      </Card>

      <Card id="library" title={currentProtocol?.active ? "Recommended next" : "Protocol library"} className="space-y-5">
        {protocols.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-white/5 py-10 text-center text-text-soft">
            <Calendar className="mx-auto mb-4 size-12 text-text-faint" />
            <p>No protocols available yet.</p>
            <p className="mt-2 text-xs text-text-soft">Protocols will be added soon.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {protocols.map((protocol) => {
              const isActive =
                currentProtocol?.active && currentProtocol.protocol?.id === protocol.id;
              const isStarting = starting === protocol.id;
              const duration = protocol.config?.duration || protocol.config?.days?.length || 0;
              return (
                <Card key={protocol.id} className="space-y-4 border border-border-subtle bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-text-main">{protocol.name}</h3>
                      {protocol.description && (
                        <p className="mt-1 text-sm text-text-soft line-clamp-3">{protocol.description}</p>
                      )}
                    </div>
                    {isActive && (
                      <MetricPill label="Active" value="Running" status="good" className="text-xs" />
                    )}
                  </div>
                  {protocol.config?.tags && protocol.config.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {protocol.config.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-soft"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-text-soft">
                    <span>{duration || "Flexible"} day run</span>
                    <span>{protocol.config?.days?.length || duration || "Adaptive"} steps</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/protocols/${protocol.slug}`}
                      className="flex-1 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-main hover:bg-white/10"
                    >
                      View details
                    </Link>
                    {!isActive && (
                      <button
                        onClick={() => handleStartProtocol(protocol.id)}
                        disabled={isStarting}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition",
                          isStarting
                            ? "border-border-subtle text-text-soft opacity-60"
                            : "border-teal text-teal hover:bg-teal-soft"
                        )}
                      >
                        {isStarting ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin" />
                            Starting…
                          </span>
                        ) : (
                          "Start run"
                        )}
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
