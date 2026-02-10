import { type Job } from 'bullmq';

import { createWorker } from '../queue/factory';
import { type NotificationJob, NotificationJobSchema } from '../queue/queues';
import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';

async function processNotification(job: Job<NotificationJob>): Promise<void> {
  const log = logger.child({ worker: 'notifications', jobId: job.id });
  const parsed = NotificationJobSchema.safeParse(job.data);
  if (!parsed.success) {
    log.error({ errors: parsed.error.flatten() }, 'Invalid notification job payload');
    return;
  }

  const { userId, type, title, body, resourceType, resourceId, channel } = parsed.data;
  log.info({ userId, type, channel }, 'Processing notification');

  if (channel === 'in_app' || channel === 'email') {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        resourceType: resourceType ?? null,
        resourceId: resourceId ?? null,
      },
    });
  }

  if (channel === 'email') {
    // Delegate to email queue — stub for now
    log.info({ userId, type }, 'Email notification would be sent (stub)');
  }

  if (channel === 'push') {
    // Delegate to push service — stub for now
    log.info({ userId, type }, 'Push notification would be sent (stub)');
  }

  log.info({ userId, type, channel }, 'Notification processed');
}

export function startNotificationWorker() {
  return createWorker<NotificationJob>('notifications', processNotification, { concurrency: 5 });
}
