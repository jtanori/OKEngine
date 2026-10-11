import { NextRequest, NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/auth';
import {
  AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
  createRouteSupabaseClient,
  getAuthSessionPersistenceCookieOptions,
  SUPABASE_AUTH_COOKIE_NAME,
  SUPABASE_AUTH_COOKIE_OPTIONS,
} from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) {
    return NextResponse.json({ error: 'csrf_invalid', message: 'Invalid CSRF token' }, { status: 403 });
  }

  let applyToResponse = (response: NextResponse) => response;
  try {
    const scopedClient = createRouteSupabaseClient(request);
    applyToResponse = scopedClient.applyToResponse;
    const { error } = await scopedClient.client.auth.signOut({ scope: 'local' });
    if (error && error.status !== 401) console.warn('[auth/logout] Supabase sign-out failed', error.status || 'unknown');
  } catch (error) {
    console.warn('[auth/logout] Supabase sign-out unavailable', error instanceof Error ? error.message : 'unknown error');
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SUPABASE_AUTH_COOKIE_NAME, '', { ...SUPABASE_AUTH_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set('okeng.sid', '', { httpOnly: true, sameSite: 'strict', maxAge: 0, path: '/' });
  response.cookies.set('__Host-okeng.sid', '', { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 0, path: '/' });
  response.cookies.set('okeng.csrf', '', { httpOnly: false, sameSite: 'strict', maxAge: 0, path: '/' });
  response.cookies.set('__Host-okeng.csrf', '', { httpOnly: false, secure: true, sameSite: 'strict', maxAge: 0, path: '/' });
  response.cookies.set(
    AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
    '',
    getAuthSessionPersistenceCookieOptions(false),
  );
  response.headers.set('Cache-Control', 'no-store');
  return applyToResponse(response);
}
