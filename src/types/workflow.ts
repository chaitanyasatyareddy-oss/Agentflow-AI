export type AgentRoleKey = 'planner' | 'researcher' | 'creator' | 'reviewer' | 'approver';

export type AgentStatus =
  | 'waiting'
  | 'working'
  | 'completed'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'failed';

export type WorkflowStage =
  | 'queued'
  | 'planning'
  | 'research'
  | 'creation'
  | 'review'
  | 'improvement'
  | 'approval'
  | 'completed'
  | 'completed_with_limitations'
  | 'needs_human_review'
  | 'failed';

export type TaskStatus =
  | 'in_progress'
  | 'completed'
  | 'completed_with_limitations'
  | 'needs_human_review'
  | 'failed';

export type TaskCategory =
  | 'Business'
  | 'Research'
  | 'Education'
  | 'Technology'
  | 'Marketing'
  | 'Project Planning'
  | 'General';

export type OutputFormat =
  | 'Detailed Report'
  | 'Business Plan'
  | 'Presentation Content'
  | 'Research Document'
  | 'Step-by-Step Guide'
  | 'Custom Output';

export interface PlannerOutput {
  taskSummary: string;
  mainObjective: string;
  executionPlan: string[];
  subtasks: Array<{
    id: string;
    title: string;
    assignedTo: string;
    description: string;
  }>;
  agentAssignments: {
    researcher: string;
    creator: string;
    reviewer: string;
    approver: string;
  };
  successCriteria: string[];
}

export interface ResearcherOutput {
  methodologyNote: string;
  researchReportSummary: string;
  importantFindings: Array<{
    topic: string;
    insight: string;
    confidence: 'High' | 'Medium' | 'Analytical Assumption';
  }>;
  supportingEvidenceAndAssumptions: string[];
  opportunities: string[];
  risksAndLimitations: string[];
  informationGaps: string[];
}

export interface CreatorOutput {
  draftVersion: number;
  title: string;
  executiveSummary: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
  decisionsExplanation: string;
  assumptionsMade: string[];
  addressedFeedback: string[];
}

export interface ReviewerOutput {
  qualityScore: number;
  approved: boolean;
  overallAssessment: string;
  rubricBreakdown: {
    completeness: number;
    accuracy: number;
    clarity: number;
    relevance: number;
  };
  strengths: string[];
  identifiedErrors: string[];
  missingRequirements: string[];
  logicalInconsistencies: string[];
  improvementSuggestions: string[];
}

export interface ApproverOutput {
  title: string;
  executiveSummary: string;
  finalAnswerSections: Array<{
    heading: string;
    content: string;
  }>;
  recommendations: string[];
  limitations: string[];
  agentContributions: Array<{
    agentName: string;
    role: string;
    contributionSummary: string;
  }>;
  finalQualityScore: number;
  completionStatus: 'approved' | 'completed_with_limitations';
  completionExplanation: string;
}

export interface AgentRecord<TOutput = unknown> {
  key: AgentRoleKey;
  name: string;
  roleTitle: string;
  status: AgentStatus;
  assignedTask: string;
  currentActivity: string;
  input: Record<string, unknown> | null;
  output: TOutput | null;
  outputSummary: string;
  handoffTo: string | null;
  startedAt: string | null;
  completedAt: string | null;
  executionCount: number;
  errorMessage: string | null;
}

export interface ReviewCycleRecord {
  cycleNumber: number;
  timestamp: string;
  draftVersion: number;
  creatorSummary: string;
  qualityScore: number;
  approved: boolean;
  feedbackSummary: string;
  identifiedErrors: string[];
  missingRequirements: string[];
  improvementSuggestions: string[];
  creatorOutputSnapshot: CreatorOutput;
  reviewerOutputSnapshot: ReviewerOutput;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  agentKey: AgentRoleKey | 'orchestrator' | 'user';
  agentName: string;
  stage: WorkflowStage;
  eventType: 'info' | 'handoff' | 'completed' | 'rejected' | 'approved' | 'error' | 'intervention';
  message: string;
  details?: string;
}

export interface TaskWorkflow {
  taskId: string;
  ownerUid?: string;
  ownerEmail?: string;
  title: string;
  userRequest: string;
  category: TaskCategory;
  outputFormat: OutputFormat;
  additionalInstructions: string;
  isDemo?: boolean;
  status: TaskStatus;
  currentStage: WorkflowStage;
  turnCount: number;
  currentReviewCycle: number;
  maxReviewCycles: number;
  qualityThreshold: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  stopReason: string | null;
  failedAgent: AgentRoleKey | null;
  agents: {
    planner: AgentRecord<PlannerOutput>;
    researcher: AgentRecord<ResearcherOutput>;
    creator: AgentRecord<CreatorOutput>;
    reviewer: AgentRecord<ReviewerOutput>;
    approver: AgentRecord<ApproverOutput>;
  };
  reviewHistory: ReviewCycleRecord[];
  activityLog: ActivityLogEntry[];
  finalResult: ApproverOutput | null;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  category: TaskCategory;
  outputFormat: OutputFormat;
  additionalInstructions?: string;
  qualityThreshold?: number;
  maxReviewCycles?: number;
}

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  completedWithLimitations: number;
  inProgressTasks: number;
  failedOrNeedsReviewTasks: number;
  averageQualityScore: number | null;
  averageReviewIterations: number | null;
  totalAgentExecutions: number;
  completionRate: number | null;
  agentStats: Array<{
    key: AgentRoleKey;
    name: string;
    totalExecutions: number;
    completedCount: number;
    rejectedCount: number;
    failedCount: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
  }>;
  recentQualityTrend: Array<{
    taskId: string;
    title: string;
    score: number;
    cycles: number;
    createdAt: string;
  }>;
}
