import { NextResponse, type NextRequest } from 'next/server';

import { ProviderWebhookEventSchema } from '@/lib/validation/video';
import { verifyWebhookSignature, handleProviderEvent } from '@/server/services/video-webhook.service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('authorization') ?? req.headers.get('x-webhook-signature') ?? '';

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const parsed = ProviderWebhookEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid event payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await handleProviderEvent(parsed.data);
    return NextResponse.json({ ok: true, processed: result.processed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
