#!/usr/bin/env node

/**
 * Ingests markdown/text files into the documents table with embeddings.
 *
 * Usage:
 *   node scripts/ingest-documents.js ./docs/sleep.md --title "Sleep Foundations"
 *   node scripts/ingest-documents.js ./docs/female.md --user clerk_user_id
 *
 * Flags:
 *   --title <string>       Optional override for the base title
 *   --user-id <uuid>       Assign document to an internal user UUID
 *   --user <clerkId>       Look up the internal user via Clerk user ID
 *   --visibility <value>   "global" (default) or "private"
 */

import { readFile } from "fs/promises";
import { basename, extname, join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Pool } from "pg";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Add it to .env.local");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set. Add it to .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args[0]) {
  printUsage();
  process.exit(1);
}

const sourcePath = args[0];
const flags = parseFlags(args.slice(1));
const visibility = (flags.visibility || "global").toLowerCase();
if (!["global", "private"].includes(visibility)) {
  console.error('❌ visibility must be either "global" or "private"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function main() {
  const content = await readFile(sourcePath, "utf-8");
  const chunks = chunkText(content);

  if (chunks.length === 0) {
    console.error("No content found to ingest.");
    process.exit(1);
  }

  const userId = await resolveUserId(flags);
  const baseTitle = flags.title || deriveTitle(sourcePath);

  console.log(`📄 Ingesting "${baseTitle}" from ${sourcePath}`);
  console.log(`   Chunks: ${chunks.length}`);
  console.log(`   Visibility: ${visibility}`);
  if (userId) {
    console.log(`   Assigned to user_id: ${userId}`);
  } else {
    console.log("   Assigned to all users (global)");
  }

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const title = chunks.length === 1 ? baseTitle : `${baseTitle} (Part ${i + 1})`;
    const summary = summarizeChunk(chunk);

    process.stdout.write(`   → Embedding chunk ${i + 1}/${chunks.length}...`);
    const embedding = await embedText(chunk);
    process.stdout.write(" done\n");

    await pool.query(
      `
        INSERT INTO documents (user_id, title, chunk, summary, metadata, visibility, embedding)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::vector)
      `,
      [
        userId,
        title,
        chunk,
        summary,
        JSON.stringify({
          source: sourcePath,
          chunkIndex: i,
          chunkCount: chunks.length,
        }),
        visibility,
        toVectorLiteral(embedding),
      ]
    );
  }

  console.log("\n✅ Ingestion complete!");
}

function parseFlags(parts) {
  const options = {};
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const value = parts[i + 1];
    options[key] = value;
    i += 1;
  }
  return options;
}

function deriveTitle(filePath) {
  const base = basename(filePath, extname(filePath));
  return base.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim() || "Untitled";
}

function chunkText(text, maxChars = 1600, overlap = 200) {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (cleaned.length <= maxChars) {
    return [cleaned];
  }

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + maxChars);
    let chunk = cleaned.slice(start, end);
    if (end < cleaned.length) {
      const lastParagraphBreak = chunk.lastIndexOf("\n\n");
      if (lastParagraphBreak > overlap) {
        chunk = chunk.slice(0, lastParagraphBreak);
        start += lastParagraphBreak;
      } else {
        start = end - overlap;
      }
    } else {
      start = end;
    }
    chunks.push(chunk.trim());
  }

  return chunks;
}

function summarizeChunk(chunk) {
  const sentences = chunk.split(/\.\s+/).slice(0, 2).join(". ").trim();
  return sentences.slice(0, 250);
}

function toVectorLiteral(values) {
  return `[${values.map((v) => Number(v).toFixed(8)).join(",")}]`;
}

async function embedText(input) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return response.data[0].embedding;
}

async function resolveUserId(flags) {
  if (flags["user-id"]) {
    return flags["user-id"];
  }
  if (!flags.user) {
    return null; // global document
  }

  const result = await pool.query(
    "SELECT id FROM users WHERE clerk_user_id = $1 LIMIT 1",
    [flags.user]
  );

  if (!result.rows[0]) {
    throw new Error(`No users row found for clerk_user_id=${flags.user}`);
  }

  return result.rows[0].id;
}

function printUsage() {
  console.log(`
Usage: node scripts/ingest-documents.js <file> [--title "Title"] [--user <clerkId>] [--user-id <uuid>] [--visibility global|private]
`);
}

main()
  .catch((error) => {
    console.error("\n❌ Ingestion failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

