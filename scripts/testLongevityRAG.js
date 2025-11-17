#!/usr/bin/env node

/**
 * Test script for Longevity RAG integration
 * 
 * Tests retrieval of longevity documents with various queries
 * 
 * Usage:
 *   node scripts/testLongevityRAG.js
 */

import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "..", ".env.local") });

// Import RAG functions (using dynamic import for ESM)
async function testLongevityRAG() {
  try {
    const { getRelevantLongevityDocs, formatLongevityKnowledgeSnippets, detectLongevityTopicHint } = await import("../lib/ai/rag.js");
    
    const testQueries = [
      "How do I improve VO2 max?",
      "What are the four horsemen of chronic disease?",
      "I'm worried about dementia. What lifestyle things actually matter?",
      "How does muscle mass relate to metabolic health?",
      "What is the marginal decade and how should I train for it?",
      "Explain zone 2 training for longevity",
      "What should I know about insulin resistance?",
    ];
    
    console.log("🧪 Testing Longevity RAG Integration\n");
    console.log("=" .repeat(60));
    
    for (const query of testQueries) {
      console.log(`\n📝 Query: "${query}"`);
      console.log("-".repeat(60));
      
      // Detect topic hint
      const topicHint = detectLongevityTopicHint(query);
      console.log(`🎯 Detected topic hint: ${topicHint || "none"}`);
      
      // Retrieve documents
      const docs = await getRelevantLongevityDocs(query, {
        topicHint: topicHint || undefined,
        limit: 5,
      });
      
      console.log(`📚 Retrieved ${docs.length} document(s):`);
      
      docs.forEach((doc, idx) => {
        const metadata = doc.metadata || {};
        console.log(`\n  ${idx + 1}. ${doc.title}`);
        console.log(`     Topic: ${metadata.topic || "unknown"}`);
        console.log(`     Risk: ${metadata.risk_level || "unknown"}`);
        console.log(`     Similarity: ${(doc.similarity * 100).toFixed(1)}%`);
        console.log(`     Preview: ${doc.chunk.substring(0, 100)}...`);
      });
      
      // Format snippets
      if (docs.length > 0) {
        const formatted = formatLongevityKnowledgeSnippets(docs);
        console.log(`\n📋 Formatted snippet length: ${formatted.length} characters`);
      }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Test complete!");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testLongevityRAG();

