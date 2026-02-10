import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { withSpan, spanAttributes } from '@/lib/server/tracing';
import { prisma } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  return withSpan('GET /v1/employers/profile', spanAttributes(req), async () => {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'read', 'Organization');

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    const profile = await prisma.employerProfile.findUnique({
      where: { organizationId: ctx.org_id },
    });

    return successResponse(req, { profile: profile ? mapProfile(profile) : null });
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}

export async function PUT(req: NextRequest) {
  return withSpan('PUT /v1/employers/profile', spanAttributes(req), async () => {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'update', 'Organization');

    if (!ctx.org_id) {
      throw new AppError('FORBIDDEN', 'Must belong to an organization');
    }

    if (ctx.role !== 'employer' && ctx.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only employers can update company profiles');
    }

    const body = await req.json();

    const profile = await prisma.employerProfile.upsert({
      where: { organizationId: ctx.org_id },
      create: {
        organizationId: ctx.org_id,
        logoUrl: body.logo_url ?? null,
        coverImageUrl: body.cover_image_url ?? null,
        tagline: body.tagline ?? null,
        description: body.description ?? null,
        industry: body.industry ?? null,
        companySize: body.company_size ?? null,
        foundedYear: body.founded_year ?? null,
        websiteUrl: body.website_url ?? null,
        linkedinUrl: body.linkedin_url ?? null,
        headquarters: body.headquarters ?? null,
        techStack: body.tech_stack ?? [],
        benefits: body.benefits ?? [],
        culture: body.culture ?? null,
      },
      update: {
        ...(body.logo_url != null && { logoUrl: body.logo_url }),
        ...(body.cover_image_url != null && { coverImageUrl: body.cover_image_url }),
        ...(body.tagline != null && { tagline: body.tagline }),
        ...(body.description != null && { description: body.description }),
        ...(body.industry != null && { industry: body.industry }),
        ...(body.company_size != null && { companySize: body.company_size }),
        ...(body.founded_year != null && { foundedYear: body.founded_year }),
        ...(body.website_url != null && { websiteUrl: body.website_url }),
        ...(body.linkedin_url != null && { linkedinUrl: body.linkedin_url }),
        ...(body.headquarters != null && { headquarters: body.headquarters }),
        ...(body.tech_stack != null && { techStack: body.tech_stack }),
        ...(body.benefits != null && { benefits: body.benefits }),
        ...(body.culture != null && { culture: body.culture }),
      },
    });

    return successResponse(req, { profile: mapProfile(profile) });
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(p: any) {
  return {
    id: p.id,
    organization_id: p.organizationId,
    logo_url: p.logoUrl,
    cover_image_url: p.coverImageUrl,
    tagline: p.tagline,
    description: p.description,
    industry: p.industry,
    company_size: p.companySize,
    founded_year: p.foundedYear,
    website_url: p.websiteUrl,
    linkedin_url: p.linkedinUrl,
    headquarters: p.headquarters,
    tech_stack: p.techStack,
    benefits: p.benefits,
    culture: p.culture,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}
