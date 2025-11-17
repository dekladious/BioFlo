#!/usr/bin/env node

/**
 * RAG Document Ingestion Pipeline
 * 
 * Reads markdown/text files from content/ folder, splits into chunks,
 * generates embeddings, and inserts into documents table.
 * 
 * Usage:
 *   node scripts/ingestDocuments.js
 */

import { readdir, readFile, mkdir } from "fs/promises";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { Pool } from "pg";
import { config } from "dotenv";

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

const CONTENT_DIR = join(process.cwd(), "content");
const CHUNK_SIZE_TOKENS = 300; // Target chunk size (approximate)
const CHUNK_OVERLAP = 50; // Overlap between chunks (in tokens)

const pool = new Pool({ connectionString: DATABASE_URL });
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Rough token estimation (1 token ≈ 4 characters)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks with overlap
 */
function chunkText(text, maxTokens, overlapTokens) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = [];
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.join(" "));
      
      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-Math.ceil(overlapTokens / 20)).join(" ");
      currentChunk = [overlapText, sentence];
      currentTokens = estimateTokens(overlapText) + sentenceTokens;
    } else {
      currentChunk.push(sentence);
      currentTokens += sentenceTokens;
    }
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Extract metadata from filename and content
 */
function extractMetadata(filename, content) {
  const metadata = {
    source_file: filename,
  };
  
  // Extract topic from filename
  const nameWithoutExt = filename.replace(/\.(md|txt)$/i, "");
  
  // Map filenames to topics and risk levels
  if (nameWithoutExt.includes("fasting") || nameWithoutExt.includes("fast")) {
    metadata.topic = nameWithoutExt.includes("3") || nameWithoutExt.includes("three") 
      ? "fasting_3day" 
      : "fasting";
    metadata.risk_level = nameWithoutExt.includes("3") || nameWithoutExt.includes("three")
      ? "moderate"
      : "low";
  } else if (nameWithoutExt.includes("sauna")) {
    metadata.topic = "sauna";
    metadata.risk_level = "moderate";
  } else if (nameWithoutExt.includes("sleep")) {
    metadata.topic = "sleep_hygiene";
    metadata.risk_level = "low";
  } else if (nameWithoutExt.includes("anxiety") || nameWithoutExt.includes("stress")) {
    metadata.topic = "anxiety_tools";
    metadata.risk_level = "low";
  } else if (nameWithoutExt.includes("cold") || nameWithoutExt.includes("ice")) {
    metadata.topic = "cold_exposure";
    metadata.risk_level = "moderate";
  } else {
    metadata.topic = nameWithoutExt;
    metadata.risk_level = "low";
  }
  
  return metadata;
}

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text) {
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
  return `[${embedding.map(v => v.toFixed(6)).join(",")}]`;
}

/**
 * Process a single file
 */
async function processFile(filepath, filename) {
  console.log(`Processing file: ${filename}`);
  
  const content = await readFile(filepath, "utf-8");
  const metadata = extractMetadata(filename, content);
  
  // Extract title (first line or first heading)
  const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.(md|txt)$/i, "");
  
  // Split into chunks
  const chunks = chunkText(content, CHUNK_SIZE_TOKENS, CHUNK_OVERLAP);
  console.log(`  Split into ${chunks.length} chunks`);
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (!chunk) continue;
    
    try {
      // Generate embedding
      const embedding = await generateEmbedding(chunk);
      
      // Prepare metadata for this chunk
      const chunkMetadata = {
        ...metadata,
        chunk_index: i,
        total_chunks: chunks.length,
      };
      
      // Insert into database
      const vectorLiteral = toVectorLiteral(embedding);
      await pool.query(
        `INSERT INTO documents (user_id, title, chunk, embedding, metadata, visibility)
         VALUES (NULL, $1, $2, $3::vector, $4, 'global')
         ON CONFLICT DO NOTHING`,
        [
          `${title} (Part ${i + 1}/${chunks.length})`,
          chunk,
          vectorLiteral,
          JSON.stringify(chunkMetadata),
        ]
      );
      
      if ((i + 1) % 5 === 0) {
        console.log(`  Processed ${i + 1}/${chunks.length} chunks...`);
      }
    } catch (error) {
      console.error(`  Failed to process chunk ${i + 1}:`, error.message);
      throw error;
    }
  }
  
  console.log(`  ✅ Completed ${filename}`);
}

/**
 * Main ingestion function
 */
async function ingestDocuments() {
  try {
    // Check content directory exists
    try {
      await readdir(CONTENT_DIR);
    } catch {
      console.warn(`Content directory not found: ${CONTENT_DIR}`);
      console.log("Creating content directory...");
      await mkdir(CONTENT_DIR, { recursive: true });
      console.log("✅ Content directory created. Please add markdown files and run again.");
      await pool.end();
      return;
    }
    
    // Read all files from content directory
    const files = await readdir(CONTENT_DIR);
    const markdownFiles = files.filter(
      f => extname(f).toLowerCase() === ".md" || extname(f).toLowerCase() === ".txt"
    );
    
    if (markdownFiles.length === 0) {
      console.warn("No markdown files found in content/ directory");
      console.log("Please add .md or .txt files to the content/ directory");
      await pool.end();
      return;
    }
    
    console.log(`Found ${markdownFiles.length} file(s) to process\n`);
    
    // Process each file
    for (const filename of markdownFiles) {
      const filepath = join(CONTENT_DIR, filename);
      await processFile(filepath, filename);
      console.log(""); // Empty line between files
    }
    
    console.log("✅ Document ingestion complete!");
    console.log(`Processed ${markdownFiles.length} file(s)`);
    
    await pool.end();
  } catch (error) {
    console.error("❌ Document ingestion failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await pool.end();
    process.exit(1);
  }
}

// Run
ingestDocuments();

