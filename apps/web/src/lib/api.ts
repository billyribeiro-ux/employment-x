import {
  ApiClient,
  AuthApi,
  CandidatesApi,
  CompaniesApi,
  JobsApi,
  ApplicationsApi,
  ChatApi,
  MeetingsApi,
  InterviewsApi,
  BillingApi,
  ShortcutsApi,
  FlagsApi,
} from '@employmentx/sdk';

export const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';

let _token: string | null = null;

function createClient(): ApiClient {
  return new ApiClient({
    baseUrl: API_BASE_URL,
    getAccessToken: async () => _token,
    onUnauthorized: () => {
      _token = null;
    },
  });
}

export interface EmploymentXClient {
  readonly auth: AuthApi;
  readonly candidates: CandidatesApi;
  readonly companies: CompaniesApi;
  readonly jobs: JobsApi;
  readonly applications: ApplicationsApi;
  readonly chat: ChatApi;
  readonly meetings: MeetingsApi;
  readonly interviews: InterviewsApi;
  readonly billing: BillingApi;
  readonly shortcuts: ShortcutsApi;
  readonly flags: FlagsApi;
}

let clientInstance: EmploymentXClient | null = null;

export function getApiClient(): EmploymentXClient {
  if (!clientInstance) {
    const raw = createClient();
    clientInstance = {
      auth: new AuthApi(raw),
      candidates: new CandidatesApi(raw),
      companies: new CompaniesApi(raw),
      jobs: new JobsApi(raw),
      applications: new ApplicationsApi(raw),
      chat: new ChatApi(raw),
      meetings: new MeetingsApi(raw),
      interviews: new InterviewsApi(raw),
      billing: new BillingApi(raw),
      shortcuts: new ShortcutsApi(raw),
      flags: new FlagsApi(raw),
    };
  }
  return clientInstance;
}

export function setApiToken(token: string): void {
  _token = token;
}

export function clearApiToken(): void {
  _token = null;
  clientInstance = null;
}
