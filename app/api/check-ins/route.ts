import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// POST: Create a new check-in
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { mood, energy, sleep_quality, notes } = body;

    // Validate inputs
    if (mood !== undefined && (mood < 1 || mood > 10)) {
      return createErrorResponse("Mood must be between 1 and 10", requestId, 400);
    }
    if (energy !== undefined && (energy < 1 || energy > 10)) {
      return createErrorResponse("Energy must be between 1 and 10", requestId, 400);
    }
    if (sleep_quality !== undefined && (sleep_quality < 1 || sleep_quality > 10)) {
      return createErrorResponse("Sleep quality must be between 1 and 10", requestId, 400);
    }

    // Get user ID from database
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Insert check-in
    const result = await query<{ id: number }>(
      `INSERT INTO check_ins (user_id, mood, energy, sleep_quality, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        user.id,
        mood || null,
        energy || null,
        sleep_quality || null,
        notes || null,
      ]
    );

    logger.info("Check-in created", {
      userId,
      checkInId: result[0]?.id,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        id: result[0]?.id,
        message: "Check-in saved successfully",
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Check-in API error", error);
    return createErrorResponse("Failed to save check-in", requestId, 500);
  }
}

// GET: Fetch check-ins with optional date range
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Parse query parameters
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d"; // Default to 7 days

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      // Try to parse as number of days
      const days = parseInt(range.replace("d", ""), 10);
      if (isNaN(days)) {
        return createErrorResponse("Invalid range parameter. Use '7d', '30d', '90d', or a number of days", requestId, 400);
      }
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Get user ID from database
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Fetch check-ins
    const checkIns = await query<{
      id: number;
      mood: number | null;
      energy: number | null;
      sleep_quality: number | null;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT id, mood, energy, sleep_quality, notes, created_at
       FROM check_ins
       WHERE user_id = $1 AND created_at >= $2
       ORDER BY created_at DESC`,
      [user.id, startDate.toISOString()]
    );

    logger.info("Check-ins fetched", {
      userId,
      count: checkIns.length,
      range,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        checkIns: checkIns.map((ci) => ({
          id: ci.id,
          mood: ci.mood,
          energy: ci.energy,
          sleep_quality: ci.sleep_quality,
          notes: ci.notes,
          created_at: ci.created_at.toISOString(),
        })),
        range,
        count: checkIns.length,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Check-ins fetch error", error);
    return createErrorResponse("Failed to fetch check-ins", requestId, 500);
  }
}

