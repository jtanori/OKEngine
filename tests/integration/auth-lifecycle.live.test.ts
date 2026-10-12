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
  confirmLocalSignup,
  createLocalCleanup,
  createLocalIdentity,
  generateLocalSignupToken,
  getResponseCookies,
  makeApiRequest,
  makeSupabaseClient,
  queryLocalDatabase,
  readAuthSessionCookie,
  requireLocalSupabase,
  type CookieValue,
} from './helpers/localSupabase';

const local = requireLocalSupabase();

async function signupViaApp(
  cleanup: ReturnType<typeof createLocalCleanup>,
  label: string,
  { confirm = false }: { confirm?: boolean } = {},
) {
  const email = `okeng-${label}-${randomUUID()}@example.com`;
  const password = `Local-Test-${randomUUID()}-9!`;
  const response = await signup(makeApiRequest('/api/auth/signup', {
    method: 'POST',
    csrf: true,
    body: { name: `Local ${label}`, email, password, terms: true },
  }));
  const body = await response.json();
  let userId = body?.user?.id as string | undefined;
  if (!userId) {
    const users = await cleanup.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    assert.equal(users.error, null, users.error?.message);
    userId = users.data.users.find((user) => user.email === email)?.id;
  }
  assert.ok(userId, 'Local app signup must create a Supabase Auth user even while confirmation is pending.');
  cleanup.trackUser(userId);

  let workspace = body?.workspace as { id: string; slug: string } | undefined;
  let confirmationResponse: Awaited<ReturnType<typeof authCallback>> | null = null;
  if (confirm) {
    const tokenHash = await generateLocalSignupToken(local, email, password);
    confirmationResponse = await authCallback(makeApiRequest(
      `/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=signup&next=%2Flogin%3Fconfirmed%3D1`,
    ));
    assert.equal(confirmationResponse.status, 307);
    const membership = await queryLocalDatabase<{ workspace_id: string; workspace_slug: string }>(local, `
      SELECT w.id AS workspace_id, w.slug AS workspace_slug
      FROM public.workspace_memberships AS m
      JOIN public.workspaces AS w ON w.id = m.workspace_id
      WHERE m.user_id = $1 AND m.status = 'ACTIVE'
    `, [userId]);
    assert.equal(membership.length, 1, 'The real confirmation callback must provision exactly one active workspace.');
    workspace = { id: membership[0]!.workspace_id, slug: membership[0]!.workspace_slug };
    cleanup.trackWorkspace(workspace.id);
  }
  return { response, body, email, password, userId, workspace, confirmationResponse };
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

test('real confirmation-required signup leaves no session, then confirms and provisions one Auth-UUID workspace', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const { response, body, email, password: signupPassword, userId } = await signupViaApp(cleanup, 'signup');
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.success, true);
    assert.equal(body.confirmationRequired, true);
    assert.equal(body.redirectTo, '/login?confirmed=1');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(JSON.stringify(body), /access_token|refresh_token|service_role/i);
    assert.equal(authCookies(getResponseCookies(response)).length, 0, 'Pending signup must not issue an authenticated app session.');

    const profiles = await queryLocalDatabase<{
      id: string;
      auth_user_id: string;
      email: string;
      account_status: string;
    }>(local, 'SELECT id, auth_user_id, email, account_status FROM public.users WHERE auth_user_id = $1', [userId]);
    assert.equal(profiles.length, 1, 'The Auth trigger must map exactly one app profile for a pending Auth UUID.');
    assert.equal(profiles[0]?.id, userId, 'The application profile key must map to the immutable Auth UUID.');
    assert.equal(profiles[0]?.auth_user_id, userId);
    assert.equal(profiles[0]?.email, email);
    assert.equal(profiles[0]?.account_status, 'ACTIVE');

    const beforeConfirmation = await queryLocalDatabase<{ workspace_count: string; membership_count: string }>(local, `
      SELECT
        (SELECT COUNT(*)::text FROM public.workspaces w JOIN public.workspace_memberships m ON m.workspace_id = w.id WHERE m.user_id = $1 AND m.status = 'ACTIVE') AS workspace_count,
        (SELECT COUNT(*)::text FROM public.workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE') AS membership_count
    `, [userId]);
    assert.deepEqual(beforeConfirmation[0], { workspace_count: '0', membership_count: '0' });

    const confirmationToken = await generateLocalSignupToken(local, email, signupPassword);
    const confirmed = await authCallback(makeApiRequest(
      `/auth/callback?token_hash=${encodeURIComponent(confirmationToken)}&type=signup&next=%2Flogin%3Fconfirmed%3D1`,
    ));
    assert.equal(confirmed.status, 307);
    const destination = new URL(confirmed.headers.get('location') || '');
    assert.equal(destination.origin, 'http://localhost:3000');
    assert.match(destination.pathname, /^\/workspaces\/[a-z0-9-]+\/collections$/);

    const workspaceRows = await queryLocalDatabase<{
      workspace_id: string;
      workspace_slug: string;
      workspace_role: string;
      collection_count: string;
      collection_name: string;
      collection_visibility: string;
    }>(local, `
      SELECT
        w.id AS workspace_id,
        w.slug AS workspace_slug,
        m.role AS workspace_role,
        (SELECT COUNT(*)::text FROM public.collections WHERE workspace_id = w.id) AS collection_count,
        (SELECT name FROM public.collections WHERE workspace_id = w.id ORDER BY created_at LIMIT 1) AS collection_name,
        (SELECT visibility FROM public.collections WHERE workspace_id = w.id ORDER BY created_at LIMIT 1) AS collection_visibility
      FROM public.workspace_memberships AS m
      JOIN public.workspaces AS w ON w.id = m.workspace_id
      WHERE m.user_id = $1 AND m.status = 'ACTIVE'
    `, [userId]);
    assert.equal(workspaceRows.length, 1, 'Verified callback must provision exactly one active workspace.');
    const workspace = workspaceRows[0]!;
    cleanup.trackWorkspace(workspace.workspace_id);
    assert.equal(destination.pathname, `/workspaces/${encodeURIComponent(workspace.workspace_slug)}/collections`);
    assert.equal(workspace.workspace_role, 'WORKSPACE_OWNER');
    assert.equal(workspace.collection_count, '1');
    assert.equal(workspace.collection_name, 'Knowledge Base');
    assert.equal(workspace.collection_visibility, 'members');

    const sessionCookies = authCookies(getResponseCookies(confirmed));
    assert.ok(sessionCookies.length > 0, 'Successful confirmation callback must issue the SSR Auth session cookie.');
    for (const cookie of confirmed.cookies.getAll().filter(({ name }) => name.startsWith('okeng-auth'))) {
      assert.equal(cookie.httpOnly, true, 'Supabase session cookies must be HttpOnly.');
      assert.equal(cookie.sameSite, 'lax');
      assert.equal(cookie.path, '/');
      assert.equal(cookie.secure, false, 'The local HTTP stack must not set Secure cookies in NODE_ENV=test.');
    }
    const cookieSession = readAuthSessionCookie(sessionCookies);
    assert.equal(cookieSession.user.id, userId);
  } finally {
    await cleanup.cleanup();
  }
});

test('real signup-confirmation callback retries provision exactly one workspace for the verified Auth identity', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const identity = await createLocalIdentity(local, cleanup, 'callback');
    const profileBeforeCallback = await queryLocalDatabase<{ workspace_count: string }>(local, `
      SELECT COUNT(*)::text AS workspace_count
      FROM public.workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE'
    `, [identity.user.id]);
    assert.equal(profileBeforeCallback[0]?.workspace_count, '0', 'A bare Auth signup must not provision before the verified callback.');

    const firstToken = await generateLocalSignupToken(local, identity.email, identity.password);
    const firstResponse = await authCallback(makeApiRequest(
      `/auth/callback?token_hash=${encodeURIComponent(firstToken)}&type=signup&next=%2Flogin%3Fconfirmed%3D1`,
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
    await confirmLocalSignup(local, identity.email, identity.password, identity.client);
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
    const signupResult = await signupViaApp(cleanup, 'login', { confirm: true });
    assert.equal(signupResult.response.status, 200, JSON.stringify(signupResult.body));
    assert.ok(signupResult.workspace);
    cleanup.trackWorkspace(signupResult.workspace.id);

    const success = await login(makeApiRequest('/api/auth/login', {
      method: 'POST',
      csrf: true,
      body: { email: signupResult.email, password: signupResult.password, remember: true },
    }));
    const successBody = await success.json();
    assert.equal(success.status, 200, JSON.stringify(successBody));
    assert.equal(successBody.user.id, signupResult.userId);
    assert.equal(successBody.workspace.id, signupResult.workspace.id, 'Login provisioning must return the same workspace.');
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
    const signupResult = await signupViaApp(cleanup, 'recovery', { confirm: true });
    assert.equal(signupResult.response.status, 200, JSON.stringify(signupResult.body));
    assert.ok(signupResult.workspace);
    cleanup.trackWorkspace(signupResult.workspace.id);

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
    assert.equal(newLogin.data.user?.id, signupResult.userId);
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
    await confirmLocalSignup(local, suspended.email, suspended.password, suspended.client);
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
    await confirmLocalSignup(local, missingProfile.email, missingProfile.password, missingProfile.client);
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
