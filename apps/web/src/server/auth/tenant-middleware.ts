import { getServerSession } from 'next-auth';
import { type NextRequest } from 'next/server';

import { authOptions } from './next-auth';

export interface TenantContext {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  organizationId: string | null;
  orgRole: string | null;
  correlationId: string;
}

export async function resolveTenantContext(req?: NextRequest): Promise<TenantContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new AuthRequiredError();
  }

  const correlationId =
    req?.headers.get('x-correlation-id') ??
    req?.headers.get('x-request-id') ??
    crypto.randomUUID();

  return {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    tenantId: session.user.organizationId ?? session.user.id,
    organizationId: session.user.organizationId,
    orgRole: session.user.orgRole,
    correlationId,
  };
}

export class AuthRequiredError extends Error {
  public readonly statusCode = 401;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export class TenantAccessError extends Error {
  public readonly statusCode = 403;
  constructor(message = 'Tenant access denied') {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export function assertTenantAccess(ctx: TenantContext, resourceTenantId: string): void {
  if (ctx.role === 'admin') return;
  if (ctx.tenantId !== resourceTenantId) {
    throw new TenantAccessError(
      `Tenant boundary violation: user tenant ${ctx.tenantId} cannot access resource tenant ${resourceTenantId}`,
    );
  }
}
