import type {
  Company,
  CreateCompanyRequest,
  EmployerProfile,
  UpdateCompanyRequest,
} from '@employmentx/contracts';

import type { ApiClient } from '../client';

export class CompaniesApi {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<{ data: Company[] }> {
    return this.client.get<{ data: Company[] }>('/v1/companies');
  }

  async create(data: CreateCompanyRequest): Promise<Company> {
    return this.client.post<Company>('/v1/companies', data);
  }

  async update(id: string, data: UpdateCompanyRequest): Promise<Company> {
    return this.client.patch<Company>(`/v1/companies/${id}`, data);
  }

  async getMyProfile(): Promise<EmployerProfile> {
    return this.client.get<EmployerProfile>('/v1/employers/me');
  }
}
