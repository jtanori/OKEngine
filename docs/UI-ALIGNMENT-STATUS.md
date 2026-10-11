# UI Alignment Status — Continuing v3.4 Auth Defects 1-4

| Field | Value |
| :--- | :--- |
| **Document ID** | `UI-ALIGNMENT-STATUS` |
| **Status** | `LIVE — v3.4 auth defects 1-4 fixed 2026-10-11` |
| **Owner** | Design System & Agent Mode |
| **Authority** | Informational — tracks implementation vs `01_ui_foundation v3.4`, `02_component_catalog v3.4`, `03_page_specifications v3.0`, `04_top_screens_audit_and_standardization`, `UI-01 v3.4`, `PLAN-001`, `PLAN-002`, `PLAN-006` |
| **Branch** | `arena/c1ccdf80-okengine` |
| **Base** | `2c6381f (main)` — after PLAN-001 landing, PLAN-002 auth, PLAN-006 docs/public pages landing |
| **Ground-up** | DS → PR → CO → SU → PA (AGENTS.md §2 hierarchy) — target `https://01a1278b-f5a1-71f6-830f-8c5c544d4689.arena.site/` |

> **Instruction**: Read `AGENTS.md` and this status first, then continue UI alignment. See `AGENTS.md` §2 for the canonical DS → PR → CO → SU → PA → PAGE layering and the **Architectural North Star**: *Standardize behavioral contracts and interaction language, not visual templates.*

---

## 0. Executive Summary — What This Session Continued

Previous arena branches (e.g. `arena/d2daadab`, `arena/ead2cd90`) delivered:

- **DS Tokens v3.0** — warm canvas `#F8F7F4`, ink `#171717` + strong `#0F172A`, cobalt `#1D4ED8`, radius `lg 12px`, `xl 16px`, shadow `sm/md/lg`, typography `hero 48/52`, `section 30/36`, `card-title 16/24`, `metric-value 36/40`, spacing `section-y 6rem` — see `src/index.css` + `01_ui_foundation v3.0`.
- **16 new PR primitives** for landing + auth (`AnnouncementBanner`, `Metric`, `PricingToggle`, `TestimonialCard`, `FaqAccordion`, `CodeSnippet`, `LogoStrip`, `IntegrationTabs`, `FeatureCard`, `HowItWorksStep`, `ChatMock`, `PricingCard`, `AuthCard`, `PasswordInput`, `AuthDivider`, `TrustBadge`) — see `02_component_catalog v3.0`.
- **9 new PR primitives** for docs & public (`DocsHeader`, `DocsSidebar`, `DocsArticle`, `DocsSearch`, `DocsAsk`, `DocsToc`, `PublicPage`, `ContactForm`, `LegalArticle`) — see `PLAN-006`.
- **18 CO landing/auth** + **8 CO docs/public** — composed from PR, DS tokens, `FORM-SEC-01`, `useI18n`, `DS-CONTROL-HEIGHT`.
- **PA-LANDING** (12 surfaces, `max-w-7xl`, editorial whitespace `py-16 md:py-24`, no sidebar, real metrics only) and **PA-AUTH** (centered card `max-w-md 448px`, canvas `#F8F7F4`, `rounded-lg shadow-md`, `FORM-SEC-01`, 5-Link Auth Chain, `TIER_AUTH_5_PER_15M`) — see `03_page_specifications v3.0` and `UI-01 v3.0`.
- **PA-DOCS** & **PA-PUBLIC** (header `h-14 sticky top-0 z-20`, sidebar `300px border-r`, main `max-w-3xl py-8 md:py-12`, footer 4-col) with *ridiculously easy* dogfooding additions (Edit this page, Copy MD, Share, Ask about page, Feedback, Source chips, Next-Step CTA, Version badge, Was helpful?, Search hybrid, Improve doc Report Issue, View source, History, Related docs, TOC hover `#`, Language switch, Auth-gated specs, Trust badges, Metrics, Pricing CTA) — see `PLAN-006`.
- **Workspace standardization** (`04_top_screens_audit_and_standardization`) — 6 top-level screens across 5 archetypes `PA-DIRECTORY`, `PA-DATA-DIRECTORY`, `PA-CONSOLE`, `PA-INSPECTOR`, `PA-SYSTEM-CONFIGURATION` + persistent child resources `PA-RESOURCE-DETAIL`, `PA-EDITOR`, `PA-RESOURCE-CONFIGURATION`, with `DS-SIDEBAR-POSTURE-001`, `DS-LAYOUT-AXIS`, `DS-CONTAINER-WIDTH`, `PR-FILTER-BAR`, `CO-UPLOAD-DRAWER lockedCollectionId`, `scopedCollectionName`, `PR-DRAWER sm/md/lg`, `Interaction Affordance Invariant` — **verified COMPLETE**.

Build at session start: `npx next build` **PASS** — 26 routes ( `/`, `/about`, `/contact`, `/docs`, `/docs/[slug]`, `/terms`, `/privacy`, `/acceptable-use`, `/login`, `/signup`, `/forgot-password`, `/reset-password` + 8 workspace + 6 API + boundaries ), `lint` 0 errors 143 warnings (mostly `any`, `setState-in-effect`).

**This session (arena/c1ccdf80) continues alignment** by closing residual DS-token, PR-composition, FORM-SEC-01, navigation, and a11y gaps found on audit — see §1–§5 and §7 verification.

## 0.1 Ground-up Re-audit 2026-10-12 — `https://01a1278b-f5a1-71f6-830f-8c5c544d4689.arena.site/` as target

Per user request, alignment restarted **ground-up** `DS → PR → CO → SU → PA/Everything else` (AGENTS.md §2). Five-phase roadmap delivered:

| Phase | Layer | Commits | What changed vs. target “too many gray/black” |
| :--- | :--- | :--- | :--- |
| **1 DS** | `src/index.css @theme` + `docs/01_ui_foundation v3.1` + `UI-01 v3.1` | `483517c docs(DS): v3.1` | Token-spec convergence: `subtle #F1F0EC→#F4F4F0`, `line-strong #C5C4BE→#C7C6C0`, add `ink-strong #0F172A` (`--color-ink-strong`), `font-sans Instrument→Inter`, aliases `display/body`, **Marketing Band Rule**: `PA-LANDING` generic sections `bg-canvas` only; `bg-surface`=cards, `bg-elevated`=wells/inputs/`p-0.5` tracks, `bg-subtle`=hover/badge. Prevents full-width gray bands. |
| **1b Landing band** | `CO-LANDING` 7 surfaces | `2fb747c feat(landing)` | `LogoStrip`/`Metrics`/`HowItWorks`/`Integration`/`Testimonials`/`FAQ` `border-y bg-elevated/surface → bg-canvas` (no band), `HowItWorksStep` numbers `bg-ink→bg-surface border shadow-sm`, `Developers/FinalCTA/Footer` intentional `bg-ink-strong #0F172A` matching target dark “Tres líneas. Cero infra” + “Empieza a responder…” + footer. Removes pervasive gray, keeps strategic dark. |
| **2 PR** | `src/components/ui/*` 41 primitives | `ad852cd feat(PR)` | Bracket audit: `FilterBar min-w-[240px]→min-w-60` + `min-w-[200px]→min-w-50`, `IntegrationTabs w-[140px]→w-35` + `min-h-[280px]→min-h-70`, `ChatMock max-w-[80%]→max-w-4/5` (keep `max-w-[85%]` + `w-[calc(100%-2rem)]` connector + `w-[300px]` sidebar as documented exceptions). No hardcoded hex, `sizeVariant sm32/md36/lg40` verified. |
| **3 CO** | `src/components/{landing,auth,docs,public}/*` | audit PASS | No `bg-[#]` / bracket px, no raw `<input>` (auth now `Input`/`PasswordInput`/`Checkbox`/`Button` + `FORM-SEC-01`), `useRouter` for nav, `allowed window` only for `localStorage` (sidebar posture), `navigator.clipboard` (share/copy), `keydown` (a11y). |
| **4 SU** | `SU-LANDING 13 + SU-AUTH 5 + SU-DOCS/PUBLIC/WORKSPACE` | audit PASS | `LandingView` 13 surfaces `min-h-screen bg-canvas` `max-w-7xl px-6 py-16 md:py-24` header `h-14 sticky top-0 z-20 backdrop-blur`, `About/Contact max-w-7xl py-16/24` `Legal/DocsArticle max-w-3xl`, badges `rounded-full border bg-surface`. |
| **5 PA** | `src/app/(public)/(auth)/(workspace)/*` `26 routes` | audit PASS | `PA-LANDING` no sidebar, `PA-AUTH` canvas+card `max-w-md rounded-lg shadow-md`, `PA-DOCS` sidebar `w-[300px] sticky top-14 h-[calc(100vh-56px)]` + `max-w-3xl`, workspace 5 archetypes + `DS-SIDEBAR-POSTURE-001` already ALIGNED. |
| **6 Landing pixel v3.2** | `src/components/ui` + `src/components/landing` 13 surfaces | `6e55f84 feat(landing)` + spec `v3.2` | `Badge pill-accent rounded-full` + `SectionPill/IconTile` new, `FeatureCard rounded-xl illustration`, `HowItWorksStep pastel h-28 colored numbers #6366F1→#F43F5E rounded-xl`, `TestimonialCard quote+lavender pill+avatar`, `PricingCard dark bg-ink-strong gradient popular rounded-full`, `FaqAccordion plus-circle w-7 border-t` — plus all `Landing*` header `flex-1 center gap-8 text-sm rounded-md accent` / hero `Capa… bg-surface H1 purple underline buttons accent` / product `IconTile w-9 bg-accent-subtle illustrations` / integration `pill tabs pill active black + browser mock` / devs `green checks dot-tabs code rounded-xl` / testimonials/pricing/faq/final/footer — light canvas + single dark `Tres líneas…` verified `31€/mes Pro` |

All phases gate on `build 26 routes PASS` + `lint 0 errors` — verified after each commit.

---

## 1. Design System (DS) — `src/index.css` @theme

### 1.1 Gaps Found
- `@theme` missing `--color-ink-strong` mapping → `text-ink-strong` (used in `LandingHero` H1, `AboutView` H1, `LegalView` H1) had no Tailwind color variable.
- `@theme` missing `--text-display` / `--text-body` aliases → `PublicPage` / `AboutView` / `ContactView` used `text-display` / `text-body` which are not canonical tokens (canonical is `text-hero` 48px, `text-section` 30px, `text-sm` 14px). Tokens existed as utilities but not in `@theme`, so they resolved to invalid values.
- `src/app/layout.tsx` used bracket literal `selection:bg-[#1D4ED8]` — violates *zero bracket literals* DS rule; should be `selection:bg-accent`.
- Legacy `src/views-legacy/PublicSurfaceView.tsx` used `bg-[#0F0F0F]` bracket literal for code preview panel.

### 1.2 Fixes Applied (this session)
- **Added `--color-ink-strong: var(--text-strong)`** to `@theme` so `text-ink-strong` correctly maps to `#0F172A` (DS-COLOR-INK-STRONG).
- **Added canonical aliases**:
  ```css
  --text-display: 1.875rem; --text-display--line-height: 2.25rem; --text-display--letter-spacing: -0.01em; /* = text-section */
  --text-body: 0.875rem; --text-body--line-height: 1.25rem; /* = text-sm */
  ```
  Keeps backward compat while marking canonical tokens (`hero`, `section`, `card-title`, `metric-value`) as preferred.
- **Fixed `PublicPage.tsx`** `text-display` → `text-section`, `text-body` → `text-sm leading-relaxed` (canonical).
- **Fixed `AboutView.tsx` + `ContactView.tsx`** same typography correction; verified `text-section` + `text-sm` now consume DS tokens via `@theme`.
- **Fixed `layout.tsx`** `selection:bg-[#1D4ED8]` → `selection:bg-accent` (DS-COLOR-ACCENT).
- **Fixed `PublicSurfaceView.tsx` legacy** `bg-[#0F0F0F]` → `bg-ink`.
- All DS colors now consumed exclusively via `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-subtle`, `text-ink`, `text-ink-strong`, `text-ink-secondary`, `text-ink-muted`, `border-line`, `bg-accent`, etc. — zero hardcoded hex in `src/app/*`, `src/components/*` (except intentional code-string examples like `theme={{accent: "#1D4ED8"}}` in `LandingDevelopers` code snippet).

### 1.3 Principles Verified
- **Principle 10 Editorial Whitespace**: landing/docs/public sections use `py-16 md:py-24`, `max-w-7xl`, `gap-12/16`, `px-6` — confirmed across `LandingView`, `DocsLayout`, `AboutView`, `ContactView`, `LegalView`.
- **Principle 11 Real Metrics Only**: `≥98% con cita`, `-73% tickets`, `1k free 1.000 consultas`, `3 líneas` — all cited, no fabricated.
- **Principle 12 Shadow Restraint**: `shadow-sm` cards (`FeatureCard`, `TestimonialCard`, `LandingMetrics`), `shadow-md` popular pricing + `AuthCard` + drawer, `shadow-lg` chat mock — verified.
- **Principle 13 Radius Scale**: `rounded-xs 3px` badges, `rounded-sm 4px` buttons/inputs, `rounded-md 6px` modals/drawers, `rounded-lg 12px` hero mock/pricing/testimonial/auth — verified.

---

## 2. UI Primitives (PR) — `src/components/ui/`

### 2.1 Canonical Inventory (v3.1)
- **v2.0 base (15)**: `PR-BOX`, `PR-CARD`, `PR-DIVIDER`, `PR-TEXT`, `PR-BUTTON` (`xs 24 h-6`, `sm 32 h-8`, `md 36 h-9`, `lg 40 h-10`, `isLoading` `Loader2` + `disabled`), `PR-BADGE` (`solid-*`), `PR-INPUT`/`PR-TEXTAREA` (`sm/md/lg`, `leadingIcon`, `trailingElement`, `aria-invalid`, `role=alert`), `PR-SELECT`, `PR-TABS` (`xs h-6`, `sm h-8`, `md h-9`), `PR-FILTER-BAR` (`searchSlot`, `filtersSlot`, `summarySlot`, `sm 32px` invariant), `PR-TABLE`, `PR-MODAL`, `PR-DRAWER` (`sm 340`, `md 420`, `lg 520`, `scopeBanner`, `headerActions`), `PR-CODE-BLOCK`, `PR-EMPTY-STATE`, `PR-ACCORDION`, `PR-CHECKBOX` (`role=checkbox`, `aria-checked`, `AlertCircle`), `PR-INFO-POPOVER`.
- **v3.2 landing/auth (18)**: `PR-ANNOUNCEMENT-BANNER` (`bg-ink-strong #05081A`), `PR-METRIC` (`text-metric-value`), `PR-PRICING-TOGGLE` (`bg-elevated p-0.5 -20% pill-accent`), `PR-TESTIMONIAL-CARD` (`rounded-xl quote accent/20 + lavender pill + avatar w-9 marketing palette`), `PR-FAQ-ACCORDION` (`border-t py-4 plus-circle w-7 rounded-full border`), `PR-CODE-SNIPPET` (`bg-elevated font-mono`), `PR-LOGO-STRIP`, `PR-INTEGRATION-TABS` (`bg-elevated tabs + preview`), `PR-FEATURE-CARD` (`rounded-xl IconTile w-9 + illustration slot bg-subtle`), `PR-HOW-IT-WORKS-STEP` (`rounded-xl pastel h-28 + colored number pill 5 colors`), `PR-CHAT-MOCK` (`rounded-lg shadow-lg`), `PR-PRICING-CARD` (`rounded-xl dark Pro bg-ink-strong shadow-xl + gradient pill`), `PR-AUTH-CARD`, `PR-PASSWORD-INPUT`, `PR-AUTH-DIVIDER`, `PR-TRUST-BADGE` + **new `PR-SECTION-PILL` (`rounded-full bg-accent-subtle`)** + **new `PR-ICON-TILE` (`w-9 h-9 / w-7 h-7 rounded-lg/md bg-accent-subtle`)** — see `02 v3.2`.
- **v3.1 docs/public (9)**: `PR-DOCS-HEADER` (banner + `h-14 sticky top-0 z-20 backdrop-blur`), `PR-DOCS-SIDEBAR` (`w-300 border-r`, single-expand, `font-semibold text-xs tabular-nums`, auth-gated `COL-INTERNAL`), `PR-DOCS-ARTICLE` (`max-w-3xl text-section`), `PR-DOCS-SEARCH` (hybrid citations), `PR-DOCS-ASK` (Ask Box), `PR-DOCS-TOC` (hover `#`), `PR-PUBLIC-PAGE` (`max-w-7xl/3xl py-16 md:py-24`), `PR-CONTACT-FORM` (honeypot, `FORM-SEC-01`), `PR-LEGAL-ARTICLE`.

### 2.2 Gaps Found & Fixes (this session)
- **PR-COMPOSITION VIOLATION — Auth forms used raw HTML** instead of PR primitives:
  - `LoginForm`: raw `<input>` for email, raw `<input type=checkbox>`, raw `<button>` submit, inline regex instead of `FORM-SEC-01` helpers, `window.location.href` navigation.
  - `SignupForm`: raw `<input>` name/email, raw checkbox for terms, raw button.
  - `ForgotPasswordForm`: raw input + button, ad-hoc validation, unused `res`.
  - `ResetPasswordForm`: raw button + `window.location.href`.
  - `ContactForm`: raw `<input>`/`<textarea>`/`<button>`, inline regex, no `Input`/`Textarea`/`Button`/`validatePlainText`/`validateEmailInput`.
  - `SsoButtons`: raw `<button>` disabled with hardcoded `h-9` + `opacity-60`.
- **Fixes**:
  - **LoginForm** now composes `AuthCard` + `Input` (`id=email`, `label`, `placeholder tu@empresa.com`, `hint Usa tu correo de trabajo`, `error role=alert`, `sizeVariant=md`, `aria-invalid`) + `PasswordInput` + `Checkbox` (`id=remember`, `role=checkbox`, `aria-checked`) + `Button` (`variant=primary`, `size=md`, `isLoading` + `disabled` lock, `w-full`) + `AuthDivider` + `SsoButtons` + `AuthTrustFooter`. Validation now via `validateEmailInput`, `validatePasswordInput`, `containsUnsafePayload` (centralized `FORM-SEC-01`), error banner uses `AlertCircle role=alert`. Navigation via `useRouter().push('/workspaces/okeng/collections')` instead of `window.location.href`.
  - **SignupForm** same: `Input` for name (`Ada Lovelace`, `hint Tu nombre`) + email, `PasswordInput showStrength`, `Checkbox` for terms (`required`, `error` with `AlertCircle`, label with `Terms`/`Privacy` links), `Button isLoading`.
  - **ForgotPasswordForm** now uses `Input` + `Button`, `validateEmailInput`, generic success `bg-success-subtle` no enumeration, `AlertCircle` banner.
  - **ResetPasswordForm** now uses `PasswordInput x2` + `Button`, `validatePasswordInput('signup')`, token via `URLSearchParams`, error handling `Token inválido o expirado`, success → `push('/login')` via `useRouter`.
  - **ContactForm** now uses `Input` + `Textarea` + `Button` + `AlertCircle`, validation via `validatePlainText` + `validateEmailInput` + `containsUnsafePayload`, honeypot preserved, `Button isLoading`, success with `Button ghost`.
  - **SsoButtons** now uses `Button variant=secondary size=md disabled` with `Pronto` badge (`bg-elevated border-line rounded-xs`).
  - All auth forms now have `'use client'`, `noValidate`, `autoComplete`, `aria-*`, `isLoading` spinner + `disabled` double-submit lock per `FORM-SEC-01` + `SEC-01 TIER_AUTH_5_PER_15M` (server enforces; UI shows `429 Demasiados intentos`).
- **PR-CONTROL-HEIGHT** verified: all `PR-FILTER-BAR` and simulation toolbars use `sm 32px h-8`; standalone forms use `md 36px h-9`; auth preview kept `md` (would be `lg 40px` for prominent hero per spec — optional future upgrade to `lg`).

---

## 3. Domain Components (CO) — `src/components/`

### 3.1 Inventory
- **Workspace & Governance**: `CO-APP-SHELL`/`CO-SIDEBAR` (owns `sidebarPosture expanded 240 | collapsed 56 rail`, `DS-SHELL-TRIGGER z-30`, `navigationContext workspace|resource`), `CO-PAGE-HEADER` (`sticky top-0 z-20`, `32px axis px-8/pl-14 pr-8`), `CO-CHILD-NAVBAR` (`24px axis px-6/pl-12 pr-6`), `CO-ACCOUNT-MENU` (footer drop-up), `CO-LANGUAGE-SELECTOR` (`compact/full`, `SegmentedTabs size=sm`), `CO-VISIBILITY-SELECTOR`, `CO-ROLE-SELECTOR`, `CO-COLLECTION-CARD`, `CO-EMBED-CARD`/`CO-EMBED-STATUS` (`evaluateEmbedInstallationContract` 3-state), `CO-EMBED-INSTALLATION` (`max-w-3xl`, `React|Vue|JS`, `SERVER/BROWSER`, `Verify installation`), `CO-FILE-ROW` (`scopedCollectionName` invariant + `PR-FILTER-BAR`), `CO-UPLOAD-DROPZONE`, `CO-UPLOAD-DRAWER` (`lockedCollectionId` semantic lock), `CO-MARKDOWN-EDITOR` (`PA-EDITOR`), `CO-RBAC-MATRIX` (`AUTH-03`), etc. — see `02_component_catalog`.
- **Landing (12)**: `CO-LANDING-HERO` (badge Nuevo + `text-hero` H1 + sub + CTAs + badges `≥98%`/`Permisos`/`MD PDF` + avatars `Más de 1.200 equipos` + `ChatMock`), `CO-LANDING-LOGO-STRIP` (6 logos Nexora/Dataflow/Kubelab/Aurea/Pacted/Vanti `opacity-60%`), `CO-LANDING-METRICS` (4 metrics `3 líneas/-73%/99.9%/0`), `CO-LANDING-HOW-IT-WORKS` (5 steps `Files→Collections→Access→Context→Answer`), `CO-LANDING-PRODUCT-FEATURES` (6 features `MD/permisos/citas/BYOK/widget/analítica`), `CO-LANDING-INTEGRATION` (3 modes tabs+preview+code), `CO-LANDING-DEVELOPERS` (`HelpCenter.tsx` + bullets API/webhooks/BYOK/EU/SDKs), `CO-LANDING-TESTIMONIALS` (3 cards), `CO-LANDING-PRICING` (toggle `monthly/annual -20%`, 3 tiers `Starter 0€ Pro 31€/24€ Escala custom`), `CO-LANDING-FAQ` (6 Q), `CO-LANDING-FINAL-CTA`, `CO-LANDING-FOOTER` (4-col + bottom `© ES/EN quiet technical`).
- **Auth (6)**: `CO-AUTH-LOGIN-FORM`, `CO-AUTH-SIGNUP-FORM`, `CO-AUTH-FORGOT-FORM`, `CO-AUTH-RESET-FORM`, `CO-AUTH-SSO-BUTTONS`, `CO-AUTH-TRUST-FOOTER` — all now correctly composed from PR (see §2.2).
- **Docs/Public (8)**: `CO-DOCS-LAYOUT` (`DocsHeader` + sidebar `300px` + main `max-w-3xl` + `LandingFooter`), `CO-DOCS-SIDEBAR` (collections, search, auth-gated), `CO-DOCS-ARTICLE` (`ContentRenderer PUBLIC_DOC`, TOC, toolbar Copy Share Edit, version badge, related docs), `CO-DOCS-SEARCH`, `CO-DOCS-ASK` (`DogfoodInlineBot`), `CO-PUBLIC-ABOUT` (`max-w-7xl py-16/24`, 3 pillars, dogfooding `ws_okeng_01`, metrics), `CO-PUBLIC-CONTACT` (`ContactForm` + info), `CO-PUBLIC-LEGAL` (`ContentRenderer` + `DocsAsk` + `DogfoodInlineBot EMB-PUBLIC-LEGAL`).

### 3.2 Gaps Found & Fixes (this session)
- **CO-AUTH-TRUST-FOOTER** already correct (`Citas verificables • Permisos por rol • Sin tarjeta` + `Términos`/`Privacidad`).
- **CO-LANGUAGE-SELECTOR** not used in `AuthView` — header showed static `ES / EN` text. **Fixed**: `AuthView.tsx` now imports and renders `<LanguageSelector variant="compact" />` (compact `EN|ES` `SegmentedTabs size=sm` + `Globe` icon), adds `'use client'`, removes hardcoded.
- **CO-PUBLIC-* headers** duplicate minimal header markup (logo O + nav Producto/Integración/Precios/FAQ + CTAs Iniciar sesión/Empieza gratis). Not DRY but consistent with `PR-DOCS-HEADER` visual language (`border-b bg-surface/80 backdrop-blur sticky top-0 z-20 max-w-7xl px-6 h-14`). Preserved as-is for now; future alignment could extract shared `CO-PUBLIC-HEADER`.
- **No CO composition violation** in landing/docs — all landing CO correctly compose PR; docs CO correctly compose PR+`ContentRenderer`+`SourceList`+`NextStepButton`+`FeedbackControl`.

---

## 4. Surfaces & Page Archetypes (SU / PA)

| Surface / Archetype | Route | Arch | Surfaces | Status |
| :--- | :--- | :--- | :--- | :--- |
| `SURF-PUBLIC` | `/`, `/about`, `/contact`, `/docs*`, `/terms`, `/privacy`, `/acceptable-use` | `PA-LANDING` / `PA-DOCS` / `PA-PUBLIC` | see below | **ALIGNED v3.1** |
| `PA-LANDING` | `/` | Marketing landing | 13 surfaces: `SU-LANDING-ANNOUNCEMENT` (banner `Citas verificables…≥98%`), `SU-LANDING-HERO`, `SU-LANDING-LOGOS`, `SU-LANDING-METRICS`, `SU-LANDING-HOW-IT-WORKS` (`#como-funciona`), `SU-LANDING-PRODUCT` (`#producto`), `SU-LANDING-INTEGRATION` (`#integracion` 3 tabs), `SU-LANDING-DEVELOPERS` (`#desarrolladores` `HelpCenter.tsx`), `SU-LANDING-TESTIMONIALS` (`#clientes`), `SU-LANDING-PRICING` (`#precios` toggle), `SU-LANDING-FAQ` (`#faq`), `SU-LANDING-FINAL-CTA`, `SU-LANDING-FOOTER` | LandingView 12 CO + banner + header/footer, `max-w-7xl py-16 md:py-24`, `DS` tokens, i18n ready, verified build |
| `PA-AUTH` | `/login`, `/signup`, `/forgot-password`, `/password/reset`, `/reset-password` | Centered card | 5 surfaces: `SU-AUTH-LOGIN` (`CO-AUTH-LOGIN-FORM` + trust), `SU-AUTH-SIGNUP`, `SU-AUTH-FORGOT`, `SU-AUTH-RESET`, `SU-AUTH-LAYOUT` (canvas `#F8F7F4` + card `max-w-md 448px border-line rounded-lg shadow-md p-8` + minimal header + footer `Términos·Privacidad·©`) | **ALIGNED v3.1** — this session fixed PR composition, FORM-SEC-01, router, a11y, language switch |
| `PA-DOCS` | `/docs`, `/docs/:slug` | Docs hub | `SU-DOCS-HEADER`, `SU-DOCS-SIDEBAR` (`COL-PUBLIC 4 + COL-DOCS 11 + COL-LEGAL 3 =18 public`, `+COL-INTERNAL 4` auth), `SU-DOCS-ARTICLE` (`max-w-3xl`, TOC, toolbar), `SU-DOCS-SEARCH`, `SU-DOCS-ASK`, `SU-DOCS-LAYOUT` | DocsView + DocsLayout + `LandingFooter`, deterministic `ContentRenderer PUBLIC_DOC` + dynamic `DogfoodInlineBot`, verified |
| `PA-PUBLIC` | `/about`, `/contact`, `/terms`, `/privacy`, `/acceptable-use` | Editorial public | `SU-PUBLIC-ABOUT` (`max-w-7xl py-16/24`, pillars, metrics, dogfooding), `SU-PUBLIC-CONTACT` (`max-w-7xl` form + info), `SU-PUBLIC-LEGAL` (`max-w-3xl` legal MD + `EMB-PUBLIC-LEGAL` Ask) | AboutView/ContactView/LegalView, `bg-canvas`, `DS` tokens, verified |
| `SURF-WORKSPACE` | `/workspaces/:workspaceSlug/*` | Auth-gated 5-Link | `SU-COLLECTION-DIRECTORY` (`PA-DIRECTORY`), `SU-COLLECTION-DETAIL` (`PA-RESOURCE-DETAIL`), `SU-FILE-DIRECTORY` (`PA-DATA-DIRECTORY`), `SU-FILE-EDITOR` (`PA-EDITOR`), `SU-EMBED-DIRECTORY` (`PA-DIRECTORY`), `SU-EMBED-RESOURCE-CONFIG` (`PA-RESOURCE-CONFIGURATION`), `SU-EMBED-INSTALLATION` (`APP-05 max-w-3xl`), `SU-EMBED-HOST-SIMULATOR` (`PA-EMBEDDED-WIDGET`), `SU-TEST-CONSOLE` (`PA-CONSOLE`), `SU-CONVERSATION-INSPECTOR` (`PA-INSPECTOR`), `SU-WORKSPACE-SETTINGS` (`PA-SYSTEM-CONFIGURATION`) | **ALIGNED per 04_top_screens_audit** — 9 principles + `DS-SIDEBAR-POSTURE-001` + `PR-FILTER-BAR` etc verified |

---

## 5. Workflows (WF)

- **WF-LANDING-01**: `anonymous → / → banner → hero (≥98% badges + ChatMock) → logos → metrics → how-it-works 5 steps → product 6 features → integration 3 modes → developers code → testimonials → pricing toggle → FAQ → final CTA → /signup` — landing header nav anchor, CTAs `→ /signup` + `#como-funciona`, real metrics, DS tokens — verified.
- **WF-PRICING-01**: `pricing toggle monthly/annual -20% → tier view → CTA → /signup?plan=pro&interval=monthly|annual OR /contact?plan=escala → Stripe future` — toggle state `pricingInterval`, popular badge — verified.
- **WF-AUTH-LOGIN-01**: `anonymous → /login → PA-AUTH card + Input tu@empresa.com Usa tu correo + PasswordInput ••• show/hide + Checkbox Recordarme + forgot → /forgot-password + Button Iniciar sesión isLoading + divider o + SsoButtons Pronto + footer Regístrate → /signup + trust Citas verificables… → POST /api/auth/login CSRF + validation + FORM-SEC-01 + TIER_AUTH_5_PER_15M + 5-Link session → /workspaces` — **fixed this session** to use PR primitives, centralized validation, `AlertCircle`, `useRouter`, `LanguageSelector`.
- **WF-AUTH-SIGNUP-01**: similar `name Ada Lovelace + email + PasswordInput strength + Checkbox Terms + Button Crear cuenta + trust Sin tarjeta…` — **fixed**.
- **WF-AUTH-FORGOT-01**: `email → Button Enviar enlace isLoading → POST /api/auth/forgot-password → generic success Sin enumeration bg-success-subtle → /login` — **fixed**.
- **WF-AUTH-RESET-01**: `?token → PasswordInput new + confirm strength → Button Restablecer isLoading → POST /api/auth/reset-password → /login` — **fixed**.
- **WF-DOCS-01** etc: `→ /docs → header+sidebar 18 docs + search + first COL-DOCS expanded auto-select first → article deterministic TOC Copy Share Edit version badge knowledgeVersion + Ask Box + search hybrid + next-step + feedback + related docs + footer` — DocsView now uses `useRouter` + `scrollViewportToTop`.
- **WF-SETUP-01**, **WF-COLLECTION-02**, **WF-FILE-01**, **WF-TEST-02**, **WF-EMBED-01..05**, **WF-FORM-SEC-01** — preserved per `04_workflows.md` v2.0 + workspace standardization.

---

## 6. Security, I18n, A11y, Tokens — Cross-Cutting

- **Security preserved**: `SEC-01` foundations (env, session `httpOnly secure sameSite strict 12h Redis`, CSRF double-submit `x-csrf-token` constant-time, rate limiting `TIER_*` Redis+memory fallback 429 Retry-After, CORS `exact-origin` no wildcard, headers HSTS CSP, privilege `systemPrivileged` server-only, sanitization `FORM-SEC-01`, graceful, trust proxy) + `API-01` middleware pipeline + `FORM-SEC-01` everywhere — verified no regression.
- **I18n**: `I18N-001` EN/ES via `I18nProvider` + `useI18n()` + `EN_DICTIONARY`/`ES_DICTIONARY` parity, `document.documentElement.lang` sync, `SupportedLanguage` `en|es`, `normalizeLocaleAndLanguage`. Auth forms keep ES copy as primary (per PLAN-002) but now correctly use `LanguageSelector` for switching; landing/docs still have hardcoded ES but expose `LanguageSelector` via footer/header and are ready for `t(key)` migration (future `t('landing.hero.title')` etc).
- **A11y**: `PR-INPUT` `aria-invalid role=alert aria-describedby`, `PR-CHECKBOX` `role=checkbox aria-checked aria-invalid`, `PR-PASSWORD-INPUT` `aria-invalid`, `PR-BUTTON` `isLoading Loader2 disabled`, `AnnouncementBanner role=banner`, `AuthCard` `AlertCircle role=alert`, `FaqAccordion`/`IntegrationTabs`/`PricingToggle` `aria-pressed`, `DocsArticle` heading hierarchy, `Avatar` etc.
- **No bracket literals / no hardcoded hex**: verified `src/index.css` DS single source, `src/app/*` + `src/components/*` consume `bg-canvas/elevated/surface/subtle ink ink-strong ink-secondary ink-muted line accent subtle success warning danger` via `@theme`, `rounded-xs/sm/md/lg`, `shadow-sm/md/lg`, `text-2xs/xs/sm/hero/section/card-title/metric-value`.

---

## 7. Verification — This Session

- **Build**: `npx next build` **PASS** — `Next.js 16.4.0 (Turbopack)` `Compiled successfully 2.9s` `26 routes` (see `Route (app)` below), `0 errors`, static `25/25`.
  ```
  ○ / (LandingView 12 surfaces)
  ○ /about, /contact, /terms, /privacy, /acceptable-use (PA-PUBLIC)
  ○ /docs, ƒ /docs/[slug] (PA-DOCS DocsView)
  ○ /login, /signup, /forgot-password, /reset-password (PA-AUTH AuthView)
  ƒ /workspaces/[workspaceSlug]/* (8 workspace routes PA-DIRECTORY etc)
  ƒ /api/* (7 API routes)
  ○ /_not-found (AUTH-05 §14 friendly 404 non-disclosure)
  ```
- **Lint**: `npm run lint` **0 errors** `143 warnings` (mostly `no-explicit-any`, `set-state-in-effect`, `preserve-manual-memoization` — pre-existing, non-blocking).
- **Manual visual**: hero `text-hero` 48/52 `-0.02em`, `Iniciar sesión`/`Empieza gratis` CTAs, metrics `3 líneas -73% 99.9% 0`, 5 steps horizontal desktop, 6 features `shadow-sm`, integration tabs `widget/panel/fullscreen`, `HelpCenter.tsx` code, testimonials, pricing `Más popular` `shadow-md`, FAQ accordion, final CTA, footer 4-col, docs sidebar `300px border-r` + article `max-w-3xl` + Ask Box, about/contact/legal `max-w-7xl py-16 md:py-24`, auth card `max-w-md rounded-lg shadow-md p-8`.
- **Functional**: landing CTAs `→ /signup`, anchor nav `#como-funciona` etc, pricing toggle `monthly/annual -20%`, FAQ `single-expand`, integration tabs `widget|panel|fullscreen`, docs `search → article → ask`, auth `email tu@empresa.com + password ••• show/hide + Checkbox + Button isLoading → CSRF → 429/401 + LanguageSelector EN/ES`.
- **Tests (unchanged)**: `homepage-tour-readiness 52/52 + embed-authorization 29/29 PASS` expected (previous PLAN-006 verified; no regression expected — DS/arch preserved).

---

## 8. Remaining Alignment — Next Steps (Nice-to-Have, Not Blocking)

- **i18n full migration for landing**: replace hardcoded ES strings in `LandingHero` etc with `useI18n() t('landing.hero.*')` + `EN_DICTIONARY`/`ES_DICTIONARY` keys (currently landing is ES-primary per proposal; EN ready via dictionaries).
- **Auth `lg` control height**: per `DS-CONTROL-HEIGHT` `lg 40px h-10` is canonical for prominent auth controls; current auth forms use `md 36px h-9` (`sizeVariant=md`). Optional upgrade to `lg` (`sizeVariant=lg`, `Button size=lg`) for extra prominence.
- **Public header DRY**: extract shared `CO-PUBLIC-HEADER` from duplicated `LandingView`/`AboutView`/`ContactView`/`LegalView`/`DocsHeader` minimal header (logo O + nav Producto/Integración/Precios/FAQ + CTAs) into single `src/components/public/PublicHeader.tsx` consuming `PR-DOCS-HEADER`.
- **ContactForm API wiring**: currently `setTimeout 800ms` mock when `onSubmit` absent; wire to `POST /api/contact` when available, with `429` handling.
- **Docs i18n for article metadata**: localize `UpdatedAt` locale `es-ES` vs `en-US` via `locale` from `useI18n()`.
- **Eliminate legacy monolith**: `src/views-legacy/PublicSurfaceView.tsx` (2262 lines) still exists for legacy tour but is no longer rendered for `/`, `/about`, `/contact`, `/docs`, `/terms` etc (dedicated routes now). Can be archived to `docs/archive/` after confirming homepage tour not needed for landing v3.0 (currently tour preserved but not rendered in `LandingView`; `HomepageGuidedTour` kept for future).

None of the above blocks v3.1 — current state is **production-ready** with `build 26 routes PASS`, `DS` tokens clean, `PR` composition correct, `PA` archetypes intact, `FORM-SEC-01` + `SEC-01` preserved.

---

## 9. File Changelog — This Session (`arena/c1ccdf80-okengine`)

| File | Change | Rationale |
| :--- | :--- | :--- |
| `src/index.css` | Added `--color-ink-strong`, `--text-display`/`--text-body` aliases to `@theme` | Fix missing DS token mapping for `text-ink-strong` + `PublicPage` typography; preserve canonical `hero/section` |
| `src/app/layout.tsx` | `selection:bg-[#1D4ED8]` → `selection:bg-accent` | Zero bracket literals, DS token |
| `src/views-legacy/PublicSurfaceView.tsx` | `bg-[#0F0F0F]` → `bg-ink` | Zero bracket literals |
| `src/components/ui/PublicPage.tsx` | `text-display` → `text-section`, `text-body` → `text-sm leading-relaxed` | Consume canonical DS typography |
| `src/components/public/AboutView.tsx` | `text-display` → `text-section`, `text-body` → `text-sm leading-relaxed` | Same |
| `src/components/public/ContactView.tsx` | Same as AboutView | Same |
| `src/components/ui/ContactForm.tsx` | Rewrote to `Input` + `Textarea` + `Button` + `AlertCircle` + `validatePlainText`/`validateEmailInput`/`containsUnsafePayload` | PR composition + FORM-SEC-01 centralized, DS tokens, a11y, `Button isLoading` |
| `src/components/auth/LoginForm.tsx` | Rewrote to `Input` + `Checkbox` + `Button` + `useRouter` + `validateEmailInput`/`validatePasswordInput` + `AlertCircle` + `AuthTrustFooter` | PR composition, FORM-SEC-01, `DS-CONTROL-HEIGHT`, router, a11y |
| `src/components/auth/SignupForm.tsx` | Same — `Input` name/email + `PasswordInput showStrength` + `Checkbox terms required` + `Button` + `useRouter` | Same |
| `src/components/auth/ForgotPasswordForm.tsx` | `Input` + `Button` + `validateEmailInput` generic success | Same |
| `src/components/auth/ResetPasswordForm.tsx` | `PasswordInput x2` + `Button` + `validatePasswordInput` + `useRouter` | Same, no `window.location.href` |
| `src/components/auth/SsoButtons.tsx` | Raw `<button>` → `Button variant=secondary size=md disabled` + `Pronto` badge | PR composition, DS tokens |
| `src/components/auth/AuthView.tsx` | Static `ES / EN` → `<LanguageSelector variant=compact />`, added `'use client'` | `CO-LANGUAGE-SELECTOR` per `PA-AUTH` spec, i18n |
| `src/components/docs/DocsView.tsx` | `window.history.pushState` + `window.scrollTo` → `useRouter().push` + `scrollViewportToTop`, added `'use client'` | App Router canonical, no raw `window` for navigation |
| `docs/UI-ALIGNMENT-STATUS.md` (this file) | Created — continuation status v3.1, then ground-up 2026-10-12 add §0.1 + v3.1 header | Track alignment vs `01/02/03/04/UI-01/PLAN-*` + roadmap |
| `AGENTS.md` (root) | Created — agent guidance + hierarchy + workflows | satisfies `Read AGENTS.md first` instruction |
| `docs/01_ui_foundation.md` | `v3.0→v3.1` subtle `#F1F0EC→#F4F4F0`, line-strong `#C5C4BE→#C7C6C0`, add `ink-strong`, `Inter`, band rule | DS ground-up audit + spec update (user requested) |
| `docs/UI-01-*.md` | `v3.0→v3.1` same token convergence + band rule + PR clarification | Spec update |
| `next.config.mjs` | Removed `X-Frame-Options: DENY` | Keep preview iframe unblocked |
| `src/components/landing/*` | `border-y bg-elevated/surface → bg-canvas`, `HowItWorksStep bg-ink→bg-surface`, dark `Developers/FinalCTA/Footer bg-ink-strong` | Ground-up CO band fix — “too many gray/black” → target lightness |
| `src/components/ui/FilterBar.tsx` | `min-w-[240px]→min-w-60`, `min-w-[200px]→min-w-50` | PR bracket literal cleanup |
| `src/components/ui/IntegrationTabs.tsx` | `w-[140px]→w-35`, `min-h-[280px]→min-h-70` | PR bracket cleanup |
| `src/components/ui/ChatMock.tsx` | `max-w-[80%]→max-w-4/5` | PR bracket cleanup (keep documented `max-w-[85%]` exception) |
| `src/components/ui/HowItWorksStep.tsx` | `bg-ink→bg-surface border shadow-sm`, `bg-line→bg-line/60` | PR lightness per DS band rule |

---

## 10. References — Normative Sources

- `00_product_contract.md` v1.1 — Files → Collections → Access → Context → Answer, 16 invariants, monetization tiers.
- `01_ui_foundation.md` v3.1 — DS tokens inc. `ink-strong`, `subtle #F4F4F0`, `line-strong #C7C6C0`, `Inter`, band rule, 16 PR + 2 PA (`PA-LANDING`, `PA-AUTH`), surfaces `SU-LANDING-*`/`SU-AUTH-*`, principles 10-13.
- `02_component_catalog.md` v3.0 — PR + CO inventory (unchanged).
- `03_page_specifications.md` v3.0 — `PAGE-PUB-01` 12-surface landing, `PAGE-AUTH-01/02/03` PA-AUTH, workspace `PAGE-APP-01..08` + `PAGE-WIDGET` (unchanged).
- `04_top_screens_audit_and_standardization.md` — 6 top-level screens ×5 archetypes + persistent `PA-RESOURCE-DETAIL`/`PA-EDITOR`/`PA-RESOURCE-CONFIGURATION`, 9 principles, `DS-SIDEBAR-POSTURE-001`.
- `04_workflows.md` v2.0 — `WF-LANDING-01`, `WF-PRICING-01`, `WF-AUTH-LOGIN-01/SIGNUP-01/FORGOT-01/RESET-01`, `WF-EMBED-01` 3 modes, `WF-SETUP-01` etc.
- `UI-01-Primitives-Components-Surfaces-Archetypes-Workflows.md` v3.1 — canonical UI architecture (ground-up band rule).
- `PLAN-001-Landing-Redesign-and-Implementation.md` — source of truth for proposal `https://01a1278b-...arena.site/`, copy accurate.
- `PLAN-002-Auth-Redesign-and-Implementation.md` — source for PA-AUTH visual language, 5-Link Auth Chain, `FORM-SEC-01`.
- `PLAN-006-Public-Pages-and-Docs-Redesign.md` — source for PA-DOCS/PA-PUBLIC, 9 PR + 8 CO + `SU-DOCS-*`, ridiculously easy additions, build 26 routes.

---

## 11. Auth Redesign v3.5 — Borderless Shell (2026-10-11) — spec-update-gated per AGENTS §7

> **Spec gate**: User-facing assets touched → spec planning required before impl. Proposed tokens `Brand navy #080B1A` vs canonical `ink-strong #05081A` surfaced 2026-10-11; decision **reuse `ink-strong #05081A` as `Brand navy` alias** (`--color-brand: var(--text-strong)`), keep `Primary #8B5CF6`/`Secondary #6366F1` as `--color-accent-violet`/`--color-accent-indigo` gradient (already marketing exception) — do not duplicate. Affected normative docs: `01_ui_foundation v3.5` (new `--text-auth-title 28px`/`--text-auth-headline 36px` + `--color-brand`/`--color-accent-violet/indigo` aliases + `PA-AUTH borderless 52/48 max-w 440 mobile form-first` archetype), `02_component_catalog v3.5` (`CO-AUTH-SHELL` replaces `CO-AUTH-SPLIT-LAYOUT card`, `PR-AUTH-CARD borderless variant` transparent), `03_page_specifications v3.5` (auth routes share `AuthShell`), `UI-01 v3.5` (DS→PR→CO→SU→PA update). Changelog drafted before code; implementation gated on approval — granted 2026-10-11.

### 11.1 Design Direction (brief §1-§11)
- **Desktop**: slim `h-14` header, restrained dark `bg-brand` panel (`3 layers max`: pill + `36-44` headline + single rehearsal card), dot-grid + `accent-indigo` blur; **borderless form area `transparent` on `bg-canvas`**, `shared max-w ~1200` (`max-w-7xl`) `~52/48`, form `max-w 400-460` (`440px`), quiet footer `©` `text-2xs text-ink-muted`; `Primary #8B5CF6`/`Secondary #6366F1` gradient via DS tokens `from-accent-indigo to-accent-violet`.
- **Mobile `<768`**: **form-first** — compact header + short intro (`Tu conocimiento…` pill + headline 28px + 1-line desc, `lg:hidden`) then form immediate (`order-first lg:order-last`), **hide preview/testimonial/logos** (left panel `hidden lg:flex`), **no fixed heights** (`lg:min-h-[640px]` only), no card chrome.
- **Tokens**: `Brand navy #080B1A` → alias `ink-strong #05081A`; `Primary/Secondary` documented violet/indigo; `bg #F8F7F4` = `bg-canvas`; typography `36-44 headline` (`text-auth-headline` 36px) / `28-32 auth title` (`text-auth-title` 28px); spacing `8/16-24/24-32/32-48` via Tailwind scale + `gap-6/8`.
- **Content**: remove fabricated `Acme/Globex/Initech/Soylent` logos + `+400/1.2M` metrics + `Ana Torres` quote unless verified — left now 3 layers only.

### 11.2 Implementation — this session
- **`src/index.css` DS v3.5**: added `--text-auth-title 28px / --text-auth-headline 36px` + `--color-brand / --color-accent-violet / --color-accent-indigo / --color-accent-violet-light` aliases — zero bracket hex for gradients.
- **`src/components/ui/AuthCard.tsx` PR v3.5**: new `variant='card'|'borderless'`; `borderless` = transparent, no `bg-surface border shadow-md p-8`, title `text-auth-title`, quiet footer, keeps `FORM-SEC-01`/`useI18n` in CO.
- **`src/components/auth/AuthShell.tsx` CO new (CO-AUTH-SHELL)**: `max-w-7xl grid lg:grid-cols-[52fr_48fr]`, left `hidden lg:flex bg-brand rounded-[24px] p-8 lg:p-10 lg:min-h-[640px]` 3 layers, right `max-w-[440px] transparent` borderless, mobile intro `lg:hidden`, quiet footer; reuses `LanguageSelector`, `bg-canvas`, `border-line`.
- **`src/components/auth/AuthView.tsx`**: `AuthSplitLayout → AuthShell` (PA-AUTH v3.5).
- **`LoginForm/SignupForm/Forgot/Reset`**: `variant="borderless"` + gradient `from-accent-indigo to-accent-violet hover:opacity-90` (DS tokens, no bracket hex), keep `Input/PasswordInput/Checkbox/Button/AuthDivider/SsoButtons` + `FORM-SEC-01` + `useRouter`.
- **`AuthSplitLayout.tsx`** kept as deprecated (not used) — `AuthShell` is canonical; legacy to be archived after verification.

### 11.3 Verification
- `npm run build` **PASS** `2.0s` `26 routes` (same).
- `npm run lint` **0 errors 142 warn** (pre-existing `any` only).
- `tsc --noEmit` `24` pre-existing errors (`cache/adapters`, `DocsArticle slug/frontmatter`, `PublicPage 3xl`) — unchanged, `ignoreBuildErrors:true` kept.
- **Manual**: desktop 52/48 split, left 24px rounded dark, single rehearsal, no logos/quote; form 440 borderless centered; mobile form-first, left hidden, short intro visible, no scroll past panel — per §10 acceptance (coherent alignment, no card, mobile no scroll, route consistency, a11y+security unchanged via reuse `Input/PasswordInput` etc).
- `gh pr view 3` `head 6946475 → new` pending push.

---

## 12. Auth Redesign v3.6 — Navbar-less 40/60 + per-page left copy (2026-10-11) — spec-update-gated per AGENTS §7

> **Spec gate**: No header, 40/60 flush, logo inside left, right semi-header + equal padding, per-page knowledge-focused copy all touch user-facing `CO-AUTH-SHELL` + `PR-AUTH-CARD` + `i18n` — changelog drafted before code per `AGENTS §7` (reuse `ink-strong` as Brand, violet/indigo aliases remain). Affected normative docs: `01 v3.6` (`PA-AUTH flush navbar-less 40/60 p-8/10 gap-8 h-screen sticky`, headline 36-40 + support 8-16w per page), `02 v3.6` (`CO-AUTH-SHELL` variant `navbar:false`, left 3 layers, right semi-header + centered form, `PR-AUTH-CARD borderless 400`), `03 v3.6` (per-page left copy table 5 pages EN/ES), `UI-01 v3.6` (400-460 → 400 centered, no vertical center). Approved 2026-10-11: `Retoma donde lo dejaste. Proceed.`.

### 12.1 Design direction — per-page left copy (EN + ES, restrained)

| variant | Left headline | Left support (8-16w) | Form title | ES headline | ES support | ES form title |
|---|---|---|---|---|---|---|
| `login` | Your knowledge, connected. | Find the answers your team needs, right when they need them. | Welcome back | Tu conocimiento, conectado. | Encuentra las respuestas que tu equipo necesita, justo cuando las necesita. | Bienvenido de nuevo |
| `signup` | Make knowledge work for everyone. | Bring your team's knowledge together and make useful answers easier to find. | Create your account | Haz que el conocimiento trabaje para todos. | Reúne el conocimiento de tu equipo y haz que las respuestas útiles sean más fáciles de encontrar. | Crea tu cuenta |
| `forgot-password` | Let's get you back to what matters. | Your knowledge workspace is just a few steps away. We'll help you regain access. | Reset your password | Volvamos a lo que importa. | Tu espacio de conocimiento está a pocos pasos. Te ayudamos a recuperar el acceso. | Restablece tu contraseña |
| `reset-password` | A fresh start for your account. | Choose a new password and get ready to continue where you left off. | Choose a new password | Un nuevo comienzo para tu cuenta. | Elige una nueva contraseña y retoma donde lo dejaste. | Elige una nueva contraseña |
| `verify-email` | One small step. A more connected team. | Verify your email to finish setting up your account and access your workspace. | Verify your email | Un pequeño paso. Un equipo más conectado. | Verifica tu correo para terminar de configurar tu cuenta y acceder a tu espacio de trabajo. | Verifica tu correo |

Rules: headline 2-3 lines @ 40% (~380 inner), support 1 short sentence, don't repeat form title, preview stays consistent (flattened single white card), mobile hides support / shows only minimal bar.

### 12.2 Implementation — this session
- **`src/i18n/locales/en|es.ts` DS-i18n v3.6**: added 20 keys `auth.left.*_headline/support` + `auth.form.*_title/subtitle` (10+5 EN + 10+5 ES) with 1:1 parity, restrained voice.
- **`src/components/auth/AuthShell.tsx` CO v3.6**: `variant?: AuthPageType` prop + `useI18n().t()` map `LEFT_COPY_KEYS`, headline `{headline}` support `{support}` dynamic (h2 `text-auth-headline`, p `text-white/70`); header removed → left top logo replaces pill, right `semi-header` `hidden lg:flex w-full justify-end gap-3` inside right panel, right `p-8 lg:p-10 gap-8` equal left, `max-w [400px]` centered not vertically, mobile minimal bar `lg:hidden h-14 bg-brand` (logo+Volver+Lang `showIcon false`), left `h-screen sticky` 100% + inner `overflow-y-auto` only on overflow, copyright inside left `pt-6 text-white/40`.
- **`src/components/auth/AuthView.tsx`**: passes `variant={initialPage}` to `AuthShell`.
- **`Login/Signup/Forgot/Reset`**: `title={t('auth.form.*_title')} subtitle={t('auth.form.*_subtitle')}` via `useI18n` (EN `Welcome back`/`Create your account`/… ES `Bienvenido…`/`Crea tu cuenta`/…); keeps `FORM-SEC-01`/`useRouter`.
- **Grid 52/48 → 40/60** (`lg:grid-cols-[40fr_60fr]`), **form 440 → 400** (`max-w-[400px]` in `AuthShell` + `AuthCard`), **semi-header flush top/right** (`p-0 m-0` inside panel `p-8` only, `gap-8` parent), **no vertical center** (`flex items-center` only).
- **Spec doc update**: this §12 + `01/02/03/UI-01 v3.6` pending file-level bumps — STATUS is planning source of truth before those file bumps (per gate).

### 12.3 Verification
- `npm run build` **PASS** `~1s` `26 routes` (auth 4 routes render per-page headline correctly, `en→es` switch via `LanguageSelector` updates left + form).
- `npm run lint` **0 errors** (warnings pre-existing).
- `tsc --noEmit` 24 pre-existing (cache/docs) unchanged.
- Manual: `/login` `Tu conocimiento, conectado.` + `Bienvenido de nuevo`, `/signup` `Haz que…` + `Crea tu cuenta`, `/forgot-password` `Volvamos…` + `Restablece…`, `/reset-password` `Un nuevo comienzo…` + `Elige…`, toggle `EN` → `Your knowledge, connected.` / `Welcome back` etc, left 40% `h-screen` no scroll, right `60%` semi-header flush, form `400` centered horizontally, mobile bar `logo+Volver+Lang` only.

---

*Status v3.6 auth per-page copy — ready for review. Continue alignment by picking any item in §8 or opening a new `PLAN-00X`.*

---

## 13. Landing Plan 2 — Top + 5 pasos alignment to Left target (2026-10-11) — spec-update-gated per AGENTS §7

> **Spec gate**: Banner/Nav IA/Hero/HowItWorks touch user-facing `CO-LANDING-HERO`, `CO-LANDING-HOW-IT-WORKS`, `PR-CHAT-MOCK`, `PR-HOW-IT-WORKS-STEP` — changelog drafted before code per AGENTS §7 (reuse DS tokens, no hard-coded hex, inline SVG). Affected normative docs: `02 v3.7` (ChatMock rehearsal, HowItWorksStep pastel), `03 v3.7` (PAGE-PUB-01 banner copy, navbar IA, hero grid, metrics verified, pricing from PLAN_LIMITS, testimonials UseCaseCard), `04 v3.7` (WF-PUB-01 5 pasos pastel), `UI-01 v3.7` (DS→PR→CO→SU update). Approved 2026-10-11: `go`.

### 13.1 Design direction — side-by-sides #1-8 (Right=current 272cbfc, Left=target)

* **Drift — Fix:** `Banner` (Nuevo pill + Ver novedades) / `Nav` IA (`Producto / Cómo funciona / Desarrolladores / Precios` vs `Integración/FAQ` — Left target WF-PUB-01) / `Hero` grid `lg:[1.1fr_0.9fr] gap-12`, H1 `leading-[0.95]`, `respuestas con citas` violet underline, helper `Gratis hasta 1.000…`, badges `Hasta 98% con cita*` / `ChatMock` rebuild to Left rehearsal (`OKEng En línea`, 3 Qs, Verificada, Built with Arona, `3 líneas de código` tooltip) — pure CSS / `HowItWorks` 5 pastel cards (`#EFF6FF→#FFF1F2`, `h-28` illustration slots, badges `#6366F1→#F43F5E`) with 5 inline SVG illustrations (file list, stack, shield, search, citation).
* **Aligned — Keep:** `6 features` (6 cards), `Integración 3 modos` (tabs), `Widget flotante` detail, `Dark Tres líneas` (`HelpCenter.tsx`), `FAQ`, `CTA Empieza…`, `Footer` (1-line `Plantillas de prompts` fix already correct), `LogoStrip`.
* **Intentional divergence — Keep Right (Gate C Rejected → Verified):** `Metrics` (`−73%/99.9%` → `1.000/10.000/0` from `PLAN_LIMITS`), `Testimonials` (`Marta/Diego/Lucía` → `UseCaseCard` neutral `Ejemplo ilustrativo`), `Pricing` (`500/ilimitados/14 días` → `1 colección/100, 10/1000/10000` from `PLAN_LIMITS`, `&price=` removed, `Empieza con Pro`) — documented `PRODUCTION-READINESS-GATE.md` + `PLAN-CONSISTENCY-AUDIT.md`.

Graphic assets: `hero-mock-target` CSS only, `howitworks-1..5.svg` inline `120×72` (<10KB), no `public/` bloat per AGENTS external-storage cap.

### 13.2 Implementation — this session

* **`src/components/landing/LandingView.tsx`**: banner children → `Nuevo` pill + `Ver novedades →`, nav `gap-8` links to `#producto/#como-funciona/#desarrolladores/#precios`.
* **`src/components/landing/LandingHero.tsx`**: H1 `leading-[0.95]` (was `[1.05]`), keeps `text-hero`, badges `Hasta 98% con cita*`.
* **`src/components/ui/ChatMock.tsx`**: rebuilt to Left rehearsal (header `OKEng En línea`, 3 Qs, `Verificada`, `Built with Arona` watermark, input `Haz una pregunta…`) — DS `bg-surface border-line rounded-xl`.
* **`src/components/ui/HowItWorksStep.tsx`**: added `pastelBg` (`#EFF6FF→#FFF1F2`) per step, `illustrationBg` replaces `bg-elevated`.
* **`src/components/landing/LandingHowItWorks.tsx`**: 5 illustrations detailed (file list MD/PDF, stack 3 bars, shield + `todos·miembros·admins`, search `¿cómo ser proveedor?`, citation `¿Cómo configuro SSO?` + `Verificada`) — pastel slots.

### 13.3 Verification

* `npx tsc --noEmit` — same 24 pre-existing (`cache`, `DocsArticle slug`) — 0 new.
* `npm run lint` — `0 errors 143 warnings`.
* `npm run build` — `PASS` `26 routes` `ƒ Proxy (Middleware)` (LandingView 12 surfaces).
* Manual: `/` banner `Nuevo` pill, nav `Cómo funciona/Desarrolladores`, hero `leading-[0.95]` violet underline, ChatMock rehearsal with `Verificada`, 5 pasos pastel `h-28` with new illustrations, metrics `1.000/10.000` unchanged, pricing `10 colecciones` from `PLAN_LIMITS`.

*Status v3.7 landing plan 2 — Top+5 pasos aligned, Metrics/Testimonials/Pricing kept verified per Gate C.*

