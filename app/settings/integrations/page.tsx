"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Watch, Smartphone, RefreshCw, Check, X, ChevronRight, Link2, Unlink, Clock, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

interface WearableDevice {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  lastSync?: string;
  dataTypes: string[];
  color: string;
  hasRealIntegration: boolean;
  connectUrl?: string;
  recentData?: {
    days_with_data: number;
    latest_date: string;
    avg_sleep_hours: number;
    avg_hrv: number;
  };
}

const INITIAL_DEVICES: WearableDevice[] = [
  {
    id: "ultrahuman",
    name: "Ultrahuman Ring",
    logo: "💍",
    connected: false,
    dataTypes: ["Sleep", "HRV", "Temperature", "Activity", "Recovery"],
    color: "from-[#22f3c8] to-[#0ea5e9]",
    hasRealIntegration: true,
    connectUrl: "/api/integrations/ultrahuman/connect",
  },
  {
    id: "apple",
    name: "Apple Health",
    logo: "🍎",
    connected: false,
    dataTypes: ["Steps", "Heart Rate", "Sleep", "Workouts"],
    color: "from-gray-400 to-gray-600",
    hasRealIntegration: false,
  },
  {
    id: "garmin",
    name: "Garmin",
    logo: "⌚",
    connected: false,
    dataTypes: ["GPS", "Heart Rate", "Sleep", "Training"],
    color: "from-blue-500 to-blue-700",
    hasRealIntegration: false,
  },
  {
    id: "oura",
    name: "Oura Ring",
    logo: "💎",
    connected: false,
    dataTypes: ["Sleep", "Readiness", "Activity", "HRV"],
    color: "from-purple-500 to-purple-700",
    hasRealIntegration: false,
  },
  {
    id: "whoop",
    name: "WHOOP",
    logo: "🏋️",
    connected: false,
    dataTypes: ["Strain", "Recovery", "Sleep", "HRV"],
    color: "from-red-500 to-red-700",
    hasRealIntegration: false,
  },
  {
    id: "fitbit",
    name: "Fitbit",
    logo: "📱",
    connected: false,
    dataTypes: ["Steps", "Sleep", "Heart Rate", "SpO2"],
    color: "from-teal-500 to-teal-700",
    hasRealIntegration: false,
  },
];

function DeviceCard({ 
  device, 
  onConnect, 
  onDisconnect, 
  onSync,
  syncing 
}: { 
  device: WearableDevice; 
  onConnect: () => void; 
  onDisconnect: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  const formatLastSync = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn(
      "rounded-2xl border p-5 transition",
      device.connected 
        ? "border-green-500/30 bg-green-500/5" 
        : "border-white/10 bg-white/[0.02]"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "size-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br",
            device.connected ? device.color : "from-white/10 to-white/5"
          )}>
            {device.logo}
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              {device.name}
              {device.hasRealIntegration && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400">
                  API Ready
                </span>
              )}
            </h3>
            {device.connected ? (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <Check className="size-4" />
                Connected
              </div>
            ) : (
              <p className="text-sm text-white/50">
                {device.hasRealIntegration ? "Ready to connect" : "Coming soon"}
              </p>
            )}
          </div>
        </div>
        {device.connected && (
          <div className="flex items-center gap-2">
            <button
              onClick={onSync}
              disabled={syncing}
              className="size-9 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white disabled:opacity-50 transition"
              title="Sync data"
            >
              <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
            </button>
          </div>
        )}
      </div>

      {device.connected && device.lastSync && (
        <div className="flex items-center gap-2 mb-4 text-xs text-white/50">
          <Clock className="size-3" />
          Last synced {formatLastSync(device.lastSync)}
        </div>
      )}

      {/* Recent data stats if connected */}
      {device.connected && device.recentData && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-lg bg-white/5 p-2 text-center">
            <p className="text-xs text-white/50">Days of data</p>
            <p className="text-lg font-semibold text-white">{device.recentData.days_with_data}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2 text-center">
            <p className="text-xs text-white/50">Avg Sleep</p>
            <p className="text-lg font-semibold text-white">{device.recentData.avg_sleep_hours}h</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {device.dataTypes.map((type) => (
          <span 
            key={type} 
            className={cn(
              "px-2 py-1 rounded-full text-xs",
              device.connected ? "bg-white/10 text-white/70" : "bg-white/5 text-white/40"
            )}
          >
            {type}
          </span>
        ))}
      </div>

      {device.connected ? (
        <button
          onClick={onDisconnect}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
        >
          <Unlink className="size-4" />
          Disconnect
        </button>
      ) : device.hasRealIntegration ? (
        <button
          onClick={onConnect}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:opacity-90 transition"
        >
          <Link2 className="size-4" />
          Connect Now
        </button>
      ) : (
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-white/40 cursor-not-allowed"
        >
          <Clock className="size-4" />
          Coming Soon
        </button>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const [devices, setDevices] = useState<WearableDevice[]>(INITIAL_DEVICES);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check URL params for OAuth callback results
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const provider = searchParams.get("provider");

    if (success === "connected" && provider === "ultrahuman") {
      setNotification({ type: "success", message: "Ultrahuman connected successfully! Data sync in progress..." });
      // Clear URL params
      router.replace("/settings/integrations");
    } else if (error && provider === "ultrahuman") {
      const errorMessages: Record<string, string> = {
        missing_params: "Missing authorization parameters",
        state_expired: "Authorization expired. Please try again.",
        user_not_found: "User not found. Please sign in again.",
        callback_failed: "Failed to complete connection. Please try again.",
        connection_failed: "Failed to connect to Ultrahuman.",
      };
      setNotification({ 
        type: "error", 
        message: errorMessages[error] || `Connection failed: ${error}` 
      });
      router.replace("/settings/integrations");
    }
  }, [searchParams, router]);

  // Fetch Ultrahuman connection status on mount
  useEffect(() => {
    async function checkUltrahumanStatus() {
      try {
        const response = await fetch("/api/integrations/ultrahuman/status");
        if (response.ok) {
          const data = await response.json();
          setDevices(prev => prev.map(d => 
            d.id === "ultrahuman" 
              ? { 
                  ...d, 
                  connected: data.connected, 
                  lastSync: data.lastSync,
                  recentData: data.recentData,
                } 
              : d
          ));
        }
      } catch (error) {
        console.error("Failed to check Ultrahuman status:", error);
      }
    }
    checkUltrahumanStatus();
  }, []);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const connectedCount = devices.filter(d => d.connected).length;

  const handleConnect = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device?.hasRealIntegration) {
      setNotification({ type: "error", message: `${device?.name} integration coming soon!` });
      return;
    }

    if (device.connectUrl) {
      // Redirect to OAuth flow
      window.location.href = device.connectUrl;
    }
  };

  const handleDisconnect = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device?.hasRealIntegration) return;

    if (!confirm(`Disconnect ${device.name}? This will stop syncing your health data.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/integrations/${deviceId}/disconnect`, {
        method: "POST",
      });

      if (response.ok) {
        setDevices(prev => prev.map(d => 
          d.id === deviceId ? { ...d, connected: false, lastSync: undefined, recentData: undefined } : d
        ));
        setNotification({ type: "success", message: `${device.name} disconnected successfully` });
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      setNotification({ type: "error", message: `Failed to disconnect ${device.name}` });
    }
  };

  const handleSync = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device?.hasRealIntegration || !device.connected) return;

    setSyncing(deviceId);

    try {
      const response = await fetch(`/api/integrations/${deviceId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });

      const data = await response.json();

      if (response.ok) {
        setDevices(prev => prev.map(d => 
          d.id === deviceId ? { ...d, lastSync: new Date().toISOString() } : d
        ));
        setNotification({ type: "success", message: data.message || "Data synced successfully!" });
        
        // Refresh status to get updated stats
        const statusResponse = await fetch(`/api/integrations/${deviceId}/status`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setDevices(prev => prev.map(d => 
            d.id === deviceId ? { ...d, recentData: statusData.recentData } : d
          ));
        }
      } else {
        throw new Error(data.error || "Sync failed");
      }
    } catch (error) {
      setNotification({ type: "error", message: `Failed to sync ${device.name} data` });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      {/* Notification */}
      {notification && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg transition-all",
          notification.type === "success" 
            ? "bg-green-500/20 border border-green-500/30 text-green-400"
            : "bg-red-500/20 border border-red-500/30 text-red-400"
        )}>
          {notification.type === "success" ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <AlertCircle className="size-5" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-2 opacity-60 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Integrations</h1>
        <p className="text-sm text-white/60">Connect your wearables and health apps</p>
      </div>

      {/* Status Banner */}
      <div className={cn(
        CARD,
        connectedCount > 0 
          ? "bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-500/20"
          : "bg-gradient-to-br from-white/5 to-white/[0.02]"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "size-14 rounded-2xl flex items-center justify-center",
            connectedCount > 0 ? "bg-green-500/20" : "bg-white/10"
          )}>
            {connectedCount > 0 ? (
              <Zap className="size-7 text-green-400" />
            ) : (
              <Watch className="size-7 text-white/40" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {connectedCount > 0 
                ? `${connectedCount} device${connectedCount > 1 ? 's' : ''} connected`
                : "No devices connected"}
            </h2>
            <p className="text-sm text-white/60">
              {connectedCount > 0 
                ? "Your health data is syncing automatically"
                : "Connect Ultrahuman Ring to unlock personalized insights"}
            </p>
          </div>
        </div>
      </div>

      {/* Ultrahuman Feature Highlight */}
      {!devices.find(d => d.id === "ultrahuman")?.connected && (
        <div className={cn(CARD, "border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-cyan-500/10")}>
          <div className="flex items-start gap-4">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center text-3xl">
              💍
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white text-lg mb-1">Connect Ultrahuman Ring</h3>
              <p className="text-sm text-white/70 mb-3">
                Get the most from BioFlo by connecting your Ultrahuman Ring. We'll automatically sync your sleep, HRV, 
                heart rate, temperature, and recovery data to personalize your daily plan.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {["Automatic daily sync", "Sleep stage analysis", "HRV trends", "Recovery scoring"].map(feature => (
                  <span key={feature} className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs">
                    ✓ {feature}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleConnect("ultrahuman")}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:opacity-90 transition"
              >
                Connect Ultrahuman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Benefits */}
      {connectedCount === 0 && (
        <div className={CARD}>
          <h3 className="font-semibold text-white mb-4">Why connect a wearable?</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Automatic tracking", description: "Sleep, HRV, and activity sync automatically every day" },
              { title: "Deeper insights", description: "AI uses real data to give better, personalized recommendations" },
              { title: "Better plans", description: "Your daily plan adapts to your actual recovery and readiness" },
            ].map((benefit, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                <p className="font-medium text-white mb-1">{benefit.title}</p>
                <p className="text-sm text-white/60">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Devices Grid */}
      <div>
        <h2 className="font-semibold text-white mb-4">Available Integrations</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onConnect={() => handleConnect(device.id)}
              onDisconnect={() => handleDisconnect(device.id)}
              onSync={() => handleSync(device.id)}
              syncing={syncing === device.id}
            />
          ))}
        </div>
      </div>

      {/* Manual Entry Note */}
      <div className={cn(CARD, "text-center")}>
        <Smartphone className="size-10 mx-auto text-white/30 mb-3" />
        <h3 className="font-medium text-white mb-2">No wearable? No problem!</h3>
        <p className="text-sm text-white/60 max-w-md mx-auto">
          You can still use BioFlo with manual check-ins. Log your sleep, mood, and energy daily 
          to get personalized recommendations.
        </p>
        <a 
          href="/check-ins" 
          className="mt-4 inline-block px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
        >
          Go to Check-ins
        </a>
      </div>
    </div>
  );
}
