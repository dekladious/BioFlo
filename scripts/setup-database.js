#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script helps you set up the BioFlo database schema.
 * 
 * Usage:
 *   node scripts/setup-database.js
 * 
 * Make sure DATABASE_URL is set in your .env.local file first!
 */

import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Pool } from "pg";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found in .env.local");
  console.error("\nPlease add DATABASE_URL to your .env.local file:");
  console.error("DATABASE_URL=postgresql://user:password@host/database");
  console.error("\nSee README_DATABASE_SETUP.md for setup instructions.");
  process.exit(1);
}

async function setupDatabase() {
  console.log("🚀 Setting up BioFlo database...\n");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    console.log("📡 Testing database connection...");
    await pool.query("SELECT 1");
    console.log("✅ Database connection successful!\n");

    // Read schema file
    const schemaPath = join(__dirname, "..", "lib", "db", "schema.sql");
    const schema = await readFile(schemaPath, "utf-8");

    // Execute schema
    console.log("📋 Creating database schema...");
    await pool.query(schema);
    console.log("✅ Database schema created successfully!\n");

    // Verify tables
    console.log("🔍 Verifying tables...");
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log("\n📊 Created tables:");
    tables.rows.forEach((row) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log("\n✅ Database setup complete!");
    console.log("\nYou can now use BioFlo with full database persistence.");
  } catch (error) {
    console.error("\n❌ Error setting up database:");
    console.error(error.message);
    
    if (error.message.includes("does not exist")) {
      console.error("\n💡 Tip: Make sure the database exists and the user has proper permissions.");
    } else if (error.message.includes("password authentication")) {
      console.error("\n💡 Tip: Check your DATABASE_URL credentials.");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Tip: Check that your database server is running and accessible.");
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();

