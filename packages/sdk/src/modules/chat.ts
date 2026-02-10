import type {
  Conversation,
  CreateConversationRequest,
  Message,
  MessageAttachment,
  PaginationParams,
  SendMessageRequest,
} from '@employmentx/contracts';

import type { ApiClient } from '../client';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

export class ChatApi {
  constructor(private readonly client: ApiClient) {}

  async createConversation(data: CreateConversationRequest): Promise<Conversation> {
    return this.client.post<Conversation>('/v1/conversations', data);
  }

  async listConversations(params?: PaginationParams): Promise<PaginatedResponse<Conversation>> {
    return this.client.get<PaginatedResponse<Conversation>>('/v1/conversations', params as Record<string, string | number | boolean | undefined>);
  }

  async getMessages(
    conversationId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Message>> {
    return this.client.get<PaginatedResponse<Message>>(
      `/v1/conversations/${conversationId}/messages`,
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  async sendMessage(conversationId: string, data: SendMessageRequest): Promise<Message> {
    return this.client.post<Message>(`/v1/conversations/${conversationId}/messages`, data);
  }

  async markRead(conversationId: string): Promise<void> {
    return this.client.post<void>(`/v1/conversations/${conversationId}/read`);
  }

  async uploadAttachment(conversationId: string, file: File): Promise<MessageAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.client.post<MessageAttachment>(
      `/v1/conversations/${conversationId}/attachments`,
      formData,
    );
  }
}
