import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf } from '@/lib/auth';
import { createRouteSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function getAuthCallbackUrl(request: NextRequest): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl && process.env.NODE_ENV === 'production') return null;

  try {
    const base = new URL(configuredUrl || request.nextUrl.origin);
    if (process.env.NODE_ENV === 'production' && base.protocol !== 'https:') return null;
    const callback = new URL('/auth/callback', base);
    callback.searchParams.set('next', '/login?confirmed=1');
    return callback.toString();
  } catch {
    return null;
  }
}

function authErrorStatus(error: { status?: number }): number {
  return error.status && error.status >= 500 ? 503 : 400;
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
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: 'Error de validación', details: parsed.error.flatten() }, { status: 422 });
  }

  const emailRedirectTo = getAuthCallbackUrl(request);
  if (!emailRedirectTo) {
    return NextResponse.json({ error: 'auth_configuration_error', message: 'La configuración de autenticación no está disponible' }, { status: 503 });
  }

  let applyToResponse = (response: NextResponse) => response;
  try {
    const scopedClient = createRouteSupabaseClient(request);
    applyToResponse = scopedClient.applyToResponse;
    const { client } = scopedClient;
    const { name, email, password } = parsed.data;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { name, full_name: name },
      },
    });

    if (error || !data.user) {
      const status = error ? authErrorStatus(error) : 400;
      const response = NextResponse.json({
        error: status === 503 ? 'auth_unavailable' : 'signup_failed',
        message: status === 503 ? 'Autenticación no disponible' : 'No se pudo crear la cuenta',
      }, { status });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    if (!data.session) {
      // Email confirmation is enabled in hosted environments. Never create a
      // parallel local password/session for this pending Auth identity.
      const response = NextResponse.json({
        success: true,
        confirmationRequired: true,
        message: 'Revisa tu correo para confirmar tu cuenta.',
        redirectTo: '/login?confirmed=1',
      });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    const { data: provisioned, error: provisionError } = await client.rpc('provision_initial_workspace');
    if (provisionError) {
      console.error('[auth/signup] Workspace provisioning failed', provisionError.message);
      await client.auth.signOut({ scope: 'local' });
      const response = NextResponse.json({ error: 'workspace_unavailable', message: 'No se pudo crear el espacio de trabajo' }, { status: 503 });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    const workspace = Array.isArray(provisioned) ? provisioned[0] : provisioned;
    if (!workspace?.workspace_id || !workspace?.workspace_slug) {
      await client.auth.signOut({ scope: 'local' });
      const response = NextResponse.json({ error: 'workspace_unavailable', message: 'No se pudo crear el espacio de trabajo' }, { status: 503 });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    const verified = await client.auth.getUser();
    if (verified.error || !verified.data.user || verified.data.user.id !== data.user.id) {
      await client.auth.signOut({ scope: 'local' });
      const response = NextResponse.json({ error: 'auth_verification_failed', message: 'No se pudo completar el registro' }, { status: 503 });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    const redirectTo = `/workspaces/${encodeURIComponent(workspace.workspace_slug)}/collections`;
    const response = NextResponse.json({
      success: true,
      confirmationRequired: false,
      user: { id: verified.data.user.id, email: verified.data.user.email },
      workspace: { id: workspace.workspace_id, slug: workspace.workspace_slug },
      redirectTo,
    });
    response.headers.set('Cache-Control', 'no-store');
    return applyToResponse(response);
  } catch (error) {
    console.error('[auth/signup] Supabase Auth request failed', error instanceof Error ? error.message : 'unknown error');
    const response = NextResponse.json({ error: 'auth_unavailable', message: 'Autenticación no disponible' }, { status: 503 });
    response.headers.set('Cache-Control', 'no-store');
    return applyToResponse(response);
  }
}
