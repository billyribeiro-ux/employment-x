import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError } from '@/lib/server/errors';

// ── Mock dependencies ──────────────────────────────────────────────────
vi.mock('@/lib/server/db', () => ({
  prisma: {
    job: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    application: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), groupBy: vi.fn(), updateMany: vi.fn() },
    conversation: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    message: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    meeting: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    meetingParticipant: { createMany: vi.fn(), update: vi.fn() },
    meetingEvent: { create: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
    candidateProfile: { findUnique: vi.fn(), upsert: vi.fn() },
    employerProfile: { findUnique: vi.fn(), upsert: vi.fn() },
    organization: { create: vi.fn(), findUnique: vi.fn() },
    orgMembership: { create: vi.fn() },
    notification: { findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    notificationPreference: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    savedSearch: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    auditEvent: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    session: { count: vi.fn(), deleteMany: vi.fn() },
    scorecard: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), aggregate: vi.fn() },
    applicationNote: { create: vi.fn(), findMany: vi.fn() },
    evaluationRubric: { create: vi.fn(), findMany: vi.fn() },
    feedbackTemplate: { create: vi.fn(), findMany: vi.fn() },
    jobTemplate: { create: vi.fn(), findMany: vi.fn() },
    subscription: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/server/audit', () => ({
  writeAuditEvent: vi.fn(),
}));

vi.mock('@/lib/server/tracing', () => ({
  withSpan: vi.fn((_name: string, _attrs: unknown, fn: () => Promise<unknown>) => fn()),
  spanAttributes: vi.fn(() => ({})),
}));

vi.mock('@/lib/server/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  checkUserRateLimit: vi.fn(),
  RATE_LIMITS: { api: {}, chat: {}, scheduling: {} },
}));

vi.mock('@/lib/server/correlation', () => ({
  getCorrelationId: vi.fn(() => 'test-correlation-id'),
}));

vi.mock('@/server/middleware/idempotency', () => ({
  withIdempotency: vi.fn((_req: unknown, fn: () => Promise<unknown>) => fn()),
}));

// Mock authenticateRequest — will be overridden per test
const mockAuthenticateRequest = vi.fn();
vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
}));

// ── Helpers ────────────────────────────────────────────────────────────
function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method, headers: { authorization: 'Bearer test-token' } };
  if (body) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['content-type'] = 'application/json';
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

function authAs(role: string, opts: { orgId?: string; orgRole?: string; userId?: string } = {}) {
  mockAuthenticateRequest.mockResolvedValue({
    userId: opts.userId ?? `user-${role}`,
    tenantId: opts.orgId ?? 'tenant-1',
    role,
    sub: opts.userId ?? `user-${role}`,
    email: `${role}@test.com`,
    org_id: opts.orgId ?? (role === 'candidate' ? undefined : 'org-1'),
    org_role: opts.orgRole,
  });
}

function authReject() {
  mockAuthenticateRequest.mockRejectedValue(
    new AppError('UNAUTHORIZED', 'Missing or invalid authorization header'),
  );
}

// ── Tests ──────────────────────────────────────────────────────────────
describe('Route Handler Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth rejection ─────────────────────────────────────────────────
  describe('Auth rejection (no token)', () => {
    it('POST /v1/jobs returns 401 without auth', async () => {
      authReject();
      const { POST } = await import('@/app/api/v1/jobs/route');
      const res = await POST(makeRequest('POST', '/api/v1/jobs', { title: 'Test' }));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /v1/conversations returns 401 without auth', async () => {
      authReject();
      const { GET } = await import('@/app/api/v1/conversations/route');
      const res = await GET(makeRequest('GET', '/api/v1/conversations'));
      expect(res.status).toBe(401);
    });

    it('POST /v1/meetings returns 401 without auth', async () => {
      authReject();
      const { POST } = await import('@/app/api/v1/meetings/route');
      const res = await POST(makeRequest('POST', '/api/v1/meetings', {}));
      expect(res.status).toBe(401);
    });

    it('GET /v1/notifications returns 401 without auth', async () => {
      authReject();
      const { GET } = await import('@/app/api/v1/notifications/route');
      const res = await GET(makeRequest('GET', '/api/v1/notifications'));
      expect(res.status).toBe(401);
    });
  });

  // ── RBAC enforcement on routes ─────────────────────────────────────
  describe('RBAC enforcement on job routes', () => {
    it('candidate cannot create jobs (RBAC deny)', async () => {
      authAs('candidate');
      const { POST } = await import('@/app/api/v1/jobs/route');
      const res = await POST(makeRequest('POST', '/api/v1/jobs', {
        title: 'Test', description: 'Desc', employment_type: 'full_time', experience_level: 'mid',
      }));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('employer can list jobs (public endpoint)', async () => {
      authAs('employer');
      const { prisma } = await import('@/lib/server/db');
      vi.mocked(prisma.job.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.job.count).mockResolvedValueOnce(0);

      const { GET } = await import('@/app/api/v1/jobs/route');
      const res = await GET(makeRequest('GET', '/api/v1/jobs'));
      expect(res.status).toBe(200);
    });
  });

  describe('RBAC enforcement on conversation routes', () => {
    it('candidate cannot create conversations (RBAC deny)', async () => {
      authAs('candidate');
      const { POST } = await import('@/app/api/v1/conversations/route');
      const res = await POST(makeRequest('POST', '/api/v1/conversations', {
        participant_ids: ['user-2'],
      }));
      expect(res.status).toBe(403);
    });

    it('employer can create conversations', async () => {
      authAs('employer');
      const { prisma } = await import('@/lib/server/db');
      vi.mocked(prisma.conversation.create).mockResolvedValueOnce({
        id: 'conv-1',
        tenantId: 'org-1',
        subject: null,
        applicationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [
          { id: 'p1', userId: 'user-employer', user: { id: 'user-employer', firstName: 'Test', lastName: 'Employer', email: 'e@t.com' } },
          { id: 'p2', userId: 'user-2', user: { id: 'user-2', firstName: 'Other', lastName: 'User', email: 'o@t.com' } },
        ],
      } as never);

      const { POST } = await import('@/app/api/v1/conversations/route');
      const res = await POST(makeRequest('POST', '/api/v1/conversations', {
        participant_ids: ['user-2'],
      }));
      expect(res.status).toBe(201);
    });
  });

  describe('RBAC enforcement on meeting routes', () => {
    it('candidate cannot create meetings (RBAC deny)', async () => {
      authAs('candidate');
      const { POST } = await import('@/app/api/v1/meetings/route');
      const res = await POST(makeRequest('POST', '/api/v1/meetings', {
        title: 'Interview',
        scheduled_start_at: '2026-03-01T14:00:00Z',
        scheduled_end_at: '2026-03-01T15:00:00Z',
        participant_ids: ['user-2'],
      }));
      expect(res.status).toBe(403);
    });

    it('employer can create meetings', async () => {
      authAs('employer');
      const { prisma } = await import('@/lib/server/db');
      const futureStart = new Date(Date.now() + 86400000).toISOString();
      const futureEnd = new Date(Date.now() + 90000000).toISOString();
      vi.mocked(prisma.meeting.create).mockResolvedValueOnce({
        id: 'mtg-1',
        tenantId: 'org-1',
        organizationId: 'org-1',
        title: 'Interview',
        description: null,
        timezone: 'UTC',
        scheduledStartAt: new Date(futureStart),
        scheduledEndAt: new Date(futureEnd),
        joinWindowOpenAt: new Date(futureStart),
        joinWindowCloseAt: new Date(futureEnd),
        status: 'REQUESTED',
        applicationId: null,
        createdByUserId: 'user-employer',
        providerRoomName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [
          { id: 'mp1', userId: 'user-employer', role: 'HOST', tenantId: 'org-1' },
          { id: 'mp2', userId: 'user-2', role: 'CANDIDATE', tenantId: 'org-1' },
        ],
      } as never);
      vi.mocked(prisma.meeting.update).mockResolvedValueOnce({} as never);

      const { POST } = await import('@/app/api/v1/meetings/route');
      const res = await POST(makeRequest('POST', '/api/v1/meetings', {
        title: 'Interview',
        scheduled_start_at: futureStart,
        scheduled_end_at: futureEnd,
        participants: [{ user_id: 'user-employer', role: 'HOST' }, { user_id: 'user-2', role: 'CANDIDATE' }],
      }));
      expect(res.status).toBe(201);
    });
  });

  // ── Candidate profile routes ───────────────────────────────────────
  describe('Candidate profile routes', () => {
    it('employer cannot access candidate profile', async () => {
      authAs('employer');
      const { GET } = await import('@/app/api/v1/candidates/profile/route');
      const res = await GET(makeRequest('GET', '/api/v1/candidates/profile'));
      expect(res.status).toBe(403);
    });

    it('candidate can read own profile', async () => {
      authAs('candidate', { orgId: undefined });
      const { prisma } = await import('@/lib/server/db');
      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce(null);

      const { GET } = await import('@/app/api/v1/candidates/profile/route');
      const res = await GET(makeRequest('GET', '/api/v1/candidates/profile'));
      expect(res.status).toBe(200);
    });
  });

  // ── Admin routes ───────────────────────────────────────────────────
  describe('Admin route access control', () => {
    it('non-admin cannot access admin users route', async () => {
      authAs('employer');
      const { GET } = await import('@/app/api/v1/admin/users/route');
      const res = await GET(makeRequest('GET', '/api/v1/admin/users'));
      expect(res.status).toBe(403);
    });

    it('admin can access admin users route', async () => {
      authAs('admin');
      const { prisma } = await import('@/lib/server/db');
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0);

      const { GET } = await import('@/app/api/v1/admin/users/route');
      const res = await GET(makeRequest('GET', '/api/v1/admin/users'));
      expect(res.status).toBe(200);
    });
  });

  // ── Saved searches ─────────────────────────────────────────────────
  describe('Saved searches routes', () => {
    it('authenticated user can list saved searches', async () => {
      authAs('candidate');
      const { prisma } = await import('@/lib/server/db');
      vi.mocked(prisma.savedSearch.findMany).mockResolvedValueOnce([]);

      const { GET } = await import('@/app/api/v1/saved-searches/route');
      const res = await GET(makeRequest('GET', '/api/v1/saved-searches'));
      expect(res.status).toBe(200);
    });
  });

  // ── Notifications ──────────────────────────────────────────────────
  describe('Notification routes', () => {
    it('authenticated user can list notifications', async () => {
      authAs('employer');
      const { prisma } = await import('@/lib/server/db');
      vi.mocked(prisma.notification.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.notification.count).mockResolvedValueOnce(0);

      const { GET } = await import('@/app/api/v1/notifications/route');
      const res = await GET(makeRequest('GET', '/api/v1/notifications'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.unread_count).toBe(0);
    });
  });

  // ── Jobs apply route ───────────────────────────────────────────────
  describe('Jobs apply route', () => {
    it('employer cannot apply to jobs (RBAC deny)', async () => {
      authAs('employer');
      const { POST } = await import('@/app/api/v1/jobs/[id]/apply/route');
      const res = await POST(
        makeRequest('POST', '/api/v1/jobs/job-1/apply', {}),
        { params: Promise.resolve({ id: 'job-1' }) },
      );
      // employer has create Application? No — employer can only read/update Application
      // Actually employer doesn't have 'create' Application — only candidate does
      expect(res.status).toBe(403);
    });

    it('candidate can apply to published job', async () => {
      authAs('candidate', { userId: 'user-cand', orgId: undefined });
      const { prisma } = await import('@/lib/server/db');
      vi.mocked(prisma.job.findUnique).mockResolvedValueOnce({
        id: 'job-1',
        status: 'published',
        organizationId: 'org-1',
      } as never);
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.application.create).mockResolvedValueOnce({
        id: 'app-1',
        jobId: 'job-1',
        candidateId: 'user-cand',
        stage: 'applied',
        createdAt: new Date(),
      } as never);

      const { POST } = await import('@/app/api/v1/jobs/[id]/apply/route');
      const res = await POST(
        makeRequest('POST', '/api/v1/jobs/job-1/apply', { cover_letter: 'I am interested' }),
        { params: Promise.resolve({ id: 'job-1' }) },
      );
      expect(res.status).toBe(201);
    });
  });
});
