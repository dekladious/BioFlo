import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { getExperimentForUser } from "@/lib/experiments/service";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export async function GET(
  req: Request,
  { params }: { params: { experimentId: string } }
) {
  const { requestId } = getRequestMetadata(req);
  const { experimentId } = params;

  if (!experimentId) {
    return createErrorResponse("Experiment ID is required", requestId, 400);
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const record = await getExperimentForUser(userId, experimentId);
    if (!record) {
      return createErrorResponse("Experiment not found", requestId, 404);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          experiment: {
            id: record.experiment.id,
            name: record.experiment.name,
            description: record.experiment.description,
            experimentType: record.experiment.experiment_type,
            hypothesis: record.experiment.hypothesis,
            successCriteria: record.experiment.success_criteria,
            trackedMetrics: record.experiment.tracked_metrics,
            minDurationDays: record.experiment.min_duration_days,
            startDate: record.experiment.start_date,
            endDate: record.experiment.end_date,
            status: record.experiment.status,
            createdByAi: record.experiment.created_by_ai,
            metadata: record.experiment.metadata,
            verdict: record.experiment.verdict ?? null,
            aiSummary: record.experiment.ai_summary ?? null,
            createdAt: record.experiment.created_at,
            updatedAt: record.experiment.updated_at,
          },
          windows: record.windows,
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to load experiment detail", { experimentId, error });
    if ((error as Error).message === "User not found") {
      return createErrorResponse("User not found", requestId, 404);
    }
    return createErrorResponse("Failed to load experiment", requestId, 500);
  }
}

