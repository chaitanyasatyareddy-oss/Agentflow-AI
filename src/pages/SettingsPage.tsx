import { CheckCircle2, Globe, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { ThemeMode } from '../hooks/useTheme';

interface SettingsPageProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  defaultThreshold: number;
  onChangeDefaultThreshold: (val: number) => void;
  defaultMaxCycles: number;
  onChangeDefaultMaxCycles: (val: number) => void;
  geminiConfigured: boolean;
  backendUrl: string;
  onConnectBackend: (url: string) => Promise<void>;
  onClearHistory: () => Promise<void>;
}

export function SettingsPage({
  theme,
  onToggleTheme,
  defaultThreshold,
  onChangeDefaultThreshold,
  defaultMaxCycles,
  onChangeDefaultMaxCycles,
  geminiConfigured,
  backendUrl,
  onConnectBackend,
  onClearHistory,
}: SettingsPageProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [renderInput, setRenderInput] = useState(backendUrl);
  const [connecting, setConnecting] = useState(false);
  const [backendMessage, setBackendMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setRenderInput(backendUrl);
  }, [backendUrl]);

  const handleClear = async () => {
    setClearing(true);
    try {
      await onClearHistory();
      setConfirmClear(false);
    } finally {
      setClearing(false);
    }
  };

  const triggerSaved = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleBackendSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBackendMessage(null);
    setConnecting(true);
    try {
      await onConnectBackend(renderInput);
      setBackendMessage({
        type: 'success',
        text: renderInput.trim()
          ? 'Connected to Render backend successfully.'
          : 'Switched back to built-in preview backend.',
      });
    } catch (err) {
      setBackendMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to reach that backend URL.',
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleResetBackend = async () => {
    setBackendMessage(null);
    setConnecting(true);
    try {
      setRenderInput('');
      await onConnectBackend('');
      setBackendMessage({
        type: 'success',
        text: 'Using built-in preview server (same origin).',
      });
    } catch (err) {
      setBackendMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reset backend connection.',
      });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Platform Settings
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configure default orchestration thresholds, backend connection, and task storage.
          </p>
        </div>
        {savedNotice && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Saved
          </span>
        )}
      </div>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Interface Theme
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Switch between Dark Mode (default) and Light Mode across all views.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
        </button>
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Orchestration Defaults
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Applied automatically when creating new tasks.
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="default-threshold"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Default Quality Threshold
            </label>
            <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
              {defaultThreshold}/100
            </span>
          </div>
          <input
            id="default-threshold"
            type="range"
            min={50}
            max={95}
            step={5}
            value={defaultThreshold}
            onChange={(e) => {
              onChangeDefaultThreshold(Number(e.target.value));
              triggerSaved();
            }}
            className="w-full accent-blue-600"
          />
        </div>

        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <label
            htmlFor="default-cycles"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1.5"
          >
            Default Max Review Cycles (Hard Cap: 3)
          </label>
          <select
            id="default-cycles"
            value={defaultMaxCycles}
            onChange={(e) => {
              onChangeDefaultMaxCycles(Number(e.target.value));
              triggerSaved();
            }}
            className="w-full sm:w-64 px-3.5 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA] dark:bg-[#0B0C0E] text-zinc-900 dark:text-zinc-100"
          >
            <option value={1}>1 review cycle</option>
            <option value={2}>2 review cycles</option>
            <option value={3}>3 review cycles (Default)</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            AI Execution &amp; Render Backend
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Connect this preview to an external Render Web Service URL, or leave blank to use the
            built-in preview server.
          </p>
        </div>

        <div className="text-xs font-medium flex flex-wrap items-center gap-x-4 gap-y-1">
          {geminiConfigured ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              Server Gemini API key detected and ready.
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              GEMINI_API_KEY is not set on the active backend server.
            </span>
          )}
          <span className="text-zinc-500 dark:text-zinc-400 font-mono">
            Target: {backendUrl || 'Built-in Server (Same Origin)'}
          </span>
        </div>

        <form onSubmit={handleBackendSubmit} className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
          <label
            htmlFor="render-backend-url"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Render Backend URL
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="render-backend-url"
                type="url"
                value={renderInput}
                onChange={(e) => setRenderInput(e.target.value)}
                placeholder="https://your-agentflow-api.onrender.com"
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA] dark:bg-[#0B0C0E] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>
            <button
              type="submit"
              disabled={connecting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {connecting ? 'Connecting...' : 'Connect & Test'}
            </button>
            {backendUrl && (
              <button
                type="button"
                onClick={handleResetBackend}
                disabled={connecting}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Use Built-in</span>
              </button>
            )}
          </div>
          {backendMessage && (
            <p
              className={`text-xs ${
                backendMessage.type === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {backendMessage.text}
            </p>
          )}
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121417] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Clear Task History
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Permanently remove all stored task executions, logs, and analytics records.
          </p>
        </div>

        {!confirmClear ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All History</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Confirm Delete All'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
