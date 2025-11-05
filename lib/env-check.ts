// Environment variable validation at startup
// Call this in your app initialization or during build

import { validateEnv } from "./env";
import { logger } from "./logger";

export function checkEnvOnStartup(): void {
  if (typeof window !== "undefined") {
    // Client-side - skip validation
    return;
  }

  const result = validateEnv();
  
  if (!result.valid) {
    logger.error("Environment validation failed", new Error(`Missing required environment variables: ${result.missing.join(", ")}`));
    throw new Error(`Missing required environment variables: ${result.missing.join(", ")}`);
  }

  logger.info("Environment validation passed");
}

