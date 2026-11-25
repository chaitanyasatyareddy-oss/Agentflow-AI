import { ArrowRight, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { TaskStatusText } from '../components/StatusLabel';
import { TaskWorkflow } from '../types/workflow';

interface HistoryPageProps {
  tasks: TaskWorkflow[];
  loading: boolean;
  onOpenTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onCreateNew: () => void;
}

export function HistoryPage({
  tasks,
  loading,
  onOpenTask,
  onDeleteTask,
  onCreateNew,
}: HistoryPageProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = tasks.filter((t) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.userRequest.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDelete = async (taskId: string) => {
    setDeletingId(taskId);
    try {
      await onDeleteTask(taskId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Task History
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Browse, search, reopen, or remove past collaborative executions stored on the server.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          New Collaborative Task
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by task title, prompt, or category..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] text-zinc-900 dark:text-zinc-100"
        >
          <option value="All">All Categories</option>
          <option value="Business">Business</option>
          <option value="Research">Research</option>
          <option value="Education">Education</option>
          <option value="Technology">Technology</option>
          <option value="Marketing">Marketing</option>
          <option value="Project Planning">Project Planning</option>
          <option value="General">General</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] text-zinc-900 dark:text-zinc-100"
        >
          <option value="All">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="completed_with_limitations">Completed with Limitations</option>
          <option value="in_progress">In Progress</option>
          <option value="needs_human_review">Needs Human Review</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-500">Loading task history...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {tasks.length === 0 ? 'No tasks saved in history yet.' : 'No tasks match your filters.'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {tasks.length === 0
                ? 'Create a task or run the Hackathon Demo to populate real execution history.'
                : 'Try clearing your search query or selecting All Statuses.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-[#0B0C0E]">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Cycles</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((task) => {
                  const score =
                    task.finalResult?.finalQualityScore ??
                    task.reviewHistory[task.reviewHistory.length - 1]?.qualityScore;
                  return (
                    <tr
                      key={task.taskId}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {task.title}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span>{task.outputFormat}</span>
                          {task.isDemo && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-blue-600 dark:text-blue-400">Demo</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            {new Date(task.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {task.category}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <TaskStatusText status={task.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {typeof score === 'number' ? `${score}/100` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
                        {task.reviewHistory.length}/{task.maxReviewCycles}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenTask(task.taskId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(task.taskId)}
                            disabled={deletingId === task.taskId}
                            aria-label={`Delete ${task.title}`}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
