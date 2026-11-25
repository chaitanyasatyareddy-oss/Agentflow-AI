import { AlertCircle, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppRoute, AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTheme } from './hooks/useTheme';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
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

type ViewRoute = AppRoute | 'login';

const ROUTE_LABELS: Record<AppRoute, string> = {
  landing: 'Overview',
  dashboard: 'Dashboard',
  'new-task': 'New Task',
  workspace: 'Agent Workspace',
  history: 'Task History',
  analytics: 'Analytics',
  settings: 'Settings',
};

function isWorkspaceRoute(route: ViewRoute): route is AppRoute {
  return route !== 'landing' && route !== 'login';
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { user, authReady, signingIn, authError, clearAuthError, signInWithGoogle, logout } =
    useAuth();

  const [route, setRoute] = useState<ViewRoute>('landing');
  const [pendingRoute, setPendingRoute] = useState<AppRoute>('dashboard');
  const [tasks, setTasks] = useState<TaskWorkflow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [activeTask, setActiveTask] = useState<TaskWorkflow | null>(null);
  const [loading, setLoading] = useState(false);
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
    if (!user) return;
    setLoading(true);
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
  }, [user]);

  useEffect(() => {
    if (!authReady) return;
    if (user) {
      void refreshData();
      if (route === 'login') {
        setRoute(pendingRoute || 'dashboard');
      }
    } else {
      setTasks([]);
      setAnalytics(null);
      setActiveTask(null);
      setGlobalError(null);
      setLoading(false);
      if (isWorkspaceRoute(route)) {
        setPendingRoute(route);
        setRoute('login');
      }
    }
  }, [authReady, user, route, pendingRoute, refreshData]);

  const displayedTask = activeTask ?? tasks[0] ?? null;
  const streamTaskId = user ? displayedTask?.taskId : undefined;
  const streamTaskStatus = user ? displayedTask?.status : undefined;

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

  const navigateProtected = (target: AppRoute) => {
    if (target === 'landing') {
      setRoute('landing');
      return;
    }
    if (!user) {
      clearAuthError();
      setPendingRoute(target);
      setRoute('login');
      return;
    }
    setRoute(target);
    if (target === 'dashboard' || target === 'analytics' || target === 'history') {
      void refreshData();
    }
  };

  const handleGoogleSignIn = async () => {
    const ok = await signInWithGoogle();
    if (ok) {
      setRoute(pendingRoute || 'dashboard');
    }
  };

  const handleSignOut = async () => {
    await logout();
    setTasks([]);
    setAnalytics(null);
    setActiveTask(null);
    setGlobalError(null);
    setRoute('landing');
  };

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

  if (route === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => navigateProtected('new-task')}
        onOpenDashboard={() => navigateProtected('dashboard')}
        onSignIn={() => {
          clearAuthError();
          setPendingRoute('dashboard');
          setRoute('login');
        }}
        onSignOut={() => void handleSignOut()}
        isAuthenticated={Boolean(user)}
        userDisplayName={user?.displayName || user?.email || undefined}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-zinc-900 dark:bg-[#0B0C0E] dark:text-zinc-100">
        <div className="flex items-center gap-2.5 text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span>Checking session...</span>
        </div>
      </div>
    );
  }

  if (route === 'login' || !user) {
    return (
      <LoginPage
        onBackToLanding={() => {
          clearAuthError();
          setRoute('landing');
        }}
        onGoogleSignIn={handleGoogleSignIn}
        signingIn={signingIn}
        authError={authError}
        onClearError={clearAuthError}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const workspaceRoute: AppRoute = isWorkspaceRoute(route) ? route : 'dashboard';

  return (
    <AppShell
      currentRoute={workspaceRoute}
      onNavigate={navigateProtected}
      theme={theme}
      onToggleTheme={toggleTheme}
      breadcrumbLabel={
        workspaceRoute === 'workspace' && displayedTask
          ? displayedTask.title
          : ROUTE_LABELS[workspaceRoute]
      }
      userDisplayName={user.displayName || undefined}
      userEmail={user.email || undefined}
      userPhotoUrl={user.photoURL || undefined}
      onSignOut={() => void handleSignOut()}
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

      {workspaceRoute === 'dashboard' && (
        <DashboardPage
          tasks={tasks}
          analytics={analytics}
          loading={loading}
          onNavigate={navigateProtected}
          onOpenTask={handleOpenTask}
        />
      )}

      {workspaceRoute === 'new-task' && (
        <NewTaskPage
          defaultThreshold={defaultThreshold}
          defaultMaxCycles={defaultMaxCycles}
          onSubmitTask={handleSubmitTask}
        />
      )}

      {workspaceRoute === 'workspace' && (
        <WorkspacePage
          task={displayedTask}
          onStartNewTask={() => navigateProtected('new-task')}
          onRetryTask={handleRetryTask}
          onAcceptBest={handleAcceptBest}
        />
      )}

      {workspaceRoute === 'history' && (
        <HistoryPage
          tasks={tasks}
          loading={loading}
          onOpenTask={handleOpenTask}
          onDeleteTask={handleDeleteTask}
          onCreateNew={() => navigateProtected('new-task')}
        />
      )}

      {workspaceRoute === 'analytics' && (
        <AnalyticsPage
          analytics={analytics}
          loading={loading}
          onStartNewTask={() => navigateProtected('new-task')}
        />
      )}

      {workspaceRoute === 'settings' && (
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
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
