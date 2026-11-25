import { AlertCircle, ArrowRight, Loader2, Play } from 'lucide-react';
import React, { useState } from 'react';
import { CreateTaskPayload, OutputFormat, TaskCategory } from '../types/workflow';
import { HACKATHON_DEMO_TASK, QUICK_TASK_TEMPLATES } from '../utils/demoPreset';

interface NewTaskPageProps {
  defaultThreshold: number;
  defaultMaxCycles: number;
  onSubmitTask: (payload: CreateTaskPayload) => Promise<void>;
  onRunDemo: () => Promise<void>;
}

const CATEGORIES: TaskCategory[] = [
  'Business',
  'Research',
  'Education',
  'Technology',
  'Marketing',
  'Project Planning',
  'General',
];

const OUTPUT_FORMATS: OutputFormat[] = [
  'Detailed Report',
  'Business Plan',
  'Presentation Content',
  'Research Document',
  'Step-by-Step Guide',
  'Custom Output',
];

export function NewTaskPage({
  defaultThreshold,
  defaultMaxCycles,
  onSubmitTask,
  onRunDemo,
}: NewTaskPageProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Business');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('Detailed Report');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [qualityThreshold, setQualityThreshold] = useState<number>(defaultThreshold);
  const [maxReviewCycles, setMaxReviewCycles] = useState<number>(defaultMaxCycles);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplate = (tpl: CreateTaskPayload) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setCategory(tpl.category);
    setOutputFormat(tpl.outputFormat);
    setAdditionalInstructions(tpl.additionalInstructions ?? '');
    setQualityThreshold(tpl.qualityThreshold ?? defaultThreshold);
    setMaxReviewCycles(tpl.maxReviewCycles ?? defaultMaxCycles);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 3) {
      setError('Please enter a task title (at least 3 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setError('Please provide a detailed task description (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitTask({
        title: title.trim(),
        description: description.trim(),
        category,
        outputFormat,
        additionalInstructions: additionalInstructions.trim(),
        qualityThreshold,
        maxReviewCycles,
        isDemo: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start task collaboration.');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          New Collaborative Task
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Submit an objective and configure your quality gate. All five Gemini agents execute
          sequentially with structured handoffs and review loops.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6 space-y-5"
        >
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="task-title"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5"
            >
              Task Title
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Go-to-Market Strategy for Campus Micro-Mobility App"
              maxLength={200}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA] dark:bg-[#0B0C0E] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div>
            <label
              htmlFor="task-description"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5"
            >
              Detailed Task Description
            </label>
            <textarea
              id="task-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the objective, target audience, constraints, budget, or key deliverables you want the multi-agent team to produce..."
              maxLength={6000}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA] dark:bg-[#0B0C0E] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-category"
                className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5"
              >
                Task Category
              </label>
              <select
                id="task-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA] dark:bg-[#0B0C0E] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="output-format"
                className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5"
              >
                Desired Output Format
              </label>
              <select
                id="output-format"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA] dark:bg-[#0B0C0E] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {OUTPUT_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="additional-instructions"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5"
            >
              Additional Instructions (Optional)
            </label>
            <textarea
              id="additional-instructions"
              rows={2}
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Tone, constraints, edge cases to evaluate, or formatting preferences..."
              maxLength={2000}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA] dark:bg-[#0B0C0E] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="quality-threshold"
                  className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Quality Threshold
                </label>
                <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {qualityThreshold}/100
                </span>
              </div>
              <input
                id="quality-threshold"
                type="range"
                min={50}
                max={95}
                step={5}
                value={qualityThreshold}
                onChange={(e) => setQualityThreshold(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Drafts below {qualityThreshold}/100 are rejected for revision.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="max-cycles"
                  className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Max Review Cycles
                </label>
                <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-white tabular-nums">
                  {maxReviewCycles} max
                </span>
              </div>
              <select
                id="max-cycles"
                value={maxReviewCycles}
                onChange={(e) => setMaxReviewCycles(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA] dark:bg-[#0B0C0E] text-zinc-900 dark:text-zinc-100"
              >
                <option value={1}>1 review cycle</option>
                <option value={2}>2 review cycles</option>
                <option value={3}>3 review cycles (Recommended)</option>
              </select>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Hard safety limit prevents infinite loops.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting Agents...</span>
                </>
              ) : (
                <>
                  <span>Start Collaboration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Preset & Demo Rail */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-zinc-900 dark:text-white">
              Hackathon Demo Mode
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Launch the preconfigured student food delivery startup business plan immediately to
              demonstrate live planning, research, creation, critique, and synthesis.
            </p>
            <button
              type="button"
              onClick={onRunDemo}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Hackathon Demo</span>
            </button>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-zinc-900 dark:text-white">
              Load Prompt Template
            </h2>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[HACKATHON_DEMO_TASK, ...QUICK_TASK_TEMPLATES].map((tpl) => (
                <button
                  key={tpl.title}
                  type="button"
                  onClick={() => loadTemplate(tpl)}
                  className="w-full py-2.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="truncate">{tpl.title}</span>
                  <span className="text-zinc-400 shrink-0">Use</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
