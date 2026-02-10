import { type NextRequest } from 'next/server';

import { loginUser } from '@/lib/server/auth';
import { handleRouteError, successResponse } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limit';
import { writeAuditEvent } from '@/lib/server/audit';

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req, 'auth:login', RATE_LIMITS.auth);

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      const { AppError } = await import('@/lib/server/errors');
      throw new AppError('VALIDATION_ERROR', 'Missing required fields: email, password');
    }

    const result = await loginUser({
      email,
      password,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    await writeAuditEvent(
      { tenantId: result.user_id, userId: result.user_id, role: 'unknown' },
      {
        action: 'auth.login',
        resourceType: 'session',
        correlationId: getCorrelationId(req),
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      },
    );

    return successResponse(req, result);
  } catch (err) {
    return handleRouteError(req, err);
  }
}
