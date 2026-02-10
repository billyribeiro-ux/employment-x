import { z } from 'zod';

import { TimestampsSchema } from './common';

export const JobStatusSchema = z.enum(['draft', 'published', 'paused', 'closed', 'archived']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobTypeSchema = z.enum(['full_time', 'part_time', 'contract', 'internship', 'temporary']);
export type JobType = z.infer<typeof JobTypeSchema>;

export const WorkLocationSchema = z.enum(['remote', 'hybrid', 'onsite']);
export type WorkLocation = z.infer<typeof WorkLocationSchema>;

export const JobPostSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    company_id: z.string().uuid(),
    title: z.string().min(1).max(255),
    description: z.string().max(50000),
    requirements: z.string().max(50000).nullable(),
    responsibilities: z.string().max(50000).nullable(),
    benefits: z.string().max(10000).nullable(),
    status: JobStatusSchema,
    job_type: JobTypeSchema,
    work_location: WorkLocationSchema,
    location: z.string().max(255).nullable(),
    salary_min: z.number().int().min(0).nullable(),
    salary_max: z.number().int().min(0).nullable(),
    salary_currency: z.string().length(3).nullable(),
    salary_period: z.enum(['hourly', 'monthly', 'yearly']).nullable(),
    experience_min: z.number().int().min(0).nullable(),
    experience_max: z.number().int().min(0).nullable(),
    department: z.string().max(255).nullable(),
    hiring_manager_id: z.string().uuid().nullable(),
    published_at: z.string().datetime().nullable(),
    closes_at: z.string().datetime().nullable(),
    version: z.number().int(),
  })
  .merge(TimestampsSchema);
export type JobPost = z.infer<typeof JobPostSchema>;

export const CreateJobRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(50000),
  requirements: z.string().max(50000).optional(),
  responsibilities: z.string().max(50000).optional(),
  benefits: z.string().max(10000).optional(),
  job_type: JobTypeSchema,
  work_location: WorkLocationSchema,
  location: z.string().max(255).optional(),
  salary_min: z.number().int().min(0).optional(),
  salary_max: z.number().int().min(0).optional(),
  salary_currency: z.string().length(3).optional(),
  salary_period: z.enum(['hourly', 'monthly', 'yearly']).optional(),
  experience_min: z.number().int().min(0).optional(),
  experience_max: z.number().int().min(0).optional(),
  department: z.string().max(255).optional(),
  hiring_manager_id: z.string().uuid().optional(),
  skills: z.array(z.string().max(100)).max(30).optional(),
});
export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

export const UpdateJobRequestSchema = CreateJobRequestSchema.partial().extend({
  status: JobStatusSchema.optional(),
});
export type UpdateJobRequest = z.infer<typeof UpdateJobRequestSchema>;

export const JobSearchParamsSchema = z.object({
  query: z.string().max(500).optional(),
  job_type: JobTypeSchema.optional(),
  work_location: WorkLocationSchema.optional(),
  location: z.string().optional(),
  salary_min: z.number().int().min(0).optional(),
  skills: z.array(z.string()).optional(),
  sort_by: z.enum(['relevance', 'salary', 'published_at']).default('relevance'),
});
export type JobSearchParams = z.infer<typeof JobSearchParamsSchema>;
