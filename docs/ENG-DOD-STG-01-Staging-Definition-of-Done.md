# ENG-DOD-STG-01 — Staging Engineering Definition of Done & Release Gates

| Field | Value |
| :--- | :--- |
| **Document ID** | `ENG-DOD-STG-01` |
| **Status** | `APPROVED FOR STAGING` |
| **Owner** | Principal Engineering & Security Review Board |
| **Authority** | Release Gate — All Phases (`Phase 01` through `Phase 06`) |
| **Dependencies** | `STG-01`, `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `TEST-01` |
| **Source of Truth** | `docs/`, `supabase/migrations/`, `server.ts`, `src/` |
| **Revision** | `2.1 (2026-10-09)` |

---

## 1. Gated Implementation Phases & Exit Criteria

Implementation of the staging code changes is strictly ordered across six gated phases. A subsequent phase may not begin until the preceding blocking gate's exit criteria are verified.

| Phase | Name | Gate Type | Scope & Deliverables | Verifiable Exit Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 01** | **Architecture & Verified Baseline Audit** | **Blocking Gate** | Complete route inventory (`50` canonical `(Method, Path)` routes), 17-table schema & RLS gap register, browser Supabase usage audit, and approved trust contracts (`SEC-01`, `API-01`). | Baseline audit signed off; zero unverified assumptions regarding existing migrations or routes. |
| **Phase 02** | **Database & Identity Foundations** | **Blocking Gate** | Author and rehearse `20261009000003_okeng_staging_security_hardening.sql` (`DB-01`), composite FKs, hardened `SECURITY DEFINER` helpers, and 3-domain session/token protocols (`SEC-01`). | Migration `00003` succeeds on clean and seeded staging-clone databases (PostgreSQL 15+); `DB-RLS-01..17` and `DB-FK-01..02` pass. |
| **Phase 03** | **Server Boundary & Repositories** | **Blocking Gate** | Implement `OKENG_DATA_MODE` startup validation (`DATA-01`), user-scoped RLS Supabase client, narrow `SystemPrivilegedRepository`, Layer 1–4 validation (`requestSchemas.ts`), and 5-Link ownership checks (`API-01`). | All 50 canonical `(Method, Path)` routes enforce strict schemas and ownership checks; `staging` mode rejects `memory` fallback at startup. |
| **Phase 04** | **Runtime & Cost Protection** | **Blocking Gate** | Implement `RateLimiterAdapter` (Redis Lua + memory adapter), atomic Gemini token reservations (`reserveTokens`/`reconcileTokens`), `AbortController` stream cancellation, and `/api/health/live` + `/api/health/ready` (`OPS-01`). | `TEST-RL-01..04` pass; concurrent requests cannot bypass token budgets; Redis outage fails closed on paid routes. |
| **Phase 05** | **Client Proxy Migration** | **Blocking Gate** | Disarm browser Supabase SDK (`src/lib/supabase/client.ts`), remove client corpus arrays from `src/services/api.ts`, and wire auth/workspace/collection/document/embed UI views to `/api/*` with `X-CSRF-Token`. | Zero direct browser calls to `*.supabase.co`; all UI workflows operate end-to-end through `/api/*`. |
| **Phase 06** | **Staging Cutover & Release Verification** | **Release Gate** | Provision staging secrets, run preflight audit & backup (`STG-01`), apply migration `00003`, deploy immutable build, and execute full `TEST-01` suite. | All 21 Staging Acceptance Checklist items below pass with linked machine-readable test evidence. |

---

## 2. The 21-Gate Staging Acceptance Checklist

Each acceptance gate requires four forms of verification before sign-off: **Governing Spec**, **Target Implementation Module**, **Automated Verification Test ID**, and **Runtime Evidence Artifact**.

### Category 1 — Tenant Isolation (Gates 1–3)
- [ ] **Gate 01**: Workspace A cannot read, mutate, export, share, or delete Workspace B resources across any `/api/*` route (`SEC-01 §3`, `API-01 §3` → `server.ts` → `API-SEC-05`).
- [ ] **Gate 02**: Cross-workspace parent-child relationships (`files`, `documents`, `document_versions`, `document_chunks`, `conversations`, `conversation_messages`, `shared_snapshots`, `issue_reports`) are rejected at the PostgreSQL constraint layer (`DB-01 §4` → `20261009000003_okeng_staging_security_hardening.sql` → `DB-FK-01`, `DB-FK-02`).
- [ ] **Gate 03**: Positive and negative RLS isolation tests pass across all 17 public tables and `storage.objects` under `FORCE ROW LEVEL SECURITY` (`DB-01 §2, §5` → `DB-RLS-01..17`, `DB-STG-01`).

### Category 2 — Authentication & Authorization (Gates 4–6)
- [ ] **Gate 04**: Expired, malformed, wrong-audience (`aud`), wrong-issuer (`iss`), algorithm-tampered (`alg`), key-injected (`jwk`/`jku`), and replayed (`jti`) tokens are deterministically rejected (`SEC-01 §2.2` → `src/services/embedAuthorization.ts` → `API-SEC-02`).
- [ ] **Gate 05**: Exact-origin validation and session-bound HMAC `X-CSRF-Token` verification are enforced and tested on all Domain A state-changing routes, with zero state mutations on `GET` (`SEC-01 §2.1` → `server/middleware/sessionAndCsrf.ts` → `API-SEC-01`).
- [ ] **Gate 06**: Revoked/suspended workspace memberships (`wm.status <> 'ACTIVE'`), disabled embeds (`status = 'draft'`), and narrowed collection scopes immediately invalidate access on the next request (`SEC-01 §2.3`, `DB-01 §3` → `TEST-EMB-03..04`).

### Category 3 — Request Boundaries & Validation (Gates 7–9)
- [ ] **Gate 07**: Every route in the 50-endpoint canonical `(Method, Path)` registry has an explicit authentication domain, 5-Link permission rule, and Layer 1–4 validation contract (`API-01 §2–3` → `server/middleware/requestSchemas.ts`).
- [ ] **Gate 08**: Route-specific payload caps (`16KB` Auth, `64KB` Default, `256KB` Chat/Doc, `10MB` File Upload) reject oversized bodies with `413` before expensive processing (`API-01 §1` → `server.ts` → `API-SEC-07`).
- [ ] **Gate 09**: Unknown fields (`.strict()`) and client-supplied ownership, role, permission, corpus (`documents[]`, `collections[]`, `embeds[]`), publicity (`isPublicDocument`), and secret (`signingSecret`) overrides are rejected (`API-01 §3` → `API-SEC-04`, `API-SEC-06`).

### Category 4 — AI & Retrieval Safety (Gates 10–12)
- [ ] **Gate 10**: Unauthorized or soft-deleted documents never enter BM25 retrieval candidates, compiled responses, cache lookup keys, or Gemini LLM context (`SEC-01 §1`, `ENGINE-01` → `server.ts`, `src/repositories/index.ts` → `TEST-AI-01`).
- [ ] **Gate 11**: Returned citations, snippets, and next-step CTAs are strictly filtered by the caller's verified `AuthorizationScope` (`EMBED-01` → `src/services/embedAuthorization.ts`).
- [ ] **Gate 12**: Atomic Redis token budget reservations (`reserveTokens`/`reconcileTokens`), `maxOutputTokens: 1024`, `15s` upstream timeouts, `req.on('close')` stream cancellation, and provider circuit-breaker fallbacks pass concurrency and fault-injection tests (`OPS-01 §2` → `server/middleware/rateLimiter.ts` → `TEST-RL-02..04`).

### Category 5 — Data Integrity & Migrations (Gates 13–15)
- [ ] **Gate 13**: Migrations `00001`, `00002`, and `00003` succeed deterministically on both an empty database and a seeded staging-clone database (`DB-01 §6`, `STG-01 §3`).
- [ ] **Gate 14**: Preflight constraint violation queries, `NOT VALID` → `VALIDATE CONSTRAINT` checks, backup creation, and snapshot restoration are rehearsed and documented (`DB-01 §6.1–6.3`, `STG-01 §3–4`).
- [ ] **Gate 15**: Immutability of `security_audit_logs`, `usage_records`, `document_versions`, and `conversation_messages`, plus two-phase file upload orphan reconciliation and last-owner protection (`trg_protect_last_workspace_owner`), are verified (`DB-01 §2`, `DATA-01 §4` → `DB-RLS-03`, `DB-RLS-05`, `DB-RLS-06`).

### Category 6 — Deployment & Operations (Gates 16–18)
- [ ] **Gate 16**: When `OKENG_ENV` is `staging` or `production`, the server fails startup immediately (`exit(1)`) if `OKENG_DATA_MODE !== 'supabase'` or if any required P0 secret is missing (`STG-01 §1–2`, `DATA-01 §1`).
- [ ] **Gate 17**: Zero silent fallback to in-memory seed data (`INITIAL_DOCUMENTS` / `fallback*`) occurs during runtime database or storage failures in `staging` or `production` (`DATA-01 §1–2`).
- [ ] **Gate 18**: `/api/health/live` and capability-scoped `/api/health/ready` probes, PII-redacted structured logs, security audit events, and the 3-part rollback/containment procedures are verified (`OPS-01 §3–4`, `STG-01 §4`).

### Category 7 — End-to-End Product Regression (Gates 19–21)
- [ ] **Gate 19**: Server-proxied login/signup/logout, workspace governance, collection CRUD, two-phase file upload, deterministic & generative retrieval, and host embed sessions work end-to-end without direct browser-to-Supabase requests (`API-01 §5`).
- [ ] **Gate 20**: UI loading, validation error, `429` rate-limit `Retry-After` countdown, and `503` degraded-service states render cleanly in both English (`en`) and Spanish (`es`) (`PublicSurfaceView.tsx`, `I18N-001`).
- [ ] **Gate 21**: Existing approved product contracts (Homepage 5-Stage Guided Tour, deterministic response compiler `ENGINE-01`, multi-layer scoped cache `CACHE-001`, and `RENDER-001` AST sanitizer) pass 100% of readiness and regression tests (`tests/readiness/homepage-tour-readiness.test.ts`, `tests/rendering/embed-authorization.test.ts`).
