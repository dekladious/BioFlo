"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import Link from "next/link";

type ChatInputProps = {
  onSend: (message: string) => void;
  isLoading?: boolean;
  isSubscribed?: boolean;
  quickChips?: string[];
};

export default function ChatInput({ onSend, isLoading = false, isSubscribed = true, quickChips = [] }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isLoading || !isSubscribed) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (chip: string) => {
    if (isLoading || !isSubscribed) return;
    onSend(chip);
  };

  if (!isSubscribed) {
    return (
      <div className="border-t border-slate-200 dark:border-white/10 pt-4">
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-center">
          <p className="text-sm text-amber-300 mb-3">
            Chat is only available with an active subscription. Unlock the full coach experience for £24.99/month.
          </p>
          <Link
            href="/pricing"
            className="inline-block rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 transition"
          >
            Upgrade
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 dark:border-white/10 pt-4 space-y-3">
      {/* Quick Chips */}
      {quickChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell me what's going on with your sleep, anxiety, or energy, and I'll help you figure out what to try next."
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: "44px", maxHeight: "120px" }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="rounded-lg bg-sky-400 px-4 py-3 text-white hover:bg-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          <span className="text-sm font-medium">Send</span>
        </button>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-500 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}

