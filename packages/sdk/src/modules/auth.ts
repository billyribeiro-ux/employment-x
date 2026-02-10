import type {
  AuthTokenResponse,
  LoginRequest,
  MeResponse,
  RegisterRequest,
} from '@employmentx/contracts';

import type { ApiClient } from '../client';

export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  async register(data: RegisterRequest): Promise<AuthTokenResponse> {
    return this.client.post<AuthTokenResponse>('/v1/auth/register', data);
  }

  async login(data: LoginRequest): Promise<AuthTokenResponse> {
    return this.client.post<AuthTokenResponse>('/v1/auth/login', data);
  }

  async logout(): Promise<void> {
    return this.client.post<void>('/v1/auth/logout');
  }

  async me(): Promise<MeResponse> {
    return this.client.get<MeResponse>('/v1/me');
  }
}
