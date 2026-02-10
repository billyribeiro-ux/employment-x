import { describe, it, expect, beforeEach } from 'vitest';

import { AppError } from '../../src/lib/server/errors';

// We test the rate limit logic directly since checkRateLimit needs NextRequest
// which is hard to mock. Instead we test checkUserRateLimit which takes a userId string.
import { checkUserRateLimit } from '../../src/lib/server/rate-limit';

describe('[F-032] Rate Limiting + Abuse Controls', () => {
  const namespace = `test-${Date.now()}`;

  beforeEach(() => {
    // Use unique namespace per test to avoid cross-test pollution
  });

  it('allows requests within limit', () => {
    const ns = `${namespace}-allow-${Math.random()}`;
    const config = { windowMs: 60000, maxRequests: 5 };

    const result = checkUserRateLimit('user-1', ns, config);
    expect(result.remaining).toBe(4);
  });

  it('decrements remaining count', () => {
    const ns = `${namespace}-decrement-${Math.random()}`;
    const config = { windowMs: 60000, maxRequests: 5 };

    checkUserRateLimit('user-1', ns, config);
    checkUserRateLimit('user-1', ns, config);
    const result = checkUserRateLimit('user-1', ns, config);
    expect(result.remaining).toBe(2);
  });

  it('throws RATE_LIMITED when limit exceeded', () => {
    const ns = `${namespace}-exceed-${Math.random()}`;
    const config = { windowMs: 60000, maxRequests: 2 };

    checkUserRateLimit('user-1', ns, config);
    checkUserRateLimit('user-1', ns, config);

    expect(() => checkUserRateLimit('user-1', ns, config)).toThrow(AppError);
    try {
      checkUserRateLimit('user-1', ns, config);
    } catch (e) {
      expect((e as AppError).code).toBe('RATE_LIMITED');
      expect((e as AppError).status).toBe(429);
      expect((e as AppError).details).toHaveProperty('retry_after_ms');
    }
  });

  it('isolates rate limits per user', () => {
    const ns = `${namespace}-isolate-${Math.random()}`;
    const config = { windowMs: 60000, maxRequests: 2 };

    checkUserRateLimit('user-a', ns, config);
    checkUserRateLimit('user-a', ns, config);

    // user-a is now at limit, but user-b should still be fine
    const result = checkUserRateLimit('user-b', ns, config);
    expect(result.remaining).toBe(1);
  });

  it('isolates rate limits per namespace', () => {
    const ns1 = `${namespace}-ns1-${Math.random()}`;
    const ns2 = `${namespace}-ns2-${Math.random()}`;
    const config = { windowMs: 60000, maxRequests: 1 };

    checkUserRateLimit('user-1', ns1, config);

    // Same user, different namespace should still be allowed
    const result = checkUserRateLimit('user-1', ns2, config);
    expect(result.remaining).toBe(0);
  });
});
