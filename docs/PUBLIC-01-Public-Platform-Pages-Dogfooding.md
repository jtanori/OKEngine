# PUBLIC-01 — Public Platform Pages & OKEng Dogfooding Specification

**Status:** MVP Product / UI / Integration Specification  
**Type:** Public Platform + Dogfooding  
**Depends on:** Product Contract, `AUTH-04`, `AUTH-05`, `EMBED-01`  
**References:** `UI-01` (Primitives, Components, Surfaces, Page Specs, Archetypes & Workflows)

---

# 1. Purpose

Define the public-facing OKEng platform and establish the OKEng website itself as the first production consumer of the OKEng engine.

> **OKEng should use OKEng wherever the underlying product capability is useful.**

The public website therefore becomes both:
1. the public-facing product/marketing surface; and
2. the first dogfood environment for ingestion, collections, retrieval, citations, and embedded chat.

---

# 2. Public Surface Architecture

```text
OKENG PUBLIC PLATFORM
│
├── /                   → PAGE-PUB-01 (Home / Public Product Landing)
├── /about              → PAGE-PUB-02 (About / Public Information Page)
├── /contact            → PAGE-PUB-08 (Contact / Public Contact Form)
├── /docs               → PAGE-PUB-06 (Documentation Index & Retrieval Search)
├── /docs/:slug         → PAGE-PUB-07 (Documentation Article)
├── /terms              → PAGE-PUB-03 (Terms of Service)
├── /privacy            → PAGE-PUB-04 (Privacy Policy)
├── /acceptable-use     → PAGE-PUB-05 (Acceptable Use Policy)
├── /login              → PAGE-AUTH-01 (Sign In — legal consent legend + Forgot password link)
├── /signup             → PAGE-AUTH-02 (Sign Up — required PR-CHECKBOX legal consent)
└── /forgot-password    → PAGE-AUTH-03 (Password Recovery inside auth card)
```

All pages above are public. Private workspace routes (`/workspaces/okeng/*`) remain strictly protected according to `AUTH-04` and `AUTH-05`.

---

# 3. Dogfooding Principle & Initial OKEng Workspace

The public site uses the real OKEng engine for public, customer-scoped, and admin-scoped knowledge retrieval. There is no second custom FAQ or parallel sandbox backend for the marketing site.

* **Workspace Name:** `OKEng` (`slug: 'okeng'`, `id: 'ws_okeng_01'`)
* **Owner:** OKEng Product Owner account (`usr_sarah_102`)

```text
OKEng Workspace (ws_okeng_01)
      ├── COL-PUBLIC   (Public Product Knowledge, visibility = everyone)  ──┬─► EMB-PUBLIC-HOME (Mixed-Access Showcase)
      ├── COL-DOCS     (Documentation, visibility = everyone)             ──┼─► EMB-PUBLIC-DOCS (Public Docs Only)
      ├── COL-LEGAL    (Legal, visibility = everyone)                     ──┼─► EMB-PUBLIC-LEGAL (Public Legal Only)
      ├── COL-CUSTOMER (Customer Docs, visibility = members)              ──┤
      └── COL-INTERNAL (Admin Docs, visibility = admins)                  ──┘
```

### Homepage Floating Guided Tour & Server-Only Demo Authorization (`PAGE-PUB-01` & `PUBLIC-04`)
* **Single Floating Mixed-Access Assistant (`EMB-PUBLIC-HOME` via `HomepageGuidedTour.tsx`)**: Launched from the Hero CTA (`"What is OKEng?"`) or bottom-right floating launcher (`role="dialog"`, `aria-modal="true"`). Binds `['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL', 'COL-CUSTOMER', 'COL-INTERNAL']` with a 3-tier conversational layout (`PRIMARY — TOUR`, `NEXT — PROGRESSION`, `SECONDARY — ASK`) and no inline duplicate chat or permanent engineering console on the homepage.
* **Collapsed Demo Settings Drawer (`Identity` & `Context`)**: Inside the floating assistant header (`[Demo settings]`), visitors can inspect or switch server-validated demo presets (`Visitor`, `Member`, `Admin`) and context routes (`/`, `/docs/embedding`, `/docs/access-control`) with atomic `pendingSettingsOpId` commit semantics (`POST /api/demo/homepage-context`).
* **Non-Bypassable Pre-Retrieval Security Boundary (`server/demo/publicHomepageDemoAuthorization.ts`)**:
  - In `POST /api/chat/stream`, any request with `embedId === 'EMB-PUBLIC-HOME'`, `demoPreset !== undefined`, or `mode === 'public_homepage_demo'` routes unconditionally into `handlePublicHomepageDemoChatStream`. Caller-supplied JWTs, roles, signing secrets, or document arrays are rejected with `400` before retrieval.
  - Eligible documents $D$ are narrowed before chunk scoring via 6-point verification (`workspaceId === 'ws_okeng_01'`, `EffectiveScope = B ∩ R`, `PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP`, and `PUBLIC_DEMO_SOURCE_POLICY`), cached under a policy-versioned key (`demoPolicyVersion` + `narrowedDocumentFingerprint`), and validated for grounded citation provenance (`serverOutcome: 'grounded' | 'refused' | 'failed'`).

---

# 4. Canonical Source Documents (`PUBLIC-01 §8 & §46`)

All public product explanations, documentation articles, legal policies, and customer/admin showcase guides are backed by canonical Markdown documents inside the `OKEng` workspace (`ws_okeng_01`):

### Public Product Knowledge (`COL-PUBLIC` — `visibility = everyone`, 4 documents; `doc_pub_01` includes `translations.es`)
* `01 product-overview.md` (`doc_pub_01`, English + embedded Spanish `translations.es` — What is OKEng, core architecture, capabilities & limits, `nextStep: /docs/getting-started`)
* `02 product-concepts.md` (`doc_pub_02`, Core entities: Workspaces, Collections, Documents, Chunks, Embeds, Citations & Next Steps, `nextStep: /docs/collections`)
* `03 faq.md` (`doc_pub_03`, Public FAQ: capabilities today, missing-topic refusal, presentation modes, getting started, `nextStep: /docs/getting-started`)
* `04 security-overview.md` (`doc_pub_04`, Pre-retrieval `EffectiveScope` intersection, 4-case token boundary, input/file safety, `nextStep: /docs/access-control`)

### Documentation (`COL-DOCS` — `visibility = everyone`, 11 documents)
* `05 getting-started.md` (`doc_docs_05`, 4-step quickstart from workspace creation to Embed installation, `nextStep: /signup`)
* `06 workspaces.md` (`doc_docs_06`, Multi-tenant isolation, roles, signing secrets & `knowledgeVersion`, `nextStep: /docs/collections`)
* `07 collections.md` (`doc_docs_07`, Visibility tiers `everyone` / `members` / `admins` & `EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections`, `nextStep: /docs/access-control`)
* `08 files.md` (`doc_docs_08`, Native `.md`/`.txt` ingestion + structured `.json`/`.csv` upload support in `UploadDropzone.tsx`, filename & script safety, `nextStep: /docs/ingestion`)
* `09 markdown.md` (`doc_docs_09`, Heading-aware authoring & `nextStep` frontmatter contract, `nextStep: /docs/retrieval`)
* `10 ingestion.md` (`doc_docs_10`, Heading-aware chunking, line-range tracking & `knowledgeVersion` cache invalidation, `nextStep: /docs/retrieval`)
* `11 retrieval.md` (`doc_docs_11`, BM25 lexical ranking, route/language boosts, compilation modes, citations & missing-topic honesty, `nextStep: /docs/collections`)
* `12 access-control.md` (`doc_docs_12`, Dual RBAC model, 4-case identity/token verification & pre-retrieval `EffectiveScope`, `nextStep: /docs/embedding`)
* `13 embedding.md` (`doc_docs_13`, Public/Protected/Mixed-Access embeds, signed `HS256` tokens & live vs. simulator presentation modes, `nextStep: /docs/getting-started`)
* `14 troubleshooting.md` (`doc_docs_14`, Token expiry/signature diagnostics & Test Console verification, `nextStep: /docs/getting-started`)
* `20 facturacion-y-planes.md` (`doc_docs_es_20`, Spanish billing & subscription guide, `nextStep: /docs/facturacion-y-planes`)

### Legal (`COL-LEGAL` — `visibility = everyone`, 3 documents)
* `15 terms.md` (`doc_legal_15`)
* `16 privacy.md` (`doc_legal_16`)
* `17 acceptable-use.md` (`doc_legal_17`)

### Customer Docs (`COL-CUSTOMER` — `visibility = members`, 3 documents)
* `21 customer-authentication.md` (`doc_cust_21`, *Customer Authentication & Signed Identity Assertions*)
* `22 host-context-integration.md` (`doc_cust_22`, *Host Context & Route-Aware Customer Integration*)
* `23 customer-integration.md` (`doc_cust_23`, *Customer Production Rollout & Allowed Origins*)

### Admin Docs (`COL-INTERNAL` — `visibility = admins`, 4 documents)
* `18 internal-operations.md` (`doc_internal_18`)
* `19 eng-dod-001.md` (`doc_internal_19`)
* `24 authorization-architecture.md` (`doc_internal_24`, *Pre-Retrieval Authorization & EffectiveScope Architecture*)
* `25 retrieval-pipeline-internals.md` (`doc_internal_25`, *Retrieval Pipeline, Answer Planner & Test Console Verification*)

---

# 5. Deterministic Rendering vs. Dynamic Retrieval (`PUBLIC-01 §17, §36, §37`)

* **Deterministic Rendering**: Navigation, page layout, legal document bodies (`/terms`, `/privacy`, `/acceptable-use`), and documentation article bodies (`/docs/:slug`) render the authoritative Markdown source document deterministically—never depending on an LLM to render legal or article text.
* **Dynamic OKEng Retrieval**: Embedded assistants (`EMB-PUBLIC-HOME`, `EMB-PUBLIC-DOCS`, `EMB-PUBLIC-LEGAL`) and documentation search use the real OKEng retrieval engine (`resolveRequestEmbedIdentity` → `resolveEmbedAuthorization` → `retrieveKnowledge` → `compileKnowledgeResponse`) with source citations and contextual `NextStepButton` (`CO-NEXT-STEP`) actions.
* **Live Update Flow & Hydration Reconciliation**: Editing any Markdown document inside the authenticated `/workspaces/okeng` console or updating canonical seed documents (`INITIAL_DOCUMENTS` with a newer `updatedAt` timestamp via `store.reconcileCanonicalSeeds`) immediately updates both deterministically rendered public pages and the active retrieval index while bumping `knowledgeVersion`.
* **Test Console Reproducibility (`PAGE-APP-06`)**: Every homepage demo scenario (`Scenario A: Visitor`, `Scenario B: Member`, `Scenario C: Admin`, `Scenario D: Invalid Token → 401`, `Scenario E: Multilingual ¿Cómo funciona OKEng?`) can be reproduced identically inside `/workspaces/okeng/test?embedId=EMB-PUBLIC-HOME`.

---

# 6. Collapsible Documentation Navigation (`CO-DOCUMENT-NAV`) & Auth-Gated Engineering Specs

* **Single-Expand Collapsible Sidebar (`CO-DOCUMENT-NAV` / `PR-ACCORDION`)**:
  - The `/docs` left sidebar organizes documents into collapsible collection sections rather than a single flat list.
  - **Default State**: The first collection (`COL-DOCS` — Product Guides) is **expanded by default**; all subsequent collections start **collapsed**.
  - **Mutual Exclusion**: Only **one collection at a time** can be expanded.
  - **Stronger Heading Typography**: Collection headings use `font-sans text-xs font-semibold tracking-tight text-ink` with tabular document counts (`tabular-nums`).
  - **Auto-Select First Item on Expand**: Expanding a collapsed collection automatically selects and renders the first document in that collection.
* **Visibility Scoping in `/docs`**:
  - **Everyone (`anonymous` & `authenticated`)**: Can browse Product Guides (`COL-DOCS`, 11 docs), Public Product Knowledge (`COL-PUBLIC`, 4 docs), and Legal & Trust Policies (`COL-LEGAL`, 3 docs) — 18 public documents total.
  - **Authenticated Users Only**: The **Engineering Specifications (`COL-INTERNAL` / `/docs` spec corpus)** collection group is included in the `/docs` collapsible sidebar **only when the user is authenticated**.
* **Deterministic Scroll-to-Top Navigation**:
  - Navigating between any public page, documentation article, citation chip, or footer link immediately resets window and container scroll positions to `(0, 0)`.

---

# 7. Security, Input Sanitization & Failure Isolation (`PUBLIC-01 §41, §42, §43` & `FORM-SEC-01`)

* Default visitor embeds (`Visitor` / `anonymous`) retrieve strictly from collections with `visibility = everyone`; elevated clearance (`members` or `admins`) on `EMB-PUBLIC-HOME` requires a valid HMAC-SHA256 signed host token verified server-side by `resolveRequestEmbedIdentity`. Unverified browser role assertions in `mode: 'embed'` are rejected with `401 UNVERIFIED_ROLE_ASSERTION`.
* All public forms and inputs (`/contact`, `/login`, `/signup`, `/forgot-password`, `/docs` filter, and `CO-ASK-BOX`) enforce `FORM-SEC-01` sanitization (blocking XSS/script payloads and unsafe URLs) with localized helper hints, placeholders, field-level validation errors, and `isLoading` submit spinners.
* Primary page content renders immediately without waiting for chat initialization; a chat outage never breaks `/`, `/about`, `/docs`, `/terms`, or `/privacy`.

---

# 8. Canonical Public Header & Footer (`CO-PUBLIC-HEADER` & `CO-PUBLIC-FOOTER`, `PUBLIC-01 §27–28`)

* **Canonical Public Header (`CO-PUBLIC-HEADER`)**:
  - 56px (`h-14`) hairline header (`border-b border-line bg-surface`) containing the `OK` brand mark, primary links (`Docs`, `About`), the compact `CO-LANGUAGE-SELECTOR` (`EN` / `ES`), and session-aware actions (`Sign in` / `Get started` when anonymous, or `Open Workspace` when authenticated).
* **Canonical Public Footer (`CO-PUBLIC-FOOTER`)**:
  - 4-column responsive directory (`grid-cols-2 sm:grid-cols-4 gap-6`): **Product** (`Overview`, `Security`), **Resources** (`Documentation`, `Contact`), **Company** (`About`, `Workspace Console`), and **Legal** (`Terms`, `Privacy`, `Acceptable Use`), with each column using a regular vertical spacing unit (`space-y-2`, `8px`) between its heading and link list.
  - **Menu Heading vs. Link Differentiation**:
    - **Column Headings**: Rendered as non-interactive `<Text as="span" variant="mono" tone="primary" className="block !text-xs font-semibold uppercase tracking-wider">` (Monospace `JetBrains Mono`, `12px` / `text-xs`, uppercase with `tracking-wider`, primary ink `#171717`, semibold weight `600`, no bottom border).
    - **Navigation Links**: Rendered in `<ul className="space-y-1.5 text-ink-secondary">` with `text-xs text-ink-secondary hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer`, ensuring clear visual and interactive separation between category headings and clickable links.
  - **Bottom Brand Lockup**: Below the `border-t border-line` divider, the footer displays the exact same `OK` symbol (`w-6 h-6 bg-ink rounded-xs text-surface font-mono text-xs font-semibold`) and `OKEng` wordmark (`font-sans font-semibold text-sm tracking-tight text-ink`) used in the main navigation bar (`CO-PUBLIC-HEADER`).

---

# 9. Homepage Floating Guided Tour Contract & Verified Capability Boundary (`PAGE-PUB-01`)

> **Implementation & Verification (`src/data/homepageTourContract.ts`, `server/demo/publicHomepageDemoAuthorization.ts`, `src/services/homepageDemoStreamAdapter.ts`, `src/services/homepageTourController.ts`, `src/components/public/HomepageGuidedTour.tsx`, `tests/readiness/homepage-tour-readiness.test.ts`)**: `HomepageGuidedTour` on `PAGE-PUB-01` renders a single floating conversational assistant (`EMB-PUBLIC-HOME`) governed by `APPROVED_HOMEPAGE_TOUR_CONTRACT` (`5` stages) and `CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY` (`13` entries), backed by the non-bypassable server-only `server/demo/publicHomepageDemoAuthorization.ts` boundary. The homepage no longer renders a duplicate inline assistant or permanent environment bar; `/docs` (`EMB-PUBLIC-DOCS`) remains completely isolated.

### 9.1 Canonical Capability Inventory (`CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY`)
Every public claim in `COL-PUBLIC`, `COL-DOCS`, and the homepage tour contract MUST map to `CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY`:

| Capability ID | Status | Implementation Evidence | Verified Behavior & Explicit Bounds |
| :--- | :--- | :--- | :--- |
| `CAP-WORKSPACE-ISOLATION` | `Verified` | `src/services/auth.ts`, `src/services/store.ts`, `server/demo/publicHomepageDemoAuthorization.ts` | Multi-tenant workspace boundary (`ws_okeng_01` normalized from alias `okeng` at boundary), 5-link RBAC (`WORKSPACE_OWNER` / `WORKSPACE_USER`), and `knowledgeVersion` cache epoch invalidation. |
| `CAP-COLLECTION-RBAC` | `Verified` | `src/services/embedAuthorization.ts`, `server/demo/publicHomepageDemoAuthorization.ts` | 3-tier visibility (`everyone`, `members`, `admins`) enforced before chunk scoring via `EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections` and 6-point pre-retrieval narrowing $D$. |
| `CAP-SIGNED-HOST-IDENTITY` | `Verified` | `src/services/embedAuthorization.ts` (`resolveRequestEmbedIdentity`, `verifyEmbedIdentityToken`), `server.ts` | HMAC-SHA256 (`HS256`) host token verification with 4-case boundary; invalid/expired/tampered tokens or unverified role assertions fail closed with `401`. Public homepage demo requests use dedicated server-only `PublicDemoAuthority` (`visitor`, `member`, `admin` presets) and reject caller tokens (`400 DEMO_TOKEN_NOT_ACCEPTED`). |
| `CAP-FILE-INGESTION-BOUNDED` | `Limited` | `src/components/UploadDropzone.tsx`, `src/components/MarkdownEditor.tsx`, `src/services/validation.ts` | Browser `FileReader.readAsText()` upload dropzone accepts `.md`, `.txt`, `.json`, and `.csv` text files plus direct Markdown authoring with filename/script validation; no binary PDF/DOCX OCR parser or web crawler. |
| `CAP-HEADING-CHUNKING` | `Verified` | `src/services/engine/knowledgeParser.ts` (`parseKnowledgeDocument`) | Heading-aware Markdown/text segmentation (`#`, `##`, `###`) extracting steps, bullets, warnings, code blocks, and 1-indexed `lineStart`–`lineEnd` ranges. |
| `CAP-BM25-RETRIEVAL` | `Verified` | `src/services/engine/bm25Retriever.ts` (`retrieveAndRankAuthorizedDocs`), `src/services/engine/responseCompiler.ts` | Custom BM25 lexical scoring (`k1 = 1.5`, `b = 0.75`) + field boosts (title `+1.8`, intent `+2.0`, heading `+1.1`, synonym `+0.75`), two-step threshold (`rawScore >= 1.35`, `normalizedConfidence >= 0.25`), and deterministic/extractive compilation. |
| `CAP-ROUTE-CONTEXT-BOOST` | `Verified` | `src/services/engine/bm25Retriever.ts`, `src/services/engine/responseCompiler.ts`, `src/data/seedData.ts` | Route-prefix match (`currentUrl.startsWith(doc.route)`) adds `+2.2` to `rawScore` (`routeBoost = 0.15`) and `routeRules` boost pinned docs strictly inside the already-authorized `EffectiveScope`. |
| `CAP-GROUNDED-CITATIONS` | `Verified` | `src/services/engine/responseCompiler.ts`, `server/demo/publicHomepageDemoAuthorization.ts` | Structured source citations (`docId`, `title`, `filename`, `collectionId`, `url`, `citationRenderMode`) validated against `PUBLIC_DEMO_SOURCE_POLICY` and `CANONICAL_PUBLIC_ROUTE_REGISTRY`, with server-computed `serverOutcome` (`'grounded' | 'refused' | 'failed'`). |
| `CAP-MISSING-TOPIC-REFUSAL` | `Verified` | `src/services/engine/bm25Retriever.ts`, `src/services/engine/responseCompiler.ts` | Two-step relevance gate: candidates with `rawScore < 1.35` are capped at `normalizedConfidence <= 0.20` and filtered out by `normalizedConfidence >= 0.25`, returning `answerType: 'unknown'` and `serverOutcome: 'refused'` with `0` fabricated sources. |
| `CAP-EMBED-MODES-BOUNDED` | `Limited` | `src/pages/PublicSurfaceView.tsx`, `src/components/public/HomepageGuidedTour.tsx`, `public/widget.js`, `src/pages/EmbedConfigView.tsx`, `src/pages/WidgetPreviewView.tsx` | Floating guided tour assistant (`/` `EMB-PUBLIC-HOME`) and `documentation` (`/docs` `EMB-PUBLIC-DOCS`) are live on public pages; `/widget.js` provides a standalone drop-in launcher/drawer; all 6 modes (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`) are configurable in Embed Studio and previewable in the Host Simulator. |
| `CAP-INSTALLATION-RECIPE` | `Verified` | `src/pages/EmbedInstallationView.tsx`, `src/pages/TestConsoleView.tsx` | Configuration-driven installation recipe (`React`, `Vue`, `JavaScript`) distinguishing frontend-only public embeds from backend+frontend signed-token embeds, plus Test Console (`PAGE-APP-06`) verification. |
| `CAP-MULTILINGUAL-ES` | `Verified` | `src/i18n/I18nContext.tsx`, `src/services/engine/bm25Retriever.ts`, `src/data/seedData.ts` | Full EN/ES UI localization, bilingual tokenization/synonyms, same-language boost (`+0.65` on `rawScore`), `doc_pub_01.translations.es`, and native Spanish `doc_docs_es_20`. |
| `CAP-GENERATIVE-FALLBACK` | `Limited` | `server.ts` (`/api/chat/stream`), `src/services/api.ts` | Optional server-side Gemini synthesis over pre-filtered `authorizedDocs` when `GEMINI_API_KEY` is configured; falls back deterministically to `compileKnowledgeResponse` when unconfigured. |

* **Excluded Claims (`Partial` / `Planned` / `Unverified` — Never Presented as Shipped)**: Dense vector embeddings / HNSW vector databases, automated web crawlers or 3P SaaS sync connectors (Notion/Confluence/Google Drive), binary PDF/DOCX OCR, and automated public domain CORS enforcement are not implemented and MUST NOT be claimed as shipped functionality.

### 9.2 Approved 5-Stage Traceable Homepage Guided Tour Contract & Discriminated Progression

| Stage ID | Title | Suggested Prompt | Acceptable Authoritative Source Set (`COL-PUBLIC` / `COL-DOCS`) | Discriminated `progression` Contract | Mapped Acceptance Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `STAGE-1-WHAT-IS-OKENG` | **1. What is OKEng?** | `"What is OKEng, and what problem does it solve?"` | Primary: `product-overview.md` (`doc_pub_01`)<br>Acceptable: `product-concepts.md` (`doc_pub_02`), `faq.md` (`doc_pub_03`) | `advance_stage` → `STAGE-2-WHAT-IT-DOES-TODAY`<br>Companion: `/docs/getting-started` | `TOUR-STAGE-01` |
| `STAGE-2-WHAT-IT-DOES-TODAY` | **2. What can it do today?** | `"What can I do with OKEng today?"` | Primary: `product-overview.md` (`doc_pub_01`), `faq.md` (`doc_pub_03`)<br>Acceptable: `files.md` (`doc_docs_08`), `embedding.md` (`doc_docs_13`), `getting-started.md` (`doc_docs_05`) | `advance_stage` → `STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS`<br>Companion: `/docs` | `TOUR-STAGE-02` |
| `STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS` | **3. Answers grounded in knowledge** | `"How does OKEng answer questions using my documentation, and how do citations help me verify an answer?"` | Primary: `retrieval.md` (`doc_docs_11`), `ingestion.md` (`doc_docs_10`)<br>Acceptable: `markdown.md` (`doc_docs_09`), `product-concepts.md` (`doc_pub_02`), `faq.md` (`doc_pub_03`) | `advance_stage` → `STAGE-4-CONTEXT-AND-ACCESS-CONTROL`<br>Companion: `/docs/retrieval` | `TOUR-STAGE-03` |
| `STAGE-4-CONTEXT-AND-ACCESS-CONTROL` | **4. Context and access control** | `"How do collections, visibility tiers, and host context control what an Embed can retrieve?"` | Primary: `collections.md` (`doc_docs_07`), `access-control.md` (`doc_docs_12`), `security-overview.md` (`doc_pub_04`)<br>Acceptable: `retrieval.md` (`doc_docs_11`), `embedding.md` (`doc_docs_13`) | `advance_stage` → `STAGE-5-GET-STARTED`<br>Companion: `/docs/access-control` | `TOUR-STAGE-04` |
| `STAGE-5-GET-STARTED` | **5. Get started** | `"What are the steps to get started and integrate OKEng into my website or application?"` | Primary: `getting-started.md` (`doc_docs_05`), `embedding.md` (`doc_docs_13`)<br>Acceptable: `workspaces.md` (`doc_docs_06`), `faq.md` (`doc_pub_03`), `product-overview.md` (`doc_pub_01`) | `terminal` → Primary: `/signup` (`Create Free Account`)<br>Secondary: `/docs/getting-started`<br>Action: `Restart tour` | `TOUR-STAGE-05` |

### 9.3 Server-Only Demo Authorization, Policy-Versioned Caching & 81/81 Verification Matrix
* **Non-Bypassable Server-Only Demo Boundary (`server/demo/publicHomepageDemoAuthorization.ts`)**:
  - `POST /api/chat/stream` routes any request with `embedId === 'EMB-PUBLIC-HOME'`, `demoPreset !== undefined`, or `mode === 'public_homepage_demo'` unconditionally to `handlePublicHomepageDemoChatStream`. Omitting `demoPreset` on `EMB-PUBLIC-HOME` returns `400 INVALID_DEMO_PRESET` without falling through.
  - Enforces 6-point pre-retrieval narrowing $D$ over server repositories (`ws_okeng_01`), rewrites restricted `COL-CUSTOMER` and `COL-INTERNAL` citations to `publicSafeTitle` companion guides (`citationRenderMode: 'public_companion_guide'`), and keys the demo cache by `demoPolicyVersion` + `narrowedDocumentFingerprint`.
* **5-Domain Client Controller (`src/services/homepageTourController.ts`)**:
  - Separates `AssistantDisplayState`, `TourSessionState`, `ConversationState`, `RequestLifecycleState`, and `DemoSettingsState`, enforcing request fencing `(requestId, exchangeId, tourRunId)`, single-terminal exchange lock (`terminalLock`), `pendingSettingsOpId` atomic settings updates, and separated `stageRetryTarget` vs. `followUpRetryTarget`.
* **Executed Acceptance Verification (`81/81` Passing)**:
  - `tests/readiness/homepage-tour-readiness.test.ts`: `52/52` passing (`27` baseline readiness tests + `25` adversarial tests `AT-01..AT-25`).
  - `tests/rendering/embed-authorization.test.ts`: `29/29` passing.
