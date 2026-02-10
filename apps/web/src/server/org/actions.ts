'use server';

import { z } from 'zod';

import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';
import { logger } from '@/server/observability/logger';

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  userId: z.string().uuid(),
  userRole: z.string(),
});

export type CreateOrgInput = z.infer<typeof CreateOrgSchema>;

export async function createOrganization(input: CreateOrgInput) {
  const log = logger.child({ action: 'create_org', userId: input.userId });
  const parsed = CreateOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { name, slug, userId, userRole } = parsed.data;

  if (userRole !== 'employer' && userRole !== 'admin') {
    return { success: false as const, error: { role: ['Only employers and admins can create organizations'] } };
  }

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    return { success: false as const, error: { slug: ['Organization slug already taken'] } };
  }

  const org = await prisma.organization.create({
    data: { name, slug },
  });

  await prisma.orgMembership.create({
    data: {
      userId,
      organizationId: org.id,
      role: 'owner',
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { organizationId: org.id },
  });

  await writeAuditEvent(
    { tenantId: org.id, userId, role: userRole },
    { action: 'org.create', resourceType: 'organization', resourceId: org.id },
  );

  log.info({ orgId: org.id, slug }, 'Organization created');

  return {
    success: true as const,
    organization: { id: org.id, name: org.name, slug: org.slug },
  };
}

const AddMemberSchema = z.object({
  organizationId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  role: z.enum(['admin', 'recruiter', 'interviewer', 'viewer']),
  actorId: z.string().uuid(),
  actorOrgRole: z.string(),
});

export async function addOrgMember(input: z.infer<typeof AddMemberSchema>) {
  const log = logger.child({ action: 'add_member', orgId: input.organizationId });
  const parsed = AddMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { organizationId, targetUserId, role, actorId, actorOrgRole } = parsed.data;

  // Only owners and admins can add members
  if (actorOrgRole !== 'owner' && actorOrgRole !== 'admin') {
    return { success: false as const, error: { permission: ['Only owners and admins can add members'] } };
  }

  // Owners can't be added via this flow
  if (role === 'owner' as string) {
    return { success: false as const, error: { role: ['Cannot assign owner role via member add'] } };
  }

  const existingMembership = await prisma.orgMembership.findFirst({
    where: { userId: targetUserId, organizationId },
  });

  if (existingMembership) {
    return { success: false as const, error: { member: ['User is already a member of this organization'] } };
  }

  const membership = await prisma.orgMembership.create({
    data: {
      userId: targetUserId,
      organizationId,
      role,
    },
  });

  await prisma.user.update({
    where: { id: targetUserId },
    data: { organizationId },
  });

  await writeAuditEvent(
    { tenantId: organizationId, userId: actorId, role: 'employer' },
    {
      action: 'org.member_add',
      resourceType: 'org_membership',
      resourceId: membership.id,
      metadata: { targetUserId, role },
    },
  );

  log.info({ targetUserId, role }, 'Member added to organization');

  return { success: true as const, membershipId: membership.id };
}

const RemoveMemberSchema = z.object({
  organizationId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  actorId: z.string().uuid(),
  actorOrgRole: z.string(),
});

export async function removeOrgMember(input: z.infer<typeof RemoveMemberSchema>) {
  const log = logger.child({ action: 'remove_member', orgId: input.organizationId });
  const parsed = RemoveMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { organizationId, targetUserId, actorId, actorOrgRole } = parsed.data;

  if (actorOrgRole !== 'owner' && actorOrgRole !== 'admin') {
    return { success: false as const, error: { permission: ['Only owners and admins can remove members'] } };
  }

  // Can't remove yourself if you're the only owner
  if (actorId === targetUserId) {
    const ownerCount = await prisma.orgMembership.count({
      where: { organizationId, role: 'owner' },
    });
    if (ownerCount <= 1) {
      return { success: false as const, error: { member: ['Cannot remove the last owner'] } };
    }
  }

  const deleted = await prisma.orgMembership.deleteMany({
    where: { userId: targetUserId, organizationId },
  });

  if (deleted.count === 0) {
    return { success: false as const, error: { member: ['User is not a member of this organization'] } };
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { organizationId: null },
  });

  await writeAuditEvent(
    { tenantId: organizationId, userId: actorId, role: 'employer' },
    {
      action: 'org.member_remove',
      resourceType: 'org_membership',
      metadata: { targetUserId },
    },
  );

  log.info({ targetUserId }, 'Member removed from organization');

  return { success: true as const };
}
