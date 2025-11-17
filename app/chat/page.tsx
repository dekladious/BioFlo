"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatInput from "@/components/chat/ChatInput";
import UserSnapshot from "@/components/chat/UserSnapshot";
import RecentTrends from "@/components/chat/RecentTrends";
import ProtocolAndPlan from "@/components/chat/ProtocolAndPlan";

type Message = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
  metadata?: {
    category?: string;
    isCrisis?: boolean;
    isModerateRisk?: boolean;
  };
};

type UserProfile = {
  goals?: string[];
  mode?: string;
  firstName?: string;
  subscriptionStatus?: "active" | "inactive" | "none";
};

type CheckIn = {
  created_at: string;
  mood: number | null;
  energy: number | null;
  sleep_quality: number | null;
};

type TodayPlan = {
  focus?: string;
};

type Protocol = {
  name: string;
  run: {
    logs: Array<{ dayIndex: number; completed: boolean }>;
  };
  config: {
    days: number;
  };
};

import { pane } from "@/lib/utils/theme";

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Sidebar data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
  const [protocol, setProtocol] = useState<Protocol | null>(null);

  // Quick chips
  const quickChips = [
    "Improve my sleep",
    "I feel anxious today",
    "Adjust today's plan",
    "Explain my recent patterns",
  ];

  useEffect(() => {
    fetchMessages();
    fetchSidebarData();
  }, []);

  async function fetchMessages() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat/history?limit=50");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.messages) {
          const formattedMessages: Message[] = data.data.messages.map((msg: {
            role: string;
            content: string;
            created_at: string;
            metadata?: unknown;
          }) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
            createdAt: msg.created_at,
            metadata: typeof msg.metadata === "object" ? msg.metadata as Message["metadata"] : undefined,
          }));
          setMessages(formattedMessages);
          // Use thread ID as session ID if available
          if (data.data.threadId) {
            setSessionId(data.data.threadId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
      setError("Failed to load chat history");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchSidebarData() {
    // Fetch profile
    try {
      const response = await fetch("/api/me");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const fullName = data.data.fullName || "";
          const firstName = fullName.split(" ")[0] || "";
          setProfile({
            goals: Array.isArray(data.data.goals) ? data.data.goals : [],
            mode: "NORMAL", // TODO: Get from user preferences
            firstName,
            subscriptionStatus: data.data.subscriptionStatus === "active" ? "active" : "inactive",
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }

    // Fetch check-ins
    try {
      const response = await fetch("/api/check-ins?range=7d");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCheckIns(data.data.checkIns || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch check-ins", err);
    }

    // Fetch today plan
    try {
      const response = await fetch("/api/today-plan");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.plan) {
          setTodayPlan(data.data.plan);
        }
      }
    } catch (err) {
      console.error("Failed to fetch today plan", err);
    }

    // Fetch protocol
    try {
      const response = await fetch("/api/protocols/current");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.active && data.data?.protocol) {
          const proto = data.data.protocol;
          const completedDays = proto.run?.logs?.filter((log: { completed: boolean }) => log.completed).length || 0;
          setProtocol({
            name: proto.name,
            run: {
              logs: proto.run?.logs || [],
            },
            config: {
              days: proto.config?.days || 1,
            },
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch protocol", err);
    }
  }

  async function handleSend(message: string) {
    if (!message.trim() || isSending) return;

    // Optimistic UI: add user message immediately
    const userMessage: Message = {
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    setIsStreaming(true);
    setError(null);

    try {
      // Prepare messages array for API
      const messagesForAPI = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messagesForAPI,
          sessionId: sessionId || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          // Subscription required
          setError("Subscription required to use chat");
          setIsSending(false);
          setIsStreaming(false);
          return;
        }
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || "Too many requests. Please try again in a moment.");
          setIsSending(false);
          setIsStreaming(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      // Handle streaming response (NDJSON format)
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/x-ndjson")) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let assistantMetadata: Message["metadata"] = {};
        let buffer = "";

        if (reader) {
          // Add placeholder assistant message for streaming
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "",
              metadata: {},
            },
          ]);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                if (parsed.type === "meta" && parsed.sessionId) {
                  setSessionId(parsed.sessionId);
                } else if (parsed.type === "token" && parsed.value) {
                  assistantContent += parsed.value;
                  // Update streaming message
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg?.role === "assistant") {
                      lastMsg.content = assistantContent;
                      lastMsg.metadata = assistantMetadata;
                    }
                    return newMessages;
                  });
                } else if (parsed.type === "metadata") {
                  assistantMetadata = {
                    ...assistantMetadata,
                    ...(parsed.metadata || {}),
                  };
                } else if (parsed.type === "done") {
                  if (parsed.sessionId) {
                    setSessionId(parsed.sessionId);
                  }
                  // Finalize message
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg?.role === "assistant") {
                      lastMsg.content = assistantContent;
                      lastMsg.metadata = assistantMetadata;
                      lastMsg.createdAt = new Date().toISOString();
                    }
                    return newMessages;
                  });
                } else if (parsed.type === "error") {
                  throw new Error(parsed.error || "Streaming error");
                }
              } catch (e) {
                // Skip invalid JSON lines
                console.warn("Failed to parse stream line", e, line);
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.type === "token" && parsed.value) {
                assistantContent += parsed.value;
              }
            } catch (e) {
              // Ignore parse errors for buffer
            }
          }

          // Finalize message
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg?.role === "assistant") {
              lastMsg.content = assistantContent;
              lastMsg.metadata = assistantMetadata;
              lastMsg.createdAt = new Date().toISOString();
            }
            return newMessages;
          });
        }
      } else {
        // Fallback: non-streaming response
        const data = await response.json();
        if (data.success && data.data?.reply) {
          const assistantMessage: Message = {
            role: "assistant",
            content: data.data.reply,
            createdAt: new Date().toISOString(),
            metadata: data.data.metadata || {},
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }

      // Update session ID if provided
      if (response.headers.get("X-Session-Id")) {
        setSessionId(response.headers.get("X-Session-Id"));
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setError("The coach had an issue replying. Please try again in a moment.");
      // Remove optimistic user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsSending(false);
      setIsStreaming(false);
    }
  }

  const isSubscribed = profile?.subscriptionStatus === "active";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b1117]">
      {/* Header Bar */}
      <div className="border-b border-slate-200 dark:border-white/10 bg-white/65 dark:bg-white/[0.02] backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-lg font-semibold text-slate-900 dark:text-white">
                BioFlo
              </Link>
              <span className="text-sm text-slate-600 dark:text-slate-400">Coach Chat</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              >
                Dashboard
              </Link>
              <Link
                href="/protocols"
                className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              >
                Protocols
              </Link>
              {user && (
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-xs font-semibold text-black">
                    {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || "U"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
          {/* Left: Chat Area */}
          <div className={pane + " flex flex-col"} style={{ minHeight: "60vh" }}>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <ChatHeader
                subscriptionStatus={profile?.subscriptionStatus}
                mode={profile?.mode}
              />
            </div>

            {/* Messages */}
            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              isStreaming={isStreaming}
              firstName={profile?.firstName}
            />

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10">
              {error && (
                <div className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3">
                  <p className="text-sm text-red-300">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <ChatInput
                onSend={handleSend}
                isLoading={isSending || isStreaming}
                isSubscribed={isSubscribed}
                quickChips={quickChips}
              />
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4">
            {/* User Snapshot */}
            <UserSnapshot
              goals={profile?.goals}
              mode={profile?.mode}
              currentFocus={todayPlan?.focus}
            />

            {/* Recent Trends */}
            <RecentTrends checkIns={checkIns} />

            {/* Protocol & Plan */}
            <ProtocolAndPlan
              protocol={
                protocol
                  ? {
                      name: protocol.name,
                      day: protocol.run.logs.filter((log) => log.completed).length + 1,
                      totalDays: protocol.config.days,
                    }
                  : null
              }
              todayPlanFocus={todayPlan?.focus}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
