'use client';

import React, { useState, useCallback, useReducer } from 'react';
import { useInterviewRoomBootstrap } from '@/lib/hooks/useInterviewRoomBootstrap';
import { useIssueVideoToken } from '@/lib/hooks/useIssueVideoToken';
import { useEndMeeting } from '@/lib/hooks/useEndMeeting';
import { PreJoinPanel } from './PreJoinPanel';
import { InCallControls } from './InCallControls';
import { ConnectionBanner } from './ConnectionBanner';

type RoomState =
  | 'idle'
  | 'loadingBootstrap'
  | 'prejoin'
  | 'tokenIssuing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ending'
  | 'ended'
  | 'failed';

type RoomAction =
  | { type: 'BOOTSTRAP_LOADED' }
  | { type: 'BOOTSTRAP_FAILED' }
  | { type: 'JOIN_REQUESTED' }
  | { type: 'TOKEN_RECEIVED' }
  | { type: 'TOKEN_FAILED' }
  | { type: 'CONNECTED' }
  | { type: 'RECONNECTING' }
  | { type: 'RECONNECTED' }
  | { type: 'ENDING' }
  | { type: 'ENDED' }
  | { type: 'FAILED'; error: string }
  | { type: 'RETRY' };

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'BOOTSTRAP_LOADED': return 'prejoin';
    case 'BOOTSTRAP_FAILED': return 'failed';
    case 'JOIN_REQUESTED': return 'tokenIssuing';
    case 'TOKEN_RECEIVED': return 'connecting';
    case 'TOKEN_FAILED': return 'failed';
    case 'CONNECTED': return 'connected';
    case 'RECONNECTING': return 'reconnecting';
    case 'RECONNECTED': return 'connected';
    case 'ENDING': return 'ending';
    case 'ENDED': return 'ended';
    case 'FAILED': return 'failed';
    case 'RETRY': return 'idle';
    default: return state;
  }
}

export interface InterviewRoomProps {
  meetingId: string;
  currentUserId: string;
  displayName: string;
  onMeetingEnded?: () => void;
}

export function InterviewRoom({ meetingId, currentUserId: _currentUserId, displayName, onMeetingEnded }: InterviewRoomProps) {
  const [roomState, dispatch] = useReducer(roomReducer, 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const bootstrap = useInterviewRoomBootstrap(meetingId);
  const issueToken = useIssueVideoToken(meetingId);
  const endMeetingMutation = useEndMeeting(meetingId);

  // Transition to prejoin when bootstrap loads
  React.useEffect(() => {
    if (bootstrap.data && roomState === 'idle') {
      dispatch({ type: 'BOOTSTRAP_LOADED' });
    }
    if (bootstrap.error && roomState === 'idle') {
      setErrorMessage(bootstrap.error.message);
      dispatch({ type: 'BOOTSTRAP_FAILED' });
    }
  }, [bootstrap.data, bootstrap.error, roomState]);

  const handleJoin = useCallback(async (_opts: { audioOnly: boolean }) => {
    dispatch({ type: 'JOIN_REQUESTED' });
    try {
      const tokenData = await issueToken.mutateAsync({
        device: { kind: 'browser', userAgent: navigator.userAgent },
        capabilities: { canPublish: true, canSubscribe: true, canPublishData: true },
      });

      dispatch({ type: 'TOKEN_RECEIVED' });

      // In production, connect to LiveKit here using tokenData.token
      // For now, simulate connection
      void tokenData;
      setTimeout(() => dispatch({ type: 'CONNECTED' }), 1000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to get token');
      dispatch({ type: 'TOKEN_FAILED' });
    }
  }, [issueToken]);

  const handleEndMeeting = useCallback(async () => {
    dispatch({ type: 'ENDING' });
    try {
      await endMeetingMutation.mutateAsync({ reason: 'interview_complete' });
      dispatch({ type: 'ENDED' });
      onMeetingEnded?.();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to end meeting');
      dispatch({ type: 'FAILED', error: 'end_failed' });
    }
  }, [endMeetingMutation, onMeetingEnded]);

  const handleLeave = useCallback(() => {
    dispatch({ type: 'ENDED' });
    onMeetingEnded?.();
  }, [onMeetingEnded]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    dispatch({ type: 'RETRY' });
    bootstrap.refetch();
  }, [bootstrap]);

  // --- Render ---

  if (bootstrap.isLoading || roomState === 'idle') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900" role="status">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" aria-hidden="true" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading interview room...</p>
        </div>
      </div>
    );
  }

  if (roomState === 'failed') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900" role="alert">
        <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/20">
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400">Connection Error</h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{errorMessage ?? 'An unexpected error occurred.'}</p>
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

  if (roomState === 'ended') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900">
        <div className="rounded-xl bg-green-50 p-8 text-center dark:bg-green-900/20">
          <h2 className="text-xl font-bold text-green-700 dark:text-green-400">Interview Complete</h2>
          <p className="mt-2 text-sm text-green-600 dark:text-green-300">Thank you for participating.</p>
        </div>
      </div>
    );
  }

  if (roomState === 'prejoin' && bootstrap.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <PreJoinPanel
          meetingTitle={bootstrap.data.meeting.title}
          displayName={displayName}
          scheduledStartAt={bootstrap.data.meeting.scheduledStartAt}
          canJoin={bootstrap.data.permissions.canJoin}
          isLoading={roomState === 'prejoin' && issueToken.isPending}
          onJoin={handleJoin}
        />
      </div>
    );
  }

  // Connected / tokenIssuing / connecting states
  const connectionState =
    roomState === 'connecting' || roomState === 'tokenIssuing' ? 'connecting' :
    roomState === 'reconnecting' ? 'reconnecting' :
    roomState === 'connected' ? 'connected' : 'idle';

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      <ConnectionBanner state={connectionState} onRetry={handleRetry} />

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
          onToggleMute={() => setIsMuted((v) => !v)}
          onToggleCamera={() => setIsCameraOff((v) => !v)}
          onToggleScreenShare={() => setIsScreenSharing((v) => !v)}
          onLeave={handleLeave}
          onEnd={handleEndMeeting}
          canEnd={bootstrap.data?.permissions.canEnd ?? false}
        />
      </div>
    </div>
  );
}
