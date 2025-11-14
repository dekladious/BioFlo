import { auth } from "@clerk/nextjs/server";
import { clearRateLimitStore } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Admin endpoint to reset rate limits (development only)
export async function POST(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    clearRateLimitStore();
    logger.info("Rate limit store cleared", { userId });

    return Response.json({
      success: true,
      message: "Rate limit store cleared successfully",
    });
  } catch (error) {
    logger.error("Error clearing rate limit store", error);
    return Response.json(
      { error: "Failed to clear rate limit store" },
      { status: 500 }
    );
  }
}

