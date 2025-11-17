"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Play,
  Sparkles,
  Calendar,
  CheckCircle2,
  X,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

const pane = "rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur shadow-sm";

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

  useEffect(() => {
    fetchProtocols();
    fetchCurrentProtocol();
  }, []);

  async function fetchProtocols() {
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
  }

  async function fetchCurrentProtocol() {
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
  }

  async function handleStartProtocol(protocolId: number) {
    // Check if there's an active protocol
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Protocols</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Structured programmes to reset your sleep, calm anxiety, boost energy, and more. Pick one focus at a time and let BioFlo guide you day by day.
        </p>
      </div>

      <SafetyDisclaimer variant="compact" />

      {/* Current Protocol Card */}
      {currentProtocol?.active && currentProtocol.protocol && (
        <div className={pane + " p-6 space-y-4"}>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-400" />
            <h2 className="text-xl font-semibold">Current protocol</h2>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">{currentProtocol.protocol.name}</h3>
            <p className="text-sm text-slate-400 mt-1">
              Started {new Date(currentProtocol.protocol.run.startedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Status & Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Status</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Day {currentDay} of {totalDays}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all"
                style={{
                  width: `${(completedDays / totalDays) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{completedDays} days completed</span>
              <span>{totalDays - completedDays} days remaining</span>
            </div>
          </div>

          {/* Today's Focus */}
          {todayDayData?.title && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs font-medium text-slate-400 mb-1">Today's key focus</div>
              <p className="text-sm text-white">{todayDayData.title}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Link
              href={`/protocols/${currentProtocol.protocol.slug}#day-${currentDay}`}
              className="flex-1 rounded-lg bg-sky-400 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 transition text-center flex items-center justify-center gap-2"
            >
              Open today's steps
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={`/protocols/${currentProtocol.protocol.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition"
            >
              View full protocol
            </Link>
          </div>
        </div>
      )}

      {/* Recommended Protocols */}
      <div className={pane + " p-6 space-y-4"}>
        <h2 className="text-lg font-semibold">
          {currentProtocol?.active ? "Recommended for you" : "Available protocols"}
        </h2>

        {protocols.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Calendar className="size-12 mx-auto mb-4 opacity-50" />
            <p>No protocols available yet.</p>
            <p className="text-xs mt-2">Protocols will be added by the admin.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {protocols.map((protocol) => {
              const isActive =
                currentProtocol?.active &&
                currentProtocol.protocol?.id === protocol.id;
              const isStarting = starting === protocol.id;
              const duration = protocol.config?.duration || protocol.config?.days?.length || 0;

              return (
                <div
                  key={protocol.id}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-5 space-y-3"
                >
                  <div>
                    <h3 className="font-semibold text-white">{protocol.name}</h3>
                    {protocol.description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {protocol.description}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {protocol.config?.tags && protocol.config.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {protocol.config.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Duration */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-sky-400/20 text-sky-300 border border-sky-400/30">
                      {duration} days
                    </span>
                    {isActive ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Active
                      </span>
                    ) : (
                      <Link
                        href={`/protocols/${protocol.slug}`}
                        className="text-xs text-sky-400 hover:text-sky-300 transition"
                      >
                        View details →
                      </Link>
                    )}
                  </div>

                  {/* CTA */}
                  {!isActive && (
                    <button
                      onClick={() => handleStartProtocol(protocol.id)}
                      disabled={isStarting}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="size-4" />
                          Start Protocol
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Protocols (Future: Collapsible section) */}
      {/* TODO: Add past protocols section when we have completed/abandoned runs */}
    </div>
  );
}
