'use client';

import { useQuery } from '@tanstack/react-query';
import { type InterviewRoomResponse } from '@/lib/validation/video';

export function useInterviewRoomBootstrap(meetingId: string) {
  return useQuery<InterviewRoomResponse>({
    queryKey: ['interview-room', meetingId],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}/interview-room`, {
        headers: { 'x-correlation-id': crypto.randomUUID() },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load interview room (${res.status})`);
      }
      return res.json();
    },
    retry: 2,
    staleTime: 30_000,
  });
}
