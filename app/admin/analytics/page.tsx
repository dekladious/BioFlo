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

// Admin email addresses (adjust based on your needs)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()).filter(Boolean) || [];
const BYPASS_ADMIN_CHECK = process.env.BYPASS_ADMIN_CHECK === "true" || process.env.NODE_ENV === "development";

async function checkAdminAccess() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Dev bypass for local development
  if (BYPASS_ADMIN_CHECK) {
    console.log("⚠️  Admin check bypassed (development mode)");
    return;
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
    ok: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    degraded: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    down: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
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

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
          BioFlo Analytics Dashboard
        </h1>

        {/* Overview Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Users</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {userRevenue.totalUsers.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Active Subscribers</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {userRevenue.activeSubscribers.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">MRR</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                £{userRevenue.mrr.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">ARR</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                £{userRevenue.arr.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">New Users (7d)</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {userRevenue.newUsers7d}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">New Subscribers (7d)</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {userRevenue.newSubscribers7d}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Churn Rate (30d)</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {userRevenue.churnRate30d !== null
                  ? `${userRevenue.churnRate30d.toFixed(1)}%`
                  : "N/A"}
              </div>
            </div>
          </div>
        </section>

        {/* AI Usage Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
            AI Usage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Chats (24h)</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {aiUsage.totalChats24h.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Chats (7d)</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {aiUsage.totalChats7d.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Avg Messages/Session</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {aiUsage.avgMessagesPerSession.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Model Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Model Breakdown (7d)
            </h3>
            <div className="space-y-2">
              {aiUsage.modelBreakdown7d.map((item) => (
                <div key={item.model} className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300">{item.model}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Distribution */}
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Topic Distribution (7d)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {aiUsage.topicDistribution7d.map((item) => (
                <div key={item.topic} className="flex flex-col">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{item.topic}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Outcomes */}
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Safety Outcomes (7d)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {aiUsage.safetyOutcomes7d.map((item) => (
                <div key={item.verdict} className="text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {item.count}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{item.verdict}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RAG Performance Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
            RAG Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Avg Docs/Call</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {ragMetrics.avgRagDocsPerCall.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">RAG Usage Rate (7d)</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {ragMetrics.ragUsageRate7d.toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Can Answer from Context</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {ragMetrics.canAnswerFromContextRate7d !== null
                  ? `${ragMetrics.canAnswerFromContextRate7d.toFixed(1)}%`
                  : "N/A"}
              </div>
            </div>
          </div>
        </section>

        {/* Infrastructure Health Section */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Infrastructure Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {healthStatus.lastChecks.map((check) => (
              <div
                key={check.check_name}
                className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {check.check_name}
                  </div>
                  <StatusBadge status={check.status} />
                </div>
                {check.latency_ms !== null && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {check.latency_ms}ms
                  </div>
                )}
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  {new Date(check.checked_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Errors */}
          {healthStatus.errorCounts24h.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Recent Errors (24h)
              </h3>
              <div className="space-y-2">
                {healthStatus.errorCounts24h.map((error) => (
                  <div key={error.endpoint} className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-300 font-mono text-sm">
                      {error.endpoint}
                    </span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {error.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

