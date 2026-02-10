import type {
  Application,
  ApplyRequest,
  CreateDecisionRequest,
  DecisionRecord,
  StageTransitionRequest,
} from '@employmentx/contracts';

import type { ApiClient } from '../client';

export class ApplicationsApi {
  constructor(private readonly client: ApiClient) {}

  async apply(jobId: string, data: ApplyRequest, idempotencyKey: string): Promise<Application> {
    return this.client.post<Application>(`/v1/jobs/${jobId}/apply`, data, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async get(id: string): Promise<Application> {
    return this.client.get<Application>(`/v1/applications/${id}`);
  }

  async transitionStage(
    id: string,
    data: StageTransitionRequest,
    idempotencyKey: string,
  ): Promise<Application> {
    return this.client.post<Application>(`/v1/applications/${id}/stage`, data, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async createDecision(
    id: string,
    data: CreateDecisionRequest,
    idempotencyKey: string,
  ): Promise<DecisionRecord> {
    return this.client.post<DecisionRecord>(`/v1/applications/${id}/decision`, data, {
      'Idempotency-Key': idempotencyKey,
    });
  }
}
