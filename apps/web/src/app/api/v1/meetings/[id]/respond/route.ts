import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limit';
import { writeAuditEvent } from '@/lib/server/audit';
import { withIdempotency } from '@/server/middleware/idempotency';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withIdempotency(req, async () => {
    try {
      checkRateLimit(req, 'scheduling:respond', RATE_LIMITS.scheduling);
      const { id: meetingId } = await params;
      const ctx = await authenticateRequest(req.headers.get('authorization'));

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { participants: true },
    });
    if (!meeting) {
      throw new AppError('NOT_FOUND', 'Meeting not found');
    }

    const participant = meeting.participants.find((p) => p.userId === ctx.userId);
    if (!participant) {
      throw new AppError('FORBIDDEN', 'Not a participant in this meeting');
    }

    if (meeting.status !== 'REQUESTED' && meeting.status !== 'RESCHEDULE_REQUESTED') {
      throw new AppError('CONFLICT', `Meeting is already ${meeting.status}`);
    }

    const body = await req.json();
    const { action } = body;

    if (action !== 'confirm' && action !== 'deny') {
      throw new AppError('VALIDATION_ERROR', 'action must be "confirm" or "deny"');
    }

    const newStatus = action === 'confirm' ? 'CONFIRMED' as const : 'DENIED' as const;
    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: newStatus },
    });

    const eventType = action === 'confirm' ? 'REQUEST_ACCEPTED' as const : 'REQUEST_DENIED' as const;
    await prisma.meetingEvent.create({
      data: { tenantId: meeting.tenantId, meetingId, actorUserId: ctx.userId, type: eventType },
    });

    if (action === 'confirm') {
      await prisma.meetingParticipant.update({
        where: { meetingId_userId: { meetingId, userId: ctx.userId } },
        data: { attendanceStatus: 'ACCEPTED' },
      });
    }

    const auditAction = action === 'confirm' ? 'meeting.accept' as const : 'meeting.deny' as const;
    await writeAuditEvent(
      { tenantId: meeting.tenantId, userId: ctx.userId, role: ctx.role },
      { action: auditAction, resourceType: 'meeting', resourceId: meetingId, correlationId: getCorrelationId(req) },
    );

      return successResponse(req, { id: updated.id, status: updated.status });
    } catch (err) {
      return handleRouteError(req, err);
    }
  });
}
