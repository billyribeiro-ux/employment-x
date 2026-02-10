import { prisma } from './db';
import { AppError } from './errors';

export const PLAN_LIMITS = {
  free: { jobs: 3, members: 2, meetings_per_month: 10, storage_mb: 100 },
  starter: { jobs: 25, members: 10, meetings_per_month: 100, storage_mb: 1000 },
  professional: { jobs: 100, members: 50, meetings_per_month: 500, storage_mb: 5000 },
  enterprise: { jobs: -1, members: -1, meetings_per_month: -1, storage_mb: -1 },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export async function getOrCreateSubscription(organizationId: string) {
  let sub = await prisma.subscription.findFirst({ where: { organizationId } });
  if (!sub) {
    sub = await prisma.subscription.create({
      data: { organizationId, plan: 'free', status: 'active' },
    });
  }
  return sub;
}

export async function getSubscriptionWithLimits(organizationId: string) {
  const sub = await getOrCreateSubscription(organizationId);
  const plan = sub.plan as PlanName;
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  const [jobCount, memberCount] = await Promise.all([
    prisma.job.count({ where: { organizationId, status: { in: ['draft', 'published'] } } }),
    prisma.orgMembership.count({ where: { organizationId } }),
  ]);

  return {
    subscription: {
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      stripe_customer_id: sub.stripeCustomerId,
      stripe_subscription_id: sub.stripeSubscriptionId,
      current_period_start: sub.currentPeriodStart?.toISOString() ?? null,
      current_period_end: sub.currentPeriodEnd?.toISOString() ?? null,
      cancel_at_period_end: sub.cancelAtPeriodEnd,
    },
    limits,
    usage: {
      jobs: jobCount,
      members: memberCount,
    },
  };
}

export async function changePlan(organizationId: string, newPlan: PlanName) {
  const sub = await getOrCreateSubscription(organizationId);

  if (sub.plan === newPlan) {
    throw new AppError('CONFLICT', `Already on the ${newPlan} plan`);
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { plan: newPlan },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: newPlan },
  });

  return updated;
}

export function checkPlanLimit(
  plan: PlanName,
  resource: keyof (typeof PLAN_LIMITS)['free'],
  currentUsage: number,
): void {
  const limit = PLAN_LIMITS[plan]?.[resource] ?? 0;
  if (limit !== -1 && currentUsage >= limit) {
    throw new AppError('FORBIDDEN', `Plan limit reached for ${resource}. Upgrade to increase your limit.`, {
      plan,
      resource,
      limit,
      current: currentUsage,
    });
  }
}
