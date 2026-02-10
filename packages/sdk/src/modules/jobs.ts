import type {
  CreateJobRequest,
  JobPost,
  JobSearchParams,
  PaginationParams,
  UpdateJobRequest,
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

export class JobsApi {
  constructor(private readonly client: ApiClient) {}

  async list(params?: PaginationParams & JobSearchParams): Promise<PaginatedResponse<JobPost>> {
    return this.client.get<PaginatedResponse<JobPost>>('/v1/jobs', params as Record<string, string | number | boolean | undefined>);
  }

  async create(data: CreateJobRequest): Promise<JobPost> {
    return this.client.post<JobPost>('/v1/jobs', data);
  }

  async get(id: string): Promise<JobPost> {
    return this.client.get<JobPost>(`/v1/jobs/${id}`);
  }

  async update(id: string, data: UpdateJobRequest): Promise<JobPost> {
    return this.client.patch<JobPost>(`/v1/jobs/${id}`, data);
  }
}
