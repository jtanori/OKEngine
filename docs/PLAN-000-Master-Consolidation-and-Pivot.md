# PLAN-000 — Master Consolidation & Pivot: Halt Staging, Complete Product & Architecture Foundations

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-000` |
| **Status** | `APPROVED — EXECUTION IN PROGRESS` |
| **Owner** | Principal Engineering & Product |
| **Authority** | Blocking — All Phases |
| **Dependencies** | `ENG-DOD-STG-01`, `STG-01`, `00_product_contract`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications`, `UI-01` |
| **Revision** | `1.0 (2026-10-11)` |
| **Decision** | Halt staging cutover, consolidate readiness checklist, complete product foundations before day-1 staging |

---

## 0. Executive Decision

Per user direction 2026-10-11, we **halt staging deployment** (even though 12/12 vulnerabilities remediated, 21/21 gates PASS in source) to complete 7 additional foundational tracks that must be present in staging from day 1.

**Rationale**: Staging without polished marketing landing, auth, monetization, and proper Next.js architecture would require re-cutover and migration. Better to consolidate now.

**Consolidated Checklist Status**: `docs/STAGING-READINESS-CHECKLIST.md` preserved as preparation evidence (21/21 PASS in source, 0/21 STAGING_RUNTIME_VERIFIED awaiting live PG15+ & Redis). Will be re-verified after tracks 1-7 complete.

---

## 1. Eight-Track Execution Plan

| Track | Title | Deliverables | Priority | Estimated Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Track 1** | Landing Page Full Incorporation | PLAN-001, DS tokens update, 12+ new PR primitives, 8+ new CO components, SU-LANDING surfaces, PAGE-PUB-01 spec update, copy from product analysis, implementation in `PublicSurfaceView.tsx` + Next.js `src/app/(public)/page.tsx` | **P0** | Large — design system + components + page |
| **Track 2** | Audit Staging Changes vs Foundational Docs | AUDIT-001, updated `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications` | **P0** | Medium — doc audit & sync |
| **Track 3** | Auth Pages Design Integration | PLAN-002, SU-AUTH surfaces, PAGE-AUTH-01/02/03 spec update, implementation in `PublicSurfaceView.tsx` + `src/app/(auth)/*` | **P0** | Medium — surfaces + page |
| **Track 4** | Visual Direction Update Plan for All Foundational Docs | PLAN-003, updated `UI-01`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications`, `04_workflows`, design system migration guide | **P1** | Large — doc updates |
| **Track 5** | Agent Specs — Full Detailed Spec | PLAN-004, `AGENT-001`..`AGENT-00N` specs, handoff contract, standards compliance checklist | **P1** | Large — specs |
| **Track 6** | Monetization Feature Analysis | ANALYSIS-001, pricing tiers, feature matrix, usage metering, billing integration plan | **P1** | Medium — analysis |
| **Track 7** | Proper Next.js Architecture | PLAN-005, migration from Vite+Express hybrid to Next.js 14+ App Router + API Routes, removal of `server.ts` legacy, `src/app/api/*` routes, middleware, env validation | **P0** | Large — architecture |
| **Track 8** | Atomic Commits & Push | Git history with atomic commits per track, push to `arena/ead2cd90-okengine` | **P0** | Continuous |

---

## 2. Track Dependencies & Order

```
Track 2 (Audit staging changes) ─┬─> Track 4 (Visual direction update plan)
                                 ├─> Track 1 (Landing) ─┬─> Track 3 (Auth)
                                 │                       └─> Track 6 (Monetization - needs landing copy)
Track 7 (Next.js arch) ──────────┴─> Track 1 & 3 implementation in Next.js
Track 5 (Agent specs) ───────────> Depends on all plans being detailed
Track 8 (Commits) ───────────────> Continuous
```

**Recommended Execution Order**:
1. **Phase A — Foundation Audit** (Track 2 + Track 7 plan): Understand current state, audit staging changes, plan Next.js migration
2. **Phase B — Design System & Visual Direction** (Track 4 plan + DS tokens): Define new visual direction from proposal, update foundational docs
3. **Phase C — Landing & Auth** (Track 1 + Track 3): Implement landing and auth with new primitives, accurate copy from product analysis
4. **Phase D — Monetization & Agent Specs** (Track 6 + Track 5): Analyze monetization, create agent handoff specs
5. **Phase E — Architecture Migration** (Track 7 implementation): Move from Vite+Express to Next.js standard
6. **Phase F — Re-verify Staging Readiness**: Re-run TEST-01 suites against new architecture, update STAGING-READINESS-CHECKLIST

---

## 3. Acceptance Criteria

- [ ] All 8 tracks have detailed plan docs up to standards (Document ID, Status, Owner, Authority, Dependencies, Revision, sections)
- [ ] Foundational docs (`00_product_contract`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications`, `04_workflows`, `UI-01`, `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`) audited and updated
- [ ] Landing page from proposal fully incorporated into home page with new primitives/components/surfaces/archetypes
- [ ] Auth pages design integrated
- [ ] Visual direction update plan covers design system, primitives, components, archetypes, specs, workflows
- [ ] Agent specs detailed enough for handoff to another agent without issues
- [ ] Monetization analysis identifies features to ship
- [ ] Next.js architecture proper, no Vite runner + Express hybrid weirdness
- [ ] Atomic commits and push to repo

---

## 4. Risk Mitigation

- **Risk**: Landing redesign breaks 52/52 homepage-tour-readiness tests
  - **Mitigation**: Preserve `hero-what-is-okeng-cta` ref, `HomepageGuidedTour`, `EMB-PUBLIC-DOCS` boundary, pipeline, pillars, i18n. Update tests to new visual structure, not delete them. Keep old idea/components in `docs/archive/` or `src/components/public/legacy/`

- **Risk**: Next.js migration breaks staging hardening
  - **Mitigation**: Preserve middleware logic (sessionAndCsrf, rateLimiter, requestSchemas) in Next.js `middleware.ts` + API route guards. Re-verify TEST-01 suites after migration. Keep `server.ts` hardened version as reference until Next.js API routes fully replace it.

- **Risk**: Auth pages redesign introduces XSS or bypass
  - **Mitigation**: Enforce `FORM-SEC-01` sanitization, exact-origin validation, CSRF, rate limiting `TIER_AUTH_5_PER_15M`, no client corpus, generic 401 errors.

---

## 5. Deliverable Inventory

| Doc ID | File | Purpose |
| :--- | :--- | :--- |
| PLAN-000 | `docs/PLAN-000-Master-Consolidation-and-Pivot.md` | This master plan |
| PLAN-001 | `docs/PLAN-001-Landing-Redesign-and-Implementation.md` | Landing page detailed plan + primitives/components/surfaces |
| AUDIT-001 | `docs/AUDIT-001-Staging-Changes-Audit.md` | Audit of staging changes vs foundational docs |
| PLAN-002 | `docs/PLAN-002-Auth-Redesign-and-Implementation.md` | Auth pages detailed plan |
| PLAN-003 | `docs/PLAN-003-Visual-Direction-Update.md` | Plan to update all foundational docs for new visual direction |
| PLAN-004 | `docs/PLAN-004-Agent-Specs-Handoff.md` | Agent specs handoff contract |
| ANALYSIS-001 | `docs/ANALYSIS-001-Monetization-and-Pricing.md` | Monetization feature analysis |
| PLAN-005 | `docs/PLAN-005-Nextjs-Architecture-Migration.md` | Next.js architecture migration plan |
| STAGING-READINESS-CHECKLIST | `docs/STAGING-READINESS-CHECKLIST.md` | Consolidated (already created, 21/21 PASS in source) |

---

*This plan consolidates staging readiness and pivots to product foundations required from day 1.*
