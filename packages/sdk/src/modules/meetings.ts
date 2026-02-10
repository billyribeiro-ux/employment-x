import type {
  AcceptMeetingRequest,
  CreateMeetingRequest,
  DenyMeetingRequest,
  MeetingRequest,
  PaginationParams,
  RescheduleMeetingRequest,
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

export class MeetingsApi {
  constructor(private readonly client: ApiClient) {}

  async create(data: CreateMeetingRequest, idempotencyKey: string): Promise<MeetingRequest> {
    return this.client.post<MeetingRequest>('/v1/meetings/request', data, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async accept(
    id: string,
    data: AcceptMeetingRequest,
    idempotencyKey: string,
  ): Promise<MeetingRequest> {
    return this.client.post<MeetingRequest>(`/v1/meetings/${id}/accept`, data, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async deny(id: string, data: DenyMeetingRequest, idempotencyKey: string): Promise<MeetingRequest> {
    return this.client.post<MeetingRequest>(`/v1/meetings/${id}/deny`, data, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async reschedule(
    id: string,
    data: RescheduleMeetingRequest,
    idempotencyKey: string,
  ): Promise<MeetingRequest> {
    return this.client.post<MeetingRequest>(`/v1/meetings/${id}/reschedule`, data, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async get(id: string): Promise<MeetingRequest> {
    return this.client.get<MeetingRequest>(`/v1/meetings/${id}`);
  }

  async list(params?: PaginationParams): Promise<PaginatedResponse<MeetingRequest>> {
    return this.client.get<PaginatedResponse<MeetingRequest>>('/v1/meetings', params as Record<string, string | number | boolean | undefined>);
  }
}
