import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'update', 'Application');

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    const body = await req.json();
    const { application_ids, action, stage } = body;

    if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'application_ids must be a non-empty array');
    }

    if (application_ids.length > 50) {
      throw new AppError('VALIDATION_ERROR', 'Maximum 50 applications per bulk action');
    }

    if (!action) {
      throw new AppError('VALIDATION_ERROR', 'action is required (move_stage, reject, withdraw)');
    }

    const applications = await prisma.application.findMany({
      where: { id: { in: application_ids } },
      include: { job: { select: { organizationId: true } } },
    });

    const authorized = applications.filter((a) => a.job.organizationId === ctx.org_id);
    if (authorized.length === 0) {
      throw new AppError('NOT_FOUND', 'No authorized applications found');
    }

    let updated = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const app of authorized) {
      try {
        switch (action) {
          case 'move_stage':
            if (!stage) throw new Error('stage is required for move_stage action');
            await prisma.application.update({
              where: { id: app.id },
              data: { stage },
            });
            break;
          case 'reject':
            await prisma.application.update({
              where: { id: app.id },
              data: { stage: 'rejected', rejectedAt: new Date() },
            });
            break;
          case 'withdraw':
            await prisma.application.update({
              where: { id: app.id },
              data: { stage: 'withdrawn', withdrawnAt: new Date() },
            });
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        updated++;
      } catch (e) {
        errors.push({ id: app.id, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    await writeAuditEvent(
      { tenantId: ctx.org_id, userId: ctx.userId, role: ctx.role },
      {
        action: 'application.bulk_action',
        resourceType: 'application',
        metadata: { action, count: updated, errors: errors.length },
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, {
      updated,
      errors,
      total_requested: application_ids.length,
      total_authorized: authorized.length,
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
