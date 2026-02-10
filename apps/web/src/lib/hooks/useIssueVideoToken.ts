'use client';

import { useMutation } from '@tanstack/react-query';

export type IssueVideoTokenInput = {
  meetingId: string;
  capabilities?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
  };
};

export type IssueVideoTokenResponse = {
  meetingId: string;
  roomName: string;
  token: string;
  expiresAt: string;
  participant: {
    userId: string;
    role: string;
    displayName: string;
  };
  capabilities: {
    canPublish: boolean;
    canSubscribe: boolean;
    canPublishData: boolean;
  };
};

export function useIssueVideoToken() {
  return useMutation<IssueVideoTokenResponse, Error, IssueVideoTokenInput>({
    mutationFn: async ({ meetingId, capabilities }) => {
      const res = await fetch(`/api/meetings/${meetingId}/video-token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': crypto.randomUUID(),
        },
        body: JSON.stringify({
          device: {
            kind: 'browser',
            userAgent: navigator.userAgent,
          },
          capabilities: {
            canPublish: capabilities?.canPublish ?? true,
            canSubscribe: capabilities?.canSubscribe ?? true,
            canPublishData: capabilities?.canPublishData ?? true,
          },
        }),
      });

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const err = json?.['error'] as Record<string, string> | undefined;
        throw new Error(err?.['message'] ?? 'Failed to issue video token');
      }

      return json as unknown as IssueVideoTokenResponse;
    },
  });
}
