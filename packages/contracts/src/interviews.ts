import { z } from 'zod';

import { TimestampsSchema } from './common';

export const VideoRoomSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    meeting_id: z.string().uuid().nullable(),
    name: z.string().max(255),
    status: z.enum(['created', 'active', 'ended']),
    max_participants: z.number().int().min(2).max(20),
    recording_enabled: z.boolean(),
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

export const VideoRoomTokenSchema = z.object({
  token: z.string(),
  room_id: z.string().uuid(),
  user_id: z.string().uuid(),
  expires_at: z.string().datetime(),
});
export type VideoRoomToken = z.infer<typeof VideoRoomTokenSchema>;

export const VideoSessionEventSchema = z
  .object({
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    room_id: z.string().uuid(),
    user_id: z.string().uuid(),
    event_type: z.enum([
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
    ]),
    metadata: z.record(z.string(), z.unknown()).nullable(),
  })
  .merge(TimestampsSchema);
export type VideoSessionEvent = z.infer<typeof VideoSessionEventSchema>;

export const PipSessionStateSchema = z.object({
  session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  is_pip_active: z.boolean(),
  pip_position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).nullable(),
  pip_size: z.enum(['small', 'medium', 'large']).nullable(),
});
export type PipSessionState = z.infer<typeof PipSessionStateSchema>;

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
