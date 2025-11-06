"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

type Msg = { 
  role: "user" | "assistant"; 
  content: string;
  timestamp?: string;
  error?: boolean;
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Msg[]>(() => {
    // Load from localStorage on mount
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bioflo-chat-messages");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Clean up old messages (keep last 50)
          return parsed.slice(-50);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to localStorage whenever they change (debounced)
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("bioflo-chat-messages", JSON.stringify(messages));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    
    const userMessage: Msg = { 
      role: "user", 
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    const next = [...messages, userMessage];
    setMessages(next); 
    setInput(""); 
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        const errorMsg = data.error || `HTTP error! status: ${res.status}`;
        throw new Error(errorMsg);
      }
      
      // Handle both old and new response formats
      const text = data.data?.text || data.text || "No response";
      setMessages([...next, { 
        role: "assistant", 
        content: text,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response. Please try again.";
      setError(errorMessage);
      setMessages([...next, { 
        role: "assistant", 
        content: `**Error:** ${errorMessage}\n\nPlease try again or check your connection.`,
        timestamp: new Date().toISOString(),
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(timestamp?: string) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  }

  return (
    <div className="grid gap-3">
      <div className="border rounded-xl p-4 min-h-[320px] max-h-[600px] overflow-y-auto bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-2">
              Welcome to BioFlo! Your elite biohacking coach.
            </p>
            <p className="text-xs text-slate-400">
              Try: "10-minute wind-down for anxiety" or "2,500 kcal pescatarian day (no nuts)"
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div 
            key={i} 
            className={`mb-4 flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div className={`inline-block rounded-xl px-4 py-3 text-sm max-w-[85%] ${
              m.role === "user" 
                ? "bg-blue-600 text-white" 
                : m.error
                ? "bg-red-50 text-red-900 border border-red-200"
                : "bg-white text-slate-900 border border-slate-200 shadow-sm"
            }`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <strong className="text-xs opacity-70">
                  {m.role === "user" ? "You" : "BioFlo"}
                </strong>
                {m.timestamp && (
                  <span className="text-xs opacity-50">
                    {formatTime(m.timestamp)}
                  </span>
                )}
              </div>
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      // Customize markdown rendering
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="ml-2">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ inline, className, children, ...props }) => {
                        return inline ? (
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className={`block bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs ${className || ""}`} {...props}>
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => <pre className="mb-2">{children}</pre>,
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-300 pl-3 italic my-2">{children}</blockquote>,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              )}
            </div>
            {m.role === "assistant" && (
              <button
                onClick={() => copyToClipboard(m.content)}
                className="text-xs text-slate-400 hover:text-slate-600 mt-1 px-2"
                title="Copy to clipboard"
              >
                Copy
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="animate-pulse">●</div>
            <span>BioFlo is thinking…</span>
          </div>
        )}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type your message (Shift+Enter for new line)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
          maxLength={10000}
        />
        <button 
          onClick={send} 
          disabled={loading || !input.trim()} 
          className="px-6 py-2 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>Educational only. Not medical advice.</p>
        <p>{messages.length} messages</p>
      </div>
    </div>
  );
}
