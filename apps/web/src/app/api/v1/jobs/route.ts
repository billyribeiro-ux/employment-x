import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'create', 'Job');

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization to create jobs');
    }

    const body = await req.json();
    const { title, description, employment_type, experience_level, ...rest } = body;

    if (!title || !description || !employment_type || !experience_level) {
      throw new AppError('VALIDATION_ERROR', 'Missing required fields: title, description, employment_type, experience_level');
    }

    const job = await prisma.job.create({
      data: {
        organizationId: ctx.org_id,
        createdById: ctx.userId,
        title,
        description,
        requirements: rest.requirements ?? null,
        benefits: rest.benefits ?? null,
        department: rest.department ?? null,
        employmentType: employment_type,
        experienceLevel: experience_level,
        locationCity: rest.location_city ?? null,
        locationState: rest.location_state ?? null,
        locationCountry: rest.location_country ?? null,
        remote: rest.remote ?? false,
        salaryMin: rest.salary_min ?? null,
        salaryMax: rest.salary_max ?? null,
        salaryCurrency: rest.salary_currency ?? 'USD',
        skills: rest.skills ?? [],
      },
    });

    await writeAuditEvent(
      { tenantId: ctx.org_id, userId: ctx.userId, role: ctx.role },
      {
        action: 'job.create',
        resourceType: 'job',
        resourceId: job.id,
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, mapJobResponse(job), 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') ?? 'published';
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;
    const search = url.searchParams.get('q') ?? undefined;
    const remote = url.searchParams.get('remote');
    const employmentType = url.searchParams.get('employment_type');

    const where: Record<string, unknown> = { status };
    if (search) {
      where['OR'] = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (remote === 'true') where['remote'] = true;
    if (employmentType) where['employmentType'] = employmentType;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        include: { organization: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.job.count({ where }),
    ]);

    return successResponse(req, {
      data: jobs.map(mapJobResponse),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJobResponse(job: any) {
  return {
    id: job.id,
    organization_id: job.organizationId,
    organization: job.organization ?? undefined,
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    department: job.department,
    employment_type: job.employmentType,
    experience_level: job.experienceLevel,
    location_city: job.locationCity,
    location_state: job.locationState,
    location_country: job.locationCountry,
    remote: job.remote,
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    salary_currency: job.salaryCurrency,
    skills: job.skills,
    status: job.status,
    published_at: job.publishedAt?.toISOString() ?? null,
    closed_at: job.closedAt?.toISOString() ?? null,
    created_at: job.createdAt.toISOString(),
    updated_at: job.updatedAt.toISOString(),
  };
}
