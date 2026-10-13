# API-01 — API Design and Middleware

| Field | Value |
| :--- | :--- |
| **Document ID** | `API-01` |
| **Status** | `APPROVED — v1.0` |
| **Owner** | API & Backend |
| **Authority** | Blocking — All API Routes |
| **Dependencies** | `SEC-01`, `DB-01`, `DATA-01`, `00_product_contract`, `STG-01` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Purpose

Canonical API design and middleware pipeline specification, consolidated from Express `server.ts` 74K and planned Next.js migration.

---

## 1. Middleware Pipeline (API-MIDDLEWARE-01)

**Order** (critical, must be preserved):

```
1. Env Validation (fail-fast on boot, not per request)
   ↓
2. Trust Proxy (1 prod, 0 dev)
   ↓
3. Security Headers (HSTS, CSP, X-Frame-Options, etc)
   ↓
4. CORS Exact-Origin (no wildcard, exact match)
   ↓
5. Session (httpOnly, secure prod, sameSite strict, 12h, Redis + fallback, regeneration on login)
   ↓
6. CSRF Double-Submit (cookie + header, constant-time, safe methods exempt, /api/csrf-token exempt)
   ↓
7. Rate Limiting (4 tiers, Redis + fallback, composite key IP+session, 429 + Retry-After)
   ↓
8. Request Validation (Zod schemas, FORM-SEC-01 sanitization, unknown field rejection, max lengths)
   ↓
9. Auth & Privilege (5-Link Auth Chain, hasSystemRole, requireSystemRole, workspace membership, collection visibility filtered before retrieval)
   ↓
10. Route Handler (business logic, DB, usage metering, feature gating)
   ↓
11. Error Handling (generic messages, no stack traces in prod, 401 generic, 403, 404, 422 validation, 429 rate limit, 500)
   ↓
12. Graceful Shutdown (SIGTERM/SIGINT drain)
```

**Express**: Implemented in `server.ts` via `app.use()` order

**Next.js**: Implemented via:
- `middleware.ts` for 1-7 (security, session, CSRF, rate limiting, CORS, headers)
- `src/lib/validation.ts` for 8 (Zod)
- `src/lib/auth.ts` for 9 (privilege)
- `src/app/api/*` route handlers for 10
- `src/app/api/*` error handling for 11
- `src/instrumentation.ts` for 12

---

## 2. Rate Limiting Tiers (API-RATE-LIMIT-01)

See `SEC-01` SEC-RATE-LIMIT-01 for details.

**Mapping to Endpoints**:

| Endpoint | Tier | Limit | Window | Key |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/login` | TIER_AUTH_5_PER_15M | 5 | 15m | IP + email |
| `POST /api/auth/signup` | TIER_AUTH_5_PER_15M | 5 | 15m | IP + email |
| `POST /api/auth/forgot-password` | TIER_AUTH_5_PER_15M | 5 | 15m | IP + email |
| `POST /api/auth/reset-password` | TIER_AUTH_5_PER_15M | 5 | 15m | IP + email |
| `GET /api/collections` | TIER_READ_60_PER_MIN | 60 | 1m | IP + session |
| `POST /api/collections` | TIER_WRITE_20_PER_MIN | 20 | 1m | IP + session |
| `GET /api/files` | TIER_READ_60_PER_MIN | 60 | 1m | IP + session |
| `POST /api/files` | TIER_WRITE_20_PER_MIN | 20 | 1m | IP + session |
| `POST /api/ask` | TIER_WRITE_20_PER_MIN | 20 | 1m | IP + session + metering (queries/mo) |
| `POST /api/feedback` | TIER_WRITE_20_PER_MIN | 20 | 1m | IP + session |
| `GET /api/health` | TIER_GLOBAL_100_PER_MIN | 100 | 1m | IP |
| `GET /api/csrf-token` | TIER_GLOBAL_100_PER_MIN | 100 | 1m | IP |
| All other `/api/*` | TIER_GLOBAL_100_PER_MIN | 100 | 1m | IP + session |

---

## 3. CSRF Contract (API-CSRF-01)

See `SEC-01` SEC-CSRF-01.

**Endpoints Exempt**: `GET /api/csrf-token`, `GET /api/health`, safe methods GET/HEAD/OPTIONS

**Endpoints Protected**: All mutating POST/PUT/PATCH/DELETE

**Header**: `x-csrf-token` or `x-okeng-csrf`

**Cookie**: `okeng.csrf` httpOnly false, secure prod, sameSite strict

---

## 4. Request Validation (API-VALIDATION-01)

**File**: `src/lib/validation.ts` / `src/services/requestSchemas.ts`

**Schemas** (Zod):

| Schema | Fields | Validation |
| :--- | :--- | :--- |
| `loginSchema` | email, password | email format, max 255, password max 128, FORM-SEC-01 |
| `signupSchema` | name, email, password, terms | name max 100, email max 255, password min 8 max 128, terms true, FORM-SEC-01 |
| `forgotPasswordSchema` | email | email format, FORM-SEC-01 |
| `resetPasswordSchema` | token, newPassword, confirmPassword | token required, newPassword min 8 max 128, confirm matches, FORM-SEC-01 |
| `createCollectionSchema` | name, description, visibility | name max 100, description max 500, visibility enum everyone/members/admins, FORM-SEC-01, unknown field rejection |
| `updateCollectionSchema` | name?, description?, visibility? | same, partial |
| `createFileSchema` | title, content, collectionId, filename | title max 200, content max 1M? (or 100k), collectionId UUID, filename max 255, FORM-SEC-01 |
| `updateFileSchema` | title?, content?, next_step? | same |
| `createEmbedSchema` | collectionIds, theme, mode, name | collectionIds array UUID, theme object, mode enum widget/panel/fullscreen/inline/documentation/contextual, name max 100, FORM-SEC-01 |
| `updateEmbedSchema` | collectionIds?, theme?, mode?, name? | same partial |
| `askQuestionSchema` | question, collectionIds?, workspaceSlug, embedId?, userId?, role?, currentUrl? | question max 1000, FORM-SEC-01, collectionIds optional, etc |
| `feedbackSchema` | messageId, helpful, comment? | messageId UUID, helpful boolean, comment max 500, FORM-SEC-01 |

**Rules**:
- Unknown field rejection: `z.object({...}).strict()` — throws if unknown fields present
- Max length enforcement: via Zod `max()`
- FORM-SEC-01: via `refine` checking for <script>, <iframe>, on*=, javascript:, etc — reject if found
- Sanitization: Reject, not strip

---

## 5. API Routes — Inventory

### 5.1 Health & CSRF

| Method | Path | Auth | Rate Limit | Description |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/api/health` | None | GLOBAL 100/min | Health check with DB & Redis status, returns { status: "ok", db: "up", redis: "up", version, uptime } or 503 if down/shutting down |
| GET | `/api/csrf-token` | None | GLOBAL 100/min | Returns { csrfToken } and sets cookie okeng.csrf, exempt from CSRF |

### 5.2 Auth

| Method | Path | Auth | Rate Limit | Description |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/auth/login` | None | AUTH 5/15m | Body loginSchema, returns { user, workspace } + sets session cookie, regenerates session, 401 generic "Credenciales inválidas" if invalid, 429 if rate limited |
| POST | `/api/auth/signup` | None | AUTH 5/15m | Body signupSchema, creates user + workspace, returns { user, workspace } + session, 422 if validation, 409 if email exists (but generic? Actually 409 with "Email already exists" is ok, not enumeration? But better generic? For signup, 409 is ok) |
| POST | `/api/auth/logout` | Session | GLOBAL | Destroys session, clears cookies, returns { success: true } |
| POST | `/api/auth/forgot-password` | None | AUTH 5/15m | Body forgotPasswordSchema, always returns { success: true, message: "Si el correo existe, recibirás un enlace" } generic, no email enumeration, sends email if exists |
| POST | `/api/auth/reset-password` | None (token) | AUTH 5/15m | Body resetPasswordSchema, validates token, resets password, returns { success: true }, 400 if token invalid/expired |

### 5.3 Collections

| Method | Path | Auth | Rate Limit | Description |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/api/collections` | Session (member+) | READ 60/min | Query workspaceSlug, returns collections filtered by visibility (everyone/members/admins based on user role), 403 if not member of workspace |
| POST | `/api/collections` | Session (member+) | WRITE 20/min | Body createCollectionSchema, creates collection, checks metering (collections limit by plan), returns collection, 403 if limit exceeded with upgrade CTA |
| GET | `/api/collections/:id` | Session (member+) | READ | Returns collection if authorized (visibility check), 404 if not found or not authorized (no enumeration) |
| PUT | `/api/collections/:id` | Session (member+) | WRITE | Body updateCollectionSchema, updates collection, 403 if not admin? Actually member can update? Check RBAC — member can create/edit, admin can delete? Define |
| DELETE | `/api/collections/:id` | Session (admin+) | WRITE | Deletes collection and its files/chunks, 403 if not admin |

### 5.4 Files

| Method | Path | Auth | Rate Limit | Description |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/api/files` | Session (member+) | READ | Query workspaceSlug, collectionId?, returns files filtered by collection visibility, scopedCollectionName invariant if collectionId provided |
| POST | `/api/files` | Session (member+) | WRITE | Body createFileSchema or multipart form-data for upload, creates file, triggers ingestion (chunking, embedding), checks metering (files limit, storage), returns file, 403 if limit exceeded |
| GET | `/api/files/:id` | Session (member+) | READ | Returns file if authorized, 404 if not |
| PUT | `/api/files/:id` | Session (member+) | WRITE | Body updateFileSchema, updates file, re-indexes, returns file |
| DELETE | `/api/files/:id` | Session (member+) | WRITE | Deletes file and chunks, returns success |
| POST | `/api/files/:id/reindex` | Session (member+) | WRITE | Re-indexes file (re-chunk, re-embed), returns file with status processing |

### 5.5 Embeds

| Method | Path | Auth | Rate Limit | Description |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/api/embeds` | Session (member+) | READ | Returns embeds for workspace |
| POST | `/api/embeds` | Session (member+) | WRITE | Body createEmbedSchema, creates embed, returns embed, checks plan for mode (fullscreen gated to Pro+) |
| GET | `/api/embeds/:id` | Session (member+) | READ | Returns embed |
| PUT | `/api/embeds/:id` | Session (member+) | WRITE | Body updateEmbedSchema, updates embed |
| DELETE | `/api/embeds/:id` | Session (admin+) | WRITE | Deletes embed |
| POST | `/api/embeds/:id/duplicate` | Session (member+) | WRITE | Duplicates embed |
| GET | `/api/embeds/:id/installation` | Session (member+) | READ | Returns installation guide (React/Vue/JS, server/browser steps, verification) |

### 5.6 Ask & Feedback

| Method | Path | Auth | Rate Limit | Description |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/ask` | None? Or session? Actually embed can be public, but workspace membership for private collections | WRITE 20/min + metering queries/mo | Body askQuestionSchema, performs retrieval (hybrid search) filtered by collection visibility and user role, generates answer with citations, increments usage queries_count, checks metering limit (429 if exceeded with upgrade CTA), returns { answer, sources, cta } |
| POST | `/api/feedback` | Session or embed | WRITE | Body feedbackSchema, creates feedback, returns success |

### 5.7 Billing (from ANALYSIS-001)

| Method | Path | Auth | Rate Limit | Description |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/billing/checkout` | Session (admin+) | WRITE | Body { plan, interval, workspaceId }, creates Stripe Checkout Session, returns { url } |
| POST | `/api/billing/portal` | Session (admin+) | WRITE | Body { workspaceId }, creates Stripe Customer Portal Session, returns { url } |
| POST | `/api/billing/webhooks` | None (Stripe signature) | GLOBAL | Handles Stripe webhooks, updates workspace plan, no auth but validates Stripe signature |

---

## 6. Error Handling (API-ERROR-01)

**Format**: JSON `{ error: "code", message: "human readable", details?: {...}, retryAfter?: number, upgradeUrl?: string }`

**Codes**:

| Status | Code | Message | When |
| :--- | :--- | :--- | :--- |
| 400 | `bad_request` | "Solicitud inválida" | Invalid request, malformed JSON |
| 401 | `unauthorized` | "No autorizado" or "Credenciales inválidas" generic | No session, invalid session, invalid login (generic) |
| 403 | `forbidden` | "No tienes permiso" | Not enough privilege, not member of workspace, collection not visible, limit exceeded (with upgradeUrl) |
| 404 | `not_found` | "No encontrado" | Resource not found or not authorized (no enumeration, same message) |
| 422 | `validation_error` | "Error de validación" + details | Zod validation failed, FORM-SEC-01 violation, unknown field, max length |
| 429 | `rate_limit_exceeded` or `limit_exceeded` | "Demasiadas solicitudes" or "Has alcanzado el límite de X" + retryAfter + upgradeUrl | Rate limiting tier exceeded or metering limit (queries/mo, collections, files) |
| 500 | `internal_error` | "Error interno" | Server error, no stack trace in prod, log error |

**No Stack Traces in Prod**: In production, 500 returns generic message, logs error server-side. In dev, may include stack.

**Generic 401**: Login invalid returns generic "Credenciales inválidas" not "email not found" or "password incorrect" — no enumeration.

**No Email Enumeration**: Forgot password always returns success generic, even if email not exists.

---

## 7. Next.js API Routes Implementation

**File Structure**:

```
src/app/api/
  health/route.ts
  csrf-token/route.ts
  auth/
    login/route.ts
    signup/route.ts
    logout/route.ts
    forgot-password/route.ts
    reset-password/route.ts
  collections/
    route.ts
    [id]/route.ts
  files/
    route.ts
    [id]/route.ts
    [id]/reindex/route.ts
  embeds/
    route.ts
    [id]/route.ts
    [id]/duplicate/route.ts
    [id]/installation/route.ts
  ask/route.ts
  feedback/route.ts
  billing/
    checkout/route.ts
    portal/route.ts
    webhooks/route.ts
```

**Each Route**:

```ts
// Example: src/app/api/collections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext, requireSystemRole } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { createCollectionSchema } from '@/lib/validation';
import { checkLimit, increment } from '@/lib/usage';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Rate limiting
  const rl = await rateLimit(request, 'READ');
  if (!rl.success) return NextResponse.json({ error: "rate_limit_exceeded", message: "Too many requests", retryAfter: rl.retryAfter }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

  // Session; retain SSR refresh/rotation cookie updates for every response.
  const { session, applyToResponse } = await getSessionContext(request);
  const respond = (body: unknown, init?: ResponseInit) => applyToResponse(NextResponse.json(body, init));
  if (!session) return respond({ error: "unauthorized", message: "No autorizado" }, { status: 401 });

  // Privilege
  try { requireSystemRole(session.role, 'member'); } catch { return respond({ error: "forbidden", message: "No tienes permiso" }, { status: 403 }); }

  // Business logic
  // ...
}

export async function POST(request: NextRequest) {
  // Similar + validation + metering + feature gating
}
```

---

## 8. References

- `server.ts` 74K — Express routes inventory
- `src/services/requestSchemas.ts` — Zod schemas
- `SEC-01` — Security foundations
- `DB-01`, `DATA-01` — DB and data model
- `ANALYSIS-001` — Monetization, billing routes
- Next.js App Router docs

---

*API design preserved for Next.js migration.*
