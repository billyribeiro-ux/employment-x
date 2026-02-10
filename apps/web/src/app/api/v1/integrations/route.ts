import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getSupportedProviders, exportToAts, importFromAts } from '@/lib/server/integrations';

export async function GET(req: NextRequest) {
  try {
    await authenticateRequest(req.headers.get('authorization'));
    return successResponse(req, { providers: getSupportedProviders() });
  } catch (err) {
    return handleRouteError(req, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    if (ctx.role !== 'employer' && ctx.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only employers and admins can manage integrations');
    }

    const body = await req.json();
    const { action, provider, config, records } = body;

    if (!action || !provider) {
      throw new AppError('VALIDATION_ERROR', 'action and provider are required');
    }

    switch (action) {
      case 'export': {
        if (!records || !Array.isArray(records)) {
          throw new AppError('VALIDATION_ERROR', 'records array is required for export');
        }
        const result = await exportToAts(records, provider);
        return successResponse(req, result);
      }
      case 'import': {
        const result = await importFromAts(provider, config ?? {});
        return successResponse(req, result);
      }
      default:
        throw new AppError('VALIDATION_ERROR', `Unknown action: ${action}`);
    }
  } catch (err) {
    return handleRouteError(req, err);
  }
}
