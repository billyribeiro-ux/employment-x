import type {
  BillingUsageResponse,
  CreateSubscriptionRequest,
  Plan,
  Subscription,
  UpdateSubscriptionRequest,
} from '@employmentx/contracts';

import type { ApiClient } from '../client';

export class BillingApi {
  constructor(private readonly client: ApiClient) {}

  async getPlans(): Promise<{ data: Plan[] }> {
    return this.client.get<{ data: Plan[] }>('/v1/billing/plans');
  }

  async createSubscription(
    data: CreateSubscriptionRequest,
    idempotencyKey: string,
  ): Promise<Subscription> {
    return this.client.post<Subscription>('/v1/billing/subscriptions', data, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async updateSubscription(
    id: string,
    data: UpdateSubscriptionRequest,
    idempotencyKey: string,
  ): Promise<Subscription> {
    return this.client.patch<Subscription>(`/v1/billing/subscriptions/${id}`, data, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async getUsage(): Promise<BillingUsageResponse> {
    return this.client.get<BillingUsageResponse>('/v1/billing/usage');
  }
}
