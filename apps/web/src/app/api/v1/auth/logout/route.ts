import { type NextRequest } from 'next/server';

import { logoutUser } from '@/lib/server/auth';
import { handleRouteError, successResponse } from '@/lib/server/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      const { AppError } = await import('@/lib/server/errors');
      throw new AppError('VALIDATION_ERROR', 'Missing required field: refresh_token');
    }

    await logoutUser(refresh_token);

    return successResponse(req, { success: true });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
