'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

type EndMeetingInput = {
  meetingId: string;
  reason?: string;
};

type EndMeetingResponse = {
  meetingId: string;
  status: 'COMPLETED';
  endedAt: string;
};

export function useEndMeeting() {
  const qc = useQueryClient();

  return useMutation<EndMeetingResponse, Error, EndMeetingInput>({
    mutationFn: async ({ meetingId, reason }) => {
      const res = await fetch(`/api/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': crypto.randomUUID(),
        },
        body: JSON.stringify({
          reason: reason ?? 'manual_end',
        }),
      });

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const err = json?.['error'] as Record<string, string> | undefined;
        throw new Error(err?.['message'] ?? 'Failed to end meeting');
      }

      return json as unknown as EndMeetingResponse;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['meeting', vars.meetingId, 'interview-room-bootstrap'] });
      qc.invalidateQueries({ queryKey: ['meeting', vars.meetingId] });
    },
  });
}
