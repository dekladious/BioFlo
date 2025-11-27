/**
 * Ultrahuman API Configuration
 * 
 * OAuth 2.0 configuration for Ultrahuman Ring integration
 * Base URL: https://partner.ultrahuman.com
 * 
 * Required env vars:
 * - ULTRAHUMAN_CLIENT_ID
 * - ULTRAHUMAN_CLIENT_SECRET
 * - NEXT_PUBLIC_APP_URL (for redirect URI)
 */

export const ULTRAHUMAN_CONFIG = {
  // API Base URLs
  baseUrl: "https://partner.ultrahuman.com",
  authUrl: "https://partner.ultrahuman.com/oauth/authorize",
  tokenUrl: "https://partner.ultrahuman.com/oauth/token",
  
  // Available scopes
  scopes: {
    ring_data: "ring_data",     // Sleep, HRV, HR, temperature, activity
    cgm_data: "cgm_data",       // Glucose data (if user has CGM)
    profile: "profile",         // Basic user profile
  },
  
  // Default scopes to request
  defaultScopes: ["ring_data", "profile"],
  
  // Token refresh buffer (refresh 1 hour before expiry)
  tokenRefreshBufferMs: 60 * 60 * 1000,
  
  // Token validity (approximately 1 week)
  tokenValidityDays: 7,
} as const;

export type UltrahumanScope = keyof typeof ULTRAHUMAN_CONFIG.scopes;

// API Endpoints
export const ULTRAHUMAN_ENDPOINTS = {
  // User Profile
  profile: "/v1/user/profile",
  
  // Ring Data - Sleep
  sleep: "/v1/ring/sleep",           // GET /v1/ring/sleep?date=YYYY-MM-DD
  sleepRange: "/v1/ring/sleep/range", // GET /v1/ring/sleep/range?start=YYYY-MM-DD&end=YYYY-MM-DD
  
  // Ring Data - Recovery & Readiness
  recovery: "/v1/ring/recovery",      // GET /v1/ring/recovery?date=YYYY-MM-DD
  readiness: "/v1/ring/readiness",    // GET /v1/ring/readiness?date=YYYY-MM-DD
  
  // Ring Data - Heart
  heartRate: "/v1/ring/heart_rate",   // GET /v1/ring/heart_rate?date=YYYY-MM-DD
  hrv: "/v1/ring/hrv",                // GET /v1/ring/hrv?date=YYYY-MM-DD
  
  // Ring Data - Activity
  activity: "/v1/ring/activity",      // GET /v1/ring/activity?date=YYYY-MM-DD
  steps: "/v1/ring/steps",            // GET /v1/ring/steps?date=YYYY-MM-DD
  
  // Ring Data - Temperature
  temperature: "/v1/ring/temperature", // GET /v1/ring/temperature?date=YYYY-MM-DD
  
  // Ring Data - Scores
  movementIndex: "/v1/ring/movement_index",
  metabolicScore: "/v1/ring/metabolic_score",
  vo2max: "/v1/ring/vo2max",
  
  // CGM Data (if user has M1)
  glucose: "/v1/cgm/glucose",         // GET /v1/cgm/glucose?date=YYYY-MM-DD
  glucoseStats: "/v1/cgm/stats",      // GET /v1/cgm/stats?date=YYYY-MM-DD
} as const;

// Get client credentials from environment
export function getUltrahumanCredentials() {
  const clientId = process.env.ULTRAHUMAN_CLIENT_ID;
  const clientSecret = process.env.ULTRAHUMAN_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Ultrahuman credentials. Set ULTRAHUMAN_CLIENT_ID and ULTRAHUMAN_CLIENT_SECRET environment variables."
    );
  }
  
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/integrations/ultrahuman/callback`,
  };
}

// Build authorization URL
export function buildAuthorizationUrl(state: string, scopes?: UltrahumanScope[]): string {
  const { clientId, redirectUri } = getUltrahumanCredentials();
  const scopeList = scopes || ULTRAHUMAN_CONFIG.defaultScopes;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopeList.join(" "),
    state,
  });
  
  return `${ULTRAHUMAN_CONFIG.authUrl}?${params.toString()}`;
}

