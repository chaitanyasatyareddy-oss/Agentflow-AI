import { ArrowRight, PlusCircle } from 'lucide-react';
import { AppRoute } from '../components/AppShell';
import { TaskStatusText } from '../components/StatusLabel';
import { AnalyticsSummary, TaskWorkflow } from '../types/workflow';

interface DashboardPageProps {
  tasks: TaskWorkflow[];
  analytics: AnalyticsSummary | null;
  loading: boolean;
  onNavigate: (route: AppRoute) => void;
  onOpenTask: (taskId: string) => void;
}

const AGENT_ROSTER = [
  { key: 'planner', name: 'Master Planner', role: 'Task Strategy & Breakdown' },
  { key: 'researcher', name: 'Research Specialist', role: 'Domain Analysis & Risks' },
  { key: 'creator', name: 'Creator Agent', role: 'Drafting & Revision' },
  { key: 'reviewer', name: 'Critic / Reviewer', role: 'QA Scoring & Feedback' },
  { key: 'approver', name: 'Final Approver', role: 'Synthesis & Sign-off' },
] as const;

export function DashboardPage({
  tasks,
  analytics,
  loading,
  onNavigate,
  onOpenTask,
}: DashboardPageProps) {
  const activeTasks = tasks.filter((t) => t.status === 'in_progress');
  const recentTasks = tasks.slice(0, 6);
  const recentLogs = tasks
    .flatMap((t) =>
      (t.activityLog ?? []).map((entry) => ({
        ...entry,
        taskId: t.taskId,
        taskTitle: t.title,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Collaboration Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Monitor active multi-agent workflows, execution metrics, and recent team handoffs.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('new-task')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Quick Start Task</span>
          </button>
        </div>
      </div>

      {/* Unified 5-Column Hairline Metric Strip */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800">
        <div className="p-5">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Tasks</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-zinc-900 dark:text-white tabular-nums">
            {loading ? '—' : analytics?.totalTasks ?? tasks.length}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Completed</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {loading
              ? '—'
              : (analytics?.completedTasks ?? 0) + (analytics?.completedWithLimitations ?? 0)}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">In Progress</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            {loading ? '—' : analytics?.inProgressTasks ?? activeTasks.length}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Avg Quality Score</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-zinc-900 dark:text-white tabular-nums">
            {loading
              ? '—'
              : analytics?.averageQualityScore !== null && analytics?.averageQualityScore !== undefined
              ? `${analytics.averageQualityScore}/100`
              : 'N/A'}
          </div>
        </div>
        <div className="p-5 col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Agent Runs</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-zinc-900 dark:text-white tabular-nums">
            {loading ? '—' : analytics?.totalAgentExecutions ?? 0}
          </div>
        </div>
      </div>

      {/* Active Workflows */}
      {activeTasks.length > 0 && (
        <section className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
          <h2 className="font-display text-sm font-semibold text-zinc-900 dark:text-white mb-3">
            Active Workflows ({activeTasks.length})
          </h2>
          <div className="divide-y divide-blue-500/15">
            {activeTasks.map((task) => (
              <div
                key={task.taskId}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {task.title}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="capitalize">Stage: {task.currentStage.replace(/_/g, ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">
                      Cycle {task.currentReviewCycle}/{task.maxReviewCycles}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">Turn {task.turnCount}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTask(task.taskId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <span>Watch Live</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Tasks */}
        <section className="lg:col-span-7 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
              Recent Tasks
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              View all history
            </button>
          </div>

          {recentTasks.length === 0 ? (
            <div className="py-10 text-center border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                No collaborative tasks executed yet
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                Submit a new task to watch all five Gemini agents collaborate live.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('new-task')}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Create First Task
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentTasks.map((task) => {
                const score =
                  task.finalResult?.finalQualityScore ??
                  task.reviewHistory[task.reviewHistory.length - 1]?.qualityScore;
                return (
                  <button
                    key={task.taskId}
                    type="button"
                    onClick={() => onOpenTask(task.taskId)}
                    className="w-full py-3.5 text-left flex items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {task.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{task.outputFormat}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">
                          {new Date(task.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {typeof score === 'number' && (
                        <span className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
                          {score}/100
                        </span>
                      )}
                      <TaskStatusText status={task.status} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Agent Team Ledger */}
        <section className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-4">
            Specialized Agent Roster
          </h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {AGENT_ROSTER.map((agent, i) => {
              const stat = analytics?.agentStats.find((s) => s.key === agent.key);
              const isBusy = activeTasks.some(
                (t) =>
                  t.agents[agent.key].status === 'working' ||
                  t.agents[agent.key].status === 'reviewing'
              );
              return (
                <div key={agent.key} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {String(i + 1).padStart(2, '0')}. {agent.name}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {agent.role}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-200 tabular-nums">
                      {stat?.totalExecutions ?? 0} runs
                    </div>
                    <div
                      className={`text-xs ${
                        isBusy ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {isBusy ? 'Active now' : 'Standby'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent Activity Log */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6">
        <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-4">
          Recent Collaboration Activity
        </h2>
        {recentLogs.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4 border-t border-zinc-100 dark:border-zinc-800">
            Activity events will appear here automatically as agents start planning, researching,
            drafting, and reviewing tasks.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span className="font-mono text-zinc-400 shrink-0 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 shrink-0">
                    {log.agentName}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400 truncate">{log.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTask(log.taskId)}
                  className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white truncate max-w-[200px] text-left sm:text-right shrink-0"
                >
                  {log.taskTitle}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
