import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';
import { canTransitionStatus, canEndMeeting } from '@/lib/validation/video';

export async function markParticipantJoined(
  tenantId: string,
  meetingId: string,
  userId: string,
): Promise<void> {
  const log = logger.child({ service: 'lifecycle', action: 'participant_joined', meetingId, userId });

  await prisma.meetingParticipant.update({
    where: { meetingId_userId: { meetingId, userId } },
    data: { attendanceStatus: 'JOINED', joinedAt: new Date() },
  });

  await prisma.meetingEvent.create({
    data: {
      tenantId, meetingId, actorUserId: userId,
      type: 'PARTICIPANT_JOINED',
    },
  });

  // Transition meeting to IN_PROGRESS on first join
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (meeting && meeting.status === 'CONFIRMED') {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'IN_PROGRESS' },
    });
    await prisma.meetingEvent.create({
      data: { tenantId, meetingId, type: 'MEETING_STARTED' },
    });
    log.info('Meeting transitioned to IN_PROGRESS');
  }

  log.info('Participant joined');
}

export async function markParticipantLeft(
  tenantId: string,
  meetingId: string,
  userId: string,
): Promise<void> {
  const log = logger.child({ service: 'lifecycle', action: 'participant_left', meetingId, userId });

  await prisma.meetingParticipant.update({
    where: { meetingId_userId: { meetingId, userId } },
    data: { attendanceStatus: 'LEFT', leftAt: new Date() },
  });

  await prisma.meetingEvent.create({
    data: { tenantId, meetingId, actorUserId: userId, type: 'PARTICIPANT_LEFT' },
  });

  log.info('Participant left');
}

export async function endMeeting(
  tenantId: string,
  meetingId: string,
  actorUserId: string,
  actorRole: string,
  reason?: string,
): Promise<{ meetingId: string; status: string; endedAt: string }> {
  const log = logger.child({ service: 'lifecycle', action: 'end_meeting', meetingId });

  if (!canEndMeeting(actorRole)) {
    throw new Error('Insufficient permissions to end meeting');
  }

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.tenantId !== tenantId) {
    throw new Error('Meeting not found');
  }

  if (!canTransitionStatus(meeting.status, 'COMPLETED')) {
    throw new Error(`Cannot end meeting in status ${meeting.status}`);
  }

  const endedAt = new Date();
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: 'COMPLETED', endedAt },
  });

  // End active video sessions
  await prisma.videoSession.updateMany({
    where: { meetingId, status: { in: ['CREATED', 'ACTIVE'] } },
    data: { status: 'ENDED', endedAt },
  });

  await prisma.meetingEvent.create({
    data: {
      tenantId, meetingId, actorUserId,
      type: 'MEETING_ENDED',
      payloadJson: { reason },
    },
  });

  log.info({ reason }, 'Meeting ended');

  return {
    meetingId,
    status: 'COMPLETED',
    endedAt: endedAt.toISOString(),
  };
}
