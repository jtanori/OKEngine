// src/lib/rateLimit.ts — Rate limiting for Next.js (SEC-RATE-LIMIT-01)
// Adapted from src/services/rateLimiter.ts

import { NextRequest } from 'next/server';
import { getRedis } from './redis';

export type RateLimitTier = 'GLOBAL' | 'AUTH' | 'WRITE' | 'READ';

export const RATE_LIMITS: Record<RateLimitTier, { limit: number; windowSec: number }> = {
  GLOBAL: { limit: 100, windowSec: 60 },
  AUTH: { limit: 5, windowSec: 15 * 60 },
  WRITE: { limit: 20, windowSec: 60 },
  READ: { limit: 60, windowSec: 60 },
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  retryAfter: number;
}

export async function rateLimit(request: NextRequest, tier: RateLimitTier): Promise<RateLimitResult> {
  const config = RATE_LIMITS[tier];
  const redis = await getRedis();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const sessionId = request.cookies.get('okeng.sid')?.value?.slice(0, 8) || request.cookies.get('__Host-okeng.sid')?.value?.slice(0, 8) || 'no-session';
  const key = `rate_limit:${tier}:${ip}:${sessionId}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, config.windowSec);
    }

    const ttl = config.windowSec; // Simplified — in real Redis we would get TTL, but for fallback we use window
    // Try to get actual TTL if Redis client supports, else use window
    const remaining = Math.max(0, config.limit - current);
    const success = current <= config.limit;
    const retryAfter = success ? 0 : ttl;

    return {
      success,
      remaining,
      limit: config.limit,
      retryAfter,
    };
  } catch (err) {
    // Fail open? Actually fail closed for security? For rate limiting, fail open is safer to not block legit users if Redis down
    console.warn('[rateLimit] Redis error, failing open', err);
    return {
      success: true,
      remaining: config.limit,
      limit: config.limit,
      retryAfter: 0,
    };
  }
}
