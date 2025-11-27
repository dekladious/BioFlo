import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import {
  createExperimentForUser,
  listExperimentsForUser,
} from "@/lib/experiments/service";
import { CreateExperimentPayload, UserExperiment } from "@/lib/experiments/types";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

function serializeExperiment(experiment: UserExperiment) {
  return {
    id: experiment.id,
    name: experiment.name,
    description: experiment.description,
    experimentType: experiment.experiment_type,
    hypothesis: experiment.hypothesis,
    successCriteria: experiment.success_criteria,
    trackedMetrics: experiment.tracked_metrics,
    minDurationDays: experiment.min_duration_days,
    startDate: experiment.start_date,
    endDate: experiment.end_date,
    status: experiment.status,
    createdByAi: experiment.created_by_ai,
    metadata: experiment.metadata,
    verdict: experiment.verdict ?? null,
    aiSummary: experiment.ai_summary ?? null,
    createdAt: experiment.created_at,
    updatedAt: experiment.updated_at,
  };
}

export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const experiments = await listExperimentsForUser(userId);

    return NextResponse.json(
      {
        success: true,
        data: experiments.map(serializeExperiment),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to list experiments", error);
    return createErrorResponse("Failed to load experiments", requestId, 500);
  }
}

export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const payload = (await req.json()) as CreateExperimentPayload;

    if (!payload?.name || typeof payload.name !== "string") {
      return createErrorResponse("Experiment name is required", requestId, 400);
    }

    const experiment = await createExperimentForUser(userId, payload);

    return NextResponse.json(
      {
        success: true,
        data: serializeExperiment(experiment),
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Failed to create experiment", error);
    if ((error as Error).message === "User not found") {
      return createErrorResponse("User not found", requestId, 404);
    }
    return createErrorResponse("Failed to create experiment", requestId, 500);
  }
}

