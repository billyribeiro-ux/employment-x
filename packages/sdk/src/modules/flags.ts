import type { FeatureFlag } from '@employmentx/contracts';

import type { ApiClient } from '../client';

export class FlagsApi {
  constructor(private readonly client: ApiClient) {}

  async getAll(): Promise<{ data: FeatureFlag[] }> {
    return this.client.get<{ data: FeatureFlag[] }>('/v1/flags');
  }
}
