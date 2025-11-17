#!/usr/bin/env node

/**
 * Longevity Knowledge Base Ingestion Pipeline
 * 
 * Reads markdown files from content/longevity/, splits into chunks,
 * generates embeddings, and inserts into documents table with proper metadata.
 * 
 * Usage:
 *   node scripts/ingestLongevityDocs.js
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

const LONGEVITY_DIR = join(process.cwd(), "content", "longevity");
const CHUNK_SIZE_TOKENS = 800; // Target chunk size (approximate) - larger for longevity content
const CHUNK_OVERLAP = 100; // Overlap between chunks (in tokens)

const pool = new Pool({ connectionString: DATABASE_URL });
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Map filenames to topic and risk_level metadata
 */
function getLongevityMetadata(filename) {
  const nameWithoutExt = filename.replace(/\.(md|txt)$/i, "");
  
  const mapping = {
    "longevity_fundamentals_attia_style": {
      topic: "longevity_fundamentals",
      risk_level: "low",
    },
    "cardio_and_vo2max_for_longer_life": {
      topic: "cardio_vo2max",
      risk_level: "low",
    },
    "four_horsemen_overview": {
      topic: "four_horsemen",
      risk_level: "low",
    },
    "strength_and_stability_for_the_marginal_decade": {
      topic: "strength_stability",
      risk_level: "low",
    },
    "metabolic_health_and_muscle_attia_style": {
      topic: "metabolic_muscle",
      risk_level: "low",
    },
    "nutrition_principles_for_longevity": {
      topic: "nutrition_longevity",
      risk_level: "low",
    },
    "sleep_principles_bioflo": {
      topic: "sleep_longevity",
      risk_level: "low",
    },
    "emotional_health_and_inner_voice": {
      topic: "emotional_health",
      risk_level: "low",
    },
  };
  
  // Try exact match first
  if (mapping[nameWithoutExt]) {
    return mapping[nameWithoutExt];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(mapping)) {
    if (nameWithoutExt.includes(key) || key.includes(nameWithoutExt)) {
      return value;
    }
  }
  
  // Default fallback
  return {
    topic: nameWithoutExt,
    risk_level: "low",
  };
}

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
  // Split by paragraphs first, then by sentences
  const paragraphs = text.split(/\n\s*\n/);
  
  let currentChunk = [];
  let currentTokens = 0;
  
  for (const paragraph of paragraphs) {
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    
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
    
    // Add paragraph break if we have content
    if (currentChunk.length > 0 && currentTokens < maxTokens) {
      currentChunk.push("");
    }
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0);
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
  const metadata = getLongevityMetadata(filename);
  
  // Extract title (first H1 heading)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.(md|txt)$/i, "");
  
  // Delete existing documents for this source before inserting
  console.log(`  Deleting existing documents for source: bioflo_longevity, topic: ${metadata.topic}`);
  await pool.query(
    `DELETE FROM documents 
     WHERE metadata->>'source' = 'bioflo_longevity' 
     AND metadata->>'topic' = $1`,
    [metadata.topic]
  );
  
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
        source: "bioflo_longevity",
        source_file: filename,
        chunk_index: i,
        total_chunks: chunks.length,
      };
      
      // Insert into database
      const vectorLiteral = toVectorLiteral(embedding);
      await pool.query(
        `INSERT INTO documents (user_id, title, chunk, embedding, metadata, visibility)
         VALUES (NULL, $1, $2, $3::vector, $4, 'global')`,
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
async function ingestLongevityDocs() {
  try {
    // Check longevity directory exists
    try {
      await readdir(LONGEVITY_DIR);
    } catch {
      console.warn(`Longevity directory not found: ${LONGEVITY_DIR}`);
      console.log("Creating longevity directory...");
      await mkdir(LONGEVITY_DIR, { recursive: true });
      console.log("✅ Longevity directory created. Please add markdown files and run again.");
      await pool.end();
      return;
    }
    
    // Read all files from longevity directory
    const files = await readdir(LONGEVITY_DIR);
    const markdownFiles = files.filter(
      f => extname(f).toLowerCase() === ".md" || extname(f).toLowerCase() === ".txt"
    );
    
    if (markdownFiles.length === 0) {
      console.warn("No markdown files found in content/longevity/ directory");
      console.log("Please add .md or .txt files to the content/longevity/ directory");
      await pool.end();
      return;
    }
    
    console.log(`Found ${markdownFiles.length} file(s) to process\n`);
    
    // Process each file
    for (const filename of markdownFiles) {
      const filepath = join(LONGEVITY_DIR, filename);
      await processFile(filepath, filename);
      console.log(""); // Empty line between files
    }
    
    console.log("✅ Longevity document ingestion complete!");
    console.log(`Processed ${markdownFiles.length} file(s)`);
    
    await pool.end();
  } catch (error) {
    console.error("❌ Longevity document ingestion failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await pool.end();
    process.exit(1);
  }
}

// Run
ingestLongevityDocs();

