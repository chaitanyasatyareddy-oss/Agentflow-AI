import crypto from 'crypto';
import {
  ActivityLogEntry,
  AgentRecord,
  AgentRoleKey,
  CreateTaskPayload,
  CreatorOutput,
  PlannerOutput,
  ResearcherOutput,
  ReviewerOutput,
  TaskWorkflow,
  WorkflowStage,
} from '../../src/types/workflow.ts';
import {
  AgentExecutionHooks,
  runApproverAgent,
  runCreatorAgent,
  runPlannerAgent,
  runResearcherAgent,
  runReviewerAgent,
  TaskContextInput,
} from '../agents/definitions.ts';
import { taskStore } from '../database/store.ts';
import { AgentExecutionError } from '../services/geminiClient.ts';

const activeExecutions = new Set<string>();

function createInitialAgent<T>(
  key: AgentRoleKey,
  name: string,
  roleTitle: string,
  handoffTo: string | null
): AgentRecord<T> {
  return {
    key,
    name,
    roleTitle,
    status: 'waiting',
    assignedTask: 'Awaiting upstream orchestration handoff',
    currentActivity: 'Standby',
    input: null,
    output: null,
    outputSummary: '',
    handoffTo,
    startedAt: null,
    completedAt: null,
    executionCount: 0,
    errorMessage: null,
  };
}

function appendLog(
  task: TaskWorkflow,
  entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>
): void {
  task.activityLog.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
}

function saveIfExists(task: TaskWorkflow): boolean {
  if (!taskStore.getTask(task.taskId)) {
    return false;
  }
  taskStore.saveTask(task);
  return true;
}

function toTaskContext(task: TaskWorkflow): TaskContextInput {
  return {
    title: task.title,
    userRequest: task.userRequest,
    category: task.category,
    outputFormat: task.outputFormat,
    additionalInstructions: task.additionalInstructions,
    qualityThreshold: task.qualityThreshold,
  };
}

function buildAgentHooks(
  task: TaskWorkflow,
  agentKey: AgentRoleKey,
  stage: WorkflowStage,
  extraHooks?: AgentExecutionHooks
): AgentExecutionHooks {
  return {
    ...extraHooks,
    shouldAbort: () => extraHooks?.shouldAbort?.() || !taskStore.getTask(task.taskId),
    onRetry: (info) => {
      const delaySec = `${(info.delayMs / 1000).toFixed(1).replace(/\.0$/, '')}s`;
      const agent = task.agents[agentKey];
      agent.currentActivity = `${info.reason}. Automatic retry ${info.retryAttempt}/${info.maxRetries} in ${delaySec}...`;

      appendLog(task, {
        agentKey,
        agentName: agent.name,
        stage,
        eventType: 'info',
        message: `${agent.name} hit ${info.reason} — retrying automatically (${info.retryAttempt}/${info.maxRetries}) after ${delaySec} backoff.`,
        details: `Exponential backoff delay: ${info.delayMs}ms · Target model: ${info.nextModel}`,
      });
      saveIfExists(task);
      extraHooks?.onRetry?.(info);
    },
  };
}

export function createWorkflowTask(
  payload: CreateTaskPayload,
  owner?: { uid: string; email: string }
): TaskWorkflow {
  const now = new Date().toISOString();
  const taskId = `task_${crypto.randomBytes(4).toString('hex')}`;
  const qualityThreshold = Math.max(50, Math.min(95, Number(payload.qualityThreshold) || 80));
  const maxReviewCycles = Math.max(1, Math.min(3, Number(payload.maxReviewCycles) || 3));

  const workflow: TaskWorkflow = {
    taskId,
    ...(owner ? { ownerUid: owner.uid, ownerEmail: owner.email } : {}),
    title: payload.title.trim(),
    userRequest: payload.description.trim(),
    category: payload.category,
    outputFormat: payload.outputFormat,
    additionalInstructions: (payload.additionalInstructions ?? '').trim(),
    status: 'in_progress',
    currentStage: 'queued',
    turnCount: 0,
    currentReviewCycle: 0,
    maxReviewCycles,
    qualityThreshold,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    stopReason: null,
    failedAgent: null,
    agents: {
      planner: createInitialAgent('planner', 'Master Planner', 'Project Manager & Task Strategist', 'Research Specialist'),
      researcher: createInitialAgent('researcher', 'Research Specialist', 'Research Analyst', 'Creator Agent'),
      creator: createInitialAgent('creator', 'Creator Agent', 'Main Content Creator & Problem Solver', 'Critic / Reviewer'),
      reviewer: createInitialAgent('reviewer', 'Critic / Reviewer', 'Quality Assurance & Critical Reviewer', 'Final Approver'),
      approver: createInitialAgent('approver', 'Final Approver', 'Final Quality Controller & Synthesizer', null),
    },
    reviewHistory: [],
    activityLog: [],
    finalResult: null,
  };

  appendLog(workflow, {
    agentKey: 'user',
    agentName: 'User',
    stage: 'queued',
    eventType: 'info',
    message: `Submitted new task: "${workflow.title}"`,
    details: `Category: ${workflow.category} · Format: ${workflow.outputFormat} · Quality Threshold: ${workflow.qualityThreshold}/100 · Max Cycles: ${workflow.maxReviewCycles}`,
  });

  return taskStore.saveTask(workflow);
}

async function executePlannerStage(
  task: TaskWorkflow,
  extraHooks?: AgentExecutionHooks
): Promise<void> {
  const ctx = toTaskContext(task);
  task.currentStage = 'planning';
  task.turnCount += 1;
  task.failedAgent = null;

  const planner = task.agents.planner;
  planner.status = 'working';
  planner.assignedTask = 'Analyze user request, define subtasks, and assign specialized roles.';
  planner.currentActivity = 'Breaking down objectives and establishing success criteria...';
  planner.startedAt = planner.startedAt ?? new Date().toISOString();
  planner.errorMessage = null;
  planner.executionCount += 1;
  planner.input = {
    originalUserRequest: task.userRequest,
    category: task.category,
    outputFormat: task.outputFormat,
    qualityThreshold: task.qualityThreshold,
    workflowStage: 'planning',
  };

  appendLog(task, {
    agentKey: 'planner',
    agentName: planner.name,
    stage: 'planning',
    eventType: 'info',
    message: 'Master Planner started analyzing the task and designing the execution plan.',
  });
  saveIfExists(task);

  const output = await runPlannerAgent(
    ctx,
    buildAgentHooks(task, 'planner', 'planning', extraHooks)
  );
  if (!taskStore.getTask(task.taskId)) return;

  const normalizedOutput: PlannerOutput = {
    ...output,
    executionPlan: Array.isArray(output.executionPlan) ? output.executionPlan : [],
    subtasks: Array.isArray(output.subtasks) ? output.subtasks : [],
    successCriteria: Array.isArray(output.successCriteria) ? output.successCriteria : [],
    agentAssignments: {
      researcher:
        output.agentAssignments?.researcher?.trim() ||
        'Analyze domain patterns, supporting evidence, opportunities, risks, and gaps.',
      creator:
        output.agentAssignments?.creator?.trim() ||
        'Create a structured deliverable fulfilling all user requirements and success criteria.',
      reviewer:
        output.agentAssignments?.reviewer?.trim() ||
        'Audit the draft critically against user requirements, accuracy, and completeness.',
      approver:
        output.agentAssignments?.approver?.trim() ||
        'Synthesize the reviewed deliverable into the final approved output.',
    },
  };

  planner.output = normalizedOutput;
  planner.status = 'completed';
  planner.completedAt = new Date().toISOString();
  planner.currentActivity = 'Execution plan created and handed off.';
  planner.outputSummary = `${normalizedOutput.subtasks.length} subtasks · ${normalizedOutput.successCriteria.length} success criteria`;

  task.agents.researcher.assignedTask = normalizedOutput.agentAssignments.researcher;
  task.agents.creator.assignedTask = normalizedOutput.agentAssignments.creator;
  task.agents.reviewer.assignedTask = normalizedOutput.agentAssignments.reviewer;
  task.agents.approver.assignedTask = normalizedOutput.agentAssignments.approver;

  appendLog(task, {
    agentKey: 'planner',
    agentName: planner.name,
    stage: 'planning',
    eventType: 'handoff',
    message: 'Master Planner completed the execution plan and assigned tasks to downstream agents.',
    details: `Objective: ${normalizedOutput.mainObjective}`,
  });
  saveIfExists(task);
}

async function executeResearcherStage(
  task: TaskWorkflow,
  extraHooks?: AgentExecutionHooks
): Promise<void> {
  const ctx = toTaskContext(task);
  const plannerOutput = task.agents.planner.output;
  if (!plannerOutput) {
    throw new AgentExecutionError(
      'Master Planner output is missing; cannot run Research Specialist handoff.',
      'MISSING_UPSTREAM_OUTPUT',
      false
    );
  }

  task.currentStage = 'research';
  task.turnCount += 1;
  task.failedAgent = null;

  const researcher = task.agents.researcher;
  if (
    !researcher.assignedTask ||
    researcher.assignedTask === 'Awaiting upstream orchestration handoff'
  ) {
    researcher.assignedTask = plannerOutput.agentAssignments.researcher;
  }
  researcher.status = 'working';
  researcher.currentActivity = 'Synthesizing domain findings, opportunities, and risk factors...';
  researcher.startedAt = researcher.startedAt ?? new Date().toISOString();
  researcher.errorMessage = null;
  researcher.executionCount += 1;
  researcher.input = {
    originalUserRequest: task.userRequest,
    plannerTaskSummary: plannerOutput.taskSummary,
    plannerMainObjective: plannerOutput.mainObjective,
    assignedTask: researcher.assignedTask,
    executionPlanSteps: plannerOutput.executionPlan,
    subtasks: plannerOutput.subtasks,
    successCriteria: plannerOutput.successCriteria,
    workflowStage: 'research',
  };

  appendLog(task, {
    agentKey: 'researcher',
    agentName: researcher.name,
    stage: 'research',
    eventType: 'info',
    message: 'Research Specialist received Master Planner handoff and began domain analysis.',
  });
  saveIfExists(task);

  const output = await runResearcherAgent(
    ctx,
    plannerOutput,
    buildAgentHooks(task, 'researcher', 'research', extraHooks)
  );
  if (!taskStore.getTask(task.taskId)) return;

  researcher.output = output;
  researcher.status = 'completed';
  researcher.completedAt = new Date().toISOString();
  researcher.currentActivity = 'Research report delivered to Creator Agent.';
  researcher.outputSummary = `${output.importantFindings.length} findings · ${output.risksAndLimitations.length} risks identified`;

  appendLog(task, {
    agentKey: 'researcher',
    agentName: researcher.name,
    stage: 'research',
    eventType: 'handoff',
    message: 'Research Specialist completed findings and handed off context to Creator Agent.',
    details: output.researchReportSummary,
  });
  saveIfExists(task);
}

async function executeCreatorStage(
  task: TaskWorkflow,
  draftVersion: number,
  humanGuidance?: string,
  extraHooks?: AgentExecutionHooks
): Promise<void> {
  const ctx = toTaskContext(task);
  const plannerOutput = task.agents.planner.output;
  const researcherOutput = task.agents.researcher.output;
  if (!plannerOutput || !researcherOutput) {
    throw new AgentExecutionError(
      'Upstream Planner or Researcher output is missing; cannot run Creator Agent.',
      'MISSING_UPSTREAM_OUTPUT',
      false
    );
  }
  const previousDraft = task.agents.creator.output as CreatorOutput | null;
  const latestReview = task.agents.reviewer.output as ReviewerOutput | null;

  const stage: WorkflowStage = draftVersion > 1 ? 'improvement' : 'creation';
  task.currentStage = stage;
  task.turnCount += 1;
  task.failedAgent = null;

  const creator = task.agents.creator;
  creator.status = 'working';
  creator.currentActivity =
    draftVersion > 1
      ? `Revising Draft v${draftVersion} using Reviewer feedback...`
      : 'Drafting structured deliverable from Planner & Researcher context...';
  creator.startedAt = creator.startedAt ?? new Date().toISOString();
  creator.errorMessage = null;
  creator.executionCount += 1;
  creator.input = {
    originalUserRequest: task.userRequest,
    assignedTask: creator.assignedTask,
    draftVersion,
    researchSummary: researcherOutput.researchReportSummary,
    reviewerFeedback: latestReview
      ? {
          qualityScore: latestReview.qualityScore,
          improvementSuggestions: latestReview.improvementSuggestions,
          missingRequirements: latestReview.missingRequirements,
        }
      : null,
    humanGuidance: humanGuidance ?? null,
    workflowStage: stage,
  };

  appendLog(task, {
    agentKey: 'creator',
    agentName: creator.name,
    stage,
    eventType: 'info',
    message:
      draftVersion > 1
        ? `Creator Agent began Draft v${draftVersion} to address Reviewer improvement items.`
        : 'Creator Agent received research findings and began generating Draft v1.',
  });
  saveIfExists(task);

  const output = await runCreatorAgent({
    ctx,
    plannerOutput,
    researcherOutput,
    draftVersion,
    previousDraft,
    latestReview,
    humanGuidance,
    hooks: buildAgentHooks(task, 'creator', stage, extraHooks),
  });
  if (!taskStore.getTask(task.taskId)) return;

  creator.output = output;
  creator.status = 'completed';
  creator.completedAt = new Date().toISOString();
  creator.currentActivity = `Draft v${draftVersion} handed off to Critic / Reviewer.`;
  creator.outputSummary = `Draft v${draftVersion} · ${output.sections.length} sections · ${output.assumptionsMade.length} assumptions`;

  appendLog(task, {
    agentKey: 'creator',
    agentName: creator.name,
    stage,
    eventType: 'handoff',
    message: `Creator Agent submitted Draft v${draftVersion} to Critic / Reviewer for quality evaluation.`,
    details: output.executiveSummary,
  });
  saveIfExists(task);
}

async function executeReviewerStage(
  task: TaskWorkflow,
  extraHooks?: AgentExecutionHooks
): Promise<boolean> {
  const ctx = toTaskContext(task);
  const plannerOutput = task.agents.planner.output;
  const researcherOutput = task.agents.researcher.output;
  const creatorOutput = task.agents.creator.output;
  if (!plannerOutput || !researcherOutput || !creatorOutput) {
    throw new AgentExecutionError(
      'Upstream outputs are missing; cannot run Critic / Reviewer.',
      'MISSING_UPSTREAM_OUTPUT',
      false
    );
  }

  task.currentStage = 'review';
  task.currentReviewCycle += 1;
  task.turnCount += 1;
  task.failedAgent = null;

  const reviewer = task.agents.reviewer;
  reviewer.status = 'reviewing';
  reviewer.currentActivity = `Auditing Draft v${creatorOutput.draftVersion} (Cycle ${task.currentReviewCycle}/${task.maxReviewCycles})...`;
  reviewer.startedAt = reviewer.startedAt ?? new Date().toISOString();
  reviewer.errorMessage = null;
  reviewer.executionCount += 1;
  reviewer.input = {
    originalUserRequest: task.userRequest,
    draftVersion: creatorOutput.draftVersion,
    reviewCycle: task.currentReviewCycle,
    qualityThreshold: task.qualityThreshold,
    successCriteria: plannerOutput.successCriteria,
    workflowStage: 'review',
  };

  appendLog(task, {
    agentKey: 'reviewer',
    agentName: reviewer.name,
    stage: 'review',
    eventType: 'info',
    message: `Critic / Reviewer started Cycle ${task.currentReviewCycle} audit of Draft v${creatorOutput.draftVersion}.`,
  });
  saveIfExists(task);

  const output = await runReviewerAgent({
    ctx,
    plannerOutput,
    researcherOutput,
    creatorOutput,
    cycleNumber: task.currentReviewCycle,
    hooks: buildAgentHooks(task, 'reviewer', 'review', extraHooks),
  });
  if (!taskStore.getTask(task.taskId)) return false;

  reviewer.output = output;
  reviewer.completedAt = new Date().toISOString();
  reviewer.outputSummary = `Score ${output.qualityScore}/100 · ${output.approved ? 'Approved' : 'Rejected for revision'}`;

  task.reviewHistory.push({
    cycleNumber: task.currentReviewCycle,
    timestamp: new Date().toISOString(),
    draftVersion: creatorOutput.draftVersion,
    creatorSummary: creatorOutput.executiveSummary,
    qualityScore: output.qualityScore,
    approved: output.approved,
    feedbackSummary: output.overallAssessment,
    identifiedErrors: output.identifiedErrors,
    missingRequirements: output.missingRequirements,
    improvementSuggestions: output.improvementSuggestions,
    creatorOutputSnapshot: structuredClone(creatorOutput),
    reviewerOutputSnapshot: structuredClone(output),
  });

  if (output.approved) {
    reviewer.status = 'approved';
    reviewer.currentActivity = `Approved Draft v${creatorOutput.draftVersion} (${output.qualityScore}/100). Handed off to Final Approver.`;
    appendLog(task, {
      agentKey: 'reviewer',
      agentName: reviewer.name,
      stage: 'review',
      eventType: 'approved',
      message: `Critic / Reviewer approved Draft v${creatorOutput.draftVersion} with score ${output.qualityScore}/100 (Threshold: ${task.qualityThreshold}/100).`,
      details: output.overallAssessment,
    });
    saveIfExists(task);
    return true;
  }

  reviewer.status = 'rejected';
  reviewer.currentActivity = `Rejected Draft v${creatorOutput.draftVersion} (${output.qualityScore}/100). Requested ${output.improvementSuggestions.length} improvements.`;
  appendLog(task, {
    agentKey: 'reviewer',
    agentName: reviewer.name,
    stage: 'review',
    eventType: 'rejected',
    message: `Critic / Reviewer rejected Draft v${creatorOutput.draftVersion} (${output.qualityScore}/100 < ${task.qualityThreshold}/100).`,
    details: output.improvementSuggestions.slice(0, 3).join(' · ') || output.overallAssessment,
  });
  saveIfExists(task);
  return false;
}

async function executeApproverStage(
  task: TaskWorkflow,
  forcedCompletionReason?: string | null,
  extraHooks?: AgentExecutionHooks
): Promise<void> {
  const ctx = toTaskContext(task);
  const plannerOutput = task.agents.planner.output;
  const researcherOutput = task.agents.researcher.output;
  const creatorOutput = task.agents.creator.output;
  if (!plannerOutput || !researcherOutput || !creatorOutput) {
    throw new AgentExecutionError(
      'Upstream outputs are missing; cannot run Final Approver.',
      'MISSING_UPSTREAM_OUTPUT',
      false
    );
  }

  task.currentStage = 'approval';
  task.turnCount += 1;
  task.failedAgent = null;

  const approver = task.agents.approver;
  approver.status = 'working';
  approver.currentActivity = 'Synthesizing final approved output and agent contributions...';
  approver.startedAt = approver.startedAt ?? new Date().toISOString();
  approver.errorMessage = null;
  approver.executionCount += 1;
  approver.input = {
    originalUserRequest: task.userRequest,
    latestDraftVersion: creatorOutput.draftVersion,
    reviewCyclesCompleted: task.reviewHistory.length,
    forcedCompletionReason: forcedCompletionReason ?? null,
    workflowStage: 'approval',
  };

  appendLog(task, {
    agentKey: 'approver',
    agentName: approver.name,
    stage: 'approval',
    eventType: 'info',
    message: 'Final Approver began synthesizing the verified deliverable.',
  });
  saveIfExists(task);

  const output = await runApproverAgent({
    ctx,
    plannerOutput,
    researcherOutput,
    creatorOutput,
    reviewHistory: task.reviewHistory,
    forcedCompletionReason,
    hooks: buildAgentHooks(task, 'approver', 'approval', extraHooks),
  });
  if (!taskStore.getTask(task.taskId)) return;

  approver.output = output;
  approver.status = 'approved';
  approver.completedAt = new Date().toISOString();
  approver.currentActivity = 'Final deliverable published.';
  approver.outputSummary = `Final Score ${output.finalQualityScore}/100 · ${output.finalAnswerSections.length} sections`;

  task.finalResult = output;
  task.completedAt = new Date().toISOString();
  if (output.completionStatus === 'completed_with_limitations') {
    task.status = 'completed_with_limitations';
    task.currentStage = 'completed_with_limitations';
    task.stopReason = forcedCompletionReason ?? output.completionExplanation;
  } else {
    task.status = 'completed';
    task.currentStage = 'completed';
    task.stopReason = null;
  }

  appendLog(task, {
    agentKey: 'approver',
    agentName: approver.name,
    stage: task.currentStage,
    eventType: 'completed',
    message: `Final Approver published the final output (${output.finalQualityScore}/100).`,
    details: output.completionExplanation,
  });
  saveIfExists(task);
}

function handleAgentFailure(task: TaskWorkflow, agentKey: AgentRoleKey, err: unknown): void {
  const message =
    err instanceof AgentExecutionError
      ? err.message
      : err instanceof Error
      ? err.message
      : 'Unknown execution error';

  const agent = task.agents[agentKey];
  agent.status = 'failed';
  agent.currentActivity = 'Execution halted due to an error.';
  agent.errorMessage = message;

  task.status = 'failed';
  task.currentStage = 'failed';
  task.failedAgent = agentKey;
  task.stopReason = `${agent.name} encountered an error: ${message}`;

  appendLog(task, {
    agentKey,
    agentName: agent.name,
    stage: 'failed',
    eventType: 'error',
    message: `${agent.name} failed during execution.`,
    details: message,
  });
  saveIfExists(task);
}

export async function runOrchestration(
  taskId: string,
  extraHooks?: AgentExecutionHooks
): Promise<void> {
  if (activeExecutions.has(taskId)) return;
  const initial = taskStore.getTask(taskId);
  if (!initial) return;

  activeExecutions.add(taskId);
  const task = structuredClone(initial);

  try {
    task.status = 'in_progress';
    saveIfExists(task);

    // 1. Master Planner (skipped if already completed and output preserved)
    if (!task.agents.planner.output) {
      try {
        await executePlannerStage(task, extraHooks);
      } catch (err) {
        handleAgentFailure(task, 'planner', err);
        return;
      }
    }

    // 2. Research Specialist (receives preserved Planner output)
    if (!task.agents.researcher.output) {
      try {
        await executeResearcherStage(task, extraHooks);
      } catch (err) {
        handleAgentFailure(task, 'researcher', err);
        return;
      }
    }

    // 3. Initial Creator Draft (v1)
    if (!task.agents.creator.output) {
      try {
        await executeCreatorStage(task, 1, undefined, extraHooks);
      } catch (err) {
        handleAgentFailure(task, 'creator', err);
        return;
      }
    }

    // 4 & 5. Review & Improvement Loop (Max 3 Cycles Safety Limit)
    let approved = false;
    const latestReview = task.reviewHistory[task.reviewHistory.length - 1];
    if (
      latestReview &&
      latestReview.draftVersion === task.agents.creator.output?.draftVersion &&
      latestReview.approved
    ) {
      approved = true;
    }

    while (!approved) {
      // If creator already produced a draft that hasn't been reviewed yet, review it
      const creatorDraftVer = task.agents.creator.output?.draftVersion ?? 1;
      const alreadyReviewedThisDraft = task.reviewHistory.some(
        (r) => r.draftVersion === creatorDraftVer
      );

      if (!alreadyReviewedThisDraft) {
        try {
          approved = await executeReviewerStage(task, extraHooks);
        } catch (err) {
          handleAgentFailure(task, 'reviewer', err);
          return;
        }
      } else {
        approved = Boolean(task.reviewHistory[task.reviewHistory.length - 1]?.approved);
      }

      if (approved) {
        break;
      }

      // Check Safety Cap
      if (task.currentReviewCycle >= task.maxReviewCycles) {
        const lastScore =
          task.reviewHistory[task.reviewHistory.length - 1]?.qualityScore ?? 0;
        const reason = `Safety limit reached: Completed ${task.currentReviewCycle}/${task.maxReviewCycles} review cycles with latest quality score ${lastScore}/100 (target: ${task.qualityThreshold}/100). Stopped to prevent infinite revision loops. Inspect outputs below to accept the best available result or guide one targeted retry.`;

        task.status = 'needs_human_review';
        task.currentStage = 'needs_human_review';
        task.stopReason = reason;

        appendLog(task, {
          agentKey: 'orchestrator',
          agentName: 'Central Orchestrator',
          stage: 'needs_human_review',
          eventType: 'intervention',
          message: `Loop stopped at maximum safety limit (${task.maxReviewCycles} review cycles). Human review available.`,
          details: reason,
        });
        saveIfExists(task);
        return;
      }

      // Trigger Creator Improvement Draft
      const nextVersion = (task.agents.creator.output?.draftVersion ?? 1) + 1;
      try {
        await executeCreatorStage(task, nextVersion, undefined, extraHooks);
      } catch (err) {
        handleAgentFailure(task, 'creator', err);
        return;
      }
    }

    // 6. Final Approver
    try {
      await executeApproverStage(task, null, extraHooks);
    } catch (err) {
      handleAgentFailure(task, 'approver', err);
      return;
    }
  } finally {
    activeExecutions.delete(taskId);
  }
}

export async function retryOrGuideTask(
  taskId: string,
  humanGuidance?: string
): Promise<TaskWorkflow | null> {
  if (activeExecutions.has(taskId)) {
    return taskStore.getTask(taskId) ?? null;
  }
  const existing = taskStore.getTask(taskId);
  if (!existing) return null;

  const task = structuredClone(existing);

  if (task.status === 'needs_human_review') {
    activeExecutions.add(taskId);
    try {
      task.status = 'in_progress';
      task.stopReason = null;
      // Allow 1 guided cycle beyond the cap upon explicit human intervention
      task.maxReviewCycles = Math.min(4, task.currentReviewCycle + 1);
      appendLog(task, {
        agentKey: 'user',
        agentName: 'Human Supervisor',
        stage: 'improvement',
        eventType: 'intervention',
        message: 'Human supervisor authorized 1 guided revision cycle.',
        details: humanGuidance || 'Refine draft to address Reviewer feedback.',
      });
      saveIfExists(task);

      const nextVersion = (task.agents.creator.output?.draftVersion ?? 1) + 1;
      try {
        await executeCreatorStage(task, nextVersion, humanGuidance);
      } catch (err) {
        handleAgentFailure(task, 'creator', err);
        return taskStore.getTask(taskId) ?? null;
      }

      try {
        await executeReviewerStage(task);
      } catch (err) {
        handleAgentFailure(task, 'reviewer', err);
        return taskStore.getTask(taskId) ?? null;
      }

      const lastReview = task.reviewHistory[task.reviewHistory.length - 1];
      const reason = lastReview?.approved
        ? null
        : `Guided revision scored ${lastReview?.qualityScore ?? 0}/100 (below ${task.qualityThreshold}/100 target). Finalized with best available output.`;

      try {
        await executeApproverStage(task, reason);
      } catch (err) {
        handleAgentFailure(task, 'approver', err);
      }
      return taskStore.getTask(taskId) ?? null;
    } finally {
      activeExecutions.delete(taskId);
    }
  }

  // Otherwise resume from failed stage while preserving completed upstream outputs
  const failedKey = task.failedAgent;
  if (failedKey && task.agents[failedKey]) {
    task.agents[failedKey].status = 'waiting';
    task.agents[failedKey].errorMessage = null;
    task.agents[failedKey].currentActivity = 'Queued for retry...';
  }
  task.status = 'in_progress';
  task.stopReason = null;
  task.failedAgent = null;
  appendLog(task, {
    agentKey: 'user',
    agentName: 'Human Supervisor',
    stage: task.currentStage,
    eventType: 'intervention',
    message: `Retrying workflow from ${failedKey ? task.agents[failedKey].name : 'failed step'} (completed upstream outputs preserved).`,
  });
  saveIfExists(task);

  void runOrchestration(taskId);
  return taskStore.getTask(taskId) ?? null;
}

export async function acceptBestAvailableResult(taskId: string): Promise<TaskWorkflow | null> {
  if (activeExecutions.has(taskId)) {
    return taskStore.getTask(taskId) ?? null;
  }
  const existing = taskStore.getTask(taskId);
  if (!existing) return null;

  if (!existing.agents.creator.output || !existing.agents.planner.output || !existing.agents.researcher.output) {
    return existing;
  }

  activeExecutions.add(taskId);
  const task = structuredClone(existing);
  try {
    task.status = 'in_progress';
    const lastScore = task.reviewHistory[task.reviewHistory.length - 1]?.qualityScore;
    const reason =
      existing.stopReason ||
      `Accepted best available Draft v${task.agents.creator.output?.draftVersion ?? 1}${
        typeof lastScore === 'number' ? ` (Quality Score: ${lastScore}/100)` : ''
      } via human review.`;

    appendLog(task, {
      agentKey: 'user',
      agentName: 'Human Supervisor',
      stage: 'approval',
      eventType: 'intervention',
      message: 'Human supervisor chose to accept the best available draft and synthesize final report.',
    });
    saveIfExists(task);

    try {
      await executeApproverStage(task, reason);
    } catch (err) {
      handleAgentFailure(task, 'approver', err);
    }
    return taskStore.getTask(taskId) ?? null;
  } finally {
    activeExecutions.delete(taskId);
  }
}
