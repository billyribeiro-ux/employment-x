'use client';

import { useMutation } from '@tanstack/react-query';
import { type VideoTokenResponse, type VideoTokenRequest } from '@/lib/validation/video';

export function useIssueVideoToken(meetingId: string) {
  return useMutation<VideoTokenResponse, Error, VideoTokenRequest>({
    mutationFn: async (request) => {
      const res = await fetch(`/api/meetings/${meetingId}/video-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': crypto.randomUUID(),
        },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? body.error ?? `Token issue failed (${res.status})`);
      }
      return res.json();
    },
    retry: 1,
  });
}
