import { type NextRequest } from 'next/server';

import { registerUser } from '@/lib/server/auth';
import { handleRouteError, successResponse } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limit';
import { writeAuditEvent } from '@/lib/server/audit';

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req, 'auth:register', RATE_LIMITS.auth);

    const body = await req.json();
    const { email, password, first_name, last_name, role } = body;

    if (!email || !password || !first_name || !last_name || !role) {
      const { AppError } = await import('@/lib/server/errors');
      throw new AppError('VALIDATION_ERROR', 'Missing required fields: email, password, first_name, last_name, role');
    }

    const result = await registerUser({
      email,
      password,
      firstName: first_name,
      lastName: last_name,
      role,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    await writeAuditEvent(
      { tenantId: result.user_id, userId: result.user_id, role },
      {
        action: 'auth.register',
        resourceType: 'user',
        resourceId: result.user_id,
        correlationId: getCorrelationId(req),
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      },
    );

    return successResponse(req, result, 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
}
