/**
 * Analytics Query Functions
 * 
 * Server-side functions to query analytics data for the admin dashboard.
 */

import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export async function getUserAndRevenueSummary(): Promise<{
  totalUsers: number;
  activeSubscribers: number;
  mrr: number;
  arr: number;
  churnRate30d: number | null;
  newUsers7d: number;
  newSubscribers7d: number;
}> {
  try {
    // Total users
    const totalUsersResult = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM users"
    );
    const totalUsers = parseInt(totalUsersResult?.count || "0", 10);

    // Active subscribers (users with active Stripe subscriptions)
    // Note: This assumes you have a way to link Stripe customers to users
    // Adjust based on your actual schema
    let activeSubscribers = 0;
    let mrr = 0;
    
    try {
      // Check if stripe_subscriptions table exists by trying a simple query
      const activeSubscribersResult = await queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         INNER JOIN stripe_subscriptions ss ON u.stripe_customer_id = ss.customer_id
         WHERE ss.status = 'active' AND ss.current_period_end > NOW()`
      );
      activeSubscribers = parseInt(activeSubscribersResult?.count || "0", 10);

      // MRR (Monthly Recurring Revenue)
      const mrrResult = await queryOne<{ mrr: string }>(
        `SELECT COALESCE(SUM(ss.amount / 100.0), 0) as mrr
         FROM stripe_subscriptions ss
         WHERE ss.status = 'active' AND ss.current_period_end > NOW()`
      );
      mrr = parseFloat(mrrResult?.mrr || "0");
    } catch (stripeError) {
      // Stripe tables might not exist yet - that's OK
      logger.debug("Stripe subscription queries failed (tables may not exist)", { error: stripeError });
      activeSubscribers = 0;
      mrr = 0;
    }

    // ARR (Annual Run Rate)
    const arr = mrr * 12;

    // Churn rate (30 days) - only if stripe_subscriptions exists
    let churnRate30d: number | null = null;
    try {
      const churnResult = await queryOne<{
        churned: string;
        total_30d_ago: string;
      }>(
        `SELECT 
           COUNT(CASE WHEN ss.canceled_at >= NOW() - INTERVAL '30 days' THEN 1 END) as churned,
           COUNT(CASE WHEN ss.created_at <= NOW() - INTERVAL '30 days' AND ss.status = 'active' THEN 1 END) as total_30d_ago
         FROM stripe_subscriptions ss
         WHERE ss.created_at <= NOW() - INTERVAL '30 days'`
      );
      const churned = parseInt(churnResult?.churned || "0", 10);
      const total30dAgo = parseInt(churnResult?.total_30d_ago || "0", 10);
      churnRate30d = total30dAgo > 0 ? (churned / total30dAgo) * 100 : null;
    } catch (churnError) {
      // Stripe tables might not exist yet - that's OK
      logger.debug("Churn rate query failed (tables may not exist)", { error: churnError });
      churnRate30d = null;
    }

    // New users (7 days)
    const newUsersResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM users
       WHERE created_at >= NOW() - INTERVAL '7 days'`
    );
    const newUsers7d = parseInt(newUsersResult?.count || "0", 10);

    // New subscribers (7 days) - only if stripe_subscriptions exists
    let newSubscribers7d = 0;
    try {
      const newSubscribersResult = await queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         INNER JOIN stripe_subscriptions ss ON u.stripe_customer_id = ss.customer_id
         WHERE ss.created_at >= NOW() - INTERVAL '7 days'`
      );
      newSubscribers7d = parseInt(newSubscribersResult?.count || "0", 10);
    } catch (subscriberError) {
      // Stripe tables might not exist yet - that's OK
      logger.debug("New subscribers query failed (tables may not exist)", { error: subscriberError });
      newSubscribers7d = 0;
    }

    return {
      totalUsers,
      activeSubscribers,
      mrr,
      arr,
      churnRate30d,
      newUsers7d,
      newSubscribers7d,
    };
  } catch (error) {
    logger.error("Failed to get user and revenue summary", { error });
    // Return safe defaults
    return {
      totalUsers: 0,
      activeSubscribers: 0,
      mrr: 0,
      arr: 0,
      churnRate30d: null,
      newUsers7d: 0,
      newSubscribers7d: 0,
    };
  }
}

export async function getAiUsageSummary(): Promise<{
  totalChats24h: number;
  totalChats7d: number;
  avgMessagesPerSession: number;
  modelBreakdown7d: { model: string; count: number }[];
  topicDistribution7d: { topic: string; count: number }[];
  riskDistribution7d: { risk: string; count: number }[];
  judgeUsage7d: { usedJudge: boolean; count: number }[];
  safetyOutcomes7d: { verdict: string; count: number }[];
}> {
  try {
    // Total chats (24h, 7d)
    const chats24hResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'chat_response' AND event_ts >= NOW() - INTERVAL '24 hours'`
    );
    const totalChats24h = parseInt(chats24hResult?.count || "0", 10);

    const chats7dResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'chat_response' AND event_ts >= NOW() - INTERVAL '7 days'`
    );
    const totalChats7d = parseInt(chats7dResult?.count || "0", 10);

    // Average messages per session
    const avgMessagesResult = await queryOne<{ avg: string }>(
      `SELECT AVG(messages_in_session) as avg
       FROM analytics_events
       WHERE event_type = 'chat_response' AND messages_in_session IS NOT NULL AND event_ts >= NOW() - INTERVAL '7 days'`
    );
    const avgMessagesPerSession = parseFloat(avgMessagesResult?.avg || "0");

    // Model breakdown (7d)
    const modelBreakdownRows = await query<{ model_used: string; count: string }>(
      `SELECT model_used, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'chat_response' AND model_used IS NOT NULL AND event_ts >= NOW() - INTERVAL '7 days'
       GROUP BY model_used
       ORDER BY count DESC`
    );
    const modelBreakdown7d = modelBreakdownRows.map((row) => ({
      model: row.model_used,
      count: parseInt(row.count, 10),
    }));

    // Topic distribution (7d)
    const topicRows = await query<{ topic: string; count: string }>(
      `SELECT topic, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'chat_response' AND topic IS NOT NULL AND event_ts >= NOW() - INTERVAL '7 days'
       GROUP BY topic
       ORDER BY count DESC`
    );
    const topicDistribution7d = topicRows.map((row) => ({
      topic: row.topic,
      count: parseInt(row.count, 10),
    }));

    // Risk distribution (7d)
    const riskRows = await query<{ risk: string; count: string }>(
      `SELECT risk, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'chat_response' AND risk IS NOT NULL AND event_ts >= NOW() - INTERVAL '7 days'
       GROUP BY risk
       ORDER BY count DESC`
    );
    const riskDistribution7d = riskRows.map((row) => ({
      risk: row.risk,
      count: parseInt(row.count, 10),
    }));

    // Judge usage (7d)
    const judgeRows = await query<{ used_judge: boolean; count: string }>(
      `SELECT used_judge, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'chat_response' AND used_judge IS NOT NULL AND event_ts >= NOW() - INTERVAL '7 days'
       GROUP BY used_judge`
    );
    const judgeUsage7d = judgeRows.map((row) => ({
      usedJudge: row.used_judge,
      count: parseInt(row.count, 10),
    }));

    // Safety outcomes (7d)
    const verdictRows = await query<{ judge_verdict: string; count: string }>(
      `SELECT judge_verdict, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'chat_response' AND judge_verdict IS NOT NULL AND event_ts >= NOW() - INTERVAL '7 days'
       GROUP BY judge_verdict
       ORDER BY count DESC`
    );
    const safetyOutcomes7d = verdictRows.map((row) => ({
      verdict: row.judge_verdict,
      count: parseInt(row.count, 10),
    }));

    return {
      totalChats24h,
      totalChats7d,
      avgMessagesPerSession,
      modelBreakdown7d,
      topicDistribution7d,
      riskDistribution7d,
      judgeUsage7d,
      safetyOutcomes7d,
    };
  } catch (error) {
    logger.error("Failed to get AI usage summary", { error });
    return {
      totalChats24h: 0,
      totalChats7d: 0,
      avgMessagesPerSession: 0,
      modelBreakdown7d: [],
      topicDistribution7d: [],
      riskDistribution7d: [],
      judgeUsage7d: [],
      safetyOutcomes7d: [],
    };
  }
}

export async function getRagPerformanceMetrics(): Promise<{
  avgRagDocsPerCall: number;
  ragUsageRate7d: number;
  canAnswerFromContextRate7d: number | null;
}> {
  try {
    // Average RAG docs per call
    const avgDocsResult = await queryOne<{ avg: string }>(
      `SELECT AVG(rag_docs_count) as avg
       FROM analytics_events
       WHERE event_type = 'chat_response' AND needs_rag = true AND rag_docs_count IS NOT NULL AND event_ts >= NOW() - INTERVAL '7 days'`
    );
    const avgRagDocsPerCall = parseFloat(avgDocsResult?.avg || "0");

    // RAG usage rate (7d)
    const ragUsageResult = await queryOne<{
      with_rag: string;
      total: string;
    }>(
      `SELECT 
         COUNT(CASE WHEN needs_rag = true THEN 1 END) as with_rag,
         COUNT(*) as total
       FROM analytics_events
       WHERE event_type = 'chat_response' AND event_ts >= NOW() - INTERVAL '7 days'`
    );
    const withRag = parseInt(ragUsageResult?.with_rag || "0", 10);
    const total = parseInt(ragUsageResult?.total || "0", 10);
    const ragUsageRate7d = total > 0 ? (withRag / total) * 100 : 0;

    // Can answer from context rate (7d)
    const contextResult = await queryOne<{
      can_answer: string;
      total_rag: string;
    }>(
      `SELECT 
         COUNT(CASE WHEN can_answer_from_context = true THEN 1 END) as can_answer,
         COUNT(*) as total_rag
       FROM analytics_events
       WHERE event_type = 'chat_response' AND needs_rag = true AND can_answer_from_context IS NOT NULL AND event_ts >= NOW() - INTERVAL '7 days'`
    );
    const canAnswer = parseInt(contextResult?.can_answer || "0", 10);
    const totalRag = parseInt(contextResult?.total_rag || "0", 10);
    const canAnswerFromContextRate7d = totalRag > 0 ? (canAnswer / totalRag) * 100 : null;

    return {
      avgRagDocsPerCall,
      ragUsageRate7d,
      canAnswerFromContextRate7d,
    };
  } catch (error) {
    logger.error("Failed to get RAG performance metrics", { error });
    return {
      avgRagDocsPerCall: 0,
      ragUsageRate7d: 0,
      canAnswerFromContextRate7d: null,
    };
  }
}

export async function getHealthStatusSummary(): Promise<{
  lastChecks: {
    check_name: string;
    status: string;
    latency_ms: number | null;
    checked_at: string;
  }[];
  errorCounts24h: {
    endpoint: string;
    count: number;
  }[];
}> {
  try {
    // Last health checks (most recent per check_name)
    const lastChecksRows = await query<{
      check_name: string;
      status: string;
      latency_ms: number | null;
      checked_at: string;
    }>(
      `SELECT DISTINCT ON (check_name) check_name, status, latency_ms, checked_at
       FROM system_health_checks
       ORDER BY check_name, checked_at DESC`
    );
    const lastChecks = lastChecksRows.map((row) => ({
      check_name: row.check_name,
      status: row.status,
      latency_ms: row.latency_ms,
      checked_at: row.checked_at,
    }));

    // Error counts by endpoint (24h)
    const errorRows = await query<{ endpoint: string; count: string }>(
      `SELECT endpoint, COUNT(*) as count
       FROM api_errors
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY endpoint
       ORDER BY count DESC
       LIMIT 20`
    );
    const errorCounts24h = errorRows.map((row) => ({
      endpoint: row.endpoint,
      count: parseInt(row.count, 10),
    }));

    return {
      lastChecks,
      errorCounts24h,
    };
  } catch (error) {
    logger.error("Failed to get health status summary", { error });
    return {
      lastChecks: [],
      errorCounts24h: [],
    };
  }
}

