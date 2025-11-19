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

async function checkFunction() {
  try {
    // Check if match_documents function exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'match_documents'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log("✅ match_documents function exists");
      
      // Test the function with a dummy vector
      const testVector = Array(1536).fill(0.1);
      const vectorLiteral = `[${testVector.map(v => v.toFixed(6)).join(",")}]`;
      
      try {
        const testResult = await pool.query(
          `SELECT * FROM match_documents($1::vector, 5, NULL::uuid) LIMIT 1`,
          [vectorLiteral]
        );
        console.log(`✅ Function works! Found ${testResult.rows.length} test result(s)`);
      } catch (testError) {
        console.error("❌ Function test failed:", testError.message);
      }
    } else {
      console.error("❌ match_documents function does NOT exist");
      console.log("\n💡 Run: npm run db:setup to create it");
    }
    
    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
    process.exit(1);
  }
}

checkFunction();

