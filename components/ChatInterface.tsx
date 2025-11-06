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
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bioflo-chat-messages");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
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
  const [copied, setCopied] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("bioflo-chat-messages", JSON.stringify(messages));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

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

  async function copyToClipboard(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  }

  const suggestions = [
    "Plan a 2500 kcal pescatarian day",
    "Recommend supplements for sleep",
    "Create a longevity protocol",
    "Optimize my sleep schedule",
  ];

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)]">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4">
        <div className="space-y-4 px-1">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Welcome to BioFlo
              </h3>
              <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                Your elite biohacking personal assistant. Get personalized protocols, supplements, and optimization strategies.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2.5 text-sm text-left bg-white/60 hover:bg-white/80 border border-slate-200 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div 
              key={i} 
              className={`message-enter flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className={`group relative max-w-[85%] sm:max-w-[75%] ${
                m.role === "user" 
                  ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-2xl rounded-tr-sm shadow-lg" 
                  : m.error
                  ? "bg-red-50 text-red-900 border-2 border-red-200 rounded-2xl rounded-tl-sm"
                  : "glass rounded-2xl rounded-tl-sm shadow-lg border border-slate-200/50"
              } px-5 py-4`}>
                {m.role === "assistant" && !m.error && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">BF</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">BioFlo</span>
                    {m.timestamp && (
                      <span className="text-xs text-slate-500 ml-auto">
                        {formatTime(m.timestamp)}
                      </span>
                    )}
                  </div>
                )}
                
                {m.role === "user" && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium opacity-90">You</span>
                    {m.timestamp && (
                      <span className="text-xs opacity-70 ml-3">
                        {formatTime(m.timestamp)}
                      </span>
                    )}
                  </div>
                )}
                
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-headings:mt-0 prose-headings:mb-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-outside mb-3 space-y-1.5 ml-4">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-outside mb-3 space-y-1.5 ml-4">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ inline, className, children, ...props }) => {
                          return inline ? (
                            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono text-violet-700" {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className={`block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs ${className || ""}`} {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => <pre className="mb-3">{children}</pre>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-violet-400 pl-4 italic my-3 text-slate-700">{children}</blockquote>,
                        hr: () => <hr className="my-4 border-slate-200" />,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>
                )}
                
                {m.role === "assistant" && !m.error && (
                  <button
                    onClick={() => copyToClipboard(m.content, i)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-100/50 text-slate-500 hover:text-slate-700"
                    title="Copy to clipboard"
                  >
                    {copied === i ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">BF</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
              <span className="text-sm ml-2">BioFlo is thinking...</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-900 px-4 py-3 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 pt-4">
        <div className="relative flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask BioFlo anything... (Shift+Enter for new line)"
              className="w-full px-4 py-3 pr-12 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all duration-200 resize-none text-sm placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
              maxLength={10000}
              rows={1}
            />
            <div className="absolute bottom-2 right-2 text-xs text-slate-400">
              {input.length}/10000
            </div>
          </div>
          <button 
            onClick={send} 
            disabled={loading || !input.trim()} 
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 flex items-center gap-2 min-w-[100px] justify-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Sending</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <p className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Educational only. Not medical advice.
          </p>
          {messages.length > 0 && (
            <p className="text-slate-400">{messages.length} {messages.length === 1 ? "message" : "messages"}</p>
          )}
        </div>
      </div>
    </div>
  );
}
