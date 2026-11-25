import { CreateTaskPayload } from '../types/workflow';

export const QUICK_TASK_TEMPLATES: CreateTaskPayload[] = [
  {
    title: 'AI Study Assistant SaaS Product Launch Plan',
    description:
      'Design a product development and go-to-market launch plan for a lightweight AI study assistant targeted at engineering undergraduates, covering MVP scope, privacy safeguards, pricing tiers, and early campus adoption.',
    category: 'Technology',
    outputFormat: 'Detailed Report',
    additionalInstructions: 'Include clear milestone sequencing and key retention risks.',
    qualityThreshold: 80,
    maxReviewCycles: 3,
  },
  {
    title: 'Solar Microgrid Feasibility Study for Rural Clinics',
    description:
      'Prepare a structured research document analyzing the technical, financial, and maintenance considerations for deploying small solar-plus-battery microgrids across off-grid rural health clinics.',
    category: 'Research',
    outputFormat: 'Research Document',
    additionalInstructions: 'Highlight realistic failure modes, spare parts logistics, and community training needs.',
    qualityThreshold: 80,
    maxReviewCycles: 3,
  },
];
