import { auth } from "@clerk/nextjs/server";
import { getDbPool, query } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// POST: Track tool usage
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { toolName, inputData, outputData } = body;

    if (!toolName) {
      return createErrorResponse("toolName is required", requestId, 400);
    }

    try {
      const pool = getDbPool();
      
      // Get or create user record
      let user = await query<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [userId]
      );

      if (user.length === 0) {
        const result = await query<{ id: string }>(
          "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        user = result;
      }

      // Save tool usage
      await query(
        `INSERT INTO tool_usage (user_id, tool_name, input_data, output_data)
         VALUES ($1, $2, $3, $4)`,
        [
          user[0].id,
          toolName,
          inputData ? JSON.stringify(inputData) : null,
          outputData ? JSON.stringify(outputData) : null,
        ]
      );

      logger.info("Tool usage tracked", { userId, toolName, requestId });

      return Response.json({
        success: true,
        data: { message: "Tool usage tracked" },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (dbError: unknown) {
      // Graceful degradation if database not available
      if (dbError instanceof Error && dbError.message.includes("DATABASE_URL")) {
        logger.warn("Database not configured, skipping tool usage tracking", { userId, requestId });
        return Response.json({
          success: true,
          data: { message: "Tool usage tracking skipped (database not configured)" },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
      throw dbError;
    }
  } catch (error: unknown) {
    logger.error("Tool analytics error", error);
    return createErrorResponse("Failed to track tool usage", requestId, 500);
  }
}

// GET: Get tool usage analytics (admin/user stats)
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    try {
      const pool = getDbPool();
      
      // Get user ID
      const user = await query<{ id: string }>(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [userId]
      );

      if (user.length === 0) {
        return Response.json({
          success: true,
          data: { toolUsage: [], totalUsage: 0 },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }

      // Get tool usage stats for this user
      const toolUsage = await query<{
        tool_name: string;
        usage_count: number;
        last_used: Date;
      }>(
        `SELECT 
          tool_name,
          COUNT(*) as usage_count,
          MAX(created_at) as last_used
         FROM tool_usage
         WHERE user_id = $1
         GROUP BY tool_name
         ORDER BY usage_count DESC`,
        [user[0].id]
      );

      const totalUsage = toolUsage.reduce((sum, tool) => sum + Number(tool.usage_count), 0);

      return Response.json({
        success: true,
        data: {
          toolUsage: toolUsage.map(tool => ({
            toolName: tool.tool_name,
            usageCount: Number(tool.usage_count),
            lastUsed: tool.last_used.toISOString(),
          })),
          totalUsage,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (dbError: unknown) {
      // Graceful degradation if database not available
      if (dbError instanceof Error && dbError.message.includes("DATABASE_URL")) {
        logger.warn("Database not configured, returning empty analytics", { userId, requestId });
        return Response.json({
          success: true,
          data: { toolUsage: [], totalUsage: 0 },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
      throw dbError;
    }
  } catch (error: unknown) {
    logger.error("Analytics API error", error);
    return createErrorResponse("Failed to fetch analytics", requestId, 500);
  }
}

