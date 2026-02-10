'use server';

import { z } from 'zod';

import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';
import { logger } from '@/server/observability/logger';

// --- F-006: Candidate Profile ---

const CandidateProfileSchema = z.object({
  userId: z.string().uuid(),
  headline: z.string().max(200).optional(),
  summary: z.string().max(5000).optional(),
  skills: z.array(z.string()).max(50).optional(),
  experienceYears: z.number().int().min(0).max(50).optional(),
  locationCity: z.string().max(100).optional(),
  locationState: z.string().max(100).optional(),
  locationCountry: z.string().max(100).optional(),
  remoteOnly: z.boolean().optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  salaryCurrency: z.string().max(3).optional(),
  availableFrom: z.string().datetime().optional(),
  resumeUrl: z.string().url().optional(),
});

export type CandidateProfileInput = z.infer<typeof CandidateProfileSchema>;

export async function upsertCandidateProfile(input: CandidateProfileInput) {
  const log = logger.child({ action: 'upsert_candidate_profile', userId: input.userId });
  const parsed = CandidateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { userId, ...data } = parsed.data;

  const profile = await prisma.candidateProfile.upsert({
    where: { userId },
    create: {
      userId,
      headline: data.headline ?? null,
      summary: data.summary ?? null,
      skills: data.skills ?? [],
      experienceYears: data.experienceYears ?? null,
      locationCity: data.locationCity ?? null,
      locationState: data.locationState ?? null,
      locationCountry: data.locationCountry ?? null,
      remoteOnly: data.remoteOnly ?? false,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      ...(data.salaryCurrency ? { salaryCurrency: data.salaryCurrency } : {}),
      ...(data.availableFrom ? { availableFrom: new Date(data.availableFrom) } : {}),
      resumeUrl: data.resumeUrl ?? null,
    },
    update: {
      ...(data.headline !== undefined ? { headline: data.headline } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(data.skills !== undefined ? { skills: data.skills } : {}),
      ...(data.experienceYears !== undefined ? { experienceYears: data.experienceYears } : {}),
      ...(data.locationCity !== undefined ? { locationCity: data.locationCity } : {}),
      ...(data.locationState !== undefined ? { locationState: data.locationState } : {}),
      ...(data.locationCountry !== undefined ? { locationCountry: data.locationCountry } : {}),
      ...(data.remoteOnly !== undefined ? { remoteOnly: data.remoteOnly } : {}),
      ...(data.salaryMin !== undefined ? { salaryMin: data.salaryMin } : {}),
      ...(data.salaryMax !== undefined ? { salaryMax: data.salaryMax } : {}),
      ...(data.salaryCurrency !== undefined ? { salaryCurrency: data.salaryCurrency } : {}),
      ...(data.availableFrom ? { availableFrom: new Date(data.availableFrom) } : {}),
      ...(data.resumeUrl !== undefined ? { resumeUrl: data.resumeUrl } : {}),
    },
  });

  await writeAuditEvent(
    { tenantId: userId, userId, role: 'candidate' },
    { action: 'user.update', resourceType: 'candidate_profile', resourceId: profile.id },
  );

  log.info({ profileId: profile.id }, 'Candidate profile upserted');
  return { success: true as const, profile };
}

export async function getCandidateProfile(userId: string) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  return profile;
}

// --- F-010: Employer Profile ---

const EmployerProfileSchema = z.object({
  organizationId: z.string().uuid(),
  actorId: z.string().uuid(),
  actorRole: z.string(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  industry: z.string().max(100).optional(),
  companySize: z.string().max(50).optional(),
  websiteUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  headquarters: z.string().max(200).optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  benefits: z.array(z.string()).max(30).optional(),
  techStack: z.array(z.string()).max(50).optional(),
  culture: z.string().max(5000).optional(),
});

export type EmployerProfileInput = z.infer<typeof EmployerProfileSchema>;

export async function upsertEmployerProfile(input: EmployerProfileInput) {
  const log = logger.child({ action: 'upsert_employer_profile', orgId: input.organizationId });
  const parsed = EmployerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { organizationId, actorId, actorRole, ...data } = parsed.data;

  if (actorRole !== 'employer' && actorRole !== 'admin') {
    return { success: false as const, error: { role: ['Only employers and admins can update employer profiles'] } };
  }

  const profile = await prisma.employerProfile.upsert({
    where: { organizationId },
    create: {
      organizationId,
      tagline: data.tagline ?? null,
      description: data.description ?? null,
      industry: data.industry ?? null,
      companySize: data.companySize ?? null,
      websiteUrl: data.websiteUrl ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      logoUrl: data.logoUrl ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      headquarters: data.headquarters ?? null,
      foundedYear: data.foundedYear ?? null,
      benefits: data.benefits ?? [],
      techStack: data.techStack ?? [],
      culture: data.culture ?? null,
    },
    update: {
      ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.industry !== undefined ? { industry: data.industry } : {}),
      ...(data.companySize !== undefined ? { companySize: data.companySize } : {}),
      ...(data.websiteUrl !== undefined ? { websiteUrl: data.websiteUrl } : {}),
      ...(data.linkedinUrl !== undefined ? { linkedinUrl: data.linkedinUrl } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
      ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl } : {}),
      ...(data.headquarters !== undefined ? { headquarters: data.headquarters } : {}),
      ...(data.foundedYear !== undefined ? { foundedYear: data.foundedYear } : {}),
      ...(data.benefits !== undefined ? { benefits: data.benefits } : {}),
      ...(data.techStack !== undefined ? { techStack: data.techStack } : {}),
      ...(data.culture !== undefined ? { culture: data.culture } : {}),
    },
  });

  await writeAuditEvent(
    { tenantId: organizationId, userId: actorId, role: actorRole },
    { action: 'user.update', resourceType: 'employer_profile', resourceId: profile.id },
  );

  log.info({ profileId: profile.id }, 'Employer profile upserted');
  return { success: true as const, profile };
}

export async function getEmployerProfile(organizationId: string) {
  const profile = await prisma.employerProfile.findUnique({ where: { organizationId } });
  return profile;
}

// --- F-159: Preference Matrix ---

export interface PreferenceMatrix {
  remotePreference: 'remote_only' | 'hybrid' | 'onsite' | 'flexible';
  salaryRange: { min: number; max: number; currency: string };
  experienceRange: { min: number; max: number };
  skills: string[];
  locations: string[];
  employmentTypes: string[];
}

export function computeMatchScore(
  candidateProfile: { skills: string[]; experienceYears: number | null; remoteOnly: boolean; salaryMin: number | null; salaryMax: number | null },
  jobRequirements: { skills: string[]; experienceLevel: string; remote: boolean; salaryMin: number | null; salaryMax: number | null },
): number {
  let score = 0;
  const maxScore = 100;

  // Skill match (40 points)
  if (jobRequirements.skills.length > 0 && candidateProfile.skills.length > 0) {
    const candidateSkillsLower = candidateProfile.skills.map((s) => s.toLowerCase());
    const jobSkillsLower = jobRequirements.skills.map((s) => s.toLowerCase());
    const matched = jobSkillsLower.filter((s) => candidateSkillsLower.includes(s)).length;
    score += Math.round((matched / jobSkillsLower.length) * 40);
  }

  // Remote match (20 points)
  if (candidateProfile.remoteOnly && jobRequirements.remote) score += 20;
  else if (!candidateProfile.remoteOnly) score += 15;

  // Salary match (20 points)
  if (candidateProfile.salaryMin && jobRequirements.salaryMin && jobRequirements.salaryMax) {
    const candidateMid = candidateProfile.salaryMax
      ? (candidateProfile.salaryMin + candidateProfile.salaryMax) / 2
      : candidateProfile.salaryMin;
    if (candidateMid >= jobRequirements.salaryMin &&
        candidateMid <= jobRequirements.salaryMax) {
      score += 20;
    } else if (candidateMid <= jobRequirements.salaryMax * 1.1) {
      score += 10;
    }
  } else {
    score += 10; // Neutral if no salary data
  }

  // Experience match (20 points)
  const expMap: Record<string, number> = { entry: 1, mid: 3, senior: 6, lead: 8, executive: 12 };
  const requiredYears = expMap[jobRequirements.experienceLevel] ?? 3;
  if (candidateProfile.experienceYears != null) {
    const diff = Math.abs(candidateProfile.experienceYears - requiredYears);
    if (diff <= 1) score += 20;
    else if (diff <= 3) score += 12;
    else score += 5;
  } else {
    score += 10;
  }

  return Math.min(score, maxScore);
}
