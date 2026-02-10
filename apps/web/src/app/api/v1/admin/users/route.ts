import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { prisma } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    if (ctx.role !== 'admin') throw new AppError('FORBIDDEN', 'Admin access required');

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;
    const search = url.searchParams.get('q');
    const role = url.searchParams.get('role');

    const where: Record<string, unknown> = {};
    if (search) {
      where['OR'] = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where['role'] = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, emailVerified: true, organizationId: true,
          createdAt: true, updatedAt: true,
          _count: { select: { sessions: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse(req, {
      data: users.map((u) => ({
        id: u.id, email: u.email, first_name: u.firstName, last_name: u.lastName,
        role: u.role, email_verified: u.emailVerified, organization_id: u.organizationId,
        active_sessions: u._count.sessions,
        created_at: u.createdAt.toISOString(), updated_at: u.updatedAt.toISOString(),
      })),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    if (ctx.role !== 'admin') throw new AppError('FORBIDDEN', 'Admin access required');

    const body = await req.json();
    const { user_id, role, email_verified, suspended } = body;

    if (!user_id) throw new AppError('VALIDATION_ERROR', 'user_id is required');

    const data: Record<string, unknown> = {};
    if (role != null) data['role'] = role;
    if (email_verified != null) data['emailVerified'] = email_verified;

    if (suspended === true) {
      await prisma.session.deleteMany({ where: { userId: user_id } });
    }

    const updated = await prisma.user.update({
      where: { id: user_id },
      data,
      select: { id: true, email: true, role: true, emailVerified: true },
    });

    await writeAuditEvent(
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
      {
        action: 'user.role_change',
        resourceType: 'user',
        resourceId: user_id,
        metadata: { changes: body },
        correlationId: getCorrelationId(req),
      },
    );

    return successResponse(req, updated);
  } catch (err) {
    return handleRouteError(req, err);
  }
}
