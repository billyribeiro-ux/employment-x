import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { withSpan, spanAttributes } from '@/lib/server/tracing';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withSpan('POST /v1/jobs/[id]/apply', spanAttributes(req), async () => {
  try {
    const { id: jobId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'create', 'Application');

    if (ctx.role !== 'candidate') {
      throw new AppError('FORBIDDEN', 'Only candidates can apply to jobs');
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'published') {
      throw new AppError('NOT_FOUND', 'Job not found or not accepting applications');
    }

    const existing = await prisma.application.findUnique({
      where: { jobId_candidateId: { jobId, candidateId: ctx.userId } },
    });
    if (existing) {
      throw new AppError('CONFLICT', 'You have already applied to this job');
    }

    const body = await req.json().catch(() => ({}));

    const application = await prisma.application.create({
      data: {
        jobId,
        candidateId: ctx.userId,
        coverLetter: body.cover_letter ?? null,
        resumeUrl: body.resume_url ?? null,
      },
    });

    await writeAuditEvent(
      { tenantId: job.organizationId, userId: ctx.userId, role: ctx.role },
      {
        action: 'application.create',
        resourceType: 'application',
        resourceId: application.id,
        metadata: { job_id: jobId },
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, {
      id: application.id,
      job_id: application.jobId,
      candidate_id: application.candidateId,
      stage: application.stage,
      created_at: application.createdAt.toISOString(),
    }, 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}
