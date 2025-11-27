"use server";

import { generateWithFallback } from "@/lib/ai/fallback";
import { env } from "@/lib/env";
import { UserExperiment, ExperimentWindowMetrics, ExperimentPhase, ExperimentVerdict } from "@/lib/experiments/types";

type WindowSnapshot = {
  phase: ExperimentPhase;
  metrics: ExperimentWindowMetrics;
};

function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "n/a";
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function renderMetricsTable(windows: WindowSnapshot[]): string {
  const metricKeys = new Set<string>();
  for (const window of windows) {
    Object.keys(window.metrics).forEach((key) => metricKeys.add(key));
  }
  const phases = windows.map((w) => w.phase);

  const header = ["Metric", ...phases.map((phase) => phase.toUpperCase())];
  const rows = [header.join(" | "), header.map(() => "---").join(" | ")];

  metricKeys.forEach((metric) => {
    const values = windows.map((window) => {
      const stat = window.metrics[metric];
      const avg = stat?.average ?? null;
      return `${formatNumber(avg)}`;
    });
    rows.push([metric, ...values].join(" | "));
  });

  return rows.join("\n");
}

const SYSTEM_PROMPT = `
You are the BioFlo Experiment Analyst. Your job is to explain experiment outcomes using observational data.
- Highlight improvements or regressions using the provided metrics only.
- Emphasize that this is correlation, not medical diagnosis or treatment advice.
- Provide practical next steps or suggestions for refining the protocol.
- Keep the tone supportive, science-informed, and safety-first.
- Always include a final reminder to consult healthcare professionals for medical concerns.
`.trim();

export async function generateExperimentSummary(params: {
  experiment: UserExperiment;
  windows: WindowSnapshot[];
  systemLabel: ExperimentVerdict;
}) {
  const { experiment, windows, systemLabel } = params;
  const table = renderMetricsTable(windows);

  const userContent = `
Experiment: ${experiment.name}
Type: ${experiment.experiment_type ?? "custom"}
Status: ${experiment.status}
AI Verdict: ${systemLabel}
Hypothesis: ${experiment.hypothesis ?? "not provided"}
Success Criteria: ${experiment.success_criteria ?? "not provided"}
Tracked Metrics: ${experiment.tracked_metrics.join(", ")}

Metrics Table:
${table}

Instructions:
1. Provide a short summary paragraph (2 sentences max) of key observations.
2. Add a bullet list "Key Changes" referencing the metrics (e.g., "Sleep duration increased ~0.8h vs baseline").
3. Add a bullet list "Suggested Next Steps" with 2-3 actions or experiments.
4. Finish with a single sentence safety reminder that BioFlo isn't a replacement for professional medical advice.
`.trim();

  const response = await generateWithFallback({
    userQuestion: "Summarize experiment outcomes",
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    mainModel: env.openai.expensiveModel(),
    judgeModel: env.anthropic.judgeModel(),
  });

  return response;
}




