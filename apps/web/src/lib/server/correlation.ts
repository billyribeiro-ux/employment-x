import { type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

const HEADER_NAME = 'x-request-id';

export function getCorrelationId(req: NextRequest): string {
  return req.headers.get(HEADER_NAME) ?? randomUUID();
}

export function withCorrelationHeaders(
  headers: Record<string, string>,
  correlationId: string,
): Record<string, string> {
  return {
    ...headers,
    [HEADER_NAME]: correlationId,
  };
}
