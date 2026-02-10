import { NextResponse, type NextRequest } from 'next/server';

import { verifyAndParseEvent, handleProviderEvent } from '@/server/services/video-webhook.service';

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') ?? crypto.randomUUID();

  try {
    const authorization = req.headers.get('authorization');
    const rawBody = await req.text();

    const normalizedEvent = await verifyAndParseEvent(rawBody, authorization);
    const result = await handleProviderEvent(normalizedEvent, correlationId);

    return NextResponse.json(
      { ok: true, processed: result.processed },
      { status: 200, headers: { 'x-correlation-id': correlationId } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    const status = message.includes('WEBHOOK_SIGNATURE_INVALID') ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { 'x-correlation-id': correlationId } },
    );
  }
}
