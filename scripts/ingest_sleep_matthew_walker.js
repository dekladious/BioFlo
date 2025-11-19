#!/usr/bin/env node

/**
 * Matthew Walker Sleep Content Ingestion Pipeline
 * 
 * Reads .txt and .pdf files from knowledge/sleep/matthew-walker/raw/,
 * splits into chunks, generates embeddings, and inserts into documents table.
 * 
 * Usage:
 *   node scripts/ingest_sleep_matthew_walker.js
 * 
 * Requires env:
 *   DATABASE_URL
 *   OPENAI_API_KEY
 */

import { readdir, readFile, statSync } from "fs";
import { readdir as readdirAsync, readFile as readFileAsync, stat as statAsync } from "fs/promises";
import { join, extname, basename, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { Pool } from "pg";
import { config } from "dotenv";
import pdf from "pdf-parse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found in .env.local");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("❌ ERROR: OPENAI_API_KEY not found in .env.local");
  process.exit(1);
}

const SOURCE_DIR = join(process.cwd(), "knowledge", "sleep", "matthew-walker", "raw");
const CHUNK_SIZE_CHARS = 1600; // Target chunk size in characters

const pool = new Pool({ connectionString: DATABASE_URL });
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Simple chunker: split on paragraphs, then merge until ~1200–1600 chars.
 * This keeps chunks comfortably under token limits for embeddings + RAG.
 */
function chunkText(text, maxChars = CHUNK_SIZE_CHARS) {
  const paragraphs = text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxChars) {
      if (current) chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

/**
 * Generate embedding using OpenAI
 */
async function embedText(text) {
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("OpenAI returned empty embedding");
  }
  return embedding;
}

/**
 * Convert embedding array to PostgreSQL vector literal
 */
function toVectorLiteral(embedding) {
  return `[${embedding.map((v) => v.toFixed(6)).join(",")}]`;
}

/**
 * Insert a single chunk into documents table with sleep metadata
 */
async function insertChunk({ title, chunk, order, fileName }) {
  const embedding = await embedText(chunk);
  const vectorLiteral = toVectorLiteral(embedding);

  const metadata = {
    topic: "sleep",
    author: "Matthew Walker",
    source: "mw_masterclass",
    file: fileName,
    order,
  };

  await pool.query(
    `INSERT INTO documents (user_id, title, chunk, embedding, metadata, visibility)
     VALUES (NULL, $1, $2, $3::vector, $4, 'global')
     ON CONFLICT DO NOTHING`,
    [title, chunk, vectorLiteral, JSON.stringify(metadata)]
  );
  
  // Add delay to avoid rate limits (OpenAI has rate limits on embeddings API)
  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between chunks
}

/**
 * Read and process a single file
 */
async function processFile(fileName) {
  const fullPath = join(SOURCE_DIR, fileName);
  const stat = await statAsync(fullPath);
  if (!stat.isFile()) return;

  const ext = extname(fileName).toLowerCase();
  let rawText = "";

  if (ext === ".txt") {
    rawText = await readFileAsync(fullPath, "utf8");
  } else if (ext === ".pdf") {
    const data = await readFileAsync(fullPath);
    const parsed = await pdf(data);
    rawText = parsed.text;
  } else {
    console.log(`Skipping non-text file: ${fileName}`);
    return;
  }

  const baseTitle = `Matthew Walker Sleep – ${basename(fileName, ext)}`;
  const chunks = chunkText(rawText);

  console.log(`\nIngesting ${fileName} as ${chunks.length} chunks...`);

  // Delete existing chunks for this file before re-inserting (idempotent)
  await pool.query(
    `DELETE FROM documents 
     WHERE metadata->>'source' = 'mw_masterclass' 
     AND metadata->>'file' = $1`,
    [fileName]
  );

  let order = 0;
  for (const chunk of chunks) {
    order += 1;
    const title = `${baseTitle} (section ${order})`;
    await insertChunk({ title, chunk, order, fileName });

    if (order % 10 === 0) {
      console.log(`  Inserted ${order} chunks for ${fileName}...`);
    }
  }

  console.log(`✅ Done: ${fileName} (${chunks.length} chunks)`);
}

/**
 * Main ingestion function
 */
async function main() {
  try {
    console.log("Reading source dir:", SOURCE_DIR);

    // Check if directory exists
    try {
      await readdirAsync(SOURCE_DIR);
    } catch {
      console.warn(`Source directory not found: ${SOURCE_DIR}`);
      console.log("Creating directory...");
      const { mkdir } = await import("fs/promises");
      await mkdir(SOURCE_DIR, { recursive: true });
      console.log("✅ Directory created. Please add Matthew Walker files and run again.");
      await pool.end();
      return;
    }

    const entries = await readdirAsync(SOURCE_DIR);
    const files = entries.filter(
      (name) =>
        !name.toLowerCase().includes("readme") &&
        (name.toLowerCase().endsWith(".txt") || name.toLowerCase().endsWith(".pdf"))
    );

    if (files.length === 0) {
      console.warn("No .txt or .pdf files found in source directory");
      console.log("Please add Matthew Walker files to:", SOURCE_DIR);
      await pool.end();
      return;
    }

    console.log(`Found ${files.length} file(s) to process\n`);

    for (const fileName of files) {
      await processFile(fileName);
    }

    console.log("\n✅ Finished ingesting Matthew Walker sleep content.");
    await pool.end();
  } catch (error) {
    console.error("❌ Fatal error in ingest script:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await pool.end();
    process.exit(1);
  }
}

// Run
main();

