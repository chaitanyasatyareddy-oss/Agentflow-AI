import { Code2, Eye, History } from 'lucide-react';
import { useState } from 'react';
import {
  AgentRoleKey,
  ApproverOutput,
  CreatorOutput,
  PlannerOutput,
  ResearcherOutput,
  ReviewerOutput,
  TaskWorkflow,
} from '../types/workflow';
import { AgentStatusText } from './StatusLabel';

interface AgentOutputsPanelProps {
  task: TaskWorkflow;
  selectedAgent: AgentRoleKey;
  onSelectAgent: (key: AgentRoleKey) => void;
}

const TABS: Array<{ key: AgentRoleKey; label: string }> = [
  { key: 'planner', label: 'Planner Output' },
  { key: 'researcher', label: 'Researcher Output' },
  { key: 'creator', label: 'Creator Output' },
  { key: 'reviewer', label: 'Reviewer Feedback' },
  { key: 'approver', label: 'Final Approver Output' },
];

export function AgentOutputsPanel({
  task,
  selectedAgent,
  onSelectAgent,
}: AgentOutputsPanelProps) {
  const [showInputJson, setShowInputJson] = useState(false);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [selectedCycleIdx, setSelectedCycleIdx] = useState<number | null>(null);

  const agent = task.agents[selectedAgent];
  const reviewHistory = task.reviewHistory ?? [];

  const activeCycleIndex =
    selectedCycleIdx !== null && selectedCycleIdx < reviewHistory.length
      ? selectedCycleIdx
      : reviewHistory.length - 1;

  const creatorToShow: CreatorOutput | null =
    selectedAgent === 'creator' &&
    reviewHistory.length > 0 &&
    selectedCycleIdx !== null &&
    reviewHistory[activeCycleIndex]
      ? reviewHistory[activeCycleIndex].creatorOutputSnapshot
      : (task.agents.creator.output as CreatorOutput | null);

  const reviewerToShow: ReviewerOutput | null =
    selectedAgent === 'reviewer' &&
    reviewHistory.length > 0 &&
    reviewHistory[activeCycleIndex]
      ? reviewHistory[activeCycleIndex].reviewerOutputSnapshot
      : (task.agents.reviewer.output as ReviewerOutput | null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#121417] border border-zinc-200 dark:border-zinc-800">
        {TABS.map((tab) => {
          const active = selectedAgent === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                onSelectAgent(tab.key);
                setSelectedCycleIdx(null);
                setShowRawOutput(false);
              }}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                active
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                {agent.name}
              </h2>
              <AgentStatusText status={agent.status} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{agent.roleTitle}</span>
              <span aria-hidden="true">·</span>
              <span>Handoff: {agent.handoffTo ?? 'Final User Deliverable'}</span>
              {agent.completedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">
                    Completed {new Date(agent.completedAt).toLocaleTimeString()}
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono">{agent.executionCount} execution(s)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowInputJson((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showInputJson ? 'Hide Input Received' : 'Inspect Input Received'}</span>
            </button>
            {agent.output !== null && (
              <button
                type="button"
                onClick={() => setShowRawOutput((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showRawOutput ? 'Formatted View' : 'Raw JSON'}</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Assigned Task
          </div>
          <p className="text-sm text-zinc-800 dark:text-zinc-200">{agent.assignedTask}</p>
        </div>

        {showInputJson && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0C0E] p-4">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Structured Input Context Received by {agent.name}
            </div>
            <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
              {agent.input ? JSON.stringify(agent.input, null, 2) : 'No input payload dispatched yet.'}
            </pre>
          </div>
        )}

        {(selectedAgent === 'creator' || selectedAgent === 'reviewer') &&
          reviewHistory.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <History className="w-3.5 h-3.5" />
                Revision Cycle:
              </span>
              {reviewHistory.map((rev, idx) => (
                <button
                  key={rev.cycleNumber}
                  type="button"
                  onClick={() => setSelectedCycleIdx(idx)}
                  className={`px-3 py-1 text-xs font-mono rounded-md border transition-colors ${
                    activeCycleIndex === idx
                      ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {selectedAgent === 'creator'
                    ? `Draft v${rev.draftVersion}`
                    : `Cycle ${rev.cycleNumber} (${rev.qualityScore}/100)`}
                </button>
              ))}
            </div>
          )}

        {agent.errorMessage && (
          <div className="p-4 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
            <strong>Execution Error:</strong> {agent.errorMessage}
          </div>
        )}

        {!agent.output ? (
          <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
            {agent.status === 'working' || agent.status === 'reviewing'
              ? `${agent.name} is currently generating its output...`
              : `${agent.name} has not produced output yet.`}
          </div>
        ) : showRawOutput ? (
          <pre className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0C0E] text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(
              selectedAgent === 'creator'
                ? creatorToShow
                : selectedAgent === 'reviewer'
                ? reviewerToShow
                : agent.output,
              null,
              2
            )}
          </pre>
        ) : (
          <div className="space-y-6 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {selectedAgent === 'planner' && (
              <PlannerOutputView data={agent.output as PlannerOutput} />
            )}
            {selectedAgent === 'researcher' && (
              <ResearcherOutputView data={agent.output as ResearcherOutput} />
            )}
            {selectedAgent === 'creator' && creatorToShow && (
              <CreatorOutputView data={creatorToShow} />
            )}
            {selectedAgent === 'reviewer' && reviewerToShow && (
              <ReviewerOutputView data={reviewerToShow} threshold={task.qualityThreshold} />
            )}
            {selectedAgent === 'approver' && (
              <ApproverOutputPreview data={agent.output as ApproverOutput} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PlannerOutputView({ data }: { data: PlannerOutput }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1.5">
          Task Summary & Main Objective
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {data.taskSummary}
        </p>
        <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
          Primary Objective: {data.mainObjective}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
          Execution Plan
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
          {(data.executionPlan ?? []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
          Subtasks & Assignments
        </h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0C0E] text-zinc-500 dark:text-zinc-400">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Subtask</th>
                <th className="py-2.5 px-3">Assigned Agent</th>
                <th className="py-2.5 px-3">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(data.subtasks ?? []).map((st) => (
                <tr key={st.id}>
                  <td className="py-2.5 px-3 font-mono text-zinc-500">{st.id}</td>
                  <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {st.title}
                  </td>
                  <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {st.assignedTo}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-300">{st.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
          Success Criteria
        </h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          {(data.successCriteria ?? []).map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ResearcherOutputView({ data }: { data: ResearcherOutput }) {
  return (
    <div className="space-y-6">
      <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0C0E] text-xs text-zinc-600 dark:text-zinc-400">
        <strong>Research Scope Note:</strong> {data.methodologyNote}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1.5">
          Research Summary
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {data.researchReportSummary}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
          Important Findings
        </h3>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-y border-zinc-200 dark:border-zinc-800">
          {(data.importantFindings ?? []).map((f, idx) => (
            <div key={idx} className="py-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-zinc-900 dark:text-white">{f.topic}</span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  Confidence: {f.confidence}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{f.insight}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
            Opportunities
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {(data.opportunities ?? []).map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
            Risks & Limitations
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {(data.risksAndLimitations ?? []).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
          Identified Information Gaps
        </h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          {(data.informationGaps ?? []).map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CreatorOutputView({ data }: { data: CreatorOutput }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
          {data.title}
        </h3>
        <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
          Draft v{data.draftVersion}
        </span>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
          Executive Summary
        </h4>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {data.executiveSummary}
        </p>
      </div>

      {data.addressedFeedback && data.addressedFeedback.length > 0 && (
        <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">
            Reviewer Feedback Addressed in This Revision
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
            {data.addressedFeedback.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        {(data.sections ?? []).map((sec, idx) => (
          <div key={idx} className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {sec.heading}
            </h4>
            <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {sec.content}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div>
          <h4 className="font-semibold text-zinc-900 dark:text-white mb-1.5">
            Explanation of Key Decisions
          </h4>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {data.decisionsExplanation}
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-zinc-900 dark:text-white mb-1.5">
            Assumptions Made
          </h4>
          <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
            {(data.assumptionsMade ?? []).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ReviewerOutputView({
  data,
  threshold,
}: {
  data: ReviewerOutput;
  threshold: number;
}) {
  const breakdown = data.rubricBreakdown ?? {
    completeness: 0,
    accuracy: 0,
    clarity: 0,
    relevance: 0,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0C0E] grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800">
        <div className="p-3.5">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Quality Score</div>
          <div
            className={`mt-1 font-mono text-xl font-bold tabular-nums ${
              data.approved
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {data.qualityScore}/100
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">Target ≥ {threshold}</div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Completeness</div>
          <div className="mt-1 font-mono text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
            {breakdown.completeness}/25
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Accuracy</div>
          <div className="mt-1 font-mono text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
            {breakdown.accuracy}/25
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Clarity</div>
          <div className="mt-1 font-mono text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
            {breakdown.clarity}/25
          </div>
        </div>
        <div className="p-3.5 col-span-2 sm:col-span-1">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Relevance</div>
          <div className="mt-1 font-mono text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
            {breakdown.relevance}/25
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1.5">
          Overall Verdict — {data.approved ? 'Approved' : 'Rejected (Revision Required)'}
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {data.overallAssessment}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-white mb-2">
            Identified Errors & Unsupported Claims
          </h4>
          {(data.identifiedErrors ?? []).length === 0 ? (
            <p className="text-xs text-zinc-500">None flagged.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-300">
              {(data.identifiedErrors ?? []).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-white mb-2">
            Missing Requirements
          </h4>
          {(data.missingRequirements ?? []).length === 0 ? (
            <p className="text-xs text-zinc-500">All stated requirements covered.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-300">
              {(data.missingRequirements ?? []).map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white mb-2">
          Actionable Improvement Suggestions
        </h4>
        <ul className="list-decimal list-inside space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
          {(data.improvementSuggestions ?? []).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ApproverOutputPreview({ data }: { data: ApproverOutput }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
          {data.title}
        </h3>
        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Final Score: {data.finalQualityScore}/100
        </span>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        {data.executiveSummary}
      </p>
      <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0C0E] text-xs text-zinc-600 dark:text-zinc-300">
        <strong>Completion Decision:</strong> {data.completionExplanation}
      </div>
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">
          Agent Contributions Synthesized
        </h4>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-y border-zinc-200 dark:border-zinc-800">
          {(data.agentContributions ?? []).map((c, i) => (
            <div key={i} className="py-2.5 text-xs">
              <span className="font-semibold text-zinc-900 dark:text-white">{c.agentName}</span>
              <span className="text-zinc-400"> ({c.role}) — </span>
              <span className="text-zinc-600 dark:text-zinc-300">{c.contributionSummary}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
