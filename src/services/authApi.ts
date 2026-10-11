export const AUTH_API_ENDPOINTS = {
  login: '/api/auth/login',
  signup: '/api/auth/signup',
  forgotPassword: '/api/auth/forgot-password',
  resetPassword: '/api/auth/reset-password',
  oauthStart: '/api/auth/oauth/start',
} as const;

export type AuthOAuthProvider = 'google' | 'github';

export type AuthApiEndpoint = keyof typeof AUTH_API_ENDPOINTS;
export type AuthApiPayload = Record<string, unknown>;

export interface AuthApiResult {
  response: Response;
  data: AuthApiPayload;
}

export interface OAuthStartOptions {
  remember: boolean;
  termsAccepted: boolean;
}

const SUPPORTED_OAUTH_PROVIDERS: readonly AuthOAuthProvider[] = ['google', 'github'];

export async function getAuthProviders(): Promise<AuthOAuthProvider[]> {
  const response = await fetch('/api/auth/providers', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload) || !Array.isArray(payload.providers)) {
    throw new Error('Unable to load authentication providers');
  }

  return [...new Set(payload.providers.filter(
    (provider): provider is AuthOAuthProvider =>
      typeof provider === 'string' && SUPPORTED_OAUTH_PROVIDERS.includes(provider as AuthOAuthProvider),
  ))];
}

export function startOAuth(
  provider: AuthOAuthProvider,
  options: OAuthStartOptions,
): Promise<AuthApiResult> {
  return postAuthApi('oauthStart', {
    provider,
    remember: options.remember,
    termsAccepted: options.termsAccepted,
  });
}

/** Accept only a Supabase Auth authorize URL for the selected provider. */
export function getSafeOAuthAuthorizationUrl(value: unknown, provider: AuthOAuthProvider): string | null {
  if (typeof value !== 'string') return null;
  try {
    const target = new URL(value);
    const isLocalHttp = target.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname.toLowerCase());
    if ((!isLocalHttp && target.protocol !== 'https:')
      || target.username
      || target.password
      || target.pathname !== '/auth/v1/authorize'
      || target.searchParams.get('provider') !== provider) {
      return null;
    }
    return target.href;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Get a fresh same-origin CSRF token and send an auth request with the browser's HttpOnly session cookies. */
export async function postAuthApi(endpoint: AuthApiEndpoint, payload: AuthApiPayload): Promise<AuthApiResult> {
  const csrfResponse = await fetch('/api/csrf-token', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  const csrfPayload: unknown = await csrfResponse.json().catch(() => null);
  const csrfToken = isRecord(csrfPayload) ? csrfPayload.csrfToken : null;

  if (!csrfResponse.ok || typeof csrfToken !== 'string' || csrfToken.length === 0) {
    throw new Error('Unable to initialize a secure authentication request');
  }

  const response = await fetch(AUTH_API_ENDPOINTS[endpoint], {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  const responseBody: unknown = await response.json().catch(() => null);

  return {
    response,
    data: isRecord(responseBody) ? responseBody : {},
  };
}

export function getAuthApiErrorMessage(
  status: number,
  data: AuthApiPayload,
  fallback: string,
): string {
  if (status === 429) {
    const retryAfter = typeof data.retryAfter === 'number' && Number.isFinite(data.retryAfter)
      ? data.retryAfter
      : 60;
    return `Demasiados intentos, intenta en ${retryAfter}s`;
  }
  if (status === 403) return 'La solicitud expiró. Actualiza la página e inténtalo de nuevo.';
  return typeof data.message === 'string' && data.message.trim()
    ? data.message
    : fallback;
}

/** Accept only a same-origin path; never navigate to an API-supplied external URL. */
export function getSafeAuthRedirect(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  try {
    const target = new URL(value, 'https://okengine.invalid');
    if (target.origin !== 'https://okengine.invalid') return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

/** Force a same-origin document navigation so the next route re-reads the newly set HttpOnly cookies. */
export function navigateToAuthPath(value: unknown, fallback: string): void {
  const path = getSafeAuthRedirect(value, fallback);
  window.location.assign(new URL(path, window.location.origin).href);
}
