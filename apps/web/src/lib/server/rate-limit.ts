import { type NextRequest } from 'next/server';

import { AppError } from './errors';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(namespace: string): Map<string, RateLimitEntry> {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map();
    stores.set(namespace, store);
  }
  return store;
}

function getClientKey(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function checkRateLimit(
  req: NextRequest,
  namespace: string,
  config: RateLimitConfig,
): { remaining: number; resetAt: number } {
  const store = getStore(namespace);
  const key = getClientKey(req);
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    throw new AppError('RATE_LIMITED', 'Too many requests', {
      retry_after_ms: entry.resetAt - now,
    });
  }

  return {
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function checkUserRateLimit(
  userId: string,
  namespace: string,
  config: RateLimitConfig,
): { remaining: number; resetAt: number } {
  const store = getStore(`user:${namespace}`);
  const now = Date.now();

  let entry = store.get(userId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(userId, entry);
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    throw new AppError('RATE_LIMITED', 'Too many requests', {
      retry_after_ms: entry.resetAt - now,
    });
  }

  return {
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  chat: { windowMs: 60 * 1000, maxRequests: 60 },
  scheduling: { windowMs: 60 * 1000, maxRequests: 30 },
  billing: { windowMs: 60 * 1000, maxRequests: 20 },
  webhook: { windowMs: 60 * 1000, maxRequests: 200 },
} as const;
