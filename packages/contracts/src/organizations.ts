import { z } from 'zod';

import { TimestampsSchema } from './common';

export const OrganizationSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(100),
    domain: z.string().max(255).nullable(),
    logo_url: z.string().url().nullable(),
    plan_id: z.string().uuid().nullable(),
  })
  .merge(TimestampsSchema);
export type Organization = z.infer<typeof OrganizationSchema>;

export const OrgMemberRoleSchema = z.enum(['owner', 'admin', 'recruiter', 'hiring_manager', 'viewer']);
export type OrgMemberRole = z.infer<typeof OrgMemberRoleSchema>;

export const OrganizationMemberSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    user_id: z.string().uuid(),
    role: OrgMemberRoleSchema,
  })
  .merge(TimestampsSchema);
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;
