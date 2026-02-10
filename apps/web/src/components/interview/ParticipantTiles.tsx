'use client';

import React, { useMemo } from 'react';
import { type Room, type Participant, Track } from 'livekit-client';

type Props = {
  room: Room | null;
  pinnedIdentity: string | null;
  onPin: (identity: string | null) => void;
};

function getParticipantIdentity(p: Participant): string {
  return p.identity;
}

function getParticipantDisplayName(p: Participant): string {
  return p.name || p.identity;
}

export function ParticipantTiles({ room, pinnedIdentity, onPin }: Props) {
  const participants = useMemo(() => {
    if (!room) return [] as Participant[];
    const remotes = Array.from(room.remoteParticipants.values());
    return [room.localParticipant as Participant, ...remotes];
  }, [room]);

  const dominant = useMemo(() => {
    if (!room) return null;
    const speakers = room.activeSpeakers ?? [];
    return speakers.length > 0 ? speakers[0]!.identity : null;
  }, [room]);

  if (!room) {
    return (
      <div className="rounded-lg border p-4 min-h-[280px] flex items-center justify-center text-sm opacity-70">
        Not connected
      </div>
    );
  }

  const ordered = [...participants].sort((a, b) => {
    const aPinned = getParticipantIdentity(a) === pinnedIdentity ? -1 : 0;
    const bPinned = getParticipantIdentity(b) === pinnedIdentity ? -1 : 0;
    return aPinned - bPinned;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {ordered.map((p) => {
        const id = getParticipantIdentity(p);
        const isPinned = pinnedIdentity === id;
        const isActiveSpeaker = dominant === id;

        const camPub = p.getTrackPublication(Track.Source.Camera);
        const hasCamera = !!camPub?.track;
        const micPub = p.getTrackPublication(Track.Source.Microphone);
        const hasMic = !!micPub?.track && !micPub.isMuted;

        const isLocal = 'isLocal' in p && (p as { isLocal: boolean }).isLocal;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onPin(isPinned ? null : id)}
            className={`rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2
              ${isPinned ? 'ring-2 ring-blue-500' : ''}
              ${isActiveSpeaker ? 'border-emerald-500' : 'border-zinc-700'}
            `}
            aria-label={`Participant ${getParticipantDisplayName(p)}${isPinned ? ' pinned' : ''}`}
          >
            <div className="aspect-video rounded-md bg-zinc-900 flex items-center justify-center text-xs opacity-80">
              {hasCamera ? 'Camera Track Active' : 'Camera Off'}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="font-medium text-sm">{getParticipantDisplayName(p)}</div>
              <div className="text-xs opacity-70">{isLocal ? 'You' : 'Remote'}</div>
            </div>

            <div className="mt-1 flex gap-2 text-[11px] opacity-80">
              <span>{hasMic ? 'Mic On' : 'Mic Off'}</span>
              <span>&middot;</span>
              <span>{isActiveSpeaker ? 'Speaking' : 'Idle'}</span>
              {isPinned ? (
                <>
                  <span>&middot;</span>
                  <span>Pinned</span>
                </>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
