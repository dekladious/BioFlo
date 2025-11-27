import { queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import {
  ExperimentPhase,
  ExperimentVerdict,
  ExperimentWindowMetrics,
  TRACKED_METRIC_PRESETS,
  UserExperiment,
} from "./types";
import {
  getExperimentForUser,
  recordExperimentWindowMetrics,
  upsertExperimentFeedback,
} from "./service";
import { generateExperimentSummary } from "@/lib/ai/experiments/summary";

type MetricDirection = "increase_good" | "decrease_good" | "neutral";

type MetricDefinition = {
  metric: string;
  source: "wearable" | "check_ins";
  column: string;
  direction: MetricDirection;
  transform?: (value: number | null) => number | null;
};

const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  sleep_duration_hours: {
    metric: "sleep_duration_hours",
    source: "wearable",
    column: "sleep_total_minutes",
    direction: "increase_good",
    transform: (value) => (value == null ? null : Number(value) / 60),
  },
  sleep_efficiency: {
    metric: "sleep_efficiency",
    source: "wearable",
    column: "sleep_efficiency",
    direction: "increase_good",
  },
  hrv_rmssd: {
    metric: "hrv_rmssd",
    source: "wearable",
    column: "hrv_baseline",
    direction: "increase_good",
  },
  resting_hr: {
    metric: "resting_hr",
    source: "wearable",
    column: "resting_hr",
    direction: "decrease_good",
  },
  strain_load: {
    metric: "strain_load",
    source: "wearable",
    column: "training_load",
    direction: "neutral",
  },
  steps: {
    metric: "steps",
    source: "wearable",
    column: "steps",
    direction: "increase_good",
  },
  mood: {
    metric: "mood",
    source: "check_ins",
    column: "mood",
    direction: "increase_good",
  },
  energy: {
    metric: "energy",
    source: "check_ins",
    column: "energy",
    direction: "increase_good",
  },
  sleep_quality: {
    metric: "sleep_quality",
    source: "check_ins",
    column: "sleep_quality",
    direction: "increase_good",
  },
};

const DEFAULT_PRE_WINDOW_DAYS = 14;
const DEFAULT_POST_WINDOW_DAYS = 7;
const MIN_DELTA_THRESHOLD = 0.05; // 5%

type DateRange = { start: Date; end: Date };

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function subtractDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isValidRange(range: DateRange | null): range is DateRange {
  if (!range) return false;
  return range.end >= range.start;
}

async function aggregateWearableMetrics(
  userId: string,
  range: DateRange,
  metrics: MetricDefinition[]
): Promise<ExperimentWindowMetrics> {
  if (!metrics.length) return {};

  const selectParts: string[] = [];
  metrics.forEach((metric, index) => {
    selectParts.push(`AVG(${metric.column}) AS w_${index}_avg`);
    selectParts.push(`COUNT(${metric.column})::INT AS w_${index}_count`);
  });

  const sql = `
    SELECT ${selectParts.join(", ")}
    FROM wearable_features_daily
    WHERE user_id = $1
      AND date BETWEEN $2 AND $3
  `;

  const row = await queryOne<Record<string, number | null>>(sql, [
    userId,
    formatDate(range.start),
    formatDate(range.end),
  ]);

  const metricsResult: ExperimentWindowMetrics = {};
  metrics.forEach((metric, index) => {
    const averageRaw = row ? (row[`w_${index}_avg`] as number | null) : null;
    const countRaw = row ? Number(row[`w_${index}_count`] ?? 0) : 0;
    const normalizedAverage =
      averageRaw == null ? null : metric.transform ? metric.transform(Number(averageRaw)) : Number(averageRaw);
    metricsResult[metric.metric] = {
      average: normalizedAverage,
      sampleSize: countRaw,
    };
  });

  return metricsResult;
}

async function aggregateCheckInMetrics(
  userId: string,
  range: DateRange,
  metrics: MetricDefinition[]
): Promise<ExperimentWindowMetrics> {
  if (!metrics.length) return {};

  const selectParts: string[] = [];
  metrics.forEach((metric, index) => {
    selectParts.push(`AVG(${metric.column}) AS c_${index}_avg`);
    selectParts.push(`COUNT(${metric.column})::INT AS c_${index}_count`);
  });

  const sql = `
    SELECT ${selectParts.join(", ")}
    FROM check_ins
    WHERE user_id = $1
      AND created_at::date BETWEEN $2 AND $3
  `;

  const row = await queryOne<Record<string, number | null>>(sql, [
    userId,
    formatDate(range.start),
    formatDate(range.end),
  ]);

  const metricsResult: ExperimentWindowMetrics = {};
  metrics.forEach((metric, index) => {
    const averageRaw = row ? (row[`c_${index}_avg`] as number | null) : null;
    const countRaw = row ? Number(row[`c_${index}_count`] ?? 0) : 0;
    metricsResult[metric.metric] = {
      average: averageRaw == null ? null : Number(averageRaw),
      sampleSize: countRaw,
    };
  });

  return metricsResult;
}

async function collectWindowMetrics(
  userId: string,
  range: DateRange,
  metricNames: string[]
): Promise<ExperimentWindowMetrics> {
  const wearableMetrics = metricNames
    .map((name) => METRIC_DEFINITIONS[name])
    .filter((definition) => definition?.source === "wearable") as MetricDefinition[];
  const checkInMetrics = metricNames
    .map((name) => METRIC_DEFINITIONS[name])
    .filter((definition) => definition?.source === "check_ins") as MetricDefinition[];

  const [wearableData, checkInData] = await Promise.all([
    aggregateWearableMetrics(userId, range, wearableMetrics),
    aggregateCheckInMetrics(userId, range, checkInMetrics),
  ]);

  return { ...wearableData, ...checkInData };
}

function deriveVerdictFromMetrics(
  preMetrics: ExperimentWindowMetrics | null,
  duringMetrics: ExperimentWindowMetrics | null,
  trackedMetrics: string[]
): ExperimentVerdict {
  if (!preMetrics || !duringMetrics) return "neutral";

  let score = 0;

  trackedMetrics.forEach((metric) => {
    const definition = METRIC_DEFINITIONS[metric];
    if (!definition) return;

    const pre = preMetrics[metric]?.average;
    const during = duringMetrics[metric]?.average;
    if (pre == null || during == null || pre === 0) return;

    const delta = (during - pre) / Math.abs(pre);

    if (definition.direction === "increase_good") {
      if (delta > MIN_DELTA_THRESHOLD) score += 1;
      else if (delta < -MIN_DELTA_THRESHOLD) score -= 1;
    } else if (definition.direction === "decrease_good") {
      if (delta < -MIN_DELTA_THRESHOLD) score += 1;
      else if (delta > MIN_DELTA_THRESHOLD) score -= 1;
    }
  });

  if (score >= 2) return "promising";
  if (score <= -2) return "not_helpful";
  return "neutral";
}

function buildRange(start: Date, end: Date): DateRange {
  return { start, end };
}

type WindowResult = {
  phase: ExperimentPhase;
  metrics: ExperimentWindowMetrics;
};

export type ExperimentAnalysisResult = {
  experiment: UserExperiment;
  windows: WindowResult[];
  verdict: ExperimentVerdict;
  summary?: string;
};

export async function analyzeExperiment(clerkUserId: string, experimentId: string): Promise<ExperimentAnalysisResult> {
  const record = await getExperimentForUser(clerkUserId, experimentId);
  if (!record) {
    throw new Error("Experiment not found");
  }

  const experiment = record.experiment;
  if (!experiment.start_date) {
    throw new Error("Experiment start date is required before analysis");
  }

  const trackedMetrics =
    experiment.tracked_metrics.length > 0 ? experiment.tracked_metrics : Array.from(TRACKED_METRIC_PRESETS);

  const userId = experiment.user_id;
  const startDate = new Date(experiment.start_date);
  const endDate = experiment.end_date ? new Date(experiment.end_date) : new Date();

  const preRange = buildRange(
    subtractDays(startDate, Math.max(DEFAULT_PRE_WINDOW_DAYS, experiment.min_duration_days)),
    subtractDays(startDate, 1)
  );

  const duringRange = buildRange(startDate, endDate);

  const postRange = experiment.end_date
    ? buildRange(addDays(endDate, 1), addDays(endDate, DEFAULT_POST_WINDOW_DAYS))
    : null;

  const windows: WindowResult[] = [];

  if (isValidRange(preRange)) {
    const metrics = await collectWindowMetrics(userId, preRange, trackedMetrics);
    await recordExperimentWindowMetrics(experiment.id, "pre", metrics);
    windows.push({ phase: "pre", metrics });
  }

  if (isValidRange(duringRange)) {
    const metrics = await collectWindowMetrics(userId, duringRange, trackedMetrics);
    await recordExperimentWindowMetrics(experiment.id, "during", metrics);
    windows.push({ phase: "during", metrics });
  }

  if (isValidRange(postRange)) {
    const metrics = await collectWindowMetrics(userId, postRange, trackedMetrics);
    await recordExperimentWindowMetrics(experiment.id, "post", metrics);
    windows.push({ phase: "post", metrics });
  }

  const preMetrics = windows.find((w) => w.phase === "pre")?.metrics ?? null;
  const duringMetrics = windows.find((w) => w.phase === "during")?.metrics ?? null;

  const verdict = deriveVerdictFromMetrics(preMetrics, duringMetrics, trackedMetrics);

  let summary: string | undefined;
  if (windows.length > 0) {
    try {
      summary = await generateExperimentSummary({
        experiment,
        windows,
        systemLabel: verdict,
      });
    } catch (error) {
      logger.error("Failed to generate experiment summary", { experimentId, error });
    }
  }

  await upsertExperimentFeedback(experiment.id, {
    systemLabel: verdict,
    aiSummary: summary,
  });

  return {
    experiment,
    windows,
    verdict,
    summary,
  };
}




