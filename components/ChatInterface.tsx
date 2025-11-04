"use client";
import { useState } from "react";
type Msg = { role: "user" | "assistant"; content: string };

export default function ChatInterface() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const next = [...messages, { role: "user", content: input.trim() } as Msg];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.text ?? "No response" } as Msg]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Error calling API." } as Msg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="border rounded-xl p-4 min-h-[320px]">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Try: "10-minute wind-down for anxiety" or "2,500 kcal pescatarian day (no nuts)".
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <span className={`inline-block rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-blue-100" : "bg-slate-100"}`}>
              <strong className="mr-2">{m.role === "user" ? "You" : "BioFlo"}:</strong>{m.content}
            </span>
          </div>
        ))}
        {loading && <div className="text-sm text-slate-500">Thinking…</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type your message and press Enter"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button onClick={send} disabled={loading} className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60">
          Send
        </button>
      </div>

      <p className="text-xs text-slate-500">Educational only. Not medical advice.</p>
    </div>
  );
}
