import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { ActivityLogPanel } from '../components/ActivityLogPanel';
import { AgentOutputsPanel } from '../components/AgentOutputsPanel';
import { FinalResultPanel } from '../components/FinalResultPanel';
import { AgentStatusText, TaskStatusText } from '../components/StatusLabel';
import { AgentRoleKey, TaskWorkflow, WorkflowStage } from '../types/workflow';

interface WorkspacePageProps {
  task: TaskWorkflow | null;
  onStartNewTask: () => void;
  onRunDemo: () => void;
  demoRunning: boolean;
  onRetryTask: (taskId: string, guidance?: string) => Promise<void>;
  onAcceptBest: (taskId: string) => Promise<void>;
}

type WorkspaceTab = 'live' | 'log' | 'outputs' | 'final';

const PIPELINE_STAGES: Array<{ key: WorkflowStage; label: string }> = [
  { key: 'planning', label: 'Planning' },
  { key: 'research', label: 'Research' },
  { key: 'creation', label: 'Creation' },
  { key: 'review', label: 'Review' },
  { key: 'improvement', label: 'Improvement' },
  { key: 'approval', label: 'Approval' },
];

const AGENT_ORDER: AgentRoleKey[] = [
  'planner',
  'researcher',
  'creator',
  'reviewer',
  'approver',
];

export function WorkspacePage({
  task,
  onStartNewTask,
  onRunDemo,
  demoRunning,
  onRetryTask,
  onAcceptBest,
}: WorkspacePageProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('live');
  const [selectedAgent, setSelectedAgent] = useState<AgentRoleKey>('planner');
  const [guidanceText, setGuidanceText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  if (!task) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-12 text-center max-w-xl mx-auto">
        <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
          No Active Collaboration Selected
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Start a new collaborative task or launch the Hackathon Demo to watch all five Gemini
          agents collaborate in real time.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRunDemo}
            disabled={demoRunning}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{demoRunning ? 'Starting Demo...' : 'Run Hackathon Demo'}</span>
          </button>
          <button
            type="button"
            onClick={onStartNewTask}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <span>Create New Task</span>
          </button>
        </div>
      </div>
    );
  }

  const getStageState = (stageKey: WorkflowStage): 'done' | 'active' | 'pending' => {
    const order: WorkflowStage[] = [
      'queued',
      'planning',
      'research',
      'creation',
      'review',
      'improvement',
      'approval',
      'completed',
      'completed_with_limitations',
    ];
    if (task.status === 'completed' || task.status === 'completed_with_limitations') {
      return 'done';
    }
    if (task.currentStage === stageKey) return 'active';
    const currentIdx = order.indexOf(task.currentStage);
    const stageIdx = order.indexOf(stageKey);
    if (currentIdx > stageIdx && stageIdx !== -1) return 'done';
    return 'pending';
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      await onRetryTask(task.taskId, guidanceText.trim() || undefined);
      setGuidanceText('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptBest = async () => {
    setActionLoading(true);
    try {
      await onAcceptBest(task.taskId);
      setActiveTab('final');
    } finally {
      setActionLoading(false);
    }
  };

  const latestScore =
    task.finalResult?.finalQualityScore ??
    task.reviewHistory[task.reviewHistory.length - 1]?.qualityScore;

  // Auto-focus currently working agent if user hasn't manually pinned one
  const activeWorkingKey = AGENT_ORDER.find(
    (k) => task.agents[k].status === 'working' || task.agents[k].status === 'reviewing'
  );
  const inspectedKey = selectedAgent;
  const inspectedAgent = task.agents[inspectedKey];

  return (
    <div className="space-y-6">
      {/* Compact Task Header + Inline Stage Rail */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{task.category}</span>
              <span aria-hidden="true">·</span>
              <span>{task.outputFormat}</span>
              {task.isDemo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    Demo Execution
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <TaskStatusText status={task.status} />
            </div>
            <h1 className="mt-1.5 font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {task.title}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 max-w-3xl">
              {task.userRequest}
            </p>
          </div>

          <div className="flex items-center gap-6 shrink-0 pt-1">
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Turns</div>
              <div className="font-mono text-base font-semibold text-zinc-900 dark:text-white tabular-nums">
                {task.turnCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Review Cycle</div>
              <div className="font-mono text-base font-semibold text-zinc-900 dark:text-white tabular-nums">
                {task.currentReviewCycle}/{task.maxReviewCycles}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Quality Gate</div>
              <div className="font-mono text-base font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                {typeof latestScore === 'number' ? `${latestScore}/` : '≥ '}
                {task.qualityThreshold}
              </div>
            </div>
          </div>
        </div>

        {/* Hairline Stage Stepper */}
        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs">
          {PIPELINE_STAGES.map((stage, i) => {
            const state = getStageState(stage.key);
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 font-medium ${
                    state === 'active'
                      ? 'text-blue-600 dark:text-blue-400'
                      : state === 'done'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {state === 'active' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {state === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{stage.label}</span>
                </span>
                {i < PIPELINE_STAGES.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Human Intervention Banner */}
      {(task.status === 'failed' || task.status === 'needs_human_review') && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-start gap-3">
            {task.status === 'failed' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
                {task.status === 'failed'
                  ? 'Execution Halted — Human Recovery Available'
                  : 'Maximum Review Safety Limit Reached — Human Decision Required'}
              </h2>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{task.stopReason}</p>
            </div>
          </div>

          {task.status === 'needs_human_review' && (
            <div>
              <label
                htmlFor="human-guidance"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Optional Supervisor Guidance for Guided Revision
              </label>
              <input
                id="human-guidance"
                type="text"
                value={guidanceText}
                onChange={(e) => setGuidanceText(e.target.value)}
                placeholder="e.g., Reconcile subscription pricing with unit economics..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#0B0C0E] text-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              <span>
                {task.status === 'failed' ? 'Retry Failed Agent' : 'Run 1 Guided Revision Cycle'}
              </span>
            </button>

            {task.agents.creator.output && (
              <button
                type="button"
                onClick={handleAcceptBest}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#121417] text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Accept Best Available & Synthesize Final</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#121417] border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'live'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Live Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'log'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Activity Log ({task.activityLog.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outputs')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'outputs'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Agent Outputs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('final')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'final'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Final Result {task.finalResult ? '· Ready' : ''}
          </button>
        </div>

        {task.finalResult && activeTab !== 'final' && (
          <button
            type="button"
            onClick={() => setActiveTab('final')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap"
          >
            <span>Open Final Result</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Master-Detail Live Collaboration Pipeline */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#121417]">
            {/* Left: Sequential Agent Pipeline Rail */}
            <div className="lg:col-span-6 divide-y divide-zinc-200 dark:divide-zinc-800 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800">
              {AGENT_ORDER.map((key, idx) => {
                const agent = task.agents[key];
                const isSelected = inspectedKey === key;
                const isWorking = agent.status === 'working' || agent.status === 'reviewing';

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedAgent(key)}
                    className={`w-full p-5 text-left transition-colors ${
                      isSelected
                        ? 'bg-zinc-50 dark:bg-[#171A1F]'
                        : 'hover:bg-zinc-50/70 dark:hover:bg-[#15181D]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs text-zinc-400 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-display text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {agent.name}
                        </span>
                        {activeWorkingKey === key && (
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            · Active
                          </span>
                        )}
                      </div>
                      <AgentStatusText status={agent.status} />
                    </div>

                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {agent.currentActivity}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-600 dark:text-zinc-300 truncate max-w-xs">
                        {agent.outputSummary || agent.roleTitle}
                      </span>
                      <span className="font-mono text-zinc-400 tabular-nums shrink-0">
                        {agent.completedAt
                          ? new Date(agent.completedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : isWorking
                          ? 'Executing...'
                          : 'Standby'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Selected Agent Handoff & Context Inspector */}
            <div className="lg:col-span-6 p-6 flex flex-col justify-between bg-[#FAFAFA] dark:bg-[#0E1013]">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {inspectedAgent.roleTitle}
                    </div>
                    <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white mt-0.5">
                      {inspectedAgent.name}
                    </h2>
                  </div>
                  <AgentStatusText status={inspectedAgent.status} />
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Assigned Responsibility
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {inspectedAgent.assignedTask}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Current Execution Status
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300">
                      {inspectedAgent.currentActivity}
                    </p>
                  </div>

                  {inspectedAgent.errorMessage && (
                    <div className="p-3.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
                      {inspectedAgent.errorMessage}
                    </div>
                  )}

                  {inspectedAgent.outputSummary && (
                    <div>
                      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Output Summary
                      </div>
                      <p className="text-zinc-900 dark:text-zinc-100 font-medium">
                        {inspectedAgent.outputSummary}
                      </p>
                    </div>
                  )}

                  {inspectedAgent.handoffTo && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">Handoff Target</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {inspectedAgent.handoffTo} →
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {inspectedAgent.executionCount} execution(s)
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('outputs')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Open Full Agent Output</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Review & Improvement Cycle History */}
          {task.reviewHistory.length > 0 && (
            <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6">
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-1">
                Review & Critique Loop History
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Evaluated against the {task.qualityThreshold}/100 threshold (safety cap:{' '}
                {task.maxReviewCycles} cycles).
              </p>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {task.reviewHistory.map((rev) => (
                  <div
                    key={rev.cycleNumber}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                          Cycle {rev.cycleNumber} · Draft v{rev.draftVersion}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            rev.approved
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {rev.qualityScore}/100
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            rev.approved
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {rev.approved ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approved
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              Rejected — Sent Back to Creator
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {rev.feedbackSummary}
                      </p>
                      {!rev.approved && (rev.improvementSuggestions ?? []).length > 0 && (
                        <ul className="list-disc list-inside text-xs text-zinc-500 dark:text-zinc-400 pt-1 space-y-0.5">
                          {(rev.improvementSuggestions ?? []).slice(0, 3).map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAgent('reviewer');
                        setActiveTab('outputs');
                      }}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0 self-start"
                    >
                      Inspect Full Audit →
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ActivityLogPanel logs={task.activityLog} />
        </div>
      )}

      {activeTab === 'log' && <ActivityLogPanel logs={task.activityLog} />}

      {activeTab === 'outputs' && (
        <AgentOutputsPanel
          task={task}
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
        />
      )}

      {activeTab === 'final' && (
        <FinalResultPanel task={task} onStartNewTask={onStartNewTask} />
      )}
    </div>
  );
}
