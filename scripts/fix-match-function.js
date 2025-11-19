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

async function fixFunction() {
  try {
    console.log("Dropping old function...");
    await pool.query(`DROP FUNCTION IF EXISTS match_documents(vector, INTEGER, UUID)`);
    
    console.log("Creating new function...");
    await pool.query(`
      CREATE OR REPLACE FUNCTION match_documents(
        query_embedding vector(1536),
        match_count INTEGER DEFAULT 5,
        target_user_id UUID DEFAULT NULL
      )
      RETURNS TABLE (
        id UUID,
        user_id UUID,
        title TEXT,
        chunk TEXT,
        metadata JSONB,
        similarity DOUBLE PRECISION
      ) LANGUAGE plpgsql AS $$
      BEGIN
        RETURN QUERY
        SELECT
          d.id,
          d.user_id,
          d.title,
          d.chunk,
          d.metadata,
          1 - (d.embedding <=> query_embedding) AS similarity
        FROM documents d
        WHERE d.embedding IS NOT NULL
          AND (
            target_user_id IS NULL
            OR d.user_id IS NULL
            OR d.user_id = target_user_id
          )
        ORDER BY d.embedding <=> query_embedding
        LIMIT GREATEST(match_count, 1);
      END;
      $$;
    `);
    
    console.log("✅ Function recreated successfully");
    
    // Test it
    const testVector = Array(1536).fill(0.1);
    const vectorLiteral = `[${testVector.map(v => v.toFixed(6)).join(",")}]`;
    const testResult = await pool.query(
      `SELECT id, user_id, title, chunk, metadata, similarity FROM match_documents($1::vector, 5, NULL::uuid) LIMIT 1`,
      [vectorLiteral]
    );
    console.log(`✅ Function test passed! Found ${testResult.rows.length} result(s)`);
    
    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
    process.exit(1);
  }
}

fixFunction();

