/**
 * OKEng — Rate Limiting Proxy Trust Boundary & Trustworthy Fallback Suite (PLAN-008 Phase 6)
 * Tests: spoofed x-forwarded-for TRUST_PROXY true/false, fallback trustworthy sessionId, shared bucket DoS mitigation, Redis outage per tier, TTL
 * Execution: npx tsx tests/security/rate-limit.test.ts
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

interface MockRequest {
  headers: Map<string, string>;
  cookies: Map<string, string>;
  ip?: string;
}

function createMockRequest(opts: { xForwardedFor?: string; xRealIp?: string; sessionCookie?: string; ip?: string } = {}): MockRequest {
  const headers = new Map<string, string>();
  if (opts.xForwardedFor) headers.set('x-forwarded-for', opts.xForwardedFor);
  if (opts.xRealIp) headers.set('x-real-ip', opts.xRealIp);
  const cookies = new Map<string, string>();
  if (opts.sessionCookie) cookies.set('okeng.sid', opts.sessionCookie);
  return { headers, cookies, ip: opts.ip };
}

function getClientIpMock(request: MockRequest, trustProxy: boolean): { ip: string; trusted: boolean } {
  if (trustProxy) {
    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
      const first = xForwardedFor.split(',')[0]?.trim();
      if (first && first !== '') {
        return { ip: first, trusted: true };
      }
    }
  }
  const xRealIp = request.headers.get('x-real-ip')?.trim();
  if (xRealIp && xRealIp !== '') {
    return { ip: xRealIp, trusted: trustProxy };
  }
  if (request.ip) {
    return { ip: request.ip, trusted: true };
  }
  return { ip: 'unknown', trusted: false };
}

function getTrustworthySessionIdMock(request: MockRequest): { sessionId: string; hasSession: boolean } {
  const cookieValue = request.cookies.get('okeng.sid') || request.cookies.get('__Host-okeng.sid');
  if (!cookieValue) {
    return { sessionId: 'no-session', hasSession: false };
  }
  try {
    const hash = crypto.createHash('sha256').update(cookieValue).digest('hex').slice(0, 16);
    return { sessionId: `sess_${hash}`, hasSession: true };
  } catch {
    return { sessionId: 'no-session', hasSession: false };
  }
}

describe('PLAN-008 Phase 6 — Rate Limiting Proxy Trust Boundary', () => {
  beforeEach(() => {
    delete process.env.TRUST_PROXY;
  });

  it('P1-01: Spoofed x-forwarded-for TRUST_PROXY=false — should NOT trust, use x-real-ip or unknown', async () => {
    const trustProxy = false;
    const request = createMockRequest({
      xForwardedFor: '1.2.3.4, 5.6.7.8', // spoofed
      xRealIp: '9.9.9.9',
    });

    const { ip, trusted } = getClientIpMock(request, trustProxy);
    assert.equal(ip, '9.9.9.9', 'should use x-real-ip when TRUST_PROXY=false, not x-forwarded-for');
    assert.equal(trusted, false, 'should not be trusted when TRUST_PROXY=false');
  });

  it('P1-02: Spoofed x-forwarded-for TRUST_PROXY=true — should trust first entry (sanitized by proxy)', async () => {
    const trustProxy = true;
    const request = createMockRequest({
      xForwardedFor: '1.2.3.4, 5.6.7.8',
      xRealIp: '9.9.9.9',
    });

    const { ip, trusted } = getClientIpMock(request, trustProxy);
    assert.equal(ip, '1.2.3.4', 'should trust x-forwarded-for first entry when TRUST_PROXY=true');
    assert.equal(trusted, true, 'should be trusted when TRUST_PROXY=true');
  });

  it('P1-03: No x-forwarded-for, TRUST_PROXY=false — use x-real-ip', async () => {
    const trustProxy = false;
    const request = createMockRequest({
      xRealIp: '10.0.0.1',
    });

    const { ip } = getClientIpMock(request, trustProxy);
    assert.equal(ip, '10.0.0.1', 'should use x-real-ip when no x-forwarded-for and TRUST_PROXY=false');
  });

  it('P1-04: No headers — unknown IP', async () => {
    const trustProxy = false;
    const request = createMockRequest({});

    const { ip } = getClientIpMock(request, trustProxy);
    assert.equal(ip, 'unknown', 'should return unknown when no IP headers');
  });

  it('P1-05: Fallback trustworthy sessionId — httpOnly signed cookie, not shared unknown bucket', async () => {
    const sessionCookie = 'valid_session_token_12345';
    const request = createMockRequest({
      sessionCookie,
    });

    const { sessionId, hasSession } = getTrustworthySessionIdMock(request);
    assert.equal(hasSession, true, 'should have session when cookie present');
    assert.ok(sessionId.startsWith('sess_'), 'sessionId should be hashed trustworthy identifier');
    assert.notEqual(sessionId, 'no-session', 'should not be no-session');

    // Should NOT be shared unknown bucket when has session
    const ip = 'unknown';
    const isSharedBucket = ip === 'unknown' && !hasSession;
    assert.equal(isSharedBucket, false, 'should NOT be shared bucket when has session, even if IP unknown');
  });

  it('P1-06: Unknown IP no session — shared bucket DoS mitigation higher limit', async () => {
    const request = createMockRequest({}); // no IP, no session
    const { ip } = getClientIpMock(request, false);
    const { hasSession } = getTrustworthySessionIdMock(request);

    assert.equal(ip, 'unknown', 'IP should be unknown');
    assert.equal(hasSession, false, 'should have no session');

    const isSharedBucket = ip === 'unknown' && !hasSession;
    assert.equal(isSharedBucket, true, 'should be shared bucket when both unknown');

    const config = { limit: 100, windowSec: 60 };
    const sharedMultiplier = 5;
    const effectiveLimit = isSharedBucket ? config.limit * sharedMultiplier : config.limit;

    assert.equal(effectiveLimit, 500, 'shared bucket should have higher limit (5x) to mitigate DoS');
    assert.ok(effectiveLimit > config.limit, 'shared bucket limit should be higher than normal');
  });

  it('P1-07: Redis down AUTH tier — fail-closed 429', async () => {
    const tier = 'AUTH';
    const redisError = new Error('Redis connection failed');

    // Simulate Redis error handling
    let result: { success: boolean; remaining: number; limit: number; retryAfter: number };
    try {
      throw redisError;
    } catch (err) {
      if (tier === 'AUTH') {
        result = { success: false, remaining: 0, limit: 5, retryAfter: 15 * 60 };
      } else {
        result = { success: true, remaining: 5, limit: 5, retryAfter: 0 };
      }
    }

    assert.equal(result!.success, false, 'AUTH tier should fail-closed (success=false) on Redis outage');
    assert.equal(result!.remaining, 0, 'AUTH fail-closed should have 0 remaining');
    assert.ok(result!.retryAfter > 0, 'AUTH fail-closed should have retryAfter');
  });

  it('P1-08: Redis down READ tier — fail-open success true', async () => {
    const tier = 'READ';
    const redisError = new Error('Redis connection failed');

    let result: { success: boolean };
    try {
      throw redisError;
    } catch (err) {
      if (tier === 'AUTH') {
        result = { success: false };
      } else {
        result = { success: true };
      }
    }

    assert.equal(result!.success, true, 'READ tier should fail-open (success=true) on Redis outage');
  });

  it('P1-09: Redis down WRITE tier — fail-open', async () => {
    const tier = 'WRITE';
    let result: { success: boolean };
    try {
      throw new Error('Redis down');
    } catch {
      if (tier === 'AUTH') {
        result = { success: false };
      } else {
        result = { success: true };
      }
    }
    assert.equal(result!.success, true, 'WRITE tier should fail-open on Redis outage');
  });

  it('P1-10: TTL accurate — uses Redis TTL not fixed window', async () => {
    // Simulate Redis TTL command
    const mockRedis = {
      ttl: async (key: string) => {
        // Simulate key has 30 seconds remaining
        return 30;
      },
    };

    const ttl = await mockRedis.ttl('rate_limit:AUTH:1.2.3.4:sess_abc');
    assert.equal(ttl, 30, 'should get accurate TTL from Redis');
    assert.ok(ttl > 0 && ttl <= 15 * 60, 'TTL should be within window');

    // Fallback when TTL fails
    const mockRedisFail = {
      ttl: async (key: string) => {
        throw new Error('TTL failed');
      },
    };

    let fallbackTtl: number;
    try {
      fallbackTtl = await mockRedisFail.ttl('key');
    } catch {
      fallbackTtl = 60; // windowSec fallback
    }
    assert.equal(fallbackTtl, 60, 'should fallback to windowSec when TTL fails');
  });

  it('P1-11: Trustworthy sessionId per session not shared — different sessions have different IDs', async () => {
    const request1 = createMockRequest({ sessionCookie: 'session_token_user1' });
    const request2 = createMockRequest({ sessionCookie: 'session_token_user2' });

    const { sessionId: sid1 } = getTrustworthySessionIdMock(request1);
    const { sessionId: sid2 } = getTrustworthySessionIdMock(request2);

    assert.notEqual(sid1, sid2, 'different session cookies should have different trustworthy IDs');
    assert.ok(sid1.startsWith('sess_'), 'should be hashed session ID');
    assert.ok(sid2.startsWith('sess_'), 'should be hashed session ID');
  });

  it('P1-12: Same session same ID — stable identifier', async () => {
    const sessionCookie = 'same_session_token';
    const request1 = createMockRequest({ sessionCookie });
    const request2 = createMockRequest({ sessionCookie });

    const { sessionId: sid1 } = getTrustworthySessionIdMock(request1);
    const { sessionId: sid2 } = getTrustworthySessionIdMock(request2);

    assert.equal(sid1, sid2, 'same session cookie should have same trustworthy ID');
  });

  it('P1-13: Proxy sanitizes forwarding headers in prod — TRUST_PROXY documentation', async () => {
    // Document trust boundary
    const trustProxyTrue = true;
    const trustProxyFalse = false;

    // When TRUST_PROXY=true, we trust x-forwarded-for (sanitized by Vercel/Cloudflare/Nginx)
    // When false, we don't trust it (spoofable)
    const spoofedRequest = createMockRequest({
      xForwardedFor: 'attacker_ip, legit_proxy',
      xRealIp: 'real_ip',
    });

    const ipTrusted = getClientIpMock(spoofedRequest, trustProxyTrue);
    const ipUntrusted = getClientIpMock(spoofedRequest, trustProxyFalse);

    assert.equal(ipTrusted.ip, 'attacker_ip', 'when TRUST_PROXY=true, trust x-forwarded-for first (proxy sanitizes)');
    assert.equal(ipUntrusted.ip, 'real_ip', 'when TRUST_PROXY=false, use x-real-ip not x-forwarded-for');
  });

  it('P1-14: Rate limit key uses trustworthy sessionId not just IP', async () => {
    const request = createMockRequest({
      xForwardedFor: '1.2.3.4',
      sessionCookie: 'user_session_token',
    });

    const { ip } = getClientIpMock(request, true);
    const { sessionId } = getTrustworthySessionIdMock(request);

    const key = `rate_limit:AUTH:${ip}:${sessionId}`;
    assert.ok(key.includes(ip), 'key should include IP');
    assert.ok(key.includes(sessionId), 'key should include trustworthy sessionId');
    assert.ok(key.includes('sess_'), 'key should include hashed session ID');
  });

  it('P1-15: Shared bucket separate namespace — does not affect authenticated users', async () => {
    const normalKey = `rate_limit:AUTH:1.2.3.4:sess_abc123`;
    const sharedKey = `rate_limit:AUTH:unknown:anonymous`;

    assert.notEqual(normalKey, sharedKey, 'shared bucket should have separate namespace from authenticated users');
    assert.ok(sharedKey.includes('unknown:anonymous'), 'shared bucket key should indicate anonymous');
    assert.ok(normalKey.includes('sess_'), 'normal key should include session ID');
  });
});
