import { z } from 'zod';

import { TimestampsSchema } from './common';

export const RegisterRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  role: z.enum(['candidate', 'employer']),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
});
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

export const MeResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.enum(['candidate', 'employer', 'admin']),
    organization_id: z.string().uuid().nullable(),
    email_verified: z.boolean(),
    mfa_enabled: z.boolean(),
  })
  .merge(TimestampsSchema);
export type MeResponse = z.infer<typeof MeResponseSchema>;
