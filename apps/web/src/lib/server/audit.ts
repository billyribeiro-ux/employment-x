import { prisma } from './db';
import { type TenantContext } from './tenancy';
import { redactPiiFromObject } from './pii';

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.password_reset'
  | 'user.update'
  | 'user.role_change'
  | 'org.create'
  | 'org.update'
  | 'org.member_add'
  | 'org.member_remove'
  | 'job.create'
  | 'job.update'
  | 'job.publish'
  | 'job.archive'
  | 'application.create'
  | 'application.stage_change'
  | 'application.withdraw'
  | 'application.bulk_action'
  | 'meeting.create'
  | 'meeting.accept'
  | 'meeting.deny'
  | 'meeting.reschedule'
  | 'meeting.cancel'
  | 'interview.start'
  | 'interview.end'
  | 'interview.feedback'
  | 'billing.subscribe'
  | 'billing.cancel'
  | 'billing.plan_change'
  | 'billing.webhook'
  | 'conversation.create'
  | 'message.send'
  | 'demo.start'
  | 'demo.reset';

export interface AuditEntry {
  action: AuditAction;
  resourceType: string;
  resourceId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string | undefined;
  correlationId?: string | undefined;
}

export async function writeAuditEvent(
  ctx: TenantContext,
  entry: AuditEntry,
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: entry.metadata ? (redactPiiFromObject(entry.metadata) as any) : undefined,
      correlationId: entry.correlationId ?? null,
      ipAddress: entry.ipAddress ?? null,
    },
  });
}

export async function getAuditTrail(
  tenantId: string,
  options: {
    resourceType?: string;
    resourceId?: string;
    actorId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { resourceType, resourceId, actorId, action, limit = 50, offset = 0 } = options;

  return prisma.auditEvent.findMany({
    where: {
      tenantId,
      ...(resourceType ? { resourceType } : {}),
      ...(resourceId ? { resourceId } : {}),
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
