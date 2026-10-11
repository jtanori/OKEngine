# ANALYSIS-001 — Monetization and Pricing: Features, Tiers, Metering, Billing

| Field | Value |
| :--- | :--- |
| **Document ID** | `ANALYSIS-001` |
| **Status** | `APPROVED` |
| **Owner** | Product & Monetization |
| **Authority** | Advisory — Pricing & Feature Gating |
| **Dependencies** | `00_product_contract`, `03_page_specifications`, `PLAN-001`, `PLAN-003`, `02_component_catalog` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Summary

Analyze OKEng product for monetization features, define pricing tiers (Starter 0€, Pro 31€/mo, Escala custom from proposal), feature matrix, usage metering, billing integration plan, and identify features to ship for monetization.

---

## 1. Product Analysis — What OKEng Does (from `00_product_contract` + code)

### 1.1 Core Invariant

**Files → Collections → Access → Context → Answer**

- **Files**: Ingestion of Markdown, MDX, PDF, URLs, drag & drop, auto-sync, re-index, chunking, embeddings
- **Collections**: Group files by product, audience, topic, unlimited (but gated by pricing)
- **Access**: 3-tier visibility (everyone, members, admins), inherits via SSO/SAML, filtered at retrieval (not just UI), role-based
- **Context**: Hybrid search (semantic + keyword), re-ranking, citations, ≥98% with source, no hallucinations
- **Answer**: Cited answers inside app via widget/panel/fullscreen, source chips with excerpt, feedback, save answer, report issue

### 1.2 Capabilities (17 + 4 new from AUDIT-001)

| Cap ID | Capability | Monetization Potential |
| :--- | :--- | :--- |
| CAP-01 | File Ingestion (MD, PDF, URLs) | Meter files, storage |
| CAP-02 | Collection Management | Meter collections |
| CAP-03 | Access Control (everyone/members/admins) | Gate advanced (SSO/SAML) to Pro+ |
| CAP-04 | Hybrid Search & Retrieval | Core, not gated, but meter queries |
| CAP-05 | Cited Answers (≥98% with source) | Core, not gated |
| CAP-06 | Embed Widget (floating) | Core, Starter includes |
| CAP-07 | Embed Panel (side drawer) | Core, Starter includes |
| CAP-08 | Embed Fullscreen (help center) | Gate to Pro? Or Starter includes? Proposal says Starter includes Widget + Panel, not fullscreen — check |
| CAP-09 | Documentation Mode (DocArticleRenderer) | Part of fullscreen, gate |
| CAP-10 | Governance (feedback, save, report) | Core |
| CAP-11 | Analytics (what asked, missing, sources) | Gate to Pro+ (proposal says Pro includes Analítica) |
| CAP-12 | BYOK (OpenAI, Anthropic, Azure, Bedrock, local) | Gate to Pro+ or Escala (proposal says Escala includes BYOK? Actually Pro includes? Check — proposal says "Tu modelo tu clave" as feature, not gated, but "Trae tu propia clave" bullet in developers — likely Pro+ includes BYOK) |
| CAP-13 | Customization (colors, fonts, position, 100% look native) | Core, but advanced theming to Pro+ |
| CAP-14 | API REST | Core, but rate limit by tier |
| CAP-15 | Webhooks | Gate to Pro+ |
| CAP-16 | EU Hosting | Gate to Escala (proposal says "Despliega en UE" as bullet, likely Escala) |
| CAP-17 | Multi-language (EN/ES) | Core |
| CAP-18 | System Privilege (super_admin, admin, member, viewer) | Core, but advanced roles to Pro+ |
| CAP-19 | Rate Limiting (tiers) | Metering, not gating |
| CAP-20 | Session & CSRF (5-Link Auth Chain) | Core, security |
| CAP-21 | Marketing & Landing (new) | Not gated |

### 1.3 Current Implementation — What Exists

- **Files**: `src/components/UploadDropzone.tsx`, `UploadDrawer.tsx`, `FileTable.tsx`, `MarkdownEditor.tsx` — ingestion exists, no metering yet
- **Collections**: `CollectionCard.tsx`, collection CRUD in API — no limit enforcement yet
- **Access**: `VisibilitySelector.tsx`, `RoleSelector.tsx` — 3-tier exists, SSO/SAML not implemented (future)
- **Context**: `content/renderer`, hybrid search — exists, no query metering yet
- **Answer**: `DocArticleRenderer`, `DogfoodInlineBot`, `SourceList`, `NextStepButton`, `FeedbackControl` — exists
- **Embeds**: `EmbedCard.tsx`, `EmbedInstallationView.tsx`, 6 surfaces (widget, panel, fullscreen, inline, documentation, contextual) — exists, 3 modes (widget/panel/fullscreen) from proposal
- **Analytics**: Not implemented — need to build
- **BYOK**: Not implemented — need to build, env var or per-workspace API key
- **API**: Express routes in `server.ts`, to be migrated to Next.js `src/app/api/*`
- **Billing**: Not implemented — need Stripe or similar

---

## 2. Pricing Tiers — From Proposal + Product Truth

### 2.1 Proposal Tiers (EUR, monthly, -20% annual)

| Tier | Price Monthly | Price Annual (-20%) | Queries/mo | Collections | Files | Features | CTA |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Starter** | 0€ | 0€ | 1.000 | 1 | 100 | Widget + Panel, Community support | Empieza gratis |
| **Pro** | 31€ | 24€ (approx 31*0.8=24.8) | 10.000 | 10 | 1.000 | Todo Starter + Permisos por rol + SSO + Analítica + Soporte prioritario, badge "Más popular" | Empieza con Pro |
| **Escala** | A medida | A medida | Ilimitadas | Ilimitadas | Ilimitados | Todo Pro + On-premise + SLA + Soporte dedicado + BYOK + EU hosting + Webhooks + API avanzada | Habla con nosotros |

**Notes from proposal**:
- Toggle monthly/annual -20%
- Starter 0€ no card, cancel anytime, 1.000 consultas gratis
- Pro 31€/mo most popular
- Escala custom contact
- FAQ: integration 3 lines, no data training, permissions, formats, no source handling, migration

### 2.2 Validation vs Product Truth

- **Queries**: Need metering — count `POST /api/ask` per workspace per month, reset monthly, 1k Starter, 10k Pro, unlimited Escala — feasible, need to implement `usage` table
- **Collections**: Count collections per workspace, 1 Starter, 10 Pro, unlimited Escala — feasible, enforce in API
- **Files**: Count files per workspace, 100 Starter, 1k Pro, unlimited Escala — feasible, enforce in upload
- **Features**:
  - Widget + Panel: Starter includes — yes, core
  - Fullscreen: Should Starter include? Proposal says Starter includes Widget + Panel, not fullscreen — so fullscreen is Pro+ — makes sense as help center is more advanced
  - Permisos por rol: Pro+ — 3-tier everyone/members/admins is core? But proposal says Pro includes Permisos por rol — so maybe Starter only everyone, Pro+ has members/admins + SSO — need to decide: Starter = everyone only, Pro+ = members/admins + SSO/SAML
  - SSO: Pro+ — yes, gate SSO/SAML to Pro+
  - Analítica: Pro+ — yes, gate analytics to Pro+
  - Soporte: Community Starter, priority Pro, dedicated Escala — support tier, not code
  - On-premise, SLA, BYOK, EU hosting, Webhooks, API avanzada: Escala — gate to Escala

### 2.3 Feature Matrix — Detailed

| Feature | Starter (0€) | Pro (31€/mo) | Escala (custom) | Implementation | Gating |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Queries/mo** | 1.000 | 10.000 | Unlimited | Meter POST /api/ask, usage table, monthly reset | Enforce limit, 429 when exceeded, upgrade CTA |
| **Collections** | 1 | 10 | Unlimited | Count collections, enforce in POST /api/collections | Enforce, upgrade CTA |
| **Files** | 100 | 1.000 | Unlimited | Count files, enforce in POST /api/files | Enforce, upgrade CTA |
| **Storage** | 1GB? (not in proposal, infer) | 10GB | Unlimited | Sum file sizes | Enforce |
| **Seats/members** | 1? | 5? | Unlimited | Count workspace members | Enforce |
| **Widget floating** | ✅ | ✅ | ✅ | SU-EMBED-CHAT | No gate |
| **Panel lateral** | ✅ | ✅ | ✅ | SU-EMBED-PANEL | No gate |
| **Fullscreen/help center** | ❌ | ✅ | ✅ | SU-EMBED-FULLSCREEN | Gate to Pro+ |
| **Documentation mode** | ❌ | ✅ | ✅ | SU-EMBED-DOCUMENTATION | Gate to Pro+ |
| **Inline/contextual** | ✅? | ✅ | ✅ | SU-EMBED-INLINE, CONTEXTUAL | Starter maybe? Or Pro+? Proposal says 3 modes: widget/panel/fullscreen — inline/contextual are advanced, gate to Pro+ |
| **Permisos por rol (3-tier)** | Everyone only | Everyone/members/admins | Everyone/members/admins + custom | VisibilitySelector | Starter = everyone only, Pro+ = full |
| **SSO/SAML** | ❌ | ✅ | ✅ | SSO integration | Gate to Pro+ |
| **Analítica** | ❌ | ✅ | ✅ | Analytics dashboard, what asked, missing, sources | Gate to Pro+ |
| **Customization (colors, fonts, position)** | Basic (accent only) | Full (colors, fonts, position, CSS) | Full + white-label | Embed theme | Starter = accent only, Pro+ = full |
| **API REST** | ✅ Rate limited 60/min | ✅ 60/min + higher | ✅ Unlimited | API routes | Rate limit by tier (same tier but higher for Escala) |
| **Webhooks** | ❌ | ✅ | ✅ | Webhooks for sync | Gate to Pro+ |
| **BYOK (OpenAI, Anthropic, Azure, Bedrock, local)** | ❌ | ✅? | ✅ | Per-workspace API key, model selection | Proposal says "Tu modelo tu clave" as feature, but "Trae tu propia clave" bullet — likely Pro+ includes BYOK, Escala includes on-premise local |
| **EU hosting** | ❌ (US default) | ❌ (US) | ✅ EU | Deploy region | Gate to Escala |
| **On-premise** | ❌ | ❌ | ✅ | Self-hosted | Escala only |
| **SLA** | ❌ | ❌ | ✅ | SLA contract | Escala only |
| **Support** | Community (GitHub, docs) | Priority (email, 24h) | Dedicated (Slack, 1h) | Support tier | Not code, but docs |
| **Seats** | 1 admin | 5 members | Unlimited | Workspace members | Enforce |

**Open Questions**:
- Exact storage limits not in proposal — infer 1GB Starter, 10GB Pro, unlimited Escala, or base on file count only
- Seats not in proposal — infer 1 Starter, 5 Pro, unlimited Escala
- API rate limiting same across tiers? Or higher for Pro/Escala? Proposal doesn't say — keep same for simplicity, or higher for Escala (e.g., 60/min Starter/Pro, 600/min Escala)
- BYOK: Pro includes OpenAI/Anthropic/Azure/Bedrock BYOK, Escala includes local + on-premise
- Fullscreen: Gate to Pro+ — makes sense, help center is advanced

---

## 3. Usage Metering — Implementation Plan

### 3.1 Metering Schema

**Table `usage`**: Tracks monthly usage per workspace

```sql
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  period_start DATE NOT NULL, -- first day of month
  period_end DATE NOT NULL, -- last day of month
  queries_count INTEGER DEFAULT 0,
  files_count INTEGER DEFAULT 0,
  collections_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  UNIQUE(workspace_id, period_start)
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'escala')),
  plan_interval TEXT DEFAULT 'monthly' CHECK (plan_interval IN ('monthly', 'annual')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- ... other fields
);
```

**Metering Logic**:

- **Queries**: Increment `queries_count` on each successful `POST /api/ask`, check limit before answering, if exceeded return 429 with upgrade CTA, reset monthly via cron or on first query of new month
- **Collections**: Count collections on `GET /api/collections`, enforce limit on `POST /api/collections`, if exceeded return 403 with upgrade CTA
- **Files**: Count files on `GET /api/files`, enforce limit on `POST /api/files`, if exceeded return 403
- **Storage**: Sum file sizes, enforce
- **Seats**: Count workspace members, enforce

**Cron**: Monthly reset — on first query of new month, create new `usage` row for that month, or via daily cron that creates rows for new month

### 3.2 Enforcement

- **API Layer**: In `src/app/api/*` routes, before processing, check workspace plan and usage, if limit exceeded return 429 (queries) or 403 (collections/files) with JSON `{ error: "limit_exceeded", message: "Has alcanzado el límite de X, actualiza a Pro", upgrade_url: "/#precios" }`
- **UI Layer**: In workspace UI, show usage bar: "1.000 consultas/mes — 750 usadas (75%)" with progress bar, upgrade CTA when near limit
- **Landing**: Pricing section already shows limits, no enforcement needed

### 3.3 Billing Integration — Stripe (or similar)

**Plan**:

1. **Stripe Setup**: Create Stripe account, products: Starter (free), Pro monthly 31€, Pro annual 24€*12=288€/year (20% off), Escala custom (contact sales, manual)
2. **Checkout**: `POST /api/billing/checkout` — creates Stripe Checkout Session with plan, interval, workspace_id, success_url, cancel_url, returns session URL, frontend redirects
3. **Portal**: `POST /api/billing/portal` — creates Stripe Customer Portal Session for managing subscription, returns URL
4. **Webhooks**: `POST /api/billing/webhooks` — handles Stripe webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed` — updates workspace plan, period, etc
5. **Env**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`
6. **UI**: In workspace settings, billing section: current plan, usage, upgrade/downgrade, manage billing (portal), invoices

**Flow**:

- User clicks "Empieza con Pro" in landing pricing → /signup?plan=pro&interval=monthly → after signup, redirect to checkout with plan pro monthly → Stripe Checkout → success → webhook updates workspace plan to pro monthly → redirect to /workspaces with success
- Existing workspace wants upgrade: Settings → Billing → Upgrade to Pro → checkout → same
- Downgrade: Billing portal → cancel or change plan → webhook updates

**Future**: Escala custom — contact form → sales → manual Stripe subscription or custom contract

---

## 4. Monetization Features to Ship — Prioritized

### P0 — Must Have for Launch (Starter + Pro)

1. **Usage Metering**: Table `usage`, metering logic for queries, collections, files, enforcement in API, UI usage bar — **without this, cannot enforce limits, no monetization**
2. **Pricing Tiers & Feature Gating**: Workspace plan field, plan checks in API for collections/files/queries, feature gating for fullscreen, SSO, analytics, webhooks, BYOK — **core gating**
3. **Landing Pricing Section**: Already in PLAN-001 — 3 tiers, toggle monthly/annual, CTAs, accurate limits — **marketing**
4. **Billing Integration (Stripe)**: Checkout, portal, webhooks, env, UI billing settings — **revenue**
5. **Upgrade CTAs**: When limit exceeded, show upgrade CTA linking to pricing, in API errors and UI — **conversion**

### P1 — Should Have for Pro Value

6. **Analytics Dashboard**: What asked, what's missing, what sources used — gated to Pro+, value prop for Pro — **need to build analytics table and UI**
7. **SSO/SAML**: Gate to Pro+, integration with Auth0 or similar, or SAML — **enterprise value**
8. **Customization Full**: Colors, fonts, position, CSS — Starter accent only, Pro full — **differentiation**
9. **Fullscreen/Documentation Mode**: Gate to Pro+ — help center — **Pro value**
10. **Webhooks**: Gate to Pro+ — sync — **Pro value**

### P2 — Nice to Have for Escala

11. **BYOK**: Per-workspace API key, model selection OpenAI/Anthropic/Azure/Bedrock/local — Escala (or Pro+ for cloud BYOK, Escala for local/on-premise) — **enterprise**
12. **EU Hosting**: Deploy region option — Escala — **compliance**
13. **On-premise**: Self-hosted — Escala — **enterprise**
14. **SLA**: Contract — Escala — **enterprise**
15. **Seats/Members**: Count and enforce — P0 for metering but advanced roles to Pro+

---

## 5. Implementation Plan

### Phase 1 — Metering & Gating (P0, 2 days)

1. **DB**: Create `usage` table, add `plan`, `plan_interval`, `stripe_customer_id`, `stripe_subscription_id` to `workspaces`
2. **Lib**: `src/lib/usage.ts` — functions `getUsage(workspaceId)`, `incrementQueries(workspaceId)`, `checkLimit(workspaceId, type)`, `resetMonthlyIfNeeded(workspaceId)`
3. **API**: In `src/app/api/ask/route.ts`, `collections/route.ts`, `files/route.ts` — check limit before processing, increment after success, return 429/403 if exceeded with upgrade CTA
4. **UI**: In workspace, usage bar component `src/components/workspace/UsageBar.tsx` — shows queries, collections, files usage, progress, upgrade CTA
5. **Tests**: Add tests for metering, limit enforcement

### Phase 2 — Pricing & Landing (P0, 1 day — already in PLAN-001)

1. **Landing**: Implement `CO-LANDING-PRICING` with 3 tiers, toggle, accurate limits from this doc, CTAs to /signup?plan=pro&interval=monthly etc
2. **Page Spec**: Update PAGE-PUB-01 pricing section with feature matrix

### Phase 3 — Billing Integration (P0, 2 days)

1. **Stripe**: Setup account, create products/prices, get price IDs, env vars
2. **API**: `src/app/api/billing/checkout/route.ts`, `portal/route.ts`, `webhooks/route.ts` — checkout session, portal session, webhook handling
3. **Lib**: `src/lib/stripe.ts` — Stripe client, helper functions
4. **UI**: Billing settings page `src/app/(workspace)/workspaces/[slug]/settings/billing/page.tsx` — current plan, usage, upgrade, manage billing, invoices
5. **Tests**: Test checkout, portal, webhooks (mock Stripe)

### Phase 4 — Analytics & Pro Features (P1, 3 days)

1. **Analytics**: Table `analytics_events` (workspace_id, query, sources, timestamp, etc), API `src/app/api/analytics/route.ts`, UI dashboard `src/components/workspace/AnalyticsDashboard.tsx` — gated to Pro+
2. **SSO**: Integration, gated to Pro+
3. **Customization**: Full theming, gated to Pro+
4. **Fullscreen**: Gate to Pro+, check plan in API and UI

### Phase 5 — Escala Features (P2, future)

1. **BYOK**: Per-workspace API key, model selection
2. **EU Hosting**: Deploy region
3. **On-premise**: Self-hosted docs
4. **Seats**: Count and enforce, advanced roles

---

## 6. Risks & Mitigations

- **Risk**: Metering not accurate, users exceed limits without enforcement
  - **Mitigation**: Enforce in API, not just UI, check before processing, increment after success, atomic transactions, tests

- **Risk**: Billing integration fails, revenue loss
  - **Mitigation**: Stripe well-documented, test webhooks with Stripe CLI, handle failures (payment_failed → downgrade or email), monitoring

- **Risk**: Feature gating breaks existing workspaces (e.g., Starter workspace with 2 collections after gating to 1)
  - **Mitigation**: Grandfather existing workspaces, or allow over-limit but show upgrade CTA, not block immediately, or set Starter to 1 but existing with 2 can keep but cannot create new

- **Risk**: Pricing not competitive, conversion low
  - **Mitigation**: Research competitors (Intercom, Zendesk, etc), proposal pricing 0€/31€ seems reasonable, -20% annual incentive, free tier generous 1k queries, Pro 10k for 31€ — validate with user interviews

---

## 7. Acceptance Criteria

- [ ] This analysis doc (ANALYSIS-001) with feature matrix, pricing tiers, metering plan, billing integration plan
- [ ] Usage table schema, metering logic spec
- [ ] Feature gating spec (what gated to Pro+, Escala)
- [ ] Billing integration plan (Stripe checkout, portal, webhooks, env, UI)
- [ ] Prioritized features to ship (P0, P1, P2)
- [ ] Implementation plan with phases
- [ ] No fabricated metrics, accurate product truth
- [ ] Atomic commit + push

---

## 8. References

- Proposal pricing: https://01a1278b-f5a1-71f6-830f-8c5c544d4689.arena.site/ — Starter 0€ 1k queries 1 collection 100 files, Pro 31€/mo 10k 10 1k, Escala custom
- Product contract: `docs/00_product_contract.md` — 17 capabilities
- Code: `src/components/UploadDropzone.tsx`, `CollectionCard.tsx`, `EmbedCard.tsx`, `server.ts` routes, `src/app/api/*` (to be created)
- Billing: Stripe docs, checkout, portal, webhooks
- Analytics: Future, not yet implemented

---

*Analysis up to standards — ready for execution, blocks monetization and pricing implementation.*
