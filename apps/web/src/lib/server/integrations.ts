import { AppError } from './errors';

export interface CalendarEvent {
  title: string;
  description?: string | undefined;
  start: Date;
  end: Date;
  attendees: string[];
  location?: string | undefined;
  meetingUrl?: string | undefined;
}

export interface CalendarSyncResult {
  provider: string;
  externalId: string;
  status: 'created' | 'updated' | 'deleted';
}

export async function syncToGoogleCalendar(_event: CalendarEvent): Promise<CalendarSyncResult> {
  // Stub: requires OAuth2 token + Google Calendar API
  return {
    provider: 'google',
    externalId: `gcal-stub-${Date.now()}`,
    status: 'created',
  };
}

export async function syncToOutlookCalendar(_event: CalendarEvent): Promise<CalendarSyncResult> {
  // Stub: requires OAuth2 token + Microsoft Graph API
  return {
    provider: 'outlook',
    externalId: `outlook-stub-${Date.now()}`,
    status: 'created',
  };
}

export interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string | undefined;
}

export async function sendEmail(payload: EmailPayload): Promise<{ messageId: string }> {
  // Stub: requires SMTP or email service (SendGrid, Resend, etc.)
  if (!payload.to.length) {
    throw new AppError('VALIDATION_ERROR', 'At least one recipient is required');
  }
  return { messageId: `email-stub-${Date.now()}` };
}

export interface AtsExportRecord {
  type: 'candidate' | 'job' | 'application';
  id: string;
  data: Record<string, unknown>;
}

export async function exportToAts(
  records: AtsExportRecord[],
  _provider: string,
): Promise<{ exported: number; errors: number }> {
  // Stub: requires ATS provider API integration (Greenhouse, Lever, etc.)
  return { exported: records.length, errors: 0 };
}

export async function importFromAts(
  _provider: string,
  _config: Record<string, unknown>,
): Promise<{ imported: number; skipped: number; errors: number }> {
  // Stub: requires ATS provider API integration
  return { imported: 0, skipped: 0, errors: 0 };
}

export function getSupportedProviders() {
  return {
    calendar: [
      { id: 'google', name: 'Google Calendar', status: 'stub' },
      { id: 'outlook', name: 'Microsoft Outlook', status: 'stub' },
    ],
    email: [
      { id: 'sendgrid', name: 'SendGrid', status: 'stub' },
      { id: 'resend', name: 'Resend', status: 'stub' },
    ],
    ats: [
      { id: 'greenhouse', name: 'Greenhouse', status: 'stub' },
      { id: 'lever', name: 'Lever', status: 'stub' },
      { id: 'workday', name: 'Workday', status: 'stub' },
    ],
  };
}
