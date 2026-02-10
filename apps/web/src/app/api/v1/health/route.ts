import { NextResponse } from 'next/server';

import { prisma } from '@/lib/server/db';

export async function GET() {
  const start = Date.now();
  let dbHealthy = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  const latencyMs = Date.now() - start;
  const status = dbHealthy ? 'healthy' : 'degraded';
  const httpStatus = dbHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env['APP_VERSION'] ?? '0.5.0-m5',
      uptime_seconds: Math.floor(process.uptime()),
      checks: {
        database: { status: dbHealthy ? 'up' : 'down', latency_ms: latencyMs },
        memory: {
          rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
    },
    { status: httpStatus },
  );
}
