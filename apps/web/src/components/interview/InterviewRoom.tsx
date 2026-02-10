'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useInterviewRoomBootstrap } from '@/lib/hooks/useInterviewRoomBootstrap';
import { useEndMeeting } from '@/lib/hooks/useEndMeeting';
import { useLiveKitRoom } from '@/lib/hooks/useLiveKitRoom';
import { PreJoinPanel } from './PreJoinPanel';
import { InCallControls } from './InCallControls';
import { ConnectionBanner } from './ConnectionBanner';

export interface InterviewRoomProps {
  meetingId: string;
  livekitUrl: string;
  currentUserId?: string;
  displayName: string;
  onMeetingEnded?: () => void;
}

export function InterviewRoom({
  meetingId,
  livekitUrl,
  displayName,
  onMeetingEnded,
}: InterviewRoomProps) {
  const [phase, setPhase] = useState<'loading' | 'prejoin' | 'incall' | 'ended' | 'failed'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const bootstrap = useInterviewRoomBootstrap(meetingId);
  const endMeetingMutation = useEndMeeting(meetingId);

  const lk = useLiveKitRoom({
    meetingId,
    livekitUrl,
    onConnected: () => setPhase('incall'),
    onDisconnected: () => {
      if (phase !== 'ended') setPhase('ended');
      onMeetingEnded?.();
    },
    onError: (err) => {
      setErrorMessage(err.message);
      setPhase('failed');
    },
  });

  // Transition to prejoin when bootstrap loads
  useEffect(() => {
    if (bootstrap.data && phase === 'loading') {
      setPhase('prejoin');
    }
    if (bootstrap.error && phase === 'loading') {
      setErrorMessage(bootstrap.error.message);
      setPhase('failed');
    }
  }, [bootstrap.data, bootstrap.error, phase]);

  // Sync LiveKit connection state → local mute/camera/screenshare state
  useEffect(() => {
    if (lk.room) {
      setIsMuted(!lk.room.localParticipant.isMicrophoneEnabled);
      setIsCameraOff(!lk.room.localParticipant.isCameraEnabled);
    }
  }, [lk.room, lk.connectionState]);

  const handleJoin = useCallback(async () => {
    await lk.join();
  }, [lk]);

  const handleToggleMute = useCallback(async () => {
    await lk.toggleMic();
    setIsMuted((v) => !v);
  }, [lk]);

  const handleToggleCamera = useCallback(async () => {
    await lk.toggleCamera();
    setIsCameraOff((v) => !v);
  }, [lk]);

  const handleToggleScreenShare = useCallback(async () => {
    await lk.toggleScreenShare();
    setIsScreenSharing((v) => !v);
  }, [lk]);

  const handleLeave = useCallback(async () => {
    await lk.leave();
    setPhase('ended');
    onMeetingEnded?.();
  }, [lk, onMeetingEnded]);

  const handleEndMeeting = useCallback(async () => {
    try {
      await endMeetingMutation.mutateAsync({ reason: 'interview_complete' });
      await lk.leave();
      setPhase('ended');
      onMeetingEnded?.();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to end meeting');
      setPhase('failed');
    }
  }, [endMeetingMutation, lk, onMeetingEnded]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setPhase('loading');
    bootstrap.refetch();
  }, [bootstrap]);

  // --- Render ---

  if (phase === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900" role="status">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" aria-hidden="true" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading interview room...</p>
        </div>
      </div>
    );
  }

  if (phase === 'failed') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900" role="alert">
        <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/20">
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400">Connection Error</h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{errorMessage ?? lk.error ?? 'An unexpected error occurred.'}</p>
          <button
            onClick={handleRetry}
            className="mt-4 rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Retry connection"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900">
        <div className="rounded-xl bg-green-50 p-8 text-center dark:bg-green-900/20">
          <h2 className="text-xl font-bold text-green-700 dark:text-green-400">Interview Complete</h2>
          <p className="mt-2 text-sm text-green-600 dark:text-green-300">Thank you for participating.</p>
        </div>
      </div>
    );
  }

  if (phase === 'prejoin' && bootstrap.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <PreJoinPanel
          meetingTitle={bootstrap.data.meeting.title}
          displayName={displayName}
          scheduledStartAt={bootstrap.data.meeting.scheduledStartAt}
          canJoin={bootstrap.data.permissions.canJoin}
          isLoading={lk.connectionState === 'loading' || lk.connectionState === 'connecting'}
          onJoin={handleJoin}
        />
      </div>
    );
  }

  // In-call state
  const bannerState =
    lk.connectionState === 'connecting' || lk.connectionState === 'loading' ? 'connecting' as const :
    lk.connectionState === 'reconnecting' ? 'reconnecting' as const :
    lk.connectionState === 'connected' ? 'connected' as const : 'idle' as const;

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      <ConnectionBanner state={bannerState} onRetry={handleRetry} />

      {/* Video grid area */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          {/* Self view */}
          <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-800 text-gray-400">
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{displayName}</p>
              <p className="text-xs text-gray-500">You</p>
            </div>
          </div>
          {/* Remote participant placeholder */}
          <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-800 text-gray-400">
            <p className="text-sm">Waiting for others...</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center pb-6">
        <InCallControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onLeave={handleLeave}
          onEnd={handleEndMeeting}
          canEnd={bootstrap.data?.permissions.canEnd ?? false}
        />
      </div>
    </div>
  );
}
