import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAuthApiErrorMessage,
  getAuthProviders,
  getSafeOAuthAuthorizationUrl,
  getSafeAuthRedirect,
  postAuthApi,
  startOAuth,
} from '../../src/services/authApi';
import { loginSchema, oauthStartSchema } from '../../src/lib/validation';
import {
  AUTH_SESSION_PERSISTENCE_MAX_AGE,
  AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
  getAuthSessionPersistenceCookieOptions,
  getSupabaseAuthCookieOptions,
} from '../../src/lib/supabase/cookies';

const originalFetch = globalThis.fetch;

type FetchCall = { input: RequestInfo | URL; init?: RequestInit };
let calls: FetchCall[] = [];

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('same-origin auth API client', () => {
  it('fetches a CSRF token and submits JSON with same-origin credentials', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      if (String(input) === '/api/csrf-token') return jsonResponse({ csrfToken: 'test-csrf-token' });
      return jsonResponse({ success: true, redirectTo: '/workspaces/example/collections' });
    }) as typeof fetch;

    const result = await postAuthApi('login', { email: 'user@example.com', password: 'test-password' });

    assert.equal(result.response.status, 200);
    assert.equal(result.data.success, true);
    assert.equal(calls.length, 2);
    assert.equal(String(calls[0].input), '/api/csrf-token');
    assert.equal(calls[0].init?.method, 'GET');
    assert.equal(calls[0].init?.credentials, 'same-origin');
    assert.equal(String(calls[1].input), '/api/auth/login');
    assert.equal(calls[1].init?.method, 'POST');
    assert.equal(calls[1].init?.credentials, 'same-origin');
    assert.equal(new Headers(calls[1].init?.headers).get('x-csrf-token'), 'test-csrf-token');
    assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
      email: 'user@example.com',
      password: 'test-password',
    });
  });

  it('does not send an auth request when CSRF initialization fails', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return jsonResponse({ message: 'unavailable' }, 503);
    }) as typeof fetch;

    await assert.rejects(
      () => postAuthApi('signup', { name: 'Test', email: 'test@example.com', password: 'test-password', terms: true }),
      /secure authentication request/,
    );
    assert.equal(calls.length, 1);
  });

  it('accepts the remember-me field while defaulting old login clients to a session cookie', () => {
    assert.deepEqual(loginSchema.parse({ email: 'User@Example.com', password: 'test-password' }), {
      email: 'user@example.com',
      password: 'test-password',
      remember: false,
    });
    assert.deepEqual(loginSchema.parse({ email: 'user@example.com', password: 'test-password', remember: true }), {
      email: 'user@example.com',
      password: 'test-password',
      remember: true,
    });
  });

  it('allows only the two OAuth providers and requires explicit Terms consent', () => {
    assert.deepEqual(oauthStartSchema.parse({
      provider: 'google',
      remember: true,
      termsAccepted: true,
    }), {
      provider: 'google',
      remember: true,
      termsAccepted: true,
    });
    assert.equal(oauthStartSchema.safeParse({ provider: 'saml', remember: false, termsAccepted: true }).success, false);
    assert.equal(oauthStartSchema.safeParse({ provider: 'github', remember: false, termsAccepted: false }).success, true);
    assert.equal(oauthStartSchema.safeParse({
      provider: 'github',
      remember: false,
      termsAccepted: true,
      redirectTo: 'https://attacker.example',
    }).success, false);
  });

  it('keeps remember-me preference HttpOnly and applies persistence only when requested', () => {
    const rememberedAuthCookie = getSupabaseAuthCookieOptions(true);
    const sessionAuthCookie = getSupabaseAuthCookieOptions(false);

    assert.equal(AUTH_SESSION_PERSISTENCE_COOKIE_NAME, 'okeng.remember');
    assert.equal(rememberedAuthCookie.maxAge, AUTH_SESSION_PERSISTENCE_MAX_AGE);
    assert.equal(Object.hasOwn(sessionAuthCookie, 'maxAge'), false);
    assert.equal(getAuthSessionPersistenceCookieOptions(true).maxAge, AUTH_SESSION_PERSISTENCE_MAX_AGE);
    assert.equal(getAuthSessionPersistenceCookieOptions(true).httpOnly, true);
    assert.equal(getAuthSessionPersistenceCookieOptions(false).maxAge, 0);
  });

  it('preserves API errors for rate-limit feedback and rejects external redirect destinations', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      if (String(input) === '/api/csrf-token') return jsonResponse({ csrfToken: 'test-csrf-token' });
      return jsonResponse({ error: 'rate_limit_exceeded', retryAfter: 17 }, 429);
    }) as typeof fetch;

    const result = await postAuthApi('forgotPassword', { email: 'user@example.com' });
    assert.equal(result.response.status, 429);
    assert.equal(getAuthApiErrorMessage(result.response.status, result.data, 'fallback'), 'Demasiados intentos, intenta en 17s');
    assert.equal(getSafeAuthRedirect('/workspaces/example/collections?tab=files', '/'), '/workspaces/example/collections?tab=files');
    assert.equal(getSafeAuthRedirect('https://attacker.example', '/'), '/');
    assert.equal(getSafeAuthRedirect('//attacker.example/path', '/'), '/');
    assert.equal(getSafeAuthRedirect('/\\\\attacker.example', '/'), '/');
  });

  it('discovers only supported providers over a no-store same-origin request', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return jsonResponse({ providers: ['google', 'saml', 'github', 'google'] });
    }) as typeof fetch;

    assert.deepEqual(await getAuthProviders(), ['google', 'github']);
    assert.equal(String(calls[0].input), '/api/auth/providers');
    assert.equal(calls[0].init?.method, 'GET');
    assert.equal(calls[0].init?.credentials, 'same-origin');
    assert.equal(calls[0].init?.cache, 'no-store');
  });

  it('starts OAuth with a CSRF-protected same-origin POST and safe authorization URL', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      if (String(input) === '/api/csrf-token') return jsonResponse({ csrfToken: 'oauth-csrf-token' });
      return jsonResponse({
        url: 'http://127.0.0.1:54321/auth/v1/authorize?provider=google&code_challenge=abc',
      });
    }) as typeof fetch;

    const result = await startOAuth('google', { remember: true, termsAccepted: true });
    assert.equal(result.response.ok, true);
    assert.equal(String(calls[1].input), '/api/auth/oauth/start');
    assert.equal(calls[1].init?.method, 'POST');
    assert.equal(calls[1].init?.credentials, 'same-origin');
    assert.equal(new Headers(calls[1].init?.headers).get('x-csrf-token'), 'oauth-csrf-token');
    assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
      provider: 'google',
      remember: true,
      termsAccepted: true,
    });
    assert.equal(
      getSafeOAuthAuthorizationUrl(result.data.url, 'google'),
      'http://127.0.0.1:54321/auth/v1/authorize?provider=google&code_challenge=abc',
    );
    assert.equal(getSafeOAuthAuthorizationUrl('https://attacker.example/login', 'google'), null);
    assert.equal(
      getSafeOAuthAuthorizationUrl('https://project.supabase.co/auth/v1/authorize?provider=github', 'google'),
      null,
    );
  });
});
