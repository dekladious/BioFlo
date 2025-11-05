"use client";
import { useEffect, useState } from "react";

export default function CheckoutSuccess() {
  const [status, setStatus] = useState<"checking" | "success" | "pending" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const retryCountRef = { current: 0 };
    const maxRetries = 15; // Try for 30 seconds (15 * 2s)

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/stripe/check-status");
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || `HTTP error! status: ${res.status}`);
        }
        
        // Handle both old and new response formats
        const isPro = data.data?.isPro ?? data.isPro;
        
        if (isPro) {
          setStatus("success");
          // Redirect to chat after a moment
          setTimeout(() => {
            window.location.href = "/chat";
          }, 2000);
        } else {
          retryCountRef.current++;
          if (retryCountRef.current >= maxRetries) {
            setStatus("error");
            setError("Subscription activation is taking longer than expected. Please refresh the page or contact support.");
          } else {
            // Keep checking every 2 seconds
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
          // Keep trying
          setTimeout(checkStatus, 2000);
        }
      }
    };

    // Start checking after 1 second
    const timer = setTimeout(checkStatus, 1000);
    
    // Auto-refresh after 30 seconds as fallback
    const refreshTimer = setTimeout(() => {
      if (status !== "success") {
        window.location.reload();
      }
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearTimeout(refreshTimer);
    };
  }, []); // Empty deps - only run once on mount

  if (status === "success") {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-4">
        <p className="font-semibold">✅ Pro status activated! Redirecting...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
        <p className="font-semibold">⚠️ Activation delayed</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-4">
      <p className="font-semibold">Payment successful! 🎉</p>
      <p className="text-sm mt-1">
        Activating your subscription... Please wait.
      </p>
    </div>
  );
}
