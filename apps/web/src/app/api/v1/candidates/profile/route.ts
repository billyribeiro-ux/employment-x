import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { prisma } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    if (ctx.role !== 'candidate') {
      throw new AppError('FORBIDDEN', 'Only candidates have profiles');
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: ctx.userId },
    });

    if (!profile) {
      return successResponse(req, { profile: null });
    }

    return successResponse(req, { profile: mapProfileResponse(profile) });
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    if (ctx.role !== 'candidate') {
      throw new AppError('FORBIDDEN', 'Only candidates can update profiles');
    }

    const body = await req.json();

    const profile = await prisma.candidateProfile.upsert({
      where: { userId: ctx.userId },
      create: {
        userId: ctx.userId,
        headline: body.headline ?? null,
        summary: body.summary ?? null,
        resumeUrl: body.resume_url ?? null,
        skills: body.skills ?? [],
        experienceYears: body.experience_years ?? null,
        locationCity: body.location_city ?? null,
        locationState: body.location_state ?? null,
        locationCountry: body.location_country ?? null,
        remoteOnly: body.remote_only ?? false,
        salaryMin: body.salary_min ?? null,
        salaryMax: body.salary_max ?? null,
        salaryCurrency: body.salary_currency ?? 'USD',
        availableFrom: body.available_from ? new Date(body.available_from) : null,
      },
      update: {
        ...(body.headline != null && { headline: body.headline }),
        ...(body.summary != null && { summary: body.summary }),
        ...(body.resume_url != null && { resumeUrl: body.resume_url }),
        ...(body.skills != null && { skills: body.skills }),
        ...(body.experience_years != null && { experienceYears: body.experience_years }),
        ...(body.location_city != null && { locationCity: body.location_city }),
        ...(body.location_state != null && { locationState: body.location_state }),
        ...(body.location_country != null && { locationCountry: body.location_country }),
        ...(body.remote_only != null && { remoteOnly: body.remote_only }),
        ...(body.salary_min != null && { salaryMin: body.salary_min }),
        ...(body.salary_max != null && { salaryMax: body.salary_max }),
        ...(body.salary_currency != null && { salaryCurrency: body.salary_currency }),
        ...(body.available_from != null && { availableFrom: new Date(body.available_from) }),
      },
    });

    return successResponse(req, { profile: mapProfileResponse(profile) });
  } catch (err) {
    return handleRouteError(req, err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfileResponse(profile: any) {
  return {
    id: profile.id,
    user_id: profile.userId,
    headline: profile.headline,
    summary: profile.summary,
    resume_url: profile.resumeUrl,
    skills: profile.skills,
    experience_years: profile.experienceYears,
    location_city: profile.locationCity,
    location_state: profile.locationState,
    location_country: profile.locationCountry,
    remote_only: profile.remoteOnly,
    salary_min: profile.salaryMin,
    salary_max: profile.salaryMax,
    salary_currency: profile.salaryCurrency,
    available_from: profile.availableFrom?.toISOString() ?? null,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };
}
