import { type Job } from 'bullmq';

import { createWorker } from '../queue/factory';
import { type DemoCleanupJob, DemoCleanupJobSchema } from '../queue/queues';
import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';

async function processDemoCleanup(job: Job<DemoCleanupJob>): Promise<void> {
  const log = logger.child({ worker: 'demo-cleanup', jobId: job.id });
  const parsed = DemoCleanupJobSchema.safeParse(job.data);
  if (!parsed.success) {
    log.error({ errors: parsed.error.flatten() }, 'Invalid demo cleanup job payload');
    return;
  }

  const { action, sessionId, tenantId } = parsed.data;
  log.info({ action, sessionId, tenantId }, 'Processing demo cleanup');

  switch (action) {
    case 'cleanup_expired': {
      const now = new Date();
      const expired = await prisma.demoSession.findMany({
        where: { expiresAt: { lt: now }, cleanedUp: false },
        take: 100,
      });

      for (const session of expired) {
        await cleanupDemoSession(session.id, session.userId, log);
      }

      log.info({ cleaned: expired.length }, 'Expired demo sessions cleaned');
      break;
    }

    case 'reset_session': {
      if (!sessionId) {
        log.warn('reset_session requires sessionId');
        return;
      }
      const session = await prisma.demoSession.findUnique({ where: { id: sessionId } });
      if (session) {
        await cleanupDemoSession(session.id, session.userId, log);
      }
      break;
    }

    case 'purge_tenant': {
      if (!tenantId) {
        log.warn('purge_tenant requires tenantId');
        return;
      }
      const sessions = await prisma.demoSession.findMany({
        where: { tenantId, cleanedUp: false },
      });
      for (const session of sessions) {
        await cleanupDemoSession(session.id, session.userId, log);
      }
      log.info({ tenantId, cleaned: sessions.length }, 'Demo tenant purged');
      break;
    }
  }
}

async function cleanupDemoSession(
  sessionId: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: any,
): Promise<void> {
  try {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.demoSession.update({
      where: { id: sessionId },
      data: { cleanedUp: true },
    });
    log.info({ sessionId, userId }, 'Demo session cleaned up');
  } catch (err) {
    log.error({ sessionId, userId, err }, 'Failed to clean up demo session');
  }
}

export function startDemoCleanupWorker() {
  return createWorker<DemoCleanupJob>('demo-cleanup', processDemoCleanup, { concurrency: 2 });
}
