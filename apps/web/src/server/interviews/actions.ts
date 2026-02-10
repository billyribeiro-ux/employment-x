'use server';

import { z } from 'zod';

import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';
import { logger } from '@/server/observability/logger';

// --- F-024: Interview Session (start/end via meeting) ---

export async function startInterviewSession(meetingId: string, actorId: string, tenantId: string) {
  const log = logger.child({ action: 'start_interview', meetingId });

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.tenantId !== tenantId) {
    return { success: false as const, error: 'Meeting not found' };
  }
  if (meeting.status !== 'CONFIRMED' && meeting.status !== 'IN_PROGRESS') {
    return { success: false as const, error: 'Meeting must be confirmed to start interview' };
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: 'IN_PROGRESS' },
  });

  await writeAuditEvent(
    { tenantId, userId: actorId, role: 'employer' },
    { action: 'interview.start', resourceType: 'meeting', resourceId: meetingId },
  );

  log.info({ meetingId }, 'Interview session started');
  return { success: true as const, meeting: updated };
}

// --- F-015: Scorecards ---

const CreateScorecardSchema = z.object({
  applicationId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  overallRating: z.number().int().min(1).max(5),
  criteria: z.record(z.number().int().min(1).max(5)).default({}),
  notes: z.string().max(10000).optional(),
  recommendation: z.enum(['strong_yes', 'yes', 'neutral', 'no', 'strong_no']),
});

export async function createScorecard(input: z.infer<typeof CreateScorecardSchema>) {
  const log = logger.child({ action: 'create_scorecard', applicationId: input.applicationId });
  const parsed = CreateScorecardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const application = await prisma.application.findUnique({
    where: { id: data.applicationId },
    include: { job: { select: { organizationId: true } } },
  });

  if (!application || application.job.organizationId !== data.tenantId) {
    return { success: false as const, error: 'Application not found' };
  }

  // Check for duplicate scorecard from same reviewer
  const existing = await prisma.scorecard.findUnique({
    where: { applicationId_reviewerId: { applicationId: data.applicationId, reviewerId: data.reviewerId } },
  });
  if (existing) {
    return { success: false as const, error: 'Scorecard already submitted for this application' };
  }

  const scorecard = await prisma.scorecard.create({
    data: {
      applicationId: data.applicationId,
      reviewerId: data.reviewerId,
      overallRating: data.overallRating,
      criteria: data.criteria,
      notes: data.notes ?? null,
      recommendation: data.recommendation,
    },
  });

  await writeAuditEvent(
    { tenantId: data.tenantId, userId: data.reviewerId, role: 'employer' },
    { action: 'interview.feedback', resourceType: 'scorecard', resourceId: scorecard.id },
  );

  log.info({ scorecardId: scorecard.id }, 'Scorecard created');
  return { success: true as const, scorecard };
}

export async function getApplicationScorecards(applicationId: string, tenantId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: { select: { organizationId: true } } },
  });

  if (!application || application.job.organizationId !== tenantId) {
    return { success: false as const, error: 'Application not found' };
  }

  const scorecards = await prisma.scorecard.findMany({
    where: { applicationId },
    include: {
      reviewer: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { success: true as const, scorecards };
}

// --- F-071: Evaluation Rubric ---

export async function getEvaluationRubrics(tenantId: string) {
  const rubrics = await prisma.evaluationRubric.findMany({
    where: { organizationId: tenantId },
    orderBy: { createdAt: 'desc' },
  });
  return { success: true as const, rubrics };
}

// --- F-072/F-073: Decision Record ---

export interface DecisionRecord {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  scorecardSummary: {
    count: number;
    avgOverall: number;
    recommendations: Record<string, number>;
  };
  stageHistory: Array<{ from: string | null; to: string; at: string }>;
  decision: string;
  decidedBy: string;
  decidedAt: string;
}

export async function generateDecisionRecord(
  applicationId: string,
  tenantId: string,
): Promise<{ success: true; record: DecisionRecord } | { success: false; error: string }> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { select: { title: true, organizationId: true } },
      candidate: { select: { firstName: true, lastName: true } },
      scorecards: {
        select: { overallRating: true, recommendation: true, reviewer: { select: { firstName: true, lastName: true } } },
      },
      stageEvents: {
        orderBy: { createdAt: 'asc' },
        select: { fromStage: true, toStage: true, createdAt: true, actorId: true },
      },
    },
  });

  if (!application || application.job.organizationId !== tenantId) {
    return { success: false, error: 'Application not found' };
  }

  const recommendations: Record<string, number> = {};
  let totalRating = 0;
  for (const sc of application.scorecards) {
    totalRating += sc.overallRating;
    const rec = sc.recommendation ?? 'none';
    recommendations[rec] = (recommendations[rec] ?? 0) + 1;
  }

  const lastEvent = application.stageEvents[application.stageEvents.length - 1];

  const record: DecisionRecord = {
    applicationId,
    candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
    jobTitle: application.job.title,
    scorecardSummary: {
      count: application.scorecards.length,
      avgOverall: application.scorecards.length > 0 ? totalRating / application.scorecards.length : 0,
      recommendations,
    },
    stageHistory: application.stageEvents.map((e: { fromStage: string | null; toStage: string; createdAt: Date }) => ({
      from: e.fromStage,
      to: e.toStage,
      at: e.createdAt.toISOString(),
    })),
    decision: application.stage,
    decidedBy: lastEvent?.actorId ?? 'unknown',
    decidedAt: lastEvent?.createdAt.toISOString() ?? application.updatedAt.toISOString(),
  };

  return { success: true, record };
}
