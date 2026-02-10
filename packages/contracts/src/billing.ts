import { z } from 'zod';

import { TimestampsSchema } from './common';

export const PlanSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().max(100),
    slug: z.string().max(50),
    description: z.string().max(1000).nullable(),
    stripe_product_id: z.string(),
    is_active: z.boolean(),
    tier: z.enum(['free', 'starter', 'professional', 'enterprise']),
    monthly_price_cents: z.number().int().min(0),
    annual_price_cents: z.number().int().min(0),
    currency: z.string().length(3),
    features: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
        limit: z.number().int().nullable(),
        unlimited: z.boolean(),
      }),
    ),
  })
  .merge(TimestampsSchema);
export type Plan = z.infer<typeof PlanSchema>;

export const SubscriptionStatusSchema = z.enum([
  'active',
  'past_due',
  'canceled',
  'trialing',
  'paused',
  'incomplete',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    plan_id: z.string().uuid(),
    stripe_subscription_id: z.string(),
    stripe_customer_id: z.string(),
    status: SubscriptionStatusSchema,
    billing_period: z.enum(['monthly', 'annual']),
    current_period_start: z.string().datetime(),
    current_period_end: z.string().datetime(),
    cancel_at_period_end: z.boolean(),
    trial_end: z.string().datetime().nullable(),
  })
  .merge(TimestampsSchema);
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const CreateSubscriptionRequestSchema = z.object({
  plan_id: z.string().uuid(),
  billing_period: z.enum(['monthly', 'annual']),
  payment_method_id: z.string().optional(),
});
export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;

export const UpdateSubscriptionRequestSchema = z.object({
  plan_id: z.string().uuid().optional(),
  billing_period: z.enum(['monthly', 'annual']).optional(),
  cancel_at_period_end: z.boolean().optional(),
});
export type UpdateSubscriptionRequest = z.infer<typeof UpdateSubscriptionRequestSchema>;

export const UsageMeterSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    meter_type: z.enum(['job_posts', 'active_candidates', 'messages_sent', 'video_minutes', 'api_calls']),
    current_value: z.number().int().min(0),
    limit_value: z.number().int().min(0).nullable(),
    period_start: z.string().datetime(),
    period_end: z.string().datetime(),
  })
  .merge(TimestampsSchema);
export type UsageMeter = z.infer<typeof UsageMeterSchema>;

export const EntitlementSchema = z.object({
  feature_key: z.string(),
  enabled: z.boolean(),
  limit: z.number().int().nullable(),
  current_usage: z.number().int().nullable(),
});
export type Entitlement = z.infer<typeof EntitlementSchema>;

export const BillingUsageResponseSchema = z.object({
  subscription: SubscriptionSchema.nullable(),
  entitlements: z.array(EntitlementSchema),
  usage_meters: z.array(UsageMeterSchema),
});
export type BillingUsageResponse = z.infer<typeof BillingUsageResponseSchema>;
