import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { analyzeExperiment } from "@/lib/experiments/analytics";
import { createErrorResponse, getRequestMetadata } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: { experimentId: string } }
) {
  const { requestId } = getRequestMetadata(req);
  const experimentId = params.experimentId;

  if (!experimentId) {
    return createErrorResponse("Experiment ID is required", requestId, 400);
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const result = await analyzeExperiment(userId, experimentId);

    return NextResponse.json(
      {
        success: true,
        data: {
          experiment: {
            id: result.experiment.id,
            status: result.experiment.status,
            verdict: result.verdict,
            summary: result.summary,
          },
          windows: result.windows,
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Experiment analysis failed", { experimentId, error });
    if ((error as Error).message === "Experiment not found") {
      return createErrorResponse("Experiment not found", requestId, 404);
    }
    if ((error as Error).message === "Experiment start date is required before analysis") {
      return createErrorResponse("Start the experiment before analysis", requestId, 400);
    }
    return createErrorResponse("Failed to analyze experiment", requestId, 500);
  }
}




