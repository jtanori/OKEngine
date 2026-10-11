# Production Readiness Gate — “No fabricated bullshit”

Date: 2026-10-11
Applies to: `main` → production deploy
Owner: Product + Eng (per-claim owner required)

Illustrative marketing copy is useful during development; shipping it as verified fact is not. This gate distinguishes three categories and blocks release until all **Verified** claims have evidence and no **Fabricated** claims ship. Disclaimer alone does not make unsupported claim safe.

## Categories

### 1. Verified claims — can ship
Supported by actual implementation, tests, configuration, privacy policy, or documented evidence.

Examples (current verified):
- `3 líneas para integrar` — verified via `src/components/landing/LandingIntegration.tsx` + docs `/docs/embedding` code snippet (`import {OKEngWidget}` + `<OKEngWidget …/>`).
- `1.000 / 10.000 consultas/mes` — verified via `PLAN_LIMITS` + `usage` metering + `POST /api/ask` 429 enforcement.
- `10 colecciones / 1.000 archivos` (Pro) — verified via `PLAN_LIMITS` (now UI derived).
- `Citas verificables / hasta 98% con cita` — verified via retrieval citations + `responseCompiler` (no hallucination if no source), footnote `según pruebas internas con contenido bien estructurado`.
- `0 datos para entrenar IA` — verified via Privacy policy / contract + `BYOK` data flow, `FAQ` answer + `LandingMetrics` footnote `ver Política…`.
- `Permisos por colección/rol` — verified via 5-Link Auth Chain, `EffectiveScope`.
- Pricing `39€/31€ (-20%)` — verified via `PRICING` + Stripe `priceIds` (env) + checkout `priceId` mapping (server-side).

Each requires owner + evidence link (test, config, doc).

### 2. Illustrative placeholders — acceptable in dev, tracked, must be replaced/verified before production
- Current `UseCaseCard` (`Centro de ayuda con citas`, `Incorporación rápida`, `Documentación viva`) labeled `Ejemplo ilustrativo` + footnote `No representan clientes…` — **not** customer endorsements, kept as placeholders until real cases.
- Any `* Ilustrativo` metrics — must be replaced with measured values before production.
- Must be tracked in this gate; disclaimer alone insufficient for quantitative/security/privacy/outcome claims.

### 3. Fabricated / misleading — must not ship
- Fake customer endorsements (e.g., “Marta Ibáñez / Nexora −73% tickets” — **removed** at 9bb9f47)
- Unsupported performance stats without methodology (e.g., `−73% tickets`, `+41% doc leída` — **removed**)
- Invented security guarantees or promises product cannot deliver
- “Unlimited” when cap enforced (Pro `ilimitados` vs `10` — **fixed** via `PLAN_LIMITS` import)
- Advertised trial without Billing support (`14 días gratis` — **removed** until Stripe trial configured)

## Gate checklist (release-blocking)

- [ ] No `Illustrative` with quantitative/security/privacy/customer-outcome claim remains without Verified evidence.
- [ ] Every numeric claim (`98%`, `3 líneas`, `1.000/10.000`, `10 colecciones`, `99,9%`) has owner + reproducible methodology / test / config / policy.
- [ ] Privacy claim `0 datos para entrenar` verified against actual data flow, providers (Stripe, Supabase), contracts, BYOK, and `privacy.md`.
- [ ] Stripe prices displayed (39/31) match `STRIPE_*_PRICE_ID` and checkout `line_items: [{price: priceId}]` (server-side, no `price` query param).
- [ ] `PLAN_LIMITS` ↔ UI ↔ API ↔ DB ↔ Stripe matrix reconciled (`docs/PLAN-CONSISTENCY-AUDIT.md`).
- [ ] Embed wildcard `*.okeng.io`/`*.arena.site`/`*.e2b.app` documented as intentional infra exception, scoped, with tests (preview allowlisted, others blocked).
- [ ] Boundary tests for each capped entitlement (below/at/unlimited/bypass/plan change/downgrade) pass.
- [ ] i18n parity EN/ES for all `auth.*`, `public.*`, `pricing` keys.

Any violation blocks `main` deploy.
