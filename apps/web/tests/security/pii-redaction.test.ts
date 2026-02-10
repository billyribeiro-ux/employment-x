import { describe, it, expect } from 'vitest';

import {
  redactPiiFromObject,
  redactPiiFromString,
  redactHeaders,
} from '../../src/lib/server/pii';

describe('[F-202] PII Redaction', () => {
  describe('redactPiiFromObject', () => {
    it('redacts password fields', () => {
      const result = redactPiiFromObject({ password: 'secret123', name: 'Alice' });
      expect(result.password).toBe('[REDACTED]');
      expect(result.name).toBe('Alice');
    });

    it('redacts token fields', () => {
      const result = redactPiiFromObject({ access_token: 'abc', refresh_token: 'def' });
      expect(result.access_token).toBe('[REDACTED]');
      expect(result.refresh_token).toBe('[REDACTED]');
    });

    it('redacts nested objects', () => {
      const result = redactPiiFromObject({
        user: { password: 'secret', email: 'alice@example.com' },
      });
      expect((result.user as Record<string, unknown>).password).toBe('[REDACTED]');
    });

    it('redacts emails in string values', () => {
      const result = redactPiiFromObject({ note: 'Contact alice@example.com for details' });
      expect(result.note).toContain('[EMAIL_REDACTED]');
      expect(result.note).not.toContain('alice@example.com');
    });

    it('redacts SSNs in string values', () => {
      const result = redactPiiFromObject({ note: 'SSN is 123-45-6789' });
      expect(result.note).toContain('[SSN_REDACTED]');
      expect(result.note).not.toContain('123-45-6789');
    });
  });

  describe('redactPiiFromString', () => {
    it('redacts email addresses', () => {
      expect(redactPiiFromString('user@test.com')).toBe('[EMAIL_REDACTED]');
    });

    it('redacts SSNs', () => {
      expect(redactPiiFromString('SSN: 123-45-6789')).toBe('SSN: [SSN_REDACTED]');
    });

    it('preserves non-PII text', () => {
      expect(redactPiiFromString('Hello world')).toBe('Hello world');
    });
  });

  describe('redactHeaders', () => {
    it('redacts authorization header', () => {
      const result = redactHeaders({ authorization: 'Bearer xyz', 'content-type': 'application/json' });
      expect(result.authorization).toBe('[REDACTED]');
      expect(result['content-type']).toBe('application/json');
    });

    it('redacts cookie header', () => {
      const result = redactHeaders({ cookie: 'session=abc123' });
      expect(result.cookie).toBe('[REDACTED]');
    });

    it('redacts x-api-key header', () => {
      const result = redactHeaders({ 'x-api-key': 'key-123' });
      expect(result['x-api-key']).toBe('[REDACTED]');
    });
  });
});
