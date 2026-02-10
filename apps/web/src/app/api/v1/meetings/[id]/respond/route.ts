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

    if (meeting.requesteeId !== ctx.userId) {
      throw new AppError('FORBIDDEN', 'Only the requestee can respond to this meeting');
    }

    if (meeting.status !== 'pending') {
      throw new AppError('CONFLICT', `Meeting is already ${meeting.status}`);
    }

    const body = await req.json();
    const { action } = body;

    if (action !== 'accept' && action !== 'deny') {
      throw new AppError('VALIDATION_ERROR', 'action must be "accept" or "deny"');
    }

    const updated = await prisma.meetingRequest.update({
      where: { id: meetingId },
      data: {
        status: action === 'accept' ? 'accepted' : 'denied',
        respondedAt: new Date(),
      },
    });

    const auditAction = action === 'accept' ? 'meeting.accept' as const : 'meeting.deny' as const;
    await writeAuditEvent(
      { tenantId: meeting.tenantId, userId: ctx.userId, role: ctx.role },
      {
        action: auditAction,
        resourceType: 'meeting_request',
        resourceId: meetingId,
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, {
      id: updated.id,
      status: updated.status,
      responded_at: updated.respondedAt?.toISOString() ?? null,
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
