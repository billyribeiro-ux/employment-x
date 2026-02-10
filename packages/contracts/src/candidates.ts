import { z } from 'zod';

import { TimestampsSchema } from './common';

export const CandidateProfileSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    headline: z.string().max(255).nullable(),
    summary: z.string().max(5000).nullable(),
    location: z.string().max(255).nullable(),
    phone: z.string().max(50).nullable(),
    linkedin_url: z.string().url().nullable(),
    portfolio_url: z.string().url().nullable(),
    avatar_url: z.string().url().nullable(),
    years_experience: z.number().int().min(0).nullable(),
    desired_salary_min: z.number().int().min(0).nullable(),
    desired_salary_max: z.number().int().min(0).nullable(),
    desired_salary_currency: z.string().length(3).nullable(),
    open_to_remote: z.boolean(),
    open_to_relocation: z.boolean(),
    availability_status: z.enum(['actively_looking', 'open', 'not_looking']),
    version: z.number().int(),
  })
  .merge(TimestampsSchema);
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;

export const CreateCandidateRequestSchema = z.object({
  headline: z.string().max(255).optional(),
  summary: z.string().max(5000).optional(),
  location: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  linkedin_url: z.string().url().optional(),
  portfolio_url: z.string().url().optional(),
  years_experience: z.number().int().min(0).optional(),
  desired_salary_min: z.number().int().min(0).optional(),
  desired_salary_max: z.number().int().min(0).optional(),
  desired_salary_currency: z.string().length(3).optional(),
  open_to_remote: z.boolean().default(false),
  open_to_relocation: z.boolean().default(false),
  availability_status: z.enum(['actively_looking', 'open', 'not_looking']).default('open'),
  skills: z.array(z.string().max(100)).max(50).optional(),
});
export type CreateCandidateRequest = z.infer<typeof CreateCandidateRequestSchema>;

export const UpdateCandidateRequestSchema = CreateCandidateRequestSchema.partial();
export type UpdateCandidateRequest = z.infer<typeof UpdateCandidateRequestSchema>;

export const CandidateSkillSchema = z.object({
  id: z.string().uuid(),
  candidate_profile_id: z.string().uuid(),
  name: z.string().max(100),
  years_experience: z.number().int().min(0).nullable(),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).nullable(),
});
export type CandidateSkill = z.infer<typeof CandidateSkillSchema>;

export const CandidateDocumentSchema = z
  .object({
    id: z.string().uuid(),
    candidate_profile_id: z.string().uuid(),
    document_type: z.enum(['resume', 'cover_letter', 'portfolio', 'certification', 'other']),
    filename: z.string().max(255),
    mime_type: z.string().max(100),
    size_bytes: z.number().int(),
    storage_key: z.string(),
    upload_url: z.string().url().optional(),
    download_url: z.string().url().optional(),
  })
  .merge(TimestampsSchema);
export type CandidateDocument = z.infer<typeof CandidateDocumentSchema>;

export const CandidateSearchParamsSchema = z.object({
  query: z.string().max(500).optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
  min_experience: z.number().int().min(0).optional(),
  max_experience: z.number().int().min(0).optional(),
  availability_status: z.enum(['actively_looking', 'open', 'not_looking']).optional(),
  open_to_remote: z.boolean().optional(),
  sort_by: z.enum(['relevance', 'experience', 'updated_at']).default('relevance'),
});
export type CandidateSearchParams = z.infer<typeof CandidateSearchParamsSchema>;
