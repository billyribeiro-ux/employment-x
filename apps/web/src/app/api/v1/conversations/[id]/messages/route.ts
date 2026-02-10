import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { checkUserRateLimit, RATE_LIMITS } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    checkUserRateLimit(ctx.userId, 'chat:send', RATE_LIMITS.chat);

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: ctx.userId } },
    });
    if (!participant) {
      throw new AppError('FORBIDDEN', 'Not a participant in this conversation');
    }

    const body = await req.json();
    if (!body.body || typeof body.body !== 'string' || body.body.trim().length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Message body is required');
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: ctx.userId,
        body: body.body.trim(),
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return successResponse(req, {
      id: message.id,
      conversation_id: message.conversationId,
      sender_id: message.senderId,
      body: message.body,
      created_at: message.createdAt.toISOString(),
    }, 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: ctx.userId } },
    });
    if (!participant) {
      throw new AppError('FORBIDDEN', 'Not a participant in this conversation');
    }

    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
    const before = url.searchParams.get('before');

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });

    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: ctx.userId } },
      data: { lastReadAt: new Date() },
    });

    return successResponse(req, {
      data: messages.map((m) => ({
        id: m.id,
        sender_id: m.senderId,
        sender_name: `${m.sender.firstName} ${m.sender.lastName}`,
        body: m.body,
        edited_at: m.editedAt?.toISOString() ?? null,
        created_at: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
