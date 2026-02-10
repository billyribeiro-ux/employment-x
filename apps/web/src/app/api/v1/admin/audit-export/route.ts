import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, AppError } from '@/lib/server/errors';
import { prisma } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    if (ctx.role !== 'admin') throw new AppError('FORBIDDEN', 'Admin access required');

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const action = url.searchParams.get('action');
    const format = url.searchParams.get('format') ?? 'json';
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = { createdAt: { gte: since } };
    if (action) where['action'] = action;

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        actor: { select: { id: true, email: true, firstName: true, lastName: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    const rows = events.map((e) => ({
      id: e.id,
      timestamp: e.createdAt.toISOString(),
      action: e.action,
      actor_id: e.actorId,
      actor_email: e.actor?.email ?? null,
      actor_name: e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : null,
      tenant_id: e.tenantId,
      tenant_name: e.tenant.name,
      resource_type: e.resourceType,
      resource_id: e.resourceId,
      ip_address: e.ipAddress,
      correlation_id: e.correlationId,
      metadata: e.metadata,
    }));

    if (format === 'csv') {
      const headers = [
        'id', 'timestamp', 'action', 'actor_id', 'actor_email', 'actor_name',
        'tenant_id', 'tenant_name', 'resource_type', 'resource_id', 'ip_address',
        'correlation_id',
      ];
      const csvLines = [headers.join(',')];
      for (const row of rows) {
        csvLines.push(headers.map((h) => {
          const val = (row as Record<string, unknown>)[h];
          const str = val == null ? '' : String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(','));
      }
      return new NextResponse(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-export-${days}d.csv"`,
        },
      });
    }

    return NextResponse.json({
      export_date: new Date().toISOString(),
      period_days: days,
      total_events: rows.length,
      data: rows,
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
