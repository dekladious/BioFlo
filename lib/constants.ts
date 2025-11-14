// Constants for BioFlo

export const PRICING = {
  MONTHLY_PRICE: 14.99,
  CURRENCY: "GBP",
  CURRENCY_SYMBOL: "£",
} as const;

export const CHAT = {
  MAX_MESSAGE_LENGTH: 10000,
  MAX_MESSAGES: 50,
} as const;

export const STRIPE = {
  API_VERSION: "2024-06-20" as const,
} as const;

// Rate limiting constants
export const RATE_LIMITS = {
  CHAT: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: process.env.NODE_ENV === "development" ? 100 : 20, // More lenient in dev
  },
} as const;

