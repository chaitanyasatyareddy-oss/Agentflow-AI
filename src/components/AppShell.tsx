import {
  Activity,
  BarChart3,
  Globe,
  History,
  LayoutDashboard,
  Menu,
  Moon,
  Play,
  PlusCircle,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { ThemeMode } from '../hooks/useTheme';

export type AppRoute =
  | 'landing'
  | 'dashboard'
  | 'new-task'
  | 'workspace'
  | 'history'
  | 'analytics'
  | 'settings';

interface AppShellProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onRunDemo: () => void;
  demoRunning: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  breadcrumbLabel: string;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  route: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'new-task', label: 'New Task', icon: PlusCircle },
  { route: 'workspace', label: 'Agent Workspace', icon: Activity },
  { route: 'history', label: 'Task History', icon: History },
  { route: 'analytics', label: 'Analytics', icon: BarChart3 },
  { route: 'settings', label: 'Settings', icon: Settings },
];

export function AppShell({
  currentRoute,
  onNavigate,
  onRunDemo,
  demoRunning,
  theme,
  onToggleTheme,
  breadcrumbLabel,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (route: AppRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#FAFAFA] text-zinc-900 dark:bg-[#0B0C0E] dark:text-zinc-100">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#101215] transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('landing')}
            className="font-display text-sm font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity"
          >
            AgentFlow AI
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Primary Workspace">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-0.5 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('landing')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 shrink-0" />
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 px-4 sm:px-6 flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#101215] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 truncate">
              <span className="hidden sm:inline">AgentFlow AI</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {breadcrumbLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onRunDemo}
              disabled={demoRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{demoRunning ? 'Starting Demo...' : 'Run Demo'}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('new-task')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
