'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type EndMeetingResponse, type EndMeetingRequest } from '@/lib/validation/video';

export function useEndMeeting(meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation<EndMeetingResponse, Error, EndMeetingRequest>({
    mutationFn: async (request) => {
      const res = await fetch(`/api/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': crypto.randomUUID(),
        },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `End meeting failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-room', meetingId] });
    },
  });
}
