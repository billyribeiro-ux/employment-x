'use client';

import React, { useMemo, useState } from 'react';
import { useInterviewRoomBootstrap } from '@/lib/hooks/useInterviewRoomBootstrap';
import { useIssueVideoToken } from '@/lib/hooks/useIssueVideoToken';
import { useEndMeeting } from '@/lib/hooks/useEndMeeting';
import { useInterviewKeyboardShortcuts } from '@/lib/hooks/useInterviewKeyboardShortcuts';
import { Room, RoomEvent, VideoPresets, type RoomOptions } from 'livekit-client';
import { ParticipantTiles } from './ParticipantTiles';

type Props = {
  meetingId: string;
  livekitUrl: string;
};

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'ended';

export function InterviewRoom({ meetingId, livekitUrl }: Props) {
  const bootstrap = useInterviewRoomBootstrap(meetingId);
  const issueToken = useIssueVideoToken();
  const endMeeting = useEndMeeting();

  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);

  const canJoin = bootstrap.data?.permissions.canJoin ?? false;
  const canEnd = bootstrap.data?.permissions.canEnd ?? false;

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

  async function handleJoin() {
    try {
      setError(null);
      setState('connecting');

      const tokenResp = await issueToken.mutateAsync({
        meetingId,
        capabilities: {
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        },
      });

      const r = new Room(roomOptions);

      r.on(RoomEvent.Connected, () => setState('connected'));
      r.on(RoomEvent.Reconnecting, () => setState('reconnecting'));
      r.on(RoomEvent.Reconnected, () => setState('connected'));
      r.on(RoomEvent.Disconnected, () => setState('ended'));
      r.on(RoomEvent.MediaDevicesError, (e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Media devices error';
        setError(msg);
      });

      await r.connect(livekitUrl, tokenResp.token);

      try {
        await r.localParticipant.setMicrophoneEnabled(true);
      } catch {
        // mic permission denied — non-fatal
      }
      try {
        await r.localParticipant.setCameraEnabled(true);
      } catch {
        // camera permission denied — non-fatal
      }

      setRoom(r);
    } catch (e) {
      setState('failed');
      setError(e instanceof Error ? e.message : 'Failed to join interview');
    }
  }

  async function handleLeave() {
    if (room) {
      room.disconnect(true);
      setRoom(null);
    }
    setState('ended');
  }

  async function handleToggleMic() {
    if (!room) return;
    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
  }

  async function handleToggleCamera() {
    if (!room) return;
    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
  }

  async function handleToggleShare() {
    if (!room) return;
    const hasScreenShare = room.localParticipant.isScreenShareEnabled;
    await room.localParticipant.setScreenShareEnabled(!hasScreenShare);
  }

  async function handleEndMeeting() {
    try {
      await endMeeting.mutateAsync({ meetingId, reason: 'manual_end' });
      await handleLeave();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end meeting');
    }
  }

  useInterviewKeyboardShortcuts({
    onToggleMic: handleToggleMic,
    onToggleCamera: handleToggleCamera,
    onToggleScreenShare: handleToggleShare,
    onLeave: handleLeave,
    enabled: state === 'connected' || state === 'reconnecting',
  });

  if (bootstrap.isLoading) {
    return <div className="p-4 rounded border">Loading interview room...</div>;
  }

  if (bootstrap.isError) {
    return (
      <div className="p-4 rounded border border-red-500/40 bg-red-500/10">
        {bootstrap.error.message}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="rounded-xl border p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{bootstrap.data?.meeting.title}</h1>
          <p className="text-sm opacity-75">
            Role: {bootstrap.data?.participant.role} &middot; State: {state}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded border px-3 py-2 disabled:opacity-50"
            onClick={handleJoin}
            disabled={!canJoin || state === 'connected' || issueToken.isPending}
          >
            Join
          </button>

          <button className="rounded border px-3 py-2" onClick={handleLeave}>
            Leave
          </button>

          {canEnd ? (
            <button
              className="rounded border px-3 py-2"
              onClick={handleEndMeeting}
              disabled={endMeeting.isPending}
            >
              End Meeting
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm">{error}</div>
      ) : null}

      <div className="rounded-xl border p-3 flex flex-wrap gap-2">
        <button className="rounded border px-3 py-2" onClick={handleToggleMic} disabled={!room}>
          Mute/Unmute (M)
        </button>
        <button className="rounded border px-3 py-2" onClick={handleToggleCamera} disabled={!room}>
          Camera On/Off (V)
        </button>
        <button className="rounded border px-3 py-2" onClick={handleToggleShare} disabled={!room}>
          Share Screen (S)
        </button>
        <button className="rounded border px-3 py-2" onClick={handleLeave} disabled={!room}>
          Leave (L)
        </button>
      </div>

      <ParticipantTiles room={room} pinnedIdentity={pinnedIdentity} onPin={setPinnedIdentity} />
    </section>
  );
}
