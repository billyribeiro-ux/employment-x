import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'manage', 'Scorecard');

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    const body = await req.json();
    const { name, description, criteria, scoring_scale, is_default } = body;

    if (!name || !criteria || !scoring_scale) {
      throw new AppError('VALIDATION_ERROR', 'name, criteria, and scoring_scale are required');
    }

    const rubric = await prisma.evaluationRubric.create({
      data: {
        organizationId: ctx.org_id,
        name,
        description: description ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        criteria: criteria as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scoringScale: scoring_scale as any,
        isDefault: is_default ?? false,
      },
    });

    return successResponse(req, mapRubric(rubric), 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    const rubrics = await prisma.evaluationRubric.findMany({
      where: { organizationId: ctx.org_id },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return successResponse(req, { data: rubrics.map(mapRubric) });
  } catch (err) {
    return handleRouteError(req, err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRubric(r: any) {
  return {
    id: r.id,
    organization_id: r.organizationId,
    name: r.name,
    description: r.description,
    criteria: r.criteria,
    scoring_scale: r.scoringScale,
    is_default: r.isDefault,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}
