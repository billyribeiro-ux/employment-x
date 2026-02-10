import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { getSubscriptionWithLimits, changePlan, type PlanName } from '@/lib/server/billing';

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'read', 'Billing');

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    const result = await getSubscriptionWithLimits(ctx.org_id);
    return successResponse(req, result);
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'manage', 'Billing');

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    const body = await req.json();
    const { plan } = body;

    const validPlans: PlanName[] = ['free', 'starter', 'professional', 'enterprise'];
    if (!plan || !validPlans.includes(plan)) {
      throw new AppError('VALIDATION_ERROR', `plan must be one of: ${validPlans.join(', ')}`);
    }

    const updated = await changePlan(ctx.org_id, plan);

    await writeAuditEvent(
      { tenantId: ctx.org_id, userId: ctx.userId, role: ctx.role },
      {
        action: 'billing.plan_change',
        resourceType: 'subscription',
        resourceId: updated.id,
        metadata: { new_plan: plan },
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, { id: updated.id, plan: updated.plan, status: updated.status });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
