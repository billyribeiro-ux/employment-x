import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { withSpan, spanAttributes } from '@/lib/server/tracing';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  return withSpan('POST /v1/feedback-templates', spanAttributes(req), async () => {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'manage', 'Scorecard');

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    const body = await req.json();
    const { name, description, sections, is_default } = body;

    if (!name || !sections) {
      throw new AppError('VALIDATION_ERROR', 'name and sections are required');
    }

    const template = await prisma.feedbackTemplate.create({
      data: {
        organizationId: ctx.org_id,
        name,
        description: description ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sections: sections as any,
        isDefault: is_default ?? false,
      },
    });

    return successResponse(req, mapTemplate(template), 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}

export async function GET(req: NextRequest) {
  return withSpan('GET /v1/feedback-templates', spanAttributes(req), async () => {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    const templates = await prisma.feedbackTemplate.findMany({
      where: { organizationId: ctx.org_id },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return successResponse(req, { data: templates.map(mapTemplate) });
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTemplate(t: any) {
  return {
    id: t.id,
    organization_id: t.organizationId,
    name: t.name,
    description: t.description,
    sections: t.sections,
    is_default: t.isDefault,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}
