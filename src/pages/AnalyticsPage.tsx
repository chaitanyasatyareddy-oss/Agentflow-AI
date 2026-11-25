import { BarChart3, PlusCircle } from 'lucide-react';
import { AnalyticsSummary } from '../types/workflow';

interface AnalyticsPageProps {
  analytics: AnalyticsSummary | null;
  loading: boolean;
  onStartNewTask: () => void;
}

export function AnalyticsPage({ analytics, loading, onStartNewTask }: AnalyticsPageProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-12 text-center text-sm text-zinc-500">
        Computing real-time workflow analytics...
      </div>
    );
  }

  if (!analytics || analytics.totalTasks === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-12 text-center max-w-2xl mx-auto">
        <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
        <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
          No Performance Analytics Yet
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Analytics reflect genuine stored task executions, quality scores, and agent turns. Submit
          your first task to populate live charts.
        </p>
        <button
          type="button"
          onClick={onStartNewTask}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Start First Task</span>
        </button>
      </div>
    );
  }

  const maxExec = Math.max(1, ...analytics.agentStats.map((a) => a.totalExecutions));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Collaboration Analytics
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Live metrics aggregated strictly from completed and active multi-agent workflows.
        </p>
      </div>

      {/* Unified KPI Strip */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800">
        <div className="p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Executed</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-zinc-900 dark:text-white tabular-nums">
            {analytics.totalTasks}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Successful</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {analytics.completedTasks + analytics.completedWithLimitations}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Failed / Halted</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
            {analytics.failedOrNeedsReviewTasks}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Avg Quality Score</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-zinc-900 dark:text-white tabular-nums">
            {analytics.averageQualityScore !== null ? `${analytics.averageQualityScore}` : 'N/A'}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Avg Review Cycles</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-zinc-900 dark:text-white tabular-nums">
            {analytics.averageReviewIterations !== null
              ? analytics.averageReviewIterations
              : 'N/A'}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Completion Rate</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            {analytics.completionRate !== null ? `${analytics.completionRate}%` : 'N/A'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-1">
            Agent Execution & Contribution Comparison
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            Total model invocations, completions, rejections, and failures per specialized agent.
          </p>

          <div className="space-y-4">
            {analytics.agentStats.map((agent) => {
              const widthPct = Math.round((agent.totalExecutions / maxExec) * 100);
              return (
                <div key={agent.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {agent.name}
                    </span>
                    <div className="font-mono text-zinc-500 dark:text-zinc-400 tabular-nums flex items-center gap-3">
                      <span>{agent.totalExecutions} runs</span>
                      <span>{agent.completedCount} completed</span>
                      {agent.key === 'reviewer' && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {agent.rejectedCount} rejections
                        </span>
                      )}
                      {agent.failedCount > 0 && (
                        <span className="text-rose-600 dark:text-rose-400">
                          {agent.failedCount} failed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all"
                      style={{ width: `${Math.max(4, widthPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-1">
            Task Category Breakdown
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            Distribution of submitted tasks across domains.
          </p>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {analytics.categoryDistribution.map((item) => {
              const pct = Math.round((item.count / analytics.totalTasks) * 100);
              return (
                <div key={item.category} className="py-3 flex items-center justify-between text-sm">
                  <span className="text-zinc-800 dark:text-zinc-200">{item.category}</span>
                  <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                    <span className="text-zinc-500 dark:text-zinc-400">{pct}%</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {item.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {analytics.recentQualityTrend.length > 0 && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-1">
            Recent Quality Scores & Review Iterations
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
            Final or latest reviewer quality scores across the most recent tasks.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                  <th className="py-2.5 pr-4">Task</th>
                  <th className="py-2.5 px-4 text-right">Review Cycles</th>
                  <th className="py-2.5 pl-4 text-right">Quality Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {analytics.recentQualityTrend.map((row) => (
                  <tr key={row.taskId}>
                    <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {row.title}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-300 tabular-nums">
                      {row.cycles}
                    </td>
                    <td className="py-3 pl-4 text-right font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                      {row.score}/100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
