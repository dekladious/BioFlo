#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Runs a specific migration file against your database.
 * 
 * Usage:
 *   node scripts/run-migration.js                          # Run all pending migrations
 *   node scripts/run-migration.js 004_manual_tracking.sql  # Run specific migration
 * 
 * Make sure DATABASE_URL is set in your .env.local file first!
 */

import { readFile, readdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Pool } from "pg";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
const MIGRATIONS_DIR = join(__dirname, "..", "lib", "db", "migrations");

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found in .env.local");
  console.error("\nPlease add DATABASE_URL to your .env.local file:");
  console.error("DATABASE_URL=postgresql://user:password@host/database");
  process.exit(1);
}

async function runMigration(migrationName) {
  console.log("🚀 Running database migration...\n");

  // Supabase and most cloud providers require SSL
  const requiresSSL = DATABASE_URL.includes("supabase") || 
                      DATABASE_URL.includes("neon") || 
                      DATABASE_URL.includes("railway") ||
                      process.env.NODE_ENV === "production";
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: requiresSSL ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    console.log("📡 Testing database connection...");
    await pool.query("SELECT 1");
    console.log("✅ Database connection successful!\n");

    // Get migration files
    let migrations = [];
    
    if (migrationName) {
      // Run specific migration
      migrations = [migrationName];
    } else {
      // Run all migrations in order
      const files = await readdir(MIGRATIONS_DIR);
      migrations = files
        .filter(f => f.endsWith(".sql"))
        .sort();
    }

    if (migrations.length === 0) {
      console.log("⚠️  No migrations found.");
      return;
    }

    console.log(`📋 Running ${migrations.length} migration(s)...\n`);

    for (const migration of migrations) {
      const migrationPath = join(MIGRATIONS_DIR, migration);
      
      console.log(`  🔄 Running: ${migration}`);
      
      try {
        const sql = await readFile(migrationPath, "utf-8");
        await pool.query(sql);
        console.log(`  ✅ Completed: ${migration}\n`);
      } catch (err) {
        // Some errors are OK (like "already exists")
        if (err.message.includes("already exists") || err.message.includes("duplicate")) {
          console.log(`  ⚠️  Skipped (already applied): ${migration}\n`);
        } else {
          throw err;
        }
      }
    }

    // List all tables
    console.log("📊 Current database tables:");
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    tables.rows.forEach((row) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log("\n✅ Migration complete!");
    
  } catch (error) {
    console.error("\n❌ Error running migration:");
    console.error(error.message);
    
    if (error.message.includes("does not exist")) {
      console.error("\n💡 Tip: Make sure you've run the base schema first: pnpm db:setup");
    } else if (error.message.includes("password authentication")) {
      console.error("\n💡 Tip: Check your DATABASE_URL credentials.");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Tip: Check that your database server is running.");
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get migration name from command line
const migrationArg = process.argv[2];
runMigration(migrationArg);

