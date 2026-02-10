import { type NextRequest } from 'next/server';

import { handleRouteError, successResponse } from '@/lib/server/errors';
import { getDemoScenarios, getDemoSessionCount } from '@/lib/server/demo-scenarios';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const role = url.searchParams.get('role') ?? undefined;

    const scenarios = getDemoScenarios(role);
    const activeSessions = await getDemoSessionCount();

    return successResponse(req, {
      scenarios,
      active_sessions: activeSessions,
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
}
