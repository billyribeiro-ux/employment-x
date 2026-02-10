import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'create', 'Scorecard');

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { select: { organizationId: true } } },
    });

    if (!application) {
      throw new AppError('NOT_FOUND', 'Application not found');
    }

    if (ctx.role !== 'admin' && ctx.org_id !== application.job.organizationId) {
      throw new AppError('FORBIDDEN', 'Not authorized to score this application');
    }

    const existing = await prisma.scorecard.findUnique({
      where: { applicationId_reviewerId: { applicationId, reviewerId: ctx.userId } },
    });
    if (existing) {
      throw new AppError('CONFLICT', 'You have already submitted a scorecard for this application');
    }

    const body = await req.json();
    const { overall_rating, criteria, recommendation, notes } = body;

    if (overall_rating == null || !criteria) {
      throw new AppError('VALIDATION_ERROR', 'overall_rating and criteria are required');
    }

    if (typeof overall_rating !== 'number' || overall_rating < 1 || overall_rating > 5) {
      throw new AppError('VALIDATION_ERROR', 'overall_rating must be between 1 and 5');
    }

    const scorecard = await prisma.scorecard.create({
      data: {
        applicationId,
        reviewerId: ctx.userId,
        overallRating: overall_rating,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        criteria: criteria as any,
        recommendation: recommendation ?? null,
        notes: notes ?? null,
      },
    });

    await writeAuditEvent(
      { tenantId: application.job.organizationId, userId: ctx.userId, role: ctx.role },
      {
        action: 'interview.feedback',
        resourceType: 'scorecard',
        resourceId: scorecard.id,
        metadata: { application_id: applicationId, overall_rating },
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, {
      id: scorecard.id,
      application_id: scorecard.applicationId,
      reviewer_id: scorecard.reviewerId,
      overall_rating: scorecard.overallRating,
      criteria: scorecard.criteria,
      recommendation: scorecard.recommendation,
      notes: scorecard.notes,
      submitted_at: scorecard.submittedAt.toISOString(),
    }, 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'read', 'Scorecard');

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { select: { organizationId: true } } },
    });

    if (!application) {
      throw new AppError('NOT_FOUND', 'Application not found');
    }

    if (ctx.role !== 'admin' && ctx.org_id !== application.job.organizationId) {
      throw new AppError('FORBIDDEN', 'Not authorized to view scorecards for this application');
    }

    const scorecards = await prisma.scorecard.findMany({
      where: { applicationId },
      include: { reviewer: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { submittedAt: 'desc' },
    });

    return successResponse(req, {
      data: scorecards.map((s) => ({
        id: s.id,
        reviewer: { id: s.reviewer.id, first_name: s.reviewer.firstName, last_name: s.reviewer.lastName },
        overall_rating: s.overallRating,
        criteria: s.criteria,
        recommendation: s.recommendation,
        notes: s.notes,
        submitted_at: s.submittedAt.toISOString(),
      })),
      average_rating: scorecards.length > 0
        ? Math.round((scorecards.reduce((sum, s) => sum + s.overallRating, 0) / scorecards.length) * 10) / 10
        : null,
      total_reviews: scorecards.length,
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
