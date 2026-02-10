import { type NextRequest } from 'next/server';

import { requestPasswordReset, resetPassword } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limit';

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req, 'auth:reset', RATE_LIMITS.auth);

    const body = await req.json();
    const { email, token, new_password } = body;

    if (token && new_password) {
      await resetPassword(token, new_password);
      return successResponse(req, { success: true });
    }

    if (email) {
      await requestPasswordReset(email);
      return successResponse(req, { message: 'If the email exists, a reset link has been sent.' });
    }

    throw new AppError('VALIDATION_ERROR', 'Provide either email (to request reset) or token + new_password (to reset)');
  } catch (err) {
    return handleRouteError(req, err);
  }
}
