import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: List available protocols
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Get all available protocols
    const protocols = await query<{
      id: number;
      slug: string;
      name: string;
      description: string | null;
      config: unknown;
      created_at: Date;
    }>("SELECT id, slug, name, description, config, created_at FROM protocols ORDER BY name");

    logger.info("Protocols: Listed", { userId, count: protocols.length, requestId });

    return Response.json({
      success: true,
      data: {
        protocols: protocols.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          config: p.config,
        })),
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Protocols API error", error);
    return createErrorResponse("Failed to fetch protocols", requestId, 500);
  }
}

