import { AlertCircle, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppRoute, AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './hooks/useTheme';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { NewTaskPage } from './pages/NewTaskPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkspacePage } from './pages/WorkspacePage';
import {
  acceptBestResult,
  clearAllTasks,
  createTask,
  deleteTask,
  fetchAnalytics,
  fetchHealth,
  fetchTaskById,
  fetchTasks,
  getActiveApiBaseUrl,
  normalizeBackendUrl,
  retryTask,
  setStoredBackendUrl,
  subscribeToTaskStream,
} from './services/api';
import { AnalyticsSummary, CreateTaskPayload, TaskWorkflow } from './types/workflow';
import { HACKATHON_DEMO_TASK } from './utils/demoPreset';

const ROUTE_LABELS: Record<AppRoute, string> = {
  landing: 'Overview',
  dashboard: 'Dashboard',
  'new-task': 'New Task',
  workspace: 'Agent Workspace',
  history: 'Task History',
  analytics: 'Analytics',
  settings: 'Settings',
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [route, setRoute] = useState<AppRoute>('landing');
  const [tasks, setTasks] = useState<TaskWorkflow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [activeTask, setActiveTask] = useState<TaskWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoRunning, setDemoRunning] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(true);
  const [backendUrl, setBackendUrl] = useState<string>(() => getActiveApiBaseUrl());
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [defaultThreshold, setDefaultThreshold] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('agentflow_threshold'));
      return saved >= 50 && saved <= 95 ? saved : 80;
    } catch {
      return 80;
    }
  });

  const [defaultMaxCycles, setDefaultMaxCycles] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('agentflow_max_cycles'));
      return saved >= 1 && saved <= 3 ? saved : 3;
    } catch {
      return 3;
    }
  });

  const refreshData = useCallback(async () => {
    try {
      const [taskList, analyticsData, health] = await Promise.all([
        fetchTasks(),
        fetchAnalytics(),
        fetchHealth().catch(() => ({ status: 'ok', geminiConfigured: true })),
      ]);
      setTasks(taskList);
      setAnalytics(analyticsData);
      setGeminiConfigured(health.geminiConfigured);
      setGlobalError(null);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to load workspace data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const displayedTask = activeTask ?? tasks[0] ?? null;
  const streamTaskId = displayedTask?.taskId;
  const streamTaskStatus = displayedTask?.status;

  useEffect(() => {
    if (!streamTaskId || streamTaskStatus !== 'in_progress') return;

    const unsubscribe = subscribeToTaskStream(streamTaskId, (updated) => {
      setActiveTask(updated);
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.taskId === updated.taskId);
        if (idx === -1) return [updated, ...prev];
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      });
      if (updated.status !== 'in_progress') {
        void fetchAnalytics().then(setAnalytics).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [streamTaskId, streamTaskStatus]);

  const handleThresholdChange = (val: number) => {
    setDefaultThreshold(val);
    try {
      localStorage.setItem('agentflow_threshold', String(val));
    } catch {}
  };

  const handleMaxCyclesChange = (val: number) => {
    setDefaultMaxCycles(val);
    try {
      localStorage.setItem('agentflow_max_cycles', String(val));
    } catch {}
  };

  const handleSubmitTask = async (payload: CreateTaskPayload) => {
    setGlobalError(null);
    const created = await createTask(payload);
    setActiveTask(created);
    setTasks((prev) => [created, ...prev]);
    setRoute('workspace');
    void fetchAnalytics().then(setAnalytics).catch(() => {});
  };

  const handleRunDemo = async () => {
    setGlobalError(null);
    setDemoRunning(true);
    try {
      await handleSubmitTask({
        ...HACKATHON_DEMO_TASK,
        qualityThreshold: defaultThreshold,
        maxReviewCycles: defaultMaxCycles,
        isDemo: true,
      });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to start Hackathon Demo.');
    } finally {
      setDemoRunning(false);
    }
  };

  const handleOpenTask = async (taskId: string) => {
    setGlobalError(null);
    try {
      const fresh = await fetchTaskById(taskId);
      setActiveTask(fresh);
      setRoute('workspace');
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Unable to open task.');
    }
  };

  const handleRetryTask = async (taskId: string, guidance?: string) => {
    setGlobalError(null);
    try {
      const updated = await retryTask(taskId, guidance);
      setActiveTask(updated);
      await refreshData();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to retry task.');
    }
  };

  const handleAcceptBest = async (taskId: string) => {
    setGlobalError(null);
    try {
      const updated = await acceptBestResult(taskId);
      setActiveTask(updated);
      await refreshData();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to finalize result.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setGlobalError(null);
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
      if (activeTask?.taskId === taskId) {
        setActiveTask(null);
      }
      const nextAnalytics = await fetchAnalytics();
      setAnalytics(nextAnalytics);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to delete task.');
    }
  };

  const handleConnectBackend = async (rawUrl: string) => {
    const normalized = normalizeBackendUrl(rawUrl);
    await fetchHealth(normalized);
    setStoredBackendUrl(normalized);
    setBackendUrl(getActiveApiBaseUrl());
    setActiveTask(null);
    await refreshData();
  };

  const handleClearHistory = async () => {
    setGlobalError(null);
    try {
      await clearAllTasks();
      setTasks([]);
      setActiveTask(null);
      const nextAnalytics = await fetchAnalytics();
      setAnalytics(nextAnalytics);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to clear history.');
    }
  };

  return (
    <ErrorBoundary>
      {route === 'landing' ? (
        <>
          {globalError && (
            <div className="fixed bottom-4 right-4 z-50 max-w-md p-4 rounded-xl border border-rose-500/40 bg-white dark:bg-[#121417] shadow-lg text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p>{globalError}</p>
                <button
                  type="button"
                  onClick={() => void refreshData()}
                  className="font-medium underline hover:no-underline"
                >
                  Retry Connection
                </button>
              </div>
              <button
                type="button"
                onClick={() => setGlobalError(null)}
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <LandingPage
            onGetStarted={() => setRoute('new-task')}
            onOpenDashboard={() => setRoute('dashboard')}
            onRunDemo={handleRunDemo}
            demoRunning={demoRunning}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </>
      ) : (
        <AppShell
          currentRoute={route}
          onNavigate={(next) => {
            setRoute(next);
            if (next === 'dashboard' || next === 'analytics' || next === 'history') {
              void refreshData();
            }
          }}
          onRunDemo={handleRunDemo}
          demoRunning={demoRunning}
          theme={theme}
          onToggleTheme={toggleTheme}
          breadcrumbLabel={
            route === 'workspace' && displayedTask ? displayedTask.title : ROUTE_LABELS[route]
          }
        >
          {globalError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{globalError}</p>
                  <button
                    type="button"
                    onClick={() => void refreshData()}
                    className="font-medium underline hover:no-underline"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGlobalError(null)}
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {route === 'dashboard' && (
            <DashboardPage
              tasks={tasks}
              analytics={analytics}
              loading={loading}
              onNavigate={setRoute}
              onOpenTask={handleOpenTask}
              onRunDemo={handleRunDemo}
              demoRunning={demoRunning}
            />
          )}

          {route === 'new-task' && (
            <NewTaskPage
              defaultThreshold={defaultThreshold}
              defaultMaxCycles={defaultMaxCycles}
              onSubmitTask={handleSubmitTask}
              onRunDemo={handleRunDemo}
            />
          )}

          {route === 'workspace' && (
            <WorkspacePage
              task={displayedTask}
              onStartNewTask={() => setRoute('new-task')}
              onRunDemo={handleRunDemo}
              demoRunning={demoRunning}
              onRetryTask={handleRetryTask}
              onAcceptBest={handleAcceptBest}
            />
          )}

          {route === 'history' && (
            <HistoryPage
              tasks={tasks}
              loading={loading}
              onOpenTask={handleOpenTask}
              onDeleteTask={handleDeleteTask}
              onCreateNew={() => setRoute('new-task')}
            />
          )}

          {route === 'analytics' && (
            <AnalyticsPage
              analytics={analytics}
              loading={loading}
              onStartNewTask={() => setRoute('new-task')}
            />
          )}

          {route === 'settings' && (
            <SettingsPage
              theme={theme}
              onToggleTheme={toggleTheme}
              defaultThreshold={defaultThreshold}
              onChangeDefaultThreshold={handleThresholdChange}
              defaultMaxCycles={defaultMaxCycles}
              onChangeDefaultMaxCycles={handleMaxCyclesChange}
              geminiConfigured={geminiConfigured}
              backendUrl={backendUrl}
              onConnectBackend={handleConnectBackend}
              onClearHistory={handleClearHistory}
            />
          )}
        </AppShell>
      )}
    </ErrorBoundary>
  );
}
