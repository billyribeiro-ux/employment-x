import { type NextRequest, NextResponse } from 'next/server';

import { AppError } from './errors';

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = '__csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function validateCsrfToken(req: NextRequest): void {
  if (SAFE_METHODS.has(req.method)) return;

  const headerToken = req.headers.get(CSRF_HEADER);
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    throw new AppError('FORBIDDEN', 'CSRF token mismatch');
  }
}

export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.sentry.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  return response;
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function validateOrigin(req: NextRequest, allowedOrigins: string[]): void {
  const origin = req.headers.get('origin');
  if (origin && !allowedOrigins.includes(origin)) {
    throw new AppError('FORBIDDEN', 'Origin not allowed');
  }
}
