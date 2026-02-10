import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';
import { type ProviderWebhookEvent } from '@/lib/validation/video';
import { getVideoProviderAdapter } from '@/server/services/video-provider-adapter';
import { markParticipantJoined, markParticipantLeft } from '@/server/services/meeting-lifecycle.service';

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const adapter = getVideoProviderAdapter();
  return adapter.verifyWebhookSignature(rawBody, signature);
}

export async function handleProviderEvent(event: ProviderWebhookEvent): Promise<{ processed: boolean }> {
  const log = logger.child({ service: 'video-webhook', eventId: event.id, eventType: event.event });

  // Idempotency check
  const existingKey = await prisma.idempotencyKey.findUnique({ where: { key: `webhook-${event.id}` } });
  if (existingKey) {
    log.info('Duplicate webhook event, skipping');
    return { processed: false };
  }

  // Find meeting by provider room name
  const meeting = await prisma.meeting.findUnique({
    where: { providerRoomName: event.room.name },
  });

  if (!meeting) {
    log.warn({ roomName: event.room.name }, 'Meeting not found for webhook room name');
    return { processed: false };
  }

  const tenantId = meeting.tenantId;

  switch (event.event) {
    case 'room_started': {
      await prisma.videoSession.updateMany({
        where: { meetingId: meeting.id, status: 'CREATED' },
        data: { status: 'ACTIVE', startedAt: new Date(), providerSessionId: event.room.sid ?? null },
      });
      await prisma.meetingEvent.create({
        data: { tenantId, meetingId: meeting.id, type: 'ROOM_CREATED', payloadJson: { roomSid: event.room.sid } },
      });
      break;
    }

    case 'participant_joined': {
      if (event.participant) {
        try {
          await markParticipantJoined(tenantId, meeting.id, event.participant.identity);
        } catch {
          log.warn({ identity: event.participant.identity }, 'Failed to mark participant joined (may not be in DB)');
        }
      }
      break;
    }

    case 'participant_left': {
      if (event.participant) {
        try {
          await markParticipantLeft(tenantId, meeting.id, event.participant.identity);
        } catch {
          log.warn({ identity: event.participant.identity }, 'Failed to mark participant left');
        }
      }
      break;
    }

    case 'room_finished': {
      // Complete meeting if still in progress
      if (meeting.status === 'IN_PROGRESS') {
        const endedAt = new Date();
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { status: 'COMPLETED', endedAt },
        });
        await prisma.videoSession.updateMany({
          where: { meetingId: meeting.id, status: 'ACTIVE' },
          data: { status: 'ENDED', endedAt },
        });
        await prisma.meetingEvent.create({
          data: { tenantId, meetingId: meeting.id, type: 'MEETING_ENDED', payloadJson: { source: 'webhook' } },
        });
      }

      await prisma.meetingEvent.create({
        data: { tenantId, meetingId: meeting.id, type: 'WEBHOOK_RECONCILED', payloadJson: { eventId: event.id } },
      });
      break;
    }
  }

  // Store idempotency key
  await prisma.idempotencyKey.create({
    data: {
      key: `webhook-${event.id}`,
      response: { processed: true },
      statusCode: 200,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  log.info('Webhook event processed');
  return { processed: true };
}
