import { AccessToken, RoomServiceClient, type VideoGrant } from 'livekit-server-sdk';
import { getEnv } from '@/lib/env';

function getLiveKitEnv() {
  const env = getEnv();
  return {
    url: env.LIVEKIT_URL,
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
  };
}

export function getLiveKitRoomService(): RoomServiceClient {
  const { url, apiKey, apiSecret } = getLiveKitEnv();
  return new RoomServiceClient(url, apiKey, apiSecret);
}

export async function ensureLiveKitRoom(roomName: string): Promise<void> {
  const roomService = getLiveKitRoomService();
  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 10 * 60,
      maxParticipants: 25,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.toLowerCase().includes('already exists')) {
      throw err;
    }
  }
}

type BuildTokenParams = {
  roomName: string;
  identity: string;
  name: string;
  metadata: Record<string, unknown>;
  ttlSeconds?: number;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
};

export async function buildLiveKitJoinToken(params: BuildTokenParams): Promise<{ token: string; expiresAt: string }> {
  const { apiKey, apiSecret } = getLiveKitEnv();
  const ttlSeconds = params.ttlSeconds ?? 180;

  const grant: VideoGrant = {
    roomJoin: true,
    room: params.roomName,
    canPublish: params.canPublish ?? true,
    canSubscribe: params.canSubscribe ?? true,
    canPublishData: params.canPublishData ?? true,
  };

  const at = new AccessToken(apiKey, apiSecret, {
    identity: params.identity,
    name: params.name,
    ttl: `${ttlSeconds}s`,
    metadata: JSON.stringify(params.metadata),
  });

  at.addGrant(grant);

  const token = await at.toJwt();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  return { token, expiresAt };
}
