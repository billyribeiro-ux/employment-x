'use client';

import React from 'react';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface ConnectionBannerProps {
  state: ConnectionState;
  onRetry?: () => void;
}

export function ConnectionBanner({ state, onRetry }: ConnectionBannerProps) {
  if (state === 'connected' || state === 'idle') return null;

  const config: Record<string, { bg: string; text: string; message: string }> = {
    connecting: { bg: 'bg-blue-600', text: 'text-white', message: 'Connecting to interview...' },
    reconnecting: { bg: 'bg-yellow-500', text: 'text-black', message: 'Connection lost. Reconnecting...' },
    failed: { bg: 'bg-red-600', text: 'text-white', message: 'Connection failed.' },
  };

  const c = config[state];
  if (!c) return null;

  return (
    <div
      className={`${c.bg} ${c.text} px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2`}
      role="alert"
      aria-live="polite"
    >
      {state === 'connecting' || state === 'reconnecting' ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : null}
      <span>{c.message}</span>
      {state === 'failed' && onRetry ? (
        <button
          onClick={onRetry}
          className="ml-2 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Retry connection"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
