'use client';

import { useEffect } from 'react';

type Handlers = {
  onToggleMic: () => void | Promise<void>;
  onToggleCamera: () => void | Promise<void>;
  onToggleScreenShare: () => void | Promise<void>;
  onLeave: () => void | Promise<void>;
  onTogglePinPanel?: () => void | Promise<void>;
  enabled?: boolean;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
}

export function useInterviewKeyboardShortcuts({
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  onTogglePinPanel,
  enabled = true,
}: Handlers) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();

      if (k === 'm') {
        e.preventDefault();
        void onToggleMic();
      } else if (k === 'v') {
        e.preventDefault();
        void onToggleCamera();
      } else if (k === 's') {
        e.preventDefault();
        void onToggleScreenShare();
      } else if (k === 'l') {
        e.preventDefault();
        void onLeave();
      } else if (k === 'p' && onTogglePinPanel) {
        e.preventDefault();
        void onTogglePinPanel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onToggleMic, onToggleCamera, onToggleScreenShare, onLeave, onTogglePinPanel]);
}
