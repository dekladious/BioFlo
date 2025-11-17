import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Get protocol by slug
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { requestId } = getRequestMetadata(req);
  const { slug } = await params;

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Get protocol by slug
    const protocol = await queryOne<{
      id: number;
      slug: string;
      name: string;
      description: string | null;
      config: unknown;
      created_at: Date;
    }>("SELECT id, slug, name, description, config, created_at FROM protocols WHERE slug = $1", [slug]);

    if (!protocol) {
      return createErrorResponse("Protocol not found", requestId, 404);
    }

    // Get user ID from database
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    // Get active run for this protocol (if any)
    let activeRun = null;
    if (user) {
      const run = await queryOne<{
        id: number;
        status: string;
        started_at: Date;
        state: unknown;
      }>(
        `SELECT id, status, started_at, state
         FROM protocol_runs
         WHERE user_id = $1 AND protocol_id = $2 AND status = 'active'
         ORDER BY started_at DESC
         LIMIT 1`,
        [user.id, protocol.id]
      );

      if (run) {
        // Get logs for this run
        const logs = await query<{
          day_index: number;
          completed: boolean;
          notes: string | null;
        }>(
          `SELECT day_index, completed, notes
           FROM protocol_logs
           WHERE protocol_run_id = $1
           ORDER BY day_index ASC`,
          [run.id]
        );

        activeRun = {
          id: run.id,
          status: run.status,
          startedAt: run.started_at.toISOString(),
          state: run.state,
          logs: logs.map((log) => ({
            dayIndex: log.day_index,
            completed: log.completed,
            notes: log.notes,
          })),
        };
      }
    }

    logger.info("Protocol fetched", { userId, slug, requestId });

    return Response.json({
      success: true,
      data: {
        protocol: {
          id: protocol.id,
          slug: protocol.slug,
          name: protocol.name,
          description: protocol.description,
          config: protocol.config,
        },
        activeRun,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Protocol API error", error);
    return createErrorResponse("Failed to fetch protocol", requestId, 500);
  }
}

