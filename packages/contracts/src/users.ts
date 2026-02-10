import { z } from 'zod';

import { TimestampsSchema } from './common';

export const UserRoleSchema = z.enum(['candidate', 'employer', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    first_name: z.string(),
    last_name: z.string(),
    role: UserRoleSchema,
    organization_id: z.string().uuid().nullable(),
    email_verified: z.boolean(),
    mfa_enabled: z.boolean(),
    avatar_url: z.string().url().nullable(),
  })
  .merge(TimestampsSchema);
export type User = z.infer<typeof UserSchema>;
