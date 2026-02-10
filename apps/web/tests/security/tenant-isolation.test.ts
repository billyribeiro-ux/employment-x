import { describe, it, expect } from 'vitest';

import {
  requireTenantContext,
  assertTenantMatch,
  tenantWhere,
  tenantWhereWithId,
  withTenantScope,
  createTenantRepository,
  AppError,
  type TenantContext,
} from '../../src/lib/server';

const TENANT_A: TenantContext = { tenantId: 'tenant-aaa', userId: 'user-1', role: 'employer' };
const TENANT_B: TenantContext = { tenantId: 'tenant-bbb', userId: 'user-2', role: 'employer' };

describe('[F-156] Cross-tenant Access Test Harness', () => {
  describe('requireTenantContext', () => {
    it('returns valid context when all fields present', () => {
      const ctx = requireTenantContext({ tenantId: 'tid', userId: 'uid', role: 'employer' });
      expect(ctx.tenantId).toBe('tid');
      expect(ctx.userId).toBe('uid');
      expect(ctx.role).toBe('employer');
    });

    it('throws UNAUTHORIZED when tenantId is missing', () => {
      expect(() => requireTenantContext({ userId: 'uid', role: 'employer' })).toThrow(AppError);
      try {
        requireTenantContext({ userId: 'uid', role: 'employer' });
      } catch (e) {
        expect((e as AppError).code).toBe('UNAUTHORIZED');
      }
    });

    it('throws UNAUTHORIZED when userId is missing', () => {
      expect(() => requireTenantContext({ tenantId: 'tid', role: 'employer' })).toThrow(AppError);
    });

    it('throws UNAUTHORIZED when role is missing', () => {
      expect(() => requireTenantContext({ tenantId: 'tid', userId: 'uid' })).toThrow(AppError);
    });
  });

  describe('assertTenantMatch', () => {
    it('passes when tenant IDs match', () => {
      expect(() => assertTenantMatch(TENANT_A, 'tenant-aaa')).not.toThrow();
    });

    it('throws TENANT_MISMATCH when tenant IDs differ', () => {
      expect(() => assertTenantMatch(TENANT_A, 'tenant-bbb')).toThrow(AppError);
      try {
        assertTenantMatch(TENANT_A, 'tenant-bbb');
      } catch (e) {
        expect((e as AppError).code).toBe('TENANT_MISMATCH');
        expect((e as AppError).status).toBe(403);
      }
    });
  });

  describe('tenantWhere', () => {
    it('returns scoped where clause for tenant A', () => {
      expect(tenantWhere(TENANT_A)).toEqual({ tenant_id: 'tenant-aaa' });
    });

    it('returns scoped where clause for tenant B', () => {
      expect(tenantWhere(TENANT_B)).toEqual({ tenant_id: 'tenant-bbb' });
    });

    it('tenant A where clause never matches tenant B', () => {
      const whereA = tenantWhere(TENANT_A);
      const whereB = tenantWhere(TENANT_B);
      expect(whereA.tenant_id).not.toBe(whereB.tenant_id);
    });
  });

  describe('tenantWhereWithId', () => {
    it('scopes by both tenant and resource ID', () => {
      expect(tenantWhereWithId(TENANT_A, 'res-1')).toEqual({
        tenant_id: 'tenant-aaa',
        id: 'res-1',
      });
    });

    it('different tenants produce different where clauses for same resource', () => {
      const a = tenantWhereWithId(TENANT_A, 'res-1');
      const b = tenantWhereWithId(TENANT_B, 'res-1');
      expect(a.tenant_id).not.toBe(b.tenant_id);
      expect(a.id).toBe(b.id);
    });
  });

  describe('withTenantScope', () => {
    it('injects tenant_id into data object', () => {
      const result = withTenantScope(TENANT_A, { name: 'test' });
      expect(result).toEqual({ name: 'test', tenant_id: 'tenant-aaa' });
    });

    it('does not allow overriding tenant_id from data', () => {
      const result = withTenantScope(TENANT_A, { tenant_id: 'attacker-tenant' });
      expect(result.tenant_id).toBe('tenant-aaa');
    });
  });

  describe('createTenantRepository', () => {
    const mockRecords = [
      { id: '1', tenant_id: 'tenant-aaa', name: 'Record A1' },
      { id: '2', tenant_id: 'tenant-aaa', name: 'Record A2' },
      { id: '3', tenant_id: 'tenant-bbb', name: 'Record B1' },
    ];

    const mockDelegate = {
      findMany: async (args: { where: Record<string, unknown> }) => {
        return mockRecords.filter((r) => {
          return Object.entries(args.where).every(
            ([k, v]) => r[k as keyof typeof r] === v,
          );
        });
      },
      findFirst: async (args: { where: Record<string, unknown> }) => {
        return (
          mockRecords.find((r) => {
            return Object.entries(args.where).every(
              ([k, v]) => r[k as keyof typeof r] === v,
            );
          }) ?? null
        );
      },
      count: async (args: { where: Record<string, unknown> }) => {
        return mockRecords.filter((r) => {
          return Object.entries(args.where).every(
            ([k, v]) => r[k as keyof typeof r] === v,
          );
        }).length;
      },
    };

    it('findMany only returns records for the scoped tenant', async () => {
      const repoA = createTenantRepository(mockDelegate, TENANT_A);
      const results = await repoA.findMany();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.tenant_id === 'tenant-aaa')).toBe(true);
    });

    it('findMany for tenant B does not return tenant A records', async () => {
      const repoB = createTenantRepository(mockDelegate, TENANT_B);
      const results = await repoB.findMany();
      expect(results).toHaveLength(1);
      expect(results[0]?.tenant_id).toBe('tenant-bbb');
    });

    it('findFirst returns null when resource belongs to different tenant', async () => {
      const repoB = createTenantRepository(mockDelegate, TENANT_B);
      const result = await repoB.findFirst({ id: '1' });
      expect(result).toBeNull();
    });

    it('findByIdOrThrow throws NOT_FOUND for cross-tenant access', async () => {
      const repoB = createTenantRepository(mockDelegate, TENANT_B);
      await expect(repoB.findByIdOrThrow('1')).rejects.toThrow(AppError);
      try {
        await repoB.findByIdOrThrow('1');
      } catch (e) {
        expect((e as AppError).code).toBe('NOT_FOUND');
      }
    });

    it('findByIdOrThrow succeeds for same-tenant access', async () => {
      const repoA = createTenantRepository(mockDelegate, TENANT_A);
      const result = await repoA.findByIdOrThrow('1');
      expect(result.id).toBe('1');
      expect(result.tenant_id).toBe('tenant-aaa');
    });

    it('count is tenant-scoped', async () => {
      const repoA = createTenantRepository(mockDelegate, TENANT_A);
      const repoB = createTenantRepository(mockDelegate, TENANT_B);
      expect(await repoA.count()).toBe(2);
      expect(await repoB.count()).toBe(1);
    });
  });
});
