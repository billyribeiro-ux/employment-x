import { createHmac, timingSafeEqual } from 'crypto';

import { type NextRequest } from 'next/server';

import { AppError } from './errors';
import { prisma } from './db';

export interface WebhookVerifyOptions {
  secret: string;
  signatureHeader: string;
  timestampHeader?: string;
  tolerance?: number;
}

export function verifyWebhookSignature(
  req: NextRequest,
  body: string,
  options: WebhookVerifyOptions,
): void {
  const signature = req.headers.get(options.signatureHeader);
  if (!signature) {
    throw new AppError('UNAUTHORIZED', 'Missing webhook signature');
  }

  if (options.timestampHeader) {
    const timestamp = req.headers.get(options.timestampHeader);
    if (timestamp) {
      const ts = parseInt(timestamp, 10);
      const tolerance = options.tolerance ?? 300;
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > tolerance) {
        throw new AppError('UNAUTHORIZED', 'Webhook timestamp outside tolerance window');
      }
    }
  }

  const expected = createHmac('sha256', options.secret).update(body).digest('hex');

  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  const sigBuffer = Buffer.from(sig, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new AppError('UNAUTHORIZED', 'Invalid webhook signature');
  }
}

export async function checkIdempotencyKey(key: string): Promise<{ exists: boolean; response: unknown | undefined; statusCode: number | undefined }> {
  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });

  if (existing) {
    if (existing.expiresAt < new Date()) {
      await prisma.idempotencyKey.delete({ where: { key } });
      return { exists: false, response: undefined, statusCode: undefined };
    }
    return {
      exists: true,
      response: existing.response,
      statusCode: existing.statusCode ?? undefined,
    };
  }

  return { exists: false, response: undefined, statusCode: undefined };
}

export async function storeIdempotencyKey(
  key: string,
  response: unknown,
  statusCode: number,
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<void> {
  await prisma.idempotencyKey.create({
    data: {
      key,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response: response as any,
      statusCode,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
}

export const WEBHOOK_CONFIGS = {
  stripe: {
    secret: process.env['STRIPE_WEBHOOK_SECRET'] ?? '',
    signatureHeader: 'stripe-signature',
    timestampHeader: undefined,
    tolerance: 300,
  },
  video: {
    secret: process.env['VIDEO_WEBHOOK_SECRET'] ?? '',
    signatureHeader: 'x-webhook-signature',
    timestampHeader: 'x-webhook-timestamp',
    tolerance: 300,
  },
} as const;
