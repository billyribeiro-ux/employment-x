import { z } from 'zod';

import { TimestampsSchema } from './common';

export const ConversationSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid().nullable(),
    subject: z.string().max(255).nullable(),
    conversation_type: z.enum(['direct', 'group', 'system']),
    last_message_at: z.string().datetime().nullable(),
    is_archived: z.boolean(),
  })
  .merge(TimestampsSchema);
export type Conversation = z.infer<typeof ConversationSchema>;

export const CreateConversationRequestSchema = z.object({
  participant_ids: z.array(z.string().uuid()).min(1).max(50),
  subject: z.string().max(255).optional(),
  initial_message: z.string().max(10000).optional(),
});
export type CreateConversationRequest = z.infer<typeof CreateConversationRequestSchema>;

export const MessageSchema = z
  .object({
    id: z.string().uuid(),
    conversation_id: z.string().uuid(),
    sender_id: z.string().uuid(),
    body: z.string().max(10000),
    reply_to_id: z.string().uuid().nullable(),
    is_edited: z.boolean(),
    is_deleted: z.boolean(),
  })
  .merge(TimestampsSchema);
export type Message = z.infer<typeof MessageSchema>;

export const SendMessageRequestSchema = z.object({
  body: z.string().min(1).max(10000),
  reply_to_id: z.string().uuid().optional(),
  attachment_ids: z.array(z.string().uuid()).max(10).optional(),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const MessageReceiptSchema = z.object({
  id: z.string().uuid(),
  message_id: z.string().uuid(),
  user_id: z.string().uuid(),
  read_at: z.string().datetime(),
});
export type MessageReceipt = z.infer<typeof MessageReceiptSchema>;

export const MessageAttachmentSchema = z
  .object({
    id: z.string().uuid(),
    message_id: z.string().uuid(),
    filename: z.string().max(255),
    mime_type: z.string().max(100),
    size_bytes: z.number().int(),
    storage_key: z.string(),
    upload_url: z.string().url().optional(),
    download_url: z.string().url().optional(),
  })
  .merge(TimestampsSchema);
export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;

export const TypingIndicatorSchema = z.object({
  conversation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  is_typing: z.boolean(),
});
export type TypingIndicator = z.infer<typeof TypingIndicatorSchema>;
