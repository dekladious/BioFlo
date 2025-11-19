#!/usr/bin/env node

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found");
  process.exit(1);
}

const requiresSSL = DATABASE_URL.includes("supabase") || 
                    DATABASE_URL.includes("neon") || 
                    DATABASE_URL.includes("railway");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: requiresSSL ? { rejectUnauthorized: false } : false,
});

async function checkSchema() {
  try {
    // Check if documents table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log("📋 Documents table exists. Checking columns...");
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
        ORDER BY ordinal_position;
      `);
      
      console.log("\nColumns in documents table:");
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
      
      // Check if visibility column exists
      const hasVisibility = columns.rows.some(col => col.column_name === 'visibility');
      if (!hasVisibility) {
        console.log("\n⚠️  Missing 'visibility' column. Adding it...");
        await pool.query(`
          ALTER TABLE documents 
          ADD COLUMN visibility TEXT DEFAULT 'global' 
          CHECK (visibility IN ('global', 'private'));
        `);
        console.log("✅ Added visibility column");
      }
    } else {
      console.log("📋 Documents table does not exist yet.");
    }
    
    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();

