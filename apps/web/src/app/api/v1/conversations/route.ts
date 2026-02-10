import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limit';
import { writeAuditEvent } from '@/lib/server/audit';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req, 'chat:create', RATE_LIMITS.chat);
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const body = await req.json();
    const { participant_ids, subject, application_id } = body;

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'participant_ids must be a non-empty array');
    }

    const allIds: string[] = [ctx.userId, ...participant_ids.filter((id: string) => id !== ctx.userId)];

    const conversation = await prisma.conversation.create({
      data: {
        tenantId: ctx.tenantId,
        subject: subject ?? null,
        applicationId: application_id ?? null,
        participants: {
          create: allIds.map((userId: string) => ({ userId })),
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });

    await writeAuditEvent(
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
      { action: 'conversation.create', resourceType: 'conversation', resourceId: conversation.id, correlationId: getCorrelationId(req) },
    );

    return successResponse(req, {
      id: conversation.id,
      subject: conversation.subject,
      application_id: conversation.applicationId,
      participants: conversation.participants.map((p) => ({
        user_id: p.userId,
        first_name: p.user.firstName,
        last_name: p.user.lastName,
      })),
      created_at: conversation.createdAt.toISOString(),
    }, 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    const conversations = await prisma.conversation.findMany({
      where: {
        tenantId: ctx.tenantId,
        participants: { some: { userId: ctx.userId } },
      },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return successResponse(req, {
      data: conversations.map((c) => ({
        id: c.id,
        subject: c.subject,
        participants: c.participants.map((p) => ({
          user_id: p.userId,
          first_name: p.user.firstName,
          last_name: p.user.lastName,
          last_read_at: p.lastReadAt?.toISOString() ?? null,
        })),
        last_message: c.messages[0] ? {
          id: c.messages[0].id,
          body: c.messages[0].body,
          sender_id: c.messages[0].senderId,
          created_at: c.messages[0].createdAt.toISOString(),
        } : null,
        updated_at: c.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
