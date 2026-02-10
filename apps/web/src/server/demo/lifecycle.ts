'use server';

import { z } from 'zod';

import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';
import { createDemoSandbox, seedDemoData, isDemoUser, blockRealSideEffect } from '@/server/demo/sandbox';
import { demoCleanupQueue } from '@/server/queue/queues';

// --- F-036: Demo Entry ---

const StartDemoSchema = z.object({
  scenario: z.string().min(1).max(100),
  role: z.enum(['candidate', 'employer']),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

export async function startDemo(input: z.infer<typeof StartDemoSchema>) {
  const log = logger.child({ action: 'start_demo', scenario: input.scenario });
  const parsed = StartDemoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { scenario, role, ip, userAgent } = parsed.data;

  try {
    const sandbox = await createDemoSandbox(scenario, role, ip, userAgent);

    // F-037: Seed demo data
    await seedDemoData(sandbox.tenantId, sandbox.userId, scenario);

    // Schedule TTL cleanup
    await demoCleanupQueue.add(
      `cleanup-${sandbox.sessionId}`,
      {
        action: 'reset_session',
        sessionId: sandbox.sessionId,
        tenantId: sandbox.tenantId,
      },
      {
        delay: sandbox.expiresAt.getTime() - Date.now(),
        jobId: `ttl-cleanup-${sandbox.sessionId}`,
      },
    );

    log.info({ sessionId: sandbox.sessionId, expiresAt: sandbox.expiresAt }, 'Demo started');

    return {
      success: true as const,
      session: {
        sessionId: sandbox.sessionId,
        userId: sandbox.userId,
        email: sandbox.email,
        role: sandbox.role,
        tenantId: sandbox.tenantId,
        expiresAt: sandbox.expiresAt.toISOString(),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start demo';
    log.error({ err }, 'Demo start failed');
    return { success: false as const, error: message };
  }
}

// --- F-103: Demo Guardrails ---

export function checkDemoGuardrail(email: string, action: string): { allowed: boolean; reason?: string } {
  if (!isDemoUser(email)) {
    return { allowed: true };
  }

  try {
    blockRealSideEffect(email, action);
    return { allowed: true };
  } catch (err) {
    return { allowed: false, reason: err instanceof Error ? err.message : 'Blocked by demo guardrail' };
  }
}

// --- F-101: Demo Tour State ---

const TOUR_STEPS = [
  { id: 'welcome', title: 'Welcome to EmploymentX', target: '#main-content' },
  { id: 'dashboard', title: 'Your Dashboard', target: '[data-tour="dashboard"]' },
  { id: 'jobs', title: 'Browse Jobs', target: '[data-tour="jobs"]' },
  { id: 'apply', title: 'Apply to Jobs', target: '[data-tour="apply"]' },
  { id: 'messages', title: 'Messages', target: '[data-tour="messages"]' },
  { id: 'scheduling', title: 'Scheduling', target: '[data-tour="scheduling"]' },
  { id: 'complete', title: 'You\'re All Set!', target: null },
];

export function getTourSteps(role: 'candidate' | 'employer') {
  if (role === 'employer') {
    return [
      { id: 'welcome', title: 'Welcome to EmploymentX', target: '#main-content' },
      { id: 'dashboard', title: 'Employer Dashboard', target: '[data-tour="dashboard"]' },
      { id: 'post-job', title: 'Post a Job', target: '[data-tour="post-job"]' },
      { id: 'candidates', title: 'Review Candidates', target: '[data-tour="candidates"]' },
      { id: 'pipeline', title: 'Hiring Pipeline', target: '[data-tour="pipeline"]' },
      { id: 'complete', title: 'You\'re All Set!', target: null },
    ];
  }
  return TOUR_STEPS;
}

// --- F-224: Demo Conversion Tracking ---

export async function trackDemoConversion(
  sessionId: string,
  event: 'signup_click' | 'plan_view' | 'plan_select' | 'checkout_start' | 'checkout_complete',
  metadata?: Record<string, unknown>,
): Promise<void> {
  const log = logger.child({ action: 'demo_conversion', sessionId, event });

  const session = await prisma.demoSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    log.warn('Demo session not found for conversion tracking');
    return;
  }

  // Store conversion event in audit log
  await prisma.auditEvent.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: 'demo.start',
      resourceType: 'demo_conversion',
      resourceId: sessionId,
      metadata: { event, ...metadata } as never,
    },
  });

  log.info({ event, sessionId }, 'Demo conversion event tracked');
}

// --- F-225: Demo Cleanup (TTL) ---

export async function cleanupDemoSession(sessionId: string): Promise<void> {
  const log = logger.child({ action: 'cleanup_demo', sessionId });

  const session = await prisma.demoSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    log.warn('Demo session not found for cleanup');
    return;
  }

  if (session.cleanedUp) {
    log.info('Demo session already cleaned up');
    return;
  }

  // Clean up user data
  try {
    await prisma.session.deleteMany({ where: { userId: session.userId } });
    await prisma.notification.deleteMany({ where: { userId: session.userId } });
    await prisma.demoSession.update({
      where: { id: sessionId },
      data: { cleanedUp: true },
    });
    log.info({ sessionId, userId: session.userId }, 'Demo session cleaned up');
  } catch (err) {
    log.error({ err, sessionId }, 'Demo cleanup failed');
  }
}

// --- F-190: Demo Telemetry ---

export interface DemoTelemetry {
  activeSessions: number;
  totalSessions: number;
  avgSessionDurationMinutes: number;
  conversionRate: number;
  topScenarios: Array<{ scenario: string; count: number }>;
}

export async function getDemoTelemetry(): Promise<DemoTelemetry> {
  const now = new Date();

  const [activeSessions, totalSessions, sessions] = await Promise.all([
    prisma.demoSession.count({ where: { cleanedUp: false, expiresAt: { gt: now } } }),
    prisma.demoSession.count(),
    prisma.demoSession.findMany({
      select: { scenario: true, createdAt: true, expiresAt: true, cleanedUp: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ]);

  // Calculate avg session duration
  let totalDuration = 0;
  let completedCount = 0;
  for (const s of sessions) {
    if (s.cleanedUp) {
      totalDuration += s.expiresAt.getTime() - s.createdAt.getTime();
      completedCount++;
    }
  }
  const avgSessionDurationMinutes = completedCount > 0
    ? Math.round(totalDuration / completedCount / 60000)
    : 0;

  // Count conversions (audit events with demo_conversion resource type)
  const conversions = await prisma.auditEvent.count({
    where: { resourceType: 'demo_conversion' },
  });
  const conversionRate = totalSessions > 0 ? conversions / totalSessions : 0;

  // Top scenarios
  const scenarioCounts: Record<string, number> = {};
  for (const s of sessions) {
    const scenario = s.scenario ?? 'default';
    scenarioCounts[scenario] = (scenarioCounts[scenario] ?? 0) + 1;
  }
  const topScenarios = Object.entries(scenarioCounts)
    .map(([scenario, count]) => ({ scenario, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    activeSessions,
    totalSessions,
    avgSessionDurationMinutes,
    conversionRate,
    topScenarios,
  };
}
