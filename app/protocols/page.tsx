"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Circle, Calendar, TrendingUp } from "lucide-react";
import { TrackedProtocol, createProtocol, markDayComplete, getProtocolProgress } from "@/lib/utils/protocol-tracking";

const pane = "rounded-[16px] border border-white/10 bg-white/[0.045] backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)]";

export default function ProtocolsPage() {
  const [protocols, setProtocols] = useState<TrackedProtocol[]>([]);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    // Load from localStorage
    try {
      const stored = localStorage.getItem("bioflo-protocols");
      if (stored) {
        setProtocols(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load protocols", e);
    }
  }, []);

  useEffect(() => {
    // Save to localStorage
    try {
      localStorage.setItem("bioflo-protocols", JSON.stringify(protocols));
    } catch (e) {
      console.error("Failed to save protocols", e);
    }
  }, [protocols]);

  function handleCreateProtocol(name: string, description: string, duration: number) {
    const newProtocol = createProtocol(name, description, duration);
    setProtocols((p) => [...p, newProtocol]);
    setShowNew(false);
  }

  function handleToggleDay(protocolId: string, date: string) {
    setProtocols((p) =>
      p.map((proto) => {
        if (proto.id === protocolId) {
          const day = proto.days.find((d) => d.date === date);
          if (day?.completed) {
            // Uncomplete
            return {
              ...proto,
              days: proto.days.map((d) => (d.date === date ? { ...d, completed: false } : d)),
              updatedAt: new Date().toISOString(),
            };
          } else {
            return markDayComplete(proto, date);
          }
        }
        return proto;
      })
    );
  }

  return (
    <div className="w-full px-3 sm:px-4">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Protocols</h1>
            <p className="mt-2 text-slate-400">Track your biohacking protocol progress</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-4 py-2 text-sm font-medium text-black shadow-[0_8px_18px_rgba(56,189,248,0.28)] transition hover:brightness-110"
          >
            <Plus className="size-4" /> New Protocol
          </button>
        </div>

        {showNew && (
          <NewProtocolForm
            onSave={handleCreateProtocol}
            onCancel={() => setShowNew(false)}
          />
        )}

        {protocols.length === 0 ? (
          <div className={`${pane} p-8 text-center`}>
            <Calendar className="mx-auto mb-4 size-12 text-slate-400" />
            <p className="text-slate-400">No protocols yet. Create one to start tracking!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {protocols.map((protocol) => (
              <ProtocolCard
                key={protocol.id}
                protocol={protocol}
                onToggleDay={handleToggleDay}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProtocolCard({
  protocol,
  onToggleDay,
}: {
  protocol: TrackedProtocol;
  onToggleDay: (id: string, date: string) => void;
}) {
  const progress = getProtocolProgress(protocol);
  const today = new Date().toISOString().split("T")[0];
  const currentDay = protocol.days.find((d) => d.date === today);

  return (
    <div className={`${pane} p-6`}>
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-white">{protocol.name}</h3>
        <p className="mt-1 text-sm text-slate-400">{protocol.description}</p>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-400">Progress</span>
          <span className="font-medium text-white">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4 text-sm text-slate-400">
        <div className="flex items-center gap-1">
          <Calendar className="size-4" />
          <span>{protocol.duration} days</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="size-4" />
          <span className="capitalize">{protocol.status.replace("_", " ")}</span>
        </div>
      </div>

      {currentDay && (
        <button
          onClick={() => onToggleDay(protocol.id, today)}
          className={`w-full rounded-xl border p-3 text-sm font-medium transition ${
            currentDay.completed
              ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
          }`}
        >
          {currentDay.completed ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4" /> Today Completed
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Circle className="size-4" /> Mark Today Complete
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function NewProtocolForm({
  onSave,
  onCancel,
}: {
  onSave: (name: string, description: string, duration: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(28);

  return (
    <div className={`${pane} mb-6 p-6`}>
      <h3 className="mb-4 text-lg font-semibold text-white">Create New Protocol</h3>
      <div className="grid gap-4">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Protocol Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            placeholder="e.g., 4-Week Longevity Protocol"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            placeholder="Brief description of the protocol..."
            rows={3}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Duration (days)</label>
          <input
            type="number"
            min="1"
            max="365"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 28)}
            className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onSave(name, description, duration)}
            disabled={!name.trim()}
            className="rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-2 text-sm font-medium text-black shadow-[0_8px_18px_rgba(56,189,248,0.28)] transition hover:brightness-110 disabled:opacity-50"
          >
            Create Protocol
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

