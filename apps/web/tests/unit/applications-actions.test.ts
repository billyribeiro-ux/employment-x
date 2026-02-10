import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/db', () => ({
  prisma: {
    job: { findUnique: vi.fn() },
    application: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    applicationStageEvent: { create: vi.fn() },
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
import { applyToJob, transitionStage, withdrawApplication } from '@/server/applications/actions';

describe('Application Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('F-013: Apply to Job', () => {
    it('rejects application to non-existent job', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValueOnce(null);
      const result = await applyToJob({
        jobId: '00000000-0000-0000-0000-000000000001',
        candidateId: '00000000-0000-0000-0000-000000000002',
      });
      expect(result.success).toBe(false);
    });

    it('rejects duplicate application', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValueOnce({
        id: 'job-1', status: 'published', organizationId: 'org-1',
      } as never);
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: 'existing-app',
      } as never);
      const result = await applyToJob({
        jobId: '00000000-0000-0000-0000-000000000001',
        candidateId: '00000000-0000-0000-0000-000000000002',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Already applied');
    });

    it('creates application successfully', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001', status: 'published', organizationId: 'org-1',
      } as never);
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.application.create).mockResolvedValueOnce({
        id: 'app-1', jobId: '00000000-0000-0000-0000-000000000001',
        candidateId: '00000000-0000-0000-0000-000000000002', stage: 'applied',
      } as never);
      const result = await applyToJob({
        jobId: '00000000-0000-0000-0000-000000000001',
        candidateId: '00000000-0000-0000-0000-000000000002',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('F-014: Stage Transitions', () => {
    it('rejects non-existent application', async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(null);
      const result = await transitionStage({
        applicationId: '00000000-0000-0000-0000-000000000001',
        toStage: 'screening',
        actorId: '00000000-0000-0000-0000-000000000002',
        tenantId: '00000000-0000-0000-0000-000000000099',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Application not found');
    });

    it('rejects cross-tenant stage change', async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001',
        stage: 'applied',
        job: { organizationId: '00000000-0000-0000-0000-000000000010' },
      } as never);
      const result = await transitionStage({
        applicationId: '00000000-0000-0000-0000-000000000001',
        toStage: 'screening',
        actorId: '00000000-0000-0000-0000-000000000002',
        tenantId: '00000000-0000-0000-0000-000000000099',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authorized');
    });

    it('rejects invalid transition path', async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001',
        stage: 'applied',
        job: { organizationId: '00000000-0000-0000-0000-000000000010' },
      } as never);
      const result = await transitionStage({
        applicationId: '00000000-0000-0000-0000-000000000001',
        toStage: 'offer',
        actorId: '00000000-0000-0000-0000-000000000002',
        tenantId: '00000000-0000-0000-0000-000000000010',
      });
      expect(result.success).toBe(false);
    });

    it('transitions applied to screening successfully', async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001',
        stage: 'applied',
        job: { organizationId: '00000000-0000-0000-0000-000000000010' },
      } as never);
      vi.mocked(prisma.application.update).mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001',
        stage: 'screening', updatedAt: new Date(),
      } as never);
      vi.mocked(prisma.applicationStageEvent.create).mockResolvedValueOnce({} as never);
      const result = await transitionStage({
        applicationId: '00000000-0000-0000-0000-000000000001',
        toStage: 'screening',
        actorId: '00000000-0000-0000-0000-000000000002',
        tenantId: '00000000-0000-0000-0000-000000000010',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('F-164: Withdrawal', () => {
    it('rejects withdrawal of non-existent application', async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(null);
      const result = await withdrawApplication('nonexistent', 'candidate-1');
      expect(result.success).toBe(false);
    });

    it('rejects withdrawal from terminal stage', async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: 'app-1', candidateId: 'candidate-1', stage: 'hired',
      } as never);
      const result = await withdrawApplication('app-1', 'candidate-1');
      expect(result.success).toBe(false);
    });

    it('withdraws active application successfully', async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: 'app-1', candidateId: 'candidate-1', stage: 'screening',
      } as never);
      vi.mocked(prisma.application.update).mockResolvedValueOnce({
        id: 'app-1', stage: 'withdrawn', withdrawnAt: new Date(),
      } as never);
      vi.mocked(prisma.applicationStageEvent.create).mockResolvedValueOnce({} as never);
      const result = await withdrawApplication('app-1', 'candidate-1');
      expect(result.success).toBe(true);
    });
  });
});
