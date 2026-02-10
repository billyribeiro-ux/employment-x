import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    openapi: '3.0.3',
    info: {
      title: 'EmploymentX API',
      version: '0.5.0-m5',
      description: 'Full-stack hiring platform API',
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    paths: {
      '/auth/register': {
        post: { summary: 'Register a new user', tags: ['Auth'], requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'first_name', 'last_name', 'role'], properties: { email: { type: 'string' }, password: { type: 'string', minLength: 12 }, first_name: { type: 'string' }, last_name: { type: 'string' }, role: { type: 'string', enum: ['candidate', 'employer'] } } } } } }, responses: { '201': { description: 'User registered, tokens returned' } } },
      },
      '/auth/login': {
        post: { summary: 'Login', tags: ['Auth'], responses: { '200': { description: 'Tokens returned' } } },
      },
      '/auth/logout': {
        post: { summary: 'Logout (invalidate refresh token)', tags: ['Auth'] },
      },
      '/auth/reset-password': {
        post: { summary: 'Request or confirm password reset', tags: ['Auth'] },
      },
      '/organizations': {
        post: { summary: 'Create organization', tags: ['Organizations'], security: [{ bearer: [] }] },
      },
      '/candidates/profile': {
        get: { summary: 'Get candidate profile', tags: ['Candidates'], security: [{ bearer: [] }] },
        put: { summary: 'Update candidate profile', tags: ['Candidates'], security: [{ bearer: [] }] },
      },
      '/employers/profile': {
        get: { summary: 'Get employer profile', tags: ['Employers'], security: [{ bearer: [] }] },
        put: { summary: 'Update employer profile', tags: ['Employers'], security: [{ bearer: [] }] },
      },
      '/jobs': {
        get: { summary: 'List jobs (public, paginated, filterable)', tags: ['Jobs'] },
        post: { summary: 'Create job posting', tags: ['Jobs'], security: [{ bearer: [] }] },
      },
      '/jobs/{id}/apply': {
        post: { summary: 'Apply to a job', tags: ['Applications'], security: [{ bearer: [] }] },
      },
      '/applications/{id}/stage': {
        post: { summary: 'Transition application stage', tags: ['Applications'], security: [{ bearer: [] }] },
      },
      '/applications/{id}/scorecards': {
        get: { summary: 'List scorecards for application', tags: ['Scorecards'], security: [{ bearer: [] }] },
        post: { summary: 'Submit scorecard', tags: ['Scorecards'], security: [{ bearer: [] }] },
      },
      '/applications/{id}/notes': {
        get: { summary: 'List application notes', tags: ['Notes'], security: [{ bearer: [] }] },
        post: { summary: 'Add note with @mentions', tags: ['Notes'], security: [{ bearer: [] }] },
      },
      '/applications/bulk': {
        post: { summary: 'Bulk application actions', tags: ['Applications'], security: [{ bearer: [] }] },
      },
      '/conversations': {
        get: { summary: 'List conversations', tags: ['Chat'], security: [{ bearer: [] }] },
        post: { summary: 'Create conversation', tags: ['Chat'], security: [{ bearer: [] }] },
      },
      '/conversations/{id}/messages': {
        get: { summary: 'List messages (paginated)', tags: ['Chat'], security: [{ bearer: [] }] },
        post: { summary: 'Send message', tags: ['Chat'], security: [{ bearer: [] }] },
      },
      '/meetings': {
        get: { summary: 'List meeting requests', tags: ['Scheduling'], security: [{ bearer: [] }] },
        post: { summary: 'Create meeting request', tags: ['Scheduling'], security: [{ bearer: [] }] },
      },
      '/meetings/{id}/respond': {
        post: { summary: 'Accept or deny meeting', tags: ['Scheduling'], security: [{ bearer: [] }] },
      },
      '/meetings/{id}/reschedule': {
        post: { summary: 'Reschedule meeting', tags: ['Scheduling'], security: [{ bearer: [] }] },
      },
      '/billing': {
        get: { summary: 'Get subscription & usage', tags: ['Billing'], security: [{ bearer: [] }] },
        post: { summary: 'Change plan', tags: ['Billing'], security: [{ bearer: [] }] },
      },
      '/notifications': {
        get: { summary: 'List notifications', tags: ['Notifications'], security: [{ bearer: [] }] },
        patch: { summary: 'Mark notifications as read', tags: ['Notifications'], security: [{ bearer: [] }] },
      },
      '/notifications/preferences': {
        get: { summary: 'Get notification preferences', tags: ['Notifications'], security: [{ bearer: [] }] },
        put: { summary: 'Update notification preferences', tags: ['Notifications'], security: [{ bearer: [] }] },
      },
      '/saved-searches': {
        get: { summary: 'List saved searches', tags: ['Search'], security: [{ bearer: [] }] },
        post: { summary: 'Create saved search', tags: ['Search'], security: [{ bearer: [] }] },
      },
      '/feedback-templates': {
        get: { summary: 'List feedback templates', tags: ['Evaluation'], security: [{ bearer: [] }] },
        post: { summary: 'Create feedback template', tags: ['Evaluation'], security: [{ bearer: [] }] },
      },
      '/evaluation-rubrics': {
        get: { summary: 'List evaluation rubrics', tags: ['Evaluation'], security: [{ bearer: [] }] },
        post: { summary: 'Create evaluation rubric', tags: ['Evaluation'], security: [{ bearer: [] }] },
      },
      '/job-templates': {
        get: { summary: 'List job templates', tags: ['Jobs'], security: [{ bearer: [] }] },
        post: { summary: 'Create job template', tags: ['Jobs'], security: [{ bearer: [] }] },
      },
      '/analytics/pipeline': {
        get: { summary: 'Pipeline analytics', tags: ['Analytics'], security: [{ bearer: [] }] },
      },
      '/integrations': {
        get: { summary: 'List supported integrations', tags: ['Integrations'], security: [{ bearer: [] }] },
        post: { summary: 'Import/export via integration', tags: ['Integrations'], security: [{ bearer: [] }] },
      },
      '/demo/scenarios': {
        get: { summary: 'List demo scenarios', tags: ['Demo'] },
      },
      '/admin/slo': {
        get: { summary: 'SLO dashboard metrics', tags: ['Admin'], security: [{ bearer: [] }] },
      },
      '/admin/users': {
        get: { summary: 'List users (admin)', tags: ['Admin'], security: [{ bearer: [] }] },
        patch: { summary: 'Update user (admin)', tags: ['Admin'], security: [{ bearer: [] }] },
      },
      '/admin/audit-export': {
        get: { summary: 'Export audit log (JSON/CSV)', tags: ['Admin'], security: [{ bearer: [] }] },
      },
      '/health': {
        get: { summary: 'Health check', tags: ['System'] },
      },
    },
    components: {
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [
      { name: 'Auth' }, { name: 'Organizations' }, { name: 'Candidates' }, { name: 'Employers' },
      { name: 'Jobs' }, { name: 'Applications' }, { name: 'Scorecards' }, { name: 'Notes' },
      { name: 'Chat' }, { name: 'Scheduling' }, { name: 'Billing' }, { name: 'Notifications' },
      { name: 'Search' }, { name: 'Evaluation' }, { name: 'Analytics' }, { name: 'Integrations' },
      { name: 'Demo' }, { name: 'Admin' }, { name: 'System' },
    ],
  });
}
