// GET /api/health — Health check with DB & Redis status (OPS-HEALTH-01)
import { NextResponse } from 'next/server';
import { checkDb } from '@/lib/db';
import { checkRedis } from '@/lib/redis';

export async function GET() {
  const db = await checkDb().catch(() => ({ up: false, error: 'DB check failed' }));
  const redis = await checkRedis().catch(() => ({ up: false, mode: 'down' as const, error: 'Redis check failed' }));

  const status = db.up && redis.up ? 'ok' : 'down';
  const statusCode = status === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status,
      db: db.up ? 'up' : 'down',
      redis: redis.up ? (redis.mode === 'redis' ? 'up' : 'fallback') : 'down',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dbLatencyMs: (db as any).latencyMs,
    },
    { status: statusCode }
  );
}
