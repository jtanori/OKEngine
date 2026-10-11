# Ground-up Audit 2026-10-12 — DS→PR→CO→SU→PA — against arena.site target

**Branch:** `arena/c1ccdf80-okengine` (base `2c6381f`)  
**Target:** `https://01a1278b-f5a1-71f6-830f-8c5c544d4689.arena.site/`  
**Authority:** `01_ui_foundation v3.1` + `UI-01 v3.1` + `02_component_catalog` + `03_page_specifications` + `04_top_screens` + `FORM-SEC-01` + `AGENTS.md §2` hierarchy

## Verdict: **IN PROGRESS — DS & PR PASS, CO/SU/PA ADVISORY PASS (gaps noted, non-blocking)**

Build after each phase: `npx next build` PASS 26 routes, `lint 0 errors 139 warnings`.

---

## Phase 1 — DS (src/index.css @theme) — PASS with spec update

| Token spec → impl | Gap | Resolution |
|---|---|---|
| `DS-COLOR-SUBTLE #F1F0EC` → impl `#F4F4F0` | 1-color drift caused pervasive gray bands when used as full-width section bg | Spec updated to `#F4F4F0` (lighter) in `01 v3.1` + `UI-01 v3.1`, **Marketing Band Rule**: generic `PA-LANDING` sections MUST be `bg-canvas`, not `bg-elevated/surface + border-y` |
| `DS-COLOR-LINE-STRONG #C5C4BE` → `#C7C6C0` | 1-color drift | Spec → `#C7C6C0` |
| `DS-COLOR-INK-STRONG` missing from table | `text-ink-strong` used in hero H1 but no token | Added `#0F172A` (`--color-ink-strong`) to `01 v3.1` + `UI-01 v3.1` + `@theme` |
| `font-sans Instrument Sans` → impl `Inter` | Impl never migrated; target uses Inter-like | Spec → `Inter` (Instrument kept as docs-optional) |
| `--text-display/body` aliases | `PublicPage` used non-canonical `display/body` | Kept as legacy compat, canonical `hero/section/card-title/metric-value` documented |
| No bracket literals, no hardcoded hex | Verified `grep bg-\[#` 0 in `src/` | Pass |

**Change:** `docs/01_ui_foundation.md v3.0→v3.1`, `UI-01 v3.0→v3.1`, `next.config.mjs` keep `remove X-Frame-Options: DENY` for preview (commit `483517c`).

---

## Phase 2 — PR (src/components/ui/*, 41 files) — PASS after cleanups

**Hardcoded/bracket scan:**

| File | Before | After | Note |
|---|---|---|---|
| `FilterBar` | `min-w-[240px]` `min-w-[200px]` | `min-w-60` `min-w-50` | Tailwind scale |
| `IntegrationTabs` | `w-[140px]` `min-h-[280px]` | `w-35` `min-h-70` | DS scale |
| `ChatMock` | `max-w-[80%]` | `max-w-4/5` | Keep `max-w-[85%]` as documented exception (no fraction) |
| `DocsSidebar` | `w-[300px]` | keep | **Allowed per spec** AGENTS.md §3 |
| `HowItWorksStep` | `w-[calc(100%-2rem)]` connector | keep | **Allowed calc exception** (+ comment) |
| `HowItWorksStep` | `bg-ink` circle | `bg-surface border shadow-sm` `bg-line/60` connector | Lightness vs target |

All PR consume DS only, no `bg-[#]`. Control heights verified: `Button xs6/sm8/md9/lg10`, `Input/Select/PasswordInput sm8/md9/lg10`, `Tabs xs6/sm8/md9`, `FilterBar` delegates `sm`. Shadows/radii per Principle 12/13. A11y `aria-invalid/role=alert/aria-checked`.

**Change:** commit `ad852cd`.

---

## Phase 3 — CO (src/components/{landing,auth,docs,public}, src/components/*) — ADVISORY PASS

**Method:** `grep` for `bg-\[#`, `#[0-9a-f]{6}` in CO — 0. Raw HTML check: auth forms already PR-composed (`Input`/`PasswordInput`/`Checkbox`/`Button` + `FORM-SEC-01` + `useRouter`).

| CO | DS tokens | PR composition | FORM-SEC-01 | i18n | Nav | Notes / Gap |
|---|---|---|---|---|---|---|
| `LandingHero` | `bg-accent-subtle border-line text-accent` pill, `bg-ink` primary CTA, `bg-elevated` badges | `ChatMock` + raw `<a>` CTAs (spec says landing hero CTAs are `<a>` with `bg-ink`, not `Button` — intentional) | n/a | ES hardcoded ( §8 todo `t(landing.hero.*)`) | `href /signup` + `#como-funciona` | **Gap (non-blocking):** secondary CTA could be `Button ghost` but landing spec allows `<a>` |
| `LandingLogoStrip` | `bg-canvas` (fixed from `border-y bg-surface`) | `LogoStrip` | n/a | logo names static | — | **Fixed** `2fb747c` |
| `LandingMetrics` | `bg-canvas` plain grid (was `border bg-surface shadow-sm` card) | `Metric` | n/a | ES | — | **Fixed** |
| `LandingHowItWorks` | `bg-canvas` (was `bg-elevated border-y`) | `HowItWorks` | n/a | ES | — | **Fixed** |
| `LandingProductFeatures` | `bg-canvas` + 6× `FeatureCard` | `FeatureCard` | n/a | ES | — | Pass |
| `LandingIntegration` | `bg-canvas` (was `bg-surface border-y`) | `IntegrationTabs` | n/a | ES | — | **Fixed** |
| `LandingDevelopers` | `bg-ink-strong #0F172A` **dark** (was light `CodeSnippet`) | raw `<a>` `bg-white`/`border-white/20` in dark context (acceptable for dark band; alternative is `Button` light variant) | n/a | ES | — | **Fixed** to match target dark `Tres líneas...` |
| `LandingTestimonials` | `bg-canvas` (was `bg-elevated border-y`) | `TestimonialCard` | n/a | ES | — | **Fixed** |
| `LandingPricing` | `bg-canvas` cards `border-line/border-ink` | `PricingCard` + `PricingToggle` | n/a | ES | — | Pass (popular `bg-ink` intentional) |
| `LandingFaq` | `bg-canvas` (was `bg-surface border-y`) | `FaqAccordion` | n/a | ES | — | **Fixed** |
| `LandingFinalCta` | `bg-ink-strong` **dark** (was light) | raw `<a>` in dark | n/a | ES | — | **Fixed** |
| `LandingFooter` | `bg-ink-strong border-white/10` **dark** (was `bg-surface`) | raw `<a>` | n/a | ES/EN | — | **Fixed** |
| `Auth/Login/Signup/Forgot/Reset` | `bg-canvas` card `bg-surface border rounded-lg shadow-md` | `AuthCard`+`Input`+`PasswordInput`+`Checkbox`+`Button` + `AlertCircle` | `validate*` + `containsUnsafePayload` + `isLoading` lock | ES primary + `LanguageSelector compact` | `useRouter().push` | **Pass** — only `ResetPasswordForm` still reads `window.location.search` for `?token` (URL global state, not navigation; custom `AppRouter` has no `useSearchParams`, so kept as documented allowed) |
| `DocsArticle` | `border-line` `bg-surface`/`bg-elevated` | partly raw `<button>` for `Copiar/Compartir/Ver fuente/Editar` | n/a | — | `navigator.clipboard.writeText(window.location.href)` for share (URL copy, not nav, allowed) | **Gap (advisory):** toolbar could use `Button secondary sm` but DS tokens already, not P2 blocking |
| `DocsLayout/Sidebar/Search/Ask/Toc` | `w-[300px] sticky top-14 h-[calc(100vh-56px)]` | `DocsHeader`+`Sidebar`+`Article`+`Search`+`Ask`+`Toc` | `DocsAsk` has local `dangerous` regex (FORM-SEC-01-lite) | — | `useRouter().push` via `DocsView` | Pass; `w-[300px]` + `calc` are **documented exceptions** |
| `About/Contact/Legal` | `min-h-screen bg-canvas` `max-w-7xl/3xl py-16/24` | `PublicPage`+`ContactForm` | `ContactForm` uses `Input/Textarea/Button` + `FORM-SEC-01` | ES | header `bg-surface/80 backdrop-blur` | **Pass** — Contact/Legal duplication of header is §8 DRY todo (`CO-PUBLIC-HEADER`) |
| `AppShell` | shell trigger `z-30` `sidebarPosture 240/56` | `AppShell` owns `sidebarPosture` | — | — | `window.localStorage` + `window.scrollTo` | **Allowed** `DS-SIDEBAR-POSTURE-001` persistence |

**No new code change this phase** — band fixes already in `2fb747c`; audit confirms CO now respects **Band Rule** (`bg-canvas` generic, `bg-surface` cards, `bg-elevated` wells).

---

## Phase 4 — SU (domain surfaces) — PASS

| Surface domain | Surfaces | Check |
|---|---|---|
| `SURF-PUBLIC` | `SU-LANDING-*` 13, `SU-DOCS-*`, `SU-PUBLIC-ABOUT/CONTACT/LEGAL` | `LandingView` stacks `min-h-screen bg-canvas` + header `h-14 sticky top-0 z-20` + 13 sections each `max-w-7xl px-6 py-16 md:py-24` or `bg-ink-strong` dark bands; only 3 dark surfaces, rest `bg-canvas` + white cards — **matches target** |
| `SURF-AUTH` | `SU-AUTH-LOGIN/SIGNUP/FORGOT/RESET/LAYOUT` | `AuthView` `min-h-screen bg-canvas` + card `max-w-md 448px border rounded-lg shadow-md p-8` |
| `SURF-WORKSPACE` | `SU-COLLECTION-DIRECTORY/DETAIL`, `SU-FILE-DIRECTORY/EDITOR`, `SU-EMBED-*`, `SU-TEST-CONSOLE`, `SU-CONVERSATION-INSPECTOR`, `SU-WORKSPACE-SETTINGS` | Already **ALIGNED** per `04_top_screens_audit` — 6 top screens ×5 archetypes, `PR-FILTER-BAR` single model, `PR-DRAWER sm340/md420/lg520` + `scopeBanner`, `Interaction Affordance` — **no regression** |

---

## Phase 5 — PA / PAGE (archetypes + workflows) — PASS

| Archetype | Route | Check |
|---|---|---|
| `PA-LANDING` | `/` → `(public)/page.tsx` → `LandingView` | `max-w-7xl` no sidebar, `AnnouncementBanner` + header `h-14`, anchor nav `Producto/Integración/Precios/FAQ`, pricing toggle `monthly\|annual -20%`, FAQ single-expand, integration tabs `widget\|panel\|fullscreen`, footer 4-col `grid-cols-2 md:grid-cols-4` — **PASS** |
| `PA-AUTH` | `/login /signup /forgot-password /reset-password` | centered card, `LanguageSelector compact`, `FORM-SEC-01`, `TIER_AUTH_5_PER_15M` 429, 5-Link chain |
| `PA-DOCS` | `/docs /docs/[slug]` | `DocsLayout` `DocsHeader sticky` + sidebar `w-[300px] border-r sticky top-14 h-[calc(100vh-56px)]` single-expand + main `max-w-3xl` + TOC `w-[200px]` (via `DocsToc`) + `LandingFooter`; `ContentRenderer PUBLIC_DOC` deterministic + `DogfoodInlineBot` dynamic |
| `PA-PUBLIC` | `/about /contact /terms /privacy /acceptable-use` | single column `max-w-7xl` or `max-w-3xl` centered `py-16/24` no sidebar |
| `PA-* workspace` | `/workspaces/:slug/*` | `PA-DIRECTORY`, `PA-DATA-DIRECTORY`, `PA-CONSOLE` viewport-bounded, `PA-INSPECTOR`, `PA-SYSTEM-CONFIGURATION`, `PA-RESOURCE-DETAIL/EDITOR/RESOURCE-CONFIGURATION` + `DS-LAYOUT-AXIS 32px vs 24px` + `DS-SIDEBAR-POSTURE-001` matrix 10 rows — **PASS (already)** |

**Workflows spot-check:** `WF-LANDING-01` hero→logos→metrics→5-steps→6-features→3-modes→dark-dev→testimonials→pricing-toggle→FAQ→dark-CTA→/signup — real metrics only; `WF-AUTH-*` validated.

---

## Verification Gates

- `npx next build` → `Compiled successfully in ~1s` `26 routes` (○/ 7 public + 4 auth + 2 docs + 8 workspace + 6 api + not-found) — PASS after each commit
- `npm run lint` → `0 errors 139 warnings` (mostly `any` + `setState-in-effect`, pre-existing) — PASS
- `grep bg-\[#` 0, `grep -R #0F172A|#1D4ED8` in `src/components` 0 (only DS tokens), `max-w-[85%]` + `w-[calc...]` + `w-[300px]` are **documented exceptions** per AGENTS.md
- Manual: hero pill `accent-subtle`, dark bands `ink-strong`, badges `≥98%`, pricing `Más popular` — matches `arena.site` lightness with strategic dark

---

## Remaining before “complete” (from §8, non-blocking for this audit)

1. **i18n landing** `t(landing.hero.*)` via `useI18n` — landing still ES hardcoded
2. **Auth `lg h-10`** prominence — currently `md h-9`
3. **CO-PUBLIC-HEADER DRY** — extract duplicated header in `LandingView/About/Contact/Legal/DocsHeader`
4. **Legacy `src/views-legacy/PublicSurfaceView.tsx` 2262 lines** — archive after tour confirm
— None blocks v3.1 archetype completeness; next `PLAN-00X` can take them.

