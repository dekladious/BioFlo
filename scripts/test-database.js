#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * Tests the database connection and shows current status.
 * 
 * Usage:
 *   node scripts/test-database.js
 */

import { Pool } from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

async function testDatabase() {
  console.log("🧪 Testing BioFlo database connection...\n");

  if (!DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set in .env.local");
    console.log("   The app will work with localStorage fallback only.\n");
    console.log("To enable database features:");
    console.log("1. Sign up for a free Postgres database (Neon, Supabase, or Railway)");
    console.log("2. Add DATABASE_URL to .env.local");
    console.log("3. Run: node scripts/setup-database.js\n");
    return;
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    console.log("📡 Testing connection...");
    await pool.query("SELECT 1");
    console.log("✅ Connection successful!\n");

    // Check tables
    console.log("📊 Checking tables...");
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const expectedTables = ["users", "chat_messages", "user_preferences", "tool_usage"];
    const existingTables = tables.rows.map((r) => r.table_name);

    console.log("\nTables found:");
    expectedTables.forEach((table) => {
      const exists = existingTables.includes(table);
      console.log(`   ${exists ? "✅" : "❌"} ${table}`);
    });

    if (existingTables.length === 0) {
      console.log("\n⚠️  No tables found. Run: node scripts/setup-database.js");
    } else if (existingTables.length < expectedTables.length) {
      console.log("\n⚠️  Some tables are missing. Run: node scripts/setup-database.js");
    } else {
      console.log("\n✅ All tables present!");
    }

    // Check row counts
    if (existingTables.length > 0) {
      console.log("\n📈 Current data:");
      for (const table of existingTables) {
        try {
          const count = await pool.query(`SELECT COUNT(*) FROM ${table}`);
          console.log(`   ${table}: ${count.rows[0].count} rows`);
        } catch (e) {
          // Ignore errors
        }
      }
    }

    console.log("\n✅ Database is ready!");
  } catch (error) {
    console.error("\n❌ Database connection failed:");
    console.error(`   ${error.message}\n`);

    if (error.message.includes("does not exist")) {
      console.log("💡 Tip: Make sure the database exists.");
    } else if (error.message.includes("password authentication")) {
      console.log("💡 Tip: Check your DATABASE_URL credentials.");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.log("💡 Tip: Check that your database server is running.");
    } else if (error.message.includes("DATABASE_URL")) {
      console.log("💡 Tip: Make sure DATABASE_URL is set correctly in .env.local");
    }
  } finally {
    await pool.end();
  }
}

testDatabase();

