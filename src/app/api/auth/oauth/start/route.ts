import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf } from '@/lib/auth';
import { oauthStartSchema } from '@/lib/validation';
import {
  AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
  createRouteSupabaseClient,
  getAuthSessionPersistenceCookieOptions,
} from '@/lib/supabase/server';
import { isOAuthProviderConfigured, type OAuthProvider } from '@/lib/supabase/oauthProviders';
import type { RouteSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export interface OAuthStartDependencies {
  rateLimit: typeof rateLimit;
  validateCsrf: typeof validateCsrf;
  createRouteSupabaseClient: typeof createRouteSupabaseClient;
  isOAuthProviderConfigured: typeof isOAuthProviderConfigured;
}

function getCallbackUrl(): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) return null;

  try {
    const base = new URL(configuredUrl);
    const isLoopbackHost = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    if (base.username || base.password || base.search || base.hash) return null;
    if (base.protocol !== 'https:' && !(base.protocol === 'http:' && isLoopbackHost)) return null;
    if (process.env.NODE_ENV === 'production' && base.protocol !== 'https:') return null;
    return new URL('/auth/callback', base).toString();
  } catch {
    return null;
  }
}

/** Supabase may only redirect the browser to the configured Auth authorize endpoint. */
export function isSupabaseAuthorizationUrl(
  value: string,
  configuredSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
): boolean {
  if (!configuredSupabaseUrl) return false;

  try {
    const authorizationUrl = new URL(value);
    const supabaseUrl = new URL(configuredSupabaseUrl);
    return authorizationUrl.origin === supabaseUrl.origin
      && authorizationUrl.pathname === '/auth/v1/authorize'
      && (authorizationUrl.protocol === 'https:' || authorizationUrl.hostname === '127.0.0.1' || authorizationUrl.hostname === 'localhost' || authorizationUrl.hostname === '[::1]');
  } catch {
    return false;
  }
}

export function createOAuthStartHandler(
  overrides: Partial<OAuthStartDependencies> = {},
): (request: NextRequest) => Promise<NextResponse> {
  const dependencies: OAuthStartDependencies = {
    rateLimit,
    validateCsrf,
    createRouteSupabaseClient,
    isOAuthProviderConfigured,
    ...overrides,
  };

  return async function POST(request: NextRequest) {
    const rl = await dependencies.rateLimit(request, 'AUTH');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'rate_limit_exceeded', message: 'Too many authentication attempts', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter), 'Cache-Control': 'no-store' } },
      );
    }

    if (!dependencies.validateCsrf(request)) {
      return NextResponse.json(
        { error: 'csrf_invalid', message: 'Invalid CSRF token' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'bad_request', message: 'Invalid JSON' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const parsed = oauthStartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid OAuth request' },
        { status: 422, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { provider, remember, termsAccepted } = parsed.data;
    if (!termsAccepted) {
      return NextResponse.json(
        { error: 'terms_required', message: 'Terms and Privacy consent is required to use social sign-in' },
        { status: 422, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (!dependencies.isOAuthProviderConfigured(provider)) {
      return NextResponse.json(
        { error: 'provider_unavailable', message: 'This sign-in provider is not configured' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const redirectTo = getCallbackUrl();
    if (!redirectTo) {
      return NextResponse.json(
        { error: 'auth_configuration_error', message: 'Authentication is not configured' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    let applyToResponse = (response: NextResponse) => response;
    try {
      const scopedClient: RouteSupabaseClient = dependencies.createRouteSupabaseClient(request, { rememberSession: remember });
      applyToResponse = scopedClient.applyToResponse;

      const { data, error } = await scopedClient.client.auth.signInWithOAuth({
        provider: provider as OAuthProvider,
        options: {
          redirectTo,
          scopes: provider === 'google' ? 'openid email profile' : 'read:user user:email',
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url || !isSupabaseAuthorizationUrl(data.url)) {
        const response = NextResponse.json(
          { error: 'oauth_start_failed', message: 'Unable to start provider sign-in' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
        response.cookies.set(
          AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
          '',
          getAuthSessionPersistenceCookieOptions(false),
        );
        return applyToResponse(response);
      }

      const response = NextResponse.json({ url: data.url }, { headers: { 'Cache-Control': 'private, no-store' } });
      response.cookies.set(
        AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
        remember ? '1' : '',
        getAuthSessionPersistenceCookieOptions(remember),
      );
      return applyToResponse(response);
    } catch (error) {
      console.error('[auth/oauth/start] OAuth initiation failed', error instanceof Error ? error.message : 'unknown error');
      const response = NextResponse.json(
        { error: 'auth_unavailable', message: 'Authentication is not available' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
      response.cookies.set(
        AUTH_SESSION_PERSISTENCE_COOKIE_NAME,
        '',
        getAuthSessionPersistenceCookieOptions(false),
      );
      return applyToResponse(response);
    }
  };
}

export const POST = createOAuthStartHandler();
