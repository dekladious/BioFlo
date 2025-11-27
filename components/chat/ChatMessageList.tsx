"use client";

import { useEffect, useRef } from "react";
import { Loader2, AlertCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
  metadata?: {
    category?: string;
    isCrisis?: boolean;
    isModerateRisk?: boolean;
  };
};

type ChatMessageListProps = {
  messages: Message[];
  isLoading?: boolean;
  isStreaming?: boolean;
  firstName?: string;
  feedbackState?: Record<string, "up" | "down">;
  feedbackLoading?: Record<string, boolean>;
  onFeedback?: (messageId: string, messageContent: string, sentiment: "up" | "down") => void;
};

export default function ChatMessageList({
  messages,
  isLoading = false,
  isStreaming = false,
  firstName,
  feedbackState,
  feedbackLoading,
  onFeedback,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // Detect crisis/emergency messages by content patterns
  function isCrisisMessage(content: string): boolean {
    const crisisPatterns = [
      /emergency services/i,
      /crisis hotline/i,
      /immediate danger/i,
      /contact.*emergency/i,
      /seek.*emergency/i,
      /call.*emergency/i,
    ];
    return crisisPatterns.some((pattern) => pattern.test(content));
  }

  // Detect moderate risk biohack messages
  function isModerateRiskMessage(content: string): boolean {
    const moderateRiskPatterns = [
      /3.?day.*fast/i,
      /three.?day.*fast/i,
      /sauna.*protocol/i,
      /ice bath/i,
      /cold plunge/i,
      /general education.*not medical advice/i,
    ];
    return moderateRiskPatterns.some((pattern) => pattern.test(content));
  }

  // Empty state
  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Hey {firstName || "there"} 👋
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
            <p>
              I’m your BioFlo coach. You can talk to me about your sleep, anxiety, energy, routines, or biohacking ideas.
            </p>
            <p>
              I’ll mix what you’ve told me with your data and science-backed protocols – and we’ll keep it safe and realistic.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message, idx) => {
        const messageId = message.id || String(idx);
        const isCrisis =
          message.metadata?.isCrisis ||
          message.metadata?.category === "MENTAL_HEALTH_CRISIS" ||
          message.metadata?.category === "MEDICAL_EMERGENCY_SIGNS" ||
          (message.role === "assistant" && isCrisisMessage(message.content));
        const isModerateRisk =
          message.metadata?.isModerateRisk ||
          message.metadata?.category === "MODERATE_RISK_BIOHACK" ||
          (message.role === "assistant" && isModerateRiskMessage(message.content));

        if (message.role === "system") {
          return (
            <div key={idx} className="text-center">
              <div className="inline-block px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-xs text-slate-600 dark:text-slate-400">
                {message.content}
              </div>
            </div>
          );
        }

        if (message.role === "user") {
          return (
            <div key={messageId} className="flex justify-end">
              <div className="max-w-[80%] space-y-1">
                <div className="rounded-2xl rounded-tr-sm bg-sky-400/20 dark:bg-sky-400/20 border border-sky-400/30 px-4 py-3">
                  <div className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-500">
                  <span>You</span>
                  {message.createdAt && (
                    <span>•</span>
                  )}
                  {message.createdAt && (
                    <span>{new Date(message.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Assistant message
        const feedbackValue = feedbackState?.[messageId];
        const feedbackSubmitting = feedbackLoading?.[messageId];
        const showFeedbackActions =
          typeof onFeedback === "function" &&
          (!isStreaming || idx !== messages.length - 1);

        return (
          <div key={messageId} className="flex justify-start">
            <div className="max-w-[80%] space-y-1">
              {isCrisis && (
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="size-4 text-red-400" />
                  <span className="text-xs font-medium text-red-300">Important safety message</span>
                </div>
              )}
              <div
                className={`rounded-2xl rounded-tl-sm px-4 py-3 ${
                  isCrisis
                    ? "bg-red-500/10 dark:bg-red-500/10 border border-red-400/30"
                    : "bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                }`}
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="text-sm text-slate-700 dark:text-slate-200 mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="text-sm text-slate-700 dark:text-slate-200 mb-2 last:mb-0 list-disc list-inside space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="text-sm text-slate-700 dark:text-slate-200 mb-2 last:mb-0 list-decimal list-inside space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-slate-700 dark:text-slate-200">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-xs text-sky-600 dark:text-sky-300 font-mono">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
              {isModerateRisk && (
                <div className="text-xs text-slate-600 dark:text-slate-500 italic mt-1 px-1">
                  This is general education, not medical advice. Only consider this after talking to your doctor.
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                <span>BioFlo Coach</span>
                {message.createdAt && (
                  <>
                    <span>•</span>
                    <span>{new Date(message.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  </>
                )}
              </div>
              {showFeedbackActions && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                  <button
                    type="button"
                    disabled={Boolean(feedbackValue) || feedbackSubmitting}
                    onClick={() => onFeedback?.(messageId, message.content, "up")}
                    className={`flex items-center gap-1 rounded-full border px-2 py-1 transition ${
                      feedbackValue === "up"
                        ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                        : "border-slate-200 dark:border-white/10 hover:border-emerald-400/60 hover:text-emerald-300"
                    }`}
                  >
                    <ThumbsUp className="size-3.5" />
                    <span>Helpful</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(feedbackValue) || feedbackSubmitting}
                    onClick={() => onFeedback?.(messageId, message.content, "down")}
                    className={`flex items-center gap-1 rounded-full border px-2 py-1 transition ${
                      feedbackValue === "down"
                        ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
                        : "border-slate-200 dark:border-white/10 hover:border-amber-400/60 hover:text-amber-300"
                    }`}
                  >
                    <ThumbsDown className="size-3.5" />
                    <span>Needs work</span>
                  </button>
                  {feedbackValue && (
                    <span className="text-slate-400 dark:text-slate-500">
                      {feedbackValue === "up" ? "Thanks for the signal!" : "We'll use this to improve."}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {isStreaming && (
        <div className="flex justify-start">
          <div className="max-w-[80%]">
            <div className="rounded-2xl rounded-tl-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400">Coach is thinking...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

