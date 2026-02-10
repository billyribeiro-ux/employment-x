'use client';

import React, { useState, useCallback } from 'react';

interface PreJoinPanelProps {
  meetingTitle: string;
  displayName: string;
  scheduledStartAt: string;
  canJoin: boolean;
  isLoading: boolean;
  onJoin: (opts: { audioOnly: boolean }) => void;
}

export function PreJoinPanel({
  meetingTitle, displayName, scheduledStartAt, canJoin, isLoading, onJoin,
}: PreJoinPanelProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const handleJoin = useCallback(() => {
    onJoin({ audioOnly: !cameraEnabled });
  }, [cameraEnabled, onJoin]);

  const startTime = new Date(scheduledStartAt);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{meetingTitle}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Scheduled for {startTime.toLocaleString()}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Joining as <span className="font-semibold">{displayName}</span>
      </p>

      {/* Preview area */}
      <div className="flex h-48 w-full items-center justify-center rounded-xl bg-gray-900 text-gray-400">
        {cameraEnabled ? (
          <span className="text-4xl" aria-hidden="true">📷</span>
        ) : (
          <span className="text-sm">Camera off</span>
        )}
      </div>

      {/* Device toggles */}
      <div className="flex gap-4" role="group" aria-label="Device settings">
        <button
          onClick={() => setMicEnabled((v) => !v)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            micEnabled
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}
          aria-pressed={micEnabled}
          aria-label={micEnabled ? 'Microphone on' : 'Microphone off'}
        >
          {micEnabled ? '🎤 Mic On' : '🔇 Mic Off'}
        </button>
        <button
          onClick={() => setCameraEnabled((v) => !v)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            cameraEnabled
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}
          aria-pressed={cameraEnabled}
          aria-label={cameraEnabled ? 'Camera on' : 'Camera off'}
        >
          {cameraEnabled ? '📷 Cam On' : '📷 Cam Off'}
        </button>
      </div>

      {/* Join button */}
      <button
        onClick={handleJoin}
        disabled={!canJoin || isLoading}
        className="w-full rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Join interview"
      >
        {isLoading ? 'Joining...' : canJoin ? 'Join Interview' : 'Waiting for join window...'}
      </button>

      {!canJoin && (
        <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
          The join window is not yet open. Please wait until closer to the scheduled time.
        </p>
      )}
    </div>
  );
}
