import { ArrowRight, Moon, Play, Sun } from 'lucide-react';
import { useState } from 'react';
import { ThemeMode } from '../hooks/useTheme';

interface LandingPageProps {
  onGetStarted: () => void;
  onOpenDashboard: () => void;
  onRunDemo: () => void;
  demoRunning: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const AGENT_SPECS = [
  {
    id: 'planner',
    index: '01',
    name: 'Master Planner',
    role: 'Project Manager & Task Strategist',
    receives: 'Original user prompt, category, output format, and quality threshold.',
    responsibility:
      'Decomposes ambiguous goals into concrete subtasks, establishes measurable acceptance criteria, and assigns explicit instructions to each specialist.',
    delivers: 'Execution plan, subtask table, role assignments, and success criteria JSON.',
    handoffTo: 'Research Specialist',
  },
  {
    id: 'researcher',
    index: '02',
    name: 'Research Specialist',
    role: 'Research Analyst',
    receives: 'User request, Planner assignment, and target success criteria.',
    responsibility:
      'Surfaces domain constraints, opportunities, operational risks, and explicit information gaps while strictly avoiding fabricated citations.',
    delivers: 'Structured research brief, confidence-tagged findings, risks, and gaps.',
    handoffTo: 'Creator Agent',
  },
  {
    id: 'creator',
    index: '03',
    name: 'Creator Agent',
    role: 'Main Content Creator & Problem Solver',
    receives: 'Execution plan, Research report, and (on revisions) Critic feedback.',
    responsibility:
      'Writes the complete deliverable in the requested format, documents design rationale and assumptions, and resolves critique items across revision cycles.',
    delivers: 'Versioned draft (v1–vN), executive summary, sections, and assumptions.',
    handoffTo: 'Critic / Reviewer',
  },
  {
    id: 'reviewer',
    index: '04',
    name: 'Critic / Reviewer',
    role: 'Quality Assurance & Critical Reviewer',
    receives: 'Original prompt, success criteria, research risks, and Creator draft.',
    responsibility:
      'Scores completeness, accuracy, clarity, and relevance out of 100. Rejects drafts below threshold with concrete, actionable corrections.',
    delivers: '100-point rubric score, errors, missing requirements, and approval verdict.',
    handoffTo: 'Creator (if < threshold) or Final Approver',
  },
  {
    id: 'approver',
    index: '05',
    name: 'Final Approver',
    role: 'Final Quality Controller & Synthesizer',
    receives: 'Approved draft, full review history, and upstream agent records.',
    responsibility:
      'Verifies review comments were addressed, removes repetition, documents every agent contribution, and publishes the final report.',
    delivers: 'Publication-ready report, recommendations, limitations, and PDF/TXT exports.',
    handoffTo: 'User Deliverable',
  },
];

const PIPELINE_SEQUENCE = [
  'User Input',
  'Task Analysis',
  'Planning',
  'Agent Assignment',
  'Execution',
  'Information Sharing',
  'Review',
  'Feedback',
  'Improvement',
  'Final Approval',
  'Final Output',
];

export function LandingPage({
  onGetStarted,
  onOpenDashboard,
  onRunDemo,
  demoRunning,
  theme,
  onToggleTheme,
}: LandingPageProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [selectedSpecIdx, setSelectedSpecIdx] = useState(0);
  const activeSpec = AGENT_SPECS[selectedSpecIdx];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 dark:bg-[#0B0C0E] dark:text-zinc-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA]/90 dark:bg-[#0B0C0E]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-base font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0"
          >
            AgentFlow AI
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a
              href="#architecture"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Architecture
            </a>
            <a
              href="#how-it-works"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Pipeline
            </a>
            <a
              href="#comparison"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Why Multi-Agent
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
            >
              Open Workspace
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4">
                One Goal · Multiple AI Minds · One Perfect Result
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.08] text-balance">
                Complex Tasks. Intelligent Teams. Better Results.
              </h1>
              <p className="mt-5 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-lg">
                Meet your AI-powered collaborative team. Plan, research, create, review and deliver
                exceptional results with specialized AI agents.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onRunDemo}
                  disabled={demoRunning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#121417] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{demoRunning ? 'Starting Demo...' : 'Run Hackathon Demo'}</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-[#101215] min-h-[260px] lg:min-h-[340px]">
                {!imgFailed ? (
                  <img
                    src="/src/assets/images/hero_agentflow_network_1795597281663.jpg"
                    alt="Five interconnected AI agent nodes arranged in a structured pipeline"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8 text-sm text-zinc-400">
                    Five-Stage Multi-Agent Orchestration Pipeline
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Interactive 5-Agent Architecture Explorer */}
        <section
          id="architecture"
          className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#101215] py-16 lg:py-24"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Five Specialized Agents, One Orchestrator
              </h2>
              <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                Inspect each agent’s contract below. No agent communicates unorchestrated—every
                handoff passes structured JSON context and preserves your original requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-[#FAFAFA] dark:bg-[#0B0C0E]">
              {/* Left Selector List */}
              <div className="lg:col-span-5 divide-y divide-zinc-200 dark:divide-zinc-800 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800">
                {AGENT_SPECS.map((agent, idx) => {
                  const selected = idx === selectedSpecIdx;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedSpecIdx(idx)}
                      className={`w-full px-5 py-4 text-left flex items-center justify-between gap-4 transition-colors ${
                        selected
                          ? 'bg-white dark:bg-[#14171C] text-zinc-900 dark:text-white'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {agent.index}. {agent.name}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          {agent.role}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono shrink-0 ${
                          selected ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'
                        }`}
                      >
                        {selected ? 'Active' : 'Inspect'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Detail Blueprint */}
              <div className="lg:col-span-7 p-6 sm:p-8 bg-white dark:bg-[#121417] flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <div className="font-mono text-xs text-blue-600 dark:text-blue-400">
                      Agent {activeSpec.index} · {activeSpec.role}
                    </div>
                    <h3 className="mt-1.5 font-display text-xl font-bold text-zinc-900 dark:text-white">
                      {activeSpec.name}
                    </h3>
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {activeSpec.responsibility}
                    </p>
                  </div>

                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800 text-sm">
                    <div className="py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Input Contract
                      </span>
                      <span className="sm:col-span-2 text-zinc-800 dark:text-zinc-200">
                        {activeSpec.receives}
                      </span>
                    </div>
                    <div className="py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Structured Output
                      </span>
                      <span className="sm:col-span-2 text-zinc-800 dark:text-zinc-200">
                        {activeSpec.delivers}
                      </span>
                    </div>
                    <div className="py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Handoff Target
                      </span>
                      <span className="sm:col-span-2 font-medium text-blue-600 dark:text-blue-400">
                        {activeSpec.handoffTo}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                  Quality Loop: Drafts scoring below 80/100 return to Creator (max 3 cycles safety
                  cap).
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 11-Stage Execution Flow Ledger */}
        <section id="how-it-works" className="py-16 lg:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                End-to-End Collaboration Sequence
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Every task progresses transparently through eleven tracked stages with live
                Server-Sent Events.
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-5 pt-6">
            {PIPELINE_SEQUENCE.map((stage, i) => (
              <div key={stage} className="space-y-1">
                <div className="font-mono text-xs text-zinc-400 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{stage}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section
          id="comparison"
          className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#101215] py-16 lg:py-20"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-8">
              Why Multi-Agent Collaboration Matters
            </h2>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left border-collapse text-sm bg-[#FAFAFA] dark:bg-[#0B0C0E]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <th className="py-3.5 px-5">Dimension</th>
                    <th className="py-3.5 px-5">Single General Model</th>
                    <th className="py-3.5 px-5 text-zinc-900 dark:text-white">AgentFlow AI Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr>
                    <td className="py-3.5 px-5 font-medium text-zinc-900 dark:text-zinc-100">
                      Decomposition
                    </td>
                    <td className="py-3.5 px-5 text-zinc-500 dark:text-zinc-400">
                      Single-shot guess without explicit subtasks
                    </td>
                    <td className="py-3.5 px-5 text-zinc-800 dark:text-zinc-200">
                      Master Planner sets subtasks, assignments, and acceptance criteria
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium text-zinc-900 dark:text-zinc-100">
                      Self-Correction
                    </td>
                    <td className="py-3.5 px-5 text-zinc-500 dark:text-zinc-400">
                      First draft returned directly to the user
                    </td>
                    <td className="py-3.5 px-5 text-zinc-800 dark:text-zinc-200">
                      Critic audits against rubric and triggers Creator revisions below 80/100
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium text-zinc-900 dark:text-zinc-100">
                      Safety & Oversight
                    </td>
                    <td className="py-3.5 px-5 text-zinc-500 dark:text-zinc-400">
                      No failure isolation or audit log
                    </td>
                    <td className="py-3.5 px-5 text-zinc-800 dark:text-zinc-200">
                      Max 3-cycle governor, full activity log, and human intervention controls
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            <span className="font-display font-semibold text-zinc-900 dark:text-white">
              AgentFlow AI
            </span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>One Goal. Multiple AI Minds. One Perfect Result.</span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              New Task
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
