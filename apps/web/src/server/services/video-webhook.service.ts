import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';
import { WebhookReceiver } from 'livekit-server-sdk';
import { getEnv } from '@/lib/env';
import { getVideoProviderAdapter } from '@/server/services/video-provider-adapter';

// --- Normalized event type ---

type NormalizedEvent = {
  eventId: string;
  eventType: string;
  roomName?: string | undefined;
  participantIdentity?: string | undefined;
  raw: Record<string, unknown>;
};

// --- Helpers ---

function isDemoMode(): boolean {
  const env = getEnv();
  return env.DEMO_MODE_ENABLED === true || env.NODE_ENV === 'test';
}

function getLiveKitWebhookReceiver(): WebhookReceiver {
  const env = getEnv();
  return new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
}

function normalizeLiveKitEvent(e: Record<string, unknown>): NormalizedEvent {
  const eventId = String((e['id'] ?? e['eventId'] ?? crypto.randomUUID()));
  const eventType = String((e['event'] ?? e['type'] ?? 'unknown'));

  const room = e['room'] as Record<string, unknown> | undefined;
  const participant = e['participant'] as Record<string, unknown> | undefined;

  const roomName = room?.['name'] ?? e['roomName'] ?? room?.['sid'] ?? undefined;
  const participantIdentity = participant?.['identity'] ?? e['participantIdentity'] ?? undefined;

  return {
    eventId,
    eventType,
    roomName: roomName ? String(roomName) : undefined,
    participantIdentity: participantIdentity ? String(participantIdentity) : undefined,
    raw: e,
  };
}

// --- Public API ---

export async function verifyAndParseEvent(
  rawBody: string,
  authorization: string | null,
): Promise<NormalizedEvent> {
  if (isDemoMode()) {
    // Demo/test: skip real signature verification, parse JSON directly
    const adapter = getVideoProviderAdapter();
    const sigValid = adapter.verifyWebhookSignature(rawBody, authorization ?? '');
    if (!sigValid) {
      throw new Error('WEBHOOK_SIGNATURE_INVALID');
    }
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    return normalizeLiveKitEvent(parsed);
  }

  // Production: use LiveKit WebhookReceiver
  if (!authorization) {
    throw new Error('WEBHOOK_SIGNATURE_INVALID: Missing Authorization header');
  }

  try {
    const receiver = getLiveKitWebhookReceiver();
    const parsed = await receiver.receive(rawBody, authorization);
    return normalizeLiveKitEvent(parsed as unknown as Record<string, unknown>);
  } catch {
    throw new Error('WEBHOOK_SIGNATURE_INVALID: Invalid LiveKit webhook signature');
  }
}

export async function handleProviderEvent(
  event: NormalizedEvent,
  correlationId: string,
): Promise<{ processed: boolean }> {
  const log = logger.child({ service: 'video-webhook', eventId: event.eventId, eventType: event.eventType });

  const idempotencyKey = `video_webhook:${event.eventId}`;

  // Idempotency check
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key: idempotencyKey },
    select: { key: true },
  });
  if (existing) {
    log.info('Duplicate webhook event, skipping');
    return { processed: false };
  }

  if (!event.roomName) {
    // Unknown room payload — persist idempotency to avoid retry storms
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        scope: 'video_webhook',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    log.warn('Webhook event has no roomName, skipping');
    return { processed: false };
  }

  const meeting = await prisma.meeting.findFirst({
    where: { providerRoomName: event.roomName },
    select: { id: true, tenantId: true, status: true },
  });

  if (!meeting) {
    log.warn({ roomName: event.roomName }, 'Meeting not found for webhook room name');
    return { processed: false };
  }

  const userId = event.participantIdentity; // identity = userId by design

  await prisma.$transaction(async (tx) => {
    // Persist idempotency key inside transaction
    await tx.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        scope: 'video_webhook',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const type = event.eventType.toLowerCase();

    // Map LiveKit event names to lifecycle actions
    const isJoin =
      type.includes('participant_joined') ||
      type.includes('participant_connected') ||
      type.includes('track_published');

    const isLeft =
      type.includes('participant_left') ||
      type.includes('participant_disconnected');

    const isRoomStarted =
      type.includes('room_started') ||
      type.includes('room_created');

    const isRoomFinished =
      type.includes('room_finished') ||
      type.includes('room_ended') ||
      type.includes('room_deleted');

    if (isRoomStarted) {
      await tx.videoSession.updateMany({
        where: { meetingId: meeting.id, status: 'CREATED' },
        data: { status: 'ACTIVE', startedAt: new Date() },
      });
      await tx.meetingEvent.create({
        data: {
          tenantId: meeting.tenantId,
          meetingId: meeting.id,
          actorUserId: null,
          type: 'ROOM_CREATED',
          correlationId,
          payloadJson: { providerEventId: event.eventId, eventType: event.eventType },
        },
      });
    }

    if (isJoin && userId) {
      await tx.meetingParticipant.updateMany({
        where: {
          meetingId: meeting.id,
          tenantId: meeting.tenantId,
          userId,
        },
        data: {
          attendanceStatus: 'JOINED',
          joinedAt: new Date(),
        },
      });

      if (meeting.status !== 'IN_PROGRESS') {
        await tx.meeting.update({
          where: { id: meeting.id },
          data: { status: 'IN_PROGRESS' },
        });

        await tx.meetingEvent.create({
          data: {
            tenantId: meeting.tenantId,
            meetingId: meeting.id,
            actorUserId: userId,
            type: 'MEETING_STARTED',
            correlationId,
            payloadJson: { providerEventId: event.eventId, eventType: event.eventType },
          },
        });
      }
    }

    if (isLeft && userId) {
      await tx.meetingParticipant.updateMany({
        where: {
          meetingId: meeting.id,
          tenantId: meeting.tenantId,
          userId,
        },
        data: {
          attendanceStatus: 'LEFT',
          leftAt: new Date(),
        },
      });

      await tx.meetingEvent.create({
        data: {
          tenantId: meeting.tenantId,
          meetingId: meeting.id,
          actorUserId: userId,
          type: 'PARTICIPANT_LEFT',
          correlationId,
          payloadJson: { providerEventId: event.eventId, eventType: event.eventType },
        },
      });
    }

    if (isRoomFinished) {
      await tx.meeting.update({
        where: { id: meeting.id },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      });

      await tx.videoSession.updateMany({
        where: { meetingId: meeting.id, status: 'ACTIVE' },
        data: { status: 'ENDED', endedAt: new Date() },
      });

      await tx.meetingEvent.create({
        data: {
          tenantId: meeting.tenantId,
          meetingId: meeting.id,
          actorUserId: null,
          type: 'MEETING_ENDED',
          correlationId,
          payloadJson: { providerEventId: event.eventId, eventType: event.eventType },
        },
      });
    }

    // Always write a reconciliation event
    await tx.meetingEvent.create({
      data: {
        tenantId: meeting.tenantId,
        meetingId: meeting.id,
        actorUserId: userId ?? null,
        type: 'WEBHOOK_RECONCILED',
        correlationId,
        payloadJson: {
          providerEventId: event.eventId,
          eventType: event.eventType,
        },
      },
    });
  });

  log.info('Webhook event processed');
  return { processed: true };
}
