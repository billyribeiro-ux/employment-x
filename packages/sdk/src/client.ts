import type { ApiError } from '@employmentx/contracts';

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  onUnauthorized?: () => void;
  requestId?: () => string;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly body: ApiError;
  public readonly requestId: string;

  constructor(status: number, body: ApiError) {
    super(body.error.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.body = body;
    this.requestId = body.error.request_id;
  }
}

export class ApiClient {
  private readonly config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  private async headers(extra?: Record<string, string>): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extra,
    };

    const token = await this.config.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (this.config.requestId) {
      headers['X-Request-Id'] = this.config.requestId();
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      this.config.onUnauthorized?.();
    }

    if (!response.ok) {
      const body = (await response.json()) as ApiError;
      throw new ApiClientError(response.status, body);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.headers(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: await this.headers(extraHeaders),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'PATCH',
      headers: await this.headers(extraHeaders),
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'DELETE',
      headers: await this.headers(),
    });

    return this.handleResponse<T>(response);
  }
}
