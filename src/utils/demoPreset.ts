import { CreateTaskPayload } from '../types/workflow';

export const HACKATHON_DEMO_TASK: CreateTaskPayload = {
  title: 'Low-Budget Student Food Delivery Startup Business Plan',
  description:
    'Create a complete business plan for a low-budget student food delivery startup operating around university campuses. Include target student segments, lean courier model (bicycle/walking student couriers), unit economics with a small bootstrap budget under $5,000, local restaurant partnerships, campus marketing strategy, operational risks, and a 90-day launch roadmap.',
  category: 'Business',
  outputFormat: 'Business Plan',
  additionalInstructions:
    'Ensure unit economics are realistic for student pricing, avoid inflated financial projections, and clearly separate assumptions from operational steps.',
  qualityThreshold: 80,
  maxReviewCycles: 3,
  isDemo: true,
};

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
