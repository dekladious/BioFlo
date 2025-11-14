"use client";
import { useEffect, useState } from "react";

export default function CheckoutSuccess() {
  const [status, setStatus] = useState<"checking" | "success" | "pending" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const retryCountRef = { current: 0 };
    const maxRetries = 15;

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/stripe/check-status");
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || `HTTP error! status: ${res.status}`);
        }
        
        const isPro = data.data?.isPro ?? data.isPro;
        
        if (isPro) {
          setStatus("success");
          setTimeout(() => {
            window.location.href = "/chat";
          }, 2000);
        } else {
          retryCountRef.current++;
          if (retryCountRef.current >= maxRetries) {
            setStatus("error");
            setError("Subscription activation is taking longer than expected. Please refresh the page or contact support.");
          } else {
            setTimeout(checkStatus, 2000);
          }
        }
      } catch (error: any) {
        console.error("Status check error:", error);
        retryCountRef.current++;
        if (retryCountRef.current >= maxRetries) {
          setStatus("error");
          setError(error.message || "Failed to check subscription status. Please refresh the page.");
        } else {
          setTimeout(checkStatus, 2000);
        }
      }
    };

    const timer = setTimeout(checkStatus, 1000);
    const refreshTimer = setTimeout(() => {
      if (status !== "success") {
        window.location.reload();
      }
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearTimeout(refreshTimer);
    };
  }, []);

  if (status === "success") {
    return (
      <div className="glass-strong bg-green-50/80 border-green-200/60 rounded-3xl p-6 mb-8 animate-slide-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-black text-green-900 text-lg">Pro status activated! Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="glass-card bg-red-50/80 border-red-200/60 rounded-3xl p-6 mb-8 animate-slide-up">
        <div className="flex items-center gap-4 mb-4">
          <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-black text-red-900 text-lg">Activation delayed</p>
        </div>
        <p className="text-sm text-red-700 mb-4 font-semibold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary py-2.5 px-6 text-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="glass-strong bg-green-50/80 border-green-200/60 rounded-3xl p-6 mb-8 animate-slide-up">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
        <div>
          <p className="font-black text-green-900 text-lg mb-1">Payment successful! 🎉</p>
          <p className="text-sm text-green-700 font-semibold">
            Activating your subscription... Please wait.
          </p>
        </div>
      </div>
    </div>
  );
}
