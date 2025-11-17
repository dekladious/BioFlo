// Simple in-memory rate limiter
// For production, consider using Redis or Upstash

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Track last cleanup time to prevent excessive cleanup operations
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes
const MAX_STORE_SIZE = 10000; // Maximum entries before forced cleanup

// Cleanup expired entries
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  // If store is still too large, remove oldest entries
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    const entries = Array.from(rateLimitStore.entries())
      .sort((a, b) => a[1].resetAt - b[1].resetAt);
    
    const toRemove = rateLimitStore.size - MAX_STORE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      rateLimitStore.delete(entries[i][0]);
    }
  }
  
  lastCleanupTime = now;
}

// Export function to clear rate limit store (useful for testing)
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
  lastCleanupTime = Date.now();
}

// Export function to get current rate limit status
export function getRateLimitStatus(identifier: string): RateLimitEntry | null {
  return rateLimitStore.get(identifier) || null;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically (every 5 minutes or if store is too large)
  if (now - lastCleanupTime > CLEANUP_INTERVAL_MS || rateLimitStore.size > MAX_STORE_SIZE) {
    cleanupExpiredEntries();
  }

  if (!entry || entry.resetAt < now) {
    // New window or expired window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Helper to get identifier from request (IP address or user ID)
export function getRateLimitIdentifier(userId?: string, ip?: string): string {
  return userId ? `user:${userId}` : `ip:${ip || "unknown"}`;
}

