import { z } from 'zod';

import { TimestampsSchema } from './common';

export const CompanySchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    name: z.string().min(1).max(255),
    description: z.string().max(5000).nullable(),
    website: z.string().url().nullable(),
    industry: z.string().max(100).nullable(),
    company_size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+']).nullable(),
    logo_url: z.string().url().nullable(),
    headquarters_location: z.string().max(255).nullable(),
    founded_year: z.number().int().nullable(),
  })
  .merge(TimestampsSchema);
export type Company = z.infer<typeof CompanySchema>;

export const CreateCompanyRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  company_size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+']).optional(),
  headquarters_location: z.string().max(255).optional(),
  founded_year: z.number().int().optional(),
});
export type CreateCompanyRequest = z.infer<typeof CreateCompanyRequestSchema>;

export const UpdateCompanyRequestSchema = CreateCompanyRequestSchema.partial();
export type UpdateCompanyRequest = z.infer<typeof UpdateCompanyRequestSchema>;

export const EmployerProfileSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    company_id: z.string().uuid(),
    title: z.string().max(255).nullable(),
    department: z.string().max(255).nullable(),
  })
  .merge(TimestampsSchema);
export type EmployerProfile = z.infer<typeof EmployerProfileSchema>;
