/**
 * Simplified BioFlo Chat API Route
 * 
 * A clean, simple implementation that:
 * - Gets user messages
 * - Fetches RAG context from Supabase/Postgres
 * - Calls biofloChat() 
 * - Returns reply
 */

import { auth } from "@clerk/nextjs/server";
import { biofloChat } from "@/lib/llm";
import { embedText, searchDocuments } from "@/lib/ai/rag";
import { logger } from "@/lib/logger";
import { queryOne } from "@/lib/db/client";

export const runtime = "nodejs";

type ChatRequestBody = {
  messages: { role: "user" | "assistant"; content: string }[];
};

/**
 * Format RAG documents into context string
 */
function formatRagContext(docs: Array<{ title: string; chunk: string; id?: string }>): string {
  if (docs.length === 0) return "";
  
  return docs
    .map((doc, idx) => {
      const label = doc.title || `Doc ${idx + 1}`;
      return `[${label}]\n${doc.chunk}`;
    })
    .join("\n\n");
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Authentication
    const { userId } = await auth();
    if (!userId) {
      logger.warn("Simple Chat API: Unauthorized", { requestId });
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body: ChatRequestBody = await req.json();
    const { messages } = body;

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Invalid messages format. Expected non-empty array." },
        { status: 400 }
      );
    }

    // Get latest user message for RAG query
    const latestUserMessage = messages
      .filter(m => m.role === "user")
      .slice(-1)[0]?.content || "";

    if (!latestUserMessage.trim()) {
      return Response.json(
        { error: "No user message found" },
        { status: 400 }
      );
    }

    // Get user's database ID (for RAG filtering)
    let userDbId: string | null = null;
    try {
      const userRecord = await queryOne<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [userId]
      );
      userDbId = userRecord?.id || null;
    } catch (dbError) {
      logger.debug("Simple Chat API: Could not fetch user DB ID", { error: dbError, userId, requestId });
      // Continue without user DB ID - RAG will use global docs
    }

    // Fetch RAG context from Supabase/Postgres
    let ragContext = "";
    try {
      const ragDocs = await searchDocuments({
        queryText: latestUserMessage,
        userId: userDbId,
        limit: 6,
        minSimilarity: 0.2,
      });

      if (ragDocs.length > 0) {
        ragContext = formatRagContext(ragDocs);
        logger.debug("Simple Chat API: RAG context retrieved", {
          userId,
          docCount: ragDocs.length,
          requestId,
        });
      }
    } catch (ragError) {
      logger.warn("Simple Chat API: RAG retrieval failed", {
        error: ragError,
        userId,
        requestId,
      });
      // Continue without RAG context if retrieval fails
    }

    // Call BioFlo chat
    const reply = await biofloChat({
      userMessages: messages,
      ragContext: ragContext || undefined,
    });

    // Optional: Save messages to database
    try {
      if (userDbId) {
        const { query } = await import("@/lib/db/client");
        
        // Insert user's latest message
        const latestUserMsg = messages.filter(m => m.role === "user").slice(-1)[0];
        if (latestUserMsg) {
          await query(
            `INSERT INTO chat_messages (user_id, role, content, session_id, created_at)
             VALUES ($1, 'user', $2, $3, NOW())
             ON CONFLICT DO NOTHING`,
            [userDbId, latestUserMsg.content, requestId]
          );
        }

        // Insert assistant reply
        await query(
          `INSERT INTO chat_messages (user_id, role, content, session_id, created_at)
           VALUES ($1, 'assistant', $2, $3, NOW())
           ON CONFLICT DO NOTHING`,
          [userDbId, reply, requestId]
        );
      }
    } catch (saveError) {
      logger.warn("Simple Chat API: Failed to save messages", {
        error: saveError,
        userId,
        requestId,
      });
      // Don't fail the request if saving fails
    }

    // Return reply
    return Response.json({ reply }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Simple Chat API: Error", { error: errorMessage, requestId });
    
    return Response.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

