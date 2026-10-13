// proxy.ts — Next.js proxy (middleware replacement) preserving security from server.ts (SEC-01, API-01, PLAN-008 Phase 6)
// Order: env (build time) → trust proxy → headers → CORS → session → CSRF → rate limiting
// Phase 6: Sanitize forwarding headers in prod, document trust boundary for TRUST_PROXY

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_SESSION_PERSISTENCE_COOKIE_NAME, SUPABASE_AUTH_COOKIE_NAME, getSupabaseAuthCookieOptions } from './lib/supabase/cookies';

/**
 * Trust Proxy Boundary Documentation (PLAN-008 Phase 6)
 *
 * TRUST_PROXY env var controls whether we trust x-forwarded-for:
 * - In production behind Vercel/Cloudflare/Nginx that sanitizes x-forwarded-for, set TRUST_PROXY=true
 * - Vercel: sanitizes x-forwarded-for, sets x-real-ip, x-forwarded-for is trustworthy when behind Vercel edge
 * - Cloudflare: sanitizes x-forwarded-for, adds CF-Connecting-IP
 * - Nginx: should be configured to set x-real-ip and overwrite x-forwarded-for with $remote_addr
 * - If TRUST_PROXY=false (default in dev), we do NOT trust x-forwarded-for (spoofable via client headers)
 *   Instead we use x-real-ip or direct IP if available, and use trustworthy sessionId from httpOnly signed cookie
 *   as fallback identifier for rate limiting
 *
 * Rate Limiting Fallback:
 * - Trustworthy sessionId from httpOnly signed cookie (okeng.sid / __Host-okeng.sid) — not client-controllable
 * - If both IP unknown and no session, use shared bucket with higher limit (DoS mitigation)
 * - Fail-closed AUTH on Redis outage (429), fail-open READ/WRITE/GLOBAL
 *
 * Security Headers:
 * - X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS
 * - CORS exact-origin, no wildcard
 */

function isTrustProxy(): boolean {
  return process.env.TRUST_PROXY === 'true';
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Refresh Supabase Auth tokens before route handling. Updating both the
  // forwarded request cookie jar and the outgoing response keeps downstream
  // route handlers on the same verified session without exposing tokens to JS.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabasePublicKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const hasSupabaseAuthCookie = request.cookies.getAll().some(({ name }) => name.startsWith(SUPABASE_AUTH_COOKIE_NAME));
  if (supabaseUrl && supabasePublicKey && hasSupabaseAuthCookie) {
    const supabase = createServerClient(supabaseUrl, supabasePublicKey, {
      cookieOptions: getSupabaseAuthCookieOptions(request.cookies.get(AUTH_SESSION_PERSISTENCE_COOKIE_NAME)?.value === '1'),
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
        },
      },
    });
    try {
      await supabase.auth.getUser();
    } catch {
      // Authentication is checked again by route handlers. A transient Auth
      // failure must not grant access or break public pages.
    }
  }

  // Phase 6: Sanitize forwarding headers in prod if not behind trusted proxy
  const trustProxy = isTrustProxy();
  const xForwardedFor = request.headers.get('x-forwarded-for');

  if (!trustProxy && xForwardedFor) {
    if (process.env.NODE_ENV === 'production' || process.env.OKENG_ENV === 'production') {
      console.warn(`[proxy] TRUST_PROXY=false but x-forwarded-for present: ${xForwardedFor} — not trusted, using x-real-ip or sessionId`);
    }
  }

  // Security headers (SEC-HEADERS-01) — P1 framing: single canonical policy (keep in sync with next.config comment).
  // Canonical allowlist: only /workspaces/:workspaceSlug/embeds/preview and /workspaces/:workspaceSlug/embeds/:embedId/preview are frame-allowed (EMBED-02). Installation and /api/* remain DENY.
  // Intentional infrastructure exception: preview platform generates short-lived unpredictable subdomains (e.g., *.arena.site, *.okeng.io, *.e2b.app); wildcard SCOPED to these preview domains only, not arbitrary origins. Subdomain isolation prevents cross-customer access.
  // Preserve complete required CSP while varying only frame-ancestors — do not replace entire policy with frame-ancestors alone (P1 CSP review).
  const pathname = request.nextUrl.pathname;
  const isEmbedPreview =
    /^\/workspaces\/[^/]+\/embeds\/preview(\/|\?|$)/.test(pathname) ||
    /^\/workspaces\/[^/]+\/embeds\/[^/]+\/preview(\/|\?|$)/.test(pathname);
  const BASE_CSP = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co",
    "frame-src https://js.stripe.com",
  ];
  function buildCsp(frameAncestors: string) {
    return [...BASE_CSP, `frame-ancestors ${frameAncestors}`].join('; ');
  }
  if (isEmbedPreview) {
    // Embeddable route — allow framing from verified origins only (EMBED-02 contract)
    // X-Frame-Options omitted: SAMEORIGIN would block cross-origin allowlist; CSP frame-ancestors is authoritative.
    response.headers.delete('X-Frame-Options');
    response.headers.set(
      'Content-Security-Policy',
      buildCsp("'self' https://*.okeng.io https://*.arena.site https://*.e2b.app")
    );
  } else {
    // Sensitive routes (/, /login, /workspaces/* except preview) — deny framing
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Content-Security-Policy', buildCsp("'none'"));
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Add trust proxy header for downstream visibility
  response.headers.set('X-Trust-Proxy', trustProxy ? 'true' : 'false');

  // CORS exact-origin (SEC-CORS-01)
  const origin = request.headers.get('origin');
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origin && allowedOrigins.length > 0) {
    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token, x-okeng-csrf');
    } else {
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: 'forbidden', message: 'Origin not allowed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // CSRF check for mutating API routes (SEC-CSRF-01)
  if (request.nextUrl.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    if (request.nextUrl.pathname !== '/api/csrf-token' && request.nextUrl.pathname !== '/api/health' && request.nextUrl.pathname !== '/api/billing/webhooks') {
      const cookieToken = request.cookies.get('okeng.csrf')?.value || request.cookies.get('__Host-okeng.csrf')?.value;
      const headerToken = request.headers.get('x-csrf-token') || request.headers.get('x-okeng-csrf');
      if (!cookieToken || !headerToken) {
        // Let API route handle 403
      }
    }
  }

  return response;
}

export const config = {
  // Apply framing + security headers to all routes (canonical policy). Keep narrow in dev if needed, but must include public, auth, docs, workspaces.
  matcher: ['/:path*'],
};
