import { describe, it, expect, beforeEach } from 'vitest';
import {
  getVideoProviderAdapter,
  setVideoProviderAdapter,
  type VideoProviderAdapter,
} from '@/server/services/video-provider-adapter';

describe('VideoProviderAdapter (Mock)', () => {
  let adapter: VideoProviderAdapter;

  beforeEach(() => {
    // Reset to mock adapter
    setVideoProviderAdapter(null as unknown as VideoProviderAdapter);
    adapter = getVideoProviderAdapter();
  });

  it('issues a mock token with participant identity', async () => {
    const result = await adapter.issueToken({
      roomName: 't_tenant1_m_meeting1',
      participantIdentity: 'user-123',
      participantName: 'Jane Doe',
      ttlSeconds: 300,
      canPublish: true,
      canSubscribe: true,
    });

    expect(result.token).toContain('mock-token-user-123');
    expect(result.iceServers).toBeDefined();
    expect(result.iceServers?.stun).toContain('stun:stun.l.google.com:19302');
  });

  it('creates a mock room with sid', async () => {
    const result = await adapter.createRoom('t_tenant1_m_meeting1');
    expect(result.sid).toContain('mock-sid-t_tenant1_m_meeting1');
  });

  it('deleteRoom does not throw', async () => {
    await expect(adapter.deleteRoom('t_tenant1_m_meeting1')).resolves.toBeUndefined();
  });

  it('verifyWebhookSignature returns true in mock mode', () => {
    expect(adapter.verifyWebhookSignature('body', 'sig')).toBe(true);
  });

  it('generates unique tokens for sequential calls', async () => {
    const req = {
      roomName: 'room1',
      participantIdentity: 'user1',
      participantName: 'User',
      ttlSeconds: 300,
      canPublish: true,
      canSubscribe: true,
    };
    const t1 = await adapter.issueToken(req);
    const t2 = await adapter.issueToken(req);
    expect(t1.token).not.toBe(t2.token);
  });
});

describe('VideoProviderAdapter factory', () => {
  it('returns mock adapter in test environment', () => {
    setVideoProviderAdapter(null as unknown as VideoProviderAdapter);
    const adapter = getVideoProviderAdapter();
    // Mock adapter always returns true for signature verification
    expect(adapter.verifyWebhookSignature('', '')).toBe(true);
  });

  it('allows setting a custom adapter', async () => {
    const custom: VideoProviderAdapter = {
      issueToken: async () => ({ token: 'custom-token', iceServers: { stun: [], turn: [] } }),
      createRoom: async () => ({ sid: 'custom-sid' }),
      deleteRoom: async () => {},
      verifyWebhookSignature: () => false,
    };
    setVideoProviderAdapter(custom);
    const adapter = getVideoProviderAdapter();
    const result = await adapter.issueToken({
      roomName: 'r', participantIdentity: 'u', participantName: 'U',
      ttlSeconds: 60, canPublish: true, canSubscribe: true,
    });
    expect(result.token).toBe('custom-token');
    expect(adapter.verifyWebhookSignature('', '')).toBe(false);

    // Reset
    setVideoProviderAdapter(null as unknown as VideoProviderAdapter);
  });
});
