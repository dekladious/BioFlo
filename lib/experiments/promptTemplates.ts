export const EXPERIMENT_EXAMPLES = [
  {
    title: "No Caffeine After Noon",
    description:
      "Stop all caffeine after 12pm for 14 days and see how it affects sleep onset, deep sleep, and anxiety ratings.",
    hypothesis: "Avoiding afternoon caffeine will shorten sleep latency and reduce evening anxiety.",
    successCriteria: "Sleep onset improves by ~15 minutes; anxiety scores drop by 1 point on average.",
    metrics: ["sleep_duration_hours", "sleep_efficiency", "sleep_quality", "anxiety", "stress"],
  },
  {
    title: "Ice Bath Once Per Weekend",
    description:
      "Take one 5-minute 10°C ice bath on Saturday or Sunday for 4 weekends. Track HRV and mood changes.",
    hypothesis: "Cold exposure once per week will bump weekend HRV and mood scores.",
    successCriteria: "HRV RMSSD improves by >5% on weekends vs baseline; mood +1 point.",
    metrics: ["hrv_rmssd", "mood", "energy"],
  },
  {
    title: "Stop Eating 4 Hours Before Bed",
    description:
      "Finish your last meal at least 4 hours before bed for 10 nights. Focus on sleep duration and HRV.",
    hypothesis: "Longer fasting window before bed will reduce early-night wake-ups and boost HRV.",
    successCriteria: "Sleep efficiency improves by 3%; HRV increases by 5%.",
    metrics: ["sleep_efficiency", "hrv_rmssd", "resting_hr"],
  },
  {
    title: "Evening Breathwork",
    description:
      "Do 10 minutes of down-regulating breathwork (box breathing / 4-7-8) every evening for 2 weeks.",
    hypothesis: "Evening breathwork will lower evening stress scores and improve sleep quality.",
    successCriteria: "Stress 1 point lower; sleep quality +1 point on average.",
    metrics: ["stress", "sleep_quality", "mood"],
  },
];




