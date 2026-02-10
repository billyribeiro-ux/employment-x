'use server';

import { z } from 'zod';

import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';
import { logger } from '@/server/observability/logger';

// --- F-013: Apply Flow ---

const ApplySchema = z.object({
  jobId: z.string().uuid(),
  candidateId: z.string().uuid(),
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().optional(),
});

export async function applyToJob(input: z.infer<typeof ApplySchema>) {
  const log = logger.child({ action: 'apply', jobId: input.jobId, candidateId: input.candidateId });
  const parsed = ApplySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { jobId, candidateId, coverLetter, resumeUrl } = parsed.data;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'published') {
    return { success: false as const, error: 'Job not found or not accepting applications' };
  }

  const existing = await prisma.application.findUnique({
    where: { jobId_candidateId: { jobId, candidateId } },
  });
  if (existing) {
    return { success: false as const, error: 'Already applied to this job' };
  }

  const application = await prisma.application.create({
    data: {
      jobId,
      candidateId,
      coverLetter: coverLetter ?? null,
      resumeUrl: resumeUrl ?? null,
      stage: 'applied',
    },
  });

  // Record stage event
  await prisma.applicationStageEvent.create({
    data: {
      applicationId: application.id,
      fromStage: null,
      toStage: 'applied',
      actorId: candidateId,
    },
  });

  await writeAuditEvent(
    { tenantId: job.organizationId, userId: candidateId, role: 'candidate' },
    { action: 'application.create', resourceType: 'application', resourceId: application.id },
  );

  log.info({ applicationId: application.id }, 'Application submitted');
  return { success: true as const, application };
}

// --- F-014: Stage Transitions ---

const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ['screening', 'rejected', 'withdrawn'],
  screening: ['interview', 'rejected', 'withdrawn'],
  interview: ['offer', 'rejected', 'withdrawn'],
  offer: ['hired', 'rejected', 'withdrawn'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

const TransitionSchema = z.object({
  applicationId: z.string().uuid(),
  toStage: z.enum(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']),
  actorId: z.string().uuid(),
  tenantId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

export async function transitionStage(input: z.infer<typeof TransitionSchema>) {
  const log = logger.child({ action: 'transition_stage', appId: input.applicationId });
  const parsed = TransitionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { applicationId, toStage, actorId, tenantId, reason } = parsed.data;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: { select: { organizationId: true } } },
  });

  if (!application) {
    return { success: false as const, error: 'Application not found' };
  }

  if (application.job.organizationId !== tenantId) {
    return { success: false as const, error: 'Not authorized' };
  }

  const currentStage = application.stage;
  const allowed = VALID_TRANSITIONS[currentStage] ?? [];
  if (!allowed.includes(toStage)) {
    return { success: false as const, error: `Cannot transition from ${currentStage} to ${toStage}` };
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      stage: toStage as never,
      ...(toStage === 'rejected' ? { rejectedAt: new Date() } : {}),
      ...(toStage === 'withdrawn' ? { withdrawnAt: new Date() } : {}),
    },
  });

  await prisma.applicationStageEvent.create({
    data: {
      applicationId,
      fromStage: currentStage,
      toStage,
      actorId,
      reason: reason ?? null,
    },
  });

  await writeAuditEvent(
    { tenantId, userId: actorId, role: 'employer' },
    {
      action: 'application.stage_change',
      resourceType: 'application',
      resourceId: applicationId,
      metadata: { from: currentStage, to: toStage },
    },
  );

  log.info({ applicationId, from: currentStage, to: toStage }, 'Stage transitioned');
  return { success: true as const, application: updated };
}

// --- F-084: Candidate Status Center ---

export async function getCandidateStatusCenter(candidateId: string) {
  const applications = await prisma.application.findMany({
    where: { candidateId },
    include: {
      job: {
        select: {
          id: true, title: true, status: true,
          organization: { select: { id: true, name: true } },
        },
      },
      stageEvents: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { fromStage: true, toStage: true, createdAt: true },
      },
      _count: { select: { scorecards: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const summary = {
    total: applications.length,
    byStage: {} as Record<string, number>,
    active: 0,
    completed: 0,
  };

  for (const app of applications) {
    const stage = app.stage;
    summary.byStage[stage] = (summary.byStage[stage] ?? 0) + 1;
    if (['applied', 'screening', 'interview', 'offer'].includes(stage)) {
      summary.active++;
    } else {
      summary.completed++;
    }
  }

  return { applications, summary };
}

export async function withdrawApplication(applicationId: string, candidateId: string) {
  const log = logger.child({ action: 'withdraw', applicationId });

  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application || application.candidateId !== candidateId) {
    return { success: false as const, error: 'Application not found' };
  }

  if (['withdrawn', 'rejected', 'hired'].includes(application.stage)) {
    return { success: false as const, error: 'Cannot withdraw from current stage' };
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { stage: 'withdrawn', withdrawnAt: new Date() },
  });

  await prisma.applicationStageEvent.create({
    data: {
      applicationId,
      fromStage: application.stage,
      toStage: 'withdrawn',
      actorId: candidateId,
      reason: 'Candidate withdrew',
    },
  });

  await writeAuditEvent(
    { tenantId: candidateId, userId: candidateId, role: 'candidate' },
    { action: 'application.withdraw', resourceType: 'application', resourceId: applicationId },
  );

  log.info({ applicationId }, 'Application withdrawn');
  return { success: true as const, application: updated };
}
