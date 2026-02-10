import { z } from 'zod';

import { createQueue, type QueueDefinition } from './factory';

// --- Reminder Queue ---
export const ReminderJobSchema = z.object({
  meetingId: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: z.enum(['15min', '1hour', '1day']),
  scheduledFor: z.string().datetime(),
});
export type ReminderJob = z.infer<typeof ReminderJobSchema>;

const reminderDef: QueueDefinition<ReminderJob> = {
  name: 'reminders',
  schema: ReminderJobSchema,
};
export const reminderQueue = createQueue(reminderDef);

// --- Notification Queue ---
export const NotificationJobSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  channel: z.enum(['in_app', 'email', 'push']),
});
export type NotificationJob = z.infer<typeof NotificationJobSchema>;

const notificationDef: QueueDefinition<NotificationJob> = {
  name: 'notifications',
  schema: NotificationJobSchema,
};
export const notificationQueue = createQueue(notificationDef);

// --- Demo Cleanup Queue ---
export const DemoCleanupJobSchema = z.object({
  action: z.enum(['cleanup_expired', 'reset_session', 'purge_tenant']),
  sessionId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
});
export type DemoCleanupJob = z.infer<typeof DemoCleanupJobSchema>;

const demoCleanupDef: QueueDefinition<DemoCleanupJob> = {
  name: 'demo-cleanup',
  schema: DemoCleanupJobSchema,
};
export const demoCleanupQueue = createQueue(demoCleanupDef);

// --- Email Queue ---
export const EmailJobSchema = z.object({
  to: z.array(z.string().email()),
  subject: z.string(),
  html: z.string(),
  replyTo: z.string().email().optional(),
  idempotencyKey: z.string().optional(),
});
export type EmailJob = z.infer<typeof EmailJobSchema>;

const emailDef: QueueDefinition<EmailJob> = {
  name: 'emails',
  schema: EmailJobSchema,
};
export const emailQueue = createQueue(emailDef);
