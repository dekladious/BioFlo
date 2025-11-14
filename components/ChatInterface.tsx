"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Plus, Cog, Sparkles, Clock, Copy, Check, Download, Trash2, Folder, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { exportAsText, formatForExport } from "@/lib/utils/export";

type Msg = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; createdAt: number; preview?: string; messages: Msg[]; folderId?: string | null };
type Folder = { id: string; name: string; createdAt: number };

function ThreadItem({
  thread,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onMoveToFolder,
  folders,
}: {
  thread: Thread;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onMoveToFolder: (folderId: string | null) => void;
  folders: Folder[];
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(thread.title);

  function handleRename() {
    if (editName.trim() && editName.trim() !== thread.title) {
      onRename(editName.trim());
    }
    setIsEditing(false);
    setShowMenu(false);
  }

  return (
    <div className="group relative">
      {isEditing ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleRename();
            } else if (e.key === "Escape") {
              setIsEditing(false);
              setEditName(thread.title);
              setShowMenu(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-black/20 border border-white/15 rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
          autoFocus
        />
      ) : (
        <>
          <button
            onClick={onSelect}
            className={`w-full text-left px-2 py-2 rounded-lg text-xs transition ${
              isActive
                ? "bg-white/12 text-white"
                : "text-slate-300 hover:bg-white/6 hover:text-white"
            }`}
          >
            <div className="font-medium truncate">{thread.title}</div>
            {thread.preview && <div className="text-[10px] text-slate-400 truncate mt-0.5">{thread.preview}</div>}
          </button>
          <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <Cog className="size-3" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-6 z-10 w-48 rounded-lg border border-white/10 bg-white/[0.08] backdrop-blur shadow-lg p-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                      setEditName(thread.title);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-white/10 flex items-center gap-2"
                  >
                    <Cog className="size-3" /> Rename
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                  >
                    <Trash2 className="size-3" /> Delete
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <div className="px-2 py-1 text-[10px] text-slate-400">Move to folder:</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onMoveToFolder(null);
                    }}
                    className="w-full text-left px-2 py-1 rounded text-xs text-slate-300 hover:bg-white/10"
                  >
                    Uncategorized
                  </button>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onMoveToFolder(folder.id);
                      }}
                      className="w-full text-left px-2 py-1 rounded text-xs text-slate-300 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Folder className="size-3" /> {folder.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MessageWithCopy({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  
  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  
  function handleExport() {
    const formatted = formatForExport(content);
    const timestamp = new Date().toISOString().split("T")[0];
    exportAsText(formatted, `bioflo-export-${timestamp}.txt`);
  }
  
  return (
    <div className="group relative">
      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-100 prose-p:text-slate-200 prose-strong:text-slate-100 prose-ul:text-slate-200 prose-ol:text-slate-200 prose-li:text-slate-200 prose-a:text-sky-400 prose-code:text-slate-300 prose-pre:bg-slate-900 prose-pre:text-slate-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleCopy}
          className="rounded-lg p-1.5 bg-white/10 hover:bg-white/20 border border-white/10 transition"
          title="Copy message"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-400" />
          ) : (
            <Copy className="size-3.5 text-slate-300" />
          )}
        </button>
        <button
          onClick={handleExport}
          className="rounded-lg p-1.5 bg-white/10 hover:bg-white/20 border border-white/10 transition"
          title="Export as text file"
        >
          <Download className="size-3.5 text-slate-300" />
        </button>
      </div>
    </div>
  );
}

const pane =
  "rounded-[16px] border border-white/10 bg-white/[0.045] backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)]";

export default function ChatInterface() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Load threads and folders from localStorage on mount
  useEffect(() => {
    try {
      const storedThreads = localStorage.getItem("bioflo-threads");
      if (storedThreads) {
        const parsed = JSON.parse(storedThreads);
        setThreads(parsed);
        // Try to load from database if available
        fetch("/api/chat/history?threadId=" + (parsed[0]?.id || ""))
          .then(r => r.json())
          .then(data => {
            if (data.success && data.data?.messages?.length > 0) {
              // Update thread with database messages if available
              const dbThread = { id: parsed[0]?.id, title: parsed[0]?.title, createdAt: parsed[0]?.createdAt, messages: data.data.messages, folderId: parsed[0]?.folderId };
              setThreads([dbThread, ...parsed.slice(1)]);
            }
          })
          .catch(() => {
            // Database not available, use localStorage only
          });
      }
      
      const storedFolders = localStorage.getItem("bioflo-folders");
      if (storedFolders) {
        const parsed = JSON.parse(storedFolders);
        setFolders(parsed);
        // Expand all folders by default
        setExpandedFolders(new Set(parsed.map((f: Folder) => f.id)));
      }
    } catch (e) {
      console.warn("Failed to load from localStorage", e);
    }
  }, []);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("bioflo-threads", JSON.stringify(threads));
    } catch (e) {
      console.warn("Failed to save threads to localStorage", e);
    }
  }, [threads]);

  // Save folders to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("bioflo-folders", JSON.stringify(folders));
    } catch (e) {
      console.warn("Failed to save folders to localStorage", e);
    }
  }, [folders]);

  function newThread() {
    setMessages([]);
    setSessionId(null);
    setInput("");
  }

  function deleteThread(threadId: string) {
    if (confirm("Are you sure you want to delete this chat?")) {
      setThreads((t) => t.filter((thread) => thread.id !== threadId));
      if (sessionId === threadId) {
        newThread();
      }
      // Also delete from database (non-blocking)
      fetch(`/api/chat/history?threadId=${threadId}`, { method: "DELETE" }).catch(() => {});
    }
  }

  function createFolder() {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: "New Folder",
      createdAt: Date.now(),
    };
    setFolders((f) => [...f, newFolder]);
    setEditingFolder(newFolder.id);
    setFolderName("New Folder");
  }

  function renameFolder(folderId: string, newName: string) {
    if (newName.trim()) {
      setFolders((f) => f.map((folder) => (folder.id === folderId ? { ...folder, name: newName.trim() } : folder)));
    }
    setEditingFolder(null);
    setFolderName("");
  }

  function deleteFolder(folderId: string) {
    if (confirm("Delete this folder? Chats will be moved to uncategorized.")) {
      setFolders((f) => f.filter((folder) => folder.id !== folderId));
      setThreads((t) => t.map((thread) => (thread.folderId === folderId ? { ...thread, folderId: null } : thread)));
      setExpandedFolders((expanded) => {
        const newSet = new Set(expanded);
        newSet.delete(folderId);
        return newSet;
      });
    }
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders((expanded) => {
      const newSet = new Set(expanded);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }

  function moveThreadToFolder(threadId: string, folderId: string | null) {
    setThreads((t) => t.map((thread) => (thread.id === threadId ? { ...thread, folderId } : thread)));
  }

  function renameThread(threadId: string, newName: string) {
    if (newName.trim()) {
      setThreads((t) => t.map((thread) => (thread.id === threadId ? { ...thread, title: newName.trim() } : thread)));
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input.trim() } as Msg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, sessionId }),
      });
      if (r.status === 401) return (window.location.href = "/sign-in");
      if (r.status === 402) return (window.location.href = "/subscribe");
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        const errorMsg = errorData.error || errorData.message || `HTTP ${r.status}: ${r.statusText}`;
        
        // Log full error details for debugging
        console.error("API Error:", {
          status: r.status,
          statusText: r.statusText,
          error: errorData,
        });
        
        if (r.status === 429) {
          // Rate limit error
          console.warn("Rate limit hit. To fix:", {
            method1: "Add DISABLE_RATE_LIMIT=true to .env.local and restart server",
            method2: "Restart dev server to clear rate limit store",
            method3: "Wait 5 minutes for rate limit to reset",
          });
        }
        
        throw new Error(errorMsg);
      }
      const data = await r.json();
      console.log("API Response:", data); // Debug log
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
      const reply = data.data?.text ?? data.text ?? data.message ?? "No response";
      if (reply === "No response") {
        console.error("No response from API:", data);
      }
              const full = [...next, { role: "assistant", content: reply } as Msg];
      setMessages(full);
      const title = next[0]?.content?.slice(0, 36) || "New chat";
      const threadId = data.sessionId ?? sessionId ?? crypto.randomUUID();
      const updated: Thread = { id: threadId, title, createdAt: Date.now(), preview: reply.slice(0, 60), messages: full, folderId: null };
      setThreads((t) => {
        const rest = t.filter((x) => x.id !== threadId);
        return [updated, ...rest].slice(0, 40);
      });
      
      // Save to database (non-blocking)
      fetch("/api/chat/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          messages: full,
        }),
      }).catch(() => {
        // Ignore errors - database save is non-critical
      });
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = error instanceof Error ? error.message : "Error calling API. Please check the console for details.";
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "Plan a 2,500 kcal pescatarian day (no nuts)",
    "Create a fasting protocol for weight loss",
    "Calculate my macros for muscle gain, 75kg",
    "Optimize my sleep schedule",
    "Recommend supplements for longevity",
    "Design a cold plunge protocol",
    "Help me manage stress and anxiety",
    "Create a recovery protocol after strength training",
  ];

  return (
    <div className="w-full grid gap-4
                grid-cols-1
                md:grid-cols-[240px_minmax(1000px,1fr)_280px]">
      {/* SIDEBAR */}
      <aside className={`${pane} p-3 h-[72vh] flex flex-col`}>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="font-medium tracking-tight">BioFlo</div>
          <button
            onClick={newThread}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg
                       bg-gradient-to-r from-sky-400 to-emerald-400 text-black text-xs font-medium
                       shadow-[0_8px_18px_rgba(56,189,248,0.28)] hover:brightness-110 transition"
          >
            <Plus className="size-3" /> New
          </button>
        </div>

        <div className="flex items-center justify-between px-1 mb-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="size-3" /> Chats
          </div>
          <button
            onClick={createFolder}
            className="text-[10px] text-slate-400 hover:text-white transition px-1.5 py-0.5 rounded hover:bg-white/5"
            title="Create folder"
          >
            + Folder
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-1 space-y-1 pr-1">
          {/* Folders */}
          {folders.map((folder) => {
            const folderThreads = threads.filter((t) => t.folderId === folder.id);
            const isExpanded = expandedFolders.has(folder.id);
            const isEditing = editingFolder === folder.id;

            return (
              <div key={folder.id} className="mb-1">
                <div className="flex items-center gap-1 group">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/6 hover:text-white transition"
                  >
                    <ChevronRight className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    {isEditing ? (
                      <input
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onBlur={() => renameFolder(folder.id, folderName)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renameFolder(folder.id, folderName);
                          } else if (e.key === "Escape") {
                            setEditingFolder(null);
                            setFolderName("");
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-black/20 border border-white/15 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <>
                        <Folder className="size-3" />
                        <span className="flex-1 truncate">{folder.name}</span>
                        <span className="text-[10px] text-slate-500">({folderThreads.length})</span>
                      </>
                    )}
                  </button>
                  {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder.id);
                          setFolderName(folder.name);
                        }}
                        className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                        title="Rename folder"
                      >
                        <Cog className="size-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                        className="p-0.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                        title="Delete folder"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {folderThreads.map((t) => (
                      <ThreadItem
                        key={t.id}
                        thread={t}
                        isActive={sessionId === t.id}
                        onSelect={async () => {
                          setMessages(t.messages);
                          setSessionId(t.id);
                          try {
                            const res = await fetch(`/api/chat/history?threadId=${t.id}`);
                            const data = await res.json();
                            if (data.success && data.data?.messages?.length > 0) {
                              setMessages(data.data.messages);
                            }
                          } catch (e) {
                            // Use localStorage messages if DB fails
                          }
                        }}
                        onDelete={() => deleteThread(t.id)}
                        onRename={(newName) => renameThread(t.id, newName)}
                        onMoveToFolder={(folderId) => moveThreadToFolder(t.id, folderId)}
                        folders={folders}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized threads */}
          {threads.filter((t) => !t.folderId || !folders.find((f) => f.id === t.folderId)).length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] text-slate-500 px-2 mb-1">Uncategorized</div>
              {threads
                .filter((t) => !t.folderId || !folders.find((f) => f.id === t.folderId))
                .map((t) => (
                  <ThreadItem
                    key={t.id}
                    thread={t}
                    isActive={sessionId === t.id}
                    onSelect={async () => {
                      setMessages(t.messages);
                      setSessionId(t.id);
                      try {
                        const res = await fetch(`/api/chat/history?threadId=${t.id}`);
                        const data = await res.json();
                        if (data.success && data.data?.messages?.length > 0) {
                          setMessages(data.data.messages);
                        }
                      } catch (e) {
                        // Use localStorage messages if DB fails
                      }
                    }}
                    onDelete={() => deleteThread(t.id)}
                    onRename={(newName) => renameThread(t.id, newName)}
                    onMoveToFolder={(folderId) => moveThreadToFolder(t.id, folderId)}
                    folders={folders}
                  />
                ))}
            </div>
          )}

          {threads.length === 0 && (
            <div className="px-2 py-4 text-xs text-slate-500 text-center">No chats yet</div>
          )}
        </div>

        <div className="mt-2 p-2 rounded-lg border border-white/10 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Cog className="size-3" /> Tools
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Meal planner, sleep tuner & more (coming soon).
          </p>
        </div>
      </aside>

      {/* CONVERSATION */}
      <section className={`${pane} h-[72vh] flex flex-col`}>
        {/* suggestion pills */}
        <div className="p-3 border-b border-white/10 flex items-center gap-2 overflow-x-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 whitespace-nowrap"
            >
              <Sparkles className="inline size-3 mr-1" />
              {s}
            </button>
          ))}
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="grid place-items-center h-full text-slate-400 text-sm">
              Ask anything to get started.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div
                className={`inline-block max-w-[92%] md:max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-sky-400 to-emerald-400 text-black shadow-[0_8px_18px_rgba(56,189,248,0.28)]"
                    : "bg-white/[0.06] border border-white/10"
                }`}
              >
                {m.role === "assistant" ? (
                  <MessageWithCopy content={m.content} />
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="size-4 animate-spin" /> Thinking…
            </div>
          )}
        </div>

        {/* composer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl px-3 py-2">
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Send a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="size-9 grid place-items-center rounded-xl bg-white text-black disabled:opacity-50"
              title="Send"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 text-center">
            Educational only · Not medical advice
          </div>
        </div>
      </section>

      {/* TOOLS PANEL */}
      <aside className={`${pane} hidden md:flex p-4 h-[72vh]`}>
        <div className="text-sm text-slate-300">
          <div className="font-medium">Tools</div>
          <p className="text-slate-400 text-xs mt-1">
            When the agent triggers a tool (e.g., meal planner), we'll show inputs/outputs here.
          </p>
        </div>
      </aside>
    </div>
  );
}
