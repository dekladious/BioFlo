"use client";

import { useEffect, useState } from "react";

interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM format
}

/**
 * Hook to manage check-in reminders
 * Requests notification permission and schedules daily reminders
 */
export function useCheckInReminder() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          setPermission(perm);
        });
      }
    }
  }, []);

  // Load reminder settings
  useEffect(() => {
    fetch("/api/check-ins/reminder-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettings(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Schedule daily reminder
  useEffect(() => {
    if (!settings?.enabled || permission !== "granted" || !settings.time) {
      return;
    }

    const scheduleReminder = () => {
      const [hours, minutes] = settings.time.split(":").map(Number);
      const now = new Date();
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);

      // If reminder time has passed today, schedule for tomorrow
      if (reminderTime < now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      const msUntilReminder = reminderTime.getTime() - now.getTime();

      const timeoutId = setTimeout(() => {
        // Check if user already checked in today
        fetch("/api/check-ins?range=1d")
          .then((res) => res.json())
          .then((data) => {
            const today = new Date().toISOString().split("T")[0];
            const todayCheckIn = data.data?.checkIns?.find(
              (ci: { created_at: string }) => ci.created_at.startsWith(today)
            );

            if (!todayCheckIn && permission === "granted") {
              new Notification("Time to check in! 📊", {
                body: "How are you feeling today? Take a moment to log your mood, energy, and sleep quality.",
                icon: "/icon-192x192.png", // Add app icon
                tag: "check-in-reminder",
                requireInteraction: false,
              });
            }
          })
          .catch(console.error);

        // Schedule next reminder
        scheduleReminder();
      }, msUntilReminder);

      return () => clearTimeout(timeoutId);
    };

    const cleanup = scheduleReminder();
    return cleanup;
  }, [settings, permission]);

  const updateSettings = async (newSettings: Partial<ReminderSettings>) => {
    try {
      const response = await fetch("/api/check-ins/reminder-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, ...newSettings }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings((prev) => ({ ...prev!, ...newSettings }));
        }
      }
    } catch (error) {
      console.error("Failed to update reminder settings", error);
    }
  };

  return {
    settings,
    permission,
    loading,
    updateSettings,
    requestPermission: () => {
      if ("Notification" in window) {
        Notification.requestPermission().then(setPermission);
      }
    },
  };
}

