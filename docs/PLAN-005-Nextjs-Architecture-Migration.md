# PLAN-005 — Proper Next.js Architecture Migration

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-005` |
| **Status** | `APPROVED — EXECUTION PENDING` |
| **Owner** | Principal Architecture & Backend |
| **Authority** | Blocking — Architecture & Deployment |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `STG-01`, `ENG-DOD-STG-01`, `AUDIT-001`, `server.ts`, `vite.config.ts`, `next.config.js` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Goal

Move away from Vite runner + Express `server.ts` weirdness to truly Next.js standard: Next.js 14+ App Router + API Routes + Middleware + `src/lib/*`, removal of `vite.config.ts` and legacy `server.ts` (preserve as reference then delete), proper env validation, health checks, graceful shutdown via Next.js, security middleware preserved, no regressions in TEST-01.

---

## 1. Current Architecture — Problem

### 1.1 Current Hybrid (Weirdness)

- **Vite**: `vite.config.ts` — Vite dev server, HMR, but also used for building? `package.json` scripts: `dev` runs `tsx server.ts` which starts Express + Vite middleware, not Next.js dev
- **Express**: `server.ts` 74K — Hardened Express gateway with security middleware (session, CSRF, rate limiting, CORS, headers, env validation, health, graceful), but also serves Vite dev and proxies to Next.js? Actually `server.ts` is the main entry, not Next.js
- **Next.js**: `src/app/` — App Router with `(public)`, `(auth)`, `(workspace)`, etc, but not used as primary server, `next.config.js` exists but not fully utilized, no `middleware.ts`, no `src/app/api/*` routes (API routes still in Express `server.ts`)
- **Scripts**: `dev` = `tsx server.ts`, `build` = `vite build` + `next build`? Or mixed, `start` = `tsx server.ts` or `next start`? Inconsistent
- **Problems**:
  - Two dev servers (Vite + Next.js) confusion
  - Express gateway not standard Next.js, harder to deploy to Vercel or standard Next.js hosting
  - Security middleware in Express, not in Next.js middleware, so Next.js API routes not protected if accessed directly
  - No `middleware.ts` for Next.js
  - No `src/app/api/*` — API logic in `server.ts`
  - `vite.config.ts` unnecessary for Next.js project
  - Hard to understand for new agents, onboarding issues
  - Staging checklist 21 gates assume Express, need to update for Next.js

### 1.2 Desired Architecture — Proper Next.js Standard

- **Next.js App Router**: `src/app/` with layouts, pages, loading, error, not-found, `src/app/api/*` routes
- **Middleware**: `src/middleware.ts` or `middleware.ts` at root — for session, CSRF, rate limiting, CORS, headers, env validation, auth checks
- **Lib**: `src/lib/` — `db.ts` (PG pool), `redis.ts` (Redis client), `env.ts` (env validation), `auth.ts` (session, CSRF, privilege), `rateLimit.ts`, `validation.ts` (Zod schemas)
- **Config**: `next.config.js` — proper config, no Vite, env, headers, redirects
- **No Vite**: Remove `vite.config.ts`, remove Vite deps if not needed for anything else (check if any component needs Vite? No, Next.js handles)
- **No Express server.ts**: Remove `server.ts` after migration, or keep as `server.legacy.ts` reference for 1 commit then delete
- **Scripts**: `dev` = `next dev`, `build` = `next build`, `start` = `next start`, `lint`, `test`, etc standard
- **Deployment**: Standard Next.js deployment to Vercel, or Node server with `next start`, or Docker with Next.js standalone
- **Security**: Preserved in `middleware.ts` + `src/lib/*` + API route guards, same invariants (5-Link Auth Chain, FORM-SEC-01, exact-origin, rate limiting, CSRF, etc)
- **Env**: Validation in `src/lib/env.ts` fail-fast, same as `server.ts` validateEnv
- **Health**: `/api/health` Next.js API route with DB & Redis status
- **Graceful**: Next.js handles, but also add SIGTERM/SIGINT handling in `next.config.js` or custom server? Actually Next.js `next start` handles graceful, but we can add `src/instrumentation.ts` for shutdown

---

## 2. Detailed Migration Plan

### Phase 1 — Inventory & Preservation (P0, 0.5 day)

1. **Inventory Express routes in `server.ts`**:
   - List all routes: `/api/health`, `/api/csrf-token`, `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/collections`, `/api/files`, `/api/embeds`, `/api/ask`, `/api/feedback`, etc
   - List middleware: env validation, trust proxy, security headers (helmet), CORS, session, CSRF, rate limiting, request validation, error handling, graceful shutdown
   - Document in this plan appendix

2. **Preserve `server.ts` as legacy**:
   - Copy to `server.legacy.ts` or `docs/archive/server-74K-legacy.ts` for reference
   - Commit: `feat(ARCH): preserve server.ts as legacy for migration reference`

3. **Inventory Vite usage**:
   - Check `vite.config.ts` — what does it do? Does any component import via Vite? Search `import.meta`, `vite`, etc
   - Check if any script needs Vite (e.g., embed SDK build?)
   - If Vite only for dev shim, safe to remove after Next.js dev works

### Phase 2 — Create Next.js Standard Structure (P0, 1 day)

1. **Create `middleware.ts` at root or `src/middleware.ts`** (Next.js convention: root `middleware.ts`):

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateEnv } from '@/lib/env';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { csrfProtection } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  // Env validation (fail-fast on build, not per request)
  // Trust proxy handled by Next.js config
  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // HSTS in prod
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // CORS exact-origin
  // Session
  // CSRF for mutating
  // Rate limiting
  // Return response
}

export const config = {
  matcher: ['/api/:path*', '/workspaces/:path*', '/login', '/signup', '/forgot-password', '/password/reset'],
};
```

   - Preserve all security logic from `server.ts`, `sessionAndCsrf.ts`, `rateLimiter.ts`
   - Use Next.js `NextRequest`/`NextResponse`, not Express

2. **Create `src/lib/` directory**:

   - `src/lib/env.ts`: Env validation fail-fast, same as `validateEnv` in `sessionAndCsrf.ts`, but for Next.js — `DATABASE_URL`, `SESSION_SECRET` >=32, `CSRF_SECRET`, `REDIS_URL` optional, `CORS_ALLOWED_ORIGINS`, `NODE_ENV`, `PORT`
   - `src/lib/db.ts`: PG pool, connection, migrations, same as in `server.ts` but extracted
   - `src/lib/redis.ts`: Redis client, optional, fallback to in-memory with warning, same as `rateLimiter.ts`
   - `src/lib/auth.ts`: Session, CSRF, privilege — `createSession`, `getSession`, `regenerateSession`, `csrfToken`, `validateCsrf`, `hasSystemRole`, `requireSystemRole` — adapted from `sessionAndCsrf.ts` and `systemPrivileged.ts` for Next.js
   - `src/lib/rateLimit.ts`: Rate limiting with Redis + in-memory fallback, tiers GLOBAL 100/min, AUTH 5/15min, WRITE 20/min, READ 60/min, composite key IP+session, 429 + Retry-After — adapted from `rateLimiter.ts`
   - `src/lib/validation.ts`: Zod schemas, sanitization via FORM-SEC-01, unknown field rejection — from `requestSchemas.ts`
   - `src/lib/formSecurity.ts`: Already exists? Check `src/services/formSecurity.ts` — keep or move to lib

3. **Create `src/app/api/` routes**:

   - For each Express route in `server.ts`, create Next.js API route:
     - `src/app/api/health/route.ts`: GET health with DB & Redis status
     - `src/app/api/csrf-token/route.ts`: GET csrf token
     - `src/app/api/auth/login/route.ts`: POST login with validation, rate limiting AUTH, session creation, CSRF
     - `src/app/api/auth/signup/route.ts`: POST signup
     - `src/app/api/auth/logout/route.ts`: POST logout
     - `src/app/api/auth/forgot-password/route.ts`: POST forgot
     - `src/app/api/auth/reset-password/route.ts`: POST reset
     - `src/app/api/collections/route.ts`: GET, POST collections
     - `src/app/api/collections/[id]/route.ts`: GET, PUT, DELETE collection
     - `src/app/api/files/route.ts`: GET, POST files
     - `src/app/api/files/[id]/route.ts`: etc
     - `src/app/api/embeds/route.ts`: etc
     - `src/app/api/ask/route.ts`: POST ask question
     - `src/app/api/feedback/route.ts`: POST feedback
   - Each route: use `src/lib/*` for session, CSRF, rate limiting, validation, DB, no Express, standard Next.js `NextRequest`/`NextResponse`, error handling with generic messages, no stack traces in prod

4. **Update `next.config.js`**:

   - Remove Vite references
   - Add security headers (if not in middleware)
   - Add env validation
   - Add `experimental` if needed
   - Ensure `output: 'standalone'` for Docker if needed, or default for Vercel
   - Example:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  // env validation via src/lib/env.ts, not here
};

module.exports = nextConfig;
```

5. **Create `src/instrumentation.ts`** (Next.js instrumentation for graceful shutdown, monitoring):

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Graceful shutdown handling
    process.on('SIGTERM', () => { /* drain */ });
    process.on('SIGINT', () => { /* drain */ });
  }
}
```

### Phase 3 — Migrate Pages to Pure Next.js (P0, 1 day)

1. **Update `src/app/(public)/page.tsx`**:
   - Currently may import PublicSurfaceView or LandingView, ensure it's server component or client component correctly
   - No Vite, pure Next.js
   - Example:

```tsx
// src/app/(public)/page.tsx
import { LandingView } from '@/components/landing/LandingView';

export default function PublicPage() {
  return <LandingView />;
}
```

2. **Update `src/app/(auth)/*` pages**:
   - `login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset/page.tsx` — pure Next.js, import AuthView or CO components, client component if needed (use client)

3. **Update `src/app/(workspace)/*` pages**:
   - Ensure they use App Router layouts, not Vite

4. **Remove `src/pages/` if not needed**:
   - `src/pages/PublicSurfaceView.tsx` is legacy, contains landing + auth — after migration, its logic moved to `src/components/landing/LandingView.tsx` and `src/components/auth/AuthView.tsx`, so `src/pages/` can be removed or kept as legacy archive
   - Check if any route still uses `src/pages/` — if Next.js App Router fully covers, remove `src/pages/` directory

### Phase 4 — Remove Vite & Express Legacy (P0, 0.5 day)

1. **Remove `vite.config.ts`**:
   - Delete file, remove Vite deps from `package.json` if not needed (check `vite`, `@vitejs/plugin-react`, etc)
   - Keep if embed SDK build needs Vite? If so, keep but not as dev server — separate build for SDK

2. **Remove or archive `server.ts`**:
   - After Next.js routes work and tests PASS, archive `server.ts` to `docs/archive/server-74K-legacy.ts` and delete `server.ts`
   - Or keep `server.ts` as `server.legacy.ts` for 1 commit then delete in next

3. **Update `package.json` scripts**:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:staging-readiness": "tsx scripts/tests/staging-readiness.test.ts",
    "test:homepage-tour-readiness": "tsx scripts/tests/homepage-tour-readiness.test.ts",
    "test:embed-authorization": "tsx scripts/tests/embed-authorization.test.ts"
  }
}
```

   - Remove `tsx server.ts` from dev/start
   - Ensure `next dev` works with env validation, middleware, etc

4. **Update `README.md`**: Document new architecture, no Vite, pure Next.js, how to run dev, build, start

### Phase 5 — Verification (P0, 0.5 day)

1. **Run dev**: `npm run dev` → Next.js dev on port 3000, no Express, no Vite, check landing, auth, workspace, API routes
2. **Run build**: `npm run build` → Next.js build, no errors
3. **Run tests**: `npm run test:staging-readiness`, `test:homepage-tour-readiness`, `test:embed-authorization` → must PASS 21/21, 52/52, 29/29
4. **Security verification**: Same as AUDIT-001 — FORM-SEC-01, rate limiting, CSRF, session, CORS, headers, privilege — must still PASS
5. **Manual verification**: Landing, auth, workspace, embeds, API routes, health, csrf-token
6. **Staging checklist**: Update `docs/STAGING-READINESS-CHECKLIST.md` to reflect Next.js architecture, 21 gates still valid but runtime verification needs Next.js not Express

---

## 3. Detailed File Changes

### Files to Create

| File | Purpose |
| :--- | :--- |
| `middleware.ts` (root) | Next.js middleware for security (session, CSRF, rate limiting, CORS, headers) |
| `src/lib/env.ts` | Env validation fail-fast |
| `src/lib/db.ts` | PG pool |
| `src/lib/redis.ts` | Redis client optional + fallback |
| `src/lib/auth.ts` | Session, CSRF, privilege for Next.js |
| `src/lib/rateLimit.ts` | Rate limiting for Next.js |
| `src/lib/validation.ts` | Zod schemas + FORM-SEC-01 |
| `src/app/api/health/route.ts` | Health check |
| `src/app/api/csrf-token/route.ts` | CSRF token |
| `src/app/api/auth/login/route.ts` | Login |
| `src/app/api/auth/signup/route.ts` | Signup |
| `src/app/api/auth/logout/route.ts` | Logout |
| `src/app/api/auth/forgot-password/route.ts` | Forgot |
| `src/app/api/auth/reset-password/route.ts` | Reset |
| `src/app/api/collections/route.ts` | Collections GET/POST |
| `src/app/api/collections/[id]/route.ts` | Collection GET/PUT/DELETE |
| `src/app/api/files/route.ts` | Files |
| `src/app/api/embeds/route.ts` | Embeds |
| `src/app/api/ask/route.ts` | Ask |
| `src/app/api/feedback/route.ts` | Feedback |
| `src/instrumentation.ts` | Graceful shutdown, monitoring |
| `docs/archive/server-74K-legacy.ts` | Legacy server.ts preserved |

### Files to Update

| File | Change |
| :--- | :--- |
| `next.config.js` | Proper config, security headers, no Vite |
| `src/app/(public)/page.tsx` | Pure Next.js, import LandingView |
| `src/app/(auth)/login/page.tsx` | Pure Next.js, import AuthView/LoginForm |
| `src/app/(auth)/signup/page.tsx` | Same |
| `src/app/(auth)/forgot-password/page.tsx` | Same |
| `src/app/(auth)/reset/page.tsx` or `password/reset/page.tsx` | Same |
| `src/app/layout.tsx` | Ensure proper layout, no Vite |
| `package.json` | Scripts dev/build/start = next, remove Vite deps if safe |
| `docs/STAGING-READINESS-CHECKLIST.md` | Update to reflect Next.js architecture |
| `README.md` | Update architecture docs |

### Files to Delete (after verification)

| File | Reason |
| :--- | :--- |
| `vite.config.ts` | No longer needed, Next.js handles |
| `server.ts` | Legacy Express gateway, replaced by Next.js middleware + API routes, preserve as archive then delete |
| `src/pages/PublicSurfaceView.tsx` | Legacy, replaced by LandingView + AuthView, preserve as archive then delete or keep as legacy component |
| `src/pages/` directory | If fully migrated to App Router, can delete |

---

## 4. Security Preservation Checklist

- [ ] Env validation fail-fast preserved in `src/lib/env.ts`
- [ ] Session middleware preserved in `middleware.ts` + `src/lib/auth.ts` — httpOnly, secure (prod), sameSite=strict, 12h expiry, Redis store + fallback, regeneration on login, rolling disabled
- [ ] CSRF double-submit preserved — cookie + header, constant-time compare, safe methods exempt, `/api/csrf-token` exemption
- [ ] Rate limiting preserved — tiers GLOBAL 100/min, AUTH 5/15min, WRITE 20/min, READ 60/min, Redis + fallback, composite key IP+session, 429 + Retry-After
- [ ] Request validation preserved — Zod schemas, FORM-SEC-01 sanitization, unknown field rejection, max lengths
- [ ] Privilege preserved — SYSTEM_ROLES, hasSystemRole, requireSystemRole, server-only
- [ ] Security headers preserved — HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, exact-origin CORS no wildcard
- [ ] Trust proxy preserved — 1 prod, 0 dev (Next.js handles via config)
- [ ] Graceful shutdown preserved — SIGTERM/SIGINT drain (via instrumentation.ts)
- [ ] Health check preserved — /api/health with DB & Redis status
- [ ] No client corpus, no bypass, generic 401, no email enumeration, empty initial values, placeholder+hint, field-level validation, isLoading + disabled
- [ ] TEST-01 suites PASS: 21/21 staging-readiness, 52/52 homepage-tour, 29/29 embed-auth, 12/12 baseline

---

## 5. Risks & Mitigations

- **Risk**: Next.js middleware not covering all Express middleware cases (e.g., WebSocket, streaming)
  - **Mitigation**: Inventory Express routes, ensure all covered by API routes + middleware, test manually

- **Risk**: Session store Redis + in-memory fallback not working in Next.js middleware (middleware is edge, no Node APIs)
  - **Mitigation**: Use `src/lib/redis.ts` with Node runtime, middleware matcher only for Node runtime routes, or use Next.js `instrumentation` for session, or keep session in API routes not middleware — document

- **Risk**: Breaking staging hardening, introducing vulnerabilities
  - **Mitigation**: Preserve security logic 1:1, run TEST-01 suites after each phase, manual security verification (FORM-SEC-01, rate limiting, CSRF, etc)

- **Risk**: `npm run dev` not working after removal of Vite
  - **Mitigation**: Test `next dev` before deleting Vite, ensure env, DB, Redis, etc work

- **Risk**: Deploy to Vercel or Node server fails because of custom server.ts removal
  - **Mitigation**: Next.js standard deployment works on Vercel and Node with `next start`, no custom server needed, document deployment

---

## 6. Acceptance Criteria

- [ ] `middleware.ts` created with security middleware preserved
- [ ] `src/lib/` created with env, db, redis, auth, rateLimit, validation
- [ ] `src/app/api/*` routes created for all Express routes
- [ ] `next.config.js` proper, no Vite
- [ ] `src/app/(public)/page.tsx` and `src/app/(auth)/*` pure Next.js
- [ ] `vite.config.ts` removed (or kept only for SDK build if needed, but not as dev server)
- [ ] `server.ts` archived then removed
- [ ] `src/pages/` archived then removed (if fully migrated)
- [ ] `package.json` scripts dev/build/start = next
- [ ] `npm run dev` works, Next.js dev, no Express, no Vite
- [ ] `npm run build` works, Next.js build, no errors
- [ ] TEST-01 suites PASS: 21/21, 52/52, 29/29, 12/12
- [ ] Security verification PASS: FORM-SEC-01, rate limiting, CSRF, session, CORS, headers, privilege
- [ ] Manual verification: landing, auth, workspace, embeds, API, health, csrf-token
- [ ] Staging checklist updated for Next.js architecture
- [ ] README updated
- [ ] Atomic commits + push

---

## 7. Appendix — Express Routes Inventory (from server.ts 74K)

*To be filled during Phase 1 inventory — list all routes and middleware*

- **Middleware**: env validation, trust proxy, helmet security headers, CORS exact-origin, session (Redis + in-memory fallback), CSRF double-submit, rate limiting (4 tiers), request validation (Zod), error handling, graceful shutdown
- **Routes**:
  - GET /api/health
  - GET /api/csrf-token
  - POST /api/auth/login (TIER_AUTH_5_PER_15M)
  - POST /api/auth/signup (TIER_AUTH_5_PER_15M)
  - POST /api/auth/logout
  - POST /api/auth/forgot-password (TIER_AUTH_5_PER_15M)
  - POST /api/auth/reset-password (TIER_AUTH_5_PER_15M)
  - GET/POST /api/collections (TIER_READ_60_PER_MIN / TIER_WRITE_20_PER_MIN)
  - GET/PUT/DELETE /api/collections/:id
  - GET/POST /api/files
  - GET/PUT/DELETE /api/files/:id
  - GET/POST /api/embeds
  - GET/PUT/DELETE /api/embeds/:id
  - POST /api/ask (TIER_WRITE_20_PER_MIN)
  - POST /api/feedback
  - ... (full list from server.ts)

---

## 8. References

- Current: `server.ts` 74K, `vite.config.ts`, `next.config.js`, `package.json`, `src/app/`, `src/pages/PublicSurfaceView.tsx`, `src/services/sessionAndCsrf.ts`, `rateLimiter.ts`, `requestSchemas.ts`, `systemPrivileged.ts`
- Desired: Next.js 14+ App Router docs, middleware.ts docs, API Routes docs, `src/lib/` pattern
- Security: `SEC-01`, `API-01`, `STG-01`, `ENG-DOD-STG-01`, `STAGING-READINESS-CHECKLIST`
- Tests: `homepage-tour-readiness`, `embed-authorization`, `baseline`, `staging-readiness`

---

*Plan up to standards — ready for execution, blocks proper deployment and staging.*
