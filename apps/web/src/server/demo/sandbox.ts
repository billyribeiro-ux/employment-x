import { hash } from 'bcryptjs';

import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';

const DEMO_TENANT_SLUG = 'demo-sandbox';
const DEMO_PASSWORD_HASH_ROUNDS = 10;

export interface DemoSandboxResult {
  tenantId: string;
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  expiresAt: Date;
}

export async function createDemoSandbox(
  scenario: string,
  role: 'candidate' | 'employer',
  ip?: string,
  userAgent?: string,
): Promise<DemoSandboxResult> {
  const log = logger.child({ module: 'demo-sandbox', scenario, role });

  // Check max sessions
  const maxSessions = parseInt(process.env['DEMO_MAX_SESSIONS'] ?? '100', 10);
  const activeCount = await prisma.demoSession.count({
    where: { cleanedUp: false, expiresAt: { gt: new Date() } },
  });

  if (activeCount >= maxSessions) {
    throw new Error(`Demo session limit reached (${maxSessions}). Please try again later.`);
  }

  // Get or create demo org
  let org = await prisma.organization.findFirst({ where: { slug: DEMO_TENANT_SLUG } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Demo Organization', slug: DEMO_TENANT_SLUG, plan: 'enterprise' },
    });
    log.info({ orgId: org.id }, 'Created demo organization');
  }

  // Create demo user
  const demoId = crypto.randomUUID().slice(0, 8);
  const email = `demo-${role}-${demoId}@demo.employmentx.local`;
  const passwordHash = await hash('demo-password-not-for-production', DEMO_PASSWORD_HASH_ROUNDS);

  const ttlMinutes = parseInt(process.env['DEMO_SESSION_TTL_MINUTES'] ?? '60', 10);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: role === 'candidate' ? 'Demo' : 'Demo',
      lastName: role === 'candidate' ? 'Candidate' : 'Employer',
      role,
      organizationId: org.id,
      emailVerified: true,
    },
  });

  // Create org membership
  await prisma.orgMembership.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: role === 'employer' ? 'admin' : 'viewer',
    },
  });

  // Create demo session record
  const demoSession = await prisma.demoSession.create({
    data: {
      tenantId: org.id,
      userId: user.id,
      scenario,
      ipAddress: ip ?? null,
      userAgent: userAgent ?? null,
      expiresAt,
    },
  });

  log.info({ userId: user.id, sessionId: demoSession.id, expiresAt }, 'Demo sandbox created');

  return {
    tenantId: org.id,
    sessionId: demoSession.id,
    userId: user.id,
    email,
    role,
    expiresAt,
  };
}

export async function seedDemoData(tenantId: string, userId: string, scenario: string): Promise<void> {
  const log = logger.child({ module: 'demo-seed', tenantId, scenario });

  // Seed jobs
  const jobs = [
    { title: 'Senior Frontend Engineer', department: 'Engineering', description: 'Build beautiful, accessible UIs with React and TypeScript.' },
    { title: 'Product Designer', department: 'Design', description: 'Shape the future of hiring through thoughtful product design.' },
    { title: 'Backend Engineer', department: 'Engineering', description: 'Scale our platform infrastructure with Node.js and PostgreSQL.' },
  ];

  for (const job of jobs) {
    await prisma.job.create({
      data: {
        organizationId: tenantId,
        createdById: userId,
        title: job.title,
        description: job.description,
        department: job.department,
        employmentType: 'full_time',
        experienceLevel: 'senior',
        remote: true,
        salaryMin: 150000,
        salaryMax: 220000,
        skills: ['TypeScript', 'React', 'Node.js'],
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }

  log.info({ jobCount: jobs.length }, 'Demo data seeded');
}

export function isDemoUser(email: string): boolean {
  return email.endsWith('@demo.employmentx.local');
}

export function isDemoTenant(slug: string): boolean {
  return slug === DEMO_TENANT_SLUG;
}

export function blockRealSideEffect(email: string, action: string): void {
  if (isDemoUser(email)) {
    const blocked = ['send_email', 'charge_card', 'webhook_external', 'sms_send'];
    if (blocked.includes(action)) {
      throw new Error(`Demo mode: ${action} is blocked for demo users`);
    }
  }
}
