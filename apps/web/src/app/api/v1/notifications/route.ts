import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse } from '@/lib/server/errors';
import { prisma } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));

    const where: Record<string, unknown> = { userId: ctx.userId };
    if (unreadOnly) where['readAt'] = null;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({ where: { userId: ctx.userId, readAt: null } }),
    ]);

    return successResponse(req, {
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        resource_type: n.resourceType,
        resource_id: n.resourceId,
        read_at: n.readAt?.toISOString() ?? null,
        created_at: n.createdAt.toISOString(),
      })),
      unread_count: unreadCount,
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const body = await req.json();

    if (body.mark_all_read) {
      await prisma.notification.updateMany({
        where: { userId: ctx.userId, readAt: null },
        data: { readAt: new Date() },
      });
      return successResponse(req, { success: true });
    }

    if (body.notification_ids && Array.isArray(body.notification_ids)) {
      await prisma.notification.updateMany({
        where: { id: { in: body.notification_ids }, userId: ctx.userId, readAt: null },
        data: { readAt: new Date() },
      });
      return successResponse(req, { success: true });
    }

    return successResponse(req, { success: false });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
