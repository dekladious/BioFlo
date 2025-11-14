"use client";

import { useState } from "react";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid place-items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.045] p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06]">
        <h1 className="text-5xl font-bold text-white">Subscribe</h1>
        <div className="mt-10 rounded-[16px] border border-white/10 bg-white/[0.045] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06]">
          <div className="text-slate-300">Pro Plan</div>
          <div className="mt-6 text-6xl font-semibold text-white">
            £14.99<span className="align-top text-2xl text-slate-400">/mo</span>
          </div>
          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              onClick={startCheckout}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-3 font-medium text-black shadow-[0_12px_30px_rgba(56,189,248,0.35)] transition hover:brightness-110 disabled:opacity-50 will-change-transform"
            >
              Go Pro
            </button>
            <button
              type="button"
              onClick={openPortal}
              disabled={loading}
              className="w-full rounded-xl border border-white/10 px-5 py-3 transition hover:bg-white/5 disabled:opacity-50"
            >
              Manage Billing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
