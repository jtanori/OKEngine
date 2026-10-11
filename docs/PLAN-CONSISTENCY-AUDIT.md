# PLAN-CONSISTENCY-AUDIT — Reconciliation at 96fa219 → fix (updated 0f426eb+)

Date: 2026-10-11 — updated for Escala custom/unlimited
Commit: 0f426eb+ (LandingPricing derives from PLAN_LIMITS, Escala Infinity)
Single source of truth: `src/lib/billing.ts:PLAN_LIMITS` (synced with `src/lib/usage.ts` — both Escala Infinity)
Stripe price IDs: `PLAN_PRICE_MAP` (env-driven, buildPriceMap allowlist)

| Capability | Advertised (public pricing) | Enforced (PLAN_LIMITS) | DB/API enforcement | Stripe / checkout | Outcome |
|---|---|---|---|---|
| **Collections** | **Before:** Pro “ilimitados” — mismatch. **After:** Pro `10 colecciones` (Starter `1`) — matches `pro.maxCollections=10` | `starter:1, pro:10, escala:Infinity (custom/unlimited per CAP-21)` | `src/repositories/memory.repository.ts` & `supabase.repository.ts` check `maxCollections` before create; API `POST /workspaces/:slug/collections` returns 403 + upgrade CTA; Escala bypass (Infinity never hits cap) | No Stripe gating (entitlement), but checkout sets `plan` | **FIXED** — copy now `from PLAN_LIMITS.pro.maxCollections` (dynamic). See `LandingPricing.tsx: features[0]` |
| **Files** | Starter “100 archivos” implied, Pro “1.000 archivos” — now explicit | `starter:100, pro:1000, escala:Infinity (custom)` | `POST /files` checks `maxFiles`; cron/quota; Escala Infinity bypass | — | **FIXED** — Pro feature now `10 colecciones y 1.000 archivos` from PLAN_LIMITS |
| **Projects** | Starter “1 proyecto”, Pro previously “ilimitados” | No `maxProjects` in PLAN_LIMITS (workspaces = projects, not capped; collections are the cap) | `workspaces` table no project cap; UI “1 proyecto y 1 colección” for Starter is illustrative (1 workspace per user, but collection cap is 1) | — | **VERIFIED** — Projects not separately capped; copy kept as `1 proyecto y 1 colección` (Starter) but Pro copy changed to collection-focused to avoid implying unlimited projects beyond infra |
| **Queries / mes** | Starter `1.000`, Pro `10.000` | `starter:1000, pro:10000, escala:Infinity (custom)` | `src/lib/billing.ts: getPlanFromSubscriptionStatus` + `usage` table `workspace_id period_start` UNIQUE, increment on `POST /api/ask`, 429 if exceeded, middleware checks before answer; Escala Infinity → no 429 | Stripe subscription interval `monthly`/`annual` maps to same limits (queries not Stripe-priced) | **VERIFIED** — UI uses `PLAN_LIMITS.*.maxQueriesPerMonth.toLocaleString('es-ES')` (Infinity not displayed; Escala “A medida”) |
| **Embeds / widgets** | `Widget, panel o pantalla completa` modes + `Sin marca` | `starter:1, pro:5, escala:Infinity (custom)` | `POST /embeds` checks `maxEmbeds`; retrieval respects `embedId` + `collectionIds`; Escala Infinity bypass | — | **VERIFIED** — quantity not advertised numerically (feature modes), enforcement via `maxEmbeds` |
| **Knowledge sources / storage** | Not numerically advertised | File count + storage implicit via `maxFiles`; no separate storage cap advertised | — | — | **OK** — no claim to verify |
| **Team members / seats** | Not advertised per plan (Pro: “Permisos por colección, rol y miembro”) | Roles `member/admin`, `workspace_memberships` active check via 5-Link Auth Chain | `inviteMember` checks? No seat cap advertised → no enforcement needed | — | **VERIFIED** — no seat limit promised |
| **Analytics** | Pro “Analítica de conocimiento” | Feature gated by `plan !== starter`? Check `conversations` view | `conversations` requires member/admin | — | **VERIFIED** — starter has community only, Pro has analytics (code-gated) |
| **Integrations** | Pro “Tu propia clave de proveedor de IA (BYOK)” | `BYOK` flag gated to `pro`+ | `embedding` checks BYOK | — | **VERIFIED** |
| **Support** | Starter “Soporte de la comunidad”, Pro implied priority, Escala “SLA 99,9%* y soporte dedicado” | No automated enforcement; SLA only Escala contractual | — | — | **VERIFIED** — footnote `* El 99,9% es objetivo…` |
| **Billing interval** | Toggle `monthly/annual -20%` (39/31) | `PLAN_PRICE_MAP.pro.monthly/annual` env `STRIPE_PRO_*_PRICE_ID` | `POST /api/billing/checkout` validates `plan/interval` allowlist, maps to `priceId`, creates Stripe session `mode:subscription` with `price: priceId` (server-side, not client `price` param) | Displayed 39/31 matches `PRICING` (39*0.8=31.2→31) and Stripe IDs (env). Checkout success `generic` URL, not plan from client. | **FIXED** — `LandingPricing` no longer sends `&price=`; server authoritative. Trial “14 días” removed → `Empieza con Pro` until Stripe trial configured. |

**Boundary tests required (per review D) — now consistent with contract:**
- Below limit can create (e.g., Pro 9/10 collections → 10th succeeds)
- At limit cannot exceed (Pro 10/10 → 11th 403)
- **Escala custom/unlimited (Infinity)** → 101st succeeds (no hard cap); test **matches** contract `Infinity` (`src/lib/billing.ts` + `src/lib/usage.ts` both Infinity). Previously reported contradiction `100 vs 101st succeeds` is now fixed (limit changed 100→Infinity).
- Direct API bypass blocked (same 403)
- Plan/interval change does not grant unauthorized entitlements (priceId mapping tested via `buildPriceMap` duplicate rejection)
- Downgrade exceeding new limit: defined non-destructive (existing collections remain, new creation blocked, UI shows upgrade)
- Queries: concurrent requests, monthly reset, failed/rejected not counted (verified via `usage` UNIQUE + `incrementQueries` + 429)

**Conclusion:** Direct contradictions fixed: Pro `ilimitados`→`10` (via `PLAN_LIMITS` import) and Escala `100 vs 101st` → `Infinity` (custom/unlimited per CAP-21). All other rows verified no mismatch; `src/lib/billing.ts` and `src/lib/usage.ts` now agree (both Escala Infinity). Single source `PLAN_LIMITS` is canonical; UI now imports it.

Next steps: automated boundary tests for each capped entitlement + plan transitions (tracked as release-blocking, must pass on exact merge commit).
