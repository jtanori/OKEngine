import type { CookieOptions } from '@supabase/ssr';
import type { NextResponse } from 'next/server';

export const SUPABASE_AUTH_COOKIE_NAME = 'okeng-auth';
export const AUTH_SESSION_PERSISTENCE_COOKIE_NAME = 'okeng.remember';
export const AUTH_SESSION_PERSISTENCE_MAX_AGE = 60 * 60 * 24 * 30;

export const SUPABASE_AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export function getSupabaseAuthCookieOptions(rememberSession = false) {
  return {
    name: SUPABASE_AUTH_COOKIE_NAME,
    ...SUPABASE_AUTH_COOKIE_OPTIONS,
    ...(rememberSession ? { maxAge: AUTH_SESSION_PERSISTENCE_MAX_AGE } : {}),
  };
}

export function getAuthSessionPersistenceCookieOptions(rememberSession: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: rememberSession ? AUTH_SESSION_PERSISTENCE_MAX_AGE : 0,
  };
}

/**
 * @supabase/ssr currently overwrites configured cookie maxAge with its
 * 400-day default when writing server cookies. Restore OKEngine's explicit
 * browser-session / 30-day remember-me policy at the response boundary.
 * Preserve zero-age deletions so sign-out is never turned into a live cookie.
 */
export function normalizeSupabaseAuthCookieOptions(
  options: CookieOptions,
  rememberSession: boolean,
): CookieOptions {
  const normalized = { ...options };
  if (normalized.maxAge === 0) return normalized;

  // A stale absolute expiry from an adapter must not defeat the maxAge policy.
  delete normalized.expires;
  if (rememberSession) normalized.maxAge = AUTH_SESSION_PERSISTENCE_MAX_AGE;
  else delete normalized.maxAge;
  return normalized;
}

/**
 * Expire the session cookie and every chunk already queued on a response.
 * Call this after applying Supabase's pending writes on fail-closed auth paths,
 * so an earlier successful sign-in write cannot win over sign-out cleanup.
 */
export function clearSupabaseAuthSessionCookies(response: NextResponse): NextResponse {
  const authCookieNames = new Set(
    response.cookies.getAll()
      .map(({ name }) => name)
      .filter((name) => name === SUPABASE_AUTH_COOKIE_NAME || name.startsWith(`${SUPABASE_AUTH_COOKIE_NAME}.`)),
  );
  authCookieNames.add(SUPABASE_AUTH_COOKIE_NAME);

  for (const name of authCookieNames) {
    response.cookies.set(name, '', { ...SUPABASE_AUTH_COOKIE_OPTIONS, maxAge: 0 });
  }
  return response;
}
