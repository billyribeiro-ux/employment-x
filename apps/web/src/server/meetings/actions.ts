'use server';

import { z } from 'zod';

import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';
import { logger } from '@/server/observability/logger';

// --- Create Meeting (new schema) ---

const CreateMeetingSchema = z.object({
  tenantId: z.string(),
  organizationId: z.string(),
  applicationId: z.string().optional(),
  createdByUserId: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  timezone: z.string().max(50).default('UTC'),
  scheduledStartAt: z.string().datetime(),
  scheduledEndAt: z.string().datetime(),
  joinWindowMinutesBefore: z.number().int().min(0).max(60).default(10),
  joinWindowMinutesAfter: z.number().int().min(0).max(30).default(5),
  participants: z.array(z.object({
    userId: z.string(),
    role: z.enum(['HOST', 'INTERVIEWER', 'CANDIDATE', 'OBSERVER', 'RECRUITER']),
  })).min(1),
});

export async function createMeeting(input: z.infer<typeof CreateMeetingSchema>) {
  const log = logger.child({ action: 'create_meeting', tenantId: input.tenantId });
  const parsed = CreateMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const startAt = new Date(data.scheduledStartAt);
  const endAt = new Date(data.scheduledEndAt);
  const joinOpen = new Date(startAt.getTime() - data.joinWindowMinutesBefore * 60 * 1000);
  const joinClose = new Date(endAt.getTime() + data.joinWindowMinutesAfter * 60 * 1000);

  if (endAt <= startAt) {
    return { success: false as const, error: 'End time must be after start time' };
  }

  // Conflict detection for all participants
  for (const p of data.participants) {
    const conflict = await detectConflict(p.userId, startAt, endAt);
    if (conflict) {
      return { success: false as const, error: `Time conflict for participant ${p.userId}: ${conflict.title}` };
    }
  }

  const meeting = await prisma.meeting.create({
    data: {
      tenantId: data.tenantId,
      organizationId: data.organizationId,
      applicationId: data.applicationId ?? null,
      title: data.title,
      description: data.description ?? null,
      timezone: data.timezone,
      scheduledStartAt: startAt,
      scheduledEndAt: endAt,
      joinWindowOpenAt: joinOpen,
      joinWindowCloseAt: joinClose,
      status: 'REQUESTED',
      createdByUserId: data.createdByUserId,
      providerRoomName: `t_${data.tenantId}_m_`,
      participants: {
        create: data.participants.map((p) => ({
          tenantId: data.tenantId,
          userId: p.userId,
          role: p.role,
        })),
      },
      events: {
        create: {
          tenantId: data.tenantId,
          actorUserId: data.createdByUserId,
          type: 'REQUEST_CREATED',
        },
      },
    },
    include: { participants: true },
  });

  // Fix providerRoomName with actual meeting ID
  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { providerRoomName: `t_${data.tenantId}_m_${meeting.id}` },
  });

  await writeAuditEvent(
    { tenantId: data.tenantId, userId: data.createdByUserId, role: 'employer' },
    { action: 'meeting.create', resourceType: 'meeting', resourceId: meeting.id },
  );

  log.info({ meetingId: meeting.id }, 'Meeting created');
  return { success: true as const, meeting };
}

// --- Confirm/Deny Meeting ---

export async function respondToMeeting(
  meetingId: string,
  userId: string,
  tenantId: string,
  response: 'CONFIRMED' | 'DENIED',
) {
  const log = logger.child({ action: 'respond_meeting', meetingId, response });

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: true },
  });
  if (!meeting || meeting.tenantId !== tenantId) {
    return { success: false as const, error: 'Meeting not found' };
  }

  const participant = meeting.participants.find((p) => p.userId === userId);
  if (!participant) {
    return { success: false as const, error: 'Not a participant' };
  }
  if (meeting.status !== 'REQUESTED' && meeting.status !== 'RESCHEDULE_REQUESTED') {
    return { success: false as const, error: `Cannot respond to a ${meeting.status} meeting` };
  }

  const newStatus = response === 'CONFIRMED' ? 'CONFIRMED' as const : 'DENIED' as const;

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: newStatus },
  });

  const eventType = response === 'CONFIRMED' ? 'REQUEST_ACCEPTED' as const : 'REQUEST_DENIED' as const;
  await prisma.meetingEvent.create({
    data: { tenantId, meetingId, actorUserId: userId, type: eventType },
  });

  if (response === 'CONFIRMED') {
    await prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data: { attendanceStatus: 'ACCEPTED' },
    });
  }

  const auditAction = response === 'CONFIRMED' ? 'meeting.accept' as const : 'meeting.deny' as const;
  await writeAuditEvent(
    { tenantId, userId, role: 'employer' },
    { action: auditAction, resourceType: 'meeting', resourceId: meetingId },
  );

  log.info({ meetingId, response }, 'Meeting response recorded');
  return { success: true as const, meeting: updated };
}

// --- Reschedule Meeting ---

const RescheduleSchema = z.object({
  meetingId: z.string(),
  actorId: z.string(),
  tenantId: z.string(),
  newStartAt: z.string().datetime(),
  newEndAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

export async function rescheduleMeeting(input: z.infer<typeof RescheduleSchema>) {
  const log = logger.child({ action: 'reschedule_meeting', meetingId: input.meetingId });
  const parsed = RescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { meetingId, actorId, tenantId, newStartAt, newEndAt, reason } = parsed.data;

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.tenantId !== tenantId) {
    return { success: false as const, error: 'Meeting not found' };
  }
  if (['COMPLETED', 'CANCELED', 'IN_PROGRESS'].includes(meeting.status)) {
    return { success: false as const, error: `Cannot reschedule a ${meeting.status} meeting` };
  }

  const startAt = new Date(newStartAt);
  const endAt = new Date(newEndAt);
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
      tenantId, meetingId, actorUserId: actorId,
      type: 'RESCHEDULE_REQUESTED',
      payloadJson: { reason, newStartAt, newEndAt },
    },
  });

  await writeAuditEvent(
    { tenantId, userId: actorId, role: 'employer' },
    { action: 'meeting.reschedule', resourceType: 'meeting', resourceId: meetingId, metadata: { reason } },
  );

  log.info({ meetingId }, 'Meeting rescheduled');
  return { success: true as const, meeting: updated };
}

// --- Cancel Meeting ---

export async function cancelMeeting(meetingId: string, actorId: string, tenantId: string, reason?: string) {
  const log = logger.child({ action: 'cancel_meeting', meetingId });

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.tenantId !== tenantId) {
    return { success: false as const, error: 'Meeting not found' };
  }
  if (['COMPLETED', 'CANCELED'].includes(meeting.status)) {
    return { success: false as const, error: `Cannot cancel a ${meeting.status} meeting` };
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: 'CANCELED', canceledByUserId: actorId, canceledReason: reason ?? null },
  });

  await prisma.meetingEvent.create({
    data: { tenantId, meetingId, actorUserId: actorId, type: 'CANCELED', payloadJson: { reason } },
  });

  await writeAuditEvent(
    { tenantId, userId: actorId, role: 'employer' },
    { action: 'meeting.cancel', resourceType: 'meeting', resourceId: meetingId },
  );

  log.info({ meetingId }, 'Meeting cancelled');
  return { success: true as const, meeting: updated };
}

// --- Conflict Detection ---

async function detectConflict(
  userId: string,
  startAt: Date,
  endAt: Date,
): Promise<{ title: string } | null> {
  const conflicts = await prisma.meeting.findMany({
    where: {
      participants: { some: { userId } },
      status: { in: ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'] },
      scheduledStartAt: { lt: endAt },
      scheduledEndAt: { gt: startAt },
    },
    select: { title: true },
    take: 1,
  });

  return conflicts[0] ?? null;
}

// --- Availability ---

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
}

export async function getUserAvailability(
  userId: string,
  dateStr: string,
  _timezone: string = 'UTC',
): Promise<AvailabilitySlot[]> {
  const date = new Date(dateStr);
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const meetings = await prisma.meeting.findMany({
    where: {
      participants: { some: { userId } },
      status: { in: ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'] },
      scheduledStartAt: { gte: dayStart, lte: dayEnd },
    },
    select: { scheduledStartAt: true, scheduledEndAt: true },
    orderBy: { scheduledStartAt: 'asc' },
  });

  const slots: AvailabilitySlot[] = [];
  for (let hour = 9; hour < 18; hour++) {
    const slotStart = new Date(dayStart);
    slotStart.setUTCHours(hour, 0, 0, 0);
    const slotEnd = new Date(dayStart);
    slotEnd.setUTCHours(hour + 1, 0, 0, 0);

    const isOccupied = meetings.some((m) =>
      m.scheduledStartAt < slotEnd && m.scheduledEndAt > slotStart,
    );

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !isOccupied,
    });
  }

  return slots;
}
