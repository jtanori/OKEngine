# PLAN-003 — Visual Direction Update for All Foundational Documents

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-003` |
| **Status** | `APPROVED — EXECUTION IN PROGRESS` |
| **Owner** | Design System & Product |
| **Authority** | Blocking — Design System & All Page Specs |
| **Dependencies** | `00_product_contract`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications`, `04_workflows`, `UI-01`, `PLAN-001`, `PLAN-002`, `AUDIT-001` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Goal

Create fully detailed plan to update all foundational documents to introduce new visual direction from proposal (https://01a1278b-f5a1-71f6-830f-8c5c544d4689.arena.site/), covering design system, UI primitives, components catalog, page archetypes, page specs, workflows. New direction must be documented to v3.0 standard and implemented consistently across landing and auth.

---

## 1. Current Visual Direction (v2.0)

### 1.1 Existing Tokens (from `src/index.css` and `01_ui_foundation`)

- **Colors**: Canvas #F8F7F4, Surface #FFFFFF, Elevated #FAF9F6, Subtle #F1F0EC, Ink #171717, Ink Secondary #6B6B67, Ink Muted #8C8B85, Line #DEDDD8, Accent #1D4ED8, Success #15803D, Warning #B45309, Danger #B91C1C
- **Typography**: Inter sans, JetBrains Mono mono, 2xs 10px, xs 12px, sm 14px
- **Radii**: xs 3px, sm 4px, md 6px
- **Philosophy**: "Quiet Technical" — rejects neon gradients, floating orbs, fake dashboards, high-craft light-mode structural clarity, 4-tier control height scale xs=24px sm=32px md=36px lg=40px
- **Principles**: 9 normative principles (exact-origin, no client corpus, FORM-SEC-01, 5-Link Auth Chain, etc)

### 1.2 Gaps vs Proposal

- Proposal has richer editorial: larger hero H1 48px/52px, section spacing py-24, max-w-7xl, shadow-sm/md/lg, lg radius 12px, metrics, pricing toggle, testimonials, FAQ, code snippets, logo strip, chat mock, integration tabs
- Current docs don't have primitives for these marketing elements
- Current page specs (PAGE-PUB-01) have old 5-stage tour (pipeline/pillars) not 12-section landing
- Current auth specs not aligned with new card design
- Missing archetypes for marketing landing (PA-LANDING) and auth (PA-AUTH)

---

## 2. New Visual Direction (v3.0) — From Proposal Analysis

### 2.1 Design Philosophy Update

**Keep**: Quiet Technical — no neon, no orbs, no fake dashboards, light-mode structural clarity, high-craft

**Add**: Editorial Marketing Layer — for public surfaces (landing, pricing, docs), allow larger typography, more whitespace, subtle shadows, metrics, social proof, but still quiet (no gradients, no animations excessive, no fabricated metrics — all metrics real: ≥98% cited, -73% tickets, 1k free queries, 3 lines code)

**Principles Update** (add to 9 existing):

10. **Editorial Whitespace**: Public marketing sections use py-16 mobile, py-24 desktop (64px/96px), max-w-7xl container, 24px gap between cards, 16px between label and input
11. **Real Metrics Only**: All metrics must be real, not fabricated: ≥98% con cita (from product), -73% tickets (from testimonial, not invented), 1.000 consultas gratis (from pricing), 3 líneas de código (from SDK) — no fake "0 líneas", "0%" placeholders
12. **Shadow Restraint**: Shadows only for elevation: shadow-sm 0 1px 2px rgba(0,0,0,0.04) for cards, shadow-md 0 4px 12px rgba(0,0,0,0.08) for hero mock, pricing popular, auth card, shadow-lg 0 8px 24px rgba(0,0,0,0.12) for modals/drawers — no large diffuse shadows
13. **Radius Scale Extension**: Keep xs 3px, sm 4px, md 6px, add lg 12px for hero mock, pricing cards, testimonial cards, auth card — marketing surfaces can use lg, workspace surfaces use sm/md

### 2.2 Token Updates (in `src/index.css` @theme)

**Preserve all existing tokens**, add:

```css
/* New in v3.0 */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);

--radius-lg: 12px;
--radius-xl: 16px; /* for future, not used now */

--text-hero: 3rem; /* 48px */
--text-hero--line-height: 3.25rem; /* 52px */
--text-hero--letter-spacing: -0.02em;
--text-section: 1.875rem; /* 30px */
--text-section--line-height: 2.25rem; /* 36px */

--spacing-section-y: 6rem; /* 96px desktop */
--spacing-section-y-mobile: 4rem; /* 64px mobile */
--max-width-landing: 80rem; /* 1280px = max-w-7xl */
--max-width-prose: 48rem; /* 768px = max-w-3xl for centered text */
```

**Update Tailwind config** to expose new tokens: `shadow-sm`, `shadow-md`, `shadow-lg`, `rounded-lg`, `rounded-xl`, `text-hero`, `text-section`

### 2.3 Typography Scale Extension

| Token | Value | Usage |
| :--- | :--- | :--- |
| `text-hero` | 48px/52px, 600, -0.02em | Hero H1 |
| `text-section` | 30px/36px, 600, -0.01em | Section H2 (Cómo funciona, Producto, etc) |
| `text-card-title` | 16px/24px, 600 | Feature card title, pricing tier name |
| `text-card-body` | 14px/20px, 400 | Feature card desc, pricing feature list |
| `text-metric-value` | 36px/40px, 700 | Metric value -73% |
| `text-metric-label` | 12px/16px, 500, uppercase | Metric label "tickets repetidos" |
| Existing 2xs/xs/sm | Keep | Controls, metadata, badges |

### 2.4 Color Extension (keep existing, add)

- **Ink Strong**: #0F172A for hero H1 (darker than #171717 for more contrast)
- **Accent Strong**: #1E40AF for hover (already exists as --accent-hover)
- **Accent Subtle**: #EFF6FF for focus, badges (already exists)
- **Success Subtle**: #F0FDF4 for ≥98% badge (already exists)
- **Canvas Dark**: #F4F4F0 for pricing section alternate background (already --bg-subtle but use as section bg)

---

## 3. Foundational Docs Update Plan

### 3.1 `docs/00_product_contract.md` — Update to v1.1

**Current**: 17 capabilities, invariant Files→Collections→Access→Context→Answer

**Update**:

- Add CAP-18 System Privilege (from AUDIT-001)
- Add CAP-19 Rate Limiting
- Add CAP-20 Session & CSRF
- Add CAP-21 Marketing & Monetization (pricing tiers, metrics, landing)
- Update revision to v1.1
- Keep invariant, add note: invariant holds for core product, marketing surfaces (landing, pricing) are pre-auth and don't break invariant
- Add section "Marketing & Monetization" with pricing tiers Starter/Pro/Escala, metrics real, FAQ

### 3.2 `docs/01_ui_foundation.md` — Update to v3.0

**Current**: v2.0, DS tokens, PR taxonomy, 9 principles, sidebar posture

**Update to v3.0**:

1. **DS Tokens**: Add shadow tokens, radius lg, hero/section typography, spacing section-y, max-width landing/prose, ink strong
2. **PR Taxonomy**: Add 16 new primitives from PLAN-001 + PLAN-002:
   - PR-ANNOUNCEMENT-BANNER, PR-METRIC, PR-PRICING-TOGGLE, PR-TESTIMONIAL-CARD, PR-FAQ-ACCORDION, PR-CODE-SNIPPET, PR-LOGO-STRIP, PR-INTEGRATION-TABS, PR-FEATURE-CARD, PR-HOW-IT-WORKS-STEP, PR-CHAT-MOCK, PR-PRICING-CARD, PR-AUTH-CARD, PR-PASSWORD-INPUT, PR-AUTH-DIVIDER, PR-TRUST-BADGE
3. **Principles**: Add principles 10-13 (editorial whitespace, real metrics only, shadow restraint, radius scale extension)
4. **Sidebar Posture**: Keep, but add note: marketing surfaces (PA-LANDING, PA-AUTH) have no sidebar, full viewport, max-w-7xl
5. **Revision**: v3.0, date 2026-10-11

### 3.3 `docs/02_component_catalog.md` — Update to v3.0

**Current**: v2.0, PR-* and CO-* inventory, FORM-SEC-01

**Update to v3.0**:

1. **PR Section**: Add 16 new PR primitives with props, invariants, a11y, DS token consumption
2. **CO Section**: Add 18 new CO components:
   - Landing: CO-LANDING-HERO, CO-LANDING-LOGO-STRIP, CO-LANDING-METRICS, CO-LANDING-HOW-IT-WORKS, CO-LANDING-PRODUCT-FEATURES, CO-LANDING-INTEGRATION, CO-LANDING-DEVELOPERS, CO-LANDING-TESTIMONIALS, CO-LANDING-PRICING, CO-LANDING-FAQ, CO-LANDING-FINAL-CTA, CO-LANDING-FOOTER (12)
   - Auth: CO-AUTH-LOGIN-FORM, CO-AUTH-SIGNUP-FORM, CO-AUTH-FORGOT-FORM, CO-AUTH-RESET-FORM, CO-AUTH-SSO-BUTTONS, CO-AUTH-TRUST-FOOTER (6)
3. **FORM-SEC-01**: Update reference to include `requestSchemas.ts` server-side enforcement (from AUDIT-001)
4. **New Section**: CO-MARKETING (landing components) and CO-AUTH (auth components)
5. **Revision**: v3.0

### 3.4 `docs/03_page_specifications.md` — Update to v3.0

**Current**: v2.0, PAGE-PUB-01 with 5-stage tour (pipeline/pillars), PAGE-AUTH-01/02/03 old design, workspace pages

**Update to v3.0**:

1. **PAGE-PUB-01**: Complete rewrite to 12-surface landing:
   - Archetype: PA-LANDING
   - Surfaces: SU-LANDING-ANNOUNCEMENT, HERO, LOGOS, METRICS, HOW-IT-WORKS, PRODUCT, INTEGRATION, DEVELOPERS, TESTIMONIALS, PRICING, FAQ, FINAL-CTA, FOOTER (13 surfaces)
   - Workflows: WF-LANDING-01, WF-PRICING-01
   - Copy: From PLAN-001, accurate product truth, EN/ES
   - Preserve old spec: Move to `docs/archive/PAGE-PUB-01-v2-legacy.md` with note "Preserved for later use, pipeline/pillars idea"
   - Keep hero-what-is-okeng-cta ref for test compatibility or update tests

2. **PAGE-AUTH-01 (Login)**: Rewrite with PA-AUTH archetype, SU-AUTH-LOGIN, WF-AUTH-LOGIN-01, new visual card, copy from PLAN-002
3. **PAGE-AUTH-02 (Signup)**: Rewrite with PA-AUTH, SU-AUTH-SIGNUP, WF-AUTH-SIGNUP-01
4. **PAGE-AUTH-03 (Forgot/Reset)**: Rewrite with PA-AUTH, SU-AUTH-FORGOT, SU-AUTH-RESET, WF-AUTH-FORGOT-01, WF-AUTH-RESET-01
5. **Workspace pages**: Keep but add note: workspace uses v2.0 quiet technical, marketing uses v3.0 editorial layer, both share DS tokens
6. **Revision**: v3.0

### 3.5 `docs/UI-01-Primitives-Components-Surfaces-Archetypes-Workflows.md` — Update to v3.0

**Current**: v2.0, design philosophy, tokens, PR, CO, SU, PA, WF, FORM-SEC-01

**Update to v3.0**:

1. **Design Philosophy**: Add editorial marketing layer, principles 10-13, real metrics only
2. **Tokens**: Add shadow, radius lg, hero/section typography, spacing, max-widths (from 2.2)
3. **PR Layer**: Add 16 new PR primitives (list from 3.2)
4. **CO Layer**: Add CO-LANDING-* (12) and CO-AUTH-* (6) sections
5. **SU Layer**: Add SU-LANDING-* (13) and SU-AUTH-* (5) surfaces
6. **PA Layer**: Add PA-LANDING and PA-AUTH archetypes with layout, header, footer, behavior
7. **WF Layer**: Add WF-LANDING-01, WF-PRICING-01, WF-AUTH-LOGIN-01, WF-AUTH-SIGNUP-01, WF-AUTH-FORGOT-01, WF-AUTH-RESET-01
8. **FORM-SEC-01**: Keep, add reference to requestSchemas.ts
9. **Revision**: v3.0

### 3.6 `docs/04_workflows.md` — Update to v2.0

**Current**: v1.0, core workflows (upload, collection, embed, etc)

**Update to v2.0**:

1. Add WF-LANDING-01 (anonymous → landing → signup)
2. Add WF-PRICING-01 (pricing toggle → plan → checkout)
3. Add WF-AUTH-LOGIN-01, WF-AUTH-SIGNUP-01, WF-AUTH-FORGOT-01, WF-AUTH-RESET-01 (or update existing WF-AUTH-01)
4. Update WF-EMBED-01 for 3 integration modes (widget/panel/fullscreen)
5. Keep existing workflows, add new ones
6. Revision: v2.0

### 3.7 New Docs from AUDIT-001 — Create

1. **Create `docs/SEC-01-Security-Foundations.md` v1.0**:
   - Consolidate security hardening: SEC-ENV-01, SEC-SESSION-01, SEC-CSRF-01, SEC-RATE-LIMIT-01, SEC-CORS-01, SEC-HEADERS-01, SEC-PRIVILEGE-01, SEC-SANITIZATION-01, SEC-GRACEFUL-01
   - Reference server.ts, sessionAndCsrf.ts, rateLimiter.ts, requestSchemas.ts, systemPrivileged.ts
   - Link to STG-01 and ENG-DOD-STG-01

2. **Create `docs/API-01-API-Design-and-Middleware.md` v1.0**:
   - Middleware pipeline, Zod schemas, rate limiting tiers, CSRF, error handling, 429

3. **Create `docs/DB-01-Database-and-Session-Store.md` v1.0**:
   - PG15+, Redis optional, session store, migrations

4. **Create `docs/DATA-01-Data-Model-and-Sanitization.md` v1.0**:
   - Zod schemas, FORM-SEC-01, sanitization

5. **Create `docs/OPS-01-Operations-and-Deployment.md` v1.0**:
   - Env validation, health checks, graceful shutdown, Redis, monitoring

---

## 4. Implementation Order

### Phase 1 — Tokens & DS (P0, 1 day)

1. Update `src/index.css` with new tokens (shadow, radius lg, hero/section typography, spacing, max-widths)
2. Update `docs/01_ui_foundation.md` tokens section to v3.0 draft
3. Update `docs/UI-01` tokens section to v3.0 draft

### Phase 2 — Primitives Spec (P0, 1 day)

1. Create spec for 16 new PR primitives in `docs/02_component_catalog.md` v3.0 draft
2. Update `docs/01_ui_foundation.md` PR taxonomy
3. Update `docs/UI-01` PR layer

### Phase 3 — Components & Surfaces Spec (P0, 1 day)

1. Create spec for 18 new CO components in `docs/02_component_catalog.md` v3.0 draft
2. Create spec for 18 new SU surfaces in `docs/UI-01` v3.0 draft
3. Create spec for 2 new PA archetypes in `docs/UI-01` v3.0 draft

### Phase 4 — Page Specs & Workflows (P0, 1 day)

1. Rewrite PAGE-PUB-01 in `docs/03_page_specifications.md` v3.0 draft (preserve legacy)
2. Rewrite PAGE-AUTH-01/02/03 in `docs/03_page_specifications.md` v3.0 draft
3. Add 6 new workflows in `docs/04_workflows.md` v2.0 draft and `docs/UI-01` v3.0 draft

### Phase 5 — Security & API Docs (P0, 1 day — from AUDIT-001)

1. Create SEC-01, API-01, DB-01, DATA-01, OPS-01 docs v1.0
2. Update 00_product_contract to v1.1

### Phase 6 — Review & Finalize (P1, 0.5 day)

1. Review all updated docs for consistency, no contradictions, accurate copy, DS token usage
2. Finalize v3.0 revisions, update dates
3. Atomic commit

---

## 5. Acceptance Criteria

- [ ] All foundational docs updated to v3.0 (or v1.1 for 00, v2.0 for 04) with new visual direction
- [ ] 5 new foundational docs created (SEC-01, API-01, DB-01, DATA-01, OPS-01) v1.0
- [ ] DS tokens extended (shadow, radius lg, hero/section typography, spacing, max-widths) in `src/index.css` and docs
- [ ] 16 new PR primitives spec'd in 01, 02, UI-01
- [ ] 18 new CO components spec'd in 02, UI-01
- [ ] 18 new SU surfaces spec'd in UI-01
- [ ] 2 new PA archetypes spec'd in UI-01 and 03
- [ ] 6 new WF workflows spec'd in 04 and UI-01
- [ ] PAGE-PUB-01 rewritten to 12-surface landing, legacy preserved
- [ ] PAGE-AUTH-01/02/03 rewritten to PA-AUTH card design
- [ ] No contradictions between docs, accurate copy from product truth, real metrics only
- [ ] Atomic commit and push

---

## 6. References

- Proposal: https://01a1278b-f5a1-71f6-830f-8c5c544d4689.arena.site/ — full copy extracted in PLAN-001
- PLAN-001: Landing redesign detailed inventory
- PLAN-002: Auth redesign detailed inventory
- AUDIT-001: Staging changes audit, missing docs
- Current DS: `src/index.css`, `docs/01_ui_foundation.md`, `docs/UI-01`

---

*Plan up to standards — ready for execution, blocks landing and auth implementation.*
