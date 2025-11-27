export type ExperimentStatus = "draft" | "scheduled" | "active" | "completed" | "aborted";

export type ExperimentPhase = "pre" | "during" | "post";

export type ExperimentVerdict = "promising" | "neutral" | "not_helpful";

export type UserExperiment = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  experiment_type: string | null;
  hypothesis: string | null;
  success_criteria: string | null;
  tracked_metrics: string[];
  min_duration_days: number;
  start_date: string | null;
  end_date: string | null;
  status: ExperimentStatus;
  created_by_ai: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  verdict?: ExperimentVerdict | null;
  ai_summary?: string | null;
};

export type ExperimentSummary = {
  id: string;
  name: string;
  status: ExperimentStatus;
  startDate?: string | null;
  endDate?: string | null;
  verdict?: ExperimentVerdict;
  aiSummary?: string | null;
};

export type ExperimentWindow = {
  id: string;
  experiment_id: string;
  phase: ExperimentPhase;
  metrics: Record<string, unknown>;
  generated_at: string;
};

export const TRACKED_METRIC_PRESETS = [
  "sleep_duration_hours",
  "sleep_efficiency",
  "hrv_rmssd",
  "resting_hr",
  "strain_load",
  "steps",
  "mood",
  "energy",
  "sleep_quality",
] as const;

export type TrackedMetric = (typeof TRACKED_METRIC_PRESETS)[number];

export type CreateExperimentPayload = {
  name: string;
  description?: string;
  experimentType?: string;
  hypothesis?: string;
  successCriteria?: string;
  trackedMetrics?: string[];
  minDurationDays?: number;
  startDate?: string | null;
  endDate?: string | null;
  createdByAi?: boolean;
  metadata?: Record<string, unknown>;
};

export type ExperimentMetricValue = {
  average: number | null;
  sampleSize: number;
};

export type ExperimentWindowMetrics = Record<string, ExperimentMetricValue>;

export type ExperimentAnalysisResponse = {
  experiment: UserExperiment;
  windows: {
    phase: ExperimentPhase;
    metrics: ExperimentWindowMetrics;
  }[];
  verdict: ExperimentVerdict;
  summary?: string;
};

