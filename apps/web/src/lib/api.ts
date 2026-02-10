import { ApiClient } from '@employmentx/sdk';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

let clientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!clientInstance) {
    clientInstance = new ApiClient({ baseUrl: API_BASE_URL });
  }
  return clientInstance;
}

export function setApiToken(token: string): void {
  getApiClient().setToken(token);
}

export function clearApiToken(): void {
  getApiClient().clearToken();
  clientInstance = null;
}
