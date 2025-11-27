/**
 * Ultrahuman Integration
 * 
 * Main export file for Ultrahuman Ring / M1 CGM integration
 */

// Configuration
export { 
  ULTRAHUMAN_CONFIG, 
  ULTRAHUMAN_ENDPOINTS,
  getUltrahumanCredentials,
  buildAuthorizationUrl,
  type UltrahumanScope,
} from "./config";

// Types
export type {
  UltrahumanTokenResponse,
  UltrahumanTokenRecord,
  UltrahumanProfile,
  UltrahumanSleepData,
  UltrahumanRecoveryData,
  UltrahumanHeartRateData,
  UltrahumanHrvData,
  UltrahumanActivityData,
  UltrahumanTemperatureData,
  UltrahumanGlucoseData,
  UltrahumanMetabolicData,
  UltrahumanDailySummary,
  UltrahumanApiResponse,
} from "./types";

// Client functions
export {
  // Token management
  exchangeCodeForTokens,
  refreshAccessToken,
  saveTokens,
  getTokens,
  deleteTokens,
  getValidAccessToken,
  
  // Data fetching
  getProfile,
  getSleepData,
  getRecoveryData,
  getHeartRateData,
  getHrvData,
  getActivityData,
  getTemperatureData,
  getGlucoseData,
  fetchDailySummary,
  
  // Sync operations
  syncUserData,
  
  // Connection status
  isConnected,
  getConnectionStatus,
} from "./client";

