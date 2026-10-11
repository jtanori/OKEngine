import type { CookieOptions } from '@supabase/ssr';

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
