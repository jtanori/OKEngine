# 04 — Workflows: Operational Contracts

| Field | Value |
| :--- | :--- |
| **Document ID** | `04_workflows` |
| **Status** | `APPROVED — v2.1` |
| **Owner** | Workflows |
| **Authority** | Blocking |
| **Dependencies** | `00_product_contract`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications`, `UI-01`, `PLAN-001`, `PLAN-002`, `PLAN-003` |
| **Revision** | `2.1 (2026-10-11)` — Auth workflows now specify optional conditional Google/GitHub OAuth, consent, Remember me, callback provisioning, and recovery session |

## v2.1 Changelog — Supabase Auth and optional OAuth

- Email/password remains available without social providers. Google/GitHub buttons and divider are server-discovered and absent if no provider is configured. Login OAuth requires explicit Terms/Privacy consent and forwards Remember me; signup OAuth reuses its required terms consent.
- OAuth start is same-origin, CSRF-protected, rate-limited, allow-listed, PKCE-backed, and returns only the validated Supabase authorization URL. The fixed callback verifies the Auth user, requires usable email, provisions via Auth UUID and `auth.uid()`, and uses only safe internal redirects. OAuth/provider credentials remain server-only; no application-level email matching or role trust from provider metadata.
- Supabase Auth sessions remain in HttpOnly `okeng-auth` cookies, Secure in production, SameSite=Lax; unremembered sessions use browser-session cookies, Remember me uses 30-day persistence. Recovery links use the same callback to establish a recovery session before the CSRF-protected password update.

## v2.0 Changelog — New Workflows from Landing + Auth + Integration

### WF-LANDING-01 — Anonymous → Landing 12 Surfaces → Signup
- **Trigger**: Anonymous visits `/`
- **Steps**: Announcement banner "Citas verificables y permisos por rol" → Hero (value prop "Capa de conocimiento para tu producto" + "Convierte tu documentación en respuestas con citas, dentro de tu app" + sub "Empieza gratis con 1.000 consultas/mes. Sin tarjeta." + CTAs Empieza gratis → /signup + Ver cómo funciona → #como-funciona + badges ≥98% con cita, Permisos por rol, Markdown PDF web + social proof avatars "Más de 1.200 equipos confían" + right ChatMock demo live SSO question + citations [1][2] + input) → Logo strip Nexora/Dataflow/Kubelab/Aurea/Pacted/Vanti → Metrics bar 3 líneas, -73%, 99.9%, 0 datos entrenados → How it works 5 steps Files→Collections→Access→Context→Answer → Product 6 features MD, permisos, citas, BYOK, widget, analítica → Integration 3 modes widget/panel/fullscreen tabs + mock + 3 lines code → Developers HelpCenter.tsx code + bullets API/webhooks/BYOK/EU/SDKs → Testimonials 3 cards -73% etc → Pricing 3 tiers Starter 0€ Pro 31€/24€ annual Escala custom + toggle monthly/annual -20% → FAQ 6 Q → Final CTA Empieza a responder en minutos → /signup
- **Branch**: Secondary CTA Ver cómo funciona → scroll #como-funciona
- **Success**: Clicks primary CTA → /signup, conversion tracked, real metrics only
- **Archetype**: PA-LANDING, surfaces SU-LANDING-* (13), components CO-LANDING-* (12)

### WF-PRICING-01 — Pricing Toggle → Plan Selection → Checkout
- **Trigger**: User in pricing section #precios
- **Steps**: Toggle monthly/annual -20% badge → view tier features (Starter 0€ 1k 1 100 Widget+Panel community, Pro 31€/24€ 10k 10 1k + fullscreen + permisos SSO analítica priority badge Más popular, Escala custom unlimited + on-premise SLA dedicated BYOK EU webhooks) → click CTA Empieza gratis → /signup?plan=starter or Empieza con Pro → /signup?plan=pro&interval=monthly/annual or Habla con nosotros → /contact?plan=escala → checkout Stripe (future)
- **State**: pricingInterval = monthly|annual stored in local state, -20% badge for annual
- **Success**: Checkout session created, redirect Stripe, webhook updates workspace plan

### WF-AUTH-LOGIN-01 — Anonymous → /login → Session → /workspaces
- **Trigger**: Anonymous visits /login or clicks Iniciar sesión from landing header
- **Steps**: Render the established PA-AUTH surface with email/password, Remember me, forgot-password link, and submit. Discover enabled Google/GitHub providers from the no-store same-origin provider endpoint; render only available buttons and their divider, otherwise render neither. Email login uses CSRF-protected `POST /api/auth/login`; OAuth uses a provider-specific action with explicit Terms/Privacy consent and the same Remember me state, then CSRF-protected/rate-limited `POST /api/auth/oauth/start`, PKCE, and a validated Supabase authorization URL. On return, `/auth/callback` exchanges/verifies the Auth response, requires usable email, provisions/loads the Auth-UUID profile and initial workspace via `auth.uid()`, and redirects to a safe internal path. Supabase Auth session cookies are HttpOnly `okeng-auth`, SameSite=Lax, Secure in production; browser-session by default, 30-day persistence when Remember me is set. Preserve generic credential errors and AUTH rate limiting.
- **Success**: Verified Supabase Auth session and active workspace membership are loaded server-side; redirect to the workspace collections route. No provider secret, access token, or refresh token is exposed to browser JavaScript.

### WF-AUTH-SIGNUP-01 — Anonymous → /signup → Account Creation → /workspaces
- **Steps**: Collect name, email, password, and required Terms/Privacy consent. Email signup uses CSRF-protected, rate-limited `POST /api/auth/signup`; when email confirmation is enabled, require the callback before entering the workspace. Configured Google/GitHub controls reuse the same consent state and use the OAuth flow described in WF-AUTH-LOGIN-01. New profiles map by Supabase Auth UUID (never email conflict matching); the callback provisions the owner workspace through the `auth.uid()` RPC. Workspace membership and role are loaded from the database, not provider metadata.

### WF-AUTH-FORGOT-01 — Anonymous → /forgot-password → Email Sent
- **Steps**: Enter email → CSRF-protected, rate-limited `POST /api/auth/forgot-password` → generic success regardless of account existence → recovery email uses the fixed `/auth/callback?next=/reset-password` app callback. Do not expose account existence.

### WF-AUTH-RESET-01 — Recovery callback → Auth session → Password reset
- **Steps**: Supabase verifies the recovery code/token at `/auth/callback?next=/reset-password` and sets the HttpOnly recovery session; render new password + confirmation, then CSRF-protected, rate-limited `POST /api/auth/reset-password` updates the currently authenticated Supabase user. The client never submits a reset token; show success after the update.

### WF-EMBED-01 Updated — 3 Integration Modes (Widget/Panel/Fullscreen)
- **Trigger**: User configures embed in /workspaces/:slug/embeds
- **Modes**: widget (floating launcher bottom-right + CO-CONTENT-RENDERER + CO-NEXT-STEP, 3 lines code), panel (PR-DRAWER 360px maxWidth min(380px,40%) + CO-CONTENT-RENDERER), fullscreen (full-viewport search + collection filter + CO-CONTENT-RENDERER), inline, documentation, contextual — 6 composable surfaces EMBED-02, gated by plan (fullscreen gated Pro+ per ANALYSIS-001)
- **Steps**: Select mode + knowledge (collectionIds) + context & behavior + installation guide (React/Vue/JS, server/browser steps, verify installation) → save → install widget via <OKEngWidget collection="docs" mode="widget" theme={{accent:"#1D4ED8"}} permissions={{role:user.role}} /> → verify

---

Workflows define end-to-end user objectives, authorization checks, cache transitions, and multilingual retrieval behavior across OKEng surfaces.

---

### `WF-SETUP-01` — End-to-End Product Knowledge Setup
1. **Signup / Login**: Authenticate into tenant workspace (`/login` → `/workspaces/okeng/collections`).
2. **Create Collection**: Initialize collection with target visibility (`everyone`, `members`, `admins`).
3. **Add Documents**: Trigger `[Upload File]` in `CO-UPLOAD-DRAWER` (`lockedCollectionId` inside `PAGE-APP-02` `Collection Detail`, or explicit `Target Collection` selection inside `PAGE-APP-04` `Global Files`) or author in `CO-MARKDOWN-EDITOR`; status progresses `Uploading` → `Processing` → `Ready`.
4. **Configure Embed**: Select presentation mode (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`) in `/workspaces/:workspaceSlug/embeds`, open the dedicated installation recipe (`/workspaces/:workspaceSlug/embeds/:embedId/installation`), and configure HMAC-SHA256 signed host identity when required.
5. **Verify Access, Retrieval & Cache Pipeline**: Inspect pre-retrieval collection access, ranked chunks, and cache partitioning in `/workspaces/:workspaceSlug/test` across scopes (`All workspace collections`, `Embed`, `Collection`), identities (`Anonymous`, `Member`, `Admin`, `Invalid token`), and languages (`auto`, `en`, `es`).
6. **Go Live**: Embed answers user queries inside host application with verified citations and `next_step` CTAs.

---

### `WF-COLLECTION-02` — Configure Collection Access & Epoch Invalidation
- **Preconditions**: Authenticated workspace member with `workspace.collections.manage` permission.
- **Entry**: `/workspaces/:workspaceSlug/collections/:collectionId`.
- **Action**: Toggle visibility via `CO-VISIBILITY-SELECTOR` to `everyone`, `members`, or `admins`.
- **Invariants**:
  1. Any future queries from callers without the corresponding clearance immediately omit chunks from this collection prior to vector/BM25 retrieval (`SECURITY-001`).
  2. `CACHE-001` increments the workspace epoch and immediately invalidates L2/L3/L4 cached retrieval and answer entries.

---

### `WF-FILE-01` — Ingest & Normalize Knowledge Document
- **Entry**: Upload via `CO-UPLOAD-DRAWER` (`PR-DRAWER-MD` — resolving destination exclusively from `lockedCollectionId` when opened from `Collection Detail`, or requiring explicit `Target Collection` selection when opened from `Global Files`) or author in `CO-MARKDOWN-EDITOR` (`/workspaces/:workspaceSlug/files/new`).
- **Processing Job**:
  1. YAML frontmatter extraction, language detection (`en` | `es`), and Normalized Content AST (`RENDER-001`) parsing.
  2. Heading-aware semantic chunking with line-range metadata.
  3. Indexing into authorized collection scope and L1 parse cache (`CACHE-001`).
- **Postcondition**: Document status transitions to `Ready` and workspace epoch increments.

---

### `WF-TEST-02` — Verify Inspection Pipeline (`Context → Access → Retrieval → Answer Plan → Cache`)
- **Entry**: `/workspaces/:workspaceSlug/test` (or deep-linked via `?collectionId=:collectionId` from `PAGE-APP-02` `[Test Retrieval]` / `?embedId=:embedId` from `PAGE-APP-05`).
- **Execution**:
  1. **Zero-State Access & Scope Resolution (`resolveTestConsoleScope`)**: Before any query is submitted, `[ Access ]` displays the effective intersection `EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections` (`Allowed for retrieval`, `Excluded before retrieval — Requires Member/Admin`, `Outside target scope`).
  2. **Hard `401` Invalid Token Boundary**: Selecting `Identity = Invalid token` halts before retrieval (`401 Unauthorized · INVALID_TOKEN_SIGNATURE`, `Retrieval: Not executed`, `Retrieved chunks: 0`, `Anonymous fallback: None`).
  3. **Executable Verification Scenarios**: Running any of the 4 named scenarios (`Verify access boundary`, `Verify progressive identity`, `Verify multilingual retrieval`, `Verify cache reuse`) configures context, executes the query, and verifies `EXPECTED` vs. `ACTUAL` across `[ Access ]`, `[ Retrieval ]` (`Answer Plan` + `Ranked Chunks` `[Details ▾]`), and `[ Cache ]` (`kv`/`av` epoch state + `[Re-run query]` / `[Invalidate cache]`).

---

### `WF-AUTH-01` — Authentication, Legal Consent & Password Recovery
- **Sign In (`/login`)**:
  1. Fields initialize empty with localized placeholders (`you@company.com`, `••••••••••••`) and helper hints.
  2. Displays standard legal consent legend below the submit button linking to `/terms` and `/privacy`.
  3. Clicking **Forgot password?** transitions inside the auth card to `/forgot-password` (`PAGE-AUTH-03`).
- **Sign Up (`/signup`)**:
  1. Validates email format and minimum 8-character password via `FORM-SEC-01`.
  2. Requires explicit acceptance of the Terms of Service and Privacy Policy via `PR-CHECKBOX` before account creation is permitted.
- **Password Recovery (`/forgot-password`)**:
  1. Validates email address via `FORM-SEC-01`, shows `isLoading` spinner on submit, and transitions to a non-enumerating recovery confirmation state with a **Back to Sign In** link.

---

### `WF-FORM-SEC-01` — Universal Input Sanitization & Validation Lifecycle
- **Entry**: Any form submission or real-time filter across `SURF-PUBLIC`, `SURF-AUTH`, `SURF-WORKSPACE`, or `SU-EMBED-*`.
- **Execution (`src/services/formSecurity.ts`)**:
  1. Inspect raw input for XSS/script tags (`<script>`, `<iframe>`, `onload=`, `onerror=`), control characters, path traversal (`..`), and disallowed URL schemes (`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`).
  2. If invalid or unsafe: block submission, set `aria-invalid="true"` on the offending `PR-INPUT` / `PR-TEXTAREA` / `PR-SELECT` / `PR-CHECKBOX`, and surface a localized field-level error (`role="alert"`).
  3. If valid: transition submit `PR-BUTTON` to `isLoading={true}` (`Loader2` spinner + `disabled` double-submit lock) and persist the sanitized payload.

---

### `WF-EMBED-01` — Create Embed (`SU-EMBED-DIRECTORY` → `SU-EMBED-RESOURCE-CONFIG`)
- **Entry**: `/workspaces/:workspaceSlug/embeds` → `[+ Create Embed]`.
- **Execution**:
  1. Opens `PR-DRAWER-MD` with explicit `scopeBanner` (`Workspace`, `Presentation Mode`, `Collections Bound`).
  2. Validates `name` via `FORM-SEC-01` and requires at least one collection in `knowledgeScope.collectionIds`.
  3. Initializes the `EmbedInstance` and navigates directly to `/workspaces/:workspaceSlug/embeds/:embedId?tab=mode_scope` while preserving `sidebarPosture` (`INV-EMBED-10`, `INV-EMBED-11`).

---

### `WF-EMBED-02` — Configure Embed (`SU-EMBED-RESOURCE-CONFIG`)
- **Entry**: `/workspaces/:workspaceSlug/embeds/:embedId`.
- **Execution**:
  1. **Surface 1 (`CO-CHILD-NAVBAR`)** displays `← Embeds | Embeds > <Name>` on the left and `CO-EMBED-STATUS` (`INCOMPLETE` | `DRAFT` | `READY`), `[Installation Guide]` (when `readyForInstallation`), and `[Test in Host Simulator]` on the right.
  2. **Surface 2 (`CO-EMBED-IDENTITY` + `CO-EMBED-ACTION-BAR`)** displays identity (`Name [✎] [?]`, unboxed `Mode · Scope · Status`) on the left and resource lifecycle actions (`[Publish / Set as Draft]`, `[Duplicate]`, `[Delete]`) on the right.
  3. **Body Configuration (`PR-TABS` + `CO-EMBED-STEP-FOOTER` `1 of 3` Previous/Next)**:
     - **Step 1 (`1. Mode & Knowledge`)**: Select presentation mode (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`), bind collections, and optionally pin documents. Selecting any protected collection (`members` or `admins`) automatically forces `contextConfig.useHostUserContext = true` in both UI and store persistence.
     - **Step 2 (`2. Context & Behavior`)**: Configure `useCurrentPage`, `useHostUserContext` (rendered as locked `[✓] REQUIRED` when protected collections are bound), interactive `routeRules[]`, `behaviorConfig` (`initialState`, `suggestedQuestions`, `showNavigation`, `ctaBehavior`, greeting, placeholder), and hex-normalized `appearanceConfig` (`theme`, `width`, `position`, `radius`, `accentColor`).
     - **Step 3 (`3. Installation`)**: Compact **Installation Launcher** displaying `Installation`, the short verdict, `Frontend only` or `Backend + frontend required`, and `[Open installation guide →]`.

---

### `WF-EMBED-03` — Test Embed in Host Simulator (`SU-EMBED-HOST-SIMULATOR`)
- **Entry**: `/workspaces/:workspaceSlug/embeds/preview?embedId=:embedId`.
- **Execution**:
  1. Simulates the relationship between Embed configuration and Host context across all 6 modes (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`), host routes (including custom `routeRules`), user clearance (`Anonymous`, `Member`, `Admin`), and viewports (`Desktop 100%`, `Tablet 768px`, `Mobile 390px`).
  2. Dynamically applies `behaviorConfig` (`initialState`, `suggestedQuestions`, `showNavigation`, `ctaBehavior`) and `appearanceConfig` (`theme`, `width`, `position`, `radius`, `accentColor`).
  3. Exposes the 5-part `Inspect` diagnostics popover (`Route`, `User`, `Viewport`, `Behavior`, `Theme Variables`).
  4. Clicking `[← Back]` returns to `/workspaces/:workspaceSlug/embeds/:embedId` when launched from Embed Detail or Installation.

---

### `WF-EMBED-04` — Install Embed (`APP-05` / `SU-EMBED-INSTALLATION`)
- **Route**: `/workspaces/:workspaceSlug/embeds/:embedId/installation` (aliased to `/app/embed/:embedId/installation`).
- **Entry**:
  1. Stage 1 `CO-EMBED-CARD` → `[Installation Guide]`.
  2. Stage 2 `CO-CHILD-NAVBAR` → `[Installation Guide]`.
  3. Stage 2 Tab 3 (`3. Installation`) or Step 3 footer → `[Open installation guide →]`.
- **Execution (`src/pages/EmbedInstallationView.tsx`)**:
  1. Evaluates the Embed's configuration via `evaluateEmbedInstallationContract` and displays the immediate verdict (`Frontend-only installation`, `Frontend installation`, or `Backend + frontend installation`).
  2. Lets the developer pick their browser environment (`[React] [Vue] [JavaScript]`) and presents only the required numbered steps (`01. Add the server endpoint` when signing is required, `Install the package`, `Add the Embed`, `Optional: identify signed-in users` collapsed when signing is optional, and `Verify your installation`).
  3. Runs single-action verification (`[Verify installation]` → `✓ Installation looks good`) with progressive error recovery and keeps QA simulation controls inside the collapsed `Developer tools` footer.

---

### `WF-EMBED-05` — Configure Host Identity (`EMBED-01` HMAC Assertion Signer)
- **Entry**: `SU-EMBED-INSTALLATION` (`ServerStep` inside the installation recipe when `signingState` is `required` or `optional`).
- **Execution**:
  1. Host server stores `OKENG_SIGNING_SECRET` in server environment variables and signs a short-lived (5-minute) HMAC-SHA256 user assertion containing `workspaceId`, `embedId`, `sub`, `email`, `clearance` (`everyone` | `members` | `admins`), and `exp`.
  2. Host browser fetches the signed assertion from `/api/okeng/embed-token` and passes it to `<OKEng userToken={...} />` or `window.OKEng.init({ userToken })`.
  3. OKEng verifies the signature server-side and filters collections strictly before retrieval.



