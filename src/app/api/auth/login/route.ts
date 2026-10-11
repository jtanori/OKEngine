import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf } from '@/lib/auth';
import {
  AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
  createRouteSupabaseClient,
  getAuthSessionPersistenceCookieOptions,
} from '@/lib/supabase/server';

export const runtime = 'nodejs';

function authErrorStatus(error: { status?: number }): number {
  return error.status && error.status >= 500 ? 503 : 401;
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: 'Error de validación', details: parsed.error.flatten() }, { status: 422 });
  }

  let applyToResponse = (response: NextResponse) => response;
  try {
    const scopedClient = createRouteSupabaseClient(request, { rememberSession: parsed.data.remember });
    applyToResponse = scopedClient.applyToResponse;
    const { client } = scopedClient;
    const { data, error } = await client.auth.signInWithPassword(parsed.data);
    if (error || !data.user) {
      const status = error ? authErrorStatus(error) : 401;
      const response = NextResponse.json(
        { error: status === 503 ? 'auth_unavailable' : 'unauthorized', message: status === 503 ? 'Autenticación no disponible' : 'Credenciales inválidas' },
        { status }
      );
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    // Do not trust a submitted workspace ID. Provisioning returns the caller's
    // own existing or newly created default workspace under auth.uid().
    const { data: provisioned, error: provisionError } = await client.rpc('provision_initial_workspace');
    if (provisionError) {
      console.error('[auth/login] Workspace provisioning failed', provisionError.message);
      await client.auth.signOut({ scope: 'local' });
      const response = NextResponse.json({ error: 'workspace_unavailable', message: 'No se pudo cargar el espacio de trabajo' }, { status: 503 });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    const workspace = Array.isArray(provisioned) ? provisioned[0] : provisioned;
    if (!workspace?.workspace_id || !workspace?.workspace_slug) {
      await client.auth.signOut({ scope: 'local' });
      const response = NextResponse.json({ error: 'workspace_unavailable', message: 'No se pudo cargar el espacio de trabajo' }, { status: 503 });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    const verified = await client.auth.getUser();
    if (verified.error || !verified.data.user || verified.data.user.id !== data.user.id) {
      await client.auth.signOut({ scope: 'local' });
      const response = NextResponse.json({ error: 'unauthorized', message: 'Credenciales inválidas' }, { status: 401 });
      response.headers.set('Cache-Control', 'no-store');
      return applyToResponse(response);
    }

    const redirectTo = `/workspaces/${encodeURIComponent(workspace.workspace_slug)}/collections`;
    const response = NextResponse.json({
      success: true,
      user: { id: verified.data.user.id, email: verified.data.user.email },
      workspace: { id: workspace.workspace_id, slug: workspace.workspace_slug },
      redirectTo,
    });
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(
      AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
      parsed.data.remember ? '1' : '',
      getAuthSessionPersistenceCookieOptions(parsed.data.remember),
    );
    return applyToResponse(response);
  } catch (error) {
    console.error('[auth/login] Supabase Auth request failed', error instanceof Error ? error.message : 'unknown error');
    const response = NextResponse.json({ error: 'auth_unavailable', message: 'Autenticación no disponible' }, { status: 503 });
    response.headers.set('Cache-Control', 'no-store');
    return applyToResponse(response);
  }
}
