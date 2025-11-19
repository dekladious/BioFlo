// Environment variable validation

interface EnvConfig {
  required: string[];
  optional?: string[];
}

const requiredEnvVars = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
] as const;

const optionalEnvVars = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "APP_BASE_URL",
  "CLERK_SIGN_IN_URL",
  "CLERK_SIGN_UP_URL",
  "STRIPE_BILLING_PORTAL_URL",
] as const;

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || "";
}

// Validated environment variables getter
export const env = {
  openai: {
    apiKey: () => getEnv("OPENAI_API_KEY"),
    cheapModel: () => getEnv("OPENAI_CHEAP_MODEL", "gpt-4o-mini"),
    expensiveModel: () => getEnv("OPENAI_EXPENSIVE_MODEL", "gpt-5"),
    embedModel: () => getEnv("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
  },
  anthropic: {
    apiKey: () => getEnv("ANTHROPIC_API_KEY"),
    judgeModel: () => getEnv("ANTHROPIC_JUDGE_MODEL", "claude-4-5-sonnet"),
  },
  analytics: {
    salt: () => getEnv("BIOFLO_ANALYTICS_SALT", "default-salt-change-in-production"),
  },
  clerk: {
    publishableKey: () => getEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    secretKey: () => getEnv("CLERK_SECRET_KEY"),
    signInUrl: () => getEnv("CLERK_SIGN_IN_URL", "/sign-in"),
    signUpUrl: () => getEnv("CLERK_SIGN_UP_URL", "/sign-up"),
  },
  stripe: {
    secretKey: () => getEnv("STRIPE_SECRET_KEY"),
    publishableKey: () => getEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    priceId: () => getEnv("STRIPE_PRICE_ID"),
    webhookSecret: () => getEnv("STRIPE_WEBHOOK_SECRET"),
    billingPortalUrl: () => getEnv("STRIPE_BILLING_PORTAL_URL"),
  },
  app: {
    baseUrl: () => getEnv("APP_BASE_URL"),
  },
};

