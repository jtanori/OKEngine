# AGENT-006 — Agent Spec

| Field | Value |
| :--- | :--- |
| **Document ID** | `AGENT-006` |
| **Status** | `APPROVED — v1.0` |
| **Owner** | Agent 006 |
| **Authority** | Blocking |
| **Dependencies** | `00_product_contract`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications`, `SEC-01`, `API-01`, `PLAN-000..005` |
| **Revision** | `1.0 (2026-10-11)` |

## 0. Role & Scope
Role 006 — See PLAN-004 for detailed role definition.

## 1. Current State
See PLAN-004 and AUDIT-001.

## 2. Invariants & Contracts
- Preserve Files→Collections→Access→Context→Answer invariant
- Preserve 5-Link Auth Chain, FORM-SEC-01, exact-origin, no client corpus, TIER_AUTH_5_PER_15M, double-submit CSRF, httpOnly/secure/sameSite=strict/12h/Redis
- DS tokens via @theme, no hardcoded colors, PR taxonomy, sizeVariant, a11y, i18n EN/ES
- Real metrics only, no fabricated data

## 3. Detailed Plan
See PLAN-004 for phases, deliverables, files.

## 4. Implementation Details
Consume DS tokens, PR/CO/SU/PA/WF specs, FORM-SEC-01, security, i18n, a11y.

## 5. Testing & Verification
Update/create tests, ensure no regressions, run TEST-01 suites: 21/21 staging-readiness, 52/52 homepage-tour, 29/29 embed-auth, 12/12 baseline.

## 6. Handoff Checklist
- [ ] Spec doc created
- [ ] Implementation done
- [ ] Tests updated, passing
- [ ] Foundational docs updated to v3.0
- [ ] Atomic commit + push
- [ ] No regressions

## 7. References
- PLAN-004, PLAN-000..005, AUDIT-001, ANALYSIS-001
- Foundational docs 00, 01, 02, 03, 04, UI-01, SEC-01, API-01, DB-01, DATA-01, OPS-01
- Code: src/components/ui/, landing/, auth/, src/app/, src/lib/, middleware.ts, server.ts legacy

