# AUDIT-001 — Audit of Staging Hardening Changes vs Foundational Documents

| Field | Value |
| :--- | :--- |
| **Document ID** | `AUDIT-001` |
| **Status** | `APPROVED` |
| **Owner** | Principal Security & Architecture |
| **Authority** | Blocking — Security & Foundations Sync |
| **Dependencies** | `STG-01`, `ENG-DOD-STG-01`, `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `00_product_contract`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Summary

During staging readiness (commit `f5210cd`..`debf205`), 6 files were significantly changed (1749+ additions, 74K `server.ts` rewritten) to remediate 12 vulnerabilities across 3 priority tiers. This audit maps each change to foundational docs and identifies updates required.

---

## 1. Changed Files Inventory

### 1.1 `server.ts` (74,000 bytes, complete rewrite from 300-line Vite dev shim to hardened Express gateway)

**Before**: Simple Vite dev server shim, no security headers, no rate limiting, no CSRF, no env validation, hardcoded secrets, trust proxy false, no request size limit enforcement, no graceful shutdown.

**After**: Hardened gateway implementing STG-01:
- Env validation with fail-fast (P0-AUTH-02): `DATABASE_URL`, `SESSION_SECRET`, `CSRF_SECRET`, `NODE_ENV`, `PORT`, `REDIS_URL` (optional), `CORS_ALLOWED_ORIGINS`
- Session middleware: httpOnly, secure (prod), sameSite=strict, 12h expiry, Redis store when available, in-memory fallback with warning, `SESSION_SECRET` >=32 chars validation, session regeneration on login, rolling disabled for CSRF safety
- CSRF protection (P0-AUTH-03/04): double-submit cookie + header validation for mutating routes, `/api/csrf-token` endpoint, constant-time comparison, signingSecret removed
- Rate limiting (P0-AUTH-01): Redis-backed with in-memory fallback, tiers `TIER_GLOBAL_100_PER_MIN`, `TIER_AUTH_5_PER_15M`, `TIER_WRITE_20_PER_MIN`, `TIER_READ_60_PER_MIN`, IP + session composite key, 429 with Retry-After
- Request schema validation (P1-SEC-02): Zod schemas in `requestSchemas.ts`, sanitization via `FORM-SEC-01`, reject unknown fields
- Privilege system (P1-SEC-03): `systemPrivileged.ts` with `SYSTEM_ROLES`, `hasSystemRole`, `requireSystemRole`, no client-side privilege
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, exact-origin CORS validation
- Trust proxy: 1 in prod, 0 in dev
- Graceful shutdown: SIGTERM/SIGINT handling, drain connections
- Health check: `/api/health` with DB & Redis status

**Foundational Doc Impact**:
- `SEC-01`: Needs update — add `SEC-MIDDLEWARE-01` (session, CSRF, rate limiting, headers), `SEC-ENV-01` (env validation), `SEC-CORS-01` (exact-origin validation), `SEC-GRACEFUL-SHUTDOWN-01`
- `API-01`: Needs update — add `API-MIDDLEWARE-01` (request validation pipeline), `API-RATE-LIMIT-01` (tiers), `API-CSRF-01` (double-submit contract)
- `OPS-01`: Needs update — add `OPS-REDIS-01` (optional Redis, fallback), `OPS-GRACEFUL-01`, `OPS-HEALTH-01`, `OPS-ENV-01`

### 1.2 `src/services/sessionAndCsrf.ts` (new, 8.2K)

Implements:
- `createSessionMiddleware`: Express session with Redis/in-memory store, httpOnly, secure, sameSite, 12h expiry
- `csrfProtection`: double-submit cookie + header, constant-time compare, safe methods exempt, `/api/csrf-token` exemption
- `validateEnv`: fail-fast env validation

**Foundational Doc Impact**:
- `SEC-01`: Add `SEC-SESSION-01` (12h expiry, httpOnly, secure, sameSite=strict, Redis store, regeneration on login)
- `SEC-01`: Add `SEC-CSRF-01` (double-submit, constant-time, safe methods GET/HEAD/OPTIONS exempt)

### 1.3 `src/services/rateLimiter.ts` (new, 6.1K)

Implements:
- `createRateLimiter`: Redis-backed with in-memory fallback, sliding window
- Tiers: GLOBAL 100/min, AUTH 5/15min, WRITE 20/min, READ 60/min
- Composite key: IP + session ID
- `rateLimitMiddleware` factory

**Foundational Doc Impact**:
- `SEC-01`: Add `SEC-RATE-LIMIT-01` (tiers, composite key, 429 + Retry-After, Redis + fallback)
- `API-01`: Add `API-RATE-LIMIT-01` (tier mapping to endpoints)

### 1.4 `src/services/requestSchemas.ts` (new, 9.4K)

Implements Zod schemas:
- `loginSchema`, `signupSchema`, `forgotPasswordSchema`, `createCollectionSchema`, `createFileSchema`, `updateFileSchema`, `createEmbedSchema`, `updateEmbedSchema`, `askQuestionSchema`, `feedbackSchema`
- Sanitization via `FORM-SEC-01` (reject <script>, <iframe>, on*=, javascript:, data:, etc)
- Unknown field rejection
- Max length enforcement

**Foundational Doc Impact**:
- `API-01`: Add `API-VALIDATION-01` (Zod schemas, unknown field rejection, sanitization)
- `DATA-01`: Add `DATA-SANITIZATION-01` (FORM-SEC-01 enforcement in schemas)
- `02_component_catalog`: Update `FORM-SEC-01` to reference `requestSchemas.ts`

### 1.5 `src/services/systemPrivileged.ts` (new, 3.2K)

Implements:
- `SYSTEM_ROLES`: `super_admin`, `admin`, `member`, `viewer`
- `hasSystemRole`, `requireSystemRole`, `getSystemRole`
- No client-side privilege escalation, server-only

**Foundational Doc Impact**:
- `SEC-01`: Add `SEC-PRIVILEGE-01` (system roles, server-only, no client trust)
- `00_product_contract`: Add capability `CAP-18 System Privilege`? Or extend `CAP-10 Governance`

### 1.6 `package.json`

**Changes**:
- Overrides fix: `**/@types/express` -> `@types/express` (invalid override syntax)
- Added: `express-rate-limit`, `rate-limit-redis`, `redis`, `zod`, `helmet`, `cors`, `express-session`, `connect-redis`, `csurf`? Actually custom CSRF, not csurf
- Scripts: added `test:staging-readiness`, `test:homepage-tour-readiness`, `test:embed-authorization`

**Foundational Doc Impact**:
- `OPS-01`: Update dependency list, add Redis optional dependency

---

## 2. Foundational Docs — Current State vs Required Updates

| Foundational Doc | Current Revision | Gap | Required Update | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `00_product_contract.md` | v1.0 — 17 capabilities | Missing CAP-18 System Privilege, CAP-19 Rate Limiting, CAP-20 Session & CSRF | Add 3 capabilities, update invariant Files→Collections→Access→Context→Answer still holds | P1 |
| `01_ui_foundation.md` | v2.0 — DS tokens, PR taxonomy, 9 principles | Missing SEC tokens (rate limit banners, CSRF error states), missing new primitives from landing (announcement banner, metrics, pricing toggle) | Add SEC-UI tokens, add new primitives to taxonomy | P0 |
| `02_component_catalog.md` | v2.0 — PR-* and CO-* inventory | Missing PR-ANNOUNCEMENT-BANNER, PR-METRIC, PR-PRICING-TOGGLE, PR-TESTIMONIAL, PR-FAQ, PR-CODE-SNIPPET, PR-LOGO-STRIP; missing CO-LANDING-* components | Add 7+ new PR, 8+ new CO | P0 |
| `03_page_specifications.md` | v2.0 — PAGE-PUB-01 with 5-stage tour | PAGE-PUB-01 outdated — old pipeline/pillars, needs new 9-section structure from proposal; PAGE-AUTH-01/02/03 need visual update | Rewrite PAGE-PUB-01, update PAGE-AUTH specs | P0 |
| `UI-01` | v2.0 — Primitives, Components, Surfaces, Archetypes | Same as 01 & 02 — missing new primitives/components/surfaces for landing | Update to v3.0 with new tokens, primitives, components, surfaces | P0 |
| `04_workflows.md` | v1.0 — Core workflows | Missing WF-LANDING-01 (landing → signup), WF-PRICING-01 (pricing toggle → checkout), WF-AUTH-01 updated for new design | Add 2 workflows, update auth workflow | P1 |
| `SEC-01` | Not found? Or part of 00? | No dedicated SEC-01 found in docs/ — security scattered across product contract | Create `docs/SEC-01-Security-Foundations.md` consolidating session, CSRF, rate limit, CORS, headers, privilege, env validation, graceful shutdown | P0 |
| `API-01` | Not found | No dedicated API-01 — API design scattered | Create `docs/API-01-API-Design-and-Middleware.md` with middleware pipeline, validation, rate limiting, CSRF, error handling | P0 |
| `DB-01` | Not found | No dedicated DB-01 | Create `docs/DB-01-Database-and-Session-Store.md` with PG15+, Redis optional, session store, migrations | P1 |
| `DATA-01` | Not found | No dedicated DATA-01 | Create `docs/DATA-01-Data-Model-and-Sanitization.md` with Zod schemas, FORM-SEC-01, sanitization | P1 |
| `OPS-01` | Not found | No dedicated OPS-01 | Create `docs/OPS-01-Operations-and-Deployment.md` with env validation, health checks, graceful shutdown, Redis, monitoring | P1 |
| `STG-01` / `ENG-DOD-STG-01` | Exists as `STAGING-READINESS-CHECKLIST.md` | Checklist done but runtime verification pending | Preserve, will re-verify after Next.js migration | P0 (already done) |

---

## 3. Detailed Mapping — Staging Hardening to Foundational Principles

### 3.1 Security Principles (9 normative principles in `01_ui_foundation`)

**Principle 1 — Exact-Origin & No Wildcard CORS**:
- **Implementation**: `server.ts` CORS middleware with exact-origin validation, no `*`, allowed origins from env `CORS_ALLOWED_ORIGINS`
- **Doc Gap**: Not in `01_ui_foundation` — add `SEC-CORS-01` to `SEC-01` doc, reference in `01_ui_foundation` principle 9 (security)

**Principle 2 — No Client Corpus & No Bypass**:
- **Implementation**: `requestSchemas.ts` + `systemPrivileged.ts` — no client-side privilege, server-only role checks, no corpus exfiltration
- **Doc Gap**: Partially in `00_product_contract` but needs explicit `SEC-PRIVILEGE-01` in new `SEC-01`

**Principle 3 — FORM-SEC-01 Everywhere**:
- **Implementation**: `requestSchemas.ts` enforces FORM-SEC-01 in all Zod schemas
- **Doc Gap**: `02_component_catalog` mentions FORM-SEC-01 but needs update to reference `requestSchemas.ts` as server-side enforcement

**Principle 4 — 5-Link Auth Chain (AUTH-05)**:
- **Implementation**: `sessionAndCsrf.ts` — session middleware with Redis, 12h expiry, httpOnly, secure, sameSite=strict
- **Doc Gap**: Needs `SEC-SESSION-01` in `SEC-01`

### 3.2 Rate Limiting (TIER_AUTH_5_PER_15M etc)

**Implementation**: `rateLimiter.ts` with 4 tiers, Redis + in-memory fallback, composite key

**Doc Gap**: 
- No rate limiting in foundational docs — add `SEC-RATE-LIMIT-01` to `SEC-01`, `API-RATE-LIMIT-01` to `API-01`
- UI needs rate limit error states: 429 banner, Retry-After countdown — add `PR-RATE-LIMIT-BANNER` to `02_component_catalog`

### 3.3 Session & CSRF

**Implementation**: Double-submit cookie + header, constant-time compare, `/api/csrf-token` endpoint, safe methods exempt

**Doc Gap**:
- Add `SEC-CSRF-01` to `SEC-01`, `API-CSRF-01` to `API-01`
- UI needs CSRF error handling: `CO-CSRF-ERROR` component

---

## 4. Action Plan — Foundational Doc Updates

### Phase 1 — Create Missing Foundational Docs (P0)

1. **Create `docs/SEC-01-Security-Foundations.md`**:
   - Consolidate all security hardening from `server.ts`, `sessionAndCsrf.ts`, `rateLimiter.ts`, `requestSchemas.ts`, `systemPrivileged.ts`
   - Sections: `SEC-ENV-01`, `SEC-SESSION-01`, `SEC-CSRF-01`, `SEC-RATE-LIMIT-01`, `SEC-CORS-01`, `SEC-HEADERS-01`, `SEC-PRIVILEGE-01`, `SEC-SANITIZATION-01`, `SEC-GRACEFUL-01`
   - Reference `STG-01` and `ENG-DOD-STG-01`

2. **Create `docs/API-01-API-Design-and-Middleware.md`**:
   - Middleware pipeline: env validation → trust proxy → security headers → CORS → session → CSRF → rate limiting → request validation → route handler
   - Zod schemas, error handling, 429 handling
   - Mapping of rate limit tiers to endpoints

3. **Create `docs/DB-01-Database-and-Session-Store.md`**:
   - PG15+ requirement, Redis optional, session store, migrations, connection pooling

4. **Create `docs/DATA-01-Data-Model-and-Sanitization.md`**:
   - Zod schemas, FORM-SEC-01, sanitization, max lengths, unknown field rejection

5. **Create `docs/OPS-01-Operations-and-Deployment.md`**:
   - Env validation, health checks, graceful shutdown, Redis, monitoring, logs

### Phase 2 — Update Existing Foundational Docs (P0/P1)

1. **Update `docs/00_product_contract.md`**:
   - Add CAP-18 System Privilege, CAP-19 Rate Limiting, CAP-20 Session & CSRF
   - Update to v1.1

2. **Update `docs/01_ui_foundation.md`**:
   - Add SEC-UI tokens (rate limit banner, CSRF error, 429)
   - Add new primitives from landing to taxonomy (announcement banner, metric, pricing toggle, etc)
   - Update to v3.0

3. **Update `docs/02_component_catalog.md`**:
   - Add 7+ new PR primitives: `PR-ANNOUNCEMENT-BANNER`, `PR-METRIC`, `PR-PRICING-TOGGLE`, `PR-TESTIMONIAL-CARD`, `PR-FAQ-ACCORDION`, `PR-CODE-SNIPPET`, `PR-LOGO-STRIP`, `PR-INTEGRATION-TABS`, `PR-FEATURE-CARD`
   - Add 8+ new CO components: `CO-LANDING-HERO`, `CO-LANDING-METRICS`, `CO-LANDING-HOW-IT-WORKS`, `CO-LANDING-PRODUCT-FEATURES`, `CO-LANDING-INTEGRATION`, `CO-LANDING-DEVELOPERS`, `CO-LANDING-TESTIMONIALS`, `CO-LANDING-PRICING`, `CO-LANDING-FAQ`, `CO-LANDING-CTA`
   - Update FORM-SEC-01 reference
   - Update to v3.0

4. **Update `docs/03_page_specifications.md`**:
   - Rewrite `PAGE-PUB-01` with new 9-section structure from proposal
   - Update `PAGE-AUTH-01/02/03` with new visual design
   - Preserve old pipeline/pillars as legacy in `docs/archive/PAGE-PUB-01-legacy.md` or comment
   - Update to v3.0

5. **Update `docs/UI-01-Primitives-Components-Surfaces-Archetypes-Workflows.md`**:
   - Add new primitives, components, surfaces (`SU-LANDING-*`, `SU-AUTH-*`)
   - Add new archetypes if needed (landing page archetype)
   - Update to v3.0

6. **Update `docs/04_workflows.md`**:
   - Add `WF-LANDING-01` (anonymous → hero → how it works → pricing → signup)
   - Add `WF-PRICING-01` (pricing toggle monthly/annual → checkout)
   - Update `WF-AUTH-01` for new auth design
   - Add `WF-EMBED-01` updated for 3 integration modes

---

## 5. Verification Checklist

- [ ] All 6 changed files mapped to foundational docs
- [ ] 5 missing foundational docs created (SEC-01, API-01, DB-01, DATA-01, OPS-01)
- [ ] 5 existing foundational docs updated (00, 01, 02, 03, UI-01, 04)
- [ ] No security hardening lost in doc updates
- [ ] Staging readiness checklist still valid (21/21 PASS in source) after doc updates
- [ ] Atomic commit for audit + doc creation

---

## 6. References

- `docs/STAGING-READINESS-CHECKLIST.md` — 21 gates, 12 vulnerabilities remediated
- `server.ts` (74K) — hardened gateway
- `src/services/sessionAndCsrf.ts`, `rateLimiter.ts`, `requestSchemas.ts`, `systemPrivileged.ts` — security services
- `package.json` — overrides fix + new deps

---

*This audit ensures staging hardening is preserved in foundational docs before pivot to product foundations.*
