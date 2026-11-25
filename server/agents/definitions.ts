import { Schema, Type } from '@google/genai';
import {
  ApproverOutput,
  CreatorOutput,
  OutputFormat,
  PlannerOutput,
  ResearcherOutput,
  ReviewCycleRecord,
  ReviewerOutput,
  TaskCategory,
} from '../../src/types/workflow.ts';
import { generateStructuredJson } from '../services/geminiClient.ts';

const PLANNER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    taskSummary: { type: Type.STRING },
    mainObjective: { type: Type.STRING },
    executionPlan: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    subtasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          assignedTo: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['id', 'title', 'assignedTo', 'description'],
      },
    },
    agentAssignments: {
      type: Type.OBJECT,
      properties: {
        researcher: { type: Type.STRING },
        creator: { type: Type.STRING },
        reviewer: { type: Type.STRING },
        approver: { type: Type.STRING },
      },
      required: ['researcher', 'creator', 'reviewer', 'approver'],
    },
    successCriteria: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'taskSummary',
    'mainObjective',
    'executionPlan',
    'subtasks',
    'agentAssignments',
    'successCriteria',
  ],
};

const RESEARCHER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    methodologyNote: { type: Type.STRING },
    researchReportSummary: { type: Type.STRING },
    importantFindings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          insight: { type: Type.STRING },
          confidence: { type: Type.STRING },
        },
        required: ['topic', 'insight', 'confidence'],
      },
    },
    supportingEvidenceAndAssumptions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    opportunities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    risksAndLimitations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    informationGaps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'methodologyNote',
    'researchReportSummary',
    'importantFindings',
    'supportingEvidenceAndAssumptions',
    'opportunities',
    'risksAndLimitations',
    'informationGaps',
  ],
};

const CREATOR_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    draftVersion: { type: Type.INTEGER },
    title: { type: Type.STRING },
    executiveSummary: { type: Type.STRING },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ['heading', 'content'],
      },
    },
    decisionsExplanation: { type: Type.STRING },
    assumptionsMade: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    addressedFeedback: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'draftVersion',
    'title',
    'executiveSummary',
    'sections',
    'decisionsExplanation',
    'assumptionsMade',
    'addressedFeedback',
  ],
};

const REVIEWER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    qualityScore: { type: Type.INTEGER },
    approved: { type: Type.BOOLEAN },
    overallAssessment: { type: Type.STRING },
    rubricBreakdown: {
      type: Type.OBJECT,
      properties: {
        completeness: { type: Type.INTEGER },
        accuracy: { type: Type.INTEGER },
        clarity: { type: Type.INTEGER },
        relevance: { type: Type.INTEGER },
      },
      required: ['completeness', 'accuracy', 'clarity', 'relevance'],
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    identifiedErrors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    missingRequirements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    logicalInconsistencies: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    improvementSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'qualityScore',
    'approved',
    'overallAssessment',
    'rubricBreakdown',
    'strengths',
    'identifiedErrors',
    'missingRequirements',
    'logicalInconsistencies',
    'improvementSuggestions',
  ],
};

const APPROVER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    executiveSummary: { type: Type.STRING },
    finalAnswerSections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ['heading', 'content'],
      },
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    limitations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    agentContributions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agentName: { type: Type.STRING },
          role: { type: Type.STRING },
          contributionSummary: { type: Type.STRING },
        },
        required: ['agentName', 'role', 'contributionSummary'],
      },
    },
    finalQualityScore: { type: Type.INTEGER },
    completionStatus: { type: Type.STRING },
    completionExplanation: { type: Type.STRING },
  },
  required: [
    'title',
    'executiveSummary',
    'finalAnswerSections',
    'recommendations',
    'limitations',
    'agentContributions',
    'finalQualityScore',
    'completionStatus',
    'completionExplanation',
  ],
};

export interface TaskContextInput {
  title: string;
  userRequest: string;
  category: TaskCategory;
  outputFormat: OutputFormat;
  additionalInstructions: string;
  qualityThreshold: number;
}

export async function runPlannerAgent(ctx: TaskContextInput): Promise<PlannerOutput> {
  const systemInstruction = `You are AGENT 1: MASTER PLANNER (Project Manager and Task Strategist) inside AgentFlow AI.
Your job is to analyze the user's request, identify the primary objective, break the complex task into concrete subtasks, define clear responsibilities for the Research Specialist, Creator Agent, Critic/Reviewer Agent, and Final Approver, and establish measurable success criteria.
Be crisp, structured, and realistic. Never invent fake deadlines or resources.`;

  const prompt = `Analyze this incoming task and produce a structured execution plan.
Title: ${ctx.title}
Category: ${ctx.category}
Desired Output Format: ${ctx.outputFormat}
Quality Threshold Required: ${ctx.qualityThreshold}/100
User Request:
${ctx.userRequest}

Additional Instructions:
${ctx.additionalInstructions || 'None provided.'}`;

  return generateStructuredJson<PlannerOutput>({
    agentName: 'Master Planner',
    systemInstruction,
    prompt,
    responseSchema: PLANNER_SCHEMA,
  });
}

export async function runResearcherAgent(
  ctx: TaskContextInput,
  plannerOutput: PlannerOutput
): Promise<ResearcherOutput> {
  const systemInstruction = `You are AGENT 2: RESEARCH SPECIALIST (Research Analyst) inside AgentFlow AI.
Your job is to analyze the assigned task and planner breakdown, surface domain knowledge, practical constraints, market/technical patterns, opportunities, risks, and information gaps for the Creator Agent.
CRITICAL HONESTY RULE: You do NOT have live web browsing or external search connected in this environment. NEVER fabricate URLs, fake citations, fake survey statistics, or claim you browsed live websites. Clearly state in methodologyNote that this is analytical synthesis from domain knowledge without live web browsing, and set confidence to "High", "Medium", or "Analytical Assumption" accurately.`;

  const prompt = `Perform structured analytical research for this task based on the Planner's assignment.
Original User Request (${ctx.title}):
${ctx.userRequest}

Category: ${ctx.category} | Output Format: ${ctx.outputFormat}
Planner's Assignment for You:
${plannerOutput.agentAssignments.researcher}

Planner's Success Criteria:
${plannerOutput.successCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  return generateStructuredJson<ResearcherOutput>({
    agentName: 'Research Specialist',
    systemInstruction,
    prompt,
    responseSchema: RESEARCHER_SCHEMA,
  });
}

export async function runCreatorAgent(params: {
  ctx: TaskContextInput;
  plannerOutput: PlannerOutput;
  researcherOutput: ResearcherOutput;
  draftVersion: number;
  previousDraft?: CreatorOutput | null;
  latestReview?: ReviewerOutput | null;
  humanGuidance?: string;
}): Promise<CreatorOutput> {
  const isRevision = params.draftVersion > 1 && params.previousDraft && params.latestReview;

  const systemInstruction = `You are AGENT 3: CREATOR / EXECUTION AGENT (Main Content Creator and Problem Solver) inside AgentFlow AI.
Your job is to produce an actionable, thorough, well-organized deliverable in the requested format (${params.ctx.outputFormat}) using the Planner's execution plan and the Research Specialist's findings.
Write clear, concrete, substance-rich sections (avoid empty buzzwords). Explain key decisions and explicit assumptions made.
${
  isRevision
    ? 'You are currently in an IMPROVEMENT CYCLE. Carefully resolve EVERY identified error, missing requirement, logical inconsistency, and improvement suggestion raised by the Reviewer Agent while preserving strong parts of your prior draft. List each resolved point in addressedFeedback.'
    : 'This is Draft v1. Leave addressedFeedback as an empty array [].'
}`;

  const prompt = `Task Title: ${params.ctx.title}
Category: ${params.ctx.category}
Desired Output Format: ${params.ctx.outputFormat}
Target Draft Version: ${params.draftVersion}

Original User Request:
${params.ctx.userRequest}

Additional Instructions:
${params.ctx.additionalInstructions || 'None provided.'}

Planner Assignment & Success Criteria:
Assignment: ${params.plannerOutput.agentAssignments.creator}
Success Criteria:
${params.plannerOutput.successCriteria.map((c, i) => `- ${c}`).join('\n')}

Research Specialist Findings:
Summary: ${params.researcherOutput.researchReportSummary}
Key Findings:
${params.researcherOutput.importantFindings.map((f) => `- [${f.confidence}] ${f.topic}: ${f.insight}`).join('\n')}
Opportunities: ${params.researcherOutput.opportunities.join('; ')}
Risks & Limitations: ${params.researcherOutput.risksAndLimitations.join('; ')}
Information Gaps: ${params.researcherOutput.informationGaps.join('; ')}
${
  isRevision
    ? `
--- REVISION FEEDBACK FROM REVIEWER (MUST ADDRESS) ---
Previous Score: ${params.latestReview!.qualityScore}/100 (Required: ${params.ctx.qualityThreshold}/100)
Overall Assessment: ${params.latestReview!.overallAssessment}
Identified Errors: ${params.latestReview!.identifiedErrors.join(' | ') || 'None'}
Missing Requirements: ${params.latestReview!.missingRequirements.join(' | ') || 'None'}
Logical Inconsistencies: ${params.latestReview!.logicalInconsistencies.join(' | ') || 'None'}
Improvement Suggestions: ${params.latestReview!.improvementSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}
${params.humanGuidance ? `\nHuman Supervisor Guidance:\n${params.humanGuidance}` : ''}

Previous Draft Summary & Sections to Improve:
${JSON.stringify(params.previousDraft!.sections)}
`
    : ''
}`;

  const result = await generateStructuredJson<CreatorOutput>({
    agentName: 'Creator Agent',
    systemInstruction,
    prompt,
    responseSchema: CREATOR_SCHEMA,
  });

  return {
    ...result,
    draftVersion: params.draftVersion,
  };
}

export async function runReviewerAgent(params: {
  ctx: TaskContextInput;
  plannerOutput: PlannerOutput;
  researcherOutput: ResearcherOutput;
  creatorOutput: CreatorOutput;
  cycleNumber: number;
}): Promise<ReviewerOutput> {
  const systemInstruction = `You are AGENT 4: CRITIC / REVIEWER AGENT (Quality Assurance and Critical Reviewer) inside AgentFlow AI.
Your job is to rigorously audit the Creator Agent's draft against the Original User Request, Planner's Success Criteria, and Research Specialist's Risks/Gaps.
CRITICAL REVIEW RULES:
1. Do NOT rubber-stamp or automatically approve drafts. Be genuinely critical and objective.
2. Score strictly across 4 rubric criteria (0-25 points each, summing to qualityScore 0-100):
   - completeness (0-25): Are all parts of the user prompt, format requirements, and success criteria thoroughly covered?
   - accuracy (0-25): Are numbers, claims, and assumptions realistic, internally consistent, and free of fabricated citations?
   - clarity (0-25): Is the structure clear, executive-ready, specific, and free of generic fluff?
   - relevance (0-25): Does every section directly solve the user's stated problem and constraints?
3. If qualityScore < ${params.ctx.qualityThreshold}, you MUST set approved = false and provide specific, concrete improvementSuggestions so the Creator can fix them.
4. On Draft v1, look especially hard for missing financial/operational detail, unaddressed edge cases, or generic sections. Only score >= ${params.ctx.qualityThreshold} if the draft genuinely satisfies the criteria thoroughly.`;

  const prompt = `Review Draft v${params.creatorOutput.draftVersion} (Review Cycle ${params.cycleNumber}).
Configured Quality Threshold: ${params.ctx.qualityThreshold}/100.

Original User Request (${params.ctx.title}):
${params.ctx.userRequest}

Desired Output Format: ${params.ctx.outputFormat}
Additional Instructions: ${params.ctx.additionalInstructions || 'None'}

Planner Success Criteria:
${params.plannerOutput.successCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Research Risks & Information Gaps to Check Against:
Risks: ${params.researcherOutput.risksAndLimitations.join('; ')}
Gaps: ${params.researcherOutput.informationGaps.join('; ')}

Creator Draft v${params.creatorOutput.draftVersion}:
Title: ${params.creatorOutput.title}
Executive Summary: ${params.creatorOutput.executiveSummary}
Sections:
${params.creatorOutput.sections.map((s) => `## ${s.heading}\n${s.content}`).join('\n\n')}
Decisions Explanation: ${params.creatorOutput.decisionsExplanation}
Assumptions: ${params.creatorOutput.assumptionsMade.join('; ')}`;

  const result = await generateStructuredJson<ReviewerOutput>({
    agentName: 'Critic / Reviewer Agent',
    systemInstruction,
    prompt,
    responseSchema: REVIEWER_SCHEMA,
  });

  const clamp25 = (n: number) => Math.max(0, Math.min(25, Math.round(Number(n) || 0)));
  const breakdown = {
    completeness: clamp25(result.rubricBreakdown?.completeness),
    accuracy: clamp25(result.rubricBreakdown?.accuracy),
    clarity: clamp25(result.rubricBreakdown?.clarity),
    relevance: clamp25(result.rubricBreakdown?.relevance),
  };
  const computedSum =
    breakdown.completeness + breakdown.accuracy + breakdown.clarity + breakdown.relevance;
  const qualityScore = Math.max(
    0,
    Math.min(100, Math.round(Number(result.qualityScore) || computedSum))
  );

  return {
    ...result,
    rubricBreakdown: breakdown,
    qualityScore,
    approved: qualityScore >= params.ctx.qualityThreshold,
  };
}

export async function runApproverAgent(params: {
  ctx: TaskContextInput;
  plannerOutput: PlannerOutput;
  researcherOutput: ResearcherOutput;
  creatorOutput: CreatorOutput;
  reviewHistory: ReviewCycleRecord[];
  forcedCompletionReason?: string | null;
}): Promise<ApproverOutput> {
  const latestReview = params.reviewHistory[params.reviewHistory.length - 1];
  const score = latestReview ? latestReview.qualityScore : 75;
  const isLimited = Boolean(params.forcedCompletionReason) || score < params.ctx.qualityThreshold;

  const systemInstruction = `You are AGENT 5: FINAL APPROVER / SYNTHESIZER (Final Quality Controller) inside AgentFlow AI.
Your job is to verify whether review feedback was addressed, combine the best insights from Planner, Researcher, Creator, and Reviewer, eliminate repetition, and produce one polished, publication-ready final deliverable.
Clearly summarize each agent's contribution and note any remaining limitations honestly.`;

  const prompt = `Synthesize and finalize the deliverable for this task.
Task Title: ${params.ctx.title}
Category: ${params.ctx.category} | Output Format: ${params.ctx.outputFormat}
Quality Threshold: ${params.ctx.qualityThreshold}/100
Latest Review Score: ${score}/100
Completion Mode: ${isLimited ? 'completed_with_limitations' : 'approved'}
${params.forcedCompletionReason ? `Reason for early/forced completion: ${params.forcedCompletionReason}` : ''}

Original User Request:
${params.ctx.userRequest}

Planner Summary & Main Objective:
${params.plannerOutput.taskSummary} — ${params.plannerOutput.mainObjective}

Research Highlights & Risks:
${params.researcherOutput.researchReportSummary}
Risks: ${params.researcherOutput.risksAndLimitations.join('; ')}

Creator Latest Draft (v${params.creatorOutput.draftVersion}):
Executive Summary: ${params.creatorOutput.executiveSummary}
Sections:
${params.creatorOutput.sections.map((s) => `## ${s.heading}\n${s.content}`).join('\n\n')}

Review History (${params.reviewHistory.length} cycle(s)):
${params.reviewHistory
  .map(
    (r) =>
      `Cycle ${r.cycleNumber}: Score ${r.qualityScore}/100 (${r.approved ? 'Approved' : 'Rejected'}) — ${r.feedbackSummary}`
  )
  .join('\n')}`;

  const result = await generateStructuredJson<ApproverOutput>({
    agentName: 'Final Approver',
    systemInstruction,
    prompt,
    responseSchema: APPROVER_SCHEMA,
  });

  return {
    ...result,
    finalQualityScore: score,
    completionStatus: isLimited ? 'completed_with_limitations' : 'approved',
  };
}
