import { NextResponse, type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { EndMeetingRequestSchema } from '@/lib/validation/video';
import { endMeeting } from '@/server/services/meeting-lifecycle.service';
import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: meetingId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    const body = await req.json();
    const parsed = EndMeetingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get participant role
    const participant = await prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: ctx.userId } },
    });
    if (!participant) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Not a participant' }, { status: 403 });
    }

    const result = await endMeeting(
      ctx.tenantId,
      meetingId,
      ctx.userId,
      participant.role,
      parsed.data.reason,
    );

    await writeAuditEvent(
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
      { action: 'interview.end', resourceType: 'meeting', resourceId: meetingId },
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('permissions') ? 403 : message.includes('Cannot end') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
