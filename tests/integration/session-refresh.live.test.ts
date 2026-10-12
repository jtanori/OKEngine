import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { POST as signup } from '../../src/app/api/auth/signup/route';
import { POST as login } from '../../src/app/api/auth/login/route';
import { GET as sessionRoute } from '../../src/app/api/auth/session/route';
import { GET as overviewRoute } from '../../src/app/api/workspaces/[workspaceSlug]/overview/route';
import {
  confirmLocalSignup,
  createLocalCleanup,
  getResponseCookies,
  makeApiRequest,
  mergeResponseCookies,
  readAuthSessionCookie,
  replaceAuthSessionCookie,
  requireLocalSupabase,
  type CookieValue,
} from './helpers/localSupabase';

const local = requireLocalSupabase();

function expiredSessionCookies(cookies: CookieValue[], refreshToken?: string): CookieValue[] {
  const session = { ...readAuthSessionCookie(cookies) };
  session.expires_at = Math.floor(Date.now() / 1000) - 120;
  if (refreshToken) session.refresh_token = refreshToken;
  return replaceAuthSessionCookie(cookies, session);
}

function assertRotatedAuthCookie(response: Awaited<ReturnType<typeof sessionRoute>>, previousRefreshToken: string) {
  const refreshedCookies = getResponseCookies(response);
  const sessionCookies = refreshedCookies.filter(({ name }) => name === 'okeng-auth' || name.startsWith('okeng-auth.'));
  assert.ok(sessionCookies.length > 0, 'A successful SSR refresh must emit rotated Supabase Auth cookies.');
  const refreshed = readAuthSessionCookie(sessionCookies);
  assert.ok(Number(refreshed.expires_at) > Date.now() / 1000, 'The refreshed cookie must contain a future access-session expiry.');
  assert.notEqual(refreshed.refresh_token, previousRefreshToken, 'The outgoing cookie must persist Supabase refresh-token rotation.');
  for (const cookie of response.cookies.getAll().filter(({ name }) => name.startsWith('okeng-auth'))) {
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, 'lax');
    assert.equal(cookie.path, '/');
  }
  return refreshedCookies;
}

function assertAuthCookieCleared(cookies: ReturnType<typeof getResponseCookies>) {
  assert.ok(cookies.some(({ name, value, maxAge }) =>
    (name === 'okeng-auth' || name.startsWith('okeng-auth.')) && (value === '' || maxAge === 0),
  ), 'Rejected refresh credentials must clear the HttpOnly session cookie in the response.');
}

test('a real expired local session refreshes through /api/auth/session and returns rotated HttpOnly cookies', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const email = `okeng-refresh-${randomUUID()}@example.com`;
    const password = `Refresh-Test-${randomUUID()}-9!`;
    const signupResponse = await signup(makeApiRequest('/api/auth/signup', {
      method: 'POST', csrf: true,
      body: { name: 'Refresh Test', email, password, terms: true },
    }));
    const signupBody = await signupResponse.json();
    assert.equal(signupResponse.status, 200, JSON.stringify(signupBody));
    assert.equal(signupBody.confirmationRequired, true);
    const pendingUsers = await cleanup.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    assert.equal(pendingUsers.error, null, pendingUsers.error?.message);
    const pendingUser = pendingUsers.data.users.find(({ email: candidate }) => candidate === email);
    assert.ok(pendingUser, 'The pending Auth signup must be available for its one-time confirmation flow.');
    cleanup.trackUser(pendingUser.id);
    const confirmedUser = await confirmLocalSignup(local, email, password);
    assert.equal(confirmedUser.id, pendingUser.id);

    const loginResponse = await login(makeApiRequest('/api/auth/login', {
      method: 'POST', csrf: true,
      body: { email, password, remember: true },
    }));
    const loginBody = await loginResponse.json();
    assert.equal(loginResponse.status, 200, JSON.stringify(loginBody));
    cleanup.trackUser(loginBody.user.id);
    cleanup.trackWorkspace(loginBody.workspace.id);
    const originalCookies = getResponseCookies(loginResponse);
    const originalSession = readAuthSessionCookie(originalCookies);
    assert.equal(originalSession.user.id, loginBody.user.id);
    assert.ok(originalSession.refresh_token);
    assert.ok(Number(originalSession.expires_at) > Date.now() / 1000);
    assert.ok(loginResponse.cookies.getAll().some(({ name, httpOnly, sameSite }) =>
      name.startsWith('okeng-auth') && httpOnly === true && sameSite === 'lax',
    ), 'The original login session must be an HttpOnly SameSite=Lax cookie.');

    const expiredCookies = expiredSessionCookies(originalCookies);
    const refreshResponse = await sessionRoute(makeApiRequest('/api/auth/session', { cookies: expiredCookies }));
    const refreshBody = await refreshResponse.json();
    assert.equal(refreshResponse.status, 200);
    assert.equal(refreshBody.authenticated, true);
    assert.equal(refreshBody.session.userId, loginBody.user.id);
    assert.doesNotMatch(JSON.stringify(refreshBody), /access_token|refresh_token/i);
    const rotatedCookies = assertRotatedAuthCookie(refreshResponse, originalSession.refresh_token);
    const currentCookies = mergeResponseCookies(expiredCookies, refreshResponse);
    assert.equal(readAuthSessionCookie(currentCookies).refresh_token, readAuthSessionCookie(rotatedCookies).refresh_token);
  } finally {
    await cleanup.cleanup();
  }
});

test('protected success and post-auth 404 responses preserve real refresh-token rotation cookies', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const email = `okeng-protected-refresh-${randomUUID()}@example.com`;
    const password = `Protected-Test-${randomUUID()}-9!`;
    const signupResponse = await signup(makeApiRequest('/api/auth/signup', {
      method: 'POST', csrf: true,
      body: { name: 'Protected Refresh', email, password, terms: true },
    }));
    const signupBody = await signupResponse.json();
    assert.equal(signupResponse.status, 200, JSON.stringify(signupBody));
    assert.equal(signupBody.confirmationRequired, true);
    const pendingUsers = await cleanup.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    assert.equal(pendingUsers.error, null, pendingUsers.error?.message);
    const pendingUser = pendingUsers.data.users.find(({ email: candidate }) => candidate === email);
    assert.ok(pendingUser, 'The pending Auth signup must be available for its one-time confirmation flow.');
    cleanup.trackUser(pendingUser.id);
    const confirmedUser = await confirmLocalSignup(local, email, password);
    assert.equal(confirmedUser.id, pendingUser.id);

    const loginResponse = await login(makeApiRequest('/api/auth/login', {
      method: 'POST', csrf: true,
      body: { email, password, remember: false },
    }));
    const loginBody = await loginResponse.json();
    assert.equal(loginResponse.status, 200, JSON.stringify(loginBody));
    const initialCookies = getResponseCookies(loginResponse);
    const initialSession = readAuthSessionCookie(initialCookies);
    let currentCookies = expiredSessionCookies(initialCookies);

    const successResponse = await overviewRoute(
      makeApiRequest(`/api/workspaces/${encodeURIComponent(loginBody.workspace.slug)}/overview`, { cookies: currentCookies }),
      { params: Promise.resolve({ workspaceSlug: loginBody.workspace.slug }) },
    );
    const successBody = await successResponse.json();
    assert.equal(successResponse.status, 200, JSON.stringify(successBody));
    assert.equal(successBody.workspace.id, loginBody.workspace.id);
    assert.doesNotMatch(JSON.stringify(successBody), /access_token|refresh_token/i);
    const successCookies = assertRotatedAuthCookie(successResponse, initialSession.refresh_token);
    currentCookies = mergeResponseCookies(currentCookies, successResponse);

    const successSession = readAuthSessionCookie(currentCookies);
    assert.equal(successSession.refresh_token, readAuthSessionCookie(successCookies).refresh_token);
    const errorRequestCookies = expiredSessionCookies(currentCookies);
    const notFoundResponse = await overviewRoute(
      makeApiRequest('/api/workspaces/not-a-real-workspace/overview', { cookies: errorRequestCookies }),
      { params: Promise.resolve({ workspaceSlug: 'not-a-real-workspace' }) },
    );
    const notFoundBody = await notFoundResponse.json();
    assert.equal(notFoundResponse.status, 404);
    assert.equal(notFoundBody.error, 'not_found');
    assert.doesNotMatch(JSON.stringify(notFoundBody), /access_token|refresh_token/i);
    const errorCookies = assertRotatedAuthCookie(notFoundResponse, successSession.refresh_token);
    assert.ok(errorCookies.length > 0, 'The protected error response must carry the refreshed cookie mutations.');
  } finally {
    await cleanup.cleanup();
  }
});

test('expired access-session metadata with invalid refresh credentials fails closed and clears cookies on session/protected routes', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const email = `okeng-invalid-refresh-${randomUUID()}@example.com`;
    const password = `Invalid-Refresh-${randomUUID()}-9!`;
    const signupResponse = await signup(makeApiRequest('/api/auth/signup', {
      method: 'POST', csrf: true,
      body: { name: 'Invalid Refresh', email, password, terms: true },
    }));
    const signupBody = await signupResponse.json();
    assert.equal(signupResponse.status, 200, JSON.stringify(signupBody));
    assert.equal(signupBody.confirmationRequired, true);
    const pendingUsers = await cleanup.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    assert.equal(pendingUsers.error, null, pendingUsers.error?.message);
    const pendingUser = pendingUsers.data.users.find(({ email: candidate }) => candidate === email);
    assert.ok(pendingUser, 'The pending Auth signup must be available for its one-time confirmation flow.');
    cleanup.trackUser(pendingUser.id);
    const confirmedUser = await confirmLocalSignup(local, email, password);
    assert.equal(confirmedUser.id, pendingUser.id);

    const loginResponse = await login(makeApiRequest('/api/auth/login', {
      method: 'POST', csrf: true,
      body: { email, password, remember: false },
    }));
    const loginBody = await loginResponse.json();
    assert.equal(loginResponse.status, 200, JSON.stringify(loginBody));
    const invalidCookies = expiredSessionCookies(getResponseCookies(loginResponse), `invalid-refresh-${randomUUID()}`);

    const sessionResponse = await sessionRoute(makeApiRequest('/api/auth/session', { cookies: invalidCookies }));
    const sessionBody = await sessionResponse.json();
    assert.equal(sessionResponse.status, 200);
    assert.equal(sessionBody.authenticated, false);
    assert.equal(sessionBody.session, null);
    assert.doesNotMatch(JSON.stringify(sessionBody), /access_token|refresh_token|invalid-refresh/i);
    assertAuthCookieCleared(getResponseCookies(sessionResponse));

    const protectedResponse = await overviewRoute(
      makeApiRequest(`/api/workspaces/${encodeURIComponent(loginBody.workspace.slug)}/overview`, { cookies: invalidCookies }),
      { params: Promise.resolve({ workspaceSlug: loginBody.workspace.slug }) },
    );
    const protectedBody = await protectedResponse.json();
    assert.equal(protectedResponse.status, 401);
    assert.equal(protectedBody.error, 'unauthorized');
    assertAuthCookieCleared(getResponseCookies(protectedResponse));
  } finally {
    await cleanup.cleanup();
  }
});
