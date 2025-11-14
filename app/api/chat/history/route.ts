import { auth } from "@clerk/nextjs/server";
import { getDbPool, query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Fetch chat history for a thread
// DELETE: Delete a chat thread
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return Response.json({ success: false, error: "threadId is required" }, { status: 400 });
    }

    try {
      const { query, queryOne } = await import("@/lib/db/client");
      const userRecord = await queryOne<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [userId]
      );

      if (userRecord) {
        await query("DELETE FROM chat_messages WHERE user_id = $1 AND thread_id = $2", [
          userRecord.id,
          threadId,
        ]);
      }
    } catch (dbError) {
      // Database not available, that's okay - localStorage will handle it
      logger.debug("Database delete skipped", { error: dbError });
    }

    return Response.json({ success: true, message: "Thread deleted" });
  } catch (error) {
    logger.error("Delete thread error", error);
    return Response.json({ success: false, error: "Failed to delete thread" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return createErrorResponse("threadId is required", requestId, 400);
    }

    try {
      const pool = getDbPool();
      
      // Get user ID
      const user = await queryOne<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [userId]
      );

      if (!user) {
        return Response.json({
          success: true,
          data: { messages: [] },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }

      // Get messages for thread
      const messages = await query<{
        role: string;
        content: string;
        created_at: Date;
      }>(
        "SELECT role, content, created_at FROM chat_messages WHERE user_id = $1 AND thread_id = $2 ORDER BY created_at ASC",
        [user.id, threadId]
      );

      return Response.json({
        success: true,
        data: {
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            createdAt: m.created_at.toISOString(),
          })),
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (dbError: unknown) {
      // Graceful degradation if database not available
      if (dbError instanceof Error && dbError.message.includes("DATABASE_URL")) {
        logger.warn("Database not configured, returning empty history", { userId, requestId });
        return Response.json({
          success: true,
          data: { messages: [] },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
      throw dbError;
    }
  } catch (error: unknown) {
    logger.error("Chat history API error", error);
    return createErrorResponse("Failed to fetch chat history", requestId, 500);
  }
}

// POST: Save chat messages
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { threadId, messages, metadata } = body;

    if (!threadId || !Array.isArray(messages)) {
      return createErrorResponse("threadId and messages array are required", requestId, 400);
    }

    try {
      const pool = getDbPool();
      
      // Get or create user record
      let user = await queryOne<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [userId]
      );

      if (!user) {
        const result = await query<{ id: string }>(
          "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        user = result[0];
      }

      // Save messages (only new ones, avoid duplicates)
      for (const msg of messages) {
        if (msg.role && msg.content) {
          await query(
            `INSERT INTO chat_messages (user_id, thread_id, role, content, metadata)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [
              user.id,
              threadId,
              msg.role,
              msg.content,
              metadata ? JSON.stringify(metadata) : null,
            ]
          );
        }
      }

      logger.info("Chat history saved", { userId, threadId, messageCount: messages.length, requestId });

      return Response.json({
        success: true,
        data: { message: "Chat history saved successfully" },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (dbError: unknown) {
      // Graceful degradation if database not available
      if (dbError instanceof Error && dbError.message.includes("DATABASE_URL")) {
        logger.warn("Database not configured, skipping chat history save", { userId, requestId });
        return Response.json({
          success: true,
          data: { message: "Chat history save skipped (database not configured)" },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
      throw dbError;
    }
  } catch (error: unknown) {
    logger.error("Chat history save error", error);
    return createErrorResponse("Failed to save chat history", requestId, 500);
  }
}

