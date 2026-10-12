import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getAuthDataMode } from '../../src/lib/auth';
import { repositories, shouldEnforceFailClosedPersistence, StartupConfigError, validateStartupDataMode } from '../../src/repositories/index';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const ENV_KEYS = ['NODE_ENV', 'VERCEL_ENV', 'OKENG_ENV', 'OKENG_DATA_MODE', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
let originalEnv = new Map<string, string | undefined>();

beforeEach(() => {
  originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
});

afterEach(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('Supabase Auth, RLS, and private Storage integration', () => {
  it('fails startup for production memory mode or missing local Supabase keys', () => {
    assert.throws(
      () => validateStartupDataMode({ OKENG_ENV: 'production', OKENG_DATA_MODE: 'memory' }),
      StartupConfigError,
    );
    process.env.NODE_ENV = 'production';
    process.env.OKENG_ENV = 'development';
    process.env.OKENG_DATA_MODE = 'memory';
    assert.throws(
      () => validateStartupDataMode({ OKENG_ENV: 'development', OKENG_DATA_MODE: 'memory' }),
      StartupConfigError,
      'Production NODE_ENV must override a stale development mode',
    );
    assert.equal(getAuthDataMode(), 'supabase');
    assert.equal(shouldEnforceFailClosedPersistence(), true);
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    assert.throws(
      () => validateStartupDataMode({ OKENG_ENV: 'development', OKENG_DATA_MODE: 'supabase' }),
      StartupConfigError,
    );
    assert.deepEqual(
      validateStartupDataMode({
        OKENG_ENV: 'development',
        OKENG_DATA_MODE: 'supabase',
        SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_ANON_KEY: 'local-public-key',
        SUPABASE_SERVICE_ROLE_KEY: 'local-server-key',
      }),
      { valid: true, env: 'development', dataMode: 'supabase' },
    );
  });

  it('does not let the process-global repository run tenant queries in Supabase mode', async () => {
    process.env.OKENG_ENV = 'development';
    process.env.OKENG_DATA_MODE = 'supabase';
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ANON_KEY = 'local-public-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-server-key';

    await assert.rejects(
      repositories.collections.listByWorkspace('ws_untrusted'),
      (error: unknown) => error instanceof Error && 'code' in error && error.code === 'DATABASE_UNAVAILABLE',
    );
  });

  it('uses Supabase Auth and a recovery session, not the legacy password/token database flow', () => {
    const login = read('src/app/api/auth/login/route.ts');
    const signup = read('src/app/api/auth/signup/route.ts');
    const forgot = read('src/app/api/auth/forgot-password/route.ts');
    const reset = read('src/app/api/auth/reset-password/route.ts');
    const validation = read('src/lib/validation.ts');
    const authApiClient = read('src/services/authApi.ts');
    const loginForm = read('src/components/auth/LoginForm.tsx');
    const signupForm = read('src/components/auth/SignupForm.tsx');
    const forgotForm = read('src/components/auth/ForgotPasswordForm.tsx');
    const resetForm = read('src/components/auth/ResetPasswordForm.tsx');
    const loginPage = read('src/app/(auth)/login/page.tsx');
    const authView = read('src/components/auth/AuthView.tsx');

    assert.match(login, /auth\.signInWithPassword/);
    assert.match(validation, /remember: z\.boolean\(\)\.optional\(\)\.default\(false\)/);
    assert.doesNotMatch(login, /getPool|bcrypt|password_hash/);
    assert.match(signup, /auth\.signUp/);
    assert.match(signup, /provision_initial_workspace/);
    assert.doesNotMatch(signup, /getPool|bcrypt|password_hash/);
    assert.match(forgot, /auth\.resetPasswordForEmail/);
    assert.match(forgot, /\/auth\/callback/);
    assert.doesNotMatch(forgot, /password_reset_tokens|token_hash|Raw token/);
    assert.match(reset, /auth\.getUser/);
    assert.match(reset, /auth\.updateUser\(\{ password:/);
    assert.doesNotMatch(reset, /getPool|password_reset_tokens|bcrypt/);
    assert.match(authApiClient, /credentials: 'same-origin'/);
    assert.match(authApiClient, /'x-csrf-token': csrfToken/);
    assert.match(loginForm, /postAuthApi\('login', \{ email, password, remember \}/);
    assert.match(loginForm, /navigateToAuthPath\(data\.redirectTo/);
    assert.match(loginForm, /searchParams\.get\('authError'\)/);
    assert.match(loginPage, /authRedirectMessage=\{authRedirectMessage\}/);
    assert.match(authView, /LoginForm authRedirectMessage=\{authRedirectMessage\}/);
    assert.match(login, /rememberSession: parsed\.data\.remember/);
    assert.match(login, /AUTH_SESSION_PERSISTENCE_COOKIE_NAME/);
    assert.match(signupForm, /postAuthApi\('signup'/);
    assert.match(signupForm, /navigateToAuthPath\(data\.redirectTo/);
    assert.match(forgotForm, /postAuthApi\('forgotPassword'/);
    assert.match(forgotForm, /if \(!response\.ok\)/);
    assert.match(resetForm, /postAuthApi\('resetPassword'/);
    assert.match(resetForm, /error'\) === 'invalid-link'/);
    assert.doesNotMatch(validation.match(/export const resetPasswordSchema[\s\S]*?;\n\nexport const createCollectionSchema/)?.[0] || '', /token:/);
  });

  it('routes callback-created OAuth users through the Auth UUID and active-membership session path', () => {
    const callback = read('src/app/auth/callback/route.ts');
    const auth = read('src/lib/auth.ts');

    assert.match(callback, /client\.auth\.getUser\(\)/);
    assert.match(callback, /!authData\.user\.email\?\.trim\(\)/);
    assert.match(callback, /rpc\('provision_initial_workspace'\)/);
    assert.match(callback, /await client\.auth\.signOut\(\{ scope: 'local' \}\)/);
    assert.match(callback, /workspace\?\.workspace_slug/);
    assert.doesNotMatch(callback, /raw_user_meta_data[^\n]*role|user_metadata[^\n]*role/);
    assert.match(auth, /\.eq\('auth_user_id', authData\.user\.id\)/);
    assert.match(auth, /\.eq\('status', 'ACTIVE'\)/);
    assert.match(auth, /\.from\('workspace_memberships'\)/);
  });

  it('hydrates only a safe server session and signs out through the Auth endpoint', () => {
    const sessionRoute = read('src/app/api/auth/session/route.ts');
    const authClient = read('src/services/auth.ts');
    const logout = read('src/app/api/auth/logout/route.ts');

    assert.match(sessionRoute, /getAuthDataMode\(\)/);
    assert.match(sessionRoute, /getSessionContext\(request\)/);
    assert.match(sessionRoute, /return applyToResponse\(response\)/);
    assert.doesNotMatch(sessionRoute, /access_token|refresh_token|SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(authClient, /fetch\('\/api\/auth\/session'/);
    assert.match(authClient, /this\.serverAuthMode === 'supabase'\) return this\.serverUser/);
    assert.match(authClient, /fetch\('\/api\/auth\/logout'/);
    assert.match(logout, /auth\.signOut\(\{ scope: 'local' \}\)/);
    assert.match(logout, /__Host-okeng\.sid/);
    assert.match(logout, /AUTH_SESSION_PERSISTENCE_COOKIE_NAME/);
  });

  it('limits anonymous chat to RLS-public collections and rejects invalid custom identities', () => {
    const chat = read('src/app/api/chat/stream/route.ts');
    assert.match(chat, /request\.headers\.has\('authorization'\) \|\| typeof body\.token === 'string'/);
    assert.match(chat, /unsupported_external_identity', 401/);
    assert.match(chat, /let allowedTiers: AccessVisibility\[\] = \['everyone'\]/);
    assert.match(chat, /\.in\('visibility', allowedTiers\)/);
    assert.match(chat, /if \(authCookiePresent && !session\) return errorResponse\('unauthorized', 401, applyToResponse\)/);
    assert.match(chat, /useSupabase && legacySessionCookiePresent.*unsupported_external_identity/);
    assert.match(chat, /const canSeeAdmin = membership\.role === 'WORKSPACE_OWNER'/);
    assert.doesNotMatch(chat, /body\.(role|userId|corpus|collectionIds)/);
    assert.match(chat, /createUserScopedRepositories\(client\)/);
  });

  it('applies collection visibility to every collection-bound RLS policy', () => {
    const migration = read('supabase/migrations/20261011000008_supabase_auth_storage_integration.sql');
    const policy = (name: string) => {
      const start = migration.indexOf(`CREATE POLICY ${name}`);
      assert.notEqual(start, -1, `Expected ${name} to be recreated in the integration migration`);
      const end = migration.indexOf(';', start);
      return migration.slice(start, end + 1);
    };

    assert.match(policy('collections_select_scoped'), /can_read_collection\(workspace_id, id\)/);
    assert.match(policy('documents_select_scoped'), /can_read_collection_content\(workspace_id, collection_id\)/);
    assert.match(policy('document_versions_select_scoped'), /can_read_collection_content\(d\.workspace_id, d\.collection_id\)/);
    assert.match(policy('document_chunks_select_scoped'), /can_read_collection_content\(workspace_id, collection_id\)/);
    assert.match(policy('files_select_scoped'), /can_read_collection_content\(workspace_id, collection_id\)/);
    assert.match(policy('shared_snapshots_select_scoped'), /can_read_collection\(workspace_id, collection_id\)/);
    assert.match(policy('storage_workspace_files_select'), /can_read_collection_content\([\s\S]*?\[2\]/);
    assert.match(migration, /c\.visibility = 'admins'[\s\S]*?public\.is_workspace_owner\(c\.workspace_id\)/);
    assert.doesNotMatch(migration, /c\.visibility = 'admins'[\s\S]{0,200}is_active_platform_admin/);
  });

  it('keeps destructive local-test cleanup behind a loopback/port guard and explicit --local reset', () => {
    const guard = read('scripts/lib/local-supabase-guard.mjs');
    const helper = read('tests/integration/helpers/localSupabase.ts');
    const runner = read('scripts/test-supabase-local.mjs');
    const localSetup = read('scripts/supabase-local.ps1');
    assert.match(guard, /LOOPBACK_HOSTS\.has/);
    assert.match(guard, /export function assertExpectedLocalSupabaseConfig/);
    assert.match(guard, /export function enableLocalEmailConfirmationsForTest/);
    assert.match(runner, /assertExpectedLocalSupabaseConfig/);
    assert.match(runner, /enableLocalEmailConfirmationsForTest/);
    assert.match(runner, /restoreLocalStackDefaults/);
    assert.match(guard, /api\.port === String\(apiPort\)/);
    assert.match(guard, /database\.port === String\(databasePort\)/);
    assert.match(guard, /!database\.search/);
    assert.match(helper, /assertLocalSupabaseTarget\(\{ apiUrl: url, databaseUrl \}\)/);
    assert.match(helper, /OKENG_LOCAL_SUPABASE_RUNNER !== '1'/);
    assert.match(runner, /'db', 'reset', '--local', '--yes', '--no-seed'/);
    assert.match(runner, /tests\/integration\/private-storage\.live\.test\.ts/);
    const preflightIndex = runner.indexOf('assertLocalHarnessReady();');
    const targetGuardIndex = runner.indexOf('makeTestEnvironment(status)');
    const resetIndex = runner.indexOf("run('supabase', ['db', 'reset', '--local', '--yes', '--no-seed'");
    assert.ok(preflightIndex >= 0 && preflightIndex < resetIndex, 'The runner must verify dependencies and every suite file before its destructive reset.');
    assert.ok(targetGuardIndex >= 0 && targetGuardIndex < resetIndex, 'The runner must validate the CLI-reported loopback endpoints before the destructive reset.');
    assert.match(localSetup, /@\('migration', 'up', '--local'\)/);
    assert.match(runner, /never uses a linked\/hosted database/);
  });

  it('does not retry the stack after an unsuccessful test-config startup', () => {
    const runner = read('scripts/test-supabase-local.mjs');
    assert.match(runner, /let testStackStarted = false/);
    assert.match(runner, /const startOutput = startLocalStackWithEmailConfirmation\(\);\s*testStackStarted = true;/);
    assert.match(runner, /if \(testStackStarted\) \{[\s\S]*?restoreLocalStackDefaults\(\);[\s\S]*?\} else \{[\s\S]*?no automatic second start will be attempted/i);
  });

  it('maps new Auth users only by Auth UUID and provisions workspaces using auth.uid()', () => {
    const migration = read('supabase/migrations/20261011000008_supabase_auth_storage_integration.sql');
    assert.match(migration, /auth_user_id UUID/);
    assert.match(migration, /FOREIGN KEY \(auth_user_id\) REFERENCES auth\.users\(id\)/);
    assert.match(migration, /ON CONFLICT \(auth_user_id\) DO UPDATE/);
    assert.doesNotMatch(migration, /ON CONFLICT \(email\)/);
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.provision_initial_workspace\(\)/);
    assert.match(migration, /v_auth_user_id UUID := auth\.uid\(\)/);
    assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.provision_initial_workspace\(\) TO authenticated/);
    assert.match(migration, /REVOKE ALL ON FUNCTION public\.provision_initial_workspace\(\) FROM PUBLIC, anon/);
    assert.match(migration, /INSERT INTO public\.collections[\s\S]*?'Knowledge Base'[\s\S]*?'members'/);
  });

  it('keeps Supabase users out of demo-backed dashboard state and loads tenant data through RLS', () => {
    const layout = read('src/app/(workspace)/workspaces/[workspaceSlug]/layout.tsx');
    const appShell = read('src/components/AppShell.tsx');
    const overviewRoute = read('src/app/api/workspaces/[workspaceSlug]/overview/route.ts');
    const overviewUi = read('src/components/SupabaseWorkspaceOverview.tsx');
    const workspaceAuth = read('src/lib/workspaceAuth.ts');

    assert.match(layout, /if \(authService\.isSupabaseSessionMode\(\)\)[\s\S]*?<SupabaseWorkspaceOverview/);
    assert.match(layout, /legacy localStorage[\s\S]*?dashboard/);
    assert.match(appShell, /isSupabaseMode \? undefined : store\.getCollections\(\)\.length/);
    assert.match(overviewRoute, /createRouteSupabaseClient\(request\)/);
    assert.match(overviewRoute, /\.eq\('workspace_id', workspace\.id\)/);
    assert.match(overviewRoute, /workspace\.id !== session\.workspaceId/);
    assert.doesNotMatch(overviewRoute, /SERVICE_ROLE_KEY|getSystemPrivilegedSupabaseClient/);
    assert.match(overviewUi, /api\/workspaces\/\$\{encodeURIComponent\(workspaceSlug\)\}\/overview/);
    assert.match(overviewUi, /private upload|upload privately/i);
    assert.doesNotMatch(overviewUi, /services\/store/);
    assert.match(workspaceAuth, /membership\.role !== 'WORKSPACE_OWNER'/);
    assert.doesNotMatch(workspaceAuth, /session\.role === 'super_admin'/);
  });

  it('requires private Storage objects to have pending metadata and authenticated upload ownership', () => {
    const migration = read('supabase/migrations/20261011000008_supabase_auth_storage_integration.sql');
    const storageMigration = read('supabase/migrations/20261003000002_okeng_rls_and_storage.sql');
    const uploadRoute = read('src/app/api/workspaces/[workspaceSlug]/files/route.ts');
    const downloadRoute = read('src/app/api/workspaces/[workspaceSlug]/files/[fileId]/route.ts');
    const routeDeletion = downloadRoute.slice(downloadRoute.indexOf('export async function DELETE'));
    const routeCleanup = uploadRoute.slice(uploadRoute.indexOf('async function cleanupPendingUpload'));
    const completeStart = migration.indexOf('CREATE OR REPLACE FUNCTION public.complete_file_upload');
    const abortStart = migration.indexOf('CREATE OR REPLACE FUNCTION public.abort_file_upload');
    const functionsEnd = migration.indexOf('-- These SECURITY DEFINER functions', abortStart);
    const completeUpload = migration.slice(completeStart, abortStart);
    const abortUpload = migration.slice(abortStart, functionsEnd);

    assert.match(storageMigration, /'workspace-files',[\s\S]*?false,[\s\S]*?10485760/);
    assert.match(migration, /upload_status = 'pending_upload'[\s\S]*?uploaded_by = auth\.uid\(\)::TEXT/);
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.complete_file_upload/);
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.abort_file_upload/);
    assert.match(completeUpload, /can_write_collection_content\(v_workspace_id, v_collection_id\)/);
    assert.match(abortUpload, /can_write_collection_content\(v_workspace_id, v_collection_id\)/);
    assert.match(migration, /DROP POLICY IF EXISTS storage_workspace_member_access ON storage\.objects/);
    assert.match(migration, /REVOKE ALL ON FUNCTION public\.complete_file_upload\(TEXT, TEXT\) FROM PUBLIC, anon/);
    assert.match(migration, /REVOKE ALL ON FUNCTION public\.abort_file_upload\(TEXT, TEXT\) FROM PUBLIC, anon/);
    assert.match(uploadRoute, /client\.storage\.from\(BUCKET\)\.upload/);
    assert.match(uploadRoute, /parseMultipartWithinLimit/);
    assert.match(uploadRoute, /MAX_PRIVATE_MULTIPART_BYTES/);
    assert.match(uploadRoute, /complete_file_upload/);
    assert.match(downloadRoute, /createSignedUrl\([^,]+, 60/);
    assert.match(routeDeletion, /storage\.from\(BUCKET\)\.remove/);
    assert.match(routeDeletion, /String\(storageError\.statusCode\) !== '404'/);
    assert.match(routeDeletion, /\.from\('files'\)[\s\S]*?\.delete\(\)/);
    assert.ok(routeCleanup.indexOf("storage.from(BUCKET).remove") < routeCleanup.indexOf("rpc('abort_file_upload'"));
    assert.match(migration, /IF v_upload_status = 'ready' THEN\s+RETURN TRUE/);
    assert.match(migration, /SET upload_status = 'orphaned'/);
  });
});
