import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/db', () => ({
  prisma: {
    conversation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    conversationParticipant: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    idempotencyKey: {
      findUnique: vi.fn(),
      create: vi.fn(),
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
import { createConversation, sendMessage, markMessagesRead } from '@/server/chat/actions';

describe('Chat Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('F-016: Create Conversation', () => {
    it('rejects empty participant list', async () => {
      const result = await createConversation({
        tenantId: '00000000-0000-0000-0000-000000000001',
        creatorId: '00000000-0000-0000-0000-000000000002',
        participantIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('creates conversation with valid input', async () => {
      vi.mocked(prisma.conversation.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.conversation.create).mockResolvedValueOnce({
        id: 'conv-1',
        tenantId: '00000000-0000-0000-0000-000000000001',
        subject: null,
        participants: [
          { userId: '00000000-0000-0000-0000-000000000002' },
          { userId: '00000000-0000-0000-0000-000000000003' },
        ],
      } as never);
      const result = await createConversation({
        tenantId: '00000000-0000-0000-0000-000000000001',
        creatorId: '00000000-0000-0000-0000-000000000002',
        participantIds: ['00000000-0000-0000-0000-000000000003'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('F-017: Send Message', () => {
    it('rejects message from non-participant', async () => {
      vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValueOnce(null);
      const result = await sendMessage({
        conversationId: '00000000-0000-0000-0000-000000000001',
        senderId: '00000000-0000-0000-0000-000000000002',
        tenantId: '00000000-0000-0000-0000-000000000003',
        body: 'Hello',
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('Not a participant');
    });

    it('rejects message to wrong tenant conversation', async () => {
      vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValueOnce({ id: 'p-1' } as never);
      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce({
        id: 'conv-1',
        tenantId: '00000000-0000-0000-0000-000000000010',
      } as never);
      const result = await sendMessage({
        conversationId: '00000000-0000-0000-0000-000000000001',
        senderId: '00000000-0000-0000-0000-000000000002',
        tenantId: '00000000-0000-0000-0000-000000000099',
        body: 'Hello',
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('Conversation not found');
    });

    it('sends message successfully', async () => {
      vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValueOnce({ id: 'p-1' } as never);
      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: '00000000-0000-0000-0000-000000000010',
      } as never);
      vi.mocked(prisma.message.create).mockResolvedValueOnce({
        id: 'msg-1',
        conversationId: '00000000-0000-0000-0000-000000000001',
        senderId: '00000000-0000-0000-0000-000000000002',
        body: 'Hello',
      } as never);
      vi.mocked(prisma.conversation.update).mockResolvedValueOnce({} as never);
      const result = await sendMessage({
        conversationId: '00000000-0000-0000-0000-000000000001',
        senderId: '00000000-0000-0000-0000-000000000002',
        tenantId: '00000000-0000-0000-0000-000000000010',
        body: 'Hello',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('F-017: Read Receipts', () => {
    it('marks messages as read', async () => {
      vi.mocked(prisma.conversationParticipant.updateMany).mockResolvedValueOnce({ count: 1 } as never);
      const result = await markMessagesRead('conv-1', 'user-1');
      expect(result.success).toBe(true);
      expect(result.markedCount).toBe(1);
    });
  });
});
