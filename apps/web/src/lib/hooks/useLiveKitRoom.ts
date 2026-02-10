'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  type RoomOptions,
} from 'livekit-client';

type ConnectionState =
  | 'idle'
  | 'loading'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed'
  | 'ended';

type UseLiveKitRoomParams = {
  livekitUrl: string;
  meetingId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
};

export function useLiveKitRoom(params: UseLiveKitRoomParams) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);

  const roomOptions: RoomOptions = useMemo(
    () => ({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
        videoCodec: 'vp8',
        videoEncoding: VideoPresets.h720.encoding,
      },
    }),
    [],
  );

  const createRoom = useCallback(() => {
    if (!roomRef.current) {
      const room = new Room(roomOptions);

      room.on(RoomEvent.Connected, () => {
        setConnectionState('connected');
        setError(null);
        params.onConnected?.();
      });

      room.on(RoomEvent.Reconnecting, () => {
        setConnectionState('reconnecting');
      });

      room.on(RoomEvent.Reconnected, () => {
        setConnectionState('connected');
      });

      room.on(RoomEvent.Disconnected, () => {
        setConnectionState('ended');
        params.onDisconnected?.();
      });

      room.on(RoomEvent.MediaDevicesError, (e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Media devices error';
        setError(msg);
        params.onError?.(new Error(msg));
      });

      roomRef.current = room;
    }

    return roomRef.current;
  }, [params, roomOptions]);

  const join = useCallback(async () => {
    try {
      setConnectionState('loading');
      setError(null);

      const tokenResp = await fetch(`/api/meetings/${params.meetingId}/video-token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': crypto.randomUUID(),
        },
        body: JSON.stringify({
          device: {
            kind: 'browser',
            userAgent: navigator.userAgent,
          },
          capabilities: {
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
          },
        }),
      });

      if (!tokenResp.ok) {
        const body = await tokenResp.json().catch(() => ({}));
        throw new Error((body as Record<string, string>)?.['message'] ?? 'Failed to issue video token');
      }

      const tokenData = (await tokenResp.json()) as { token: string };

      const room = createRoom();
      setConnectionState('connecting');

      await room.connect(params.livekitUrl, tokenData.token);

      // Publish mic/camera by default; wrap in try for permission-denied handling
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        // mic permission denied — non-fatal
      }
      try {
        await room.localParticipant.setCameraEnabled(true);
      } catch {
        // camera permission denied — non-fatal
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to join room';
      setConnectionState('failed');
      setError(msg);
      params.onError?.(new Error(msg));
    }
  }, [params.meetingId, params.livekitUrl, params.onError, createRoom]);

  const leave = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      room.disconnect(true);
      roomRef.current = null;
    }
    setConnectionState('ended');
  }, []);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
  }, []);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    const isSharing = !!pub?.track;
    await room.localParticipant.setScreenShareEnabled(!isSharing);
  }, []);

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      if (room) room.disconnect(true);
      roomRef.current = null;
    };
  }, []);

  return {
    room: roomRef.current,
    connectionState,
    error,
    join,
    leave,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  };
}
