/**
 * Admin Analytics Dashboard
 *
 * Protected admin-only page showing:
 * - User & revenue metrics
 * - AI usage statistics
 * - RAG performance
 * - Infrastructure health
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  getUserAndRevenueSummary,
  getAiUsageSummary,
  getRagPerformanceMetrics,
  getHealthStatusSummary,
} from "@/lib/analytics/queries";
import { pane, paneMuted, quickAction, gradientText } from "@/lib/utils/theme";
import {
  Sparkles,
  Users,
  CreditCard,
  TrendingUp,
  Cpu,
  GaugeCircle,
  ShieldCheck,
  AlertTriangle,
  LineChart,
} from "lucide-react";

// Admin email addresses (adjust based on your needs)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean) || [];
const BYPASS_ADMIN_CHECK = process.env.BYPASS_ADMIN_CHECK === "true" || process.env.NODE_ENV === "development";

async function checkAdminAccess() {
  // Dev bypass for local development (skip Clerk auth entirely)
  if (BYPASS_ADMIN_CHECK) {
    console.log("⚠️  Admin check bypassed (development mode)");
    return;
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  // Check if user is admin (by email or Clerk role)
  const isAdmin =
    (email && ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email)) ||
    user?.publicMetadata?.role === "admin";

  if (!isAdmin) {
    console.log("❌ Admin access denied", { email, adminEmails: ADMIN_EMAILS });
    redirect("/dashboard");
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    ok: "border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
    degraded: "border-amber-400/40 bg-amber-400/15 text-amber-100",
    down: "border-red-400/40 bg-red-500/15 text-red-100",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${
        colors[status as keyof typeof colors] || colors.down
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}

export default async function AdminAnalyticsPage() {
  await checkAdminAccess();

  // Fetch all analytics data (with error handling)
  let userRevenue, aiUsage, ragMetrics, healthStatus;

  try {
    [userRevenue, aiUsage, ragMetrics, healthStatus] = await Promise.all([
      getUserAndRevenueSummary().catch(() => ({
        totalUsers: 0,
        activeSubscribers: 0,
        mrr: 0,
        arr: 0,
        churnRate30d: null,
        newUsers7d: 0,
        newSubscribers7d: 0,
      })),
      getAiUsageSummary().catch(() => ({
        totalChats24h: 0,
        totalChats7d: 0,
        avgMessagesPerSession: 0,
        modelBreakdown7d: [],
        topicDistribution7d: [],
        riskDistribution7d: [],
        judgeUsage7d: [],
        safetyOutcomes7d: [],
      })),
      getRagPerformanceMetrics().catch(() => ({
        avgRagDocsPerCall: 0,
        ragUsageRate7d: 0,
        canAnswerFromContextRate7d: null,
      })),
      getHealthStatusSummary().catch(() => ({
        lastChecks: [],
        errorCounts24h: [],
      })),
    ]);
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    // Use defaults if queries fail
    userRevenue = {
      totalUsers: 0,
      activeSubscribers: 0,
      mrr: 0,
      arr: 0,
      churnRate30d: null,
      newUsers7d: 0,
      newSubscribers7d: 0,
    };
    aiUsage = {
      totalChats24h: 0,
      totalChats7d: 0,
      avgMessagesPerSession: 0,
      modelBreakdown7d: [],
      topicDistribution7d: [],
      riskDistribution7d: [],
      judgeUsage7d: [],
      safetyOutcomes7d: [],
    };
    ragMetrics = {
      avgRagDocsPerCall: 0,
      ragUsageRate7d: 0,
      canAnswerFromContextRate7d: null,
    };
    healthStatus = {
      lastChecks: [],
      errorCounts24h: [],
    };
  }

  const heroStats = [
    {
      label: "Total users",
      value: userRevenue.totalUsers.toLocaleString(),
      helper: "All time",
      icon: Users,
    },
    {
      label: "Active subscribers",
      value: userRevenue.activeSubscribers.toLocaleString(),
      helper: "Paying members",
      icon: CreditCard,
    },
    {
      label: "MRR",
      value: `£${userRevenue.mrr.toFixed(0)}`,
      helper: "Current month",
      icon: TrendingUp,
    },
    {
      label: "Chats (24h)",
      value: aiUsage.totalChats24h.toLocaleString(),
      helper: "AI workload",
      icon: Cpu,
    },
  ];

  const growthStats = [
    { label: "New users (7d)", value: userRevenue.newUsers7d.toLocaleString() },
    { label: "New subscribers (7d)", value: userRevenue.newSubscribers7d.toLocaleString() },
    {
      label: "Churn rate (30d)",
      value: userRevenue.churnRate30d !== null ? `${userRevenue.churnRate30d.toFixed(1)}%` : "N/A",
    },
  ];

  const aiSummary = [
    { label: "Total chats (7d)", value: aiUsage.totalChats7d.toLocaleString() },
    { label: "Avg msgs / session", value: aiUsage.avgMessagesPerSession.toFixed(1) },
  ];

  const ragSummary = [
    { label: "Avg docs / call", value: ragMetrics.avgRagDocsPerCall.toFixed(1) },
    { label: "RAG usage rate (7d)", value: `${ragMetrics.ragUsageRate7d.toFixed(1)}%` },
    {
      label: "Can answer from context",
      value:
        ragMetrics.canAnswerFromContextRate7d !== null
          ? `${ragMetrics.canAnswerFromContextRate7d.toFixed(1)}%`
          : "N/A",
    },
  ];

  const heroActions = [
    { href: "#overview", label: "Overview", helper: "Revenue & growth", icon: LineChart },
    { href: "#ai-usage", label: "AI usage", helper: "Model mix & load", icon: Cpu },
    { href: "#infra", label: "Infra health", helper: "Latency & errors", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-bioflo-hero p-8 shadow-[0_30px_90px_rgba(5,5,11,0.7)]">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(93,239,251,0.35),transparent_60%)] blur-3xl" />
          <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(177,149,255,0.3),transparent_60%)] blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(99,245,192,0.2),transparent_60%)] blur-3xl" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Executive telemetry</p>
            <h1 className="text-3xl font-semibold text-white">
              BioFlo analytics control room{" "}
              <span className={`${gradientText} text-4xl font-bold`}>for ops & safety.</span>
            </h1>
            <p className="max-w-4xl text-sm text-white/70">
              Monitor revenue, AI usage, RAG quality, and infrastructure health from one premium dashboard. Every tile mirrors
              BioFlo’s safety-first posture.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {heroStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/15 bg-white/5 p-5 shadow-[0_15px_40px_rgba(5,5,11,0.45)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-2">
                      <Icon className="h-4 w-4 text-accent-cyan" />
                    </div>
                    <p className="text-xs uppercase tracking-wide text-white/60">{stat.label}</p>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="text-[11px] text-white/60">{stat.helper}</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {heroActions.map((action) => {
              const Icon = action.icon;
              return (
                <a key={action.href} href={action.href} className={`${quickAction} border-white/20 bg-white/5 px-4`}>
                  <Icon className="size-4 text-accent-cyan" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">{action.label}</p>
                    <p className="text-[10px] text-white/60">{action.helper}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section id="overview" className={`${pane} space-y-6 p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Revenue & growth</p>
            <h2 className="text-lg font-semibold text-white">Business pulse</h2>
          </div>
          <Sparkles className="h-5 w-5 text-accent-cyan" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total users", value: userRevenue.totalUsers.toLocaleString(), helper: "All time" },
            { label: "Active subscribers", value: userRevenue.activeSubscribers.toLocaleString(), helper: "Paying" },
            { label: "ARR", value: `£${userRevenue.arr.toFixed(0)}`, helper: "Projected" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
              <p className="text-[11px] text-white/50">{stat.helper}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {growthStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="ai-usage" className="space-y-6">
        <div className={`${pane} space-y-6 p-6`}>
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-accent-purple" />
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">AI usage</p>
              <h2 className="text-lg font-semibold text-white">Model throughput & guardrails</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Total chats (24h)</p>
              <p className="mt-2 text-2xl font-semibold text-white">{aiUsage.totalChats24h.toLocaleString()}</p>
            </div>
            {aiSummary.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${paneMuted} space-y-4 p-5`}>
              <h3 className="text-sm font-semibold text-white">Model breakdown (7d)</h3>
              {aiUsage.modelBreakdown7d.length ? (
                <div className="space-y-3">
                  {aiUsage.modelBreakdown7d.map((item) => (
                    <div key={item.model} className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-white/70">{item.model}</span>
                      <span className="text-sm font-semibold text-white">{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">No model data in the last 7 days.</p>
              )}
            </div>
            <div className={`${paneMuted} space-y-4 p-5`}>
              <h3 className="text-sm font-semibold text-white">Safety outcomes (7d)</h3>
              {aiUsage.safetyOutcomes7d.length ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  {aiUsage.safetyOutcomes7d.map((item) => (
                    <div key={item.verdict} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4">
                      <p className="text-2xl font-semibold text-white">{item.count}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-white/60">{item.verdict}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">No safety verdicts recorded.</p>
              )}
            </div>
          </div>
          <div className={`${paneMuted} space-y-4 p-5`}>
            <h3 className="text-sm font-semibold text-white">Topic distribution (7d)</h3>
            {aiUsage.topicDistribution7d.length ? (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {aiUsage.topicDistribution7d.map((item) => (
                  <div key={item.topic} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-white/60">{item.topic}</p>
                    <p className="mt-1 text-xl font-semibold text-white">{item.count}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">No topics logged for the selected window.</p>
            )}
          </div>
        </div>
      </section>

      <section className={`${pane} space-y-6 p-6`}>
        <div className="flex items-center gap-3">
          <GaugeCircle className="h-5 w-5 text-accent-green" />
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">RAG performance</p>
            <h2 className="text-lg font-semibold text-white">Knowledge grounding quality</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {ragSummary.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="infra" className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-accent-emerald" />
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Infrastructure health</p>
            <h2 className="text-lg font-semibold text-white">Checks & alerting</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {healthStatus.lastChecks.length ? (
            healthStatus.lastChecks.map((check) => (
              <div key={check.check_name} className={`${pane} space-y-3 p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white capitalize">{check.check_name}</p>
                  <StatusBadge status={check.status} />
                </div>
                {check.latency_ms !== null && (
                  <p className="text-xs text-white/60">Latency: {check.latency_ms}ms</p>
                )}
                <p className="text-xs text-white/50">{new Date(check.checked_at).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <div className={`${pane} p-4 text-sm text-white/70`}>No health checks recorded yet.</div>
          )}
        </div>

        {healthStatus.errorCounts24h.length > 0 && (
          <div className={`${pane} space-y-4 p-6`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              <h3 className="text-sm font-semibold text-white">Recent errors (24h)</h3>
            </div>
            <div className="space-y-3">
              {healthStatus.errorCounts24h.map((error) => (
                <div
                  key={error.endpoint}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                >
                  <span className="font-mono text-xs text-white/70">{error.endpoint}</span>
                  <span className="text-amber-200">{error.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

