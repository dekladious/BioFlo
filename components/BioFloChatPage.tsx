"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  FolderPlus,
  Loader2,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  User,
  X,
  Folder,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useChatFolders } from "@/lib/hooks/useChatFolders";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ThreadSummary = {
  id: string;
  title: string | null;
  createdAt: string;
  messageCount: number;
};

const createMessageId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

// Premium markdown renderer with beautiful typography
function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;

  // Parse content into structured blocks
  const parseContent = (text: string) => {
    const lines = text.split('\n');
    const blocks: Array<{
      type: 'heading' | 'paragraph' | 'list' | 'numbered' | 'quote' | 'code' | 'divider' | 'keyvalue';
      level?: number;
      items?: string[];
      content?: string;
      lang?: string;
    }> = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        i++;
        continue;
      }

      // Dividers
      if (trimmed === '---' || trimmed === '***') {
        blocks.push({ type: 'divider' });
        i++;
        continue;
      }

      // Headers
      const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headerMatch) {
        blocks.push({
          type: 'heading',
          level: headerMatch[1].length,
          content: headerMatch[2],
        });
        i++;
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        blocks.push({ type: 'code', content: codeLines.join('\n'), lang });
        i++;
        continue;
      }

      // Blockquotes
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        blocks.push({ type: 'quote', content: quoteLines.join(' ') });
        continue;
      }

      // Numbered lists
      if (trimmed.match(/^\d+\.\s/)) {
        const items: string[] = [];
        while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
          items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
          i++;
        }
        blocks.push({ type: 'numbered', items });
        continue;
      }

      // Bullet lists
      if (trimmed.match(/^[-*•]\s/)) {
        const items: string[] = [];
        while (i < lines.length && lines[i].trim().match(/^[-*•]\s/)) {
          items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
          i++;
        }
        blocks.push({ type: 'list', items });
        continue;
      }

      // Key-value pairs (like Duration: 5 min)
      if (trimmed.match(/^[A-Za-z][A-Za-z\s]*:\s*.+$/)) {
        const kvLines: string[] = [];
        while (i < lines.length && lines[i].trim().match(/^[A-Za-z][A-Za-z\s]*:\s*.+$/)) {
          kvLines.push(lines[i].trim());
          i++;
        }
        blocks.push({ type: 'keyvalue', items: kvLines });
        continue;
      }

      // Regular paragraphs
      const paraLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith('#') &&
        !lines[i].trim().startsWith('>') &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().match(/^[-*•]\s/) &&
        !lines[i].trim().match(/^\d+\.\s/)
      ) {
        paraLines.push(lines[i].trim());
        i++;
      }
      if (paraLines.length) {
        blocks.push({ type: 'paragraph', content: paraLines.join(' ') });
      }
    }

    return blocks;
  };

  const blocks = parseContent(content);

  return (
    <div className="space-y-5 font-[system-ui]">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'divider':
            return (
              <div key={idx} className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            );

          case 'heading':
            const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;
            const headingStyles: Record<number, string> = {
              1: 'text-xl font-bold text-white tracking-tight',
              2: 'text-lg font-semibold text-white tracking-tight border-b border-white/10 pb-2',
              3: 'text-base font-semibold text-white',
              4: 'text-sm font-medium text-white/90 uppercase tracking-wide',
            };
            return (
              <HeadingTag key={idx} className={headingStyles[block.level || 3]}>
                <InlineFormat text={block.content || ''} />
              </HeadingTag>
            );

          case 'paragraph':
            return (
              <p key={idx} className="text-[15px] leading-7 text-white/85">
                <InlineFormat text={block.content || ''} />
              </p>
            );

          case 'numbered':
            return (
              <ol key={idx} className="space-y-4">
                {block.items?.map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-400/20 text-sm font-bold text-teal-300 shadow-inner ring-1 ring-teal-400/30">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-[15px] leading-7 text-white/85 pt-0.5">
                      <InlineFormat text={item} />
                    </span>
                  </li>
                ))}
              </ol>
            );

          case 'list':
            return (
              <ul key={idx} className="space-y-3 pl-1">
                {block.items?.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/80" />
                    <span className="flex-1 text-[15px] leading-7 text-white/85">
                      <InlineFormat text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );

          case 'quote':
            return (
              <blockquote key={idx} className="relative pl-5 py-2">
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-teal-400 to-cyan-400" />
                <p className="text-[15px] leading-7 text-white/70 italic">
                  <InlineFormat text={block.content || ''} />
                </p>
              </blockquote>
            );

          case 'code':
            return (
              <div key={idx} className="rounded-xl bg-black/50 ring-1 ring-white/10 overflow-hidden">
                {block.lang && (
                  <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-white/50 font-mono">
                    {block.lang}
                  </div>
                )}
                <pre className="p-4 text-sm text-white/80 font-mono overflow-x-auto leading-relaxed">
                  {block.content}
                </pre>
              </div>
            );

          case 'keyvalue':
            return (
              <div key={idx} className="grid gap-2 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                {block.items?.map((item, i) => {
                  const colonIdx = item.indexOf(':');
                  const label = item.slice(0, colonIdx);
                  const value = item.slice(colonIdx + 1).trim();
                  return (
                    <div key={i} className="flex items-baseline gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-teal-400/90 min-w-[80px]">
                        {label}
                      </span>
                      <span className="text-[15px] text-white/80">
                        <InlineFormat text={value} />
                      </span>
                    </div>
                  );
                })}
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// Inline formatting component
function InlineFormat({ text }: { text: string }) {
  if (!text) return null;

  const segments: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Find the earliest match
    const patterns = [
      { regex: /`([^`]+)`/, type: 'code' },
      { regex: /\*\*([^*]+)\*\*/, type: 'bold' },
      { regex: /(?<!\*)\*([^*]+)\*(?!\*)/, type: 'italic' },
    ];

    let earliest: { index: number; length: number; content: string; type: string } | null = null;

    for (const { regex, type } of patterns) {
      const match = remaining.match(regex);
      if (match && match.index !== undefined) {
        if (!earliest || match.index < earliest.index) {
          earliest = {
            index: match.index,
            length: match[0].length,
            content: match[1],
            type,
          };
        }
      }
    }

    if (earliest) {
      // Add text before match
      if (earliest.index > 0) {
        segments.push(<span key={key++}>{remaining.slice(0, earliest.index)}</span>);
      }

      // Add formatted content
      switch (earliest.type) {
        case 'code':
          segments.push(
            <code key={key++} className="mx-0.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[13px] font-mono text-teal-300">
              {earliest.content}
            </code>
          );
          break;
        case 'bold':
          segments.push(
            <strong key={key++} className="font-semibold text-white">
              {earliest.content}
            </strong>
          );
          break;
        case 'italic':
          segments.push(
            <em key={key++} className="italic text-white/90">
              {earliest.content}
            </em>
          );
          break;
      }

      remaining = remaining.slice(earliest.index + earliest.length);
    } else {
      segments.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return <>{segments}</>;
}

export default function BioFloChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentRequestRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);

  const { 
    folders, 
    foldersById, 
    threadMeta, 
    createFolder, 
    deleteFolder,
    renameFolder,
    assignThreadToFolder, 
    setThreadTitle, 
    removeThread 
  } = useChatFolders();

  const stopStreaming = useCallback(() => {
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
      currentRequestRef.current = null;
    }
    setIsSending(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    return () => stopStreaming();
  }, [stopStreaming]);

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const response = await fetch("/api/chat/history?listAll=true");
      if (!response.ok) throw new Error("Failed to load");
      const data = await response.json();
      const list = Array.isArray(data?.data?.threads) ? data.data.threads : [];
      setThreads(list.map((t: any) => ({
        id: t.id,
        title: t.title || "New chat",
        createdAt: t.createdAt,
        messageCount: Number(t.messageCount || 0),
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  const loadThreadMessages = useCallback(async (threadId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/history?threadId=${encodeURIComponent(threadId)}`);
      if (!response.ok) throw new Error("Failed to load");
      const data = await response.json();
      const msgs = Array.isArray(data?.data?.messages) ? data.data.messages : [];
      setMessages(msgs.map((m: any) => ({
        id: m.id || createMessageId(),
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })));
      setSessionId(threadId);
      setActiveThreadId(threadId);
    } catch (err) {
      console.error(err);
      setError("Failed to load chat.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Organize threads by folder
  const normalizedThreads = useMemo(() => 
    threads.map((t) => ({
      ...t,
      displayTitle: threadMeta[t.id]?.customTitle?.trim() || t.title || "New chat",
      folderId: threadMeta[t.id]?.folderId,
    })),
    [threads, threadMeta]
  );

  const filteredThreads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return normalizedThreads.filter((t) => 
      term ? t.displayTitle.toLowerCase().includes(term) : true
    );
  }, [normalizedThreads, searchTerm]);

  const unfiledThreads = useMemo(() => 
    filteredThreads.filter(t => !t.folderId),
    [filteredThreads]
  );

  const threadsByFolder = useMemo(() => {
    const map = new Map<string, typeof filteredThreads>();
    folders.forEach(f => map.set(f.id, []));
    filteredThreads.forEach(t => {
      if (t.folderId && map.has(t.folderId)) {
        map.get(t.folderId)!.push(t);
      }
    });
    return map;
  }, [filteredThreads, folders]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    stopStreaming();
    const ensuredSession = sessionId || createMessageId();
    if (!sessionId) setSessionId(ensuredSession);
    if (!activeThreadId) setActiveThreadId(ensuredSession);

    const userMessage: ChatMessage = { id: createMessageId(), role: "user", content: trimmed };
    const assistantMessageId = createMessageId();

    setMessages((prev) => [...prev, userMessage, { id: assistantMessageId, role: "assistant", content: "" }]);
    setInput("");
    setIsSending(true);
    setError(null);

    const controller = new AbortController();
    currentRequestRef.current = controller;

    const setAssistantContent = (content: string) => {
      setMessages((prev) => prev.map((m) => m.id === assistantMessageId ? { ...m, content } : m));
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          sessionId: ensuredSession,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => null);
        setAssistantContent(err?.error || "Something went wrong.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let serverSessionId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.sessionId) serverSessionId = data.sessionId;
            if (data.type === "token" && data.value) {
              assistantText += data.value;
              setAssistantContent(assistantText);
            } else if (data.reply) {
              assistantText = data.reply;
              setAssistantContent(assistantText);
            }
          } catch {}
        }
      }

      if (serverSessionId) {
        setSessionId(serverSessionId);
        setActiveThreadId(serverSessionId);
      }
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") {
        setAssistantContent("Connection error. Please try again.");
      }
    } finally {
      currentRequestRef.current = null;
      setIsSending(false);
      loadThreads();
    }
  };

  const handleNewChat = () => {
    stopStreaming();
    setSessionId(createMessageId());
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
    setError(null);
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      await fetch(`/api/chat/history?threadId=${encodeURIComponent(threadId)}`, { method: "DELETE" });
      removeThread(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) handleNewChat();
    } catch (err) {
      console.error(err);
    }
    setMenuOpenId(null);
  };

  const handleRenameThread = (threadId: string) => {
    const thread = normalizedThreads.find(t => t.id === threadId);
    setEditingThreadId(threadId);
    setEditingTitle(thread?.displayTitle || "");
    setMenuOpenId(null);
  };

  const saveThreadTitle = () => {
    if (editingThreadId && editingTitle.trim()) {
      setThreadTitle(editingThreadId, editingTitle.trim());
    }
    setEditingThreadId(null);
    setEditingTitle("");
  };

  const handleCreateFolder = () => {
    const name = prompt("Folder name:");
    if (name?.trim()) createFolder(name.trim());
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm("Delete this folder? Chats will be moved to unfiled.")) {
      deleteFolder(folderId);
    }
    setFolderMenuId(null);
  };

  const handleRenameFolder = (folderId: string) => {
    const folder = foldersById.get(folderId);
    setEditingFolderId(folderId);
    setEditingFolderName(folder?.name || "");
    setFolderMenuId(null);
  };

  const saveFolderName = () => {
    if (editingFolderId && editingFolderName.trim()) {
      renameFolder(editingFolderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      composerFormRef.current?.requestSubmit();
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const ThreadItem = ({ thread }: { thread: typeof normalizedThreads[0] }) => {
    const isActive = activeThreadId === thread.id;
    const isEditing = editingThreadId === thread.id;
    const isMenuOpen = menuOpenId === thread.id;

    return (
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition cursor-pointer",
          isActive ? "bg-white/10" : "hover:bg-white/5"
        )}
        onClick={() => !isEditing && loadThreadMessages(thread.id)}
      >
        <MessageSquare className="size-4 shrink-0 text-white/40" />
        
        {isEditing ? (
          <input
            autoFocus
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={saveThreadTitle}
            onKeyDown={(e) => e.key === "Enter" && saveThreadTitle()}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent text-white outline-none"
          />
        ) : (
          <span className="flex-1 truncate text-white/80">{thread.displayTitle}</span>
        )}

        <div className={cn(
          "flex items-center gap-1 opacity-0 transition group-hover:opacity-100",
          isMenuOpen && "opacity-100"
        )}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : thread.id); }}
            className="rounded p-1 hover:bg-white/10"
          >
            <MoreHorizontal className="size-4 text-white/60" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-white/10 bg-[#1a1a1f] py-1 shadow-xl">
            <button
              onClick={(e) => { e.stopPropagation(); handleRenameThread(thread.id); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              <Edit3 className="size-4" /> Rename
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteThread(thread.id); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10"
            >
              <Trash2 className="size-4" /> Delete
            </button>
            {folders.length > 0 && (
              <>
                <div className="my-1 border-t border-white/10" />
                <div className="px-3 py-1 text-xs text-white/40">Move to folder</div>
                <button
                  onClick={(e) => { e.stopPropagation(); assignThreadToFolder(thread.id, undefined); setMenuOpenId(null); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/10",
                    !thread.folderId ? "text-accent-primary" : "text-white/80"
                  )}
                >
                  Unfiled
                </button>
                {folders.map(f => (
                  <button
                    key={f.id}
                    onClick={(e) => { e.stopPropagation(); assignThreadToFolder(thread.id, f.id); setMenuOpenId(null); }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/10",
                      thread.folderId === f.id ? "text-accent-primary" : "text-white/80"
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const FolderItem = ({ folder }: { folder: { id: string; name: string } }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderThreads = threadsByFolder.get(folder.id) || [];
    const isEditing = editingFolderId === folder.id;
    const isMenuOpen = folderMenuId === folder.id;

    return (
      <div>
        <div
          className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5 cursor-pointer"
          onClick={() => toggleFolder(folder.id)}
        >
          {isExpanded ? <ChevronDown className="size-4 text-white/40" /> : <ChevronRight className="size-4 text-white/40" />}
          <Folder className="size-4 text-white/40" />
          
          {isEditing ? (
            <input
              autoFocus
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onBlur={saveFolderName}
              onKeyDown={(e) => e.key === "Enter" && saveFolderName()}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-transparent text-white outline-none"
            />
          ) : (
            <span className="flex-1 truncate text-white/80">{folder.name}</span>
          )}
          
          <span className="text-xs text-white/40">{folderThreads.length}</span>
          
          <button
            onClick={(e) => { e.stopPropagation(); setFolderMenuId(isMenuOpen ? null : folder.id); }}
            className={cn("rounded p-1 opacity-0 hover:bg-white/10 group-hover:opacity-100", isMenuOpen && "opacity-100")}
          >
            <MoreHorizontal className="size-4 text-white/60" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-4 z-50 mt-20 w-32 rounded-lg border border-white/10 bg-[#1a1a1f] py-1 shadow-xl">
              <button
                onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder.id); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                <Edit3 className="size-4" /> Rename
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10"
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="ml-4 border-l border-white/10 pl-2">
            {folderThreads.length === 0 ? (
              <p className="px-3 py-2 text-xs text-white/30">No chats</p>
            ) : (
              folderThreads.map(t => <ThreadItem key={t.id} thread={t} />)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#0d0d10]">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-white/10 bg-[#111114] transition-all duration-300",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        )}
      >
        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/5"
          >
            <Plus className="size-5" />
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <Search className="size-4 text-white/40" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            />
          </div>
        </div>

        {/* Folders Section */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-white/40">Folders</span>
            <button
              onClick={handleCreateFolder}
              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <FolderPlus className="size-4" />
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2">
          {threadsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-white/40" />
            </div>
          ) : (
            <div className="space-y-1">
              {/* Folders */}
              {folders.map(f => <FolderItem key={f.id} folder={f} />)}
              
              {/* Unfiled Chats */}
              {unfiledThreads.length > 0 && (
                <div className="pt-2">
                  {folders.length > 0 && (
                    <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-white/40">
                      Chats
                    </div>
                  )}
                  {unfiledThreads.map(t => <ThreadItem key={t.id} thread={t} />)}
                </div>
              )}

              {filteredThreads.length === 0 && !threadsLoading && (
                <p className="px-3 py-8 text-center text-sm text-white/40">
                  {searchTerm ? "No chats found" : "No chats yet"}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            {sidebarOpen ? <PanelLeftClose className="size-5" /> : <PanelLeft className="size-5" />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="font-medium text-white">BioFlo</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full bg-accent-success/10 px-3 py-1 text-xs text-accent-success">
              <span className="size-1.5 rounded-full bg-accent-success animate-pulse" />
              Online
            </span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isLoading ? (
            // Welcome Screen
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="relative mb-6">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 blur-2xl" />
                <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary">
                  <Sparkles className="size-8 text-white" />
                </div>
              </div>
              <h1 className="mb-2 text-2xl font-medium text-white">How can I help you today?</h1>
              <p className="mb-8 max-w-md text-center text-white/50">
                Ask me about sleep, nutrition, recovery, stress management, or any wellness topic.
              </p>
              
              <div className="grid max-w-2xl grid-cols-2 gap-3">
                {[
                  "Improve my sleep quality",
                  "Create a morning routine",
                  "Help with anxiety",
                  "Optimize my recovery",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-white/40" />
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={cn("mb-8", msg.role === "user" && "flex justify-end")}>
                  {msg.role === "user" ? (
                    // User message - compact bubble on right
                    <div className="flex items-start gap-3 max-w-[80%]">
                      <div className="rounded-2xl rounded-tr-md bg-accent-primary/20 border border-accent-primary/30 px-4 py-3">
                        <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                      </div>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary/20">
                        <User className="size-4 text-accent-primary" />
                      </div>
                    </div>
                  ) : (
                    // Assistant message - full width with structured content
                    <div className="flex items-start gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary shadow-lg shadow-accent-primary/20">
                        <Bot className="size-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {msg.content ? (
                          <div className="rounded-2xl rounded-tl-md bg-[#1a1a20] border border-white/10 px-6 py-5 shadow-lg">
                            <MarkdownContent content={msg.content} />
                          </div>
                        ) : (
                          <div className="rounded-2xl rounded-tl-md bg-[#1a1a20] border border-white/10 px-5 py-4">
                            <div className="flex items-center gap-3 text-white/50">
                              <div className="flex gap-1">
                                <span className="size-2 rounded-full bg-accent-primary/60 animate-bounce [animation-delay:-0.3s]" />
                                <span className="size-2 rounded-full bg-accent-primary/60 animate-bounce [animation-delay:-0.15s]" />
                                <span className="size-2 rounded-full bg-accent-primary/60 animate-bounce" />
                              </div>
                              <span className="text-sm">Thinking...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-auto max-w-3xl px-4">
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/10 p-4">
          <form
            ref={composerFormRef}
            onSubmit={handleSend}
            className="mx-auto max-w-3xl"
          >
            <div className="relative rounded-2xl border border-white/10 bg-white/5 transition focus-within:border-accent-primary/40">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message BioFlo..."
                rows={1}
                className="min-h-[52px] w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm text-white placeholder:text-white/40 outline-none"
              />
              
              <div className="absolute bottom-2 right-2">
                {isSending ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                  >
                    <Square className="size-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg transition",
                      input.trim()
                        ? "bg-accent-primary text-white hover:bg-accent-primary/90"
                        : "bg-white/10 text-white/40"
                    )}
                  >
                    <ArrowUp className="size-5" />
                  </button>
                )}
              </div>
            </div>
            
            <p className="mt-2 text-center text-xs text-white/30">
              BioFlo provides educational information only. Not medical advice.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
