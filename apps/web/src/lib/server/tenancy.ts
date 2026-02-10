import { AppError } from './errors';

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
}

export function requireTenantContext(ctx: Partial<TenantContext>): TenantContext {
  if (!ctx.tenantId || !ctx.userId || !ctx.role) {
    throw new AppError('UNAUTHORIZED', 'Missing tenant context');
  }
  return ctx as TenantContext;
}

export function assertTenantMatch(ctx: TenantContext, resourceTenantId: string): void {
  if (ctx.tenantId !== resourceTenantId) {
    throw new AppError('TENANT_MISMATCH', 'Access denied: tenant isolation violation');
  }
}

export function tenantWhere(ctx: TenantContext): { tenant_id: string } {
  return { tenant_id: ctx.tenantId };
}

export function tenantWhereWithId(ctx: TenantContext, id: string): { tenant_id: string; id: string } {
  return { tenant_id: ctx.tenantId, id };
}

export function withTenantScope<T extends Record<string, unknown>>(
  ctx: TenantContext,
  data: T,
): T & { tenant_id: string } {
  return { ...data, tenant_id: ctx.tenantId };
}

export function createTenantRepository<TModel>(
  modelDelegate: {
    findMany: (args: { where: Record<string, unknown> }) => Promise<TModel[]>;
    findFirst: (args: { where: Record<string, unknown> }) => Promise<TModel | null>;
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  },
  ctx: TenantContext,
) {
  return {
    findMany(where: Record<string, unknown> = {}): Promise<TModel[]> {
      return modelDelegate.findMany({ where: { ...where, ...tenantWhere(ctx) } });
    },
    findFirst(where: Record<string, unknown> = {}): Promise<TModel | null> {
      return modelDelegate.findFirst({ where: { ...where, ...tenantWhere(ctx) } });
    },
    count(where: Record<string, unknown> = {}): Promise<number> {
      return modelDelegate.count({ where: { ...where, ...tenantWhere(ctx) } });
    },
    findByIdOrThrow(id: string): Promise<TModel> {
      return modelDelegate.findFirst({ where: tenantWhereWithId(ctx, id) }).then((result) => {
        if (!result) {
          throw new AppError('NOT_FOUND', 'Resource not found');
        }
        return result;
      });
    },
  };
}
