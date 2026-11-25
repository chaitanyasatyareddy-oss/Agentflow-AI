import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Moon, ShieldCheck, Sun } from 'lucide-react';
import { ThemeMode } from '../hooks/useTheme';

interface LoginPageProps {
  onBackToLanding: () => void;
  onGoogleSignIn: () => Promise<void>;
  signingIn: boolean;
  authError: string | null;
  onClearError: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const CAPABILITY_NOTES = [
  'Launch and monitor 5-agent Gemini workflows in real time',
  'Automated quality scoring and iterative draft improvement loops',
  'Private task history, collaboration logs, and PDF/TXT exports',
];

export function LoginPage({
  onBackToLanding,
  onGoogleSignIn,
  signingIn,
  authError,
  onClearError,
  theme,
  onToggleTheme,
}: LoginPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900 dark:bg-[#0B0C0E] dark:text-zinc-100">
      {/* Top Navigation */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#101215]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToLanding}
            className="font-display text-base font-bold tracking-tight text-zinc-900 dark:text-white hover:opacity-80 transition-opacity"
          >
            AgentFlow AI
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Auth Layout */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-[#121417]">
          {/* Left Editorial Summary */}
          <div className="lg:col-span-6 p-8 sm:p-10 bg-zinc-50 dark:bg-[#0E1013] border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Multi-Agent Workspace
              </p>
              <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                Sign in to AgentFlow AI
              </h1>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Access your private multi-agent orchestration workspace to plan, research, draft,
                critique, and approve deliverables.
              </p>

              <ul className="mt-6 space-y-3">
                {CAPABILITY_NOTES.map((note) => (
                  <li
                    key={note}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Protected with verified Google Sign-In and user-scoped task isolation.</span>
            </div>
          </div>

          {/* Right Sign-In Action */}
          <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center">
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
                  Continue with your account
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Use your Google account to enter the AgentFlow AI workspace.
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p>{authError}</p>
                    <button
                      type="button"
                      onClick={onClearError}
                      className="font-medium underline hover:no-underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => void onGoogleSignIn()}
                disabled={signingIn}
                className="w-full inline-flex items-center justify-center gap-3 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                    <ArrowRight className="w-4 h-4 ml-auto opacity-80" />
                  </>
                )}
              </button>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Your session stays active across reloads and isolates your multi-agent tasks, logs,
                and analytics to your account.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
