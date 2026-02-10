import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env['SENTRY_DSN'] ?? '';
const SENTRY_ENVIRONMENT = process.env['SENTRY_ENVIRONMENT'] ?? process.env['NODE_ENV'] ?? 'development';
const SENTRY_RELEASE = process.env['SENTRY_RELEASE'] ?? 'dev';

let initialized = false;

export function initSentry(): void {
  if (initialized || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http' && breadcrumb.data) {
        delete breadcrumb.data['request_body'];
      }
      return breadcrumb;
    },
  });

  initialized = true;
}

export function captureError(
  err: unknown,
  context?: { correlationId?: string; tenantId?: string; userId?: string },
): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context?.correlationId) scope.setTag('correlation_id', context.correlationId);
    if (context?.tenantId) scope.setTag('tenant_id', context.tenantId);
    if (context?.userId) scope.setUser({ id: context.userId });

    if (err instanceof Error) {
      Sentry.captureException(err);
    } else {
      Sentry.captureMessage(String(err), 'error');
    }
  });
}
