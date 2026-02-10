import { z } from 'zod';

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      per_page: z.number(),
      total_count: z.number(),
      total_pages: z.number(),
    }),
  });

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    request_id: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});
export type IdParam = z.infer<typeof IdParamSchema>;

export const TimestampsSchema = z.object({
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const TenantScopedSchema = z.object({
  organization_id: z.string().uuid(),
});

export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');
export type SortOrder = z.infer<typeof SortOrderSchema>;

export const IdempotencyHeaderSchema = z.object({
  'idempotency-key': z.string().uuid(),
});
