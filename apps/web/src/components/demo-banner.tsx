'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

import { useAppSelector } from '@/lib/hooks';

interface DemoBannerProps {
  sessionId: string;
  onReset: () => void;
  isResetting: boolean;
}

export function DemoBanner({ sessionId, onReset, isResetting }: DemoBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-demo-banner px-4 py-2 text-demo-banner-foreground"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <span>Demo Environment — No real hiring or billing actions</span>
        <span className="hidden text-xs opacity-75 sm:inline">
          Session: {sessionId.slice(0, 8)}
        </span>
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={isResetting}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-xs font-medium transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
        aria-label="Reset demo workspace"
      >
        <RotateCcw className={`h-3 w-3 ${isResetting ? 'animate-spin' : ''}`} aria-hidden="true" />
        {isResetting ? 'Resetting...' : 'Reset Demo'}
      </button>
    </div>
  );
}

export function DemoBannerGuard({ children }: { children: React.ReactNode }) {
  const isDemoMode = useAppSelector((state) => {
    const token = state.auth.accessToken;
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email?.endsWith('@employmentx.local') ?? false;
    } catch {
      return false;
    }
  });

  if (!isDemoMode) return <>{children}</>;

  return (
    <div className="relative">
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-40 rotate-[-15deg] select-none text-6xl font-black uppercase tracking-widest opacity-[0.04]"
        aria-hidden="true"
      >
        DEMO
      </div>
      {children}
    </div>
  );
}
