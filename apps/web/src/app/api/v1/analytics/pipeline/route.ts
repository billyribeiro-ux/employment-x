import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'read', 'Application');

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const jobWhere = jobId
      ? { id: jobId, organizationId: ctx.org_id }
      : { organizationId: ctx.org_id };

    const jobs = await prisma.job.findMany({
      where: jobWhere,
      select: { id: true, title: true },
    });

    const jobIds = jobs.map((j) => j.id);

    const [stageCounts, recentApplications, totalApplications, scorecardStats] = await Promise.all([
      prisma.application.groupBy({
        by: ['stage'],
        where: { jobId: { in: jobIds } },
        _count: true,
      }),
      prisma.application.count({
        where: { jobId: { in: jobIds }, createdAt: { gte: since } },
      }),
      prisma.application.count({
        where: { jobId: { in: jobIds } },
      }),
      prisma.scorecard.aggregate({
        where: { application: { jobId: { in: jobIds } } },
        _avg: { overallRating: true },
        _count: true,
      }),
    ]);

    const funnel = stageCounts.map((s) => ({
      stage: s.stage,
      count: s._count,
    }));

    const conversionRate = totalApplications > 0
      ? Math.round(((stageCounts.find((s) => s.stage === 'hired')?._count ?? 0) / totalApplications) * 1000) / 10
      : 0;

    return successResponse(req, {
      period_days: days,
      total_jobs: jobs.length,
      total_applications: totalApplications,
      recent_applications: recentApplications,
      funnel,
      conversion_rate_percent: conversionRate,
      scorecards: {
        total: scorecardStats._count,
        average_rating: scorecardStats._avg.overallRating
          ? Math.round(scorecardStats._avg.overallRating * 10) / 10
          : null,
      },
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
