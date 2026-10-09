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

### Homepage Mixed-Access Dogfooding & Host Environment Bar (`PAGE-PUB-01` & `PUBLIC-02`)
* **Single Live Mixed-Access Embed (`EMB-PUBLIC-HOME`)**: Powers the `/` homepage Hero and binds `['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL', 'COL-CUSTOMER', 'COL-INTERNAL']` with `useCurrentPage: true`, `useHostUserContext: true`, and deterministic `routeRules` for `/`, `/docs/embedding`, and `/docs/access-control`.
* **External Host Environment Bar (`Identity` & `Context`)**: Directly below the Hero Embed, the homepage provides host-supplied controls (`Identity: [ Visitor ] [ Member ] [ Admin ]` and `Context: [ Homepage · Product overview ] [ OKEng / Embeds ] [ OKEng / Access control ]`).
* **Strict Pre-Retrieval Security Boundary (`Identity → Authorization → Effective Collection Scope → Retrieval → Answer/Citations/CTA`)**:
  - When `Visitor` (`anonymous`) is active, no token is sent and `resolveEmbedAuthorization` restricts retrieval strictly to `everyone` collections (`Public Docs ✓ · Legal ✓ · Customer Docs ✗ · Admin Docs ✗`).
  - When `Member` or `Admin` is selected, the host page requests a real short-lived HMAC-SHA256 assertion from `/api/auth/token/sign` (`role: 'member' | 'admin'`, `workspace_id: 'ws_okeng_01'`, `embed_id: 'EMB-PUBLIC-HOME'`) and passes it via `Bearer` token to `/api/chat/stream` (`mode: 'embed'`).
  - Both server-side retrieval and the displayed `✓/✗` collection matrix derive exclusively from `resolveEmbedAuthorization(resolvedIdentity, embedCollectionIds, collections)`.

---

# 4. Canonical Source Documents (`PUBLIC-01 §8 & §46`)

All public product explanations, documentation articles, legal policies, and customer/admin showcase guides are backed by canonical Markdown documents inside the `OKEng` workspace (`ws_okeng_01`):

### Public Product Knowledge (`COL-PUBLIC` — `visibility = everyone`, 5 documents)
* `01 product-overview.md` (`doc_pub_01`, English — What is OKEng, core architecture, capabilities & limits, `nextStep: /docs/getting-started`)
* `01-es descripcion-general.md` (`doc_pub_es_01`, Spanish — Qué es OKEng, capacidades actuales y límites verificados, `nextStep: /docs/getting-started`)
* `02 product-concepts.md` (`doc_pub_02`, Core entities: Workspaces, Collections, Documents, Chunks, Embeds, Citations & Next Steps, `nextStep: /docs/collections`)
* `03 faq.md` (`doc_pub_03`, Public FAQ: capabilities today, missing-topic refusal, presentation modes, getting started, `nextStep: /docs/getting-started`)
* `04 security-overview.md` (`doc_pub_04`, Pre-retrieval `EffectiveScope` intersection, 4-case token boundary, input/file safety, `nextStep: /docs/access-control`)

### Documentation (`COL-DOCS` — `visibility = everyone`, 11 documents)
* `05 getting-started.md` (`doc_docs_05`, 4-step quickstart from workspace creation to Embed installation, `nextStep: /signup`)
* `06 workspaces.md` (`doc_docs_06`, Multi-tenant isolation, roles, signing secrets & `knowledgeVersion`, `nextStep: /docs/collections`)
* `07 collections.md` (`doc_docs_07`, Visibility tiers `everyone` / `members` / `admins` & `EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections`, `nextStep: /docs/access-control`)
* `08 files.md` (`doc_docs_08`, Native `.md`/`.txt` ingestion vs. bounded `.pdf`/`.docx` extraction metadata, 10 MB limit & filename safety, `nextStep: /docs/ingestion`)
* `09 markdown.md` (`doc_docs_09`, Heading-aware authoring & `nextStep` frontmatter contract, `nextStep: /docs/retrieval`)
* `10 ingestion.md` (`doc_docs_10`, Heading-aware chunking up to ~900 chars, line-range tracking & `knowledgeVersion` cache invalidation, `nextStep: /docs/retrieval`)
* `11 retrieval.md` (`doc_docs_11`, BM25 lexical ranking, route/language boosts, compilation modes, citations & missing-topic honesty, `nextStep: /docs/embedding`)
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
  - **Everyone (`anonymous` & `authenticated`)**: Can browse Product Guides (`COL-DOCS`), Public Product Knowledge (`COL-PUBLIC`), and Legal & Trust Policies (`COL-LEGAL`).
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

# 9. Homepage Guided Tour Readiness Contract & Verified Capability Boundary (`PAGE-PUB-01`)

> **Scope Boundary (Preparation & Readiness Gate Only)**: This section defines the verified capability claims, acceptable authoritative source sets, and the 5-stage Homepage Guided Tour content contract verified by `tests/readiness/homepage-tour-readiness.test.ts`. No guided-tour UI component is implemented in this readiness phase.

### 9.1 Verified & Bounded `Limited` Capability Rules for Public Claims
Every public claim in `COL-PUBLIC`, `COL-DOCS`, and the homepage tour contract MUST adhere to the verified implementation boundary:
* **File Ingestion (`Limited` — Bounded Claim Required)**: Browser `FileReader.readAsText()` natively ingests `.md` and `.txt` files up to `10 MB`; `.pdf` and `.docx` uploads are accepted in the workspace uploader (`UploadDropzone.tsx`) with bounded extraction metadata rather than a server-side binary OCR/PDF parser.
* **Retrieval Engine (`Verified` + Bounded `Limited` Generative Mode)**: Heading-aware Markdown chunking (`knowledgeParser.ts`, up to ~900 chars with 1-indexed `lineStart`–`lineEnd`), custom BM25 lexical scoring (`k1 = 1.2`, `b = 0.75`) with route-context (`+0.35`) and language (`+0.08`) boosts, and deterministic/extractive compilation (`responseCompiler.ts`) are `Verified` offline; optional Gemini `generative` synthesis via `/api/chat/stream` is a bounded `Limited` capability requiring `GEMINI_API_KEY` and falling back deterministically when unconfigured.
* **Embed Presentation Modes (`Verified` Live vs. Bounded `Limited` Simulator Modes)**: `inline` (homepage `EMB-PUBLIC-HOME`) and `documentation` (`/docs` `EMB-PUBLIC-DOCS`) are live on public surfaces; `/widget.js` provides a standalone drop-in floating launcher and drawer for external host pages; all six modes (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`) are configurable in the Workspace Embed Studio (`/workspaces/okeng/embeds`) and previewable in the Host Simulator (`/workspaces/okeng/embeds/preview`).
* **Excluded Claims (`Partial` / `Planned` / `Unverified` — Never Presented as Shipped)**: Dense vector embeddings / HNSW vector databases, automated web crawlers or 3P SaaS sync connectors (Notion/Confluence/Google Drive), binary PDF OCR, and automated public domain CORS enforcement are not implemented and MUST NOT be claimed as shipped functionality.

### 9.2 Approved 5-Stage Traceable Homepage Guided Tour Contract

*(Note: Candidate Stage 6 — Continue to Signup — is folded into Stage 5 as a verified secondary action `/signup` alongside the primary `/docs/getting-started` guide so every stage teaches a distinct, grounded capability concept.)*

| Stage ID | Title | Suggested Prompt | Acceptable Authoritative Source Set (`COL-PUBLIC` / `COL-DOCS`) | Primary `nextAction` (Router-Verified) | Mapped Acceptance Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `STAGE-1-WHAT-IS-OKENG` | **1. What is OKEng?** | `"What is OKEng, and what problem does it solve?"` | Primary: `product-overview.md` (`doc_pub_01`)<br>Acceptable: `product-concepts.md` (`doc_pub_02`), `faq.md` (`doc_pub_03`) | `{ label: "Read Getting Started Guide", url: "/docs/getting-started", category: "docs" }` | `TOUR-STAGE-01` |
| `STAGE-2-WHAT-IT-DOES-TODAY` | **2. What can it do today?** | `"What can I do with OKEng today?"` | Primary: `product-overview.md` (`doc_pub_01`), `faq.md` (`doc_pub_03`)<br>Acceptable: `files.md` (`doc_docs_08`), `embedding.md` (`doc_docs_13`) | `{ label: "Explore Documentation", url: "/docs", category: "docs" }` | `TOUR-STAGE-02` |
| `STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS` | **3. Answers grounded in knowledge** | `"How does OKEng answer questions using my documentation, and how do citations help me verify an answer?"` | Primary: `retrieval.md` (`doc_docs_11`), `ingestion.md` (`doc_docs_10`)<br>Acceptable: `markdown.md` (`doc_docs_09`), `product-concepts.md` (`doc_pub_02`), `faq.md` (`doc_pub_03`) | `{ label: "Explore Retrieval Guide", url: "/docs/retrieval", category: "docs" }` | `TOUR-STAGE-03` |
| `STAGE-4-CONTEXT-AND-ACCESS-CONTROL` | **4. Context and access control** | `"How do collections, visibility tiers, and host context control what an Embed can retrieve?"` | Primary: `collections.md` (`doc_docs_07`), `access-control.md` (`doc_docs_12`), `security-overview.md` (`doc_pub_04`)<br>Acceptable: `retrieval.md` (`doc_docs_11`), `embedding.md` (`doc_docs_13`) | `{ label: "Read Access Control Guide", url: "/docs/access-control", category: "docs" }` | `TOUR-STAGE-04` |
| `STAGE-5-GET-STARTED` | **5. Get started** | `"What are the steps to get started and integrate OKEng into my website or application?"` | Primary: `getting-started.md` (`doc_docs_05`), `embedding.md` (`doc_docs_13`)<br>Acceptable: `workspaces.md` (`doc_docs_06`), `faq.md` (`doc_pub_03`) | Primary: `{ label: "Create Free Account", url: "/signup", category: "signup" }`<br>Secondary: `{ label: "Read Getting Started Guide", url: "/docs/getting-started", category: "docs" }` | `TOUR-STAGE-05` |




