#!/usr/bin/env node

/**
 * Setup Analytics Tables
 * 
 * Runs the analytics schema SQL to create analytics tables in Supabase/Postgres
 * 
 * Usage:
 *   node scripts/setup-analytics-tables.js
 * 
 * Make sure DATABASE_URL is set in your .env.local file first!
 */

import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { config } from "dotenv";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found in .env.local");
  console.error("\nPlease add DATABASE_URL to your .env.local file:");
  console.error("DATABASE_URL=postgresql://user:password@host:port/database");
  process.exit(1);
}

// Create database connection
const requiresSSL = DATABASE_URL.includes("supabase") || 
                    DATABASE_URL.includes("neon") || 
                    DATABASE_URL.includes("railway") ||
                    process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: requiresSSL ? { rejectUnauthorized: false } : false,
});


async function setupAnalyticsTables() {
  try {
    console.log("📊 Setting up analytics tables...\n");

    // Read the SQL file
    const sqlPath = join(__dirname, "../lib/db/analytics-schema.sql");
    const sql = readFileSync(sqlPath, "utf-8");

    // Parse SQL statements more carefully
    // Remove comments first
    let cleanSql = sql
      .split("\n")
      .map((line) => {
        // Remove inline comments
        const commentIndex = line.indexOf("--");
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .join("\n");

    // Split by semicolons and filter
    const allStatements = cleanSql
      .split(";")
      .map((s) => s.trim().replace(/\s+/g, " "))
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    // Separate CREATE TABLE and CREATE INDEX statements
    const createTableStatements = allStatements.filter((s) => 
      s.toUpperCase().startsWith("CREATE TABLE")
    );
    const createIndexStatements = allStatements.filter((s) => 
      s.toUpperCase().startsWith("CREATE INDEX")
    );
    const statements = [...createTableStatements, ...createIndexStatements];

    console.log(`Found ${statements.length} SQL statements to execute (${createTableStatements.length} tables, ${createIndexStatements.length} indexes)\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      try {
        await pool.query(statement);
        const statementType = statement.toUpperCase().startsWith("CREATE TABLE") ? "table" : "index";
        console.log(`✓ Created ${statementType} ${i + 1}/${statements.length}`);
      } catch (error) {
        // Some statements might fail if tables/indexes already exist (IF NOT EXISTS)
        const errorMsg = error.message || String(error);
        if (
          errorMsg.includes("already exists") ||
          errorMsg.includes("duplicate") ||
          (errorMsg.includes("relation") && errorMsg.includes("already exists"))
        ) {
          const statementType = statement.toUpperCase().startsWith("CREATE TABLE") ? "table" : "index";
          console.log(`⚠ ${statementType} ${i + 1} skipped (already exists)`);
        } else {
          console.error(`\n✗ Failed to execute statement ${i + 1}:`);
          console.error(`  ${errorMsg}`);
          console.error(`\nStatement was:\n${statement.substring(0, 200)}...`);
          throw error;
        }
      }
    }

    console.log("\n✅ Analytics tables setup complete!");
    console.log("\nCreated/verified tables:");
    console.log("  ✓ ai_users");
    console.log("  ✓ analytics_events");
    console.log("  ✓ system_health_checks");
    console.log("  ✓ api_errors");
    console.log("\nYou can now use the analytics features!");
    
    // Close connection
    await pool.end();
  } catch (error) {
    console.error("\n❌ Failed to setup analytics tables");
    console.error("Error:", error.message || error);
    console.error("\nMake sure:");
    console.error("  1. DATABASE_URL is set correctly in .env.local");
    console.error("  2. Your database is accessible");
    console.error("  3. You have permissions to create tables");
    await pool.end();
    process.exit(1);
  }
}

setupAnalyticsTables();

