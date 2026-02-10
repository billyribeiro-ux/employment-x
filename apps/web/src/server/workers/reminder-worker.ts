import { type Job } from 'bullmq';

import { createWorker } from '../queue/factory';
import { type ReminderJob, ReminderJobSchema } from '../queue/queues';
import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';

async function processReminder(job: Job<ReminderJob>): Promise<void> {
  const log = logger.child({ worker: 'reminders', jobId: job.id });
  const parsed = ReminderJobSchema.safeParse(job.data);
  if (!parsed.success) {
    log.error({ errors: parsed.error.flatten() }, 'Invalid reminder job payload');
    return;
  }

  const { meetingId, userId, tenantId, type } = parsed.data;
  log.info({ meetingId, userId, tenantId, type }, 'Processing reminder');

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting || ['CANCELED', 'COMPLETED', 'EXPIRED', 'NO_SHOW'].includes(meeting.status)) {
    log.info({ meetingId, status: meeting?.status }, 'Meeting no longer active, skipping reminder');
    return;
  }

  await prisma.notification.create({
    data: {
      userId,
      type: 'meeting_reminder',
      title: `Meeting reminder: ${meeting.title}`,
      body: `Your meeting "${meeting.title}" is coming up (${type} reminder).`,
      resourceType: 'meeting',
      resourceId: meetingId,
    },
  });

  log.info({ meetingId, userId, type }, 'Reminder notification created');
}

export function startReminderWorker() {
  return createWorker<ReminderJob>('reminders', processReminder, { concurrency: 3 });
}
