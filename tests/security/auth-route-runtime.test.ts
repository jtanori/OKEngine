import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest, NextResponse } from 'next/server';
import { createOAuthStartHandler } from '../../src/app/api/auth/oauth/start/route';
import { createAuthCallbackHandler } from '../../src/app/auth/callback/route';
import { createSignupHandler } from '../../src/app/api/auth/signup/route';

const ENV_KEYS = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET',
  'SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID',
  'SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET',
];
const originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
const passRateLimit = async () => ({
  success: true,
  remaining: 4,
  limit: 5,
  retryAfter: 0,
  identifier: 'unit-test',
  isSharedBucket: false,
});

function makeRequest(path: string, options: { method?: string; body?: unknown; csrf?: boolean } = {}) {
  const method = options.method || 'POST';
  const headers = new Headers({ 'content-type': 'application/json' });
  const request = new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (options.csrf !== false) {
    request.cookies.set('okeng.csrf', 'unit-test-csrf');
    request.headers.set('x-csrf-token', 'unit-test-csrf');
  }
  return request;
}

function mockRouteClient(auth: Record<string, (...args: any[]) => Promise<any>>, rpc?: (...args: any[]) => Promise<any>) {
  const applied: string[] = [];
  const client = {
    auth,
    rpc: rpc || (async () => ({ data: null, error: null })),
  };
  return {
    client,
    applied,
    routeClient: {
      client,
      applyToResponse(response: NextResponse) {
        applied.push(response.status.toString());
        response.cookies.set('mock-auth-response-applied', '1');
        return response;
      },
    },
  };
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('OAuth server route runtime behavior', () => {
  it('fails closed for rate limits, CSRF, missing consent, and unconfigured providers before calling Supabase', async () => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    delete process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
    delete process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET;

    let clientFactoryCalls = 0;
    const handler = createOAuthStartHandler({
      rateLimit: async () => ({ ...await passRateLimit(), success: false, retryAfter: 19 }),
      createRouteSupabaseClient: (() => {
        clientFactoryCalls++;
        throw new Error('Supabase must not be constructed for a rate-limited request');
      }) as any,
    });
    const limited = await handler(makeRequest('/api/auth/oauth/start', { body: { provider: 'google', termsAccepted: true } }));
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '19');

    const allowed = createOAuthStartHandler({ rateLimit: passRateLimit });
    const csrf = await allowed(makeRequest('/api/auth/oauth/start', { body: { provider: 'google', termsAccepted: true }, csrf: false }));
    assert.equal(csrf.status, 403);

    const noConsent = await allowed(makeRequest('/api/auth/oauth/start', { body: { provider: 'google', termsAccepted: false } }));
    assert.equal(noConsent.status, 422);
    assert.equal((await noConsent.json()).error, 'terms_required');

    const unconfigured = await allowed(makeRequest('/api/auth/oauth/start', { body: { provider: 'google', termsAccepted: true } }));
    assert.equal(unconfigured.status, 404);
    assert.equal((await unconfigured.json()).error, 'provider_unavailable');
    assert.equal(clientFactoryCalls, 0);
  });

  it('rejects a missing or untrusted callback base URL without revealing provider credentials', async () => {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = 'local-client-id';
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET = 'local-client-secret';
    let authCalls = 0;
    const fake = mockRouteClient({
      async signInWithOAuth() {
        authCalls++;
        return { data: { url: 'http://127.0.0.1:54321/auth/v1/authorize?state=unit-state' }, error: null };
      },
    });
    const handler = createOAuthStartHandler({
      rateLimit: passRateLimit,
      createRouteSupabaseClient: (() => fake.routeClient) as any,
    });

    delete process.env.NEXT_PUBLIC_APP_URL;
    const missing = await handler(makeRequest('/api/auth/oauth/start', { body: { provider: 'google', termsAccepted: true } }));
    assert.equal(missing.status, 503);
    assert.equal((await missing.json()).error, 'auth_configuration_error');
    assert.equal(authCalls, 0);

    process.env.NEXT_PUBLIC_APP_URL = 'https://user:password@example.invalid';
    const untrusted = await handler(makeRequest('/api/auth/oauth/start', { body: { provider: 'google', termsAccepted: true } }));
    assert.equal(untrusted.status, 503);
    const untrustedBody = await untrusted.json();
    assert.equal(untrustedBody.error, 'auth_configuration_error');
    assert.equal(authCalls, 0);
    assert.doesNotMatch(JSON.stringify(untrustedBody), /local-client-id|local-client-secret|password/);
  });

  it('accepts only the configured Supabase authorization origin and exact authorize path', async () => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = 'local-client-id';
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET = 'local-client-secret';

    for (const url of [
      'https://attacker.invalid/auth/v1/authorize?state=unit-state',
      'http://127.0.0.1:54321/auth/v1/token?state=unit-state',
      'http://127.0.0.1:54322/auth/v1/authorize?state=unit-state',
      'javascript:alert(1)',
    ]) {
      const fake = mockRouteClient({
        async signInWithOAuth() {
          return { data: { url }, error: null };
        },
      });
      const handler = createOAuthStartHandler({
        rateLimit: passRateLimit,
        createRouteSupabaseClient: (() => fake.routeClient) as any,
      });
      const response = await handler(makeRequest('/api/auth/oauth/start', { body: { provider: 'google', termsAccepted: true } }));
      assert.equal(response.status, 503, `Untrusted authorization URL must be rejected: ${url}`);
      assert.equal((await response.json()).error, 'oauth_start_failed');
    }

    const validFake = mockRouteClient({
      async signInWithOAuth() {
        return { data: { url: 'http://127.0.0.1:54321/auth/v1/authorize?provider=google&state=unit-state' }, error: null };
      },
    });
    const success = await createOAuthStartHandler({
      rateLimit: passRateLimit,
      createRouteSupabaseClient: (() => validFake.routeClient) as any,
    })(makeRequest('/api/auth/oauth/start', { body: { provider: 'google', termsAccepted: true } }));
    assert.equal(success.status, 200);
    const successBody = await success.json();
    assert.deepEqual(successBody, { url: 'http://127.0.0.1:54321/auth/v1/authorize?provider=google&state=unit-state' });
    assert.ok(success.cookies.getAll().some(({ name }) => name === 'mock-auth-response-applied'));
    assert.doesNotMatch(JSON.stringify(successBody), /local-client-id|local-client-secret/);
  });
});

describe('Auth callback server route runtime behavior', () => {
  it('rejects missing, replayed, or invalid callback state and safely contains next redirects', async () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    const calls: string[] = [];
    const fake = mockRouteClient({
      async exchangeCodeForSession(code: string) {
        calls.push(`exchange:${code}`);
        return { data: { session: null }, error: new Error('invalid or replayed PKCE state') };
      },
      async verifyOtp() {
        calls.push('verify');
        return { data: { session: null }, error: new Error('invalid or replayed OTP state') };
      },
      async getUser() {
        calls.push('getUser');
        return { data: { user: null }, error: new Error('no user') };
      },
      async signOut() {
        calls.push('signOut');
        return { error: null };
      },
    });
    const handler = createAuthCallbackHandler({
      createRouteSupabaseClient: (() => fake.routeClient) as any,
    });

    const missing = await handler(new NextRequest('http://localhost:3000/auth/callback?next=%2F%2Fevil.invalid%2Fsteal'));
    assert.equal(missing.status, 307);
    assert.equal(new URL(missing.headers.get('location')!).pathname, '/login');
    assert.equal(calls.length, 0);

    const replayed = await handler(new NextRequest('http://localhost:3000/auth/callback?code=replayed-code&next=%2Fworkspaces%2Ftenant%2Fcollections'));
    assert.equal(replayed.status, 307);
    assert.equal(new URL(replayed.headers.get('location')!).searchParams.get('authError'), 'callback');
    assert.deepEqual(calls, ['exchange:replayed-code']);
    assert.doesNotMatch(replayed.headers.get('location') || '', /replayed-code|state|token/);
  });

  it('provisions only a verified email identity, signs out email-less users, and rejects provisioning failure', async () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    const baseAuth = {
      async verifyOtp() { return { data: { session: {} }, error: null }; },
      async getUser() { return { data: { user: { id: 'auth-uuid', email: 'test@example.com' } }, error: null }; },
      async signOut() { return { error: null }; },
    };
    const noEmailFake = mockRouteClient({
      ...baseAuth,
      async getUser() { return { data: { user: { id: 'phone-only-uuid', email: '   ' } }, error: null }; },
      async signOut() { return { error: null }; },
    });
    const noEmail = await createAuthCallbackHandler({
      createRouteSupabaseClient: (() => noEmailFake.routeClient) as any,
    })(new NextRequest('http://localhost:3000/auth/callback?token_hash=local-otp&type=signup'));
    assert.equal(noEmail.status, 307);
    assert.equal(new URL(noEmail.headers.get('location')!).searchParams.get('authError'), 'callback');

    const failedProvisionFake = mockRouteClient(baseAuth, async () => ({ data: null, error: new Error('database unavailable') }));
    const failedProvision = await createAuthCallbackHandler({
      createRouteSupabaseClient: (() => failedProvisionFake.routeClient) as any,
    })(new NextRequest('http://localhost:3000/auth/callback?token_hash=local-otp&type=signup'));
    assert.equal(failedProvision.status, 307);
    assert.equal(new URL(failedProvision.headers.get('location')!).searchParams.get('authError'), 'workspace');
    assert.ok(failedProvisionFake.applied.length > 0);
  });

  it('redirects a verified identity only to its own provisioned workspace', async () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    const fake = mockRouteClient({
      async verifyOtp() { return { data: { session: {} }, error: null }; },
      async getUser() { return { data: { user: { id: 'auth-uuid', email: 'test@example.com' } }, error: null }; },
      async signOut() { return { error: null }; },
    }, async () => ({
      data: [{ workspace_id: 'ws_own', workspace_slug: 'own-workspace' }],
      error: null,
    }));
    const response = await createAuthCallbackHandler({
      createRouteSupabaseClient: (() => fake.routeClient) as any,
    })(new NextRequest('http://localhost:3000/auth/callback?token_hash=local-otp&type=signup&next=%2F%2Fevil.invalid'));

    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location')!);
    assert.equal(location.pathname, '/workspaces/own-workspace/collections');
    assert.equal(location.origin, 'http://localhost:3000');
    assert.ok(fake.applied.length > 0);
  });
});

describe('Signup confirmation-pending runtime behavior', () => {
  it('does not provision a workspace or retain a session when Auth requires email confirmation', async () => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    let provisionCalls = 0;
    let signOutCalls = 0;
    const fake = mockRouteClient({
      async signUp() {
        return {
          data: { user: { id: 'pending-auth-uuid', email: 'pending@example.test' }, session: null },
          error: null,
        };
      },
      async signOut() { signOutCalls++; return { error: null }; },
      async getUser() { throw new Error('pending signup must not verify or create an app session'); },
    }, async () => {
      provisionCalls++;
      throw new Error('pending signup must not provision a workspace');
    });
    const response = await createSignupHandler({
      rateLimit: passRateLimit,
      createRouteSupabaseClient: (() => fake.routeClient) as any,
    })(makeRequest('/api/auth/signup', {
      body: { name: 'Pending User', email: 'pending@example.test', password: 'Valid-Pass-123!', terms: true },
    }));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.confirmationRequired, true);
    assert.equal(body.success, true);
    assert.equal(body.redirectTo, '/login?confirmed=1');
    assert.equal(provisionCalls, 0);
    assert.equal(signOutCalls, 0);
    assert.ok(response.cookies.getAll().some(({ name }) => name === 'mock-auth-response-applied'));
    assert.doesNotMatch(JSON.stringify(body), /access_token|refresh_token|pending-auth-uuid/);
  });
});
