'use server';

import { z } from 'zod';

import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';
import { logger } from '@/server/observability/logger';

// --- F-011: Job Post CRUD ---

const CreateJobSchema = z.object({
  organizationId: z.string().uuid(),
  createdById: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(10000),
  requirements: z.string().max(10000).optional(),
  benefits: z.string().max(5000).optional(),
  department: z.string().max(100).optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship', 'temporary']),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']),
  locationCity: z.string().max(100).optional(),
  locationState: z.string().max(100).optional(),
  locationCountry: z.string().max(100).optional(),
  remote: z.boolean().default(false),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  salaryCurrency: z.string().max(3).default('USD'),
  skills: z.array(z.string()).max(30).default([]),
});

export async function createJob(input: z.infer<typeof CreateJobSchema>) {
  const log = logger.child({ action: 'create_job', orgId: input.organizationId });
  const parsed = CreateJobSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const job = await prisma.job.create({
    data: {
      organizationId: data.organizationId,
      createdById: data.createdById,
      title: data.title,
      description: data.description,
      requirements: data.requirements ?? null,
      benefits: data.benefits ?? null,
      department: data.department ?? null,
      employmentType: data.employmentType,
      experienceLevel: data.experienceLevel,
      locationCity: data.locationCity ?? null,
      locationState: data.locationState ?? null,
      locationCountry: data.locationCountry ?? null,
      remote: data.remote,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      salaryCurrency: data.salaryCurrency,
      skills: data.skills,
      status: 'draft',
    },
  });

  await writeAuditEvent(
    { tenantId: data.organizationId, userId: data.createdById, role: 'employer' },
    { action: 'job.create', resourceType: 'job', resourceId: job.id },
  );

  log.info({ jobId: job.id }, 'Job created');
  return { success: true as const, job };
}

export async function publishJob(jobId: string, actorId: string, tenantId: string) {
  const log = logger.child({ action: 'publish_job', jobId });

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { success: false as const, error: 'Job not found' };
  if (job.organizationId !== tenantId) return { success: false as const, error: 'Not authorized' };
  if (job.status === 'published') return { success: false as const, error: 'Job already published' };

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { status: 'published', publishedAt: new Date() },
  });

  await writeAuditEvent(
    { tenantId, userId: actorId, role: 'employer' },
    { action: 'job.publish', resourceType: 'job', resourceId: jobId },
  );

  log.info({ jobId }, 'Job published');
  return { success: true as const, job: updated };
}

// --- F-012: Job Listings/Filter ---

const ListJobsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  employmentType: z.string().optional(),
  experienceLevel: z.string().optional(),
  remote: z.boolean().optional(),
  department: z.string().optional(),
  salaryMin: z.number().int().optional(),
  skills: z.array(z.string()).optional(),
  organizationId: z.string().uuid().optional(),
});

export async function listJobs(input: z.infer<typeof ListJobsSchema>) {
  const parsed = ListJobsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { page, limit, search, employmentType, experienceLevel, remote, department, salaryMin, skills, organizationId } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: 'published' };

  if (organizationId) where['organizationId'] = organizationId;
  if (employmentType) where['employmentType'] = employmentType;
  if (experienceLevel) where['experienceLevel'] = experienceLevel;
  if (remote !== undefined) where['remote'] = remote;
  if (department) where['department'] = department;
  if (salaryMin) where['salaryMax'] = { gte: salaryMin };
  if (search) {
    where['OR'] = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (skills && skills.length > 0) {
    where['skills'] = { hasSome: skills };
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { applications: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return {
    success: true as const,
    data: jobs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// --- F-162: Freshness/Expiry ---

export async function closeExpiredJobs(expiryDays: number = 90): Promise<number> {
  const log = logger.child({ action: 'close_expired_jobs' });
  const cutoff = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000);

  const result = await prisma.job.updateMany({
    where: {
      status: 'published',
      publishedAt: { lt: cutoff },
    },
    data: {
      status: 'closed',
      closedAt: new Date(),
    },
  });

  log.info({ closed: result.count, expiryDays }, 'Expired jobs closed');
  return result.count;
}

export function computeFreshnessScore(publishedAt: Date | null): number {
  if (!publishedAt) return 0;
  const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < 24) return 100;
  if (ageHours < 72) return 90;
  if (ageHours < 168) return 75;
  if (ageHours < 720) return 50;
  return 25;
}
