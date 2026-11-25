import { Check, Copy, FileDown, FileText, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { TaskWorkflow } from '../types/workflow';
import {
  downloadPdfFile,
  downloadTextFile,
  formatFinalResultAsText,
} from '../utils/exportReport';
import { TaskStatusText } from './StatusLabel';

interface FinalResultPanelProps {
  task: TaskWorkflow;
  onStartNewTask: () => void;
}

export function FinalResultPanel({ task, onStartNewTask }: FinalResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const result = task.finalResult;

  const handleCopy = async () => {
    const text = formatFinalResultAsText(task);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!result) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
          Final Deliverable Pending
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          {task.status === 'in_progress'
            ? 'The Final Approver will publish the synthesized document once the Review & Improvement loop completes.'
            : 'No final synthesized document has been generated yet. Inspect agent outputs or use the human intervention actions above.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <TaskStatusText status={task.status} />
          <span aria-hidden="true">·</span>
          <span className="font-mono font-semibold text-zinc-900 dark:text-white tabular-nums">
            Final Score: {result.finalQualityScore}/100
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Review Iterations: {(task.reviewHistory ?? []).length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Result</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => downloadPdfFile(task)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-500" />
            <span>Download as PDF</span>
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(task)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span>Download as TXT</span>
          </button>
          <button
            type="button"
            onClick={onStartNewTask}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Start New Task</span>
          </button>
        </div>
      </div>

      <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
        <header className="pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Final Collaborative Deliverable · {task.category} · {task.outputFormat}
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white text-balance">
            {result.title || task.title}
          </h1>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {result.completionExplanation}
          </p>
        </header>

        <section>
          <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white mb-2.5">
            Executive Summary
          </h2>
          <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
            {result.executiveSummary}
          </p>
        </section>

        <section className="space-y-6">
          {(result.finalAnswerSections ?? []).map((sec, idx) => (
            <div key={idx} className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white mb-2.5">
                {sec.heading}
              </h2>
              <div className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {sec.content}
              </div>
            </div>
          ))}
        </section>

        <section className="pt-6 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-3">
              Important Recommendations
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {(result.recommendations ?? []).map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-3">
              Limitations & Assumptions
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {(result.limitations ?? []).map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-3">
            Agent Contribution Summary
          </h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(result.agentContributions ?? []).map((c, i) => (
              <div key={i} className="py-3 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 text-sm">
                <div className="w-48 shrink-0 font-medium text-zinc-900 dark:text-white">
                  {c.agentName}
                </div>
                <div className="text-zinc-600 dark:text-zinc-300 flex-1">
                  {c.contributionSummary}
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
