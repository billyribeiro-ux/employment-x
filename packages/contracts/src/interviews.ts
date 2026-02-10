import { z } from 'zod';

import { TimestampsSchema } from './common';

// ─── Video Room ──────────────────────────────────────────────────────────────

export const VideoRoomStatusSchema = z.enum(['created', 'active', 'ended']);
export type VideoRoomStatus = z.infer<typeof VideoRoomStatusSchema>;

export const VideoRoomSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    meeting_id: z.string().uuid().nullable(),
    name: z.string().max(255),
    status: VideoRoomStatusSchema,
    max_participants: z.number().int().min(2).max(20),
    recording_enabled: z.boolean(),
    provider_room_name: z.string().max(500).nullable(),
    started_at: z.string().datetime().nullable(),
    ended_at: z.string().datetime().nullable(),
  })
  .merge(TimestampsSchema);
export type VideoRoom = z.infer<typeof VideoRoomSchema>;

export const CreateVideoRoomRequestSchema = z.object({
  meeting_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  max_participants: z.number().int().min(2).max(20).default(10),
  recording_enabled: z.boolean().default(false),
});
export type CreateVideoRoomRequest = z.infer<typeof CreateVideoRoomRequestSchema>;

// ─── Video Token ─────────────────────────────────────────────────────────────

export const VideoRoomTokenSchema = z.object({
  token: z.string(),
  room_id: z.string().uuid(),
  user_id: z.string().uuid(),
  expires_at: z.string().datetime(),
});
export type VideoRoomToken = z.infer<typeof VideoRoomTokenSchema>;

export const IssueVideoTokenRequestSchema = z.object({
  device: z
    .object({
      kind: z.enum(['browser', 'mobile', 'desktop']).default('browser'),
      user_agent: z.string().min(1).max(1024),
    })
    .optional(),
  capabilities: z
    .object({
      can_publish: z.boolean().default(true),
      can_subscribe: z.boolean().default(true),
      can_publish_data: z.boolean().default(true),
    })
    .optional(),
});
export type IssueVideoTokenRequest = z.infer<typeof IssueVideoTokenRequestSchema>;

export const IssueVideoTokenResponseSchema = z.object({
  meeting_id: z.string().uuid(),
  room_name: z.string(),
  token: z.string(),
  expires_at: z.string().datetime(),
  participant: z.object({
    user_id: z.string().uuid(),
    role: z.string(),
    display_name: z.string(),
  }),
  capabilities: z.object({
    can_publish: z.boolean(),
    can_subscribe: z.boolean(),
    can_publish_data: z.boolean(),
  }),
});
export type IssueVideoTokenResponse = z.infer<typeof IssueVideoTokenResponseSchema>;

// ─── Interview Room Context ──────────────────────────────────────────────────

export const ParticipantRoleSchema = z.enum([
  'host',
  'interviewer',
  'candidate',
  'observer',
  'recruiter',
]);
export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;

export const InterviewRoomContextSchema = z.object({
  meeting: z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    scheduled_start_at: z.string().datetime(),
    scheduled_end_at: z.string().datetime(),
    join_window_open_at: z.string().datetime(),
    join_window_close_at: z.string().datetime(),
    timezone: z.string(),
  }),
  participant: z.object({
    role: z.string(),
    display_name: z.string(),
  }),
  permissions: z.object({
    can_join: z.boolean(),
    can_end: z.boolean(),
  }),
});
export type InterviewRoomContext = z.infer<typeof InterviewRoomContextSchema>;

// ─── End Meeting ─────────────────────────────────────────────────────────────

export const EndMeetingRequestSchema = z.object({
  reason: z.string().min(1).max(256).default('manual_end'),
});
export type EndMeetingRequest = z.infer<typeof EndMeetingRequestSchema>;

export const EndMeetingResponseSchema = z.object({
  meeting_id: z.string().uuid(),
  status: z.string(),
  ended_at: z.string().datetime(),
});
export type EndMeetingResponse = z.infer<typeof EndMeetingResponseSchema>;

// ─── Meeting Events ──────────────────────────────────────────────────────────

export const MeetingEventTypeSchema = z.enum([
  'token_issued',
  'meeting_started',
  'meeting_ended',
  'participant_joined',
  'participant_left',
  'webhook_reconciled',
]);
export type MeetingEventType = z.infer<typeof MeetingEventTypeSchema>;

export const MeetingEventSchema = z
  .object({
    id: z.string().uuid(),
    meeting_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    actor_user_id: z.string().uuid().nullable(),
    event_type: MeetingEventTypeSchema,
    correlation_id: z.string().nullable(),
    payload: z.record(z.string(), z.unknown()).nullable(),
  })
  .merge(TimestampsSchema);
export type MeetingEvent = z.infer<typeof MeetingEventSchema>;

// ─── Provider Webhook ────────────────────────────────────────────────────────

export const ProviderWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  created_at: z.string().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});
export type ProviderWebhookEvent = z.infer<typeof ProviderWebhookEventSchema>;

// ─── Session Events ──────────────────────────────────────────────────────────

export const VideoSessionEventTypeSchema = z.enum([
  'joined',
  'left',
  'muted',
  'unmuted',
  'screen_share_started',
  'screen_share_stopped',
  'pip_entered',
  'pip_exited',
  'recording_started',
  'recording_stopped',
  'connection_quality_changed',
]);
export type VideoSessionEventType = z.infer<typeof VideoSessionEventTypeSchema>;

export const VideoSessionEventSchema = z
  .object({
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    room_id: z.string().uuid(),
    user_id: z.string().uuid(),
    event_type: VideoSessionEventTypeSchema,
    metadata: z.record(z.string(), z.unknown()).nullable(),
  })
  .merge(TimestampsSchema);
export type VideoSessionEvent = z.infer<typeof VideoSessionEventSchema>;

// ─── PiP State ───────────────────────────────────────────────────────────────

export const PipSessionStateSchema = z.object({
  session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  is_pip_active: z.boolean(),
  pip_position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).nullable(),
  pip_size: z.enum(['small', 'medium', 'large']).nullable(),
});
export type PipSessionState = z.infer<typeof PipSessionStateSchema>;

// ─── Interview Feedback ──────────────────────────────────────────────────────

export const InterviewFeedbackRequestSchema = z.object({
  application_id: z.string().uuid(),
  overall_rating: z.number().int().min(1).max(5),
  recommendation: z.enum(['strong_hire', 'hire', 'no_hire', 'strong_no_hire']),
  strengths: z.string().max(5000).optional(),
  weaknesses: z.string().max(5000).optional(),
  notes: z.string().max(10000).optional(),
  criteria_scores: z
    .array(
      z.object({
        criterion: z.string().max(255),
        score: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
      }),
    )
    .optional(),
});
export type InterviewFeedbackRequest = z.infer<typeof InterviewFeedbackRequestSchema>;

// ─── API Error Codes (video-specific) ────────────────────────────────────────

export const VideoApiErrorCodeSchema = z.enum([
  'INVALID_MEETING_STATE',
  'JOIN_WINDOW_CLOSED',
  'TOKEN_ISSUE_FAILED',
  'WEBHOOK_SIGNATURE_INVALID',
]);
export type VideoApiErrorCode = z.infer<typeof VideoApiErrorCodeSchema>;
