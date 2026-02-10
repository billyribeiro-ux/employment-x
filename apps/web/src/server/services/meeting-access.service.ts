import { prisma } from '@/lib/server/db';
import { isJoinWindowOpen, canJoinMeeting } from '@/lib/validation/video';

export class MeetingAccessError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'MeetingAccessError';
  }
}

export async function assertCanJoinMeeting(
  userId: string,
  tenantId: string,
  meetingId: string,
): Promise<{
  meeting: Awaited<ReturnType<typeof prisma.meeting.findUnique>> & { participants: Array<{ userId: string; role: string }> };
  participant: { userId: string; role: string };
}> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: true },
  });

  if (!meeting) {
    throw new MeetingAccessError('NOT_FOUND', 'Meeting not found');
  }

  if (meeting.tenantId !== tenantId) {
    throw new MeetingAccessError('FORBIDDEN', 'Tenant mismatch');
  }

  const participant = meeting.participants.find((p) => p.userId === userId);
  if (!participant) {
    throw new MeetingAccessError('FORBIDDEN', 'Not a participant in this meeting');
  }

  if (!canJoinMeeting(meeting.status, meeting.joinWindowOpenAt, meeting.joinWindowCloseAt)) {
    if (!isJoinWindowOpen(meeting.joinWindowOpenAt, meeting.joinWindowCloseAt)) {
      throw new MeetingAccessError('JOIN_WINDOW_CLOSED', 'Join window is not open');
    }
    throw new MeetingAccessError('INVALID_MEETING_STATE', `Meeting status ${meeting.status} does not allow joining`);
  }

  return { meeting: meeting as never, participant: { userId: participant.userId, role: participant.role } };
}

export async function getMeetingForRoom(
  userId: string,
  tenantId: string,
  meetingId: string,
) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: { include: { user: { select: { firstName: true, lastName: true } } } } },
  });

  if (!meeting || meeting.tenantId !== tenantId) {
    return null;
  }

  const participant = meeting.participants.find((p) => p.userId === userId);
  if (!participant) {
    return null;
  }

  const now = new Date();
  const canJoin = canJoinMeeting(meeting.status, meeting.joinWindowOpenAt, meeting.joinWindowCloseAt, now);
  const canEnd = ['HOST', 'INTERVIEWER', 'RECRUITER'].includes(participant.role) &&
    ['CONFIRMED', 'IN_PROGRESS'].includes(meeting.status);

  return {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      scheduledStartAt: meeting.scheduledStartAt.toISOString(),
      scheduledEndAt: meeting.scheduledEndAt.toISOString(),
      joinWindowOpenAt: meeting.joinWindowOpenAt.toISOString(),
      joinWindowCloseAt: meeting.joinWindowCloseAt.toISOString(),
      timezone: meeting.timezone,
    },
    participant: {
      role: participant.role,
      displayName: `${participant.user.firstName} ${participant.user.lastName}`,
    },
    permissions: { canJoin, canEnd },
  };
}
