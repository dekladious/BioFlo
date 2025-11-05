"use client";
import { useState } from "react";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      const url = data.data?.url || data.url;
      if (!url) {
        throw new Error("No checkout URL received from server");
      }
      
      window.location.href = url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Failed to start checkout. Please try again.");
      setLoading(false);
    }
  }

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      const url = data.data?.url || data.url;
      if (!url) {
        throw new Error("No portal URL received from server");
      }
      
      window.location.href = url;
    } catch (err: any) {
      console.error("Portal error:", err);
      setError(err.message || "Failed to open billing portal. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Subscribe to BioFlo Pro</h1>
      <p className="text-slate-600">£14.99/month. Cancel anytime.</p>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button 
          onClick={startCheckout} 
          disabled={loading} 
          className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Loading..." : "Subscribe"}
        </button>
        <button 
          onClick={openPortal} 
          disabled={loading} 
          className="px-4 py-2 border rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Manage Billing
        </button>
      </div>
    </main>
  );
}
