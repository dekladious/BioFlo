#!/usr/bin/env node

/**
 * Quick analytics health check.
 *
 * - Confirms analytics tables exist
 * - Prints row counts for key tables
 * - Shows the latest analytics event (if any) for sanity checking
 *
 * Usage: node scripts/check-analytics.js
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Pool } from "pg";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in .env.local");
  console.error("Add it, then re-run: node scripts/check-analytics.js");
  process.exit(1);
}

const requiresSSL =
  DATABASE_URL.includes("supabase") ||
  DATABASE_URL.includes("neon") ||
  DATABASE_URL.includes("railway") ||
  process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: requiresSSL ? { rejectUnauthorized: false } : false,
});

async function checkTable(table) {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM ${table}`
    );
    console.log(`✅ ${table}: ${rows[0].count} rows`);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not exist")) {
      console.error(`⚠️  ${table} is missing. Run pnpm db:setup-analytics.`);
      return false;
    }
    console.error(`⚠️  Failed to query ${table}:`, error);
    return false;
  }
}

async function showLatestEvent() {
  try {
    const { rows } = await pool.query(
      `SELECT event_type, topic, risk, model_used, success, event_ts
       FROM analytics_events
       ORDER BY event_ts DESC
       LIMIT 1`
    );
    if (rows.length === 0) {
      console.log("ℹ️  analytics_events has no rows yet.");
    } else {
      console.log("📝 Latest analytics event:", rows[0]);
    }
  } catch (error) {
    console.error("⚠️  Could not fetch latest analytics event:", error);
  }
}

async function main() {
  console.log("🔍 Checking analytics tables...\n");
  const eventsOk = await checkTable("analytics_events");
  const usersOk = await checkTable("ai_users");
  const errorsOk = await checkTable("api_errors");
  const healthOk = await checkTable("system_health_checks");

  if (eventsOk) {
    await showLatestEvent();
  }

  await pool.end();

  if (eventsOk && usersOk && errorsOk && healthOk) {
    console.log("\n✅ Analytics tables look healthy.");
  } else {
    console.log("\n⚠️  Some analytics tables are missing or unreachable.");
  }
}

main().catch(async (error) => {
  console.error("❌ Analytics check failed:", error);
  await pool.end();
  process.exit(1);
});

