import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/db', () => ({
  prisma: {
    meeting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    meetingParticipant: {
      update: vi.fn(),
    },
    meetingEvent: { create: vi.fn() },
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

describe('Meeting Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('F-019: Create Meeting', () => {
    it('rejects end time before start time', async () => {
      const { createMeeting } = await import('@/server/meetings/actions');
      const result = await createMeeting({
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        createdByUserId: 'user-1',
        title: 'Interview',
        timezone: 'UTC',
        scheduledStartAt: '2026-03-01T15:00:00Z',
        scheduledEndAt: '2026-03-01T14:00:00Z',
        participants: [{ userId: 'user-1', role: 'HOST' }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing title', async () => {
      const { createMeeting } = await import('@/server/meetings/actions');
      const result = await createMeeting({
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        createdByUserId: 'user-1',
        title: 'ab',
        timezone: 'UTC',
        scheduledStartAt: '2026-03-01T14:00:00Z',
        scheduledEndAt: '2026-03-01T15:00:00Z',
        participants: [{ userId: 'user-1', role: 'HOST' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('F-020/F-021: Respond to Meeting', () => {
    it('rejects response to non-existent meeting', async () => {
      vi.mocked(prisma.meeting.findUnique).mockResolvedValueOnce(null);

      const { respondToMeeting } = await import('@/server/meetings/actions');
      const result = await respondToMeeting('nonexistent', 'user-1', 'tenant-1', 'CONFIRMED');
      expect(result.success).toBe(false);
    });

    it('rejects response from wrong tenant', async () => {
      vi.mocked(prisma.meeting.findUnique).mockResolvedValueOnce({
        id: 'meeting-1',
        tenantId: 'other-tenant',
        status: 'REQUESTED',
        participants: [{ userId: 'user-1' }],
      } as never);

      const { respondToMeeting } = await import('@/server/meetings/actions');
      const result = await respondToMeeting('meeting-1', 'user-1', 'tenant-1', 'CONFIRMED');
      expect(result.success).toBe(false);
    });

    it('rejects response from non-participant', async () => {
      vi.mocked(prisma.meeting.findUnique).mockResolvedValueOnce({
        id: 'meeting-1',
        tenantId: 'tenant-1',
        status: 'REQUESTED',
        participants: [{ userId: 'other-user' }],
      } as never);

      const { respondToMeeting } = await import('@/server/meetings/actions');
      const result = await respondToMeeting('meeting-1', 'user-1', 'tenant-1', 'CONFIRMED');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a participant');
    });

    it('rejects response to already completed meeting', async () => {
      vi.mocked(prisma.meeting.findUnique).mockResolvedValueOnce({
        id: 'meeting-1',
        tenantId: 'tenant-1',
        status: 'COMPLETED',
        participants: [{ userId: 'user-1' }],
      } as never);

      const { respondToMeeting } = await import('@/server/meetings/actions');
      const result = await respondToMeeting('meeting-1', 'user-1', 'tenant-1', 'CONFIRMED');
      expect(result.success).toBe(false);
    });

    it('confirms meeting successfully', async () => {
      vi.mocked(prisma.meeting.findUnique).mockResolvedValueOnce({
        id: 'meeting-1',
        tenantId: 'tenant-1',
        status: 'REQUESTED',
        participants: [{ userId: 'user-1' }],
      } as never);
      vi.mocked(prisma.meeting.update).mockResolvedValueOnce({
        id: 'meeting-1',
        status: 'CONFIRMED',
      } as never);

      const { respondToMeeting } = await import('@/server/meetings/actions');
      const result = await respondToMeeting('meeting-1', 'user-1', 'tenant-1', 'CONFIRMED');
      expect(result.success).toBe(true);
    });

    it('denies meeting successfully', async () => {
      vi.mocked(prisma.meeting.findUnique).mockResolvedValueOnce({
        id: 'meeting-1',
        tenantId: 'tenant-1',
        status: 'REQUESTED',
        participants: [{ userId: 'user-1' }],
      } as never);
      vi.mocked(prisma.meeting.update).mockResolvedValueOnce({
        id: 'meeting-1',
        status: 'DENIED',
      } as never);

      const { respondToMeeting } = await import('@/server/meetings/actions');
      const result = await respondToMeeting('meeting-1', 'user-1', 'tenant-1', 'DENIED');
      expect(result.success).toBe(true);
    });
  });

  describe('F-053: Cancel Meeting', () => {
    it('rejects cancel of non-existent meeting', async () => {
      vi.mocked(prisma.meeting.findUnique).mockResolvedValueOnce(null);

      const { cancelMeeting } = await import('@/server/meetings/actions');
      const result = await cancelMeeting('nonexistent', 'user-1', 'tenant-1');
      expect(result.success).toBe(false);
    });

    it('rejects cancel of already completed meeting', async () => {
      vi.mocked(prisma.meeting.findUnique).mockResolvedValueOnce({
        id: 'meeting-1',
        tenantId: 'tenant-1',
        status: 'COMPLETED',
      } as never);

      const { cancelMeeting } = await import('@/server/meetings/actions');
      const result = await cancelMeeting('meeting-1', 'user-1', 'tenant-1');
      expect(result.success).toBe(false);
    });

    it('cancels meeting successfully', async () => {
      vi.mocked(prisma.meeting.findUnique).mockResolvedValueOnce({
        id: 'meeting-1',
        tenantId: 'tenant-1',
        status: 'CONFIRMED',
      } as never);
      vi.mocked(prisma.meeting.update).mockResolvedValueOnce({
        id: 'meeting-1',
        status: 'CANCELED',
      } as never);

      const { cancelMeeting } = await import('@/server/meetings/actions');
      const result = await cancelMeeting('meeting-1', 'user-1', 'tenant-1', 'Schedule conflict');
      expect(result.success).toBe(true);
    });
  });
});
