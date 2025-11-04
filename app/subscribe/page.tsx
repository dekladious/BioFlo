"use client";
import { useState } from "react";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  }

  async function openPortal() {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Subscribe to BioFlo Pro</h1>
      <p className="text-slate-600">£14.99/month. Cancel anytime.</p>
      <div className="flex gap-2">
        <button onClick={startCheckout} disabled={loading} className="px-4 py-2 bg-black text-white rounded-lg">Subscribe</button>
        <button onClick={openPortal} disabled={loading} className="px-4 py-2 border rounded-lg">Manage Billing</button>
      </div>
    </main>
  );
}
