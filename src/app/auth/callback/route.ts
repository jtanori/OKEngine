import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createRouteSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
const ALLOWED_OTP_TYPES = new Set<EmailOtpType>(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']);

function getSafeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try {
    const target = new URL(value, 'https://okengine.invalid');
    if (target.origin !== 'https://okengine.invalid') return '/';
    return `${target.pathname}${target.search}`;
  } catch {
    return '/';
  }
}

function redirectWithClient(
  request: NextRequest,
  path: string,
  applyToResponse: (response: NextResponse) => NextResponse
): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin));
  response.headers.set('Cache-Control', 'no-store');
  return applyToResponse(response);
}

export async function GET(request: NextRequest) {
  let applyToResponse = (response: NextResponse) => response;
  const next = getSafeNext(request.nextUrl.searchParams.get('next'));

  try {
    const scopedClient = createRouteSupabaseClient(request);
    applyToResponse = scopedClient.applyToResponse;
    const { client } = scopedClient;
    const tokenHash = request.nextUrl.searchParams.get('token_hash');
    const otpType = request.nextUrl.searchParams.get('type') as EmailOtpType | null;
    const code = request.nextUrl.searchParams.get('code');

    let error: Error | null = null;
    if (tokenHash && otpType && ALLOWED_OTP_TYPES.has(otpType)) {
      ({ error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: otpType }));
    } else if (code) {
      ({ error } = await client.auth.exchangeCodeForSession(code));
    } else {
      error = new Error('Missing or invalid authentication callback parameters');
    }

    if (error) {
      const destination = next === '/reset-password' ? '/reset-password?error=invalid-link' : '/login?authError=callback';
      return redirectWithClient(request, destination, applyToResponse);
    }

    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      return redirectWithClient(request, '/login?authError=callback', applyToResponse);
    }

    // Recovery callbacks need only establish the recovery session; the password
    // update is a separate authenticated API request with CSRF protection.
    if (next === '/reset-password') {
      return redirectWithClient(request, next, applyToResponse);
    }

    // The application profile/workspace model requires an email. In particular,
    // a provider with no usable email must not receive a partial Auth session.
    if (!authData.user.email?.trim()) {
      await client.auth.signOut({ scope: 'local' });
      return redirectWithClient(request, '/login?authError=callback', applyToResponse);
    }

    const { data: provisioned, error: provisionError } = await client.rpc('provision_initial_workspace');
    const workspace = Array.isArray(provisioned) ? provisioned[0] : provisioned;
    if (provisionError || !workspace?.workspace_slug) {
      console.error('[auth/callback] Workspace provisioning failed', provisionError?.message || 'missing workspace');
      await client.auth.signOut({ scope: 'local' });
      return redirectWithClient(request, '/login?authError=workspace', applyToResponse);
    }

    const workspacePath = `/workspaces/${encodeURIComponent(workspace.workspace_slug)}/collections`;
    return redirectWithClient(request, workspacePath, applyToResponse);
  } catch (error) {
    console.error('[auth/callback] Supabase Auth callback failed', error instanceof Error ? error.message : 'unknown error');
    return redirectWithClient(
      request,
      next === '/reset-password' ? '/reset-password?error=invalid-link' : '/login?authError=callback',
      applyToResponse
    );
  }
}
