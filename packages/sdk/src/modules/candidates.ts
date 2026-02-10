import type {
  CandidateDocument,
  CandidateProfile,
  CandidateSearchParams,
  CreateCandidateRequest,
  PaginationParams,
  UpdateCandidateRequest,
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

export class CandidatesApi {
  constructor(private readonly client: ApiClient) {}

  async list(
    params?: PaginationParams & CandidateSearchParams,
  ): Promise<PaginatedResponse<CandidateProfile>> {
    return this.client.get<PaginatedResponse<CandidateProfile>>('/v1/candidates', params as Record<string, string | number | boolean | undefined>);
  }

  async create(data: CreateCandidateRequest): Promise<CandidateProfile> {
    return this.client.post<CandidateProfile>('/v1/candidates', data);
  }

  async get(id: string): Promise<CandidateProfile> {
    return this.client.get<CandidateProfile>(`/v1/candidates/${id}`);
  }

  async update(id: string, data: UpdateCandidateRequest): Promise<CandidateProfile> {
    return this.client.patch<CandidateProfile>(`/v1/candidates/${id}`, data);
  }

  async uploadDocument(id: string, file: File, documentType: string): Promise<CandidateDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    return this.client.post<CandidateDocument>(`/v1/candidates/${id}/documents`, formData);
  }
}
