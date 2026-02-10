import { z } from 'zod';

// --- Video Token Request/Response ---

export const VideoTokenRequestSchema = z.object({
  device: z.object({
    kind: z.enum(['browser', 'mobile', 'desktop']),
    userAgent: z.string().max(500).optional(),
  }),
  capabilities: z.object({
    canPublish: z.boolean().default(true),
    canSubscribe: z.boolean().default(true),
    canPublishData: z.boolean().default(true),
  }).optional(),
});
export type VideoTokenRequest = z.infer<typeof VideoTokenRequestSchema>;

export const VideoTokenResponseSchema = z.object({
  meetingId: z.string(),
  roomName: z.string(),
  token: z.string(),
  expiresAt: z.string().datetime(),
  participant: z.object({
    userId: z.string(),
    role: z.enum(['HOST', 'INTERVIEWER', 'CANDIDATE', 'OBSERVER', 'RECRUITER']),
    displayName: z.string(),
  }),
  iceConfig: z.object({
    stunServers: z.array(z.string()),
    turnServers: z.array(z.string()),
  }),
});
export type VideoTokenResponse = z.infer<typeof VideoTokenResponseSchema>;

// --- End Meeting Request/Response ---

export const EndMeetingRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type EndMeetingRequest = z.infer<typeof EndMeetingRequestSchema>;

export const EndMeetingResponseSchema = z.object({
  meetingId: z.string(),
  status: z.string(),
  endedAt: z.string().datetime(),
});
export type EndMeetingResponse = z.infer<typeof EndMeetingResponseSchema>;

// --- Interview Room Bootstrap Response ---

export const InterviewRoomResponseSchema = z.object({
  meeting: z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    scheduledStartAt: z.string().datetime(),
    scheduledEndAt: z.string().datetime(),
    joinWindowOpenAt: z.string().datetime(),
    joinWindowCloseAt: z.string().datetime(),
    timezone: z.string(),
  }),
  participant: z.object({
    role: z.enum(['HOST', 'INTERVIEWER', 'CANDIDATE', 'OBSERVER', 'RECRUITER']),
    displayName: z.string(),
  }),
  permissions: z.object({
    canJoin: z.boolean(),
    canEnd: z.boolean(),
  }),
});
export type InterviewRoomResponse = z.infer<typeof InterviewRoomResponseSchema>;

// --- Provider Webhook Event ---

export const ProviderWebhookEventSchema = z.object({
  id: z.string(),
  event: z.enum([
    'room_started', 'room_finished',
    'participant_joined', 'participant_left',
  ]),
  room: z.object({
    name: z.string(),
    sid: z.string().optional(),
  }),
  participant: z.object({
    identity: z.string(),
    sid: z.string().optional(),
  }).optional(),
  createdAt: z.number(),
});
export type ProviderWebhookEvent = z.infer<typeof ProviderWebhookEventSchema>;

// --- Video Error Codes ---

export const VIDEO_ERROR_CODES = {
  UNAUTHENTICATED: { status: 401, code: 'UNAUTHENTICATED' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN' },
  INVALID_MEETING_STATE: { status: 409, code: 'INVALID_MEETING_STATE' },
  JOIN_WINDOW_CLOSED: { status: 423, code: 'JOIN_WINDOW_CLOSED' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED' },
  TOKEN_ISSUE_FAILED: { status: 500, code: 'TOKEN_ISSUE_FAILED' },
} as const;

// --- Join Window Validator ---

export function isJoinWindowOpen(
  joinWindowOpenAt: Date,
  joinWindowCloseAt: Date,
  now: Date = new Date(),
): boolean {
  return now >= joinWindowOpenAt && now <= joinWindowCloseAt;
}

// --- Meeting Status Transition Rules ---

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['REQUESTED', 'CANCELED'],
  REQUESTED: ['CONFIRMED', 'DENIED', 'CANCELED', 'EXPIRED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELED', 'RESCHEDULE_REQUESTED', 'NO_SHOW', 'EXPIRED'],
  DENIED: [],
  RESCHEDULE_REQUESTED: ['CONFIRMED', 'DENIED', 'CANCELED'],
  CANCELED: [],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  NO_SHOW: [],
  EXPIRED: [],
};

export function canTransitionStatus(from: string, to: string): boolean {
  return (VALID_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

// --- Role Permission Checks ---

const END_MEETING_ROLES = new Set(['HOST', 'INTERVIEWER', 'RECRUITER']);

export function canEndMeeting(role: string): boolean {
  return END_MEETING_ROLES.has(role);
}

export function canJoinMeeting(
  meetingStatus: string,
  joinWindowOpenAt: Date,
  joinWindowCloseAt: Date,
  now: Date = new Date(),
): boolean {
  const validStatuses = ['CONFIRMED', 'IN_PROGRESS'];
  if (!validStatuses.includes(meetingStatus)) return false;
  return isJoinWindowOpen(joinWindowOpenAt, joinWindowCloseAt, now);
}
