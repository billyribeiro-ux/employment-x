import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_TTL_HOURS = 24;

export async function withIdempotency(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const key = req.headers.get(IDEMPOTENCY_HEADER);
  if (!key) {
    return handler();
  }

  const log = logger.child({ middleware: 'idempotency', key });

  // Check for existing response
  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (existing && existing.expiresAt > new Date()) {
    log.info('Returning cached idempotent response');
    return NextResponse.json(existing.response, { status: existing.statusCode ?? 200 });
  }

  // Execute handler
  const response = await handler();
  const body = await response.clone().json();

  // Store response
  try {
    await prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        response: body,
        statusCode: response.status,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000),
      },
      update: {
        response: body,
        statusCode: response.status,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000),
      },
    });
  } catch (err) {
    log.error({ err }, 'Failed to store idempotency key');
  }

  return response;
}

export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  const result = await prisma.idempotencyKey.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
