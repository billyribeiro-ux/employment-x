import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Auth.js
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET must be at least 16 characters'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // OpenTelemetry
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default('employmentx-web'),

  // Sentry
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Feature Flags
  FEATURE_FLAG_PROVIDER: z.enum(['in-memory', 'flagd']).default('in-memory'),

  // Demo
  DEMO_MODE_ENABLED: z.string().transform((v) => v === 'true').default('true'),
  DEMO_SESSION_TTL_MINUTES: z.string().transform(Number).default('60'),
  DEMO_MAX_SESSIONS: z.string().transform(Number).default('100'),

  // App
  APP_VERSION: z.string().default('0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const msg = Object.entries(formatted)
      .map(([k, v]) => `  ${k}: ${(v as string[]).join(', ')}`)
      .join('\n');
    console.error(`\n❌ Invalid environment variables:\n${msg}\n`);
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('Fatal: invalid environment configuration');
    }
    // In dev/test, return defaults with DATABASE_URL and NEXTAUTH_SECRET stubbed
    _env = envSchema.parse({
      ...process.env,
      DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgresql://localhost:5432/employmentx',
      NEXTAUTH_SECRET: process.env['NEXTAUTH_SECRET'] ?? 'dev-secret-minimum-16-chars',
    });
    return _env;
  }
  _env = result.data;
  return _env;
}

export function resetEnvCache(): void {
  _env = null;
}
