import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';
import { type VideoTokenResponse } from '@/lib/validation/video';
import { getEnv } from '@/lib/env';
import { ensureLiveKitRoom, buildLiveKitJoinToken } from '@/server/video/livekit';
import { getVideoProviderAdapter } from '@/server/services/video-provider-adapter';

const TOKEN_TTL_SECONDS = 180; // 3 minutes (short-lived per spec)

function isDemoMode(): boolean {
  const env = getEnv();
  return env.DEMO_MODE_ENABLED === true || env.NODE_ENV === 'test';
}

export async function issueJoinToken(opts: {
  meetingId: string;
  tenantId: string;
  userId: string;
  role: string;
  displayName: string;
  providerRoomName: string;
  correlationId?: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
}): Promise<VideoTokenResponse> {
  const log = logger.child({ service: 'video-token', meetingId: opts.meetingId, userId: opts.userId });

  // Ensure video session exists
  let videoSession = await prisma.videoSession.findFirst({
    where: { meetingId: opts.meetingId, status: { in: ['CREATED', 'ACTIVE'] } },
  });

  if (!videoSession) {
    videoSession = await prisma.videoSession.create({
      data: {
        tenantId: opts.tenantId,
        meetingId: opts.meetingId,
        provider: 'livekit',
        status: 'CREATED',
      },
    });
  }

  let token: string;
  let expiresAt: string;

  if (isDemoMode()) {
    // Demo/test mode: use mock adapter
    const adapter = getVideoProviderAdapter();
    const mockResult = await adapter.issueToken({
      roomName: opts.providerRoomName,
      participantIdentity: opts.userId,
      participantName: opts.displayName,
      ttlSeconds: TOKEN_TTL_SECONDS,
      canPublish: opts.canPublish ?? true,
      canSubscribe: opts.canSubscribe ?? true,
    });
    token = mockResult.token;
    expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
  } else {
    // Production: real LiveKit
    try {
      await ensureLiveKitRoom(opts.providerRoomName);
      const result = await buildLiveKitJoinToken({
        roomName: opts.providerRoomName,
        identity: opts.userId,
        name: opts.displayName,
        metadata: {
          tenantId: opts.tenantId,
          meetingId: opts.meetingId,
          role: opts.role,
        },
        ttlSeconds: TOKEN_TTL_SECONDS,
        canPublish: opts.canPublish ?? true,
        canSubscribe: opts.canSubscribe ?? true,
        canPublishData: opts.canPublishData ?? true,
      });
      token = result.token;
      expiresAt = result.expiresAt;
    } catch (err) {
      log.error({ err }, 'Failed to issue LiveKit token');
      throw new Error('TOKEN_ISSUE_FAILED: ' + (err instanceof Error ? err.message : 'unknown'));
    }
  }

  // Record event
  await prisma.meetingEvent.create({
    data: {
      tenantId: opts.tenantId,
      meetingId: opts.meetingId,
      actorUserId: opts.userId,
      type: 'TOKEN_ISSUED',
      correlationId: opts.correlationId ?? null,
      payloadJson: {
        roomName: opts.providerRoomName,
        role: opts.role,
        expiresAt,
        provider: isDemoMode() ? 'mock' : 'livekit',
        ttlSeconds: TOKEN_TTL_SECONDS,
      },
    },
  });

  log.info({ videoSessionId: videoSession.id, provider: isDemoMode() ? 'mock' : 'livekit' }, 'Video token issued');

  return {
    meetingId: opts.meetingId,
    roomName: opts.providerRoomName,
    token,
    expiresAt,
    participant: {
      userId: opts.userId,
      role: opts.role as VideoTokenResponse['participant']['role'],
      displayName: opts.displayName,
    },
    iceConfig: {
      stunServers: ['stun:stun.l.google.com:19302'],
      turnServers: [],
    },
  };
}
