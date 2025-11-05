// Simple structured logging utility

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

function formatLog(entry: LogEntry): string {
  const { level, message, timestamp, userId, metadata } = entry;
  const parts = [
    `[${timestamp}]`,
    level.toUpperCase().padEnd(5),
    message,
    userId ? `[user:${userId}]` : "",
    metadata ? JSON.stringify(metadata) : "",
  ].filter(Boolean);
  return parts.join(" ");
}

export const logger = {
  info(message: string, metadata?: Record<string, any>, userId?: string) {
    const entry: LogEntry = {
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      userId,
      metadata,
    };
    console.log(formatLog(entry));
  },

  warn(message: string, metadata?: Record<string, any>, userId?: string) {
    const entry: LogEntry = {
      level: "warn",
      message,
      timestamp: new Date().toISOString(),
      userId,
      metadata,
    };
    console.warn(formatLog(entry));
  },

  error(message: string, error?: Error | unknown, userId?: string) {
    const entry: LogEntry = {
      level: "error",
      message,
      timestamp: new Date().toISOString(),
      userId,
      metadata: error instanceof Error 
        ? { error: error.message, stack: error.stack }
        : { error: String(error) },
    };
    console.error(formatLog(entry));
  },

  debug(message: string, metadata?: Record<string, any>, userId?: string) {
    if (process.env.NODE_ENV === "development") {
      const entry: LogEntry = {
        level: "debug",
        message,
        timestamp: new Date().toISOString(),
        userId,
        metadata,
      };
      console.debug(formatLog(entry));
    }
  },
};

