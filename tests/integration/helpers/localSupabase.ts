import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextRequest, type NextResponse } from 'next/server';
import { assertLocalSupabaseTarget } from '../../../scripts/lib/local-supabase-guard.mjs';

export const LOCAL_APP_ORIGIN = 'http://localhost:3000';
export const PRIVATE_FILE_BUCKET = 'workspace-files';
const AUTH_COOKIE_NAME = 'okeng-auth';
const COOKIE_CHUNK_SIZE = 3180;

export interface LocalSupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseUrl: string;
}

export interface CookieValue {
  name: string;
  value: string;
  maxAge?: number;
}

export interface LocalCleanup {
  admin: SupabaseClient;
  userIds: string[];
  workspaceIds: string[];
  storagePaths: string[];
  trackUser(userId: string): void;
  trackWorkspace(workspaceId: string): void;
  trackStoragePath(storagePath: string): void;
  cleanup(): Promise<void>;
}

export function requireLocalSupabase(): LocalSupabaseConfig {
  if (process.env.OKENG_RUN_SUPABASE_INTEGRATION !== '1' || process.env.OKENG_LOCAL_SUPABASE_RUNNER !== '1') {
    throw new Error(
      '[NOT RUN] Local Supabase tests require the guarded runner. Use `npm run test:auth-local`; this suite never skips or falls back to mocks.',
    );
  }

  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const databaseUrl = process.env.DATABASE_URL || '';
  assertLocalSupabaseTarget({ apiUrl: url, databaseUrl });
  assert.ok(anonKey, 'Local supabase status did not provide a public anon/publishable key. Run `supabase status -o env` and repair the local stack.');
  assert.ok(serviceRoleKey, 'Local supabase status did not provide a server service-role/secret key. Never substitute a hosted key.');

  return { url, anonKey, serviceRoleKey, databaseUrl };
}

export function makeSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createLocalCleanup(config: LocalSupabaseConfig): LocalCleanup {
  const state: LocalCleanup = {
    admin: makeSupabaseClient(config.url, config.serviceRoleKey),
    userIds: [],
    workspaceIds: [],
    storagePaths: [],
    trackUser(userId) {
      if (!state.userIds.includes(userId)) state.userIds.push(userId);
    },
    trackWorkspace(workspaceId) {
      if (!state.workspaceIds.includes(workspaceId)) state.workspaceIds.push(workspaceId);
    },
    trackStoragePath(storagePath) {
      if (!state.storagePaths.includes(storagePath)) state.storagePaths.push(storagePath);
    },
    async cleanup() {
      // Revalidate immediately before using the local service-role and postgres
      // credentials for destructive fixture teardown.
      assertLocalSupabaseTarget({ apiUrl: config.url, databaseUrl: config.databaseUrl });
      for (const storagePath of state.storagePaths) {
        await state.admin.storage.from(PRIVATE_FILE_BUCKET).remove([storagePath]).catch(() => undefined);
      }
      for (const userId of state.userIds) {
        await state.admin.auth.admin.deleteUser(userId).catch(() => undefined);
      }

      const database = new Client({ connectionString: config.databaseUrl, connectionTimeoutMillis: 5000 });
      try {
        await database.connect();
        await database.query('BEGIN');
        try {
          if (state.workspaceIds.length > 0) {
            // This is a per-test local database cleanup only. Temporarily disable
            // the last-owner trigger so deleting complete test tenants can
            // cascade through their owner memberships.
            await database.query('ALTER TABLE public.workspace_memberships DISABLE TRIGGER trg_protect_last_workspace_owner');
            await database.query('DELETE FROM public.workspaces WHERE id = ANY($1::text[])', [state.workspaceIds]);
            await database.query('ALTER TABLE public.workspace_memberships ENABLE TRIGGER trg_protect_last_workspace_owner');
          }
          if (state.userIds.length > 0) {
            await database.query('DELETE FROM public.users WHERE id = ANY($1::text[])', [state.userIds]);
          }
          await database.query('COMMIT');
        } catch (error) {
          await database.query('ROLLBACK').catch(() => undefined);
          throw error;
        }
      } finally {
        await database.end().catch(() => undefined);
      }
    },
  };
  return state;
}

export interface LocalIdentity {
  client: SupabaseClient;
  user: User;
  email: string;
  password: string;
}

export async function generateLocalSignupToken(config: LocalSupabaseConfig, email: string, password: string): Promise<string> {
  const admin = makeSupabaseClient(config.url, config.serviceRoleKey);
  const { data, error } = await admin.auth.admin.generateLink({ type: 'signup', email, password });
  assert.equal(error, null, error?.message || 'Local Auth Admin could not generate an email confirmation link.');
  assert.ok(data.properties.hashed_token, 'Local Auth Admin did not return the one-time signup token hash.');
  return data.properties.hashed_token;
}

export async function confirmLocalSignup(
  config: LocalSupabaseConfig,
  email: string,
  password: string,
  client = makeSupabaseClient(config.url, config.anonKey),
): Promise<User> {
  const tokenHash = await generateLocalSignupToken(config, email, password);
  const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'signup' });
  assert.equal(error, null, error?.message || 'Local Auth email confirmation failed.');
  assert.ok(data.user, 'A successful local email confirmation must return the Auth UUID.');
  assert.ok(data.session, 'A successful local email confirmation must issue a real Auth session.');
  return data.user;
}

export async function createLocalIdentity(
  config: LocalSupabaseConfig,
  cleanup: LocalCleanup,
  label = 'local',
): Promise<LocalIdentity> {
  const client = makeSupabaseClient(config.url, config.anonKey);
  const email = `okeng-${label}-${randomUUID()}@example.com`;
  const password = `Local-Test-${randomUUID()}-9!`;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name: `Local Test ${label}` } },
  });
  if (data.user) cleanup.trackUser(data.user.id);
  assert.equal(error, null, error?.message || 'Local Auth signup failed; check `supabase status` and migrations.');
  assert.ok(data.user, 'Local Auth signup must return an Auth UUID.');
  assert.equal(data.session, null, 'The local integration runner must require real email confirmation before issuing a session.');
  return { client, user: data.user, email, password };
}

let testIpCounter = 1;
export function nextTestIp(): string {
  const octet = ((testIpCounter++ - 1) % 253) + 1;
  return `198.51.100.${octet}`;
}

export interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  cookies?: CookieValue[];
  csrf?: boolean;
  headers?: HeadersInit;
}

export function makeApiRequest(path: string, options: ApiRequestOptions = {}): NextRequest {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers);
  headers.set('x-real-ip', nextTestIp());
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  const request = new NextRequest(new URL(path, LOCAL_APP_ORIGIN), {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  for (const cookie of options.cookies || []) request.cookies.set(cookie.name, cookie.value);
  if (options.csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    request.cookies.set('okeng.csrf', 'local-integration-csrf');
    request.headers.set('x-csrf-token', 'local-integration-csrf');
  }
  return request;
}

export function getResponseCookies(response: NextResponse): CookieValue[] {
  return response.cookies.getAll().map(({ name, value }) => ({ name, value }));
}

export function mergeResponseCookies(previous: CookieValue[], response: NextResponse): CookieValue[] {
  const next = new Map(previous.map(({ name, value }) => [name, value]));
  for (const cookie of response.cookies.getAll()) {
    if (cookie.maxAge === 0 || cookie.value === '') next.delete(cookie.name);
    else next.set(cookie.name, cookie.value);
  }
  return [...next].map(([name, value]) => ({ name, value }));
}

function authCookieParts(cookies: CookieValue[]): CookieValue[] {
  return cookies.filter(({ name }) => name === AUTH_COOKIE_NAME || name.startsWith(`${AUTH_COOKIE_NAME}.`));
}

export function readAuthSessionCookie(cookies: CookieValue[]): Record<string, any> {
  const authCookies = authCookieParts(cookies);
  assert.ok(authCookies.length > 0, 'Expected an HttpOnly Supabase Auth session cookie (okeng-auth).');
  const primary = authCookies.find(({ name }) => name === AUTH_COOKIE_NAME);
  const chunks = primary
    ? [primary]
    : authCookies.sort((left, right) => Number(left.name.slice(AUTH_COOKIE_NAME.length + 1)) - Number(right.name.slice(AUTH_COOKIE_NAME.length + 1)));
  const encoded = chunks.map(({ value }) => value).join('');
  assert.ok(encoded.startsWith('base64-'), 'Expected @supabase/ssr to encode the session cookie with its base64- prefix.');
  try {
    const decoded = Buffer.from(encoded.slice('base64-'.length), 'base64url').toString('utf8');
    return JSON.parse(decoded) as Record<string, any>;
  } catch {
    assert.fail('The local Auth cookie did not contain a valid base64url-encoded JSON session.');
  }
}

export function replaceAuthSessionCookie(
  cookies: CookieValue[],
  session: Record<string, any>,
): CookieValue[] {
  const remaining = cookies.filter(({ name }) => name !== AUTH_COOKIE_NAME && !name.startsWith(`${AUTH_COOKIE_NAME}.`));
  const encoded = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  const chunks: CookieValue[] = [];
  for (let offset = 0, index = 0; offset < encoded.length; offset += COOKIE_CHUNK_SIZE, index++) {
    const name = encoded.length <= COOKIE_CHUNK_SIZE ? AUTH_COOKIE_NAME : `${AUTH_COOKIE_NAME}.${index}`;
    chunks.push({ name, value: encoded.slice(offset, offset + COOKIE_CHUNK_SIZE) });
  }
  return [...remaining, ...chunks];
}

export async function countById(
  client: SupabaseClient,
  table: string,
  column: string,
  value: string,
): Promise<number> {
  const { count, error } = await client.from(table).select(column, { count: 'exact', head: true }).eq(column, value);
  assert.equal(error, null, error?.message || `Could not count ${table}.${column} in local Supabase.`);
  return count || 0;
}

export async function queryLocalDatabase<T = any>(
  config: LocalSupabaseConfig,
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  assertLocalSupabaseTarget({ apiUrl: config.url, databaseUrl: config.databaseUrl });
  const database = new Client({ connectionString: config.databaseUrl, connectionTimeoutMillis: 5000 });
  try {
    await database.connect();
    const result = await database.query(text, values);
    return result.rows as T[];
  } finally {
    await database.end().catch(() => undefined);
  }
}
