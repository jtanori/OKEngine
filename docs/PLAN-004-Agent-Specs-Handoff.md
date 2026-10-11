# PLAN-004 — Agent Specs Handoff: Fully Detailed Spec for Multi-Agent Collaboration

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-004` |
| **Status** | `APPROVED — EXECUTION PENDING` |
| **Owner** | Principal Engineering & Agent Orchestration |
| **Authority** | Blocking — Agent Handoff & Onboarding |
| **Dependencies** | `00_product_contract`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications`, `04_workflows`, `UI-01`, `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `PLAN-000..005`, `AUDIT-001`, `ANALYSIS-001` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Goal

Create fully detailed spec on all agent specs up to current standards for handoff to another agent (or human) without issues. Must be detailed enough that a new agent can onboard, understand product, design system, security, API, DB, workflows, landing/auth redesign, monetization, Next.js architecture, and execute tasks without asking clarifying questions.

---

## 1. Agent Roles & Responsibilities

### 1.1 Agent Taxonomy

| Agent ID | Role | Scope | Handoff Artifact |
| :--- | :--- | :--- | :--- |
| `AGENT-001` | Product & Contract Owner | Owns `00_product_contract`, capabilities, invariant, monetization | `docs/AGENT-001-Product-Owner.md` |
| `AGENT-002` | Design System & UI Foundation | Owns `01_ui_foundation`, `UI-01`, DS tokens, PR taxonomy, principles, visual direction | `docs/AGENT-002-Design-System-Owner.md` |
| `AGENT-003` | Component Catalog & Implementation | Owns `02_component_catalog`, PR and CO implementation in `src/components/ui/` and `src/components/landing/`, `src/components/auth/` | `docs/AGENT-003-Component-Owner.md` |
| `AGENT-004` | Page Specs & Surfaces | Owns `03_page_specifications`, `04_workflows`, SU, PA, WF, page implementation in `src/app/` and `src/pages/` | `docs/AGENT-004-Page-Spec-Owner.md` |
| `AGENT-005` | Security & Auth | Owns `SEC-01`, `AUTH-01..05`, `FORM-SEC-01`, sessionAndCsrf, rateLimiter, requestSchemas, systemPrivileged, 5-Link Auth Chain | `docs/AGENT-005-Security-Owner.md` |
| `AGENT-006` | API & Backend | Owns `API-01`, `DB-01`, `DATA-01`, API routes, middleware, Zod schemas, DB migrations, Redis | `docs/AGENT-006-API-Owner.md` |
| `AGENT-007` | Operations & Deployment | Owns `OPS-01`, `STG-01`, `ENG-DOD-STG-01`, `STAGING-READINESS-CHECKLIST`, env validation, health checks, graceful shutdown, monitoring | `docs/AGENT-007-Ops-Owner.md` |
| `AGENT-008` | Landing & Marketing | Owns `PLAN-001`, `SU-LANDING-*`, `CO-LANDING-*`, `PA-LANDING`, `WF-LANDING-01`, `WF-PRICING-01`, landing implementation, copy, i18n, metrics | `docs/AGENT-008-Landing-Owner.md` |
| `AGENT-009` | Auth & Onboarding | Owns `PLAN-002`, `SU-AUTH-*`, `CO-AUTH-*`, `PA-AUTH`, `WF-AUTH-*`, auth implementation, onboarding | `docs/AGENT-009-Auth-Owner.md` |
| `AGENT-010` | Monetization & Pricing | Owns `ANALYSIS-001`, pricing tiers, feature matrix, usage metering, billing integration, checkout | `docs/AGENT-010-Monetization-Owner.md` |
| `AGENT-011` | Next.js Architecture & Migration | Owns `PLAN-005`, Next.js App Router, API Routes, middleware.ts, removal of Vite+Express hybrid, `src/app/api/*` | `docs/AGENT-011-Nextjs-Arch-Owner.md` |
| `AGENT-012` | QA & Readiness | Owns `TEST-01`, `homepage-tour-readiness`, `embed-authorization`, `baseline`, staging runtime verification, `STAGING-READINESS-CHECKLIST` | `docs/AGENT-012-QA-Owner.md` |

### 1.2 Agent Interaction Model

```
AGENT-001 (Product) ─┬─> AGENT-002 (Design System) ─┬─> AGENT-003 (Components) ─┬─> AGENT-004 (Pages)
                     │                              │                          └─> AGENT-008 (Landing)
                     │                              └─> AGENT-009 (Auth)
                     ├─> AGENT-005 (Security) ──────┬─> AGENT-006 (API)
                     │                              └─> AGENT-009 (Auth)
                     ├─> AGENT-006 (API) ───────────┬─> AGENT-007 (Ops)
                     │                              └─> AGENT-011 (Next.js)
                     ├─> AGENT-010 (Monetization) ──> AGENT-008 (Landing pricing)
                     └─> AGENT-012 (QA) ────────────> All
```

**Handoff Contract**: Each agent must produce:

1. **Spec Doc** (`docs/AGENT-XXX-*.md`): Role, scope, dependencies, invariants, current state, gaps, plan, acceptance criteria, references
2. **Implementation**: Code in assigned directories, following DS tokens, PR/CO/SU/PA/WF specs, FORM-SEC-01, security, tests
3. **Tests**: Update or create tests for assigned area, ensure no regressions
4. **Docs Update**: Update foundational docs for assigned area to v3.0
5. **Atomic Commit**: Commit with message `feat(AGENT-XXX): <scope> — <what> (PLAN-YYY)` and push to `arena/ead2cd90-okengine`

---

## 2. Agent Spec Template (Up to Standards)

Each `AGENT-XXX` spec must follow this template (same as PLAN docs):

```markdown
# AGENT-XXX — <Role>

| Field | Value |
| :--- | :--- |
| **Document ID** | `AGENT-XXX` |
| **Status** | `APPROVED` |
| **Owner** | <Role> |
| **Authority** | <Blocking or Advisory> |
| **Dependencies** | <List> |
| **Revision** | `1.0 (2026-10-11)` |

## 0. Role & Scope
- Role: ...
- Scope: files, docs, surfaces, components owned
- Not in scope: ...

## 1. Current State
- What exists now (files, docs, implementation)
- Gaps vs desired state

## 2. Invariants & Contracts
- Must preserve (e.g., Files→Collections→Access→Context→Answer, 5-Link Auth Chain, FORM-SEC-01, exact-origin, etc)
- Must not break (tests, security, i18n, a11y)

## 3. Detailed Plan
- Phase 1, 2, 3 with deliverables, files to create/update, acceptance

## 4. Implementation Details
- Code structure, props, DS tokens, a11y, security, i18n

## 5. Testing & Verification
- Tests to update/create, manual verification, security verification

## 6. Handoff Checklist
- [ ] Spec doc created
- [ ] Implementation done
- [ ] Tests updated, passing
- [ ] Foundational docs updated
- [ ] Atomic commit + push
- [ ] No regressions

## 7. References
- Foundational docs, plans, source files
```

---

## 3. Detailed Agent Specs — Outline for Each

### AGENT-001 — Product & Contract Owner

- **Scope**: `docs/00_product_contract.md` v1.1, `ANALYSIS-001`, product truth, capabilities CAP-01..21, invariant
- **Invariants**: Files→Collections→Access→Context→Answer, 17+ capabilities, no client corpus, exact-origin, real metrics only
- **Current State**: v1.0, 17 capabilities, missing CAP-18..21 (from AUDIT-001 and ANALYSIS-001)
- **Plan**: Update to v1.1 with CAP-18 System Privilege, CAP-19 Rate Limiting, CAP-20 Session & CSRF, CAP-21 Marketing & Monetization; add monetization section; preserve invariant
- **Deliverables**: Updated `00_product_contract.md` v1.1, `ANALYSIS-001` review

### AGENT-002 — Design System & UI Foundation Owner

- **Scope**: `docs/01_ui_foundation.md` v3.0, `docs/UI-01` v3.0 DS tokens, PR taxonomy, principles, visual direction, `src/index.css`
- **Invariants**: Quiet Technical, 9+4 principles, DS tokens single source, 4-tier control height, no hardcoded colors, real metrics only
- **Current State**: v2.0, missing shadow, radius lg, hero/section typography, 16 new PR, editorial layer
- **Plan**: Update DS tokens in `src/index.css` and docs, add principles 10-13, add 16 new PR to taxonomy, update sidebar posture note, v3.0
- **Deliverables**: Updated `src/index.css`, `01_ui_foundation.md` v3.0, `UI-01` DS section v3.0

### AGENT-003 — Component Catalog & Implementation Owner

- **Scope**: `docs/02_component_catalog.md` v3.0, `src/components/ui/` (16 existing + 16 new PR), `src/components/landing/` (12 new CO), `src/components/auth/` (6 new CO)
- **Invariants**: All components consume DS tokens, PR taxonomy, sizeVariant, a11y, FORM-SEC-01, no hardcoded colors
- **Current State**: 16 PR, 10 CO (workspace), missing 16 PR and 18 CO for landing/auth
- **Plan**: Create 16 new PR primitives, 18 new CO components, update catalog to v3.0, implement with DS tokens, a11y, i18n
- **Deliverables**: 16 PR files, 18 CO files, updated `02_component_catalog.md` v3.0, barrel exports

### AGENT-004 — Page Specs & Surfaces Owner

- **Scope**: `docs/03_page_specifications.md` v3.0, `docs/04_workflows.md` v2.0, `docs/UI-01` SU/PA/WF sections v3.0, `src/app/(public)/page.tsx`, `src/app/(auth)/*`, `src/pages/PublicSurfaceView.tsx`, `src/components/landing/LandingView.tsx`, `src/components/auth/AuthView.tsx`
- **Invariants**: PA-LANDING (12 surfaces, max-w-7xl, no sidebar), PA-AUTH (centered card, canvas #F8F7F4), WF-LANDING-01, WF-PRICING-01, WF-AUTH-*, preserve old tour contract idea
- **Current State**: PAGE-PUB-01 old 5-stage tour, PAGE-AUTH old design, no PA-LANDING/PA-AUTH, no WF-LANDING/PRICING/AUTH new
- **Plan**: Rewrite PAGE-PUB-01 to 12-surface landing, rewrite PAGE-AUTH-01/02/03 to PA-AUTH card, add 6 workflows, implement LandingView and AuthView, update app routes, preserve legacy in archive
- **Deliverables**: Updated `03_page_specifications.md` v3.0, `04_workflows.md` v2.0, `UI-01` SU/PA/WF v3.0, `LandingView.tsx`, `AuthView.tsx`, updated `src/app/*` pages, legacy archive

### AGENT-005 — Security & Auth Owner

- **Scope**: `docs/SEC-01-Security-Foundations.md` v1.0, `AUTH-01..05`, `FORM-SEC-01`, `src/services/sessionAndCsrf.ts`, `rateLimiter.ts`, `requestSchemas.ts`, `systemPrivileged.ts`, `server.ts` security middleware, Next.js `middleware.ts`
- **Invariants**: 5-Link Auth Chain, FORM-SEC-01 everywhere, exact-origin CORS, no client corpus, TIER_AUTH_5_PER_15M, double-submit CSRF, httpOnly/secure/sameSite=strict/12h/Redis, constant-time compare, generic 401, no email enumeration
- **Current State**: Hardened in server.ts (74K), 4 new services, but docs missing (SEC-01 not created), Next.js migration needs to preserve
- **Plan**: Create SEC-01 v1.0 consolidating all hardening, ensure Next.js middleware preserves security, no regressions, update FORM-SEC-01 reference
- **Deliverables**: `SEC-01` v1.0, `middleware.ts` (Next.js) preserving security, verification that TEST-01 still PASS, updated `02_component_catalog` FORM-SEC-01 ref

### AGENT-006 — API & Backend Owner

- **Scope**: `docs/API-01-API-Design-and-Middleware.md` v1.0, `docs/DB-01`, `docs/DATA-01`, `src/app/api/*` (Next.js API routes), middleware pipeline, Zod schemas, DB migrations, Redis
- **Invariants**: Middleware pipeline order (env → trust proxy → headers → CORS → session → CSRF → rate limit → validation → handler), Zod unknown field rejection, FORM-SEC-01, rate limiting tiers, 429 + Retry-After
- **Current State**: Express gateway in server.ts, no Next.js API routes, Zod schemas in requestSchemas.ts, no DB-01/DATA-01/API-01 docs
- **Plan**: Create API-01, DB-01, DATA-01 v1.0, migrate Express routes to Next.js `src/app/api/*` routes, preserve middleware logic, create `src/lib/db.ts`, `src/lib/redis.ts`, `src/lib/env.ts`
- **Deliverables**: API-01, DB-01, DATA-01 v1.0, `src/app/api/*` routes, `src/lib/*`, `middleware.ts`, updated `server.ts` as legacy or removed

### AGENT-007 — Operations & Deployment Owner

- **Scope**: `docs/OPS-01-Operations-and-Deployment.md` v1.0, `docs/STAGING-READINESS-CHECKLIST.md`, `ENG-DOD-STG-01`, `STG-01`, env validation, health checks, graceful shutdown, Redis, monitoring, logs, deployment
- **Invariants**: Env validation fail-fast, health check /api/health with DB & Redis status, graceful shutdown SIGTERM/SIGINT drain, Redis optional with fallback warning, trust proxy 1 prod 0 dev, no hardcoded secrets
- **Current State**: Hardened in server.ts, checklist 21/21 PASS source 0/21 runtime, no OPS-01 doc
- **Plan**: Create OPS-01 v1.0, preserve checklist, plan re-verification after Next.js migration, document env vars, health, graceful, Redis, monitoring
- **Deliverables**: OPS-01 v1.0, updated checklist with Next.js notes, env validation in `src/lib/env.ts`, health route in Next.js

### AGENT-008 — Landing & Marketing Owner

- **Scope**: `PLAN-001`, `SU-LANDING-*` (13), `CO-LANDING-*` (12), `PA-LANDING`, `WF-LANDING-01`, `WF-PRICING-01`, landing implementation, copy, i18n, metrics, `src/components/landing/`
- **Invariants**: Real metrics only, accurate product truth, EN/ES i18n, a11y, no fabricated metrics, 12 surfaces, editorial whitespace, shadow restraint, DS tokens
- **Current State**: Old landing in PublicSurfaceView 2262 lines, no new primitives/components, no PA-LANDING, no WF-LANDING
- **Plan**: Implement per PLAN-001: DS tokens update, 12 PR + 12 CO, LandingView, page spec update, copy from product truth, i18n, a11y, preserve legacy
- **Deliverables**: PLAN-001, 12 PR, 12 CO, LandingView, updated PAGE-PUB-01, WF-LANDING-01, WF-PRICING-01, i18n keys, tests updated

### AGENT-009 — Auth & Onboarding Owner

- **Scope**: `PLAN-002`, `SU-AUTH-*` (5), `CO-AUTH-*` (6), `PA-AUTH`, `WF-AUTH-*` (4), auth implementation, onboarding, `src/components/auth/`
- **Invariants**: PA-AUTH centered card, canvas #F8F7F4, white surface, cobalt accent, rounded-lg, shadow-md, FORM-SEC-01, 5-Link Auth Chain, TIER_AUTH_5_PER_15M, generic 401, no email enumeration, empty initial values, placeholder+hint, field-level validation
- **Current State**: Old auth in PublicSurfaceView, no new PR/CO, no PA-AUTH, old PAGE-AUTH
- **Plan**: Implement per PLAN-002: 4 PR + 6 CO, AuthView, page spec update, copy, i18n, a11y, security verification
- **Deliverables**: PLAN-002, 4 PR, 6 CO, AuthView, updated PAGE-AUTH specs, WF-AUTH-*, i18n keys, security verification

### AGENT-010 — Monetization & Pricing Owner

- **Scope**: `ANALYSIS-001`, pricing tiers, feature matrix, usage metering, billing integration, checkout, `SU-LANDING-PRICING`, `CO-LANDING-PRICING`
- **Invariants**: Pricing tiers Starter 0€ 1k queries, Pro 31€/mo 10k, Escala custom, monthly/annual toggle -20%, feature matrix accurate, no fabricated limits, real metrics
- **Current State**: No monetization analysis, pricing copy from proposal but not validated with product
- **Plan**: Analyze product for monetization features (collections, files, queries, seats, SSO, BYOK, analytics, support), define feature matrix, usage metering, billing integration plan (Stripe), checkout flow, update pricing component
- **Deliverables**: ANALYSIS-001 v1.0, feature matrix, pricing tiers spec, billing integration plan, updated `CO-LANDING-PRICING` with accurate limits

### AGENT-011 — Next.js Architecture & Migration Owner

- **Scope**: `PLAN-005`, Next.js App Router, API Routes, `middleware.ts`, removal of Vite+Express hybrid, `src/app/api/*`, `src/lib/*`, `vite.config.ts` removal, `server.ts` legacy
- **Invariants**: Proper Next.js standard, no Vite runner, no Express weirdness, App Router, API Routes, middleware preserves security (session, CSRF, rate limiting, CORS, headers), env validation, health, graceful
- **Current State**: Hybrid: Vite + Express server.ts 74K + Next.js App Router, vite.config.ts, server.ts as gateway, no middleware.ts, no src/app/api/*, no src/lib/*
- **Plan**: Per PLAN-005: create middleware.ts preserving security, create src/app/api/* routes from Express routes, create src/lib/* (db, redis, env, auth), update next.config.js, remove vite.config.ts, keep server.ts as legacy reference then remove, update package.json scripts, verify TEST-01 still PASS
- **Deliverables**: PLAN-005, `middleware.ts`, `src/app/api/*` routes, `src/lib/*`, updated `next.config.js`, removed `vite.config.ts` and `server.ts` (or legacy), updated package.json, verification

### AGENT-012 — QA & Readiness Owner

- **Scope**: `TEST-01`, `homepage-tour-readiness`, `embed-authorization`, `baseline`, staging runtime verification, `STAGING-READINESS-CHECKLIST`
- **Invariants**: 52/52 homepage-tour, 29/29 embed-auth, 12/12 baseline guards must PASS, no regressions, staging runtime verification needs live PG15+ & Redis
- **Current State**: Checklist 21/21 PASS source, 0/21 runtime, tests passing in source (with dev secret patch for Zero-length key)
- **Plan**: Update tests for new landing/auth visual (preserve intent), re-run after Next.js migration, ensure no regressions, document runtime verification steps for staging, update checklist to reflect Next.js architecture
- **Deliverables**: Updated tests (homepage-tour, embed-auth, baseline), re-verification after migration, updated checklist with Next.js notes, runtime verification guide

---

## 4. Handoff Contract — Detailed

### 4.1 Onboarding Steps for New Agent

1. **Read PLAN-000**: Understand master consolidation, 8 tracks, halt staging decision
2. **Read AUDIT-001**: Understand staging hardening changes, missing foundational docs
3. **Read Product Contract**: `docs/00_product_contract.md` v1.0 (will be v1.1) — invariant, capabilities
4. **Read Design System**: `docs/01_ui_foundation.md` v2.0 (will be v3.0), `docs/UI-01` v2.0 (will be v3.0), `src/index.css` tokens
5. **Read Component Catalog**: `docs/02_component_catalog.md` v2.0 (will be v3.0)
6. **Read Page Specs**: `docs/03_page_specifications.md` v2.0 (will be v3.0), `docs/04_workflows.md` v1.0 (will be v2.0)
7. **Read Plans**: PLAN-001 (landing), PLAN-002 (auth), PLAN-003 (visual direction), PLAN-005 (Next.js), ANALYSIS-001 (monetization)
8. **Read Security**: `server.ts` (74K), `sessionAndCsrf.ts`, `rateLimiter.ts`, `requestSchemas.ts`, `systemPrivileged.ts`, future `SEC-01`
9. **Read Staging Checklist**: `docs/STAGING-READINESS-CHECKLIST.md` — 21 gates, 12 vulns remediated
10. **Explore Code**: `src/components/ui/` (16 PR), `src/components/landing/` (to be created), `src/components/auth/` (to be created), `src/app/(public)/page.tsx`, `src/app/(auth)/*`, `src/pages/PublicSurfaceView.tsx` (2262 lines legacy), `src/app/api/*` (to be created)
11. **Run Tests**: `npm run test:staging-readiness`, `test:homepage-tour-readiness`, `test:embed-authorization` — ensure PASS
12. **Check Branch**: `arena/ead2cd90-okengine`, commit `debf205` latest, 21/21 PASS source

### 4.2 Task Execution Protocol

- **Pick Agent Role**: Based on task (e.g., landing → AGENT-008, auth → AGENT-009, security → AGENT-005, etc)
- **Read Agent Spec**: `docs/AGENT-XXX-*.md` for role, scope, invariants, plan
- **Read Relevant Plans**: PLAN-001..005, AUDIT-001, ANALYSIS-001 for context
- **Implement**: Code in assigned directories, following DS tokens, PR/CO/SU/PA/WF specs, FORM-SEC-01, security, i18n, a11y
- **Update Docs**: Update foundational docs for assigned area to v3.0, keep revision history
- **Test**: Update/create tests, ensure no regressions, run TEST-01 suites
- **Commit**: Atomic commit with message `feat(AGENT-XXX): <scope> — <what> (PLAN-YYY)` and push to `arena/ead2cd90-okengine`
- **Handoff**: Update `docs/AGENT-XXX-*.md` with completion, next steps, blockers

### 4.3 Communication & Blocking

- **Blocking**: If agent blocked (e.g., needs DS tokens from AGENT-002), document blocker in spec, notify via commit message or docs/AGENT-XXX blockers section
- **Non-blocking**: If can proceed with stub (e.g., create component with placeholder tokens), proceed and note TODO
- **Security**: Any security change must be reviewed by AGENT-005 and AGENT-012, must preserve 5-Link Auth Chain, FORM-SEC-01, etc, must PASS TEST-01

### 4.4 Standards Compliance Checklist (for each agent)

- [ ] Spec doc follows template (Document ID, Status, Owner, Authority, Dependencies, Revision, sections)
- [ ] Code consumes DS tokens via @theme, no hardcoded colors
- [ ] PR taxonomy respected (sizeVariant, a11y, props)
- [ ] CO composition from PR, not direct HTML
- [ ] SU surfaces defined, PA archetypes respected
- [ ] WF workflows documented
- [ ] FORM-SEC-01 enforced (sanitization, placeholder+hint, field-level validation, isLoading, generic errors)
- [ ] Security invariants preserved (5-Link Auth Chain, exact-origin, no client corpus, rate limiting, CSRF)
- [ ] i18n EN/ES via useI18n() or props
- [ ] A11y: landmark roles, heading hierarchy, aria-*, keyboard navigation
- [ ] No console errors, no hardcoded secrets
- [ ] Tests updated, passing, no regressions
- [ ] Foundational docs updated to v3.0 (or v1.1/v2.0)
- [ ] Atomic commit + push to arena/ead2cd90-okengine
- [ ] Handoff checklist in spec doc checked

---

## 5. Deliverables for This Plan

- [ ] This plan doc (PLAN-004)
- [ ] 12 agent spec docs `docs/AGENT-001-*.md` .. `docs/AGENT-012-*.md` v1.0 following template
- [ ] Handoff contract documented
- [ ] Onboarding steps documented
- [ ] Task execution protocol documented
- [ ] Standards compliance checklist
- [ ] Atomic commit + push

---

## 6. References

- PLAN-000: Master consolidation
- AUDIT-001: Staging changes audit
- PLAN-001: Landing redesign
- PLAN-002: Auth redesign
- PLAN-003: Visual direction update
- PLAN-005: Next.js architecture
- ANALYSIS-001: Monetization (to be created)
- Foundational docs: 00, 01, 02, 03, 04, UI-01, SEC-01, API-01, DB-01, DATA-01, OPS-01
- Code: server.ts, sessionAndCsrf.ts, rateLimiter.ts, requestSchemas.ts, systemPrivileged.ts, src/components/ui/, src/components/landing/, src/components/auth/, src/app/
- Tests: homepage-tour-readiness, embed-authorization, baseline, staging-readiness
- Branch: arena/ead2cd90-okengine, commit debf205

---

*Plan up to standards — ready for execution, enables handoff to any agent without issues.*
