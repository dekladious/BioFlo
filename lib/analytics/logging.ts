/**
 * Analytics Event Logging
 * 
 * Logs anonymised analytics events to the database.
 */

import { query } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export type AnalyticsPayload = {
  aiUserId: string;
  eventType: string;
  sessionId?: string;
  topic?: string;
  risk?: string;
  complexity?: string;
  modelUsed?: string;
  usedJudge?: boolean;
  judgeVerdict?: string | null;
  needsRag?: boolean;
  canAnswerFromContext?: boolean;
  messagesInSession?: number;
  answerLength?: number;
  ragDocsCount?: number;
  ragSources?: { id: number; title: string | null; similarity: number }[];
  success?: boolean;
  errorCode?: string | null;
  metadata?: Record<string, any>;
};

/**
 * Log an analytics event to the database
 * 
 * This function is fire-and-forget - errors are logged but don't throw
 * to prevent analytics failures from breaking the main flow.
 */
export async function logAnalyticsEvent(payload: AnalyticsPayload): Promise<void> {
  try {
    // Ensure ai_user_id exists in ai_users table (upsert)
    await query(
      `INSERT INTO ai_users (ai_user_id, user_id, created_at)
       VALUES ($1, NULL, NOW())
       ON CONFLICT (ai_user_id) DO NOTHING`,
      [payload.aiUserId]
    );

    // Insert analytics event
    await query(
      `INSERT INTO analytics_events (
        ai_user_id,
        event_type,
        event_ts,
        session_id,
        topic,
        risk,
        complexity,
        model_used,
        used_judge,
        judge_verdict,
        needs_rag,
        can_answer_from_context,
        messages_in_session,
        answer_length,
        rag_docs_count,
        rag_sources,
        success,
        error_code,
        metadata
      ) VALUES (
        $1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )`,
      [
        payload.aiUserId,
        payload.eventType,
        payload.sessionId || null,
        payload.topic || null,
        payload.risk || null,
        payload.complexity || null,
        payload.modelUsed || null,
        payload.usedJudge ?? null,
        payload.judgeVerdict || null,
        payload.needsRag ?? null,
        payload.canAnswerFromContext ?? null,
        payload.messagesInSession || null,
        payload.answerLength || null,
        payload.ragDocsCount || null,
        payload.ragSources ? JSON.stringify(payload.ragSources) : null,
        payload.success ?? null,
        payload.errorCode || null,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
      ]
    );
  } catch (error) {
    // Log but don't throw - analytics failures shouldn't break the app
    logger.warn("Analytics logging failed", {
      error: error instanceof Error ? error.message : String(error),
      eventType: payload.eventType,
      aiUserId: payload.aiUserId.substring(0, 10) + "...", // Only log partial ID
    });
  }
}

/**
 * Log an API error to the database
 */
export async function logApiError(params: {
  aiUserId?: string;
  endpoint: string;
  errorMessage: string;
  errorStack?: string;
  statusCode?: number;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO api_errors (ai_user_id, endpoint, error_message, error_stack, status_code, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        params.aiUserId || null,
        params.endpoint,
        params.errorMessage,
        params.errorStack || null,
        params.statusCode || null,
      ]
    );
  } catch (error) {
    logger.warn("API error logging failed", {
      error: error instanceof Error ? error.message : String(error),
      endpoint: params.endpoint,
    });
  }
}

