import { prisma } from '@/lib/server/db';
import { logger } from '@/server/observability/logger';
import { type VideoTokenResponse } from '@/lib/validation/video';
import { getVideoProviderAdapter } from '@/server/services/video-provider-adapter';

const TOKEN_TTL_SECONDS = 300; // 5 minutes

export async function issueJoinToken(opts: {
  meetingId: string;
  tenantId: string;
  userId: string;
  role: string;
  displayName: string;
  providerRoomName: string;
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

  // Issue token via provider adapter
  const adapter = getVideoProviderAdapter();
  const tokenResult = await adapter.issueToken({
    roomName: opts.providerRoomName,
    participantIdentity: opts.userId,
    participantName: opts.displayName,
    ttlSeconds: TOKEN_TTL_SECONDS,
    canPublish: true,
    canSubscribe: true,
  });

  // Record event
  await prisma.meetingEvent.create({
    data: {
      tenantId: opts.tenantId,
      meetingId: opts.meetingId,
      actorUserId: opts.userId,
      type: 'TOKEN_ISSUED',
      payloadJson: { role: opts.role, ttlSeconds: TOKEN_TTL_SECONDS },
    },
  });

  log.info({ videoSessionId: videoSession.id }, 'Video token issued');

  return {
    meetingId: opts.meetingId,
    roomName: opts.providerRoomName,
    token: tokenResult.token,
    expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(),
    participant: {
      userId: opts.userId,
      role: opts.role as VideoTokenResponse['participant']['role'],
      displayName: opts.displayName,
    },
    iceConfig: {
      stunServers: tokenResult.iceServers?.stun ?? ['stun:stun.l.google.com:19302'],
      turnServers: tokenResult.iceServers?.turn ?? [],
    },
  };
}
