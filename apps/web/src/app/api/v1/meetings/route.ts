import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { checkUserRateLimit, RATE_LIMITS } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    checkUserRateLimit(ctx.userId, 'scheduling:create', RATE_LIMITS.scheduling);

    const body = await req.json();
    const { requestee_id, title, proposed_at, duration_minutes, description, location, application_id } = body;

    if (!requestee_id || !title || !proposed_at) {
      throw new AppError('VALIDATION_ERROR', 'Missing required fields: requestee_id, title, proposed_at');
    }

    if (requestee_id === ctx.userId) {
      throw new AppError('VALIDATION_ERROR', 'Cannot schedule a meeting with yourself');
    }

    const proposedDate = new Date(proposed_at);
    if (proposedDate <= new Date()) {
      throw new AppError('VALIDATION_ERROR', 'Proposed time must be in the future');
    }

    const meeting = await prisma.meetingRequest.create({
      data: {
        tenantId: ctx.tenantId,
        requesterId: ctx.userId,
        requesteeId: requestee_id,
        applicationId: application_id ?? null,
        title,
        description: description ?? null,
        proposedAt: proposedDate,
        durationMinutes: duration_minutes ?? 30,
        location: location ?? null,
      },
    });

    await writeAuditEvent(
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
      {
        action: 'meeting.create',
        resourceType: 'meeting_request',
        resourceId: meeting.id,
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, mapMeetingResponse(meeting), 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const role = url.searchParams.get('role');

    const where: Record<string, unknown> = {};
    if (role === 'requester') {
      where['requesterId'] = ctx.userId;
    } else if (role === 'requestee') {
      where['requesteeId'] = ctx.userId;
    } else {
      where['OR'] = [{ requesterId: ctx.userId }, { requesteeId: ctx.userId }];
    }
    if (status) where['status'] = status;

    const meetings = await prisma.meetingRequest.findMany({
      where,
      orderBy: { proposedAt: 'asc' },
      take: 50,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        requestee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(req, {
      data: meetings.map((m) => ({
        ...mapMeetingResponse(m),
        requester: { id: m.requester.id, first_name: m.requester.firstName, last_name: m.requester.lastName },
        requestee: { id: m.requestee.id, first_name: m.requestee.firstName, last_name: m.requestee.lastName },
      })),
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMeetingResponse(m: any) {
  return {
    id: m.id,
    tenant_id: m.tenantId,
    requester_id: m.requesterId,
    requestee_id: m.requesteeId,
    application_id: m.applicationId,
    title: m.title,
    description: m.description,
    proposed_at: m.proposedAt.toISOString(),
    duration_minutes: m.durationMinutes,
    location: m.location,
    meeting_url: m.meetingUrl,
    status: m.status,
    responded_at: m.respondedAt?.toISOString() ?? null,
    cancelled_at: m.cancelledAt?.toISOString() ?? null,
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt.toISOString(),
  };
}
