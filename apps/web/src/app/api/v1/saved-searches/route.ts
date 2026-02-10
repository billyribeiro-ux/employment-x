import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { withSpan, spanAttributes } from '@/lib/server/tracing';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  return withSpan('POST /v1/saved-searches', spanAttributes(req), async () => {
    try {
      const ctx = await authenticateRequest(req.headers.get('authorization'));
      const body = await req.json();
      const { name, filters, alert_enabled, alert_frequency } = body;

      if (!name || !filters) {
        throw new AppError('VALIDATION_ERROR', 'name and filters are required');
      }

      const count = await prisma.savedSearch.count({ where: { userId: ctx.userId } });
      if (count >= 25) {
        throw new AppError('FORBIDDEN', 'Maximum 25 saved searches allowed');
      }

      const search = await prisma.savedSearch.create({
        data: {
          userId: ctx.userId,
          name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filters: filters as any,
          alertEnabled: alert_enabled ?? false,
          alertFrequency: alert_frequency ?? null,
        },
      });

      return successResponse(req, mapSearch(search), 201);
    } catch (err) {
      return handleRouteError(req, err);
    }
  });
}

export async function GET(req: NextRequest) {
  return withSpan('GET /v1/saved-searches', spanAttributes(req), async () => {
    try {
      const ctx = await authenticateRequest(req.headers.get('authorization'));

      const searches = await prisma.savedSearch.findMany({
        where: { userId: ctx.userId },
        orderBy: { updatedAt: 'desc' },
      });

      return successResponse(req, { data: searches.map(mapSearch) });
    } catch (err) {
      return handleRouteError(req, err);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSearch(s: any) {
  return {
    id: s.id,
    name: s.name,
    filters: s.filters,
    alert_enabled: s.alertEnabled,
    alert_frequency: s.alertFrequency,
    last_alerted_at: s.lastAlertedAt?.toISOString() ?? null,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}
