'use client';

import { useQuery } from '@tanstack/react-query';

type MeetingEvent = {
  id: string;
  type: string;
  actorUserId: string | null;
  createdAt: string;
  payloadJson: Record<string, unknown> | null;
};

export function useMeetingEvents(meetingId: string) {
  return useQuery<MeetingEvent[]>({
    queryKey: ['meeting', meetingId, 'events'],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}/events`, {
        headers: { 'x-correlation-id': crypto.randomUUID() },
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const err = json?.['error'] as Record<string, string> | undefined;
        throw new Error(err?.['message'] ?? 'Failed to load meeting events');
      }
      return (json as { events: MeetingEvent[] }).events;
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
}
