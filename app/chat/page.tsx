"use client";

import { useEffect, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import { Onboarding } from "@/components/Onboarding";

export default function ChatPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompleted = localStorage.getItem("bioflo-onboarding-complete");
    if (!hasCompleted) {
      // Check if user has profile data
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          const hasPrefs = data?.data?.preferences && Object.keys(data.data.preferences).length > 0;
          if (!hasPrefs) {
            setShowOnboarding(true);
          } else {
            localStorage.setItem("bioflo-onboarding-complete", "true");
          }
        })
        .catch(() => {
          // If API fails, show onboarding anyway
          setShowOnboarding(true);
        });
    }
  }, []);

  function handleOnboardingComplete() {
    setShowOnboarding(false);
    setOnboardingComplete(true);
    localStorage.setItem("bioflo-onboarding-complete", "true");
  }

  return (
    <div className="w-full px-3 sm:px-4">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="text-2xl font-semibold tracking-tight mb-4">Chat</div>
        <ChatInterface />
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      </div>
    </div>
  );
}
