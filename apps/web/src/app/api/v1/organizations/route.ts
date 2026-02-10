import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { defineAbilitiesFor } from '@/lib/server/rbac';
import { withSpan, spanAttributes } from '@/lib/server/tracing';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  return withSpan('POST /v1/organizations', spanAttributes(req), async () => {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined, organizationId: ctx.org_id ?? undefined });

    if (ctx.role === 'candidate') {
      throw new AppError('FORBIDDEN', 'Candidates cannot create organizations');
    }

    const body = await req.json();
    const { name, slug } = body;

    if (!name || !slug) {
      throw new AppError('VALIDATION_ERROR', 'Missing required fields: name, slug');
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new AppError('VALIDATION_ERROR', 'Slug must contain only lowercase letters, numbers, and hyphens');
    }

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError('CONFLICT', 'Organization slug already taken');
    }

    const org = await prisma.organization.create({
      data: { name, slug },
    });

    await prisma.orgMembership.create({
      data: {
        userId: ctx.userId,
        organizationId: org.id,
        role: 'owner',
      },
    });

    await prisma.user.update({
      where: { id: ctx.userId },
      data: { organizationId: org.id },
    });

    await writeAuditEvent(
      { tenantId: org.id, userId: ctx.userId, role: ctx.role },
      {
        action: 'org.create',
        resourceType: 'organization',
        resourceId: org.id,
        correlationId: getCorrelationId(req),
      },
    );

    void ability;

    return successResponse(req, {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      created_at: org.createdAt.toISOString(),
    }, 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}
