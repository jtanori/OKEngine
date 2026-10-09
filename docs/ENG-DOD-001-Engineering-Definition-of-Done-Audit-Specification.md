# ENG-DOD-001 — Engineering Definition of Done & Implementation Audit Specification

**Document ID:** `ENG-DOD-001`  
**Status:** Active Engineering Specification (v2.0 — Synchronized with Full Spec Corpus)  
**Audience:** OKEng Engineering Agents, Engineers, Reviewers  
**Scope:** Entire OKEng codebase, UI Design System (`DS-*`/`PR-*`/`CO-*`), App Router boundaries, Data/Cache/Engine pipelines, and Multilingual Runtime  
**Visibility:** Internal — OKEng Workspace Only (`COL-INTERNAL`)  
**Authority:** Canonical Engineering Implementation & Release Audit Contract  
**Update policy:** Living document; must be updated whenever architecture, design system primitives/components, security boundaries, caching, rendering, or internationalization contracts evolve.

---

# 0. Purpose & Governing Principle

A feature or release is **Done** only when every layer in the chain:

```text
Specification → Architecture → Design System (DS/PR/CO) → Implementation → Tests → Security → Localization (EN/ES) → Documentation → Runtime Verification
```

is 100% consistent. Any component, route, or service that passes behavioral tests while violating a P0 architectural, design-system, security, or localization gate MUST be classified as `PARTIAL — NOT DONE` until remediated.

---

# 1. Canonical Specification Hierarchy

```text
00 — Product Contract
├── UI-01 & 01–04 — UI Foundation (DS-* → PR-* → CO-* → SU-* → PA-* → PAGE-* → WF-*)
├── AUTH-01–05 — Authentication, Data Model, Permission Matrix, Public Surface & 5-Link Workspace Gate
├── EMBED-01–02 — Signed Host Identity Protocol & First-Class Composable Presentation Surfaces
├── ENGINE-01 — Deterministic Knowledge Retrieval & Response Compiler (Deterministic, Extractive, Generative)
├── CACHE-001 — 4-Layer Knowledge & Answer Caching with Tenant/Clearance/Locale Partitioning
├── I18N-001 — 3-Domain Internationalization & Multilingual Retrieval/Answer Specification (EN/ES)
├── RENDER-001 & RENDER-TEST-001 — Normalized AST Content Rendering & 15-Fixture Regression Suite
├── PUBLIC-01 — Public Platform Pages & OKEng Dogfooding
└── ENG-DOD-001 — 10-Gate Engineering Definition of Done & Implementation Audit Specification
```

---

# 2. The 10 Mandatory Engineering DoD Gates

## Gate 1: `ARCH-MIG-001` — Runtime & App Router Architecture Alignment (Priority: P0)
* [x] **App Router Hierarchy**: Root and boundary files exist and are active in `src/app/` (`layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `router.tsx`).
* [x] **Route Groups**: Clean separation across `(public)`, `(auth)`, and `(workspace)/workspaces/[workspaceSlug]/*` without URL-encoded characters (`%28`, `%29`, `%5B`, `%5D`) in filesystem paths.
* [x] **Canonical Workspace Namespace**: All authenticated workspace routes resolve under `/workspaces/:workspaceSlug/*` (`collections`, `collections/:collectionId`, `files`, `files/new`, `files/:fileId`, `embeds`, `embeds/:embedId`, `embeds/:embedId/installation`, `embeds/preview`, `test` with optional `?collectionId` / `?embedId`, `conversations`, `settings`, `stitch`). Legacy `/app/*` URLs are retired or deterministically redirected.
* [x] **Client/Server Boundary Hygiene**: Interactive leaf views declare `"use client"` explicitly; authorization (`src/services/auth.ts`), retrieval (`src/services/engine/`), caching (`src/services/cache/`), and repositories (`src/repositories/`) remain decoupled from UI state.
* [x] **API Route Handlers**: All server endpoints (`src/app/api/*/route.ts`) enforce input validation, authentication, and authorization before data access.

## Gate 2: `DATA-MIG-001` — Supabase Persistence, RLS & Fallback Contract (Priority: P0)
* [x] **Supabase SDK & Clients**: `@supabase/supabase-js` configured in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`.
* [x] **Reproducible SQL Migrations**: Schema (`20261003000001_okeng_schema.sql`) and Row-Level Security + `workspace-files` storage policies (`20261003000002_okeng_rls_and_storage.sql`) maintained under `supabase/migrations/`.
* [x] **Repository Abstraction Layer**: All 7 domain repositories (`CollectionRepository`, `DocumentRepository`, `FileRepository`, `EmbedRepository`, `ConversationRepository`, `UsageRepository`, `StorageRepository`) implemented in `src/repositories/`.
* [x] **Deterministic Fallback Adapter**: When `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are absent in local preview, repositories transparently fall back to the RLS-enforcing local adapter and report live vs. fallback telemetry in `/api/audit/status`.

## Gate 3: `UI-01` & `DS/PR/CO` — Full Design System & Componentization Compliance (Priority: P0)
* [x] **Layer 1 (`DS-*` Tokens in `src/index.css`)**: All colors (`bg-canvas`, `bg-surface`, `bg-elevated`, `bg-subtle`, `text-ink`, `text-ink-secondary`, `text-ink-muted`, `border-line`, `border-line-strong`, `accent`, `success`, `warning`, `danger`), radii (`rounded-xs` = 3px, `rounded-sm` = 4px, `rounded-md` = 6px), typography (`text-2xs` = 10px, `text-xs` = 12px, `text-sm` = 14px, `font-sans`, `font-mono`, `font-serif`), and elevation tokens are defined in `@theme`.
* [x] **Zero Hardcoded Hex or Arbitrary Bracket Classes in Views**: User-facing routes and boundaries (`src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/loading.tsx`, `src/pages/*`, `src/components/*`) contain zero hardcoded hex classes (`bg-[#...]`, `text-[#...]`, `border-[#...]`) and zero arbitrary bracket geometry/typography literals (`rounded-[4px]`, `rounded-[3px]`, `text-[11px]`, `text-[10px]`).
* [x] **Layer 2 (`PR-*` UI Primitives in `src/components/ui/`)**: Complete standalone primitive suite exported from `src/components/ui/index.ts`:
  - `PR-BOX`, `PR-CARD`, `PR-DIVIDER` (`Card.tsx`)
  - `PR-TEXT` (`Text.tsx`)
  - `PR-BUTTON` (`Button.tsx`)
  - `PR-BADGE` (`Badge.tsx`)
  - `PR-INPUT`, `PR-TEXTAREA` (`Input.tsx`)
  - `PR-SELECT` (`Select.tsx`)
  - `PR-TABS` (`Tabs.tsx`)
  - `PR-FILTER-BAR` (`FilterBar.tsx`)
  - `PR-TABLE` (`Table.tsx`)
  - `PR-MODAL` (`Modal.tsx`)
  - `PR-DRAWER` (`Drawer.tsx`)
  - `PR-CODE-BLOCK` (`CodeBlock.tsx`)
  - `PR-EMPTY-STATE` (`EmptyState.tsx`)
  - `PR-ACCORDION` (`Accordion.tsx`)
  - `PR-CHECKBOX` (`Checkbox.tsx`)
  - `PR-INFO-POPOVER` (`InfoPopover.tsx`)
* [x] **Layer 3 (`CO-*` Domain Components in `src/components/`)**: Complete standalone domain component suite:
  - `CO-APP-SHELL` & `CO-SIDEBAR` (`AppShell.tsx`)
  - `CO-PAGE-HEADER` (`PageHeader.tsx`)
  - `CO-CHILD-NAVBAR` (`ChildContextNavbar.tsx`)
  - `CO-LANGUAGE-SELECTOR` (`LanguageSelector.tsx`)
  - `CO-VISIBILITY-SELECTOR` (`VisibilitySelector.tsx`)
  - `CO-ROLE-SELECTOR` (`RoleSelector.tsx`)
  - `CO-COLLECTION-CARD` (`CollectionCard.tsx`)
  - `CO-EMBED-CARD` & `CO-EMBED-STATUS` (`EmbedCard.tsx`)
  - `CO-EMBED-INSTALLATION` (`EmbedInstallationView.tsx`)
  - `CO-FILE-ROW` (`FileTable.tsx`)
  - `CO-UPLOAD-DROPZONE` (`UploadDropzone.tsx`)
  - `CO-UPLOAD-DRAWER` (`UploadDrawer.tsx`)
  - `CO-MARKDOWN-EDITOR` (`MarkdownEditor.tsx`)
  - `CO-RBAC-MATRIX` (`RbacMatrix.tsx`)
  - `CO-CONTENT-RENDERER` (`src/content/renderer/content-renderer.tsx`)
  - `CO-DOCUMENT-NAV` (`DocumentNav.tsx` — single-expand collapsible collection tree with first collection expanded by default and auto-selection of first item on expand)
  - `CO-SOURCE-LIST` (`SourceList.tsx`)
  - `CO-NEXT-STEP` / `CO-CTA-BUTTON` (`NextStepButton.tsx`)
  - `CO-FEEDBACK` (`FeedbackControl.tsx`)
  - `CO-DOCUMENT-VIEWER` (`src/components/public/DocArticleRenderer.tsx`)
  - `CO-ASK-BOX` (`src/components/public/DogfoodInlineBot.tsx`)
* [x] **Layer 4 (`SU-*` & `PAGE-*` Composition)**: All 9 page views and App Router boundary files (`error.tsx`, `not-found.tsx`, `loading.tsx`) compose `PR-*` and `CO-*` modules instead of raw un-primitived HTML controls.
* [x] **Universal Form Security, Sanitization & State Contract (`FORM-SEC-01`)**: Every form, input, select, checkbox, upload dropzone, and action button across `SURF-PUBLIC`, `SURF-AUTH`, `SURF-WORKSPACE`, and `SU-EMBED-*` enforces strict XSS/script/protocol sanitization (`src/services/formSecurity.ts`), localized placeholders, helper hints (`hint`), accessible field-level validation errors (`aria-invalid`, `role="alert"`), and `isLoading` submit spinners.

## Gate 4: `AUTH-01`–`05` — Dual RBAC, Auth Legal Consent, Password Recovery & 5-Link Workspace Authorization Chain (Priority: P0)
* [x] **Dual Independent RBAC (`AUTH-03`, `INV-05`)**: Platform roles (`PLATFORM_OWNER`, `PLATFORM_ADMIN`, `PLATFORM_SUPPORT`, `PLATFORM_FINANCE`, `PLATFORM_VIEWER`) and Workspace roles (`WORKSPACE_OWNER`, `WORKSPACE_ADMIN`, `WORKSPACE_EDITOR`, `WORKSPACE_ANALYST`, `WORKSPACE_VIEWER`, `WORKSPACE_BILLING`) are strictly separated. Platform Admins have zero implicit customer workspace access without an active, owner-approved, time-boxed `AdminGrant`.
* [x] **Auth Surface Compliance (`AUTH-04`)**: `/login` and `/signup` initialize with empty values and localized placeholders; `/login` includes a **Forgot password?** link to `/forgot-password` (`PAGE-AUTH-03`) and a standard legal consent legend linking to `/terms` and `/privacy`; `/signup` requires an explicit `PR-CHECKBOX` acceptance of the Terms of Service and Privacy Policy; security persona simulation is isolated strictly to the Test Console (`/workspaces/:workspaceSlug/test`).
* [x] **5-Link Workspace Gate (`AUTH-05`)**: Every `/workspaces/[workspaceSlug]/*` route validates: (1) Valid Session → (2) User Active → (3) Workspace Exists & Active → (4) Active `WorkspaceMembership` or `AdminGrant` → (5) Route Action Permission.
* [x] **Cross-Tenant 404 Non-Disclosure (`AUTH-05 §14`)**: Unauthorized or missing resources return the `NotFound` (`404`) boundary without leaking tenant or document existence.

## Gate 5: `EMBED-01`–`02` — Signed Host Identity, Dedicated Installation Recipe & 6 Composable Embed Surfaces (Priority: P0)
* [x] **HMAC-SHA256 Signed Host Context & Hard `401` Boundary (`EMBED-01`)**: Host identity assertions validate signature, timestamp skew (`±300s`), replay nonce (`jti`), and workspace/embed binding; missing assertions on public/mixed embeds resolve to `everyone` clearance, whereas invalid or tampered assertions (`INVALID_TOKEN_SIGNATURE`) halt with `401 Unauthorized` prior to retrieval with zero anonymous fallback.
* [x] **Pre-Retrieval Clearance & Target-Scope Intersection (`resolveTestConsoleScope` & "Nothing Shown" Rule)**: `EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections` filters unauthorized collections and chunks out *before* vector/BM25 scoring so they never appear in answers, citations, or follow-up CTAs.
* [x] **6 Composable Presentation Modes, Dedicated `APP-05` Installation Recipe & Bounded Panel Geometry (`EMBED-02`)**: `widget` (`SU-EMBED-CHAT`), `panel` (`SU-EMBED-PANEL` using `PR-DRAWER` with default `360px` width, `maxWidth: min(380px, 40%)` inline guard, and automatic `100%` width normalization), `fullscreen` (`SU-EMBED-FULLSCREEN`), `inline` (`SU-EMBED-INLINE`), `documentation` (`SU-EMBED-DOCUMENTATION` using `CO-DOCUMENT-NAV`), and `contextual` (`SU-EMBED-CONTEXTUAL-HELP`) all supported across `EmbedConfigView`, `EmbedInstallationView` (`APP-05` centered single-column recipe), and `WidgetPreviewView`.

## Gate 6: `ENGINE-01` — Deterministic Retrieval & Response Compiler (Priority: P0)
* [x] **Heading-Aware Parser & AST Indexing (`knowledgeParser.ts`)**: Extracts YAML frontmatter, headings, paragraphs, lists, code blocks, tables, callouts, and `next_step` CTAs with line-range metadata.
* [x] **BM25 + Bilingual Concept Retriever (`bm25Retriever.ts`)**: Combines BM25 scoring, Porter stemming, bilingual EN/ES concept expansion, and route-context boosting within authorized scope.
* [x] **Deterministic Answer Planner (`responseCompiler.ts`)**: Classifies query intent (`procedure`, `location`, `definition`, `troubleshooting`, `comparison`, `faq`, `unknown`) and compiles grounded responses across `deterministic` (default LLM-less), `extractive`, and `generative` modes.

## Gate 7: `CACHE-001` — 4-Layer Knowledge & Answer Caching (Priority: P0)
* [x] **4 Isolated Cache Layers (`knowledgeCache.ts`)**:
  - `L1` Document Parse & AST Cache
  - `L2` Authorized Retrieval Scope & Candidate Chunk Cache
  - `L3` Deterministic Compiled Answer Cache
  - `L4` Generative Answer Cache
* [x] **Security & Locale Partitioning**: Every L2/L3/L4 cache key is cryptographically partitioned by `workspaceId`, `effectiveClearance`, `allowedCollectionIdsHash`, `workspaceEpoch`, `answerMode`, and `responseLanguage` (`en` | `es`). Cross-clearance or cross-tenant cache hits are impossible.
* [x] **Immediate Epoch Invalidation**: Document edits, uploads, deletions, or collection visibility changes increment the workspace/collection epoch and immediately invalidate stale cache entries.

## Gate 8: `I18N-001` — Three-Domain & Three-Surface Internationalization (Priority: P0)
* [x] **Three Language Domains**: `ui_language`, `query_language`, and `response_language` + `knowledge_languages` resolved independently via `LanguageContext` (`src/i18n/`).
* [x] **Three Surface Domains**: 100% of user-facing strings localized via `useI18n()` (`t(...)`) across `SURF-PUBLIC` (including `/login`, `/signup`), `SURF-WORKSPACE` (all 9 workspace views + `AppShell`), `SU-EMBED-*` (all 6 embed presentation modes), and App Router boundaries (`error.tsx`, `not-found.tsx`, `loading.tsx`).
* [x] **1:1 EN/ES Dictionary Parity**: `src/i18n/locales/en.ts` (`EN_DICTIONARY`) and `src/i18n/locales/es.ts` (`ES_DICTIONARY`) maintain identical semantic key sets with zero untranslated fallbacks.
* [x] **Language Adapter Honesty**: In LLM-less deterministic mode, when an authorized source exists only in English and `response_language === 'es'` without an available translation, the compiler emits a localized availability banner rather than fabricating unverified machine translation.

## Gate 9: `RENDER-001` & `RENDER-TEST-001` — Canonical AST Rendering & Fixture Regression (Priority: P0)
* [x] **Single Normalized Content AST (`renderer_version = 1`)**: All 10 presentation contexts (`DOCUMENT_FULL`, `DOCUMENT_PREVIEW`, `EDITOR_PREVIEW`, `CHAT_ANSWER`, `CHAT_MESSAGE`, `SOURCE_EXCERPT`, `CITATION`, `TEST_CHAT`, `EMBEDDED_CHAT`, `PUBLIC_DOC`) render through `CO-CONTENT-RENDERER` (`src/content/renderer/content-renderer.tsx`).
* [x] **Heading Isolation Invariant**: Headings never absorb subsequent single-newline paragraphs.
* [x] **Unified Citation Strip (Option A) & Scoped Heading Anchors (Option 1)**: Citation chips render once inside `CO-CONTENT-RENDERER` footer for chat/answer contexts; hover `#` anchor links appear only in full document contexts (`DOCUMENT_FULL`, `PUBLIC_DOC`).
* [x] **HTML/URI Sanitization**: `src/content/sanitizer/content-sanitizer.ts` strips unsafe protocols (`javascript:`, `data:`, `vbscript:`) and raw script/HTML injection before rendering.
* [x] **15-Fixture Regression Suite (`RENDER-TEST-001`)**: Verified via `/api/render/verify`.

## Gate 10: `PUBLIC-01`–`03` — Public Surface Dogfooding, Mixed-Access Homepage Showcase & Scroll-to-Top (Priority: P0)
* [x] **Dogfooding Architecture & Mixed-Access Homepage Showcase (`EMB-PUBLIC-HOME`)**: Public pages (`/`, `/about`, `/docs`, `/docs/:slug`) are powered by real `OKEng` workspace collections (`COL-PUBLIC`, `COL-DOCS`, `COL-LEGAL`, `COL-CUSTOMER`, `COL-INTERNAL`) and live embedded bots (`EMB-PUBLIC-HOME`, `EMB-PUBLIC-DOCS`, `EMB-PUBLIC-LEGAL`). The homepage Hero runs a single live mixed-access `EMB-PUBLIC-HOME` instance with an adjacent **Host Environment Bar** (`Identity: [ Visitor ] [ Member ] [ Admin ]` + `Context` route switcher) where both server-side retrieval and the displayed `✓/✗` collection matrix derive strictly from `resolveRequestEmbedIdentity` / `resolveEmbedAuthorization`.
* [x] **Homepage ↔ Test Console Verification Parity (`PAGE-PUB-01` ↔ `PAGE-APP-06`)**: Scenarios A (`Visitor/Anonymous`), B (`Member`), C (`Admin`), D (`Invalid Token → 401`), and E (`Multilingual ¿Cómo funciona OKEng?`) produce identical pre-retrieval authorization and citation outcomes on the Homepage Embed and in `/workspaces/okeng/test?embedId=EMB-PUBLIC-HOME`.
* [x] **Collapsible Documentation Navigation (`CO-DOCUMENT-NAV`) & Auth-Gated Specs**: Public collections (`COL-DOCS`, `COL-PUBLIC`, `COL-LEGAL`) are visible to everyone with `COL-DOCS` expanded by default and single-expand mutual exclusion; internal Engineering Specifications (`/docs`) are visible only when authenticated.
* [x] **Deterministic Scroll-to-Top Restoration**: Every route, page, sidebar article, collection expansion, and citation navigation resets window and viewport scroll positions to `(0, 0)`.
* [x] **Deterministic Legal Rendering**: `/terms`, `/privacy`, and `/acceptable-use` render authoritative Markdown from `COL-LEGAL` via `DocArticleRenderer` (`CO-DOCUMENT-VIEWER`) without LLM rewriting.
* [x] **Permission-Gated "Edit in Workspace"**: Public articles display the `[Edit in Workspace]` action only when the active session holds `workspace.documents.manage` in the `okeng` workspace.

