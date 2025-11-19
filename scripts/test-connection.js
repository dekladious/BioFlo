#!/usr/bin/env node

/**
 * Quick connection test to debug DATABASE_URL issues
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

console.log("Testing database connection...\n");

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

// Mask password for logging
const maskedUrl = DATABASE_URL.replace(/:[^:@]+@/, ":****@");
console.log("Connection string (masked):", maskedUrl);
console.log("Host:", DATABASE_URL.match(/@([^:]+):/)?.[1] || "not found");
console.log("Port:", DATABASE_URL.match(/:(\d+)\//)?.[1] || "not found");
console.log("Database:", DATABASE_URL.match(/\/([^?]+)/)?.[1] || "not found");
console.log("");

const requiresSSL = DATABASE_URL.includes("supabase") || 
                    DATABASE_URL.includes("neon") || 
                    DATABASE_URL.includes("railway");

console.log("SSL required:", requiresSSL);
console.log("");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: requiresSSL ? { rejectUnauthorized: false } : false,
});

try {
  console.log("Attempting connection...");
  const result = await pool.query("SELECT 1 as test, version() as pg_version");
  console.log("✅ Connection successful!");
  console.log("PostgreSQL version:", result.rows[0].pg_version);
  await pool.end();
} catch (error) {
  console.error("❌ Connection failed:");
  console.error("Error:", error.message);
  console.error("\nTroubleshooting:");
  console.error("1. Check that DATABASE_URL is correctly formatted");
  console.error("2. Ensure password is URL-encoded if it contains special characters");
  console.error("3. Verify the hostname is correct");
  console.error("4. Check if your IP is whitelisted in Supabase (Settings > Database > Connection Pooling)");
  await pool.end();
  process.exit(1);
}

