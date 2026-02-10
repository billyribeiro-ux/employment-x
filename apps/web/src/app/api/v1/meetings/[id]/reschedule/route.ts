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

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { participants: true },
    });
    if (!meeting) {
      throw new AppError('NOT_FOUND', 'Meeting not found');
    }

    const isParticipant = meeting.participants.some((p) => p.userId === ctx.userId);
    if (!isParticipant) {
      throw new AppError('FORBIDDEN', 'Only participants can reschedule this meeting');
    }

    if (['CANCELED', 'COMPLETED', 'IN_PROGRESS'].includes(meeting.status)) {
      throw new AppError('CONFLICT', `Cannot reschedule a ${meeting.status} meeting`);
    }

    const body = await req.json();
    const { scheduled_start_at, scheduled_end_at } = body;

    if (!scheduled_start_at || !scheduled_end_at) {
      throw new AppError('VALIDATION_ERROR', 'scheduled_start_at and scheduled_end_at are required');
    }

    const startAt = new Date(scheduled_start_at);
    const endAt = new Date(scheduled_end_at);
    if (startAt <= new Date()) {
      throw new AppError('VALIDATION_ERROR', 'Start time must be in the future');
    }

    const joinOpen = new Date(startAt.getTime() - 10 * 60 * 1000);
    const joinClose = new Date(endAt.getTime() + 5 * 60 * 1000);

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        scheduledStartAt: startAt,
        scheduledEndAt: endAt,
        joinWindowOpenAt: joinOpen,
        joinWindowCloseAt: joinClose,
        status: 'RESCHEDULE_REQUESTED',
      },
    });

    await prisma.meetingEvent.create({
      data: {
        tenantId: meeting.tenantId, meetingId, actorUserId: ctx.userId,
        type: 'RESCHEDULE_REQUESTED',
        payloadJson: { scheduled_start_at, scheduled_end_at },
      },
    });

    await writeAuditEvent(
      { tenantId: meeting.tenantId, userId: ctx.userId, role: ctx.role },
      { action: 'meeting.reschedule', resourceType: 'meeting', resourceId: meetingId, correlationId: getCorrelationId(req) },
    );

    return successResponse(req, {
      id: updated.id,
      scheduled_start_at: updated.scheduledStartAt.toISOString(),
      scheduled_end_at: updated.scheduledEndAt.toISOString(),
      status: updated.status,
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
