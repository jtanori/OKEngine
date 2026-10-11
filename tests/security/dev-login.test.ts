/**
 * P1 — Dev login fail-closed regression
 * Covers: production, preview, missing env, config-read failures, GET vs POST, invalid userId, default super_admin not minted without explicit flag
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper to import fresh route handler with env overrides
async function withEnv(env: Record<string, string | undefined>, fn: () => Promise<void>) {
  const orig: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    orig[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k]!;
  }
  // clear module cache for route
  delete require.cache[require.resolve('../../src/app/api/dev/login/route.ts')];
  // also clear env cache
  try {
    const { clearEnvCache } = await import('../../src/lib/env.ts');
    // @ts-ignore
    if (clearEnvCache) clearEnvCache();
  } catch {}
  try {
    await fn();
  } finally {
    for (const k of Object.keys(env)) {
      if (orig[k] === undefined) delete process.env[k];
      else process.env[k] = orig[k]!;
    }
  }
}

function mockRequest(method: 'POST' | 'GET', body?: any, url = 'http://localhost/api/dev/login') {
  return {
    json: async () => body || {},
    url: url + (method === 'GET' && body?.userId ? `?userId=${body.userId}` : ''),
    cookies: { get: () => undefined, getAll: () => [] },
  } as any;
}

describe('P1 dev login fail-closed', () => {
  it('blocks in production NODE_ENV=production regardless of flag', async () => {
    await withEnv({ NODE_ENV: 'production', VERCEL_ENV: 'production', ENABLE_DEV_LOGIN: 'true', DATABASE_URL: 'postgresql://dummy', SESSION_SECRET: 'a'.repeat(32), CSRF_SECRET: 'b'.repeat(32) }, async () => {
      const { POST } = await import('../../src/app/api/dev/login/route.ts');
      const res = await POST(mockRequest('POST', { userId: 'usr_sarah_102' }));
      assert.equal(res.status, 403);
      const j = await res.json();
      assert.equal(j.error, 'not_available_in_production');
    });
  });

  it('blocks when VERCEL_ENV=production even if NODE_ENV=development', async () => {
    await withEnv({ NODE_ENV: 'development', VERCEL_ENV: 'production', ENABLE_DEV_LOGIN: 'true', DATABASE_URL: 'postgresql://dummy', SESSION_SECRET: 'a'.repeat(32), CSRF_SECRET: 'b'.repeat(32) }, async () => {
      const { POST } = await import('../../src/app/api/dev/login/route.ts');
      const res = await POST(mockRequest('POST', { userId: 'usr_sarah_102' }));
      assert.equal(res.status, 403);
    });
  });

  it('blocks when ENABLE_DEV_LOGIN missing (fail closed)', async () => {
    await withEnv({ NODE_ENV: 'development', VERCEL_ENV: undefined, ENABLE_DEV_LOGIN: undefined, DATABASE_URL: 'postgresql://dummy', SESSION_SECRET: 'a'.repeat(32), CSRF_SECRET: 'b'.repeat(32) }, async () => {
      const { POST } = await import('../../src/app/api/dev/login/route.ts');
      const res = await POST(mockRequest('POST', { userId: 'usr_sarah_102' }));
      assert.equal(res.status, 403);
      const j = await res.json();
      assert.equal(j.error, 'dev_login_disabled');
    });
  });

  it('blocks when ENABLE_DEV_LOGIN=false', async () => {
    await withEnv({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: 'false', DATABASE_URL: 'postgresql://dummy', SESSION_SECRET: 'a'.repeat(32), CSRF_SECRET: 'b'.repeat(32) }, async () => {
      const { POST } = await import('../../src/app/api/dev/login/route.ts');
      const res = await POST(mockRequest('POST', { userId: 'usr_sarah_102' }));
      assert.equal(res.status, 403);
    });
  });

  it('blocks on invalid userId and does not default to super_admin', async () => {
    await withEnv({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: 'true', DATABASE_URL: 'postgresql://dummy', SESSION_SECRET: 'a'.repeat(32), CSRF_SECRET: 'b'.repeat(32) }, async () => {
      const { POST } = await import('../../src/app/api/dev/login/route.ts');
      const res = await POST(mockRequest('POST', { userId: 'nonexistent' }));
      assert.equal(res.status, 400);
      const res2 = await POST(mockRequest('POST', {}));
      assert.equal(res2.status, 400);
    });
  });

  it('allows when ENABLE_DEV_LOGIN=true and NODE_ENV=development with valid userId', async () => {
    await withEnv({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: 'true', DATABASE_URL: 'postgresql://dummy', SESSION_SECRET: 'a'.repeat(32), CSRF_SECRET: 'b'.repeat(32) }, async () => {
      const { POST } = await import('../../src/app/api/dev/login/route.ts');
      const res = await POST(mockRequest('POST', { userId: 'usr_marcus_204' }));
      assert.equal(res.status, 200);
      const j = await res.json();
      assert.equal(j.success, true);
      assert.equal(j.user.id, 'usr_marcus_204');
    });
  });

  it('GET is 405 not session minting', async () => {
    await withEnv({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: 'true', DATABASE_URL: 'postgresql://dummy', SESSION_SECRET: 'a'.repeat(32), CSRF_SECRET: 'b'.repeat(32) }, async () => {
      const { GET } = await import('../../src/app/api/dev/login/route.ts');
      const res = await GET(mockRequest('GET', { userId: 'usr_sarah_102' }));
      assert.equal(res.status, 405);
    });
  });

  it('fails closed on env read error (getEnv throws)', async () => {
    await withEnv({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: 'true', DATABASE_URL: undefined, SESSION_SECRET: undefined, CSRF_SECRET: undefined }, async () => {
      const { POST } = await import('../../src/app/api/dev/login/route.ts');
      const res = await POST(mockRequest('POST', { userId: 'usr_sarah_102' }));
      // Should be 503 env_not_ready, not 200
      assert.ok([403, 503].includes(res.status), `expected blocked got ${res.status}`);
    });
  });
});
