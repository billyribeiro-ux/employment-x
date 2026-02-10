export interface VideoProviderTokenRequest {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  ttlSeconds: number;
  canPublish: boolean;
  canSubscribe: boolean;
}

export interface VideoProviderTokenResult {
  token: string;
  iceServers?: {
    stun: string[];
    turn: string[];
  };
}

export interface VideoProviderAdapter {
  issueToken(req: VideoProviderTokenRequest): Promise<VideoProviderTokenResult>;
  createRoom(roomName: string): Promise<{ sid: string }>;
  deleteRoom(roomName: string): Promise<void>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}

// --- Mock Adapter (demo mode + tests) ---

class MockVideoProviderAdapter implements VideoProviderAdapter {
  private _tokenCounter = 0;

  async issueToken(req: VideoProviderTokenRequest): Promise<VideoProviderTokenResult> {
    this._tokenCounter++;
    return {
      token: `mock-token-${req.participantIdentity}-${this._tokenCounter}-${Date.now()}`,
      iceServers: {
        stun: ['stun:stun.l.google.com:19302'],
        turn: [],
      },
    };
  }

  async createRoom(roomName: string): Promise<{ sid: string }> {
    return { sid: `mock-sid-${roomName}-${Date.now()}` };
  }

  async deleteRoom(_roomName: string): Promise<void> {
    // no-op in mock
  }

  verifyWebhookSignature(_rawBody: string, _signature: string): boolean {
    // In mock mode, always accept
    return true;
  }
}

// --- LiveKit Adapter (production stub) ---

class LiveKitVideoProviderAdapter implements VideoProviderAdapter {
  async issueToken(req: VideoProviderTokenRequest): Promise<VideoProviderTokenResult> {
    // TODO: Replace with real LiveKit SDK token generation
    // import { AccessToken } from 'livekit-server-sdk';
    // const token = new AccessToken(apiKey, apiSecret, { identity: req.participantIdentity, name: req.participantName, ttl: req.ttlSeconds });
    // token.addGrant({ roomJoin: true, room: req.roomName, canPublish: req.canPublish, canSubscribe: req.canSubscribe });
    // return { token: token.toJwt() };

    // For now, delegate to mock
    const mock = new MockVideoProviderAdapter();
    return mock.issueToken(req);
  }

  async createRoom(roomName: string): Promise<{ sid: string }> {
    // TODO: Replace with real LiveKit room creation
    return { sid: `lk-sid-${roomName}-${Date.now()}` };
  }

  async deleteRoom(_roomName: string): Promise<void> {
    // TODO: Replace with real LiveKit room deletion
  }

  verifyWebhookSignature(_rawBody: string, _signature: string): boolean {
    // TODO: Replace with real HMAC verification
    // import { WebhookReceiver } from 'livekit-server-sdk';
    return true;
  }
}

// --- Factory ---

let _adapter: VideoProviderAdapter | null = null;

export function getVideoProviderAdapter(): VideoProviderAdapter {
  if (_adapter) return _adapter;

  const isDemoMode = process.env['DEMO_MODE'] === 'true' || process.env['NODE_ENV'] === 'test';
  _adapter = isDemoMode ? new MockVideoProviderAdapter() : new LiveKitVideoProviderAdapter();
  return _adapter;
}

export function setVideoProviderAdapter(adapter: VideoProviderAdapter): void {
  _adapter = adapter;
}
