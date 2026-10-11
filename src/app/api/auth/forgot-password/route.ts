import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf } from '@/lib/auth';
import { createRouteSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
const GENERIC_RESPONSE = { success: true, message: 'Si el correo existe, recibirás un enlace' };

function getRecoveryCallbackUrl(request: NextRequest): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl && process.env.NODE_ENV === 'production') return null;

  try {
    const base = new URL(configuredUrl || request.nextUrl.origin);
    if (process.env.NODE_ENV === 'production' && base.protocol !== 'https:') return null;
    const callback = new URL('/auth/callback', base);
    callback.searchParams.set('next', '/reset-password');
    return callback.toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, 'AUTH');
  if (!rl.success) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', message: `Demasiados intentos, intenta en ${rl.retryAfter}s`, retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  if (!validateCsrf(request)) {
    return NextResponse.json({ error: 'csrf_invalid', message: 'Invalid CSRF token' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(GENERIC_RESPONSE, { status: 200 });

  const redirectTo = getRecoveryCallbackUrl(request);
  if (!redirectTo) return NextResponse.json(GENERIC_RESPONSE, { status: 200 });

  let applyToResponse = (response: NextResponse) => response;
  try {
    const scopedClient = createRouteSupabaseClient(request);
    applyToResponse = scopedClient.applyToResponse;
    const { error } = await scopedClient.client.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
    // Keep the response identical for existing and missing accounts. Operational
    // errors are recorded without email addresses or recovery tokens.
    if (error) console.warn('[auth/forgot-password] Supabase recovery request failed', error.status || 'unknown');
  } catch (error) {
    console.warn('[auth/forgot-password] Recovery service unavailable', error instanceof Error ? error.message : 'unknown error');
  }

  const response = NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  response.headers.set('Cache-Control', 'no-store');
  return applyToResponse(response);
}
