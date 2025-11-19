/**
 * Analytics User ID Hashing
 * 
 * Creates pseudonymous IDs for analytics without exposing real user IDs.
 */

import crypto from "crypto";
import { env } from "@/lib/env";

/**
 * Generate a pseudonymous AI user ID from a real user ID or fallback key
 * 
 * This creates a one-way hash that cannot be reversed to get the real user ID.
 * Used for analytics to maintain privacy while allowing user-level tracking.
 */
export function getAiUserId(realUserId?: string | null, fallbackKey?: string): string {
  const salt = env.analytics.salt();
  
  // Use real user ID if available, otherwise use fallback or anonymous
  const input = realUserId || fallbackKey || "anon";
  
  // Create SHA-256 hash: hash(salt + ":" + input)
  const hash = crypto
    .createHash("sha256")
    .update(`${salt}:${input}`)
    .digest("hex");
  
  // Return first 32 chars (64 hex chars = 32 bytes, but we'll use 32 for readability)
  return `ai_${hash.substring(0, 32)}`;
}

