import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';

const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ['screening', 'rejected', 'withdrawn'],
  screening: ['interview', 'rejected', 'withdrawn'],
  interview: ['offer', 'rejected', 'withdrawn'],
  offer: ['hired', 'rejected', 'withdrawn'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'update', 'Application');

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { select: { organizationId: true } } },
    });

    if (!application) {
      throw new AppError('NOT_FOUND', 'Application not found');
    }

    if (ctx.role !== 'admin' && ctx.org_id !== application.job.organizationId) {
      throw new AppError('FORBIDDEN', 'Not authorized to modify this application');
    }

    const body = await req.json();
    const { stage } = body;

    if (!stage) {
      throw new AppError('VALIDATION_ERROR', 'stage is required');
    }

    const allowed = VALID_TRANSITIONS[application.stage];
    if (!allowed || !allowed.includes(stage)) {
      throw new AppError('VALIDATION_ERROR', `Cannot transition from ${application.stage} to ${stage}`);
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        stage,
        ...(stage === 'rejected' ? { rejectedAt: new Date() } : {}),
        ...(stage === 'withdrawn' ? { withdrawnAt: new Date() } : {}),
      },
    });

    await writeAuditEvent(
      { tenantId: application.job.organizationId, userId: ctx.userId, role: ctx.role },
      {
        action: 'application.stage_change',
        resourceType: 'application',
        resourceId: applicationId,
        metadata: { from_stage: application.stage, to_stage: stage },
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, {
      id: updated.id,
      stage: updated.stage,
      updated_at: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
