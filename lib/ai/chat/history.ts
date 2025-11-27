import { logger } from "@/lib/logger";

type PersistHistoryArgs = {
  userId: string | null;
  sessionId: string;
  requestMessages: Array<{ role: string; content: string }>;
  assistantContent: string;
  provider: string;
};

/**
 * Persist chat messages (user + assistant) to the `chat_messages` table.
 * Ensures the Clerk user exists locally and prevents duplicate inserts by
 * checking for identical messages in the last 5 minutes.
 */
export async function persistChatHistory({
  userId,
  sessionId,
  requestMessages,
  assistantContent,
  provider,
}: PersistHistoryArgs) {
  try {
    const { query, queryOne } = await import("@/lib/db/client");

    let userRecord = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId || ""]
    );

    if (!userRecord && userId) {
      try {
        const result = await query<{ id: string }>(
          "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        userRecord = result[0];
        logger.info("Created user record for chat history", {
          userId,
          userDbId: userRecord.id,
        });
      } catch (createError) {
        logger.warn("Failed to create user record for chat history", {
          error: createError,
          userId,
        });
        return;
      }
    }

    if (!userRecord) {
      logger.debug("No user record available for chat history", { userId });
      return;
    }

    const messagesToStore = [
      ...requestMessages,
      { role: "assistant" as const, content: assistantContent },
    ];

    for (const msg of messagesToStore) {
      try {
        const existing = await queryOne<{ id: string }>(
          `SELECT id FROM chat_messages 
           WHERE user_id = $1 AND thread_id = $2 AND role = $3 AND content = $4 
           AND created_at > NOW() - INTERVAL '5 minutes'`,
          [userRecord.id, sessionId, msg.role, msg.content]
        );

        if (!existing) {
          await query(
            `INSERT INTO chat_messages (user_id, thread_id, role, content, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              userRecord.id,
              sessionId,
              msg.role,
              msg.content,
              JSON.stringify({ provider }),
            ]
          );
        }
      } catch (msgError) {
        logger.debug("Failed to save individual message", {
          error: msgError,
          userId,
        });
      }
    }

    logger.debug("Chat history persisted", {
      userId,
      sessionId,
      messageCount: messagesToStore.length,
    });
  } catch (error) {
    logger.debug("Chat history save skipped", { error, userId });
  }
}




