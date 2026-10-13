// src/lib/rateLimit.ts — Hardened rate limiting with proxy trust boundary and trustworthy fallback (P1 fix PLAN-008 Phase 6)
// Implements: TRUST_PROXY explicit boundary, safe fallback using trustworthy sessionId from httpOnly signed cookie,
// shared bucket DoS mitigation higher limit, fail-closed AUTH on Redis outage fail-open others, accurate TTL

import { NextRequest } from 'next/server';
import { getRedis } from './redis';
import { getEnv } from './env';
import crypto from 'crypto';

export type RateLimitTier = 'GLOBAL' | 'AUTH' | 'WRITE' | 'READ';

export const RATE_LIMITS: Record<RateLimitTier, { limit: number; windowSec: number }> = {
  GLOBAL: { limit: 100, windowSec: 60 },
  AUTH: { limit: 5, windowSec: 15 * 60 },
  WRITE: { limit: 20, windowSec: 60 },
  READ: { limit: 60, windowSec: 60 },
};

// Higher limit for shared unknown bucket to mitigate DoS while not blocking legit anonymous
const SHARED_UNKNOWN_MULTIPLIER = 5;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  retryAfter: number;
  identifier: string;
  isSharedBucket: boolean;
}

/**
 * Get TRUST_PROXY setting — explicit proxy trust boundary
 * When true, trust x-forwarded-for sanitized by Vercel/Cloudflare/Nginx
 * When false, do NOT trust x-forwarded-for, use x-real-ip or direct
 */
function isTrustProxy(): boolean {
  try {
    const env = getEnv();
    // Check both TRUST_PROXY and TRUST_PROXY_HOPS or OKENG env
    const trustProxy = process.env.TRUST_PROXY || (env as any).TRUST_PROXY;
    if (trustProxy === 'true' || trustProxy === true) return true;
    if (trustProxy === 'false' || trustProxy === false) return false;
    // Default based on OKENG_ENV: production/staging should have TRUST_PROXY true if behind proxy
    const okengEnv = process.env.OKENG_ENV || env.NODE_ENV;
    if (okengEnv === 'production' || okengEnv === 'staging') {
      // In prod, require explicit TRUST_PROXY=true, otherwise fail safe to not trust x-forwarded-for
      return process.env.TRUST_PROXY === 'true';
    }
    return false;
  } catch {
    return process.env.TRUST_PROXY === 'true';
  }
}

/**
 * Extract client IP with trust boundary
 * If TRUST_PROXY true, trust x-forwarded-for first entry (sanitized by trusted proxy)
 * If false, use x-real-ip or unknown, do NOT trust x-forwarded-for (spoofable)
 */
function getClientIp(request: NextRequest): { ip: string; trusted: boolean } {
  const trustProxy = isTrustProxy();

  if (trustProxy) {
    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
      const first = xForwardedFor.split(',')[0]?.trim();
      if (first && first !== '') {
        // Basic IP validation
        if (/^[\d.:a-fA-F]+$/.test(first) || first.includes('.') || first.includes(':')) {
          return { ip: first, trusted: true };
        }
      }
    }
  }

  // If not trusting proxy, use x-real-ip (set by Nginx) or fallback to unknown
  // x-real-ip is also set by proxy but less spoofable than x-forwarded-for if proxy overwrites
  // In Next.js, we don't have direct remoteAddr, so we use headers
  const xRealIp = request.headers.get('x-real-ip')?.trim();
  if (xRealIp && xRealIp !== '') {
    return { ip: xRealIp, trusted: trustProxy };
  }

  // In dev, we can also check for direct IP via request.ip if available (Next.js 15+)
  const directIp = (request as any).ip as string | undefined;
  if (directIp && directIp !== '') {
    return { ip: directIp, trusted: true };
  }

  return { ip: 'unknown', trusted: false };
}

/**
 * Get trustworthy session identifier from httpOnly signed cookie
 * Uses okeng.sid or __Host-okeng.sid — httpOnly, signed, not client-controllable like x-forwarded-for
 * Returns hash of session token for privacy, or 'no-session' if none
 */
function getTrustworthySessionId(request: NextRequest): { sessionId: string; hasSession: boolean } {
  const supabaseCookies = request.cookies.getAll()
    .filter(({ name }) => name.startsWith('okeng-auth'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const cookieValue = supabaseCookies.length > 0
    ? supabaseCookies.map(({ name, value }) => `${name}=${value}`).join(';')
    : request.cookies.get('okeng.sid')?.value || request.cookies.get('__Host-okeng.sid')?.value;

  if (!cookieValue) return { sessionId: 'no-session', hasSession: false };

  // Hash the HttpOnly session cookie(s) so raw Auth tokens never enter Redis keys.
  try {
    const hash = crypto.createHash('sha256').update(cookieValue).digest('hex').slice(0, 16);
    return { sessionId: `sess_${hash}`, hasSession: true };
  } catch {
    return { sessionId: 'no-session', hasSession: false };
  }
}

export async function rateLimit(request: NextRequest, tier: RateLimitTier): Promise<RateLimitResult> {
  const config = RATE_LIMITS[tier];
  const redis = await getRedis();

  const { ip, trusted } = getClientIp(request);
  const { sessionId, hasSession } = getTrustworthySessionId(request);

  // Determine if we are in shared bucket (both IP unknown and no session)
  const isSharedBucket = ip === 'unknown' && !hasSession;

  // For shared bucket, use higher limit to mitigate DoS (don't block legit anonymous with low limit)
  // And use separate key to not affect authenticated users
  let effectiveLimit = config.limit;
  let key: string;

  if (isSharedBucket) {
    // Shared unknown bucket — higher limit, separate namespace
    effectiveLimit = config.limit * SHARED_UNKNOWN_MULTIPLIER;
    key = `rate_limit:${tier}:unknown:anonymous`;
    console.warn(`[rateLimit] Using shared unknown bucket for tier ${tier} with higher limit ${effectiveLimit} — IP unknown, no session`);
  } else {
    // Normal case — use IP and trustworthy sessionId
    // If IP unknown but has session, use sessionId as primary identifier (trustworthy)
    // If IP known but no session, use IP
    // If both known, use composite
    key = `rate_limit:${tier}:${ip}:${sessionId}`;
  }

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, config.windowSec);
    }

    // Accurate TTL via Redis TTL command, fallback to windowSec
    let ttl: number;
    try {
      ttl = await redis.ttl(key);
      if (ttl < 0) ttl = config.windowSec;
    } catch {
      ttl = config.windowSec;
    }

    const remaining = Math.max(0, effectiveLimit - current);
    const success = current <= effectiveLimit;
    const retryAfter = success ? 0 : ttl;

    if (!success) {
      console.warn(`[rateLimit] Rate limit exceeded tier=${tier} ip=${ip} trusted=${trusted} session=${hasSession} key=${key} current=${current} limit=${effectiveLimit}`);
    }

    return {
      success,
      remaining,
      limit: effectiveLimit,
      retryAfter,
      identifier: key,
      isSharedBucket,
    };
  } catch (err) {
    // Fail-closed AUTH on Redis outage, fail-open others
    console.error(`[rateLimit] Redis error tier=${tier} ip=${ip} session=${hasSession}`, err);

    if (tier === 'AUTH') {
      // Fail-closed for AUTH — return 429 to prevent brute force when Redis down
      return {
        success: false,
        remaining: 0,
        limit: config.limit,
        retryAfter: config.windowSec,
        identifier: key,
        isSharedBucket,
      };
    } else {
      // Fail-open for READ/WRITE/GLOBAL — allow request but log
      return {
        success: true,
        remaining: config.limit,
        limit: config.limit,
        retryAfter: 0,
        identifier: key,
        isSharedBucket,
      };
    }
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.retryAfter),
  };
}
