import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { POST as signup } from '../../src/app/api/auth/signup/route';
import { POST as login } from '../../src/app/api/auth/login/route';
import { POST as logout } from '../../src/app/api/auth/logout/route';
import { POST as forgotPassword } from '../../src/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '../../src/app/api/auth/reset-password/route';
import { GET as authCallback } from '../../src/app/auth/callback/route';
import {
  createLocalCleanup,
  createLocalIdentity,
  getResponseCookies,
  makeApiRequest,
  makeSupabaseClient,
  queryLocalDatabase,
  readAuthSessionCookie,
  requireLocalSupabase,
  type CookieValue,
} from './helpers/localSupabase';

const local = requireLocalSupabase();

async function signupViaApp(cleanup: ReturnType<typeof createLocalCleanup>, label: string) {
  const email = `okeng-${label}-${randomUUID()}@example.com`;
  const password = `Local-Test-${randomUUID()}-9!`;
  const response = await signup(makeApiRequest('/api/auth/signup', {
    method: 'POST',
    csrf: true,
    body: { name: `Local ${label}`, email, password, terms: true },
  }));
  const body = await response.json();
  if (body?.user?.id) cleanup.trackUser(body.user.id);
  else {
    const users = await cleanup.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const created = (users.data.users as Array<{ id: string; email?: string | null }>).find((user) => user.email === email);
    if (created) cleanup.trackUser(created.id);
  }
  if (body?.workspace?.id) cleanup.trackWorkspace(body.workspace.id);
  return { response, body, email, password };
}

async function makeMagicLink(cleanup: ReturnType<typeof createLocalCleanup>, email: string, type: 'magiclink' | 'recovery' = 'magiclink') {
  const { data, error } = await cleanup.admin.auth.admin.generateLink({ type, email });
  assert.equal(error, null, error?.message || `Auth Admin could not generate a local ${type} verification link.`);
  assert.ok(data.properties.hashed_token, 'Auth Admin did not return the local one-time hashed token.');
  return data.properties.hashed_token;
}

function authCookies(cookies: CookieValue[]) {
  return cookies.filter(({ name }) => name === 'okeng-auth' || name.startsWith('okeng-auth.'));
}

test('real local signup maps Auth UUID, provisions one private workspace, and returns only an HttpOnly session', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const { response, body } = await signupViaApp(cleanup, 'signup');
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.success, true);
    assert.equal(body.confirmationRequired, false, 'Local config intentionally disables SMTP confirmation for baseline signup.');
    assert.match(body.user.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(body.user.email, body.user.email.toLowerCase());
    assert.ok(body.workspace.id.startsWith('ws_'));
    cleanup.trackWorkspace(body.workspace.id);
    assert.equal(body.redirectTo, `/workspaces/${encodeURIComponent(body.workspace.slug)}/collections`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(JSON.stringify(body), /access_token|refresh_token|service_role/i);

    const sessionCookies = authCookies(getResponseCookies(response));
    assert.ok(sessionCookies.length > 0, 'Signup must set the SSR Auth cookie in its response.');
    for (const cookie of response.cookies.getAll().filter(({ name }) => name.startsWith('okeng-auth'))) {
      assert.equal(cookie.httpOnly, true, 'Supabase session cookies must be HttpOnly.');
      assert.equal(cookie.sameSite, 'lax');
      assert.equal(cookie.path, '/');
      assert.equal(cookie.secure, false, 'The local HTTP stack must not set Secure cookies in NODE_ENV=test.');
    }
    const cookieSession = readAuthSessionCookie(sessionCookies);
    assert.equal(cookieSession.user.id, body.user.id);

    const profiles = await queryLocalDatabase<{
      id: string;
      auth_user_id: string;
      email: string;
      account_status: string;
    }>(local, 'SELECT id, auth_user_id, email, account_status FROM public.users WHERE auth_user_id = $1', [body.user.id]);
    assert.equal(profiles.length, 1, 'The Auth trigger must map exactly one app profile for an Auth UUID.');
    assert.equal(profiles[0]?.id, body.user.id, 'The application profile key must map to the immutable Auth UUID.');
    assert.equal(profiles[0]?.auth_user_id, body.user.id);
    assert.equal(profiles[0]?.account_status, 'ACTIVE');

    const tenant = await queryLocalDatabase<{
      membership_count: string;
      collection_count: string;
      workspace_role: string;
      collection_name: string;
      collection_visibility: string;
    }>(local, `
      SELECT
        (SELECT COUNT(*)::text FROM public.workspace_memberships WHERE workspace_id = $1 AND user_id = $2 AND status = 'ACTIVE') AS membership_count,
        (SELECT COUNT(*)::text FROM public.collections WHERE workspace_id = $1) AS collection_count,
        (SELECT role FROM public.workspace_memberships WHERE workspace_id = $1 AND user_id = $2 AND status = 'ACTIVE') AS workspace_role,
        (SELECT name FROM public.collections WHERE workspace_id = $1 ORDER BY created_at LIMIT 1) AS collection_name,
        (SELECT visibility FROM public.collections WHERE workspace_id = $1 ORDER BY created_at LIMIT 1) AS collection_visibility
    `, [body.workspace.id, body.user.id]);
    assert.equal(tenant[0]?.membership_count, '1');
    assert.equal(tenant[0]?.workspace_role, 'WORKSPACE_OWNER');
    assert.equal(tenant[0]?.collection_count, '1');
    assert.equal(tenant[0]?.collection_name, 'Knowledge Base');
    assert.equal(tenant[0]?.collection_visibility, 'members');
  } finally {
    await cleanup.cleanup();
  }
});

test('real magic-link callback retries provision exactly one workspace for the verified Auth identity', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const identity = await createLocalIdentity(local, cleanup, 'callback');
    const profileBeforeCallback = await queryLocalDatabase<{ workspace_count: string }>(local, `
      SELECT COUNT(*)::text AS workspace_count
      FROM public.workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE'
    `, [identity.user.id]);
    assert.equal(profileBeforeCallback[0]?.workspace_count, '0', 'A bare Auth signup must not provision before the verified callback.');

    const firstToken = await makeMagicLink(cleanup, identity.email);
    const firstResponse = await authCallback(makeApiRequest(
      `/auth/callback?token_hash=${encodeURIComponent(firstToken)}&type=magiclink&next=%2Flogin%3Fconfirmed%3D1`,
    ));
    assert.equal(firstResponse.status, 307);
    const firstDestination = new URL(firstResponse.headers.get('location') || '');
    assert.equal(firstDestination.origin, 'http://localhost:3000');
    assert.match(firstDestination.pathname, /^\/workspaces\/[a-z0-9-]+\/collections$/);
    cleanup.trackWorkspace((await queryLocalDatabase<{ workspace_id: string }>(local, `
      SELECT workspace_id FROM public.workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE'
    `, [identity.user.id]))[0]!.workspace_id);
    assert.ok(authCookies(getResponseCookies(firstResponse)).length > 0, 'The verified callback must set the Auth SSR session cookie.');

    const retryToken = await makeMagicLink(cleanup, identity.email);
    const retryResponse = await authCallback(makeApiRequest(
      `/auth/callback?token_hash=${encodeURIComponent(retryToken)}&type=magiclink&next=%2Flogin%3Fconfirmed%3D1`,
    ));
    assert.equal(retryResponse.status, 307);
    assert.equal(new URL(retryResponse.headers.get('location') || '').pathname, firstDestination.pathname);

    const counts = await queryLocalDatabase<{ workspace_count: string; membership_count: string; collection_count: string }>(local, `
      SELECT
        (SELECT COUNT(DISTINCT workspace_id)::text FROM public.workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE') AS workspace_count,
        (SELECT COUNT(*)::text FROM public.workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE') AS membership_count,
        (SELECT COUNT(*)::text FROM public.collections c JOIN public.workspace_memberships m ON m.workspace_id = c.workspace_id WHERE m.user_id = $1 AND m.status = 'ACTIVE') AS collection_count
    `, [identity.user.id]);
    assert.deepEqual(counts[0], { workspace_count: '1', membership_count: '1', collection_count: '1' });
  } finally {
    await cleanup.cleanup();
  }
});

test('concurrent real provisioning RPC retries serialize to one workspace and starter collection', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const identity = await createLocalIdentity(local, cleanup, 'concurrent');
    const results = await Promise.all(Array.from({ length: 8 }, () => identity.client.rpc('provision_initial_workspace')));
    for (const result of results) assert.equal(result.error, null, result.error?.message);
    const workspaceIds = results.map((result) => Array.isArray(result.data) ? result.data[0]?.workspace_id : result.data?.workspace_id);
    assert.ok(workspaceIds[0]);
    assert.deepEqual(new Set(workspaceIds).size, 1, 'Concurrent provisioning must return the same workspace to every callback retry.');
    cleanup.trackWorkspace(workspaceIds[0]!);

    const rows = await queryLocalDatabase<{ workspace_count: string; membership_count: string; starter_count: string }>(local, `
      SELECT
        (SELECT COUNT(*)::text FROM public.workspaces WHERE id = $1) AS workspace_count,
        (SELECT COUNT(*)::text FROM public.workspace_memberships WHERE workspace_id = $1 AND user_id = $2 AND status = 'ACTIVE') AS membership_count,
        (SELECT COUNT(*)::text FROM public.collections WHERE workspace_id = $1 AND name = 'Knowledge Base') AS starter_count
    `, [workspaceIds[0], identity.user.id]);
    assert.deepEqual(rows[0], { workspace_count: '1', membership_count: '1', starter_count: '1' });
  } finally {
    await cleanup.cleanup();
  }
});

test('login, remember-cookie attributes, generic credential errors, logout, and session revocation use real Auth', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const signupResult = await signupViaApp(cleanup, 'login');
    assert.equal(signupResult.response.status, 200, JSON.stringify(signupResult.body));
    cleanup.trackWorkspace(signupResult.body.workspace.id);

    const success = await login(makeApiRequest('/api/auth/login', {
      method: 'POST',
      csrf: true,
      body: { email: signupResult.email, password: signupResult.password, remember: true },
    }));
    const successBody = await success.json();
    assert.equal(success.status, 200, JSON.stringify(successBody));
    assert.equal(successBody.user.id, signupResult.body.user.id);
    assert.equal(successBody.workspace.id, signupResult.body.workspace.id, 'Login provisioning must return the same workspace.');
    assert.doesNotMatch(JSON.stringify(successBody), /access_token|refresh_token/i);

    const loginCookies = getResponseCookies(success);
    const authSessionCookies = authCookies(loginCookies);
    assert.ok(authSessionCookies.length > 0);
    for (const cookie of success.cookies.getAll().filter(({ name }) => name.startsWith('okeng-auth'))) {
      assert.equal(cookie.httpOnly, true);
      assert.equal(cookie.sameSite, 'lax');
      assert.equal(cookie.path, '/');
      assert.equal(cookie.maxAge, 60 * 60 * 24 * 30, 'Remember me must apply the 30-day session persistence policy.');
    }
    assert.equal(success.cookies.get('okeng.remember')?.value, '1');
    assert.equal(success.cookies.get('okeng.remember')?.httpOnly, true);

    const badCredentials = await login(makeApiRequest('/api/auth/login', {
      method: 'POST',
      csrf: true,
      body: { email: signupResult.email, password: 'Wrong-Password-9!', remember: false },
    }));
    const badBody = await badCredentials.json();
    assert.equal(badCredentials.status, 401);
    assert.equal(badBody.error, 'unauthorized');
    assert.equal(badBody.message, 'Credenciales inválidas');
    assert.doesNotMatch(JSON.stringify(badBody), /user not found|email exists|access_token|refresh_token/i);

    const duplicate = await signup(makeApiRequest('/api/auth/signup', {
      method: 'POST',
      csrf: true,
      body: { name: 'Duplicate', email: signupResult.email, password: signupResult.password, terms: true },
    }));
    const duplicateBody = await duplicate.json();
    assert.equal(duplicate.status, 400);
    assert.equal(duplicateBody.error, 'signup_failed');
    assert.doesNotMatch(JSON.stringify(duplicateBody), /already registered|user exists|access_token|refresh_token/i);

    const signedOut = await logout(makeApiRequest('/api/auth/logout', {
      method: 'POST',
      csrf: true,
      cookies: loginCookies,
    }));
    assert.equal(signedOut.status, 200);
    assert.deepEqual(await signedOut.json(), { success: true });
    for (const cookie of signedOut.cookies.getAll().filter(({ name }) => name.startsWith('okeng-auth'))) {
      assert.equal(cookie.value, '');
      assert.equal(cookie.maxAge, 0);
      assert.equal(cookie.httpOnly, true);
    }
    assert.equal(signedOut.cookies.get('okeng.remember')?.maxAge, 0);

    const clearedCookies = loginCookies.filter(({ name }) => !name.startsWith('okeng-auth') && name !== 'okeng.remember');
    const afterLogout = await (await import('../../src/app/api/auth/session/route')).GET(makeApiRequest('/api/auth/session', { cookies: clearedCookies }));
    const afterLogoutBody = await afterLogout.json();
    assert.equal(afterLogoutBody.authenticated, false, 'A cleared logout cookie must not hydrate an authenticated app session.');
    assert.equal(afterLogoutBody.session, null);
  } finally {
    await cleanup.cleanup();
  }
});

test('password recovery is enumeration-safe and a real recovery callback changes the Auth password', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const signupResult = await signupViaApp(cleanup, 'recovery');
    assert.equal(signupResult.response.status, 200, JSON.stringify(signupResult.body));
    cleanup.trackWorkspace(signupResult.body.workspace.id);

    const known = await forgotPassword(makeApiRequest('/api/auth/forgot-password', {
      method: 'POST',
      csrf: true,
      body: { email: signupResult.email },
    }));
    const missing = await forgotPassword(makeApiRequest('/api/auth/forgot-password', {
      method: 'POST',
      csrf: true,
      body: { email: `absent-${randomUUID()}@example.com` },
    }));
    assert.equal(known.status, 200);
    assert.equal(missing.status, 200);
    assert.deepEqual(await known.json(), await missing.json(), 'Forgot-password responses must not reveal whether an email exists.');
    assert.equal(known.headers.get('cache-control'), 'no-store');

    const recoveryToken = await makeMagicLink(cleanup, signupResult.email, 'recovery');
    const recovery = await authCallback(makeApiRequest(
      `/auth/callback?token_hash=${encodeURIComponent(recoveryToken)}&type=recovery&next=%2Freset-password`,
    ));
    assert.equal(recovery.status, 307);
    assert.equal(new URL(recovery.headers.get('location') || '').pathname, '/reset-password');
    const recoveryCookies = getResponseCookies(recovery);
    assert.ok(authCookies(recoveryCookies).length > 0, 'Recovery verification must establish an HttpOnly Auth session.');

    const noSession = await resetPassword(makeApiRequest('/api/auth/reset-password', {
      method: 'POST',
      csrf: true,
      body: { newPassword: 'Replacement-Password-9!', confirmPassword: 'Replacement-Password-9!' },
    }));
    assert.equal(noSession.status, 401, 'Password update must fail closed without the verified recovery session.');

    const newPassword = `Replacement-${randomUUID()}-9!`;
    const updated = await resetPassword(makeApiRequest('/api/auth/reset-password', {
      method: 'POST',
      csrf: true,
      cookies: recoveryCookies,
      body: { newPassword, confirmPassword: newPassword },
    }));
    const updatedBody = await updated.json();
    assert.equal(updated.status, 200, JSON.stringify(updatedBody));
    assert.equal(updatedBody.success, true);
    assert.doesNotMatch(JSON.stringify(updatedBody), /access_token|refresh_token/i);

    const publicAuth = makeSupabaseClient(local.url, local.anonKey);
    const newLogin = await publicAuth.auth.signInWithPassword({ email: signupResult.email, password: newPassword });
    assert.equal(newLogin.error, null, newLogin.error?.message || 'The newly set local Auth password should work.');
    assert.equal(newLogin.data.user?.id, signupResult.body.user.id);
    const oldLogin = await publicAuth.auth.signInWithPassword({ email: signupResult.email, password: signupResult.password });
    assert.ok(oldLogin.error, 'The previous password must no longer authenticate after a successful reset.');
  } finally {
    await cleanup.cleanup();
  }
});

test('suspended or missing profiles cannot obtain an app session when Auth itself accepts login', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const suspended = await createLocalIdentity(local, cleanup, 'suspended');
    await queryLocalDatabase(local, 'UPDATE public.users SET account_status = $2 WHERE id = $1', [suspended.user.id, 'SUSPENDED']);
    const suspendedLogin = await login(makeApiRequest('/api/auth/login', {
      method: 'POST',
      csrf: true,
      body: { email: suspended.email, password: suspended.password, remember: false },
    }));
    const suspendedBody = await suspendedLogin.json();
    assert.equal(suspendedLogin.status, 503);
    assert.equal(suspendedBody.error, 'workspace_unavailable');
    assert.doesNotMatch(JSON.stringify(suspendedBody), /SUSPENDED|42501|database|access_token|refresh_token/i);
    assert.ok(suspendedLogin.cookies.getAll().some(({ name, value, maxAge }) =>
      (name === 'okeng-auth' || name.startsWith('okeng-auth.')) && (value === '' || maxAge === 0),
    ), 'Failed provisioning must clear any newly created Auth session cookie.');

    const missingProfile = await createLocalIdentity(local, cleanup, 'missing-profile');
    await queryLocalDatabase(local, 'DELETE FROM public.users WHERE id = $1', [missingProfile.user.id]);
    const missingLogin = await login(makeApiRequest('/api/auth/login', {
      method: 'POST',
      csrf: true,
      body: { email: missingProfile.email, password: missingProfile.password, remember: false },
    }));
    const missingBody = await missingLogin.json();
    assert.equal(missingLogin.status, 503);
    assert.equal(missingBody.error, 'workspace_unavailable');
    assert.doesNotMatch(JSON.stringify(missingBody), /profile|active|42501|access_token|refresh_token/i);
  } finally {
    await cleanup.cleanup();
  }
});
