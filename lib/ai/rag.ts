import OpenAI from "openai";
import { query, queryOne } from "@/lib/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type DocumentRow = {
  id: string;
  user_id: string | null;
  title: string;
  chunk: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

export type DocumentMatch = {
  id: string;
  title: string;
  chunk: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

export type RagSource = {
  id: number;
  title: string | null;
  similarity: number;
  metadata: any;
};

export type RagResult = {
  context: string; // formatted text passed into system prompt
  sources: RagSource[];
};

export type RiskLevel = "low" | "moderate" | "extreme";

export type DocumentMetadata = {
  topic?: string;
  risk_level?: RiskLevel;
  [key: string]: unknown;
};

let embeddingClient: OpenAI | null = null;

function getEmbeddingClient(): OpenAI {
  if (!embeddingClient) {
    embeddingClient = new OpenAI({ apiKey: env.openai.apiKey() });
  }
  return embeddingClient;
}

export async function embedText(input: string): Promise<number[]> {
  if (!input?.trim()) {
    throw new Error("Cannot embed empty text");
  }

  const client = getEmbeddingClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("OpenAI returned an empty embedding");
  }
  return embedding;
}

export async function searchDocuments({
  queryText,
  userId,
  limit = 5,
  minSimilarity = 0.2,
}: {
  queryText: string;
  userId: string | null;
  limit?: number;
  minSimilarity?: number;
}): Promise<DocumentMatch[]> {
  try {
    const embedding = await embedText(queryText);
    const vectorLiteral = toVectorLiteral(embedding);

    const rows = await query<DocumentRow>(
      `
        SELECT * FROM match_documents($1::vector, $2, $3::uuid)
      `,
      [vectorLiteral, limit, userId]
    );

    return rows
      .filter((row) => typeof row.similarity === "number" && row.similarity >= minSimilarity)
      .map((row) => ({
        id: row.id,
        title: row.title,
        chunk: row.chunk,
        metadata: row.metadata,
        similarity: Number(row.similarity),
      }));
  } catch (error) {
    logger.error("RAG search failed", error);
    return [];
  }
}

function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value).toFixed(6)).join(",")}]`;
}

/**
 * Build RAG context from user message
 * Returns formatted context string and source metadata
 */
export async function buildRagContext(
  userMessage: string,
  userId: string | null,
  maxDocs = 6
): Promise<RagResult> {
  try {
    const matches = await searchDocuments({
      queryText: userMessage,
      userId,
      limit: maxDocs,
      minSimilarity: 0.2,
    });

    if (matches.length === 0) {
      return { context: "", sources: [] };
    }

    // Format context string
    const contextLines: string[] = [];
    const sources: RagSource[] = [];

    for (const match of matches) {
      const source: RagSource = {
        id: parseInt(match.id) || 0,
        title: match.title || null,
        similarity: match.similarity,
        metadata: match.metadata || {},
      };
      sources.push(source);

      const metadata = match.metadata as Record<string, unknown> | null;
      const sourceLabel = metadata?.source || metadata?.author || "BioFlo";
      const sectionLabel = match.title || `Doc ${match.id}`;

      contextLines.push(
        `[Doc ${match.id} | Source: ${sourceLabel} | Section: ${sectionLabel} | similarity: ${match.similarity.toFixed(2)}]`
      );
      contextLines.push(match.chunk);
      contextLines.push(""); // Empty line between docs
    }

    return {
      context: contextLines.join("\n"),
      sources,
    };
  } catch (error) {
    logger.error("RAG context build failed", { error, userMessage: userMessage.substring(0, 100) });
    return { context: "", sources: [] };
  }
}

/**
 * Check if we can answer from context alone using cheap model
 */
export async function canAnswerFromContext(
  userMessage: string,
  ragContext: string
): Promise<boolean> {
  if (!ragContext.trim()) {
    return false;
  }

  try {
    const { env } = await import("@/lib/env");
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: env.openai.apiKey() });

    const completion = await client.chat.completions.create({
      model: env.openai.cheapModel(),
      messages: [
        {
          role: "system",
          content: `You are a fact-checker. Given a question and context, determine if a factual answer can be given from the context alone. Respond ONLY with valid JSON: {"can_answer_from_context": true/false}`,
        },
        {
          role: "user",
          content: `Question: ${userMessage}\n\nContext:\n${ragContext}\n\nCan a factual answer be given from this context? Respond with JSON only.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 50,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return false;
    }

    const parsed = JSON.parse(content) as { can_answer_from_context?: boolean };
    return parsed.can_answer_from_context ?? false;
  } catch (error) {
    logger.warn("canAnswerFromContext check failed", { error });
    return false; // Safe default: assume we can't answer
  }
}

/**
 * Format retrieved documents for use in AI context
 */
export function formatDocumentsForContext(matches: DocumentMatch[]): string {
  if (matches.length === 0) {
    return "";
  }

  const lines: string[] = [];
  lines.push("## Relevant Protocols & Knowledge:");
  lines.push("");

  matches.forEach((match, idx) => {
    lines.push(`### ${match.title || `Protocol ${idx + 1}`}`);
    lines.push(match.chunk);
    if (match.metadata && Object.keys(match.metadata).length > 0) {
      lines.push(`*Metadata: ${JSON.stringify(match.metadata)}*`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Retrieve and format relevant documents for a user query
 * This is the main function to use for RAG retrieval in chat
 */
export async function retrieveRelevantContext({
  queryText,
  userId,
  limit = 5,
}: {
  queryText: string;
  userId: string | null;
  limit?: number;
}): Promise<string> {
  const matches = await searchDocuments({
    queryText,
    userId,
    limit,
    minSimilarity: 0.3, // Higher threshold for better quality
  });

  return formatDocumentsForContext(matches);
}

/**
 * Get risk level from retrieved documents
 * Returns the highest risk level found in the matches
 */
export function getRiskLevelFromMatches(matches: DocumentMatch[]): RiskLevel | null {
  let highestRisk: RiskLevel | null = null;

  for (const match of matches) {
    const metadata = match.metadata as DocumentMetadata | null;
    if (metadata?.risk_level) {
      const risk = metadata.risk_level;
      if (risk === "extreme") {
        return "extreme"; // Highest priority
      }
      if (risk === "moderate" && highestRisk !== "extreme") {
        highestRisk = "moderate";
      }
      if (risk === "low" && !highestRisk) {
        highestRisk = "low";
      }
    }
  }

  return highestRisk;
}

/**
 * Filter documents by risk level
 */
export function filterDocumentsByRiskLevel(
  matches: DocumentMatch[],
  maxRiskLevel: RiskLevel
): DocumentMatch[] {
  const riskOrder: Record<RiskLevel, number> = {
    low: 1,
    moderate: 2,
    extreme: 3,
  };

  const maxRisk = riskOrder[maxRiskLevel];

  return matches.filter((match) => {
    const metadata = match.metadata as DocumentMetadata | null;
    if (!metadata?.risk_level) {
      return true; // Include documents without risk level
    }
    const docRisk = riskOrder[metadata.risk_level] || 0;
    return docRisk <= maxRisk;
  });
}

/**
 * Get topic hints from retrieved documents
 * Returns the most common topic from matches
 */
export function getTopicHintFromMatches(matches: DocumentMatch[]): string | null {
  const topicCounts: Record<string, number> = {};

  for (const match of matches) {
    const metadata = match.metadata as DocumentMetadata | null;
    if (metadata?.topic) {
      const topic = String(metadata.topic);
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }

  if (Object.keys(topicCounts).length === 0) {
    return null;
  }

  // Return the most common topic
  return Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Detect topic hint from user message for longevity knowledge retrieval
 * Returns a topic string or null
 */
export function detectLongevityTopicHint(userMessage: string): string | null {
  const message = userMessage.toLowerCase();
  
  // Four horsemen / disease risk
  if (
    message.includes("four horsemen") ||
    message.includes("heart disease") ||
    message.includes("cardiovascular") ||
    message.includes("cancer") ||
    message.includes("dementia") ||
    message.includes("alzheimer") ||
    message.includes("metabolic syndrome")
  ) {
    if (message.includes("metabolic") || message.includes("insulin") || message.includes("blood sugar") || message.includes("diabetes")) {
      return "metabolic_muscle";
    }
    return "four_horsemen";
  }
  
  // Cardio / VO2max
  if (
    message.includes("vo2max") ||
    message.includes("vo2 max") ||
    message.includes("zone 2") ||
    message.includes("cardio") ||
    message.includes("endurance") ||
    message.includes("aerobic")
  ) {
    return "cardio_vo2max";
  }
  
  // Strength / stability
  if (
    message.includes("strength") ||
    message.includes("falls") ||
    message.includes("balance") ||
    message.includes("marginal decade") ||
    message.includes("getting off the floor") ||
    message.includes("functional")
  ) {
    return "strength_stability";
  }
  
  // Metabolic health
  if (
    message.includes("blood sugar") ||
    message.includes("insulin") ||
    message.includes("metabolic health") ||
    message.includes("pre-diabetes") ||
    message.includes("type 2 diabetes") ||
    (message.includes("glucose") && !message.includes("supplement"))
  ) {
    return "metabolic_muscle";
  }
  
  // Nutrition
  if (
    message.includes("nutrition") ||
    message.includes("diet") ||
    message.includes("protein") ||
    message.includes("calories") ||
    message.includes("eating") ||
    message.includes("fasting") ||
    message.includes("food")
  ) {
    return "nutrition_longevity";
  }
  
  // Sleep
  if (
    message.includes("sleep") ||
    message.includes("insomnia") ||
    message.includes("can't sleep") ||
    message.includes("wake up at night") ||
    message.includes("sleeping")
  ) {
    return "sleep_longevity";
  }
  
  // Emotional health
  if (
    message.includes("anxious") ||
    message.includes("depressed") ||
    message.includes("inner critic") ||
    message.includes("emotional health") ||
    message.includes("burnout") ||
    message.includes("stress") ||
    message.includes("mental health")
  ) {
    return "emotional_health";
  }
  
  // Longevity fundamentals
  if (
    message.includes("longevity") ||
    message.includes("healthspan") ||
    message.includes("lifespan") ||
    message.includes("biomarker") ||
    message.includes("centenarian")
  ) {
    return "longevity_fundamentals";
  }
  
  return null;
}

/**
 * Retrieve relevant longevity documents with optional topic hint
 */
export async function getRelevantLongevityDocs(
  query: string,
  options?: {
    topicHint?: string | null;
    limit?: number;
  }
): Promise<DocumentMatch[]> {
  try {
    const limit = options?.limit || 8;
    const topicHint = options?.topicHint || detectLongevityTopicHint(query);
    
    // Search for documents with source = 'bioflo_longevity'
    const embedding = await embedText(query);
    const vectorLiteral = toVectorLiteral(embedding);
    
    // Build query with optional topic filter
    let sqlQuery = `
      SELECT 
        d.id,
        d.user_id,
        d.title,
        d.chunk,
        d.metadata,
        1 - (d.embedding <=> $1::vector) AS similarity
      FROM documents d
      WHERE d.embedding IS NOT NULL
        AND d.metadata->>'source' = 'bioflo_longevity'
    `;
    
    const params: unknown[] = [vectorLiteral];
    
    // If topic hint provided, boost documents matching that topic
    if (topicHint) {
      sqlQuery += `
        ORDER BY 
          CASE WHEN d.metadata->>'topic' = $2 THEN 0 ELSE 1 END,
          similarity DESC
        LIMIT $3
      `;
      params.push(topicHint, limit);
    } else {
      sqlQuery += `
        ORDER BY similarity DESC
        LIMIT $2
      `;
      params.push(limit);
    }
    
    const rows = await query<DocumentRow>(sqlQuery, params);
    
    return rows
      .filter((row) => typeof row.similarity === "number" && row.similarity >= 0.2)
      .map((row) => ({
        id: row.id,
        title: row.title,
        chunk: row.chunk,
        metadata: row.metadata,
        similarity: Number(row.similarity),
      }));
  } catch (error) {
    logger.error("Longevity RAG search failed", error);
    return [];
  }
}

/**
 * Format longevity knowledge snippets for AI context
 */
export function formatLongevityKnowledgeSnippets(matches: DocumentMatch[]): string {
  if (matches.length === 0) {
    return "";
  }

  const lines: string[] = [];
  lines.push("[KNOWLEDGE_SNIPPETS]");
  lines.push("");

  matches.forEach((match) => {
    const metadata = match.metadata as DocumentMetadata | null;
    const topic = metadata?.topic || "unknown";
    const riskLevel = metadata?.risk_level || "low";
    
    // Truncate chunk to ~400-600 characters for context
    const snippet = match.chunk.length > 600 
      ? match.chunk.substring(0, 600).trim() + "..."
      : match.chunk.trim();
    
    lines.push(`- Title: ${match.title}`);
    lines.push(`  Topic: ${topic}`);
    lines.push(`  Risk: ${riskLevel}`);
    lines.push(`  Snippet: ${snippet}`);
    lines.push("");
  });

  lines.push("[/KNOWLEDGE_SNIPPETS]");
  lines.push("");

  return lines.join("\n");
}

/**
 * Sleep-specific document match type
 */
export type SleepDocMatch = {
  id: string;
  title: string;
  chunk: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

/**
 * Fetch top-N sleep-specific documents (Matthew Walker content)
 */
export async function getSleepContext(
  userQuery: string,
  matchCount: number = 8
): Promise<SleepDocMatch[]> {
  try {
    if (!userQuery?.trim()) {
      logger.warn("Sleep RAG: Empty query provided");
      return [];
    }

    const embedding = await embedText(userQuery);
    const vectorLiteral = toVectorLiteral(embedding);

    // Query documents directly with vector similarity search
    // Filter for Matthew Walker sleep content only
    const rows = await query<DocumentRow>(
      `
        SELECT 
          d.id,
          d.user_id,
          d.title,
          d.chunk,
          d.metadata,
          1 - (d.embedding <=> $1::vector) AS similarity
        FROM documents d
        WHERE d.embedding IS NOT NULL
          AND d.metadata->>'source' = 'mw_masterclass'
          AND d.metadata->>'topic' = 'sleep'
        ORDER BY d.embedding <=> $1::vector
        LIMIT $2
      `,
      [vectorLiteral, matchCount]
    );

    // Map results
    const filtered = rows
      .map((row) => ({
        id: row.id,
        title: row.title,
        chunk: row.chunk,
        metadata: row.metadata,
        similarity: Number(row.similarity) || 0,
      }))
      .filter((row) => row.similarity >= 0.2); // Filter out very low similarity matches

    return filtered;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sleep RAG search failed", { error: errorMessage, query: userQuery.substring(0, 50) });
    return []; // Return empty array on error to allow chat to continue
  }
}

/**
 * Format sleep context matches into a plain-text context block for the model
 */
export function formatSleepContext(matches: SleepDocMatch[]): string {
  if (!matches.length) return "";

  const lines: string[] = [];

  for (const m of matches) {
    const meta = m.metadata || {};
    const author = meta.author || "Unknown author";
    const source = meta.source || "";
    const file = meta.file || "";

    const label = [author, source, file].filter(Boolean).join(" · ");

    lines.push(
      `SOURCE: ${label}\nTITLE: ${m.title}\nSIMILARITY: ${m.similarity.toFixed(3)}\nCONTENT:\n${m.chunk}`
    );
  }

  return lines.join("\n\n---\n\n");
}

/**
 * Detect if a user query is sleep-related
 */
export function isSleepQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("sleep") ||
    lower.includes("insomnia") ||
    lower.includes("night shift") ||
    lower.includes("chronotype") ||
    lower.includes("wake up") ||
    lower.includes("fall asleep") ||
    lower.includes("can't sleep") ||
    lower.includes("cant sleep") ||
    lower.includes("dreams") ||
    lower.includes("nightmare") ||
    lower.includes("caffeine") ||
    lower.includes("coffee") ||
    lower.includes("nap") ||
    lower.includes("jet lag") ||
    lower.includes("circadian") ||
    lower.includes("melatonin") ||
    lower.includes("sleep apnea") ||
    lower.includes("sleeping") ||
    lower.includes("bedtime") ||
    lower.includes("wake time")
  );
}

