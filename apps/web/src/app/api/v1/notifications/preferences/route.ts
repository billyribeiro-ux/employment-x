import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse } from '@/lib/server/errors';
import { withSpan, spanAttributes } from '@/lib/server/tracing';
import { prisma } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  return withSpan('GET /v1/notifications/preferences', spanAttributes(req), async () => {
    try {
      const ctx = await authenticateRequest(req.headers.get('authorization'));

      let prefs = await prisma.notificationPreference.findUnique({
        where: { userId: ctx.userId },
      });

      if (!prefs) {
        prefs = await prisma.notificationPreference.create({
          data: { userId: ctx.userId },
        });
      }

      return successResponse(req, { preferences: mapPrefs(prefs) });
    } catch (err) {
      return handleRouteError(req, err);
    }
  });
}

export async function PUT(req: NextRequest) {
  return withSpan('PUT /v1/notifications/preferences', spanAttributes(req), async () => {
    try {
      const ctx = await authenticateRequest(req.headers.get('authorization'));
      const body = await req.json();

      const prefs = await prisma.notificationPreference.upsert({
        where: { userId: ctx.userId },
        create: {
          userId: ctx.userId,
          emailEnabled: body.email_enabled ?? true,
          pushEnabled: body.push_enabled ?? true,
          jobAlerts: body.job_alerts ?? true,
          applicationUpdates: body.application_updates ?? true,
          meetingReminders: body.meeting_reminders ?? true,
          chatMessages: body.chat_messages ?? true,
          marketingEmails: body.marketing_emails ?? false,
        },
        update: {
          ...(body.email_enabled != null && { emailEnabled: body.email_enabled }),
          ...(body.push_enabled != null && { pushEnabled: body.push_enabled }),
          ...(body.job_alerts != null && { jobAlerts: body.job_alerts }),
          ...(body.application_updates != null && { applicationUpdates: body.application_updates }),
          ...(body.meeting_reminders != null && { meetingReminders: body.meeting_reminders }),
          ...(body.chat_messages != null && { chatMessages: body.chat_messages }),
          ...(body.marketing_emails != null && { marketingEmails: body.marketing_emails }),
        },
      });

      return successResponse(req, { preferences: mapPrefs(prefs) });
    } catch (err) {
      return handleRouteError(req, err);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPrefs(p: any) {
  return {
    email_enabled: p.emailEnabled,
    push_enabled: p.pushEnabled,
    job_alerts: p.jobAlerts,
    application_updates: p.applicationUpdates,
    meeting_reminders: p.meetingReminders,
    chat_messages: p.chatMessages,
    marketing_emails: p.marketingEmails,
  };
}
