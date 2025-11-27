/**
 * BioFlo Application Constants
 * 
 * Centralized constants to eliminate magic numbers and ensure consistency.
 * All values should be documented with their purpose and valid ranges.
 */

// ============================================
// Pricing
// ============================================

export const PRICING = {
  MONTHLY_PRICE: 14.99,
  CURRENCY: "GBP",
  CURRENCY_SYMBOL: "£",
} as const;

// ============================================
// Chat Configuration
// ============================================

export const CHAT = {
  MAX_MESSAGE_LENGTH: 10000,
  MAX_MESSAGES: 50,
} as const;

// ============================================
// Stripe Configuration
// ============================================

export const STRIPE = {
  API_VERSION: "2024-06-20" as const,
} as const;

// ============================================
// Goal Modes
// ============================================

/** Available goal modes that affect plan generation and recommendations */
export const GOAL_MODES = [
  "NORMAL",
  "RECOVERY", 
  "TRAVEL",
  "DEEP_WORK",
  "RESET",
  "GROWTH",
] as const;

export type GoalMode = (typeof GOAL_MODES)[number];

/** Default goal mode for new users */
export const DEFAULT_GOAL_MODE: GoalMode = "NORMAL";

// ============================================
// AI Configuration
// ============================================

/** Default timeout for AI API calls in milliseconds */
export const AI_TIMEOUT_MS = 30_000;

/** Maximum tokens for AI responses */
export const AI_MAX_TOKENS = {
  chat: 2000,
  plan: 1500,
  assessment: 1000,
  judge: 500,
} as const;

/** Temperature settings for AI responses */
export const AI_TEMPERATURE = {
  creative: 0.8,
  balanced: 0.7,
  precise: 0.4,
  deterministic: 0.1,
} as const;

// ============================================
// Rate Limiting
// ============================================

/** Rate limit configuration for different endpoint types */
export const RATE_LIMITS = {
  /** Chat endpoint: 20 requests per 5 minutes per user (more lenient in dev) */
  CHAT: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: process.env.NODE_ENV === "development" ? 100 : 20,
  },
  /** General API: 100 requests per minute per user */
  API: { windowMs: 60_000, maxRequests: 100 },
  /** Auth endpoints: 10 requests per minute per IP */
  AUTH: { windowMs: 60_000, maxRequests: 10 },
  /** Expensive operations: 5 per minute */
  EXPENSIVE: { windowMs: 60_000, maxRequests: 5 },
} as const;

// ============================================
// Time Constants
// ============================================

/** Milliseconds in common time periods */
export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

/** Default date ranges for data queries (in days) */
export const DEFAULT_DATE_RANGES = {
  CHECK_INS: 7,
  TRENDS: 30,
  EXPERIMENTS: 90,
} as const;

// ============================================
// Validation Limits
// ============================================

/** Maximum lengths for user input */
export const MAX_LENGTHS = {
  CHAT_MESSAGE: 4000,
  CHECK_IN_NOTES: 1000,
  EXPERIMENT_NAME: 100,
  HABIT_NAME: 100,
} as const;

/** Valid ranges for numeric inputs */
export const VALID_RANGES = {
  /** Mood, energy, sleep quality (1-10 scale) */
  RATING: { min: 1, max: 10 },
  /** Days for date range queries */
  QUERY_DAYS: { min: 1, max: 365 },
  /** HRV in milliseconds */
  HRV: { min: 10, max: 200 },
  /** Resting heart rate in BPM */
  RESTING_HR: { min: 30, max: 120 },
} as const;

// ============================================
// Database Configuration
// ============================================

/** Database pool configuration */
export const DB_POOL_CONFIG = {
  MAX_CONNECTIONS: 20,
  IDLE_TIMEOUT_MS: 30_000,
  CONNECTION_TIMEOUT_MS: 2000,
} as const;

// ============================================
// Security
// ============================================

/** Token refresh buffer - refresh before expiry by this amount */
export const TOKEN_REFRESH_BUFFER_MS = 60 * 60 * 1000; // 1 hour

/** Session timeout */
export const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Maximum rate limit store entries before forced cleanup */
export const MAX_RATE_LIMIT_ENTRIES = 10_000;

// ============================================
// HTTP Status Codes (for consistency)
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;
