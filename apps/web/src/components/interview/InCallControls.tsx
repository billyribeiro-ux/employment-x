'use client';

import React from 'react';

interface InCallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onEnd?: () => void;
  canEnd: boolean;
}

export function InCallControls({
  isMuted, isCameraOff, isScreenSharing,
  onToggleMute, onToggleCamera, onToggleScreenShare,
  onLeave, onEnd, canEnd,
}: InCallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl bg-gray-900 px-6 py-3" role="toolbar" aria-label="Call controls">
      <ControlButton
        active={!isMuted}
        onClick={onToggleMute}
        label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        icon={isMuted ? 'mic-off' : 'mic'}
      />
      <ControlButton
        active={!isCameraOff}
        onClick={onToggleCamera}
        label={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
        icon={isCameraOff ? 'camera-off' : 'camera'}
      />
      <ControlButton
        active={isScreenSharing}
        onClick={onToggleScreenShare}
        label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        icon="monitor"
      />
      <div className="mx-2 h-8 w-px bg-gray-700" aria-hidden="true" />
      <button
        onClick={onLeave}
        className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900"
        aria-label="Leave call"
      >
        Leave
      </button>
      {canEnd && onEnd ? (
        <button
          onClick={onEnd}
          className="rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          aria-label="End meeting for all"
        >
          End Meeting
        </button>
      ) : null}
    </div>
  );
}

function ControlButton({ active, onClick, label, icon }: {
  active: boolean; onClick: () => void; label: string; icon: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        active ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-600 text-gray-400 hover:bg-gray-500'
      }`}
      aria-label={label}
      aria-pressed={active}
    >
      <span aria-hidden="true">{iconGlyph(icon)}</span>
    </button>
  );
}

function iconGlyph(name: string): string {
  const map: Record<string, string> = {
    'mic': '🎤', 'mic-off': '🔇',
    'camera': '📷', 'camera-off': '📷',
    'monitor': '🖥️',
  };
  return map[name] ?? '?';
}
