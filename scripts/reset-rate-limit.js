#!/usr/bin/env node

/**
 * Reset Rate Limit Script
 * 
 * Clears the in-memory rate limit store by restarting the server.
 * Or you can manually clear it by restarting pnpm dev.
 * 
 * This script is informational - the rate limit store is in-memory
 * and clears when the server restarts.
 */

console.log("📋 Rate Limit Reset Guide\n");
console.log("The rate limit store is in-memory and clears when you restart the server.\n");
console.log("To reset rate limits:\n");
console.log("1. Stop your dev server (Ctrl+C)");
console.log("2. Start it again: pnpm dev\n");
console.log("Or add to .env.local to disable rate limiting:");
console.log("   DISABLE_RATE_LIMIT=true\n");
console.log("Then restart the server.\n");
console.log("✅ Rate limits will be reset/disabled after restart!");

