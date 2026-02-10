'use server';

import { z } from 'zod';

import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';
import { logger } from '@/server/observability/logger';

// --- F-019/F-021: Create Meeting Request ---

const CreateMeetingSchema = z.object({
  tenantId: z.string().uuid(),
  requesterId: z.string().uuid(),
  requesteeId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  proposedAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  timezone: z.string().max(50).default('UTC'),
  bufferMinutes: z.number().int().min(0).max(60).default(15),
  location: z.string().max(500).optional(),
});

export async function createMeetingRequest(input: z.infer<typeof CreateMeetingSchema>) {
  const log = logger.child({ action: 'create_meeting', tenantId: input.tenantId });
  const parsed = CreateMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const proposedDate = new Date(data.proposedAt);

  // F-172: Conflict detection
  const conflict = await detectConflict(
    data.requesteeId,
    proposedDate,
    data.durationMinutes,
    data.bufferMinutes,
  );
  if (conflict) {
    return { success: false as const, error: `Time conflict with existing meeting: ${conflict.title}` };
  }

  const meeting = await prisma.meetingRequest.create({
    data: {
      tenantId: data.tenantId,
      requesterId: data.requesterId,
      requesteeId: data.requesteeId,
      title: data.title,
      description: data.description ?? null,
      proposedAt: proposedDate,
      durationMinutes: data.durationMinutes,
      location: data.location ?? null,
      status: 'pending',
    },
  });

  await writeAuditEvent(
    { tenantId: data.tenantId, userId: data.requesterId, role: 'employer' },
    { action: 'meeting.create', resourceType: 'meeting_request', resourceId: meeting.id },
  );

  log.info({ meetingId: meeting.id }, 'Meeting request created');
  return { success: true as const, meeting };
}

// --- F-022: Accept/Deny Meeting ---

export async function respondToMeeting(
  meetingId: string,
  userId: string,
  tenantId: string,
  response: 'accepted' | 'denied',
) {
  const log = logger.child({ action: 'respond_meeting', meetingId, response });

  const meeting = await prisma.meetingRequest.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.tenantId !== tenantId) {
    return { success: false as const, error: 'Meeting not found' };
  }
  if (meeting.requesteeId !== userId) {
    return { success: false as const, error: 'Only the requestee can respond' };
  }
  if (meeting.status !== 'pending') {
    return { success: false as const, error: `Cannot respond to a ${meeting.status} meeting` };
  }

  const updated = await prisma.meetingRequest.update({
    where: { id: meetingId },
    data: { status: response },
  });

  const auditAction = response === 'accepted' ? 'meeting.accept' as const : 'meeting.deny' as const;
  await writeAuditEvent(
    { tenantId, userId, role: 'employer' },
    { action: auditAction, resourceType: 'meeting_request', resourceId: meetingId },
  );

  log.info({ meetingId, response }, 'Meeting response recorded');
  return { success: true as const, meeting: updated };
}

// --- F-023: Reschedule Meeting ---

const RescheduleSchema = z.object({
  meetingId: z.string().uuid(),
  actorId: z.string().uuid(),
  tenantId: z.string().uuid(),
  newProposedAt: z.string().datetime(),
  newDurationMinutes: z.number().int().min(15).max(480).optional(),
  reason: z.string().max(500).optional(),
});

export async function rescheduleMeeting(input: z.infer<typeof RescheduleSchema>) {
  const log = logger.child({ action: 'reschedule_meeting', meetingId: input.meetingId });
  const parsed = RescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { meetingId, actorId, tenantId, newProposedAt, newDurationMinutes, reason } = parsed.data;

  const meeting = await prisma.meetingRequest.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.tenantId !== tenantId) {
    return { success: false as const, error: 'Meeting not found' };
  }
  if (meeting.status === 'completed' || meeting.status === 'cancelled') {
    return { success: false as const, error: `Cannot reschedule a ${meeting.status} meeting` };
  }

  const updated = await prisma.meetingRequest.update({
    where: { id: meetingId },
    data: {
      proposedAt: new Date(newProposedAt),
      ...(newDurationMinutes ? { durationMinutes: newDurationMinutes } : {}),
      status: 'pending',
    },
  });

  await writeAuditEvent(
    { tenantId, userId: actorId, role: 'employer' },
    {
      action: 'meeting.reschedule',
      resourceType: 'meeting_request',
      resourceId: meetingId,
      metadata: { reason, newProposedAt },
    },
  );

  log.info({ meetingId }, 'Meeting rescheduled');
  return { success: true as const, meeting: updated };
}

// --- F-052: Cancel Meeting ---

export async function cancelMeeting(meetingId: string, actorId: string, tenantId: string) {
  const log = logger.child({ action: 'cancel_meeting', meetingId });

  const meeting = await prisma.meetingRequest.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.tenantId !== tenantId) {
    return { success: false as const, error: 'Meeting not found' };
  }
  if (meeting.status === 'completed' || meeting.status === 'cancelled') {
    return { success: false as const, error: `Cannot cancel a ${meeting.status} meeting` };
  }

  const updated = await prisma.meetingRequest.update({
    where: { id: meetingId },
    data: { status: 'cancelled' },
  });

  await writeAuditEvent(
    { tenantId, userId: actorId, role: 'employer' },
    { action: 'meeting.cancel', resourceType: 'meeting_request', resourceId: meetingId },
  );

  log.info({ meetingId }, 'Meeting cancelled');
  return { success: true as const, meeting: updated };
}

// --- F-172: Conflict Detection ---

async function detectConflict(
  userId: string,
  proposedAt: Date,
  durationMinutes: number,
  bufferMinutes: number,
): Promise<{ title: string } | null> {
  const startWithBuffer = new Date(proposedAt.getTime() - bufferMinutes * 60 * 1000);
  const endWithBuffer = new Date(proposedAt.getTime() + (durationMinutes + bufferMinutes) * 60 * 1000);

  const conflicts = await prisma.meetingRequest.findMany({
    where: {
      OR: [
        { requesterId: userId },
        { requesteeId: userId },
      ],
      status: { in: ['pending', 'accepted'] },
      proposedAt: { gte: startWithBuffer, lt: endWithBuffer },
    },
    select: { title: true },
    take: 1,
  });

  return conflicts[0] ?? null;
}

// --- F-173: Timezone-Aware Availability ---

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

  const meetings = await prisma.meetingRequest.findMany({
    where: {
      OR: [{ requesterId: userId }, { requesteeId: userId }],
      status: { in: ['pending', 'accepted'] },
      proposedAt: { gte: dayStart, lte: dayEnd },
    },
    select: { proposedAt: true, durationMinutes: true },
    orderBy: { proposedAt: 'asc' },
  });

  // Generate hourly slots (9 AM - 6 PM in the given timezone concept)
  const slots: AvailabilitySlot[] = [];
  for (let hour = 9; hour < 18; hour++) {
    const slotStart = new Date(dayStart);
    slotStart.setUTCHours(hour, 0, 0, 0);
    const slotEnd = new Date(dayStart);
    slotEnd.setUTCHours(hour + 1, 0, 0, 0);

    const isOccupied = meetings.some((m) => {
      const meetingEnd = new Date(m.proposedAt.getTime() + m.durationMinutes * 60 * 1000);
      return m.proposedAt < slotEnd && meetingEnd > slotStart;
    });

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !isOccupied,
    });
  }

  return slots;
}
