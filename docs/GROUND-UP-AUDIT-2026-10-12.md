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

---

# Home Page Pixel Audit 2026-10-11 — Target `01a1278b-…arena.site` vs Current `119c9ea` — Full File Map + Code Plan (batch, not yet applied)

**Scope:** `PA-LANDING` 13 surfaces top→bottom. **Ignore:** `N` Next.js dev balloon (left) + `Built with Arena` badge (target overlays). **Authority:** `AGENTS.md §2 DS→PR→CO→SU→PA` — styles via **DS tokens / PR primitives**, `CO` composes only. **Branch:** `arena/c1ccdf80-okengine` `119c9ea` (banner dark already applied). **Build gate:** `26 routes PASS` + `lint 0 errors` after batch.

## 0. Spec Deltas — What the audit forces us to amend (nothing is stone)

**DS `src/index.css @theme`**
- `DS-COLOR-INK-STRONG` `#0F172A → #05081A` ✅ **DONE `119c9ea`** — matches target `rgb(5,8,26)` banner + `Developers/FinalCTA/Footer` dark `bg-ink-strong`
- Keep `DS-COLOR-SUBTLE #F4F4F0` `LINE #DEDDD8` `ACCENT #1D4ED8` `SUCCESS/WARNING/DANGER` as-is — do **not** invent `bg-[#6366F1]` per-component
- If we adopt target purple ` #6366F1 → #8B5CF6` gradient for `accent` buttons/pills, amend `01 v3.2`: `--accent-primary: #6366F1` `--accent-hover: #4F46E5` (1 token change, propagates to `Button accent`, `Badge accent-subtle`, `span underline`). **Decision deferred:** keep cobalt `#1D4ED8` for batch v1 to avoid global recolor, use `bg-accent` for purple-ish `accent` (target purple is close enough). Can be v3.3 if we want exact gradient.

**New / Extended PR** (all DS-only, `sizeVariant`, `aria-*`):
- Extend `PR-BUTTON` — already `accent/ghost` `sm 32 h-8 / md 36 h-9` `rounded-sm 4px`; batch will use `size=sm` `rounded-md 6px` + `shadow-sm` where target shows `rounded-lg 12px shadow-lg` — add `rounded` token usage via `className="rounded-md"` (no new primitive), keep `PR-BUTTON` geometry as-is and compose via `className`
- Extend `PR-BADGE` — add `pill` variant `rounded-full bg-accent-subtle border text-accent text-2xs` for section pills `“• Producto”` etc (currently `Badge` has `solid-*`; add `pill-accent` variant)
- Extend `PR-CARD` — confirm `rounded-xl 16px` `shadow-sm/md/xl` already in DS; `Feature/Testimonial/Pricing/Faq` will compose `Card rounded-xl`
- New `PR-SECTION-PILL` (thin wrapper over `Badge pill-accent`) — `• Cómo funciona` `• Producto` `• Integración` `• Para desarrolladores` `• Clientes` `• Precios` `• Preguntas frecuentes` — `inline-flex rounded-full bg-accent-subtle border text-accent text-2xs px-3 py-1 gap-1.5`
- New `PR-ICON-TILE` — `w-9 h-9 rounded-lg bg-accent-subtle text-accent flex items-center justify-center` for `Product` 6 icons `FileText Shield Quote Key Palette ChartBar` + `Integration` 3 bullets `Shield Chart Sun` + `HowItWorks` illustration headers

**New CO slots:** `HowItWorksStep` gets `illustration?: ReactNode` (pastel header), `FeatureCard` gets `icon` + `illustration` (code/bars), `PricingCard` gets `dark` variant, `Faq` gets `leftCard` slot.

**SU / PA:** no new archetype — `PA-LANDING` header `h-14 sticky top-0 z-20 max-w-7xl px-6` + 13 `SU-LANDING-*` each `max-w-7xl px-6 py-16 md:py-24` (or `bg-ink-strong` dark) — keep. Add `SU-LANDING-HEADER` composition note.

## 1. File Map — Every file we will touch and exact code change (batch)

### DS
| File | Change |
|---|---|
| `src/index.css` | `DS-COLOR-INK-STRONG #05081A` ✅ done; no further token change for batch v1 |

### PR — `src/components/ui/*` (DS-only)
| File | Change |
|---|---|
| `AnnouncementBanner.tsx` | `bg-subtle border-b text-ink-secondary py-2.5 → bg-ink-strong text-surface border-0 py-2 leading-6` ✅ done `119c9ea` |
| `Button.tsx` | no file change — batch uses existing `variant=accent/ghost primary secondary` `size=sm/md` `rounded-sm` + `className="rounded-md shadow-sm"` per `CO` |
| `Badge.tsx` | add `pill-accent` variant: `inline-flex rounded-full bg-accent-subtle border border-accent/10 text-accent text-2xs px-2.5 py-1 font-medium` |
| `Card.tsx` | no change — use `rounded-xl` via `className` |
| `Tabs.tsx` / `SegmentedTabs` | no file change — `LandingIntegration` will compose `SegmentedTabs size=sm variant=ink` with `rounded-full` track via `className` |
| `FeatureCard.tsx` | add `icon?: ReactNode` + `illustration?: ReactNode` props; render `iconTile` `w-9 h-9 rounded-lg bg-accent-subtle text-accent` + `illustration` `mt-4 p-3 bg-elevated border rounded-lg` |
| `HowItWorksStep.tsx` | add `illustration?: ReactNode` `color?: string` props; render `Card rounded-xl border shadow-sm overflow-hidden` top `illustration bg-subtle h-28` + `number` `w-7 h-7 rounded-full bg-[color] text-white shadow-md absolute -top-3 left-3` `→` centered |
| `TestimonialCard.tsx` | add `quoteIcon` `avatar` `badge` props; `rounded-xl` `quote text-accent/20` `badge top rounded-full bg-accent-subtle text-accent` |
| `PricingCard.tsx` | add `dark?: boolean` variant; when `dark` `bg-ink-strong text-white border-0 rounded-xl shadow-xl` `button bg-white text-ink-strong rounded-full` + `badge Más popular gradient purple absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-2xs` |
| `FaqAccordion.tsx` | change trigger `+` `w-7 h-7 rounded-full border bg-white text-ink-muted` `open X bg-accent text-white` `border-t only` not `border rounded-lg divide-y` |
| `CodeSnippet.tsx` / `CodeBlock.tsx` | no file change — `LandingDevelopers` composes existing with `dots ●●●` + `tabs React/HTML/cURL` + `Copiar` via `headerActions` |
| **New** `SectionPill.tsx` | `export function SectionPill({label}) { return <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle border border-accent/10 px-3 py-1 text-2xs font-medium text-accent">• {label}</span> }` |
| **New** `IconTile.tsx` | `w-9 h-9 rounded-lg bg-accent-subtle text-accent` |

### CO — `src/components/landing/*` (compose PR, `useI18n` later, no `window.location`, no bracket hex)
| File | Change |
|---|---|
| `LandingView.tsx:25` header | `w-full border-b border-line bg-surface/80 backdrop-blur-sm` `h-14 flex justify-between` with left `gap-8` + right `gap-3` → **3-zone**: `logo left shrink-0` `nav flex-1 justify-center gap-8 text-sm font-medium text-ink-secondary` `CTAs right shrink-0 gap-3` `logo h-6 w-6 rounded-md bg-ink shadow-sm` `nav Producto/Integración/Precios/FAQ gap-8 text-sm` `Iniciar sesión ghost sm` `Empieza gratis accent sm rounded-md shadow-sm px-5 py-2` |
| `LandingHero.tsx` | **copy swap**: `badge “Capa de conocimiento para tu producto”` `pill bg-surface border` `H1 “Convierte tu documentación en <span className="text-accent underline decoration-2">respuestas con citas,</span> dentro de tu app.” text-hero` `sub “OKEng indexa tu Markdown…” text-lg` `trust “Gratis hasta 1.000 consultas al mes · Sin tarjeta · Listo en 5 minutos” text-xs` `CTAs Button accent rounded-lg shadow-lg purple` `Button secondary rounded-lg` `badges → white bg-surface border + icons ✓ Shield Doc` `avatars -space-x-2` keep `ChatMock max-w-md shadow-lg` richer bubbles |
| `LandingLogoStrip.tsx` | `USADO POR EQUIPOS QUE ESCALAN SOPORTE → EQUIPOS DE PRODUCTO QUE YA RESPONDEN CON OKENG` `tracking-[0.2em] uppercase text-2xs` + **icons** `◆ Nexora • Dataflow ▲ Kubelab ■ Aurea ✦ Pacted ○ Vanti` `w-2 h-2` `gap-2 gap-8 opacity-60 → 100` |
| `LandingMetrics.tsx` | `naked grid → Card rounded-xl border border-line bg-surface divide-x p-6 text-center` `numbers text-metric-value font-bold text-ink-strong` `labels normal-case text-2xs text-ink-muted` `99.9% → 99,9%` comma `para integrar el widget / tickets de soporte (media) / uptime comprometido (SLA) / datos usados para entrenar IA` remove `según clientes/BYOK` sub |
| `LandingHowItWorks.tsx` | add `SectionPill “• Cómo funciona”` `center` `H2 center` `p max-w-2xl center` `grid grid-cols-5 gap-4` `Cards rounded-xl border shadow-sm` `illustrations pastel h-28` per step `1 blue #6366F1 2 #0EA5E9 3 #10B981 4 #8B5CF6 5 #F43F5E` numbers `absolute colored` |
| `LandingProductFeatures.tsx` | add `SectionPill “• Producto”` `center` `H2 “Todo lo que necesita una capa de conocimiento seria” center` `p “No es un chatbot…” max-w-2xl center` `Cards rounded-xl` `icon w-9 h-9 bg-accent-subtle purple` `titles Permisos que se respetan / Un widget… / Analítica de conocimiento` **copy sync** `illustrations` code `docs/sso.md v3.2` + model pills `OpenAI…Local` + bar chart |
| `LandingIntegration.tsx` | add `SectionPill “• Integración”` `center` `tabs centered pill bg-white border rounded-full p-1` `active bg-ink-strong text-white rounded-full` `left bullets 3× Permit… Analítica… Claro… icon w-7 h-7 bg-accent-subtle` `right preview browser mock + widget overlay shadow-lg rounded-xl` replace placeholder gray bars+blue dot+code snippet two-card |
| `LandingDevelopers.tsx` | add `SectionPill “> Para desarrolladores” rounded-full bg-white/10 border-white/20 text-white/80` `bullets — → ✓ green w-5 h-5 rounded-full bg-emerald-500/20` `CTAs rounded-md shadow-sm px-5 py-2.5` `Code top bar ●●● + tabs React/HTML/cURL + Copiar` `Code rounded-xl shadow-xl` `floating badge Card bg-ink-strong border` |
| `LandingTestimonials.tsx` | add `SectionPill “• Clientes” center` `H2 center` `p max-w-2xl center` `Cards rounded-xl quote text-accent/20 top` `badge top lavender rounded-full bg-accent-subtle text-accent` `avatar w-9 h-9 rounded-full bg-accent text-white MI/DS/LF` `name/role` `border-t` `footer +400… text-sm ink strong center` |
| `LandingPricing.tsx` | add `SectionPill “• Precios” center` `H2 “Empieza gratis. Paga cuando escale.” center` `p max-w-2xl center` `Toggle centered pill rounded-full active bg-ink-strong text-white -20% green pill` `Cards rounded-xl` `Pro dark bg-ink-strong text-white shadow-xl` `price white` `button white rounded-full` `badge Más popular gradient purple absolute` `Starter/Escala white` `bottom Card ¿Muchas consultas…? rounded-xl border p-4 + Button Consultar` |
| `LandingFaq.tsx` | add `SectionPill “• Preguntas frecuentes” left` `layout grid md:grid-cols-[360px_1fr] gap-12` `left Card “¿Hablamos de tu caso?” bg-surface border rounded-xl p-6 + Mail hola@okeng.com` `Accordion border-t only plus circle w-7 h-7` `copy Usáis→Mis datos… Cómo funcionan→Puedo restringir… soportáis→soporta… migrar desde X→desde otra herramienta` |
| `LandingFinalCta.tsx` | `w-full bg-ink-strong py-16` → **Card `max-w-7xl mx-auto bg-ink-strong rounded-[24px] border border-white/10 shadow-xl p-16 dot-grid`** `icon rocket w-10 h-10 rounded-xl bg-white/10` `H2 center` `p center max-w-2xl text-white/70` `CTAs Crear cuenta gratis bg-white text-ink-strong rounded-md + Explorar documentación bg-white/5 border-white/20 text-white` `checks ✓ 3× text-2xs text-white/60` `OK footer` |
| `LandingFooter.tsx` | `4 cols` → **brand + 24 links** `OK rounded-lg bg-white/10` `p La capa… max-w-xs text-white/60` `social 3× w-8 h-8 rounded-md bg-white/10 border hover:bg-white/20` `status ● Todos los sistemas operativos bg-emerald-500/20 text-emerald-400 rounded-full border text-2xs` `HEAD tracking-[0.2em] uppercase text-2xs text-white` `links text-sm text-white/60 hover:text-white` `6+6+6+6 IA per target` |
| `LandingView.tsx` | `min-h-screen bg-canvas` keep `AnnouncementBanner` (done) + `header` + 13 sections `max-w-7xl px-6 py-16 md:py-24` or `bg-ink-strong` dark — no layout change beyond header `flex-1 center` |

### SU / PA — no new files
| File | Change |
|---|---|
| `src/app/(public)/page.tsx` | no change — `→ <LandingView />` `PA-LANDING` |
| `src/app/layout.tsx` | keep `bg-canvas selection:bg-accent` + early `localStorage` normalize script |

### Docs — spec updates (calculate from code deltas)
| Doc | Update |
|---|---|
| `docs/01_ui_foundation.md` | `v3.1 → v3.2`: `DS-COLOR-INK-STRONG #05081A` (done), add `DS-COMPONENT-PILL` `rounded-full bg-accent-subtle border text-accent text-2xs`, `DS-ICON-TILE w-9 h-9 rounded-lg bg-accent-subtle`, `DS-CARD-XL rounded-xl 16px`, note `accent purple` optional `#6366F1` deferred |
| `docs/UI-01-Primitives-Components-Surfaces-Archetypes-Workflows.md` | `v3.1 → v3.2`: add `PR-SECTION-PILL` `PR-ICON-TILE` to PR catalog (16→18), extend `PR-FEATURE-CARD` `icon/illustration`, `PR-HOW-IT-WORKS-STEP` `illustration+color`, `PR-PRICING-CARD` `dark` variant, `PR-TESTIMONIAL-CARD` `quote+avatar`, `PR-FAQ-ACCORDION` `plus circle` |
| `docs/02_component_catalog.md` | add rows for `SectionPill` `IconTile` + update `PR-*` descriptions (pill, icon tile, dark pricing) |
| `docs/03_page_specifications.md` | `PAGE-PUB-01`: update 13 `SU-LANDING-*` copy to target (`EQUIPOS…` `Carp…` `Todo lo que necesita…` `Elige…` `Tres líneas…` `Equipos…` `Empieza gratis. Paga…` `Las dudas…` `Empieza a responder…`) + note banner dark |
| `docs/UI-ALIGNMENT-STATUS.md` | append `§11 Home Pixel Batch v3.2` with this table + build gate |
| `docs/GROUND-UP-AUDIT-2026-10-12.md` | **this file** — add this `Home Page Pixel Audit` section (you are here) |

## 2. Verification After Batch
- `npm run build` `26 routes PASS` `lint 0 errors`
- `devtools` band check: `bg-canvas` generics, `bg-surface` cards `border-line` `rounded-xl` `shadow-sm`, only 3 dark `bg-ink-strong #05081A` (banner, developers, finalCTA+footer) — matches target `5,8,26`
- `max-w-7xl px-6 py-16 md:py-24` `h-14` `text-hero/section/card-title/metric-value` `Inter` `tabular-nums`


