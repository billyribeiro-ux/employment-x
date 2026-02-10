import { type NextRequest, NextResponse } from 'next/server';

import { getCorrelationId } from './correlation';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'TENANT_MISMATCH'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR';

const STATUS_MAP: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 422,
  TENANT_MISMATCH: 403,
  IDEMPOTENCY_CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    request_id: string;
    details?: Record<string, unknown>;
  };
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown> | undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_MAP[code];
    this.details = details;
  }
}

export function errorResponse(req: NextRequest, error: AppError): NextResponse<ApiErrorBody> {
  const correlationId = getCorrelationId(req);

  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        request_id: correlationId,
        ...(error.details ? { details: error.details } : {}),
      },
    },
    {
      status: error.status,
      headers: { 'X-Request-Id': correlationId },
    },
  );
}

export function successResponse<T>(req: NextRequest, data: T, status = 200): NextResponse<T> {
  const correlationId = getCorrelationId(req);

  return NextResponse.json(data, {
    status,
    headers: { 'X-Request-Id': correlationId },
  });
}

export function handleRouteError(req: NextRequest, err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof AppError) {
    return errorResponse(req, err);
  }

  console.error('[UNHANDLED_ERROR]', {
    correlation_id: getCorrelationId(req),
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  return errorResponse(
    req,
    new AppError('INTERNAL_ERROR', 'An unexpected error occurred'),
  );
}
