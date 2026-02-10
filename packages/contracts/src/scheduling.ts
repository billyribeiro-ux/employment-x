import { z } from 'zod';

import { TimestampsSchema } from './common';

export const MeetingStatusSchema = z.enum([
  'pending',
  'accepted',
  'denied',
  'rescheduled',
  'cancelled',
  'completed',
]);
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;

export const MeetingRequestSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    requester_id: z.string().uuid(),
    title: z.string().max(255),
    description: z.string().max(5000).nullable(),
    status: MeetingStatusSchema,
    application_id: z.string().uuid().nullable(),
    meeting_type: z.enum(['phone_screen', 'technical', 'behavioral', 'onsite', 'other']),
    timezone: z.string().max(100),
    duration_minutes: z.number().int().min(15).max(480),
    location: z.string().max(500).nullable(),
    video_room_id: z.string().uuid().nullable(),
    proposed_slots: z.array(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    ),
    confirmed_slot: z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .nullable(),
    deny_reason: z.string().max(1000).nullable(),
  })
  .merge(TimestampsSchema);
export type MeetingRequest = z.infer<typeof MeetingRequestSchema>;

export const CreateMeetingRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  participant_ids: z.array(z.string().uuid()).min(1).max(20),
  application_id: z.string().uuid().optional(),
  meeting_type: z.enum(['phone_screen', 'technical', 'behavioral', 'onsite', 'other']),
  timezone: z.string().max(100),
  duration_minutes: z.number().int().min(15).max(480),
  location: z.string().max(500).optional(),
  proposed_slots: z
    .array(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    )
    .min(1)
    .max(10),
});
export type CreateMeetingRequest = z.infer<typeof CreateMeetingRequestSchema>;

export const AcceptMeetingRequestSchema = z.object({
  selected_slot: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});
export type AcceptMeetingRequest = z.infer<typeof AcceptMeetingRequestSchema>;

export const DenyMeetingRequestSchema = z.object({
  reason: z.string().max(1000).optional(),
});
export type DenyMeetingRequest = z.infer<typeof DenyMeetingRequestSchema>;

export const RescheduleMeetingRequestSchema = z.object({
  reason: z.string().max(1000).optional(),
  proposed_slots: z
    .array(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    )
    .min(1)
    .max(10),
});
export type RescheduleMeetingRequest = z.infer<typeof RescheduleMeetingRequestSchema>;

export const ReminderJobSchema = z
  .object({
    id: z.string().uuid(),
    meeting_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    user_id: z.string().uuid(),
    remind_at: z.string().datetime(),
    reminder_type: z.enum(['t_minus_24h', 't_minus_1h', 't_minus_10m']),
    status: z.enum(['scheduled', 'delivered', 'cancelled', 'failed']),
    delivered_at: z.string().datetime().nullable(),
  })
  .merge(TimestampsSchema);
export type ReminderJob = z.infer<typeof ReminderJobSchema>;
