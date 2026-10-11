# SEC-01 — Security Foundations

| Field | Value |
| :--- | :--- |
| **Document ID** | `SEC-01` |
| **Status** | `APPROVED — v1.0` |
| **Owner** | Security & Architecture |
| **Authority** | Blocking — All Surfaces |
| **Dependencies** | `STG-01`, `ENG-DOD-STG-01`, `AUTH-01..05`, `FORM-SEC-01`, `00_product_contract`, `API-01` |
| **Revision** | `1.0 (2026-10-11)` — Consolidated from staging hardening (server.ts 74K, sessionAndCsrf.ts, rateLimiter.ts, requestSchemas.ts, systemPrivileged.ts) |

---

## 0. Purpose

Canonical security specification consolidating all hardening introduced for staging readiness (12 vulnerabilities remediated, 21/21 gates PASS). Preserves invariants for Next.js migration.

---

## 1. Environment Validation (SEC-ENV-01)

**File**: `src/lib/env.ts` (Next.js) / `src/services/sessionAndCsrf.ts` `validateEnv()` (legacy Express)

**Rules**:
- `DATABASE_URL` required, must be valid postgres URL, fail-fast on boot if missing
- `SESSION_SECRET` required, >=32 chars, fail-fast
- `CSRF_SECRET` required, >=32 chars, fail-fast
- `NODE_ENV` must be `development` | `production` | `test`
- `PORT` numeric, default 3000
- `REDIS_URL` optional, if present must be valid redis URL, if missing warn and use in-memory fallback (OPS-01)
- `CORS_ALLOWED_ORIGINS` comma-separated exact origins, no wildcard, fail-fast if contains `*`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` optional for billing, if present validate format

**Behavior**: On boot, validate all env, log masked values, throw and exit 1 if invalid. No hardcoded secrets in code.

---

## 2. Session Management (SEC-SESSION-01)

**File**: `src/lib/auth.ts` (Next.js) / `src/services/sessionAndCsrf.ts` (legacy)

**Invariants**:
- httpOnly: true (no JS access)
- secure: true in prod, false in dev (allow http localhost)
- sameSite: strict (no cross-site)
- maxAge: 12h (43200000 ms)
- store: Redis when `REDIS_URL` present, else in-memory with warning (OPS-REDIS-01)
- secret: `SESSION_SECRET` >=32 chars, rotated? No rotation yet, but validation
- regeneration: On login, regenerate session ID to prevent fixation
- rolling: disabled for CSRF safety (session not extended on every request, only explicit)
- cookie name: `okeng.sid` or `__Host-okeng.sid` in prod (prefix for secure)
- 5-Link Auth Chain (AUTH-05): Session → User → Workspace → Membership → Role → Collection Access

**Implementation**:
- Express: `express-session` + `connect-redis` or `MemoryStore` fallback
- Next.js: Custom session via `jose` JWT or `iron-session` or `next-auth`? Plan uses `src/lib/auth.ts` with JWT signed by `SESSION_SECRET`, httpOnly cookie, same properties

---

## 3. CSRF Protection (SEC-CSRF-01)

**File**: `src/lib/auth.ts` / `src/services/sessionAndCsrf.ts`

**Contract**: Double-submit cookie + header

- Cookie: `okeng.csrf` or `__Host-okeng.csrf`, httpOnly false (JS readable), secure prod, sameSite strict, path /
- Header: `x-csrf-token` or `x-okeng-csrf`, value must match cookie via constant-time compare (`crypto.timingSafeEqual`)
- Token generation: `crypto.randomBytes(32).toString('hex')` or `csrfSecret` HMAC, 64 chars
- Endpoint: `GET /api/csrf-token` returns `{ csrfToken }` and sets cookie, exempt from CSRF check
- Safe methods exempt: GET, HEAD, OPTIONS — no CSRF check
- Mutating methods protected: POST, PUT, PATCH, DELETE — require header matching cookie
- Error: 403 Forbidden with `{ error: "csrf_invalid", message: "Invalid CSRF token" }` if mismatch
- Constant-time: Use `timingSafeEqual` to prevent timing attacks

---

## 4. Rate Limiting (SEC-RATE-LIMIT-01)

**File**: `src/lib/rateLimit.ts` / `src/services/rateLimiter.ts`

**Tiers**:

| Tier ID | Limit | Window | Applies To | Key | Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TIER_GLOBAL_100_PER_MIN` | 100 req | 60s | All /api/* | IP + session ID composite | 429 + Retry-After |
| `TIER_AUTH_5_PER_15M` | 5 req | 15m (900s) | /api/auth/login, /api/auth/signup, /api/auth/forgot-password, /api/auth/reset-password | IP + email (if present) composite | 429 + Retry-After |
| `TIER_WRITE_20_PER_MIN` | 20 req | 60s | POST/PUT/PATCH/DELETE /api/collections, /api/files, /api/embeds, /api/ask, /api/feedback | IP + session ID | 429 |
| `TIER_READ_60_PER_MIN` | 60 req | 60s | GET /api/collections, /api/files, /api/embeds, /api/ask | IP + session ID | 429 |

**Implementation**:
- Store: Redis when available (via `rate-limit-redis`), else in-memory `Map` with TTL and warning
- Algorithm: Sliding window or fixed window with counter, Redis INCR + EXPIRE
- Key: `rate_limit:<tier>:<ip>:<sessionId|email>` — composite to prevent IP bypass via session rotation and session bypass via IP rotation
- Response: 429 Too Many Requests with `Retry-After` header (seconds until window reset) and JSON `{ error: "rate_limit_exceeded", message: "Too many requests, try in X seconds", retryAfter: 123 }`
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Bypass: None, no whitelist

---

## 5. CORS — Exact-Origin (SEC-CORS-01)

**File**: `server.ts` CORS middleware / `middleware.ts` / `next.config.js` headers

**Rules**:
- No wildcard `*` allowed in `CORS_ALLOWED_ORIGINS` or response `Access-Control-Allow-Origin`
- Exact-origin validation: Request `Origin` header must exactly match one of allowed origins (from env `CORS_ALLOWED_ORIGINS` comma-separated), including scheme, host, port, no substring
- Allowed origins example: `https://app.okeng.com,https://okeng.com,http://localhost:3000` (dev)
- If `Origin` missing (same-origin or non-browser), allow (no CORS check)
- If `Origin` present but not in allowed list, reject with 403 and no CORS headers
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: `Content-Type`, `Authorization`, `x-csrf-token`, `x-okeng-csrf`
- Credentials: true (allow cookies)
- Preflight: OPTIONS handled, 204 No Content with CORS headers if origin allowed

---

## 6. Security Headers (SEC-HEADERS-01)

**File**: `server.ts` helmet / `middleware.ts` / `next.config.js` headers

**Headers**:

| Header | Value | Purpose |
| :--- | :--- | :--- |
| `X-Frame-Options` | `DENY` | No iframe embedding (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | No MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer policy |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable sensitive APIs |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (prod only) | HSTS, HTTPS only |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com` (example, adjust) | CSP, no inline scripts except needed |
| `X-XSS-Protection` | `0` (disable, CSP handles) | Legacy |

**Implementation**: Helmet in Express, `NextResponse.headers.set` in middleware, `next.config.js` headers() for static.

---

## 7. Privilege System (SEC-PRIVILEGE-01)

**File**: `src/lib/auth.ts` / `src/services/systemPrivileged.ts`

**Roles**:

| Role | Level | Description |
| :--- | :--- | :--- |
| `super_admin` | 4 | Platform super admin, all workspaces, system ops |
| `admin` | 3 | Workspace admin, manage members, collections, embeds, billing |
| `member` | 2 | Workspace member, create/edit files, collections, embeds |
| `viewer` | 1 | Workspace viewer, read-only, ask questions |

**Functions**:
- `SYSTEM_ROLES = ['super_admin', 'admin', 'member', 'viewer']`
- `hasSystemRole(userRole, requiredRole): boolean` — checks if userRole >= requiredRole level
- `requireSystemRole(userRole, requiredRole): void` — throws 403 if not enough privilege
- `getSystemRole(user): Role` — gets role from session/user

**Invariants**:
- No client-side privilege trust — all checks server-side in API routes
- No privilege escalation via client params — role from session only, not from request body
- Workspace membership check: user must be member of workspace to access its resources
- Collection visibility check: `everyone` (all), `members` (member+), `admins` (admin+), filtered at retrieval (not just UI)

---

## 8. Sanitization & FORM-SEC-01 (SEC-SANITIZATION-01)

**File**: `src/lib/validation.ts` / `src/services/requestSchemas.ts` / `src/services/formSecurity.ts`

**FORM-SEC-01 Contract** (from `00_product_contract` CAP-17 and `02_component_catalog`):

1. **Sanitization**: Reject (not strip) inputs containing:
   - `<script>`, `</script>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`, `<style>` (case-insensitive)
   - Inline event handlers: `onload=`, `onerror=`, `onclick=`, `onmouseover=`, etc (regex `on\w+\s*=`)
   - Control characters: `\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`, `\x7F`
   - Path traversal: `..`, `../`, `..\\`
   - Dangerous URI schemes: `javascript:`, `data:`, `vbscript:`, `file:`, `blob:` (case-insensitive, at start or after whitespace)
   - SQL injection patterns? Not needed, using ORM, but reject `'; DROP`, `--`, `/*`, `*/`? Actually Zod + ORM prevents, but FORM-SEC-01 focuses on XSS

2. **Placeholders & Hints**: Every form field displays localized `placeholder` (empty initial values on /login and /signup) and contextual `hint` (`aria-describedby`)

3. **Field-Level Validation Errors**: Invalid or unsafe input renders inline error banner (`role="alert"`, `aria-invalid="true"`) with `AlertCircle` indicator

4. **Loading State Spinners**: Submit buttons use `PR-BUTTON` `isLoading={true}` (`Loader2` spinner + `disabled`) during submission

**Server-Side Enforcement**: All Zod schemas in `requestSchemas.ts` / `validation.ts` enforce FORM-SEC-01 via `refine` or `superRefine`, reject unknown fields, max length enforcement (e.g., email max 255, password max 128, name max 100, etc)

---

## 9. Graceful Shutdown (SEC-GRACEFUL-01)

**File**: `server.ts` graceful shutdown / `src/instrumentation.ts` (Next.js)

**Behavior**:
- Listen SIGTERM, SIGINT
- On signal: stop accepting new connections, log "Shutting down...", wait for existing connections to drain (30s timeout), close DB pool, close Redis, exit 0
- In Next.js: `instrumentation.ts` `register()` handles SIGTERM/SIGINT, or `next.config.js` with custom server? Actually Next.js `next start` handles graceful, but we add instrumentation for cleanup
- Health check `/api/health` returns 503 during shutdown

---

## 10. Trust Proxy (SEC-TRUST-PROXY-01)

**File**: `server.ts` `app.set('trust proxy', 1)` / `next.config.js`

- Prod: trust proxy 1 (trust first proxy, e.g., Vercel, Nginx, Cloudflare)
- Dev: trust proxy 0 (no proxy, direct)
- Purpose: Correct IP for rate limiting (X-Forwarded-For), secure cookies

---

## 11. No Client Corpus & No Bypass (SEC-NO-CORPUS-01)

**Invariant**: No document content, chunks, embeddings, or collection data in client bundle. All retrieval server-side, filtered by access control before vector similarity.

**Enforcement**:
- No `fs.readFile` of corpus in client
- No import of `Document`, `DocumentChunk` in client components
- API routes return only answer + citations (title, excerpt), not full corpus
- Tests: `homepage-tour-readiness` and `embed-authorization` check no corpus in client

---

## 12. Security Testing & Verification

**Tests**:
- `test:staging-readiness`: 21 gates, 12 vulnerabilities (P0-AUTH-01..04, P1-SEC-01..04, P2-OPS-01..04) — must PASS
- `test:homepage-tour-readiness`: 52 checks including security (no corpus, FORM-SEC-01, etc)
- `test:embed-authorization`: 29 checks including authz (blocked collections excluded before retrieval)
- `test:baseline`: 12 guards

**Manual Verification**:
- Try XSS payloads in all forms → must be rejected with field error
- Try rate limiting → 6th auth attempt in 15m → 429
- Try CSRF without header → 403
- Try CORS from disallowed origin → 403 no CORS headers
- Try privilege escalation via client param → 403 server-side check
- Try accessing other workspace's collection → 403

---

## 13. References

- `server.ts` 74K hardened gateway
- `src/services/sessionAndCsrf.ts` (8.2K), `rateLimiter.ts` (6.1K), `requestSchemas.ts` (9.4K), `systemPrivileged.ts` (3.2K)
- `src/lib/env.ts`, `auth.ts`, `rateLimit.ts`, `validation.ts` (Next.js)
- `middleware.ts` (Next.js)
- `STG-01`, `ENG-DOD-STG-01`, `STAGING-READINESS-CHECKLIST.md`
- `AUTH-01..05`, `FORM-SEC-01`, `00_product_contract`

---

*Security foundations preserved for Next.js migration.*
