import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import {
  CreateExperimentPayload,
  ExperimentStatus,
  ExperimentVerdict,
  ExperimentWindow,
  TRACKED_METRIC_PRESETS,
  TrackedMetric,
  UserExperiment,
} from "./types";

type UserRow = { id: string };

const SUPPORTED_STATUSES: ExperimentStatus[] = ["draft", "scheduled", "active", "completed", "aborted"];
const TRACKED_METRIC_SET = new Set<string>(TRACKED_METRIC_PRESETS);

function normalizeMetric(metric: string): string {
  return metric
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeTrackedMetrics(metrics?: string[]): string[] {
  if (!metrics?.length) return [];
  const deduped = new Set<string>();
  for (const raw of metrics) {
    const normalized = normalizeMetric(raw);
    if (!normalized) continue;
    if (TRACKED_METRIC_SET.has(normalized as TrackedMetric) || TRACKED_METRIC_SET.has(normalized)) {
      deduped.add(normalized);
    } else {
      // Allow custom metrics but keep naming consistent.
      deduped.add(normalized);
    }
  }
  return Array.from(deduped);
}

function inferStatus(startDate?: string | null, endDate?: string | null): ExperimentStatus {
  if (!startDate) return "draft";
  const today = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (start > today) return "scheduled";
  if (end && end < today) return "completed";
  return "active";
}

function mapExperiment(row: any): UserExperiment {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description,
    experiment_type: row.experiment_type,
    hypothesis: row.hypothesis,
    success_criteria: row.success_criteria,
    tracked_metrics: row.tracked_metrics ?? [],
    min_duration_days: row.min_duration_days,
    start_date: row.start_date ? new Date(row.start_date).toISOString().slice(0, 10) : null,
    end_date: row.end_date ? new Date(row.end_date).toISOString().slice(0, 10) : null,
    status: row.status,
    created_by_ai: row.created_by_ai,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapWindow(row: any): ExperimentWindow {
  return {
    id: row.id,
    experiment_id: row.experiment_id,
    phase: row.phase,
    metrics: row.metrics ?? {},
    generated_at: row.generated_at,
  };
}

async function getUserInternalId(clerkUserId: string): Promise<string | null> {
  const user = await queryOne<UserRow>("SELECT id FROM users WHERE clerk_user_id = $1", [clerkUserId]);
  return user?.id ?? null;
}

export async function createExperimentForUser(
  clerkUserId: string,
  payload: CreateExperimentPayload
): Promise<UserExperiment> {
  const userId = await getUserInternalId(clerkUserId);
  if (!userId) {
    throw new Error("User not found");
  }

  const trackedMetrics = normalizeTrackedMetrics(payload.trackedMetrics);
  const minDuration = payload.minDurationDays && payload.minDurationDays > 0 ? payload.minDurationDays : 7;
  const status = inferStatus(payload.startDate ?? null, payload.endDate ?? null);

  const result = await queryOne<UserExperiment>(
    `INSERT INTO user_experiments
      (user_id, name, description, experiment_type, hypothesis, success_criteria, tracked_metrics,
       min_duration_days, start_date, end_date, status, created_by_ai, metadata)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      userId,
      payload.name,
      payload.description ?? null,
      payload.experimentType ?? null,
      payload.hypothesis ?? null,
      payload.successCriteria ?? null,
      trackedMetrics,
      minDuration,
      payload.startDate ?? null,
      payload.endDate ?? null,
      status,
      payload.createdByAi ?? false,
      payload.metadata ?? null,
    ]
  );

  return mapExperiment(result);
}

export async function listExperimentsForUser(clerkUserId: string): Promise<UserExperiment[]> {
  const userId = await getUserInternalId(clerkUserId);
  if (!userId) {
    throw new Error("User not found");
  }

  const rows = await query<UserExperiment>(
    `SELECT * FROM user_experiments
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  const experiments = rows.map(mapExperiment);
  if (!experiments.length) {
    return experiments;
  }

  const feedbackRows = await query<{
    experiment_id: string;
    system_label: ExperimentVerdict | null;
    ai_summary: string | null;
  }>(
    `SELECT experiment_id, system_label, ai_summary
     FROM user_experiment_feedback
     WHERE experiment_id = ANY($1::uuid[])`,
    [experiments.map((exp) => exp.id)]
  );

  const feedbackMap = new Map<string, { verdict: ExperimentVerdict | null; summary: string | null }>();
  feedbackRows.forEach((row) => {
    feedbackMap.set(row.experiment_id, {
      verdict: row.system_label,
      summary: row.ai_summary,
    });
  });

  return experiments.map((experiment) => {
    const feedback = feedbackMap.get(experiment.id);
    return {
      ...experiment,
      verdict: feedback?.verdict ?? experiment.verdict,
      ai_summary: feedback?.summary ?? experiment.ai_summary,
    };
  });
}

export async function getExperimentRecord(experimentId: string): Promise<UserExperiment | null> {
  const row = await queryOne<UserExperiment>(`SELECT * FROM user_experiments WHERE id = $1`, [experimentId]);
  return row ? mapExperiment(row) : null;
}

export async function getExperimentForUser(
  clerkUserId: string,
  experimentId: string
): Promise<{ experiment: UserExperiment; windows: ExperimentWindow[] } | null> {
  const userId = await getUserInternalId(clerkUserId);
  if (!userId) {
    throw new Error("User not found");
  }

  const experiment = await queryOne<UserExperiment>(
    `SELECT * FROM user_experiments WHERE id = $1 AND user_id = $2`,
    [experimentId, userId]
  );
  if (!experiment) {
    return null;
  }

  const feedback = await queryOne<{
    system_label: ExperimentVerdict | null;
    ai_summary: string | null;
  }>(`SELECT system_label, ai_summary FROM user_experiment_feedback WHERE experiment_id = $1`, [experimentId]);

  const windows = await query<ExperimentWindow>(
    `SELECT * FROM user_experiment_windows
     WHERE experiment_id = $1
     ORDER BY
       CASE phase
         WHEN 'pre' THEN 1
         WHEN 'during' THEN 2
         WHEN 'post' THEN 3
         ELSE 4
       END`,
    [experimentId]
  );

  return {
    experiment: {
      ...mapExperiment(experiment),
      verdict: feedback?.system_label ?? null,
      ai_summary: feedback?.ai_summary ?? null,
    },
    windows: windows.map(mapWindow),
  };
}

export async function updateExperimentStatus(experimentId: string, status: ExperimentStatus) {
  if (!SUPPORTED_STATUSES.includes(status)) {
    throw new Error("Unsupported experiment status");
  }
  await query(
    `UPDATE user_experiments
     SET status = $1, updated_at = NOW()
     WHERE id = $2`,
    [status, experimentId]
  );
}

export async function upsertExperimentWindow(
  experimentId: string,
  phase: "pre" | "during" | "post",
  metrics: Record<string, unknown>
) {
  await query(
    `INSERT INTO user_experiment_windows (experiment_id, phase, metrics)
     VALUES ($1,$2,$3)
     ON CONFLICT (experiment_id, phase)
     DO UPDATE SET metrics = EXCLUDED.metrics, generated_at = NOW()`,
    [experimentId, phase, metrics]
  );
}

export async function upsertExperimentFeedback(
  experimentId: string,
  feedback: {
    systemLabel?: "promising" | "neutral" | "not_helpful";
    userLabel?: "success" | "neutral" | "failure";
    userNotes?: string;
    aiSummary?: string;
  }
) {
  const { systemLabel, userLabel, userNotes, aiSummary } = feedback;
  await query(
    `INSERT INTO user_experiment_feedback (experiment_id, system_label, user_label, user_notes, ai_summary, ai_summary_generated_at)
     VALUES ($1,$2,$3,$4,$5, CASE WHEN $5 IS NULL THEN NULL ELSE NOW() END)
     ON CONFLICT (experiment_id)
     DO UPDATE SET
       system_label = COALESCE(EXCLUDED.system_label, user_experiment_feedback.system_label),
       user_label = COALESCE(EXCLUDED.user_label, user_experiment_feedback.user_label),
       user_notes = COALESCE(EXCLUDED.user_notes, user_experiment_feedback.user_notes),
       ai_summary = COALESCE(EXCLUDED.ai_summary, user_experiment_feedback.ai_summary),
       ai_summary_generated_at = CASE
         WHEN EXCLUDED.ai_summary IS NOT NULL THEN NOW()
         ELSE user_experiment_feedback.ai_summary_generated_at
       END,
       updated_at = NOW()`,
    [experimentId, systemLabel ?? null, userLabel ?? null, userNotes ?? null, aiSummary ?? null]
  );
}

export async function recordExperimentWindowMetrics(
  experimentId: string,
  phase: "pre" | "during" | "post",
  metrics: Record<string, unknown>
) {
  try {
    await upsertExperimentWindow(experimentId, phase, metrics);
  } catch (error) {
    logger.error("Failed to upsert experiment window metrics", { experimentId, phase, error });
    throw error;
  }
}

