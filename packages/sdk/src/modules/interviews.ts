import type {
  CreateVideoRoomRequest,
  EndMeetingRequest,
  EndMeetingResponse,
  InterviewFeedbackRequest,
  InterviewRoomContext,
  IssueVideoTokenRequest,
  IssueVideoTokenResponse,
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

  async issueVideoToken(
    meetingId: string,
    data?: IssueVideoTokenRequest,
  ): Promise<IssueVideoTokenResponse> {
    return this.client.post<IssueVideoTokenResponse>(
      `/v1/meetings/${meetingId}/video-token`,
      data ?? {},
    );
  }

  async getInterviewRoom(meetingId: string): Promise<InterviewRoomContext> {
    return this.client.get<InterviewRoomContext>(`/v1/meetings/${meetingId}/interview-room`);
  }

  async endMeeting(meetingId: string, data?: EndMeetingRequest): Promise<EndMeetingResponse> {
    return this.client.post<EndMeetingResponse>(
      `/v1/meetings/${meetingId}/end`,
      data ?? { reason: 'manual_end' },
    );
  }
}
