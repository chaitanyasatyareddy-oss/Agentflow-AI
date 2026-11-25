import {
  AlertTriangle,
  ArrowRightCircle,
  CheckCircle2,
  Info,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { ActivityLogEntry } from '../types/workflow';

interface ActivityLogPanelProps {
  logs: ActivityLogEntry[];
}

export function ActivityLogPanel({ logs }: ActivityLogPanelProps) {
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const safeLogs = logs ?? [];

  const filtered =
    agentFilter === 'all' ? safeLogs : safeLogs.filter((l) => l.agentKey === agentFilter);

  const renderEventIcon = (type: ActivityLogEntry['eventType']) => {
    switch (type) {
      case 'handoff':
        return <ArrowRightCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
      case 'completed':
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'rejected':
        return <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'intervention':
        return <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />;
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Chronological Collaboration Log
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time audit trail of assignments, handoffs, review verdicts, and revisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-[#0B0C0E] border border-zinc-200 dark:border-zinc-800">
          {[
            { id: 'all', label: 'All' },
            { id: 'planner', label: 'Planner' },
            { id: 'researcher', label: 'Researcher' },
            { id: 'creator', label: 'Creator' },
            { id: 'reviewer', label: 'Reviewer' },
            { id: 'approver', label: 'Approver' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAgentFilter(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                agentFilter === tab.id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 opacity-60" />
          No activity entries match this filter yet.
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 mt-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="py-3.5 flex items-start gap-3.5">
              <div className="mt-0.5">{renderEventIcon(entry.eventType)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {entry.agentName}
                  </span>
                  <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
                  <span className="text-zinc-500 dark:text-zinc-400 capitalize">
                    {entry.stage.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{entry.message}</p>
                {entry.details && (
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {entry.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
