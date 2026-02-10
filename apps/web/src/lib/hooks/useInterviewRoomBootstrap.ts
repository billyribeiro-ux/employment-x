'use client';

import { useQuery } from '@tanstack/react-query';

export type InterviewRoomBootstrap = {
  meeting: {
    id: string;
    title: string;
    status: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    joinWindowOpenAt: string;
    joinWindowCloseAt: string;
    timezone: string;
  };
  participant: {
    role: string;
    displayName: string;
  };
  permissions: {
    canJoin: boolean;
    canEnd: boolean;
  };
};

export function useInterviewRoomBootstrap(meetingId: string) {
  return useQuery<InterviewRoomBootstrap>({
    queryKey: ['meeting', meetingId, 'interview-room-bootstrap'],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}/interview-room`, {
        method: 'GET',
        headers: {
          'x-correlation-id': crypto.randomUUID(),
        },
        cache: 'no-store',
      });

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const err = json?.['error'] as Record<string, string> | undefined;
        throw new Error(err?.['message'] ?? 'Failed to load interview room');
      }

      return json as unknown as InterviewRoomBootstrap;
    },
    staleTime: 30_000,
    retry: 1,
  });
}
