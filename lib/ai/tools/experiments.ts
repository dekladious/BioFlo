import { z } from "zod";
import { registerTool } from "@/lib/ai/tools";
import { EXPERIMENT_EXAMPLES } from "@/lib/experiments/promptTemplates";
import {
  createExperimentForUser,
  listExperimentsForUser,
} from "@/lib/experiments/service";
import { analyzeExperiment } from "@/lib/experiments/analytics";
import type {
  CreateExperimentPayload,
  UserExperiment,
} from "@/lib/experiments/types";

const SUPPORTED_STATUS = [
  "draft",
  "scheduled",
  "active",
  "completed",
  "aborted",
] as const;

type SupportedStatus = (typeof SUPPORTED_STATUS)[number];

const CREATE_SCHEMA = z.object({
  name: z.string().min(3, "Experiment name must be at least 3 characters"),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  successCriteria: z.string().optional(),
  durationDays: z.number().int().positive().max(180).optional(),
  metrics: z.array(z.string()).optional(),
});

const LIST_SCHEMA = z.object({
  status: z.enum(SUPPORTED_STATUS).optional(),
  limit: z.number().int().min(1).max(20).default(5),
  includeCompleted: z.boolean().optional(),
});

const ANALYZE_SCHEMA = z.object({
  experimentId: z.string().uuid().optional(),
  experimentName: z.string().min(2).optional(),
});

function buildMetadata(name: string) {
  return {
    suggestedBy: "chat_ai",
    sampleTemplate:
      EXPERIMENT_EXAMPLES.find(
        (example) => example.name.toLowerCase() === name.toLowerCase()
      ) ?? null,
  };
}

async function ensureUserId(userId?: string): Promise<string> {
  if (!userId) {
    throw new Error("User context is required for experiment tools.");
  }
  return userId;
}

function formatExperimentSummary(experiment: UserExperiment) {
  return {
    id: experiment.id,
    name: experiment.name,
    status: experiment.status,
    startDate: experiment.start_date,
    endDate: experiment.end_date,
    trackedMetrics: experiment.tracked_metrics,
    verdict: experiment.verdict ?? null,
    aiSummary: experiment.ai_summary ?? null,
  };
}

registerTool({
  name: "createExperiment",
  description:
    "Create a custom experiment for the user (e.g., no caffeine after noon, 10-minute breathwork nightly). Provide name, short description, hypothesis, success criteria, durationDays, and metrics.",
  input: CREATE_SCHEMA,
  handler: async (args, context) => {
    const clerkUserId = await ensureUserId(context.userId);
    const payload: CreateExperimentPayload = {
      name: args.name,
      description: args.description,
      hypothesis: args.hypothesis,
      successCriteria: args.successCriteria,
      trackedMetrics: args.metrics,
      minDurationDays: args.durationDays ?? 14,
      createdByAi: true,
      metadata: buildMetadata(args.name),
    };
    const experiment = await createExperimentForUser(clerkUserId, payload);
    return {
      experimentId: experiment.id,
      status: experiment.status,
      name: experiment.name,
      trackedMetrics: experiment.tracked_metrics,
    };
  },
});

registerTool({
  name: "listExperiments",
  description:
    "List the user's recent experiments, including status, tracked metrics, and AI verdicts when available.",
  input: LIST_SCHEMA,
  handler: async ({ status, limit, includeCompleted }, context) => {
    const clerkUserId = await ensureUserId(context.userId);
    const experiments = await listExperimentsForUser(clerkUserId);
    const filtered = experiments.filter((experiment) => {
      if (status && experiment.status !== status) return false;
      if (!includeCompleted && experiment.status === "completed") return false;
      return true;
    });
    return {
      experiments: filtered.slice(0, limit).map(formatExperimentSummary),
      total: filtered.length,
      appliedFilters: {
        status: status ?? null,
        includeCompleted: includeCompleted ?? false,
      },
    };
  },
});

async function resolveExperimentForAnalysis(
  clerkUserId: string,
  args: z.infer<typeof ANALYZE_SCHEMA>
): Promise<UserExperiment> {
  const experiments = await listExperimentsForUser(clerkUserId);

  if (args.experimentId) {
    const match = experiments.find((exp) => exp.id === args.experimentId);
    if (!match) {
      throw new Error("Experiment not found for this user.");
    }
    return match;
  }

  if (args.experimentName) {
    const normalized = args.experimentName.trim().toLowerCase();
    const exact = experiments.find(
      (exp) => exp.name.trim().toLowerCase() === normalized
    );
    if (exact) return exact;

    const partial = experiments.find((exp) =>
      exp.name.trim().toLowerCase().includes(normalized)
    );
    if (partial) return partial;

    throw new Error(
      `Could not find an experiment matching "${args.experimentName}".`
    );
  }

  throw new Error(
    "Provide either an experimentId or experimentName to analyze."
  );
}

registerTool({
  name: "analyzeExperiment",
  description:
    "Run before/during/post analysis for a completed experiment. Provide experimentId or experimentName; returns verdict, summary, and window metrics.",
  input: ANALYZE_SCHEMA,
  handler: async (args, context) => {
    const clerkUserId = await ensureUserId(context.userId);
    const experiment = await resolveExperimentForAnalysis(clerkUserId, args);
    const result = await analyzeExperiment(clerkUserId, experiment.id);
    return {
      experiment: formatExperimentSummary(result.experiment),
      verdict: result.verdict,
      summary: result.summary ?? "",
      windows: result.windows,
    };
  },
});
