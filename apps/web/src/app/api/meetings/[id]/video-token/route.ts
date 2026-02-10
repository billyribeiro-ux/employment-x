import { NextResponse, type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { VideoTokenRequestSchema, VIDEO_ERROR_CODES } from '@/lib/validation/video';
import { assertCanJoinMeeting, MeetingAccessError } from '@/server/services/meeting-access.service';
import { issueJoinToken } from '@/server/services/video-token.service';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: meetingId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    const body = await req.json();
    const parsed = VideoTokenRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { meeting, participant } = await assertCanJoinMeeting(ctx.userId, ctx.tenantId, meetingId);

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { firstName: true, lastName: true },
    });
    const displayName = user ? `${user.firstName} ${user.lastName}` : ctx.userId;

    const tokenResponse = await issueJoinToken({
      meetingId,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: participant.role,
      displayName,
      providerRoomName: meeting.providerRoomName ?? `t_${ctx.tenantId}_m_${meetingId}`,
    });

    return NextResponse.json(tokenResponse);
  } catch (err) {
    if (err instanceof MeetingAccessError) {
      const errorDef = VIDEO_ERROR_CODES[err.code as keyof typeof VIDEO_ERROR_CODES];
      if (errorDef) {
        return NextResponse.json({ error: err.code, message: err.message }, { status: errorDef.status });
      }
    }
    return NextResponse.json(
      { error: 'TOKEN_ISSUE_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
