import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/db', () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    auditEvent: { create: vi.fn() },
  },
}));

vi.mock('@/lib/server/audit', () => ({
  writeAuditEvent: vi.fn(),
}));

vi.mock('@/server/observability/logger', () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { prisma } from '@/lib/server/db';

describe('Jobs Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('F-011: Job Creation', () => {
    it('rejects missing title', async () => {
      const { createJob } = await import('@/server/jobs/actions');
      const result = await createJob({
        organizationId: '00000000-0000-0000-0000-000000000001',
        createdById: '00000000-0000-0000-0000-000000000002',
        title: '',
        description: 'A valid description for the job posting',
        employmentType: 'full_time',
        experienceLevel: 'mid',
      } as never);
      expect(result.success).toBe(false);
    });

    it('creates job with valid input', async () => {
      vi.mocked(prisma.job.create).mockResolvedValueOnce({
        id: 'job-1',
        title: 'Senior Engineer',
        status: 'draft',
        organizationId: '00000000-0000-0000-0000-000000000001',
      } as never);

      const { createJob } = await import('@/server/jobs/actions');
      const result = await createJob({
        organizationId: '00000000-0000-0000-0000-000000000001',
        createdById: '00000000-0000-0000-0000-000000000002',
        title: 'Senior Engineer',
        description: 'Build amazing things with our team',
        employmentType: 'full_time',
        experienceLevel: 'senior',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.job.status).toBe('draft');
      }
    });

    it('rejects invalid employment type', async () => {
      const { createJob } = await import('@/server/jobs/actions');
      const result = await createJob({
        organizationId: '00000000-0000-0000-0000-000000000001',
        createdById: '00000000-0000-0000-0000-000000000002',
        title: 'Engineer',
        description: 'Valid description here',
        employmentType: 'invalid_type' as never,
        experienceLevel: 'mid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('F-011: Job Publishing', () => {
    it('rejects publish of non-existent job', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValueOnce(null);

      const { publishJob } = await import('@/server/jobs/actions');
      const result = await publishJob('nonexistent', 'actor-1', 'tenant-1');
      expect(result.success).toBe(false);
    });

    it('rejects publish from wrong tenant', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValueOnce({
        id: 'job-1',
        organizationId: 'other-tenant',
        status: 'draft',
      } as never);

      const { publishJob } = await import('@/server/jobs/actions');
      const result = await publishJob('job-1', 'actor-1', 'tenant-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authorized');
    });

    it('rejects double publish', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValueOnce({
        id: 'job-1',
        organizationId: 'tenant-1',
        status: 'published',
      } as never);

      const { publishJob } = await import('@/server/jobs/actions');
      const result = await publishJob('job-1', 'actor-1', 'tenant-1');
      expect(result.success).toBe(false);
    });

    it('publishes draft job successfully', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValueOnce({
        id: 'job-1',
        organizationId: 'tenant-1',
        status: 'draft',
      } as never);
      vi.mocked(prisma.job.update).mockResolvedValueOnce({
        id: 'job-1',
        status: 'published',
        publishedAt: new Date(),
      } as never);

      const { publishJob } = await import('@/server/jobs/actions');
      const result = await publishJob('job-1', 'actor-1', 'tenant-1');
      expect(result.success).toBe(true);
    });
  });

  describe('F-012: Job Listing', () => {
    it('returns paginated results', async () => {
      vi.mocked(prisma.job.findMany).mockResolvedValueOnce([
        { id: 'job-1', title: 'Engineer' },
      ] as never);
      vi.mocked(prisma.job.count).mockResolvedValueOnce(1);

      const { listJobs } = await import('@/server/jobs/actions');
      const result = await listJobs({ page: 1, limit: 20 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.pagination.total).toBe(1);
      }
    });

    it('rejects invalid page number', async () => {
      const { listJobs } = await import('@/server/jobs/actions');
      const result = await listJobs({ page: 0, limit: 20 });
      expect(result.success).toBe(false);
    });
  });

  describe('F-162: Job Freshness', () => {
    it('scores recent jobs higher', async () => {
      const { computeFreshnessScore } = await import('@/server/jobs/actions');
      expect(computeFreshnessScore(new Date())).toBe(100);
      expect(computeFreshnessScore(null)).toBe(0);
    });
  });
});
