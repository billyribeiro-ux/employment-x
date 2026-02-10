import pino from 'pino';

const level = process.env['LOG_LEVEL'] ?? (process.env['NODE_ENV'] === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  ...(process.env['NODE_ENV'] !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
  base: {
    service: process.env['OTEL_SERVICE_NAME'] ?? 'employmentx-web',
    version: process.env['APP_VERSION'] ?? '0.0.0',
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      correlationId: req.headers?.['x-correlation-id'],
    }),
  },
});

export function createRequestLogger(correlationId: string, tenantId?: string) {
  return logger.child({
    correlationId,
    ...(tenantId ? { tenantId } : {}),
  });
}

export type Logger = pino.Logger;
