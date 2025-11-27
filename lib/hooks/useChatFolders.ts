import { useCallback, useEffect, useMemo, useState } from "react";

export type ChatFolder = {
  id: string;
  name: string;
  createdAt: string;
};

export type ThreadMeta = Record<
  string,
  {
    folderId?: string;
    customTitle?: string;
  }
>;

const FOLDER_STORAGE_KEY = "bioflo-chat-folders";
const THREAD_META_STORAGE_KEY = "bioflo-chat-thread-meta";

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function generateId(prefix = "fld") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(16).slice(2)}`;
}

export function useChatFolders() {
  const [folders, setFolders] = useState<ChatFolder[]>(() => {
    if (typeof window === "undefined") return [];
    return safeParse<ChatFolder[]>(localStorage.getItem(FOLDER_STORAGE_KEY), []);
  });

  const [threadMeta, setThreadMeta] = useState<ThreadMeta>(() => {
    if (typeof window === "undefined") return {};
    return safeParse<ThreadMeta>(localStorage.getItem(THREAD_META_STORAGE_KEY), {});
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(THREAD_META_STORAGE_KEY, JSON.stringify(threadMeta));
  }, [threadMeta]);

  const createFolder = useCallback((name: string) => {
    const newFolder: ChatFolder = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder.id;
  }, []);

  const renameFolder = useCallback((folderId: string, name: string) => {
    setFolders((prev) =>
      prev.map((folder) => (folder.id === folderId ? { ...folder, name } : folder))
    );
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
    setThreadMeta((prev) => {
      const next: ThreadMeta = {};
      Object.entries(prev).forEach(([threadId, meta]) => {
        if (meta.folderId === folderId) {
          const { folderId: _removed, ...rest } = meta;
          next[threadId] = rest;
        } else {
          next[threadId] = meta;
        }
      });
      return next;
    });
  }, []);

  const assignThreadToFolder = useCallback((threadId: string, folderId?: string) => {
    setThreadMeta((prev) => ({
      ...prev,
      [threadId]: {
        ...prev[threadId],
        folderId,
      },
    }));
  }, []);

  const setThreadTitle = useCallback((threadId: string, title: string) => {
    setThreadMeta((prev) => ({
      ...prev,
      [threadId]: {
        ...prev[threadId],
        customTitle: title,
      },
    }));
  }, []);

  const removeThread = useCallback((threadId: string) => {
    setThreadMeta((prev) => {
      if (!prev[threadId]) return prev;
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
  }, []);

  const foldersById = useMemo(() => {
    const map = new Map<string, ChatFolder>();
    folders.forEach((folder) => map.set(folder.id, folder));
    return map;
  }, [folders]);

  return {
    folders,
    foldersById,
    threadMeta,
    createFolder,
    renameFolder,
    deleteFolder,
    assignThreadToFolder,
    setThreadTitle,
    removeThread,
  };
}




