/**
 * System Health Check Route
 * 
 * Checks connectivity to Supabase, Stripe, OpenAI, and Anthropic.
 * Can be called manually or via cron job.
 */

import { query } from "@/lib/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import Stripe from "stripe";

export const runtime = "nodejs";

type HealthCheckResult = {
  check_name: string;
  status: "ok" | "degraded" | "down";
  message: string;
  latency_ms: number | null;
};

async function checkSupabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    await query("SELECT 1");
    const latency = Date.now() - start;
    return {
      check_name: "supabase",
      status: latency < 500 ? "ok" : "degraded",
      message: latency < 500 ? "Connected" : `Slow response (${latency}ms)`,
      latency_ms: latency,
    };
  } catch (error) {
    return {
      check_name: "supabase",
      status: "down",
      message: error instanceof Error ? error.message : String(error),
      latency_ms: Date.now() - start,
    };
  }
}

async function checkStripe(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const stripeKey = env.stripe.secretKey();
    if (!stripeKey) {
      return {
        check_name: "stripe",
        status: "down",
        message: "Stripe API key not configured",
        latency_ms: null,
      };
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    await stripe.customers.list({ limit: 1 });
    const latency = Date.now() - start;
    return {
      check_name: "stripe",
      status: latency < 1000 ? "ok" : "degraded",
      message: latency < 1000 ? "Connected" : `Slow response (${latency}ms)`,
      latency_ms: latency,
    };
  } catch (error) {
    return {
      check_name: "stripe",
      status: "down",
      message: error instanceof Error ? error.message : String(error),
      latency_ms: Date.now() - start,
    };
  }
}

async function checkOpenAI(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const apiKey = env.openai.apiKey();
    if (!apiKey) {
      return {
        check_name: "openai",
        status: "down",
        message: "OpenAI API key not configured",
        latency_ms: null,
      };
    }

    const client = new OpenAI({ apiKey });
    await client.chat.completions.create({
      model: env.openai.cheapModel(),
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });
    const latency = Date.now() - start;
    return {
      check_name: "openai",
      status: latency < 2000 ? "ok" : "degraded",
      message: latency < 2000 ? "Connected" : `Slow response (${latency}ms)`,
      latency_ms: latency,
    };
  } catch (error) {
    return {
      check_name: "openai",
      status: "down",
      message: error instanceof Error ? error.message : String(error),
      latency_ms: Date.now() - start,
    };
  }
}

async function checkAnthropic(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const apiKey = env.anthropic.apiKey();
    if (!apiKey) {
      return {
        check_name: "anthropic",
        status: "down",
        message: "Anthropic API key not configured",
        latency_ms: null,
      };
    }

    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: env.anthropic.judgeModel(),
      max_tokens: 5,
      messages: [{ role: "user", content: "ping" }],
    });
    const latency = Date.now() - start;
    return {
      check_name: "anthropic",
      status: latency < 2000 ? "ok" : "degraded",
      message: latency < 2000 ? "Connected" : `Slow response (${latency}ms)`,
      latency_ms: latency,
    };
  } catch (error) {
    return {
      check_name: "anthropic",
      status: "down",
      message: error instanceof Error ? error.message : String(error),
      latency_ms: Date.now() - start,
    };
  }
}

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Run all health checks in parallel
    const [supabase, stripe, openai, anthropic] = await Promise.all([
      checkSupabase(),
      checkStripe(),
      checkOpenAI(),
      checkAnthropic(),
    ]);

    const results = [supabase, stripe, openai, anthropic];

    // Save results to database
    for (const result of results) {
      try {
        await query(
          `INSERT INTO system_health_checks (check_name, status, message, latency_ms, checked_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            result.check_name,
            result.status,
            result.message,
            result.latency_ms,
          ]
        );
      } catch (dbError) {
        logger.warn("Failed to save health check result", {
          error: dbError,
          checkName: result.check_name,
          requestId,
        });
      }
    }

    // Log errors if any service is down
    const downServices = results.filter((r) => r.status === "down");
    if (downServices.length > 0) {
      for (const service of downServices) {
        await query(
          `INSERT INTO api_errors (endpoint, error_message, status_code, created_at)
           VALUES ($1, $2, 503, NOW())`,
          [`health-check-${service.check_name}`, service.message]
        );
      }
    }

    // Determine overall status
    const overallStatus =
      downServices.length > 0
        ? "down"
        : results.some((r) => r.status === "degraded")
        ? "degraded"
        : "ok";

    return Response.json(
      {
        status: overallStatus,
        checks: results,
        timestamp: new Date().toISOString(),
      },
      {
        status: overallStatus === "down" ? 503 : 200,
        headers: {
          "X-Request-Id": requestId,
        },
      }
    );
  } catch (error) {
    logger.error("Health check failed", {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });

    return Response.json(
      {
        status: "down",
        error: "Health check execution failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

