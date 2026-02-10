import type {
  CreateVideoRoomRequest,
  InterviewFeedbackRequest,
  VideoRoom,
  VideoRoomToken,
  VideoSessionEvent,
} from '@employmentx/contracts';

import type { ApiClient } from '../client';

export class InterviewsApi {
  constructor(private readonly client: ApiClient) {}

  async createRoom(data: CreateVideoRoomRequest): Promise<VideoRoom> {
    return this.client.post<VideoRoom>('/v1/interviews/rooms', data);
  }

  async getRoomToken(roomId: string): Promise<VideoRoomToken> {
    return this.client.post<VideoRoomToken>(`/v1/interviews/rooms/${roomId}/token`);
  }

  async sendSessionEvent(
    sessionId: string,
    event: Omit<VideoSessionEvent, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<void> {
    return this.client.post<void>(`/v1/interviews/sessions/${sessionId}/events`, event);
  }

  async submitFeedback(sessionId: string, data: InterviewFeedbackRequest): Promise<void> {
    return this.client.post<void>(`/v1/interviews/sessions/${sessionId}/feedback`, data);
  }
}
