import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf } from '@/lib/auth';
import { createRouteSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (process.env.OKENG_ENABLE_PASSWORD_RESET === 'false') {
    return NextResponse.json({ error: 'not_implemented', message: 'Password reset is disabled by configuration' }, { status: 501 });
  }

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
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: 'Error de validación', details: parsed.error.flatten() }, { status: 422 });
  }

  let applyToResponse = (response: NextResponse) => response;
  try {
    const scopedClient = createRouteSupabaseClient(request);
    applyToResponse = scopedClient.applyToResponse;
    const { client } = scopedClient;
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      const response = NextResponse.json({ error: 'unauthorized', message: 'El enlace de restablecimiento es inválido o expiró' }, { status: 401 });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    const { error: updateError } = await client.auth.updateUser({ password: parsed.data.newPassword });
    if (updateError) {
      const status = updateError.status && updateError.status >= 500 ? 503 : 400;
      const response = NextResponse.json({
        error: status === 503 ? 'auth_unavailable' : 'password_update_failed',
        message: status === 503 ? 'Autenticación no disponible' : 'No se pudo actualizar la contraseña',
      }, { status });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    const response = NextResponse.json({ success: true, message: 'Contraseña restablecida' });
    response.headers.set('Cache-Control', 'no-store');
    return applyToResponse(response);
  } catch (error) {
    console.error('[auth/reset-password] Supabase Auth request failed', error instanceof Error ? error.message : 'unknown error');
    const response = NextResponse.json({ error: 'auth_unavailable', message: 'Autenticación no disponible' }, { status: 503 });
    response.headers.set('Cache-Control', 'no-store');
    return applyToResponse(response);
  }
}
