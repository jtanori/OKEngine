# 03 — Page Specifications (Canonical App Router & Archetype Hierarchy)

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

