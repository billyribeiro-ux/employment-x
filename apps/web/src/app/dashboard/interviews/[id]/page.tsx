'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, PictureInPicture2, Loader2, AlertTriangle } from 'lucide-react';

type InterviewRoomContext = {
  meeting: {
    id: string;
    title: string;
    status: string;
    scheduled_start_at: string;
    scheduled_end_at: string;
    join_window_open_at: string;
    join_window_close_at: string;
    timezone: string;
  };
  participant: {
    role: string;
    display_name: string;
  };
  permissions: {
    can_join: boolean;
    can_end: boolean;
  };
};

type TokenResponse = {
  meeting_id: string;
  room_name: string;
  token: string;
  expires_at: string;
  participant: { user_id: string; role: string; display_name: string };
  capabilities: { can_publish: boolean; can_subscribe: boolean; can_publish_data: boolean };
};

type RoomState = 'loading' | 'lobby' | 'joining' | 'connected' | 'ended' | 'error';

export default function InterviewRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const meetingId = params.id;

  const [roomState, setRoomState] = useState<RoomState>('loading');
  const [context, setContext] = useState<InterviewRoomContext | null>(null);
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);

  useEffect(() => {
    async function loadRoom() {
      try {
        const res = await fetch(`/api/v1/meetings/${meetingId}/interview-room`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('access_token') ?? ''}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? `Failed to load room (${res.status})`);
        }
        const data: InterviewRoomContext = await res.json();
        setContext(data);
        setRoomState('lobby');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load interview room');
        setRoomState('error');
      }
    }
    if (meetingId) loadRoom();
  }, [meetingId]);

  const handleJoin = useCallback(async () => {
    if (!context?.permissions.can_join) return;
    setRoomState('joining');
    try {
      const res = await fetch(`/api/v1/meetings/${meetingId}/video-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('access_token') ?? ''}`,
        },
        body: JSON.stringify({
          device: { kind: 'browser', user_agent: navigator.userAgent },
          capabilities: { can_publish: true, can_subscribe: true, can_publish_data: true },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Token issue failed (${res.status})`);
      }
      const token: TokenResponse = await res.json();
      setTokenData(token);
      setRoomState('connected');
      // TODO: Initialize provider SDK (LiveKit/Daily) with token.token and token.room_name
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join meeting');
      setRoomState('error');
    }
  }, [context, meetingId]);

  const handleEndMeeting = useCallback(async () => {
    try {
      await fetch(`/api/v1/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('access_token') ?? ''}`,
        },
        body: JSON.stringify({ reason: 'manual_end' }),
      });
      setRoomState('ended');
    } catch {
      setError('Failed to end meeting');
    }
  }, [meetingId]);

  const handleLeaveMeeting = useCallback(() => {
    // TODO: Disconnect from provider SDK
    router.push('/dashboard/interviews');
  }, [router]);

  if (roomState === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-foreground-secondary">Loading interview room…</p>
        </div>
      </div>
    );
  }

  if (roomState === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold text-card-foreground">Unable to Load Room</h2>
          <p className="text-sm text-foreground-secondary">{error}</p>
          <button
            onClick={() => router.push('/dashboard/interviews')}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Back to Interviews
          </button>
        </div>
      </div>
    );
  }

  if (roomState === 'ended') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
          <Video className="h-10 w-10 text-foreground-muted" />
          <h2 className="text-lg font-semibold text-card-foreground">Meeting Ended</h2>
          <p className="text-sm text-foreground-secondary">
            The interview session has concluded. Thank you for participating.
          </p>
          <button
            onClick={() => router.push('/dashboard/interviews')}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Back to Interviews
          </button>
        </div>
      </div>
    );
  }

  if (roomState === 'lobby' && context) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex w-full max-w-lg flex-col gap-6 rounded-xl border bg-card p-8 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-card-foreground">{context.meeting.title}</h1>
            <p className="mt-1 text-sm text-foreground-secondary">
              {context.participant.role.charAt(0).toUpperCase() + context.participant.role.slice(1)} ·{' '}
              {context.participant.display_name}
            </p>
          </div>

          <div className="rounded-lg bg-background-subtle p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-foreground-muted">Status</span>
                <p className="font-medium text-card-foreground">{context.meeting.status}</p>
              </div>
              <div>
                <span className="text-foreground-muted">Timezone</span>
                <p className="font-medium text-card-foreground">{context.meeting.timezone}</p>
              </div>
              <div>
                <span className="text-foreground-muted">Scheduled</span>
                <p className="font-medium text-card-foreground">
                  {new Date(context.meeting.scheduled_start_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <span className="text-foreground-muted">Join Window</span>
                <p className="font-medium text-card-foreground">
                  {context.permissions.can_join ? (
                    <span className="text-success">Open</span>
                  ) : (
                    <span className="text-destructive">Closed</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 rounded-lg bg-muted p-6">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                isCameraOn
                  ? 'bg-foreground text-background'
                  : 'bg-destructive text-destructive-foreground'
              }`}
              aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                isMicOn
                  ? 'bg-foreground text-background'
                  : 'bg-destructive text-destructive-foreground'
              }`}
              aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
          </div>

          <button
            onClick={handleJoin}
            disabled={!context.permissions.can_join}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {context.permissions.can_join ? 'Join Interview' : 'Join Window Closed'}
          </button>
        </div>
      </div>
    );
  }

  if ((roomState === 'joining' || roomState === 'connected') && context) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div>
            <h1 className="text-sm font-semibold text-foreground">{context.meeting.title}</h1>
            <p className="text-xs text-foreground-muted">
              {context.participant.display_name} · {context.participant.role}
              {tokenData && ` · Room: ${tokenData.room_name}`}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-foreground-muted">
            {roomState === 'joining' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Connecting…</span>
              </>
            )}
            {roomState === 'connected' && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success" />
                Connected
              </span>
            )}
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center bg-muted">
          {/* TODO: Provider video grid renders here */}
          <div className="flex flex-col items-center gap-3 text-foreground-muted">
            <Video className="h-16 w-16" />
            <p className="text-sm">
              {roomState === 'joining'
                ? 'Connecting to interview room…'
                : 'Video provider integration point'}
            </p>
            {tokenData && (
              <p className="text-xs font-mono text-foreground-muted/60">
                Token expires: {new Date(tokenData.expires_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 border-t bg-card px-4 py-3">
          <button
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isCameraOn
                ? 'bg-foreground/10 text-foreground hover:bg-foreground/20'
                : 'bg-destructive text-destructive-foreground'
            }`}
            aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isMicOn
                ? 'bg-foreground/10 text-foreground hover:bg-foreground/20'
                : 'bg-destructive text-destructive-foreground'
            }`}
            aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isScreenSharing
                ? 'bg-primary text-primary-foreground'
                : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
            }`}
            aria-label={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
          >
            <Monitor className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsPipActive(!isPipActive)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isPipActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
            }`}
            aria-label={isPipActive ? 'Exit picture-in-picture' : 'Enter picture-in-picture'}
          >
            <PictureInPicture2 className="h-4 w-4" />
          </button>

          <div className="mx-2 h-6 w-px bg-border" />

          <button
            onClick={handleLeaveMeeting}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            <PhoneOff className="h-4 w-4" />
            Leave
          </button>

          {context.permissions.can_end && (
            <button
              onClick={handleEndMeeting}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-destructive px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              End for All
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
