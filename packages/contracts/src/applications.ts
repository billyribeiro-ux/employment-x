import { z } from 'zod';

import { TimestampsSchema } from './common';

export const ApplicationStageSchema = z.enum([
  'applied',
  'screening',
  'phone_screen',
  'technical_interview',
  'onsite_interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
]);
export type ApplicationStage = z.infer<typeof ApplicationStageSchema>;

export const ApplicationSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    job_id: z.string().uuid(),
    candidate_id: z.string().uuid(),
    current_stage: ApplicationStageSchema,
    cover_letter: z.string().max(10000).nullable(),
    resume_document_id: z.string().uuid().nullable(),
    source: z.enum(['direct', 'referral', 'sourced', 'agency']).nullable(),
    applied_at: z.string().datetime(),
  })
  .merge(TimestampsSchema);
export type Application = z.infer<typeof ApplicationSchema>;

export const ApplyRequestSchema = z.object({
  cover_letter: z.string().max(10000).optional(),
  resume_document_id: z.string().uuid().optional(),
});
export type ApplyRequest = z.infer<typeof ApplyRequestSchema>;

export const StageTransitionRequestSchema = z.object({
  to_stage: ApplicationStageSchema,
  notes: z.string().max(5000).optional(),
});
export type StageTransitionRequest = z.infer<typeof StageTransitionRequestSchema>;

export const DecisionRecordSchema = z
  .object({
    id: z.string().uuid(),
    application_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    decision: z.enum(['hire', 'reject', 'hold']),
    decided_by: z.string().uuid(),
    rationale: z.string().max(5000),
    compensation_offered: z.string().max(1000).nullable(),
  })
  .merge(TimestampsSchema);
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;

export const CreateDecisionRequestSchema = z.object({
  decision: z.enum(['hire', 'reject', 'hold']),
  rationale: z.string().min(1).max(5000),
  compensation_offered: z.string().max(1000).optional(),
});
export type CreateDecisionRequest = z.infer<typeof CreateDecisionRequestSchema>;

export const ScorecardSchema = z
  .object({
    id: z.string().uuid(),
    application_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    interviewer_id: z.string().uuid(),
    stage: ApplicationStageSchema,
    overall_rating: z.number().int().min(1).max(5),
    recommendation: z.enum(['strong_hire', 'hire', 'no_hire', 'strong_no_hire']),
    strengths: z.string().max(5000).nullable(),
    weaknesses: z.string().max(5000).nullable(),
    notes: z.string().max(10000).nullable(),
    criteria_scores: z.array(
      z.object({
        criterion: z.string().max(255),
        score: z.number().int().min(1).max(5),
        comment: z.string().max(1000).nullable(),
      }),
    ),
  })
  .merge(TimestampsSchema);
export type Scorecard = z.infer<typeof ScorecardSchema>;
