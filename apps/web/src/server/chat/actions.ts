'use server';

import { z } from 'zod';

import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';
import { logger } from '@/server/observability/logger';

// --- F-016: Private Conversations ---

const CreateConversationSchema = z.object({
  tenantId: z.string().uuid(),
  creatorId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()).min(1).max(20),
  subject: z.string().max(200).optional(),
});

export async function createConversation(input: z.infer<typeof CreateConversationSchema>) {
  const log = logger.child({ action: 'create_conversation', tenantId: input.tenantId });
  const parsed = CreateConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { tenantId, creatorId, participantIds, subject } = parsed.data;
  const allParticipants = [...new Set([creatorId, ...participantIds])];

  // F-185: Dedupe — check if a conversation with exactly these participants already exists
  const existing = await findExistingConversation(tenantId, allParticipants);
  if (existing) {
    log.info({ conversationId: existing.id }, 'Returning existing conversation (dedupe)');
    return { success: true as const, conversation: existing, deduplicated: true };
  }

  const conversation = await prisma.conversation.create({
    data: {
      tenantId,
      subject: subject ?? null,
      participants: {
        create: allParticipants.map((userId) => ({ userId })),
      },
    },
    include: { participants: { select: { userId: true } } },
  });

  await writeAuditEvent(
    { tenantId, userId: creatorId, role: 'employer' },
    { action: 'conversation.create', resourceType: 'conversation', resourceId: conversation.id },
  );

  log.info({ conversationId: conversation.id, participantCount: allParticipants.length }, 'Conversation created');
  return { success: true as const, conversation, deduplicated: false };
}

async function findExistingConversation(tenantId: string, participantIds: string[]) {
  const sorted = [...participantIds].sort();

  const conversations = await prisma.conversation.findMany({
    where: {
      tenantId,
      participants: { every: { userId: { in: sorted } } },
    },
    include: { participants: { select: { userId: true } } },
  });

  for (const conv of conversations) {
    const convParticipants = conv.participants.map((p) => p.userId).sort();
    if (convParticipants.length === sorted.length &&
        convParticipants.every((id, i) => id === sorted[i])) {
      return conv;
    }
  }

  return null;
}

// --- F-017: Send/Receive Messages + Read Receipts ---

const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  body: z.string().min(1).max(10000),
  idempotencyKey: z.string().max(100).optional(),
});

export async function sendMessage(input: z.infer<typeof SendMessageSchema>) {
  const log = logger.child({ action: 'send_message', conversationId: input.conversationId });
  const parsed = SendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { conversationId, senderId, tenantId, body, idempotencyKey } = parsed.data;

  // Verify sender is a participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: senderId },
  });
  if (!participant) {
    return { success: false as const, error: 'Not a participant in this conversation' };
  }

  // Verify tenant boundary
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.tenantId !== tenantId) {
    return { success: false as const, error: 'Conversation not found' };
  }

  // F-185: Idempotency — check for duplicate message
  if (idempotencyKey) {
    const existingKey = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existingKey?.response) {
      log.info({ idempotencyKey }, 'Returning cached message (idempotent)');
      return existingKey.response as { success: true; message: unknown };
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      body,
    },
  });

  // Touch conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  const result = { success: true as const, message };

  // Store idempotency key
  if (idempotencyKey) {
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        response: result as never,
        statusCode: 200,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  log.info({ messageId: message.id, conversationId }, 'Message sent');
  return result;
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
  tenantId: string,
  page: number = 1,
  limit: number = 50,
) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.tenantId !== tenantId) {
    return { success: false as const, error: 'Conversation not found' };
  }

  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });
  if (!participant) {
    return { success: false as const, error: 'Not a participant' };
  }

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, body: true, createdAt: true,
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);

  return {
    success: true as const,
    data: messages,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function markMessagesRead(conversationId: string, userId: string) {
  const log = logger.child({ action: 'mark_read', conversationId, userId });

  // Update the participant's lastReadAt timestamp
  const result = await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });

  log.info({ updated: result.count }, 'Read receipt updated');
  return { success: true as const, markedCount: result.count };
}

export async function getUserConversations(userId: string, tenantId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      tenantId,
      participants: { some: { userId } },
    },
    include: {
      participants: {
        select: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { body: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return { success: true as const, conversations };
}
