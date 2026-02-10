import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: meetingId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    const meeting = await prisma.meetingRequest.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      throw new AppError('NOT_FOUND', 'Meeting request not found');
    }

    if (meeting.requesterId !== ctx.userId && meeting.requesteeId !== ctx.userId) {
      throw new AppError('FORBIDDEN', 'Only participants can reschedule this meeting');
    }

    if (meeting.status === 'cancelled' || meeting.status === 'completed') {
      throw new AppError('CONFLICT', `Cannot reschedule a ${meeting.status} meeting`);
    }

    const body = await req.json();
    const { proposed_at, duration_minutes } = body;

    if (!proposed_at) {
      throw new AppError('VALIDATION_ERROR', 'proposed_at is required');
    }

    const proposedDate = new Date(proposed_at);
    if (proposedDate <= new Date()) {
      throw new AppError('VALIDATION_ERROR', 'Proposed time must be in the future');
    }

    const updated = await prisma.meetingRequest.update({
      where: { id: meetingId },
      data: {
        proposedAt: proposedDate,
        durationMinutes: duration_minutes ?? meeting.durationMinutes,
        status: 'pending',
        respondedAt: null,
      },
    });

    await writeAuditEvent(
      { tenantId: meeting.tenantId, userId: ctx.userId, role: ctx.role },
      {
        action: 'meeting.reschedule',
        resourceType: 'meeting_request',
        resourceId: meetingId,
        metadata: { new_proposed_at: proposedDate.toISOString() },
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, {
      id: updated.id,
      proposed_at: updated.proposedAt.toISOString(),
      duration_minutes: updated.durationMinutes,
      status: updated.status,
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
