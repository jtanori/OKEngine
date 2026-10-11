import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';
import {
  AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
  getSupabaseAuthCookieOptions,
} from './cookies';
export {
  AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
  getAuthSessionPersistenceCookieOptions,
  getSupabaseAuthCookieOptions,
  SUPABASE_AUTH_COOKIE_NAME,
  SUPABASE_AUTH_COOKIE_OPTIONS,
} from './cookies';

export type SystemPrivilegedOperationId =
  | 'SRV-PRIV-01_SECURITY_AUDIT_LOG_APPEND'
  | 'SRV-PRIV-02_USAGE_EVENT_APPEND'
  | 'SRV-PRIV-03_VERIFIED_EMBED_CORPUS_READ'
  | 'SRV-PRIV-04_AUTH_USER_PROFILE_LOOKUP';

const ALLOWED_PRIVILEGED_OPERATIONS = new Set<SystemPrivilegedOperationId>([
  'SRV-PRIV-01_SECURITY_AUDIT_LOG_APPEND',
  'SRV-PRIV-02_USAGE_EVENT_APPEND',
  'SRV-PRIV-03_VERIFIED_EMBED_CORPUS_READ',
  'SRV-PRIV-04_AUTH_USER_PROFILE_LOOKUP',
]);

export interface PendingSupabaseCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

export interface RouteSupabaseClient {
  client: SupabaseClient;
  applyToResponse(response: NextResponse): NextResponse;
}

export interface RouteSupabaseClientOptions {
  /** Override the incoming remember-me preference for the initial login exchange. */
  rememberSession?: boolean;
}

let cachedServiceRoleClient: SupabaseClient | null = null;

function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
}

function getPublicKey(): string | undefined {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getPublicKey());
}

export function isSupabasePrivilegedConfigured(): boolean {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Creates a fresh Supabase SSR client for one incoming request. It reads only
 * the HttpOnly Auth cookies and queues cookie/header updates for the response.
 * Never cache this client across requests: its access token is user-specific.
 */
export function createRouteSupabaseClient(
  request: NextRequest,
  options: RouteSupabaseClientOptions = {},
): RouteSupabaseClient {
  const url = getSupabaseUrl();
  const publicKey = getPublicKey();
  if (!url || !publicKey) {
    throw new Error('Supabase URL and public anon/publishable key are required.');
  }

  const rememberSession = options.rememberSession
    ?? request.cookies.get(AUTH_SESSION_PERSISTENCE_COOKIE_NAME)?.value === '1';
  const pendingCookies: PendingSupabaseCookie[] = [];
  const pendingHeaders = new Map<string, string>();
  const client = createServerClient(url, publicKey, {
    cookieOptions: getSupabaseAuthCookieOptions(rememberSession),
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        pendingCookies.push(...cookiesToSet);
        for (const [name, value] of Object.entries(headers)) pendingHeaders.set(name, value);
      },
    },
  });

  return {
    client,
    applyToResponse(response) {
      for (const cookie of pendingCookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      for (const [name, value] of pendingHeaders) response.headers.set(name, value);
      return response;
    },
  };
}

/**
 * A request-scoped client for tenant operations. Call auth.getUser() and
 * authorize the requested workspace before using it; its signed-in JWT is what
 * makes auth.uid() and Postgres RLS work. This function never falls back to a
 * service-role key.
 */
export function createUserScopedSupabaseClient(request: NextRequest): SupabaseClient {
  return createRouteSupabaseClient(request).client;
}

/**
 * Service-role access is restricted to the audited system repository. It must
 * never be used for a user-facing query or as a fallback for the anon client.
 */
export function getSystemPrivilegedSupabaseClient(
  operationId: SystemPrivilegedOperationId
): SupabaseClient | null {
  if (!ALLOWED_PRIVILEGED_OPERATIONS.has(operationId)) {
    throw new Error(`FORBIDDEN_SERVICE_ROLE_OPERATION: ${String(operationId)}`);
  }

  if (cachedServiceRoleClient) return cachedServiceRoleClient;

  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  cachedServiceRoleClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cachedServiceRoleClient;
}
