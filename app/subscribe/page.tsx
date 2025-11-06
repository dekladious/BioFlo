"use client";
import { useState } from "react";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setLoadingType("checkout");
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
      setLoadingType(null);
    }
  }

  async function openPortal() {
    setLoading(true);
    setLoadingType("portal");
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
      setLoadingType(null);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 mb-6 shadow-2xl">
            <span className="text-white text-3xl">✨</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            <span className="gradient-text">BioFlo Pro</span>
          </h1>
          <p className="text-xl text-slate-600 mb-2">
            Unlock unlimited access to personalized biohacking protocols
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
            <span className="text-2xl font-bold text-green-600">£14.99</span>
            <span className="text-slate-600">/month</span>
            <span className="text-xs text-slate-500 ml-2">· Cancel anytime</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-900 px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        <div className="glass rounded-3xl p-8 sm:p-12 border border-slate-200/50 shadow-2xl mb-8">
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            {[
              "Personalized protocol generation",
              "Supplement recommendations",
              "Meal planning & nutrition",
              "Sleep optimization protocols",
              "Women's health optimization",
              "Comprehensive protocol builder",
              "Evidence-based recommendations",
              "Priority support",
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-700">{feature}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={startCheckout} 
                disabled={loading} 
                className="flex-1 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-700 hover:to-purple-700 transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading && loadingType === "checkout" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Subscribe Now</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
              <button 
                onClick={openPortal} 
                disabled={loading} 
                className="px-8 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-200 text-slate-700 rounded-2xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-violet-300 transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading && loadingType === "portal" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Manage Billing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-slate-500">
          <p>Secure payment powered by Stripe. Your subscription can be cancelled at any time.</p>
        </div>
      </div>
    </main>
  );
}
