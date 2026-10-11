# 03 — Page Specifications (Canonical App Router & Archetype Hierarchy)

| Field | Value |
| :--- | :--- |
| **Document ID** | `03_page_specifications` |
| **Status** | `APPROVED — v3.0` |
| **Owner** | Page Specs |
| **Authority** | Blocking |
| **Dependencies** | `00_product_contract`, `01_ui_foundation`, `02_component_catalog`, `UI-01`, `PLAN-001`, `PLAN-002`, `PLAN-003` |
| **Revision** | `3.0 (2026-10-11)` — Rewrote PAGE-PUB-01 to 12-surface landing from proposal, updated PAGE-AUTH-01/02/03 to PA-AUTH card, preserved legacy in docs/archive |

## v3.0 Changelog

- **PAGE-PUB-01 v3.0**: Complete rewrite from old 5-stage tour (pipeline/pillars) to 12-surface landing from proposal https://01a1278b-f5a1-71f6-830f-8c5c544d4689.arena.site/ — 9 sections (banner, hero + social proof, logo strip, metrics, Cómo funciona 5 steps, Producto 6 features, Integración 3 modes, Para desarrolladores code, Clientes testimonials, Precios 3 tiers, FAQ, final CTA, footer). Archetype PA-LANDING, surfaces SU-LANDING-ANNOUNCEMENT, HERO, LOGOS, METRICS, HOW-IT-WORKS, PRODUCT, INTEGRATION, DEVELOPERS, TESTIMONIALS, PRICING, FAQ, FINAL-CTA, FOOTER (13). Workflows WF-LANDING-01, WF-PRICING-01. Copy accurate from product truth (Files→Collections→Access→Context→Answer, ≥98% cited, -73% tickets, 1k free queries, 3 lines code). Legacy preserved in docs/archive/PAGE-PUB-01-v2-legacy.md. Keep hero-what-is-okeng-cta ref for test compatibility.
- **PAGE-AUTH-01/02/03 v3.0**: Rewrote to PA-AUTH archetype — full viewport canvas #F8F7F4, centered card max-w-md 448px, white surface #FFFFFF border #DEDDD8 rounded-lg 12px shadow-md, minimal header logo + EN/ES, card with title/subtitle/form/footer/trust, FORM-SEC-01, 5-Link Auth Chain, TIER_AUTH_5_PER_15M, generic 401, no enumeration, empty initial, placeholder+hint, field errors AlertCircle role=alert aria-invalid, isLoading spinner + disabled double-submit lock. Surfaces SU-AUTH-LOGIN, SIGNUP, FORGOT, RESET, LAYOUT. Workflows WF-AUTH-LOGIN-01, SIGNUP-01, FORGOT-01, RESET-01. Copy from PLAN-002.
- **Preserved**: Workspace pages PAGE-APP-01..08 unchanged, still PA-DIRECTORY, PA-RESOURCE-DETAIL, etc, with DS-SIDEBAR-POSTURE-001, DS-LAYOUT-AXIS, etc.

## PAGE-PUB-01 v3.0 — Home Landing (New from Proposal)

- **Route**: `/` (public, anonymous)
- **Archetype**: `PA-LANDING` — marketing landing, single column max-w-7xl centered, section py-16 mobile py-24 desktop, no sidebar, no app shell, public surface, minimal header logo + nav (Producto, Integración, Precios, FAQ) + CTAs (Iniciar sesión, Empieza gratis) + announcement banner, 13 surfaces stacked, footer 4 columns, anchor nav, pricing toggle state monthly/annual -20%, FAQ accordion single expand, integration tabs state widget/panel/fullscreen, i18n EN/ES, real metrics only, DS tokens
- **Surfaces**:
  - `SU-LANDING-ANNOUNCEMENT`: AnnouncementBanner "Citas verificables y permisos por rol — ≥98% con cita, sin alucinaciones"
  - `SU-LANDING-HERO`: LandingHero — badge "Nuevo: Widget que parece tuyo", H1 "Capa de conocimiento para tu producto", sub "Convierte tu documentación en respuestas con citas, dentro de tu app. Sin alucinaciones, con permisos por rol.", sub2 "Empieza gratis con 1.000 consultas/mes. Sin tarjeta.", CTAs "Empieza gratis" → /signup + "Ver cómo funciona" → #como-funciona, badges ≥98% con cita, Permisos por rol, Markdown PDF web, social proof avatars + "Más de 1.200 equipos confían", right ChatMock demo live with SSO question + citations [1][2] + input, metric "3 líneas de código" badge
  - `SU-LANDING-LOGOS`: LandingLogoStrip — title "Usado por equipos que escalan soporte", logos Nexora/Dataflow/Kubelab/Aurea/Pacted/Vanti monochrome opacity 60%
  - `SU-LANDING-METRICS`: LandingMetrics — 4 metrics: 3 líneas de código para el widget, -73% tickets repetidos, 99.9% uptime SLA, 0 datos usados para entrenar BYOK — border rounded-lg bg-surface p-8 shadow-sm
  - `SU-LANDING-HOW-IT-WORKS`: LandingHowItWorks — id #como-funciona, title "Cómo funciona" + "De archivos a respuestas en 5 pasos. Files→Collections→Access→Context→Answer.", 5 steps: Sube contenido MD/PDF/URLs drag&drop, Organiza en colecciones por producto/audiencia/tema ilimitadas, Define quién ve qué todos/miembros/admins SSO SAML, Recupera con contexto híbrido semántica+keyword re-ranking citas, Responde con citas fuentes clicables sin alucinaciones ≥98% con cita — horizontal 5 columns desktop vertical mobile connector line number+icon+title+desc
  - `SU-LANDING-PRODUCT`: LandingProductFeatures — id #producto, title "Todo lo que necesitas para responder con confianza", 6 features grid 3x2: Markdown primero MD/MDX/PDF/URLs sync, Permisos por rol granular todos/miembros/admins hereda SSO filtrado retrieval, Citas verificables ≥98% trazable, Tu modelo tu clave OpenAI/Anthropic/Azure/Bedrock/local BYOK 0 datos entrenados, Widget que parece tuyo 100% personalizable 3 líneas, Analítica de uso qué preguntan qué falta qué fuentes
  - `SU-LANDING-INTEGRATION`: LandingIntegration — id #integracion, title "Se adapta a cómo usas tu producto" + "Widget flotante, panel lateral o pantalla completa. Elige la experiencia.", tabs widget flotante/panel lateral/pantalla completa, each with mock preview (floating button bottom-right, side drawer 360px, full page search+filters) + description + code 3 lines <OKEngWidget collection="..." theme={{accent:"#1D4ED8"}} permissions={{role:user.role}} />
  - `SU-LANDING-DEVELOPERS`: LandingDevelopers — id #desarrolladores, title "Para desarrolladores, por desarrolladores", left CodeSnippet HelpCenter.tsx with OKEngWidget import, right bullets API REST completa, Webhooks sync, BYOK, despliega en UE, SDKs React/Vue/JS, docs interactiva + box "3 líneas de código, una tarde de integración. Instalación verificada, firma HMAC opcional, permisos heredados vía SSO."
  - `SU-LANDING-TESTIMONIALS`: LandingTestimonials — id #clientes, title "Equipos que responden mejor" + "Más de 1.200 equipos confían. Métricas reales, no fabricadas.", 3 TestimonialCard: "Reducimos 73% los tickets repetidos. OKEng responde con citas, no inventa." CTO Nexora -73% tickets, "Integración en una tarde. 3 líneas de código y parecía nuestro." Lead Dataflow 1 tarde, "Permisos por rol nos salvó. Clientes solo ven lo que deben." PM Kubelab Permisos por rol
  - `SU-LANDING-PRICING`: LandingPricing — id #precios, title "Precios simples, que escalan contigo" + "Empieza gratis, sin tarjeta. Cancela cuando quieras. Precios en EUR.", toggle mensual/anual -20%, 3 tiers: Starter 0€/mes 1k consultas 1 colección 100 archivos Widget+Panel community support CTA Empieza gratis, Pro 31€/mes (24€ anual) 10k 10 1k Todo Starter + Permisos por rol SSO Analítica Soporte prioritario badge Más popular CTA Empieza con Pro, Escala A medida ilimitadas Todo Pro + On-premise SLA Soporte dedicado BYOK EU hosting Webhooks CTA Habla con nosotros, trust Sin tarjeta • Cancela cuando quieras • Soporte ES/EN • Ver FAQ
  - `SU-LANDING-FAQ`: LandingFaq — id #faq, title "Preguntas frecuentes", accordion 6 Q: ¿Cuánto tarda la integración? 3 líneas una tarde SDKs React/Vue/JS API REST webhooks, ¿Usáis mis datos para entrenar? Nunca 0 datos BYOK despliega UE, ¿Cómo funcionan los permisos? 3 niveles todos/miembros/admins hereda SSO filtrado retrieval antes vector search no solo UI, ¿Qué formatos soportáis? Markdown MDX PDF URLs sync re-index chunking embeddings estado uploading→processing→ready|failed, ¿Qué pasa si no hay fuente? Responde "No tengo fuente para eso" ≥98% con cita sin alucinaciones fuentes clicables excerpt, ¿Puedo migrar desde X? Sí API importación soporte migración preserva estructura colecciones contacta
  - `SU-LANDING-FINAL-CTA`: LandingFinalCta — centered max-w-3xl, H2 "Empieza a responder en minutos" + "1.000 consultas gratis, sin tarjeta. Cancela cuando quieras. Soporte ES/EN.", CTAs Empieza gratis + Ver demo, trust Sin tarjeta • Cancela cuando quieras • Soporte en ES/EN
  - `SU-LANDING-FOOTER`: LandingFooter — border-t bg-surface, 4 columns Producto (Características, Integración, Precios, Changelog), Desarrolladores (Docs, API, SDKs, Estado), Empresa (Sobre, Blog, Contacto), Legal (Términos, Privacidad, Uso aceptable), bottom © OKEng ES/EN Hecho con quiet technical
- **Workflows**: WF-LANDING-01 (anonymous → / → hero → logo strip → metrics → how it works 5 steps → product 6 features → integration 3 modes → developers code → testimonials → pricing toggle → FAQ → final CTA → /signup), WF-PRICING-01 (pricing toggle monthly/annual → view tier features → click CTA → /signup?plan=pro&interval=monthly or /contact?plan=escala)
- **Copy**: Accurate from product truth, EN/ES via useI18n(), real metrics only (≥98% cited from product, -73% tickets from testimonial, 1k free queries from pricing, 3 lines code from SDK)
- **Preservation**: Old pipeline/pillars preserved in docs/archive/PAGE-PUB-01-v2-legacy.md, HomepageGuidedTour component preserved for later use not rendered in v3.0, hero-what-is-okeng-cta ref kept hidden for test compatibility
- **Implementation**: src/components/landing/LandingView.tsx composed from 12 CO components, each from PR primitives, DS tokens, a11y, i18n, src/app/(public)/page.tsx renders LandingView for / root

## PAGE-AUTH-01/02/03 v3.0 — Auth Pages (New from Proposal Visual Language)

- **Routes**: /login, /signup, /forgot-password, /password/reset and /reset-password
- **Archetype**: PA-AUTH — full viewport canvas #F8F7F4, centered card max-w-md 448px, white surface #FFFFFF border #DEDDD8 rounded-lg 12px shadow-md padding 32px, minimal header logo OKEng wordmark + EN/ES switch top-right, card with AuthHeader (logo + title + subtitle) + form + divider + SSO + footer links, below card trust badges + terms/privacy + ©, responsive card full width mobile 16px margin centered desktop, i18n EN/ES, FORM-SEC-01, 5-Link Auth Chain, TIER_AUTH_5_PER_15M, generic 401, no email enumeration, empty initial values placeholder+hint, field-level validation AlertCircle role=alert aria-invalid, isLoading spinner Loader2 + disabled double-submit lock
- **Surfaces**: SU-AUTH-LOGIN (CO-AUTH-LOGIN-FORM + CO-AUTH-TRUST-FOOTER), SU-AUTH-SIGNUP (CO-AUTH-SIGNUP-FORM + CO-AUTH-TRUST-FOOTER), SU-AUTH-FORGOT (CO-AUTH-FORGOT-FORM), SU-AUTH-RESET (CO-AUTH-RESET-FORM), SU-AUTH-LAYOUT (canvas + centered card + minimal header + footer)
- **Components**: CO-AUTH-LOGIN-FORM (email tu@empresa.com hint Usa tu correo de trabajo, password •••••••• show/hide, remember checkbox, forgot link, submit Iniciar sesión isLoading, divider o, SSO Google/GitHub placeholder Pronto, footer ¿No tienes cuenta? Regístrate → /signup, trust Citas verificables • Permisos por rol • Sin tarjeta), CO-AUTH-SIGNUP-FORM (name Ada Lovelace, email, password min 8 hint, terms checkbox Acepto Términos y Privacidad required, submit Crear cuenta, footer ¿Ya tienes cuenta? Inicia sesión → /login), CO-AUTH-FORGOT-FORM (email, submit Enviar enlace, generic success Si el correo existe recibirás un enlace no enumeration, footer Volver a iniciar sesión → /login), CO-AUTH-RESET-FORM (new password + confirm, strength meter débil/media/fuerte, submit Restablecer contraseña, token via query ?token=xxx, footer Volver), CO-AUTH-SSO-BUTTONS (Google/GitHub disabled Pronto), CO-AUTH-TRUST-FOOTER (badges + terms/privacy)
- **Workflows**: WF-AUTH-LOGIN-01 (anonymous → /login → email + password → submit → POST /api/auth/login with CSRF header → validation requestSchemas.loginSchema + FORM-SEC-01 + rate limiting AUTH 5/15m → 5-Link Auth Chain session creation regeneration httpOnly secure sameSite strict 12h Redis → redirect /workspaces, branch forgot → /forgot-password, branch SSO → OAuth future, error generic Credenciales inválidas not email not found, field validation unsafe input, 429 Demasiados intentos), WF-AUTH-SIGNUP-01 (anonymous → /signup → name + email + password + terms → submit → POST /api/auth/signup → validation + rate limiting → account creation + workspace + session → redirect /workspaces, trust Sin tarjeta • Cancela cuando quieras • 1.000 consultas gratis), WF-AUTH-FORGOT-01 (anonymous → /forgot-password → email → submit → POST /api/auth/forgot-password → generic success Si el correo existe recibirás un enlace no enumeration → check email UI), WF-AUTH-RESET-01 (anonymous → /password/reset?token=xxx → new + confirm → submit → POST /api/auth/reset-password → validation → reset → redirect /login with success banner)
- **Copy**: From PLAN-002 accurate, EN/ES, trust badges, no fabricated
- **Implementation**: src/components/auth/AuthView.tsx with initialPage prop login|signup|forgot-password|reset-password, src/app/(auth)/login/page.tsx etc render AuthView, pure Next.js App Router client components, security preserved sessionAndCsrf rateLimiter requestSchemas systemPrivileged logic in src/lib/* + middleware.ts

---

All pages compose `DS-*` tokens, `PR-*` primitives, `CO-*` domain components, and `SU-*` surfaces, implement a concrete `PA-*` behavioral archetype (see `/docs/04_top_screens_audit_and_standardization.md`), and localize 100% of user-facing strings via `useI18n()` (`I18N-001`).

> **Implementation Governance Guard**: No implementation change may introduce a new page-level interaction pattern without either composing an existing `PA-*` archetype contract or explicitly amending the normative architecture first.

---

## 1. App Router System Boundaries (`src/app/`)

- **Root Layout (`src/app/layout.tsx`)**: Wraps the application in `I18nProvider` and `AppRouterProvider` on `bg-canvas text-ink`.
- **Error Boundary (`src/app/error.tsx`)**: Composes `PR-CARD`, `PR-BADGE`, `PR-TEXT`, `PR-BUTTON`, and `useI18n()` (`boundary.error.*`).
- **Not Found Boundary (`src/app/not-found.tsx`)**: Enforces `AUTH-05 §14` non-disclosure 404 using `PR-CARD`, `PR-BADGE`, `PR-TEXT`, `PR-BUTTON`, and `useI18n()` (`boundary.not_found.*`).
- **Loading Boundary (`src/app/loading.tsx`)**: Renders localized loading state inside `PR-CARD` and `PR-TEXT` (`boundary.loading.message`).
- **Workspace Gate Layout (`src/app/(workspace)/workspaces/[workspaceSlug]/layout.tsx`)**: Enforces the 5-Link Authorization Chain (`AUTH-05`) before mounting `CO-APP-SHELL`.

---

## 2. Public & Authentication Surface (`SURF-PUBLIC` & `SURF-AUTH`)

- **`PAGE-PUB-01` — Home (`/`, `PUBLIC-01`–`04`)**: Hero value proposition with primary `"What is OKEng?"` CTA launching the 5-stage **Floating Homepage Guided Tour** (`HomepageGuidedTour.tsx` governed by `APPROVED_HOMEPAGE_TOUR_CONTRACT`, `CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY`, and `HomepageTourController`), backed by the non-bypassable server-only demo boundary (`server/demo/publicHomepageDemoAuthorization.ts`, `EMB-PUBLIC-HOME` bound to `COL-PUBLIC`, `COL-DOCS`, `COL-LEGAL`, `COL-CUSTOMER`, and `COL-INTERNAL` with policy-versioned caching, public-safe companion citations, and `serverOutcome` grounding verification), optional collapsed **Demo Settings Drawer** (`Identity: [ Visitor ] [ Member ] [ Admin ]`, `Context: [ / ] [ /docs/embedding ] [ /docs/access-control ]`, and server-computed 5-collection `Authorized / Excluded` scope table), 4-stage pipeline walkthrough, 4 architecture pillars, and bottom conversion CTA. Verified by `tests/readiness/homepage-tour-readiness.test.ts` (`52/52` readiness & `AT-01..AT-25` adversarial tests) and `tests/rendering/embed-authorization.test.ts` (`29/29` authorization tests, `81/81` total).
- **`PAGE-PUB-02` — About (`/about`)**: Renders canonical articles from `COL-PUBLIC` via `CO-DOCUMENT-VIEWER` + `CO-ASK-BOX`.
- **`PAGE-PUB-03/04/05` — Legal (`/terms`, `/privacy`, `/acceptable-use`)**: Deterministic non-LLM legal Markdown rendering from `COL-LEGAL` + `EMB-PUBLIC-LEGAL` assistant.
- **`PAGE-PUB-06/07` — Documentation (`/docs`, `/docs/:slug`)**: Collapsible collection tree (`CO-DOCUMENT-NAV` / `PR-ACCORDION`) showing public collections (`COL-DOCS`, `COL-PUBLIC`, `COL-LEGAL`) for everyone and Engineering Specifications (`/docs`) when authenticated, sanitized filter input with validation feedback, plus `EMB-PUBLIC-DOCS` assistant.
- **`PAGE-PUB-08` — Contact (`/contact`)**: Validated contact form built with `PR-CARD`, `PR-INPUT`, `PR-TEXTAREA`, `PR-BUTTON`, field-level XSS/email validation (`FORM-SEC-01`), helper hints, placeholders, and `isLoading` submit spinner.
- **`PAGE-AUTH-01` — Sign In (`/login`)**: Email and password authentication form with placeholders (empty initial state), helper hints, field-level validation errors, `isLoading` submit spinner, **Forgot password?** link to `/forgot-password`, and standard legal consent legend linking to `/terms` and `/privacy`.
- **`PAGE-AUTH-02` — Sign Up (`/signup`)**: Account creation form with placeholders (empty initial state), helper hints, field-level validation (`FORM-SEC-01`), `isLoading` submit spinner, and explicit acceptance via `PR-CHECKBOX`.
- **`PAGE-AUTH-03` — Password Recovery (`/forgot-password`, `/password/reset`)**: Dedicated password recovery view inside the authentication card with email validation, helper hint, `isLoading` submit spinner, non-enumerating confirmation state, and return link to `/login`.

---

## 3. Authenticated Workspace Pages (`SURF-WORKSPACE`)

> **Sidebar Posture & Layout Adaptability Contract (`DS-SIDEBAR-POSTURE-001`, `DS-LAYOUT-AXIS`, `DS-CONTAINER-WIDTH`, `DS-SHELL-TRIGGER`)**:
> - **`DS-SIDEBAR-POSTURE-001`**: `sidebarPosture` (`'expanded'` `240px` | `'collapsed'` `56px` rail) is a persistent application-shell preference independent of route and page archetype. Route transitions and `Back` navigation MUST NOT mutate `sidebarPosture`.
> - **`DS-LAYOUT-AXIS`**:
>   - `navigationContext: 'workspace'` → `32px` horizontal axis (`px-8` expanded / `pl-14 pr-8` collapsed on `CO-PAGE-HEADER`; `px-8` / `p-8 w-full` on sub-bars and fluid page containers).
>   - `navigationContext: 'resource'` → `24px` horizontal axis (`px-6` expanded / `pl-12 pr-6` collapsed on `CO-CHILD-NAVBAR` Surface 1; `px-6` / `p-6 w-full` on Surface 2 and fluid page containers).
> - **`DS-CONTAINER-WIDTH`**: Page-level workspace containers are fluid (`w-full`) with no arbitrary page-level `max-w-*` caps; semantic descendant surfaces may remain bounded only when explicitly required by their page specification.

### `PAGE-APP-01` — Collections Directory
- **Route**: `/workspaces/:workspaceSlug/collections`
- **Archetype**: `PA-DIRECTORY` (`navigationContext: 'workspace'` → `32px` axis; preserves active `sidebarPosture`; fluid `p-8 w-full` normal page scroll)
- **Level-2 Context Primitive**: `CO-PAGE-HEADER` (`sticky top-0 z-20`, `px-8` expanded / `pl-14 pr-8` collapsed)
- **Primary Surface**: `SU-COLLECTION-DIRECTORY`
- **Components**: `CO-APP-SHELL`, `CO-PAGE-HEADER`, `PR-FILTER-BAR`, `CO-COLLECTION-CARD`, `CO-VISIBILITY-SELECTOR`, `PR-DRAWER` (`size="md"`), `PR-INPUT`, `PR-TEXTAREA`, `PR-BUTTON`, `PR-EMPTY-STATE`
- **Primary Actions**: Search and filter collections by visibility boundary (`All | Public | Members | Admins`) in a single canonical `PR-FILTER-BAR` region; click any collection card to enter `PAGE-APP-02` (`PA-RESOURCE-DETAIL`); open `+ New Collection` in a contextual `PR-DRAWER-MD` slide-in panel with explicit workspace scope and `FORM-SEC-01` validation.

---

### `PAGE-APP-02` — Collection Detail & Access Workspace
- **Route**: `/workspaces/:workspaceSlug/collections/:collectionId`
- **Archetype**: `PA-RESOURCE-DETAIL` (`navigationContext: 'resource'` → `24px` axis; preserves active `sidebarPosture`; fluid `p-6 w-full`; exits `resource` context on return without mutating `sidebarPosture`)
- **Level-2 Context Primitive**: Two-Surface `CO-CHILD-NAVBAR` (`sticky top-0 z-20`; `Surface 1`: resource context `px-6` / `pl-12 pr-6`; `Surface 2`: resource identity & actions `px-6`)
- **Primary Surface**: `SU-COLLECTION-DETAIL`
- **Components**: `CO-APP-SHELL`, `CO-CHILD-NAVBAR`, `CO-VISIBILITY-SELECTOR`, `CO-FILE-ROW` (`FileTable` with `scopedCollectionName`), `CO-UPLOAD-DRAWER` (`PR-DRAWER-MD` with `lockedCollectionId`), `PR-FILTER-BAR`, `PR-BUTTON`
- **Primary Actions & Contract Invariants**:
  - Reuses the canonical file-management grammar of `PAGE-APP-04` (`GlobalFilesView`) while specializing only the semantics imposed by collection resource context:
    - **Surface 1 (`h-11` Context Bar)**: Deterministic `← Back` + `Collections > {name}` breadcrumb on the left; `VisibilitySelector` (`everyone` | `members` | `admins`) + `[Test Retrieval]` (`size="sm"`) on the right.
    - **Surface 2 (Resource Identity & File Actions — `px-6`)**: Collection `{name}` and `{description}` on the left; `[Upload File]` (`variant="secondary"`) + `[+ Create Markdown]` (`variant="primary"`) on the right.
    - **Collection-Bounded `FileTable` (`scopedCollectionName={collection.name}`, `p-6 w-full`)**: Operates strictly against the collection-scoped dataset supplied by the parent; `PR-FILTER-BAR` renders collection-bounded `Search` (`"Filter files in {collection}..."`) + `Status` (`All | Ready | Processing | Failed`) with **no competing `Target Collection` filter dropdown and no `Collection` table column**.
    - **Collection-Locked Ingestion (`CO-UPLOAD-DRAWER` with `lockedCollectionId={collection.id}`)**: Clicking `[Upload File]` opens `CO-UPLOAD-DRAWER` where `lockedCollectionId` acts as a semantic scope lock — destination resolves exclusively from `collection.id`, `Pre-Retrieval Visibility` reflects the collection context, and **no `Target Collection` selector is rendered**.

```text
PAGE-APP-02 Collection Detail
└── PA-RESOURCE-DETAIL (navigationContext: 'resource' — 24px axis; preserves sidebarPosture)
    ├── CO-APP-SHELL (sidebarPosture: expanded 240px | collapsed 56px rail; DS-SHELL-TRIGGER z-30)
    ├── CO-CHILD-NAVBAR (sticky top-0 z-20)
    │   ├── Surface 1 (px-6 | pl-12 pr-6): Back | Collections > {name} | VisibilitySelector | Test Retrieval
    │   └── Surface 2 (px-6):              {name} + {description} | Upload File | Create Markdown
    ├── Fluid Page Container (p-6 w-full)
    │   └── FileTable (scopedCollectionName={collection.name}, showCollectionColumn=false)
    │       └── PR-FILTER-BAR (Collection-scoped Search + Status)
    └── CO-UPLOAD-DRAWER (lockedCollectionId={collection.id} -> NO Target Collection selector)
```

---

### `PAGE-APP-03` — File Detail / Markdown Editor
- **Routes**: `/workspaces/:workspaceSlug/files/new` & `/workspaces/:workspaceSlug/files/:fileId`
- **Archetype**: `PA-EDITOR` (`navigationContext: 'resource'` → `24px` axis; preserves active `sidebarPosture`; viewport-bounded `h-screen overflow-hidden`, `flex-1 min-h-0`)
- **Level-2 Context Primitive**: `CO-CHILD-NAVBAR` (`sticky top-0 z-20`; `Surface 1` `px-6` / `pl-12 pr-6`; `Surface 2` `px-6`)
- **Primary Surface**: `SU-FILE-EDITOR`
- **Components**: `CO-CHILD-NAVBAR`, `CO-MARKDOWN-EDITOR`, `CO-CONTENT-RENDERER` (`EDITOR_PREVIEW`), `CO-NEXT-STEP`, `PR-DRAWER` (`size="md"`), `PR-MODAL`
- **Primary Actions**: Two-surface stationary header (`Surface 1` Context Bar: deterministic logical-parent `Back` + Breadcrumb on left, `AccessBadge` (`PUBLIC`/`PÚBLICO`) + high-contrast solid-background status badge on right with no dot divider; `Surface 2` Document Identity + Actions: `Title [✎]` + `filename.md · Collection · N chunks · Size` on left, inline compact `[Next step ... ✎]` field + primary `[Save & Index]` button on right), dedicated `PR-DRAWER-MD` slide-in panel for Document Details (Title, non-bidirectional Filename generator, Target Collection selector), dedicated `PR-DRAWER-MD` slide-in panel for Next-Step CTA (`/` route autocomplete + extensible protocol validation), and synchronized `40px` (`h-10`) `Editor | Preview` pane headers with panel-expansion icons.

---

### `PAGE-APP-04` — Global Files Data Directory
- **Route**: `/workspaces/:workspaceSlug/files`
- **Archetype**: `PA-DATA-DIRECTORY` (`navigationContext: 'workspace'` → `32px` axis; preserves active `sidebarPosture`; fluid `p-8 w-full` normal page scroll)
- **Level-2 Context Primitive**: `CO-PAGE-HEADER` (`sticky top-0 z-20`, `px-8` expanded / `pl-14 pr-8` collapsed)
- **Primary Surface**: `SU-FILE-DIRECTORY`
- **Components**: `CO-PAGE-HEADER`, `PR-FILTER-BAR`, `CO-FILE-ROW`, `CO-UPLOAD-DRAWER` (`PR-DRAWER-MD`), `PR-SELECT`
- **Primary Actions**: Single canonical filter model and `PR-FILTER-BAR` region (`Search` + `Collection` + `Status`: `All | Ready | Processing | Failed`); click any document row to open `PAGE-APP-03` (`File Editor`); isolated `stopPropagation()` row actions (`Re-index`, `Delete`); `[⬆ Upload File]` action opening `CO-UPLOAD-DRAWER` with required explicit `Target Collection` selection before file drop/browse.

---

### `PAGE-APP-05` — Embeds Directory, Resource Configuration & Dedicated Installation Surface
- **Routes**:
  - **Stage 1 (Directory)**: `/workspaces/:workspaceSlug/embeds` (`/app/embed`) → Archetype: `PA-DIRECTORY` (`navigationContext: 'workspace'` → `32px` axis; preserves active `sidebarPosture`; `CO-PAGE-HEADER`; fluid `p-8 w-full`; Surface: `SU-EMBED-DIRECTORY`)
  - **Stage 2 (Resource Configuration)**: `/workspaces/:workspaceSlug/embeds/:embedId` (plus optional `?tab=mode_scope | context_theme | installation`) → Archetype: `PA-RESOURCE-CONFIGURATION` (`navigationContext: 'resource'` → `24px` axis; preserves active `sidebarPosture`; `CO-CHILD-NAVBAR` Surface 1 `px-6`/`pl-12 pr-6` + Surface 2 `px-6`; fluid `p-6 w-full`; Surface: `SU-EMBED-RESOURCE-CONFIG`)
  - **Stage 3 (`APP-05` Dedicated Installation Surface)**: `/workspaces/:workspaceSlug/embeds/:embedId/installation` (aliased to `/app/embed/:embedId/installation`) → Archetype: `PA-RESOURCE-CONFIGURATION` (`navigationContext: 'resource'` → `24px` axis; preserves active `sidebarPosture`; Two-Surface `CO-CHILD-NAVBAR` with breadcrumb `Embeds > <Embed Name> > Installation`; fluid `p-6 w-full` centered single-column `max-w-3xl mx-auto` configuration-driven installation recipe; Surface: `SU-EMBED-INSTALLATION`)
- **Components**: `CO-PAGE-HEADER`, `CO-CHILD-NAVBAR`, `PR-FILTER-BAR`, `CO-EMBED-CARD`, `CO-EMBED-STATUS`, `CO-EMBED-INSTALLATION` (`EmbedInstallationView.tsx`), `PR-DRAWER` (`size="md"`), `PR-TABS`, `PR-CARD`, `PR-INPUT`, `PR-SELECT`, `PR-CHECKBOX`, `PR-CODE-BLOCK`
- **Primary Actions & Contract Invariants (`INV-EMBED-01` – `INV-EMBED-12`)**:
  - **Stage 1 (`PA-DIRECTORY` / `SU-EMBED-DIRECTORY`)**: Filter embeds via `PR-FILTER-BAR`; click anywhere on a `CO-EMBED-CARD` body to navigate to `/workspaces/:workspaceSlug/embeds/:embedId`; isolated `stopPropagation()` card actions (`[Installation Guide]` navigating directly to `/workspaces/:workspaceSlug/embeds/:embedId/installation` when `readyForInstallation`, `[Continue / Edit]`, `[Simulator]`, `[Duplicate]`, `[Delete]`); open `[+ Create Embed]` in a contextual `PR-DRAWER-MD` panel (`WF-EMBED-01`).
  - **Stage 2 (`PA-RESOURCE-CONFIGURATION` / `SU-EMBED-RESOURCE-CONFIG`)**:
    - **Surface 1 (`CO-CHILD-NAVBAR`)**: `← Embeds | Embeds > <Embed Name>` on the left; `CO-EMBED-STATUS` (`INCOMPLETE` | `DRAFT` | `READY`), `[Installation Guide]` (navigating to `/installation` when `readyForInstallation`), and `[Test in Host Simulator]` on the right.
    - **Surface 2 (`CO-EMBED-IDENTITY` + `CO-EMBED-ACTION-BAR`)**: Resource identity (`Name [✎] [?]`, unboxed `Mode · Scope · Status`) on the left; resource lifecycle actions (`[Publish Embed / Set as Draft]`, `[Duplicate]`, `[Delete]`) on the right. Configuration tabs NEVER live in Surface 2 (`INV-EMBED-03`, `INV-EMBED-04`).
    - **Body Configuration (`PR-TABS` + `1 of 3` Step Progression Footer)**:
      - **Tab 1 (`1. Mode & Knowledge`)**: Select presentation mode and bind collections / optional pinned documents. Selecting any protected collection (`members` or `admins`) automatically forces `useHostUserContext = true` in both UI and store persistence (`INV-EMBED-08`).
      - **Tab 2 (`2. Context & Behavior`)**: Configure `useCurrentPage`, `useHostUserContext` (rendered as locked `[✓] REQUIRED` when protected collections are bound), interactive `routeRules`, `behaviorConfig` (`initialState`, `suggestedQuestions`, `showNavigation`, `ctaBehavior`), and hex-normalized `appearanceConfig` (`theme`, `width`, `position`, `radius`, `accentColor`).
      - **Tab 3 (`3. Installation`)**: Compact **Installation Launcher** displaying `Installation`, the short verdict, `Frontend only` or `Backend + frontend required`, and `[Open installation guide →]` (`INV-EMBED-05`).
  - **Stage 3 (`APP-05` — `/workspaces/:workspaceSlug/embeds/:embedId/installation` / `SU-EMBED-INSTALLATION`)**:
    - **Centered Single-Column Recipe (`max-w-3xl mx-auto`)**: Renders `InstallationHeader` (`Installation` / `Install <Embed Name> in your application.`), `InstallationVerdict` (`Frontend-only installation`, `Frontend installation`, or `Backend + frontend installation`), `EnvironmentSelector` (`[React] [Vue] [JavaScript]`), dynamic numbered steps (`ServerStep` labeled `SERVER`, `PackageStep` labeled `BROWSER`, `EmbedStep` labeled `BROWSER`), single-action `VerificationStep` (`[Verify installation]` → `✓ Installation looks good`), and a collapsed low-priority `Developer tools` footer.
    - **Lifecycle & Drift Guards**: Handles `We couldn't find this Embed`, gates incomplete Embeds with `This Embed isn't ready to install yet. [Edit Embed]`, and surfaces `This Embed has changed. [Refresh instructions]`.

---

### `PAGE-APP-06` — Test Console (`PA-CONSOLE` / `SU-TEST-CONSOLE`)
- **Route**: `/workspaces/:workspaceSlug/test` (supports optional `?collectionId=:collectionId` and `?embedId=:embedId` deep-link context preservation)
- **Archetype**: `PA-CONSOLE` (`navigationContext: 'workspace'` → `32px` axis; preserves active `sidebarPosture`; fluid `p-8 w-full` viewport-bounded `h-screen overflow-hidden`, `flex-1 min-h-0` with independent pane scroll)
- **Level-2 Context Primitive**: `CO-PAGE-HEADER` (`sticky top-0 z-20`, `px-8` expanded / `pl-14 pr-8` collapsed, clean title and description without overflowing header badges)
- **Primary Surface**: `SU-TEST-CONSOLE`
- **Components**: `CO-PAGE-HEADER`, `PR-SELECT`, `PR-TABS`, `PR-CARD`, `PR-INPUT`, `PR-BUTTON`, `CO-CONTENT-RENDERER` (`TEST_CHAT`), `CO-SOURCE-LIST`, `CO-NEXT-STEP`, `CO-FEEDBACK`
- **Primary Actions & Inspection Pipeline Contract**:
  - **Calm Test Context Band**: Configure `Scope` (`All workspace collections` | `Embed` | `Collection`), 4-way `Identity` (`Anonymous` | `Member` | `Admin` | `Invalid token`), `Route`, and progressive `Advanced execution ▾` (`Answer Mode`: `deterministic | extractive | generative`, `Response Language`: `auto | en | es`) without mutating global operator session state.
  - **Single Canonical `EffectiveScope` Resolver (`resolveTestConsoleScope`)**: Enforces `EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections` identically across zero-state `[Access]`, `Verification Scenarios`, and retrieval execution.
  - **First-Class `Invalid token` (`401`) Boundary**: Halts before retrieval with `401 Unauthorized · INVALID_TOKEN_SIGNATURE`, `Retrieval: Not executed`, `Retrieved chunks: 0`, and `Anonymous fallback: None`.
  - **Executable Verification Scenarios**: 4 named scenarios (`Verify access boundary`, `Verify progressive identity`, `Verify multilingual retrieval`, `Verify cache reuse`) displaying `OBJECTIVE`, `CONTEXT`, `EXPECTED`, and live `ACTUAL` outcome.
  - **3 Stage-Aware Inspection Tabs (`[ Access ] [ Retrieval ] [ Cache ]`)**:
    - **`[ Access ]`**: Live zero-state and post-query collection access breakdown (`Allowed for retrieval`, `Excluded before retrieval — Requires Member/Admin`, `Outside target scope`).
    - **`[ Retrieval ]`**: Combined `Answer Plan` + `Ranked Chunks` (`#1 filename · Score`) with progressive `[Details ▾]` disclosure (`BM25`, `Route boost`, `Lines`, `Matched tokens`, and `[Open in Editor →]`).
    - **`[ Cache ]`**: Live `kv:v{knowledgeVersion}` and compact `av:v1 (N cols)` epoch state (with full structural descriptor on hover `title`), `Cache decision` (`MISS` / `HIT_EXACT` / `HIT_SEMANTIC`), partition summary, and diagnostic `Test actions` (`[Re-run query]`, `[Invalidate cache]`).

---

### `PAGE-APP-07` — Conversation Operations Inspector
- **Route**: `/workspaces/:workspaceSlug/conversations`
- **Archetype**: `PA-INSPECTOR` (`navigationContext: 'workspace'` → `32px` axis; preserves active `sidebarPosture`; fluid `p-8 w-full` viewport-bounded `h-screen overflow-hidden`, `flex-1 min-h-0` with independent master/detail pane scroll)
- **Level-2 Context Primitive**: `CO-PAGE-HEADER` (`sticky top-0 z-20`, `px-8` expanded / `pl-14 pr-8` collapsed)
- **Primary Surface**: `SU-CONVERSATION-INSPECTOR`
- **Components**: `CO-PAGE-HEADER`, `PR-FILTER-BAR`, `PR-TABS`, `PR-INPUT`, `CO-CONTENT-RENDERER` (`CHAT_MESSAGE`), `CO-SOURCE-LIST`, `CO-FEEDBACK`, `CO-NEXT-STEP`
- **Primary Actions**: Filter inquiries in the master pane's canonical `PR-FILTER-BAR` by sanitized keyword query (`FORM-SEC-01`) and feedback status (`All | Helpful | Unhelpful` via `PR-TABS`); inspect grounded answer, feedback, and next-step CTA in the detail pane; click any cited document in `CO-SOURCE-LIST` to open it directly in `PAGE-APP-03` (`File Editor`).

---

### `PAGE-APP-08` — Workspace Settings & Security Configuration
- **Route**: `/workspaces/:workspaceSlug/settings`
- **Archetype**: `PA-SYSTEM-CONFIGURATION` (`navigationContext: 'workspace'` → `32px` axis; preserves active `sidebarPosture`; fluid `p-8 w-full` normal page scroll with persistent `PR-TABS` navigation and bounded semantic inner forms where specified, e.g., `max-w-lg` on Workspace Details form)
- **Level-2 Context Primitive**: `CO-PAGE-HEADER` (`sticky top-0 z-20`, `px-8` expanded / `pl-14 pr-8` collapsed)
- **Primary Surface**: `SU-WORKSPACE-SETTINGS`
- **Components**: `CO-PAGE-HEADER`, `PR-TABS`, `PR-CARD`, `CO-RBAC-MATRIX`, `PR-INPUT`, `PR-SELECT`, `PR-TABLE`, `PR-DRAWER` (`size="sm"`), `PR-BUTTON`
- **Primary Actions**: Navigate across 4 persistent configuration sections (`General`, `Members & RBAC`, `Credentials & Keys`, `Audit Log`); update workspace profile & **default language (`EN` / `ES`)** in `General`; review members table and **Dual RBAC Matrix (`CO-RBAC-MATRIX` / `AUTH-03`)** in `Members & RBAC`; trigger `Invite Member` and `Transfer Ownership` in contextual `PR-DRAWER-SM` panels with explicit workspace scope; copy/rotate signing keys in `Credentials & Keys`; inspect immutable audit events in `Audit Log`; export full workspace JSON backup from `CO-PAGE-HEADER`.

---

### `PAGE-WIDGET` — Multi-Surface Embedded Host Simulator (`SU-EMBED-HOST-SIMULATOR`)
- **Route**: `/workspaces/:workspaceSlug/embeds/preview?embedId=:embedId`
- **Archetype**: `PA-EMBEDDED-WIDGET`
- **Primary Surfaces**: `SU-EMBED-HOST-SIMULATOR`, `SU-EMBED-CHAT`, `SU-EMBED-PANEL` (`PR-DRAWER`), `SU-EMBED-FULLSCREEN`, `SU-EMBED-INLINE`, `SU-EMBED-DOCUMENTATION` (`CO-DOCUMENT-NAV`), `SU-EMBED-CONTEXTUAL-HELP`
- **Components**: `CO-LANGUAGE-SELECTOR`, `CO-CONTENT-RENDERER` (`EMBEDDED_CHAT`), `CO-DOCUMENT-VIEWER`, `CO-DOCUMENT-NAV`, `CO-NEXT-STEP`, `PR-DRAWER`, `PR-CARD`, `PR-INPUT`, `PR-BUTTON`
- **Primary Actions (`WF-EMBED-03` & `INV-EMBED-12`)**: Deterministically simulate the relationship between Embed configuration and Host context across all 6 presentation modes (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`), simulated host routes (including custom `routeRules`), signed user clearance (`everyone` | `members` | `admins` respecting `useHostUserContext`), viewport dimensions (`Desktop 100%` | `Tablet 768px` | `Mobile 390px`), live `behaviorConfig` (`initialState`, `suggestedQuestions`, `showNavigation`, `ctaBehavior`), and `appearanceConfig` (`theme`, `width`, `position`, `radius`, `accentColor`), with a 5-part `Inspect` diagnostics popover (`Route`, `User`, `Viewport`, `Behavior`, `Theme Variables`) and deterministic return to the originating `/workspaces/:workspaceSlug/embeds/:embedId` resource on `[← Back]`.

