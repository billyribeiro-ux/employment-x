import type {
  ShortcutProfile,
  ShortcutUsageEvent,
  UpdateShortcutsRequest,
} from '@employmentx/contracts';

import type { ApiClient } from '../client';

export class ShortcutsApi {
  constructor(private readonly client: ApiClient) {}

  async getProfile(): Promise<ShortcutProfile> {
    return this.client.get<ShortcutProfile>('/v1/shortcuts');
  }

  async updateBindings(data: UpdateShortcutsRequest): Promise<ShortcutProfile> {
    return this.client.patch<ShortcutProfile>('/v1/shortcuts', data);
  }

  async trackUsage(events: ShortcutUsageEvent[]): Promise<void> {
    return this.client.post<void>('/v1/shortcuts/usage-events', { events });
  }
}
