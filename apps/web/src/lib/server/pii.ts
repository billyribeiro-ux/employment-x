const PII_FIELDS = new Set([
  'password',
  'password_hash',
  'passwordHash',
  'secret',
  'token',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'authorization',
  'cookie',
  'ssn',
  'social_security',
  'credit_card',
  'creditCard',
  'card_number',
  'cardNumber',
  'cvv',
  'cvc',
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;

const REDACTED = '[REDACTED]';

export function redactPiiFromObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (PII_FIELDS.has(key.toLowerCase())) {
      (result as Record<string, unknown>)[key] = REDACTED;
    } else if (typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = redactPiiFromString(result[key] as string);
    } else if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
      (result as Record<string, unknown>)[key] = redactPiiFromObject(result[key] as Record<string, unknown>);
    }
  }
  return result;
}

export function redactPiiFromString(str: string): string {
  return str
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replace(SSN_REGEX, '[SSN_REDACTED]')
    .replace(PHONE_REGEX, '[PHONE_REDACTED]');
}

export function safeLogContext(context: Record<string, unknown>): Record<string, unknown> {
  return redactPiiFromObject(context);
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const result = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
  for (const key of Object.keys(result)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      result[key] = REDACTED;
    }
  }
  return result;
}
