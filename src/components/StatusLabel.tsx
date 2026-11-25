import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { AgentStatus, TaskStatus } from '../types/workflow';

export function AgentStatusText({ status }: { status: AgentStatus }) {
  switch (status) {
    case 'waiting':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          Waiting
        </span>
      );
    case 'working':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          Working
        </span>
      );
    case 'reviewing':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          Reviewing
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Completed
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Rejected
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          Failed
        </span>
      );
  }
}

export function TaskStatusText({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          In Progress
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Completed
        </span>
      );
    case 'completed_with_limitations':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          Completed with Limitations
        </span>
      );
    case 'needs_human_review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          Needs Human Review
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          Failed
        </span>
      );
  }
}
