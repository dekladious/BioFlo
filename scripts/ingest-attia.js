#!/usr/bin/env node

/**
 * Peter Attia Content Ingestion Pipeline
 * 
 * Reads .txt/.pdf/.docx files from data/attia/, splits into chunks,
 * generates embeddings, and inserts into documents table with proper metadata.
 * 
 * Usage:
 *   node scripts/ingest-attia.js
 * 
 * Requires env:
 *   DATABASE_URL
 *   OPENAI_API_KEY
 * 
 * Folder structure expected:
 *   data/attia/
 *     video1.txt
 *     video2.txt
 *     ...
 *     longevity_cheatsheet.txt
 */

import { readdir, readFile, stat } from "fs/promises";
import { join, extname, basename, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { Pool } from "pg";
import { config } from "dotenv";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

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

const SOURCE_DIR = join(process.cwd(), "data", "attia");
const SUPPORTED_EXTS = [".txt", ".pdf", ".docx"];
const CHUNK_SIZE_CHARS = 1600; // Target chunk size in characters (~800-1200 tokens)

const pool = new Pool({ connectionString: DATABASE_URL });
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Simple chunker: split on paragraphs, then merge until ~1200–1600 chars.
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
 * Infer domain/topic from filename or content
 */
function inferDomain(fileName, content) {
  const lowerFileName = fileName.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  if (lowerFileName.includes("sleep") || lowerContent.includes("sleep")) {
    return "sleep";
  }
  if (lowerFileName.includes("exercise") || lowerFileName.includes("vo2") || lowerFileName.includes("cardio") || lowerContent.includes("vo2 max") || lowerContent.includes("zone 2")) {
    return "exercise";
  }
  if (lowerFileName.includes("metabolic") || lowerContent.includes("insulin") || lowerContent.includes("glucose")) {
    return "metabolic";
  }
  if (lowerFileName.includes("longevity") || lowerFileName.includes("cheatsheet") || lowerContent.includes("four horsemen") || lowerContent.includes("healthspan")) {
    return "longevity";
  }
  if (lowerFileName.includes("nutrition") || lowerContent.includes("protein") || lowerContent.includes("macros")) {
    return "nutrition";
  }
  
  return "longevity"; // Default
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
 * Insert a single chunk into documents table with Attia metadata
 */
async function insertChunk({ title, chunk, order, fileName, domain }) {
  const embedding = await embedText(chunk);
  const vectorLiteral = toVectorLiteral(embedding);

  const metadata = {
    topic: domain,
    author: "Peter Attia",
    source: "attia_masterclass",
    file: fileName,
    order,
    domain,
  };

  await pool.query(
    `INSERT INTO documents (user_id, title, chunk, embedding, metadata, visibility)
     VALUES (NULL, $1, $2, $3::vector, $4, 'global')
     ON CONFLICT DO NOTHING`,
    [title, chunk, vectorLiteral, JSON.stringify(metadata)]
  );
  
  // Add delay to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between chunks
}

/**
 * Read and process a single file
 */
async function extractTextFromFile(fullPath, extension) {
  if (extension === ".txt") {
    return readFile(fullPath, "utf-8");
  }

  if (extension === ".pdf") {
    const buffer = await readFile(fullPath);
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ path: fullPath });
    return result.value || "";
  }

  throw new Error(`Unsupported file type: ${extension}`);
}

async function processFile(fileName) {
  const fullPath = join(SOURCE_DIR, fileName);
  
  try {
    const fileStat = await stat(fullPath);
    const extension = extname(fileName).toLowerCase();
    if (!fileStat.isFile() || !SUPPORTED_EXTS.includes(extension)) {
      return { processed: false, reason: "Unsupported file type" };
    }

    console.log(`📄 Processing: ${fileName}`);
    const content = (await extractTextFromFile(fullPath, extension)).trim();
    
    if (!content.trim()) {
      console.log(`   ⚠️  File is empty, skipping`);
      return { processed: false, reason: "Empty file" };
    }

    const domain = inferDomain(fileName, content);
    const chunks = chunkText(content);
    console.log(`   📦 Split into ${chunks.length} chunks (domain: ${domain})`);

    let inserted = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const title = `${basename(fileName, extension)} - Chunk ${i + 1}`;
      
      await insertChunk({
        title,
        chunk,
        order: i + 1,
        fileName,
        domain,
      });
      
      inserted++;
      
      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ Inserted ${i + 1}/${chunks.length} chunks...`);
      }
    }

    console.log(`   ✅ Completed: ${inserted} chunks inserted`);
    return { processed: true, chunks: inserted };
  } catch (error) {
    console.error(`   ❌ Error processing ${fileName}:`, error.message);
    return { processed: false, reason: error.message };
  }
}

/**
 * Main ingestion function
 */
async function main() {
  console.log("🚀 Peter Attia Content Ingestion Pipeline");
  console.log(`📁 Source directory: ${SOURCE_DIR}`);
  console.log("");

  // Check if source directory exists
  try {
    await stat(SOURCE_DIR);
  } catch (error) {
    console.error(`❌ ERROR: Source directory does not exist: ${SOURCE_DIR}`);
    console.error(`   Please create the directory and add .txt files from Attia MasterClass`);
    console.error(`   Expected structure:`);
    console.error(`   data/attia/`);
    console.error(`     video1.txt`);
    console.error(`     video2.txt`);
    console.error(`     ...`);
    console.error(`     longevity_cheatsheet.txt`);
    process.exit(1);
  }

  // Get all .txt files
  const files = await readdir(SOURCE_DIR);
  const txtFiles = files.filter(f => extname(f) === ".txt");

  if (txtFiles.length === 0) {
    console.error(`❌ ERROR: No .txt files found in ${SOURCE_DIR}`);
    console.error(`   Please add .txt files from Attia MasterClass`);
    process.exit(1);
  }

  console.log(`📚 Found ${txtFiles.length} .txt file(s)`);
  console.log("");

  // Process each file
  const results = [];
  for (const file of txtFiles) {
    const result = await processFile(file);
    results.push({ file, ...result });
  }

  // Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("📊 Ingestion Summary");
  console.log("=".repeat(60));
  
  const processed = results.filter(r => r.processed).length;
  const totalChunks = results.reduce((sum, r) => sum + (r.chunks || 0), 0);
  
  console.log(`✅ Processed: ${processed}/${txtFiles.length} files`);
  console.log(`📦 Total chunks inserted: ${totalChunks}`);
  
  for (const result of results) {
    if (result.processed) {
      console.log(`   ✅ ${result.file}: ${result.chunks} chunks`);
    } else {
      console.log(`   ⚠️  ${result.file}: ${result.reason}`);
    }
  }

  console.log("");
  console.log("🎉 Ingestion complete!");
  console.log(`   Verify in Supabase → documents table (filter by metadata->>'source' = 'attia_masterclass')`);
  
  await pool.end();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

