'use server';

import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';
import { reminderQueue } from '@/server/queue/queues';

// --- F-030: Reminder Engine ---

const REMINDER_OFFSETS_MINUTES = [
  { type: '1day' as const, offset: 24 * 60 },
  { type: '1hour' as const, offset: 60 },
  { type: '15min' as const, offset: 15 },
];

export async function scheduleRemindersForMeeting(meetingId: string): Promise<number> {
  const log = logger.child({ action: 'schedule_reminders', meetingId });

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true, title: true, scheduledStartAt: true, tenantId: true,
      status: true,
      participants: { select: { userId: true } },
    },
  });

  if (!meeting || ['CANCELED', 'DENIED', 'COMPLETED', 'EXPIRED'].includes(meeting.status)) {
    log.info({ meetingId, status: meeting?.status }, 'Skipping reminders for inactive meeting');
    return 0;
  }

  let scheduled = 0;
  const participantIds = meeting.participants.map((p: { userId: string }) => p.userId);

  for (const participant of participantIds) {
    for (const { type, offset } of REMINDER_OFFSETS_MINUTES) {
      const reminderAt = new Date(meeting.scheduledStartAt.getTime() - offset * 60 * 1000);

      // Don't schedule reminders in the past
      if (reminderAt <= new Date()) continue;

      const delay = reminderAt.getTime() - Date.now();

      await reminderQueue.add(
        `reminder-${meetingId}-${participant}-${type}`,
        {
          meetingId: meeting.id,
          userId: participant,
          tenantId: meeting.tenantId,
          type,
          scheduledFor: reminderAt.toISOString(),
        },
        {
          delay,
          jobId: `reminder-${meetingId}-${participant}-${type}`,
          removeOnComplete: true,
          removeOnFail: { count: 5 },
        },
      );

      scheduled++;
    }
  }

  log.info({ meetingId, scheduled }, 'Reminders scheduled');
  return scheduled;
}

export async function cancelRemindersForMeeting(meetingId: string): Promise<number> {
  const log = logger.child({ action: 'cancel_reminders', meetingId });

  let cancelled = 0;
  const participants = ['requester', 'requestee'];
  const types = ['24h', '1h', '15m'];

  for (const p of participants) {
    for (const t of types) {
      const jobId = `reminder-${meetingId}-${p}-${t}`;
      try {
        const job = await reminderQueue.getJob(jobId);
        if (job) {
          await job.remove();
          cancelled++;
        }
      } catch {
        // Job may not exist, that's fine
      }
    }
  }

  log.info({ meetingId, cancelled }, 'Reminders cancelled');
  return cancelled;
}

// --- F-050: Scheduled reminder scan (cron-triggered) ---

export async function scanUpcomingMeetingsForReminders(): Promise<number> {
  const log = logger.child({ action: 'scan_reminders' });

  // Find meetings in the next 25 hours that are accepted
  const cutoff = new Date(Date.now() + 25 * 60 * 60 * 1000);

  const meetings = await prisma.meeting.findMany({
    where: {
      status: 'CONFIRMED',
      scheduledStartAt: { gt: new Date(), lt: cutoff },
    },
    select: { id: true },
  });

  let totalScheduled = 0;
  for (const meeting of meetings) {
    const count = await scheduleRemindersForMeeting(meeting.id);
    totalScheduled += count;
  }

  log.info({ meetings: meetings.length, reminders: totalScheduled }, 'Reminder scan complete');
  return totalScheduled;
}
