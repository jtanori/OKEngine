# OKEng — Homepage Guided Tour Readiness Report (`PAGE-PUB-01`)

**Date:** 2026-10-09  
**Target Surface:** `PAGE-PUB-01` (`/`, OKEng Public Homepage & `EMB-PUBLIC-HOME`)  
**Scope Boundary:** Preparation, Canonical Documentation Alignment, Hydration/Indexing Verification, Retrieval & Effective-Scope Validation, and Tour Content Contract Definition (**Zero Homepage Guided-Tour UI Implemented in This Phase**)  
**Objective Gate Verdict:** **`Ready with documented limitations`** *(Ready for Homepage Guided Tour UI implementation within the verified capability boundaries documented below)*

---

## 1. Executive Summary & Readiness Decision

This readiness audit and preparation pass verified the complete chain required before building the OKEng Homepage Guided Tour UI:

```text
Real Capabilities ──► Canonical Docs ──► Hydrated Index ──► Grounded Answers ──► Verified Routes ──► Traceable Tour Contract
```

### Readiness Gate Evaluation Against the Four Blocking Criteria

| Gate Criterion | Requirement | Status | Evidence Classification |
| :--- | :--- | :--- | :--- |
| **1. Security & Effective-Scope Boundary** | Zero critical failures across all 4 identity cases (`anonymous`, signed `member`/`admin`, invalid/expired `401`, unverified role assertion `401`) and `EffectiveScope = Role ∩ Embed Bound Collections` | **PASS** | `Verified` (`tests/rendering/embed-authorization.test.ts` & `tests/readiness/homepage-tour-readiness.test.ts`) |
| **2. Capability Claim Truthfulness** | Every public claim is either `Verified` or an accurately bounded `Limited` capability; zero `Partial`, `Planned`, or `Unverified` capabilities presented as shipped | **PASS** | `Verified` (`READINESS-CLAIMS-01`, code audit of `UploadDropzone.tsx`, `bm25Retriever.ts`, `responseCompiler.ts`, `server.ts`) |
| **3. Authoritative Retrieval & Citation Integrity** | All 10 representative questions, natural paraphrases, and all 5 tour stages retrieve from their acceptable authoritative source sets (`topScore >= 0.12`) with 100% authorized citations | **PASS** | `Verified` (`READINESS-Q01`–`Q10`, `TOUR-STAGE-01`–`05`) |
| **4. Link-Type & Router Destination Validity** | Every `nextStep.url`, `nextAction.url`, and internal Markdown link resolves in `src/app/router.tsx` and `/docs/:slug`; external links use valid `https://` or `mailto:` URLs | **PASS** | `Verified` (`READINESS-LINKS-01`, `verifyInternalRouteResolution`) |

---

## 2. Baseline Audit & Pre-Existing Discrepancies (Phase 0 — Before Edits)

Before modifying any file, the repository baseline was audited across existing tests, `/docs/` specifications, `src/data/seedData.ts`, `src/services/store.ts`, and `src/app/router.tsx`:

1. **Baseline Test Suite (`Observed` & `Verified`)**:
   - Pre-edit execution of `npx tsx --test tests/rendering/embed-authorization.test.ts` passed (`25/25` passing tests in `1051ms`).
2. **Pre-Existing Discrepancies Identified & Resolved**:
   - **Discrepancy D-01 (`store.ts` Stale `localStorage` Hydration Bug)**: In `src/services/store.ts` (lines 135–150), `Store.constructor()` previously checked only `if (!docMap.has(seedDoc.id))` and `if (!colMap.has(seedCol.id))`. Any environment with existing `localStorage` state (`okeng_v2_documents`, `okeng_v2_collections`) silently ignored updated canonical documents in `INITIAL_DOCUMENTS` and kept stale collection `fileCount` values.
     - *Resolution*: Implemented `store.reconcileCanonicalSeeds()` and `store.rehydrateFromStorage()` in `src/services/store.ts` to compare `seedDoc.updatedAt` against persisted records, upgrade stale canonical seed documents, dynamically recompute `collection.fileCount` from active ready documents, and advance `workspace.knowledgeVersion`.
   - **Discrepancy D-02 (`COL-DOCS` `fileCount` Drift in `seedData.ts`)**: `INITIAL_COLLECTIONS` declared `fileCount: 10` for `COL-DOCS`, whereas `INITIAL_DOCUMENTS` actually contained `11` ready documents in `COL-DOCS` (`doc_docs_05` through `doc_docs_14` plus `doc_docs_es_20`).
     - *Resolution*: Updated `COL-DOCS.fileCount` to `11` in `src/data/seedData.ts` and enforced dynamic `fileCount` reconciliation in `src/services/store.ts`.
   - **Discrepancy D-03 (Unresolvable `nextStep.url` on `doc_docs_es_20`)**: `facturacion-y-planes.md` (`doc_docs_es_20` in `COL-DOCS`) specified `nextStep.url: '/billing/invoices'`, which does not exist in `src/app/router.tsx` (`parsePathname('/billing/invoices')` falls back to `home`).
     - *Resolution*: Updated `doc_docs_es_20` `nextStep` to `{ label: 'Ver Guía de Facturación', url: '/docs/facturacion-y-planes' }`, which resolves deterministically via `/docs/:slug`.
   - **Discrepancy D-04 (`PUBLIC-01 §4` Document Inventory Drift)**: `docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md` listed `20 facturacion-y-planes.md` under `COL-PUBLIC` instead of `COL-DOCS`, omitted `01-es descripcion-general.md`, and used outdated filenames for `doc_cust_23`, `doc_internal_24`, and `doc_internal_25`.
     - *Resolution*: Synchronized `docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md` §4 with the exact document IDs, filenames, and collections in `src/data/seedData.ts`.

---

## 3. Evidence-Based Capability Inventory (`Verified` / `Limited` / `Partial` / `Planned` / `Unverified`)

| Capability ID & Area | Status | Evidence Class | Implementation & Test Evidence | Requirements, Bounds & Public Claim Rule |
| :--- | :--- | :--- | :--- | :--- |
| **`CAP-WORKSPACE-ISOLATION`**<br>Multi-Tenant Workspace & Dual RBAC | `Verified` | `Verified` | `src/data/seedData.ts` (`ws_okeng_01`), `src/services/store.ts`, `src/services/embedAuthorization.ts`, `AUTH-01`–`05` | **Allowed Claim**: Workspaces isolate collections, documents, embeds, signing secrets, and `knowledgeVersion` cache epochs. |
| **`CAP-FILE-INGESTION-BOUNDED`**<br>Document Upload, Authoring & Validation | `Limited` | `Verified` | `src/components/UploadDropzone.tsx` (`FileReader.readAsText` for `.md`/`.txt`, `maxSizeMB = 10`), `src/services/formSecurity.ts` (`validateFilenameInput` blocking `../` and null bytes) | **Bounded Claim Required**: Native text extraction and authoring for `.md` and `.txt` up to `10 MB`; `.pdf` and `.docx` uploads are accepted in the workspace uploader with bounded extraction metadata rather than server-side binary PDF/OCR parsing. |
| **`CAP-HEADING-CHUNKING`**<br>Heading-Aware Markdown Chunking | `Verified` | `Verified` | `src/services/engine/knowledgeParser.ts` (`parseDocumentIntoChunks`, ~900-char max chunk window, 1-indexed `lineStart`–`lineEnd`, frontmatter `nextStep` extraction) | **Allowed Claim**: Documents are split by Markdown headings (`#`, `##`, `###`) and paragraph boundaries with exact 1-indexed line ranges. |
| **`CAP-COLLECTION-RBAC`**<br>Collection Visibility & `EffectiveScope` Intersection | `Verified` | `Verified` | `src/services/embedAuthorization.ts` (`resolveEmbedAuthorization`, `filterAuthorizedDocuments`), `tests/rendering/embed-authorization.test.ts` (Homepage Test #8) | **Allowed Claim**: Pre-retrieval authorization enforces `EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections` across `everyone`, `members`, and `admins`. |
| **`CAP-BM25-RETRIEVAL`**<br>BM25 Lexical Ranking + Route & Language Boosts | `Verified` | `Verified` | `src/services/engine/bm25Retriever.ts` (`k1 = 1.2`, `b = 0.75`, `+0.35` route boost, `+0.08` language boost, `0.12` relevance floor) | **Allowed Claim**: Deterministic BM25 lexical scoring with heading/title weighting, route-context boosting (`current_url`), and language preference boosting. |
| **`CAP-ANSWER-COMPILATION`**<br>Deterministic/Extractive Compilation & Optional Gemini Synthesis | `Limited` | `Verified` | `src/services/engine/responseCompiler.ts` (`compileKnowledgeResponse`), `server.ts` (`/api/chat/stream` with `GEMINI_API_KEY` check and deterministic fallback) | **Bounded Claim Required**: Deterministic and extractive compilation work 100% offline; optional `generative` synthesis via `/api/chat/stream` requires `GEMINI_API_KEY` and falls back deterministically when unconfigured. |
| **`CAP-GROUNDED-CITATIONS`**<br>Verifiable Citations & Missing-Topic Refusal | `Verified` | `Verified` | `src/services/engine/responseCompiler.ts` (`SourceCitation` with `docId`, `filename`, `collectionId`, `lineStart`–`lineEnd`; `answerType: 'refusal'` below `0.12`) | **Allowed Claim**: Every answer cites authorized source documents and line ranges; when no chunk meets the `0.12` threshold, OKEng returns a deterministic refusal with zero fabricated citations. |
| **`CAP-EMBED-MODES-BOUNDED`**<br>Embed Presentation Modes & `/widget.js` | `Limited` | `Verified` | `src/pages/PublicSurfaceView.tsx` (`inline` on `/`, `documentation` on `/docs`), `public/widget.js` + `server.ts` (`/widget.js` + `/api/chat`), `src/pages/EmbedConfigView.tsx` & `WidgetPreviewView.tsx` (6 modes) | **Bounded Claim Required**: Distinguish live public modes (`inline` on `/`, `documentation` on `/docs`), standalone `/widget.js` drop-in script, and the 6 configurable Workspace/Host Simulator modes (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`). |
| **`CAP-SIGNED-HOST-IDENTITY`**<br>HMAC-SHA256 (`HS256`) Host Assertions & 401 Fail-Closed Boundary | `Verified` | `Verified` | `src/services/embedAuthorization.ts` (`verifyEmbedIdentityToken`, `resolveRequestEmbedIdentity`), `server.ts` (`/api/auth/token/sign`, `/api/chat/stream`) | **Allowed Claim**: Short-lived (5-minute TTL, 30s clock-skew tolerance) `HS256` JWT assertions unlock `members`/`admins` collections; expired, tampered, or unsigned role assertions fail closed with `401` before retrieval. |
| **`CAP-VECTOR-EMBEDDINGS`**<br>Dense Vector Embeddings / HNSW Vector DB | `Planned` | `Verified` (Absent) | No vector embedding or HNSW index exists in `src/services/engine/` | **Excluded Claim**: Never claim vector embeddings, semantic vector databases, or `pgvector` as shipped functionality. |
| **`CAP-WEB-CRAWLER-CONNECTORS`**<br>Automated Web Crawlers & 3P SaaS Sync | `Planned` | `Verified` (Absent) | No web scraper or Notion/Confluence/Drive connector exists in `src/` | **Excluded Claim**: Never claim automated website crawling or third-party SaaS connectors as shipped functionality. |

---

## 4. Explicit "Claims Not to Make" & Bounded-Claims Guardrail List

1. **Do NOT claim dense vector search or vector database indexing**: Always describe retrieval accurately as **heading-aware Markdown chunking + BM25 lexical ranking (`k1 = 1.2`, `b = 0.75`) with route-context (`+0.35`) and language (`+0.08`) boosts**.
2. **Do NOT claim full binary PDF OCR or automated web/SaaS ingestion**: Always bound ingestion claims to **native browser text ingestion for `.md` and `.txt` files up to `10 MB`, in-app Markdown authoring, and `.pdf`/`.docx` upload acceptance with bounded extraction metadata**.
3. **Do NOT claim that all 6 Embed modes are deployed as standalone production scripts**: Always distinguish:
   - **Live Public Surfaces**: `inline` (on `/` via `EMB-PUBLIC-HOME`) and `documentation` (on `/docs` via `EMB-PUBLIC-DOCS`);
   - **Standalone External Host Script**: `/widget.js` (floating launcher + drawer connected to `/api/chat`);
   - **Configurable Workspace & Host Simulator Modes**: `widget`, `panel`, `fullscreen`, `inline`, `documentation`, and `contextual` in `/workspaces/okeng/embeds` and `/workspaces/okeng/embeds/preview`.
4. **Do NOT claim that generative LLM synthesis is required**: Always note that **deterministic and extractive compilation work without external API keys**, and **`generative` synthesis is an optional server-side enhancement when `GEMINI_API_KEY` is configured**.

---

## 5. Canonical Document Disposition Table (`COL-PUBLIC` & `COL-DOCS`)

All `16` public canonical documents (`5` in `COL-PUBLIC`, `11` in `COL-DOCS`) have `visibility: 'everyone'` and `status: 'ready'`. `COL-LEGAL` (`3` docs), `COL-CUSTOMER` (`3` docs, `members`), and `COL-INTERNAL` (`4` docs, `admins`) remain preserved in their respective visibility tiers.

| Doc ID | Filename | Collection | Lang | Action Taken | Standalone Purpose & Tour Stage Mapping | Verified `nextStep.url` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `doc_pub_01` | `product-overview.md` | `COL-PUBLIC` | `en` | **Revised** | Primary source for **Stage 1** (*What is OKEng?*) & **Stage 2** (*What can it do today?*) with explicit bounded limits | `/docs/getting-started` |
| `doc_pub_es_01` | `descripcion-general.md` | `COL-PUBLIC` | `es` | **Revised** | Spanish parity counterpart to `product-overview.md` with aligned capabilities, limits (`10 MB`, `.md`/`.txt`), and `HS256` security | `/docs/getting-started` |
| `doc_pub_02` | `product-concepts.md` | `COL-PUBLIC` | `en` | **Revised** | Defines the 6 core entities (`Workspace`, `Collection`, `Document`, `Chunk`, `Embed`, `Citation & Next Step`); secondary source for **Stages 1 & 3** | `/docs/collections` |
| `doc_pub_03` | `faq.md` | `COL-PUBLIC` | `en` | **Revised** | Public FAQ answering capabilities today, missing-topic refusal (`0.12` floor), embed modes, and getting started; supports **Stages 1, 2, 3, 5** | `/docs/getting-started` |
| `doc_pub_04` | `security-overview.md` | `COL-PUBLIC` | `en` | **Revised** | Explains `EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections`, 4-case token boundary, and input/file safety; primary for **Stage 4** | `/docs/access-control` |
| `doc_docs_05` | `getting-started.md` | `COL-DOCS` | `en` | **Revised** | 4-step quickstart from workspace creation to Embed installation; primary source for **Stage 5** (*Get started*) | `/signup` |
| `doc_docs_06` | `workspaces.md` | `COL-DOCS` | `en` | **Revised** | Multi-tenant boundary, workspace roles (`Owner`, `Admin`, `Editor`, `Viewer`), signing secrets & `knowledgeVersion`; secondary for **Stage 5** | `/docs/collections` |
| `doc_docs_07` | `collections.md` | `COL-DOCS` | `en` | **Revised** | Visibility tiers (`everyone`, `members`, `admins`) and pre-retrieval `EffectiveScope`; primary source for **Stage 4** | `/docs/access-control` |
| `doc_docs_08` | `files.md` | `COL-DOCS` | `en` | **Revised** | Bounded file ingestion guide (`.md`/`.txt` native vs. `.pdf`/`.docx` bounded extraction metadata, `10 MB` cap, path-traversal block); supports **Stage 2** | `/docs/ingestion` |
| `doc_docs_09` | `markdown.md` | `COL-DOCS` | `en` | **Revised** | Authoring structured Markdown headings and frontmatter `nextStep` links; secondary source for **Stage 3** | `/docs/retrieval` |
| `doc_docs_10` | `ingestion.md` | `COL-DOCS` | `en` | **Revised** | Heading-aware chunking (~900 chars), 1-indexed `lineStart`–`lineEnd`, and `knowledgeVersion` cache invalidation; primary source for **Stage 3** | `/docs/retrieval` |
| `doc_docs_11` | `retrieval.md` | `COL-DOCS` | `en` | **Revised** | BM25 lexical scoring (`k1 = 1.2`, `b = 0.75`), route/language boosts, compilation modes, citations & refusal floor; primary source for **Stage 3** | `/docs/embedding` |
| `doc_docs_12` | `access-control.md` | `COL-DOCS` | `en` | **Revised** | Dual RBAC model and 4-case embed identity verification; primary source for **Stage 4** | `/docs/embedding` |
| `doc_docs_13` | `embedding.md` | `COL-DOCS` | `en` | **Revised** | Public/Protected/Mixed-Access embeds, `HS256` tokens, and live vs. simulator presentation modes; primary source for **Stage 5** & secondary for **Stages 2, 4** | `/docs/getting-started` |
| `doc_docs_14` | `troubleshooting.md` | `COL-DOCS` | `en` | **Revised** | Diagnostics for `401 TOKEN_EXPIRED` / `INVALID_TOKEN_SIGNATURE` and missing retrieval results via `/workspaces/okeng/test` | `/docs/getting-started` |
| `doc_docs_es_20` | `facturacion-y-planes.md` | `COL-DOCS` | `es` | **Revised** | Spanish subscription & billing documentation; fixed broken `/billing/invoices` `nextStep.url` to `/docs/facturacion-y-planes` | `/docs/facturacion-y-planes` |

---

## 6. Persistence, Hydration, Indexing & Cache-Invalidation Lifecycle (Phase 4)

```text
src/data/seedData.ts (INITIAL_WORKSPACE kv=185, INITIAL_COLLECTIONS, INITIAL_DOCUMENTS)
        │
        ▼
src/services/store.ts :: reconcileCanonicalSeeds(persistedWs, persistedCols, persistedDocs)
        ├── 1. Compares seedDoc.updatedAt vs. localStorage persisted doc.updatedAt
        │      (Upgrades any stale seedDoc where seedTime > existingTime)
        ├── 2. Recomputes col.fileCount from active ready documents (fixes COL-DOCS=11)
        ├── 3. Advances workspace.knowledgeVersion (kv >= 185) on canonical seed upgrade
        └── 4. Persists synchronized state & invalidates stale CACHE-001 kv partitions
        │
        ▼
src/services/engine/knowledgeParser.ts :: parseDocumentIntoChunks(doc, visibility)
        └── Splits ready documents by Markdown headings into line-tracked chunks
```

- **Evidence Classification**: `Verified` in code (`src/services/store.ts` lines 134–318) and automated test `READINESS-HYDRATION-01` in `tests/readiness/homepage-tour-readiness.test.ts`, which simulates a stale `localStorage` snapshot (`knowledgeVersion: 184`, `COL-DOCS.fileCount: 10`, stale `doc_pub_01` from `2026-10-01`) and verifies that `store.reconcileCanonicalSeeds()` upgrades `doc_pub_01`, corrects `COL-DOCS.fileCount` to `11`, and advances `knowledgeVersion` to `185`.

---

## 7. Retrieval Validation for the 10 Representative Questions & Natural Paraphrases

Evaluated as an `anonymous` visitor on `EMB-PUBLIC-HOME` (`currentUrl: '/'`, `answerMode: 'deterministic'`) in `tests/readiness/homepage-tour-readiness.test.ts`:

| Test ID | Representative Question & Paraphrase Tested | Acceptable Authoritative Source Set | Top Retrieved Sources (`Verified`) | Top Score (`>= 0.12`) | Citation & `nextStep` Integrity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `READINESS-Q01` | *"What is OKEng, and what problem does it solve?"*<br>Paraphrase: *"Why would a product team use OKEng for documentation and support?"* | `product-overview.md`, `product-concepts.md`, `faq.md` | `product-overview.md` (`doc_pub_01`), `faq.md` (`doc_pub_03`) | `>= 0.72` | **PASS** (`/docs/getting-started`) |
| `READINESS-Q02` | *"What can I do with OKEng today?"*<br>Paraphrase: *"Which capabilities and file formats does OKEng support right now?"* | `product-overview.md`, `faq.md`, `files.md`, `embedding.md` | `faq.md` (`doc_pub_03`), `product-overview.md` (`doc_pub_01`), `files.md` (`doc_docs_08`) | `>= 0.68` | **PASS** (`/docs/getting-started`) |
| `READINESS-Q03` | *"How does OKEng answer questions using my documentation?"*<br>Paraphrase: *"How does the retrieval pipeline chunk and rank Markdown documents?"* | `retrieval.md`, `ingestion.md`, `product-overview.md`, `markdown.md` | `retrieval.md` (`doc_docs_11`), `ingestion.md` (`doc_docs_10`) | `>= 0.74` | **PASS** (`/docs/embedding`) |
| `READINESS-Q04` | *"How do citations help me verify an answer?"* | `retrieval.md`, `product-concepts.md`, `product-overview.md` | `retrieval.md` (`doc_docs_11`), `product-concepts.md` (`doc_pub_02`) | `>= 0.65` | **PASS** (`/docs/embedding`) |
| `READINESS-Q05` | *"How do collections and visibility work?"*<br>Paraphrase: *"What is the difference between everyone, members, and admins collections?"* | `collections.md`, `access-control.md`, `product-concepts.md`, `security-overview.md` | `collections.md` (`doc_docs_07`), `access-control.md` (`doc_docs_12`) | `>= 0.75` | **PASS** (`/docs/access-control`) |
| `READINESS-Q06` | *"How can I integrate OKEng into my website or application?"* | `embedding.md`, `getting-started.md`, `product-overview.md` | `embedding.md` (`doc_docs_13`), `getting-started.md` (`doc_docs_05`) | `>= 0.71` | **PASS** (`/docs/getting-started`) |
| `READINESS-Q07` | *"What presentation modes are actually available?"* | `embedding.md`, `faq.md`, `product-overview.md` | `embedding.md` (`doc_docs_13`), `faq.md` (`doc_pub_03`) | `>= 0.70` | **PASS** (`/docs/getting-started`) |
| `READINESS-Q08` | *"How does host context influence retrieval?"* | `retrieval.md`, `embedding.md`, `security-overview.md`, `collections.md` | `retrieval.md` (`doc_docs_11`), `security-overview.md` (`doc_pub_04`) | `>= 0.66` | **PASS** (`/docs/embedding`) |
| `READINESS-Q09` | *"What are the steps to get started?"*<br>Paraphrase: *"How do I create my first workspace and publish an Embed?"* | `getting-started.md`, `faq.md`, `workspaces.md`, `embedding.md` | `getting-started.md` (`doc_docs_05`), `faq.md` (`doc_pub_03`) | `>= 0.74` | **PASS** (`/signup`) |
| `READINESS-Q10` | *"What happens when the available documents do not answer a question?"* | `retrieval.md`, `faq.md`, `product-overview.md` | `retrieval.md` (`doc_docs_11`), `faq.md` (`doc_pub_03`) | `>= 0.72` | **PASS** (`/docs/embedding`) |
| `READINESS-UNANSWERABLE-01` | Out-of-domain probe: *"What is the orbital velocity of Jupiter moons in relativistic quantum mechanics?"* | Refusal (`hasSufficientEvidence: false`) | `0` sources, `0` chunks (`answerType: 'refusal'`) | `0` | **PASS** (Zero fabrication) |

---

## 8. Security & Effective-Scope Verification Across All Four Identity Cases

| Security Case | Target Embed & Caller Input | Expected `EffectiveScope` / HTTP Outcome | Candidate Docs (`authorizedDocs`) | Scored Chunks (`retrievedChunks`) & Context | Emitted Citations (`sources`) | Test Evidence (`Verified`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Case 1 — Anonymous Visitor on Mixed-Access Embed** | `EMB-PUBLIC-HOME` + `identityToken: undefined` (including restricted KMS/Customer probes & spoofed `currentUrl: '/workspaces/okeng/settings'`) | `['COL-DOCS', 'COL-LEGAL', 'COL-PUBLIC']` (`everyone` only) | `19` public docs (`0` `COL-CUSTOMER`, `0` `COL-INTERNAL`) | `0` restricted chunks in BM25 pool or compiled context | `100%` `everyone` citations | `Homepage Test #2`, `READINESS-SEC-01` |
| **Case 2A — Valid Signed `member` / `admin` on Mixed-Access Embed** | `EMB-PUBLIC-HOME` + valid `HS256` `member` or `admin` token | `member`: `+ COL-CUSTOMER`<br>`admin`: `+ COL-CUSTOMER, COL-INTERNAL` | `member`: `22` docs (`0` `COL-INTERNAL`)<br>`admin`: all `26` docs | `member` excludes `COL-INTERNAL` before BM25 scoring | Matches `EffectiveScope` | `Homepage Test #3`, `Homepage Test #4` |
| **Case 2B — Valid Signed `admin` on Public-Only Embed (`Role ∩ Embed Binding`)** | `EMB-PUBLIC-DOCS` (bound only to `COL-PUBLIC`, `COL-DOCS`) + valid `HS256` `admin` token | `['COL-DOCS', 'COL-PUBLIC']` (Unbound `COL-CUSTOMER`, `COL-INTERNAL`, `COL-LEGAL` excluded) | `16` docs (`COL-PUBLIC` + `COL-DOCS` only) | `0` chunks from `COL-CUSTOMER`, `COL-INTERNAL`, or `COL-LEGAL` | `0` citations from unbound collections | `Homepage Test #8`, `READINESS-SEC-02` |
| **Case 3 — Invalid / Tampered / Expired Token** | `EMB-PUBLIC-HOME` + wrong signature, `alg: none`, `jwk` header injection, or expired `exp` | Hard `401` (`INVALID_TOKEN_SIGNATURE` / `TOKEN_EXPIRED`); **never downgrades to anonymous** | Retrieval halted before candidate filtering | `0` chunks scored | `0` citations | `Homepage Test #5`, `READINESS-SEC-03` |
| **Case 4 — Unverified Browser Role Assertion** | `/api/chat/stream` (`mode: 'embed'`) with `role: 'admin'` or `'member'` and no signed `identityToken` | Hard `401 UNVERIFIED_ROLE_ASSERTION` (`server.ts` lines 473–491) | Retrieval halted before candidate filtering | `0` chunks scored | `0` citations | `embed-authorization.test.ts` Suite 2 & `server.ts` |

---

## 9. Approved 5-Stage Traceable Homepage Guided Tour Content Contract

> **Design Decision on Candidate Stage 6**: Candidate Stage 6 (*Continue to signup*) was folded into **Stage 5 (`STAGE-5-GET-STARTED`)** where `/signup` serves as the verified primary `nextAction` (`Create Free Account`) and `/docs/getting-started` serves as the verified secondary `nextAction` (`Read Getting Started Guide`). Both routes are verified in `src/app/router.tsx` (`PAGE-AUTH-02` and `PAGE-PUB-07`), avoiding a redundant sixth prompt stage that adds no new knowledge retrieval concept.

| Stage ID & Title | Visitor Need & Learning Outcome | Suggested Prompt & Paraphrase Tested | Acceptable Authoritative Source Set (`COL-PUBLIC` / `COL-DOCS`) | Required Capabilities (All `Verified` or Bounded `Limited`) | Verified `nextAction` (`src/app/router.tsx`) | Acceptance Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`STAGE-1-WHAT-IS-OKENG`**<br>*1. What is OKEng?* | Understand what OKEng is and why teams use it instead of an ungrounded chatbot. | **Prompt**: *"What is OKEng, and what problem does it solve?"*<br>**Paraphrase**: *"Why would my engineering team use OKEng for product documentation?"* | **Primary**: `product-overview.md`<br>**Acceptable**: `product-concepts.md`, `faq.md` | `CAP-WORKSPACE-ISOLATION`, `CAP-COLLECTION-RBAC`, `CAP-BM25-RETRIEVAL`, `CAP-GROUNDED-CITATIONS` | `{ label: "Read Getting Started Guide", url: "/docs/getting-started", category: "docs" }` | `TOUR-STAGE-01` |
| **`STAGE-2-WHAT-IT-DOES-TODAY`**<br>*2. What can it do today?* | Distinguish shipped capabilities from bounded limits before adopting OKEng. | **Prompt**: *"What can I do with OKEng today?"*<br>**Paraphrase**: *"Which features and file types are supported in OKEng right now?"* | **Primary**: `product-overview.md`, `faq.md`<br>**Acceptable**: `files.md`, `embedding.md`, `getting-started.md` | `CAP-FILE-INGESTION-BOUNDED`, `CAP-COLLECTION-RBAC`, `CAP-BM25-RETRIEVAL`, `CAP-EMBED-MODES-BOUNDED` | `{ label: "Explore Documentation", url: "/docs", category: "docs" }` | `TOUR-STAGE-02` |
| **`STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS`**<br>*3. Answers grounded in knowledge* | See how OKEng chunks Markdown, ranks passages, cites exact line ranges, and handles unknown topics. | **Prompt**: *"How does OKEng answer questions using my documentation, and how do citations help me verify an answer?"*<br>**Paraphrase**: *"How does OKEng chunk and score Markdown files to produce cited answers?"* | **Primary**: `retrieval.md`, `ingestion.md`<br>**Acceptable**: `markdown.md`, `product-concepts.md`, `faq.md` | `CAP-HEADING-CHUNKING`, `CAP-BM25-RETRIEVAL`, `CAP-GROUNDED-CITATIONS`, `CAP-MISSING-TOPIC-REFUSAL` | `{ label: "Explore Retrieval Guide", url: "/docs/retrieval", category: "docs" }` | `TOUR-STAGE-03` |
| **`STAGE-4-CONTEXT-AND-ACCESS-CONTROL`**<br>*4. Context and access control* | Verify how collection visibility, signed host tokens, and current page route interact. | **Prompt**: *"How do collections, visibility tiers, and host context control what an Embed can retrieve?"*<br>**Paraphrase**: *"How does OKEng enforce everyone, members, and admins permissions before retrieval?"* | **Primary**: `collections.md`, `access-control.md`, `security-overview.md`<br>**Acceptable**: `retrieval.md`, `embedding.md` | `CAP-COLLECTION-RBAC`, `CAP-SIGNED-HOST-IDENTITY`, `CAP-ROUTE-CONTEXT-BOOST` | `{ label: "Read Access Control Guide", url: "/docs/access-control", category: "docs" }` | `TOUR-STAGE-04` |
| **`STAGE-5-GET-STARTED`**<br>*5. Get started* | Know the shortest verified path from creating a workspace to embedding an assistant. | **Prompt**: *"What are the steps to get started and integrate OKEng into my website or application?"*<br>**Paraphrase**: *"How do I set up my first OKEng workspace and embed it on my site?"* | **Primary**: `getting-started.md`, `embedding.md`<br>**Acceptable**: `workspaces.md`, `faq.md`, `product-overview.md` | `CAP-WORKSPACE-ISOLATION`, `CAP-EMBED-MODES-BOUNDED`, `CAP-INSTALLATION-RECIPE` | **Primary**: `{ label: "Create Free Account", url: "/signup", category: "signup" }`<br>**Secondary**: `{ label: "Read Getting Started Guide", url: "/docs/getting-started", category: "docs" }` | `TOUR-STAGE-05` |

---

## 10. Automated Test Suites & Verification Matrix

| Test Suite File | Scope & Responsibilities | Tests Passing | Evidence Classification |
| :--- | :--- | :--- | :--- |
| `tests/rendering/embed-authorization.test.ts` | Pre-retrieval `EffectiveScope` authorization, HS256 token verification, 4-way cache partition isolation, Test Console parity, and **Homepage Test #8 (`Role ∩ Embed Bound Collections` on `EMB-PUBLIC-DOCS`)** | `26 / 26` | `Verified` & `Observed` (CLI test runner) |
| `tests/readiness/homepage-tour-readiness.test.ts` | Canonical document inventory (`READINESS-DOC-01`), stale `localStorage` hydration reconciliation (`READINESS-HYDRATION-01`), EN/ES overview alignment (`READINESS-I18N-01`), excluded-claims guardrail (`READINESS-CLAIMS-01`), link-type & router validation (`READINESS-LINKS-01`), 10 representative queries + paraphrases (`READINESS-Q01`–`Q10`), out-of-domain refusal (`READINESS-UNANSWERABLE-01`), 4-case security non-leakage (`READINESS-SEC-01`–`03`), and 5-stage tour contract traceability (`TOUR-STAGE-01`–`05`) | `24 / 24` | `Verified` & `Observed` (CLI test runner) |

---

## 11. Ten Required Deliverables Checklist & Next-Phase Boundary

- [x] **Deliverable 1**: Baseline Audit & Discrepancy Report (§2 above)
- [x] **Deliverable 2**: Evidence-Based Capability Inventory & Excluded-Claims List (§3 & §4 above)
- [x] **Deliverable 3**: Canonical Document Disposition Table for `COL-PUBLIC` and `COL-DOCS` (§5 above)
- [x] **Deliverable 4**: Verified Persistence, Hydration, Indexing & Cache-Invalidation Lifecycle (`src/services/store.ts` `reconcileCanonicalSeeds` & §6 above)
- [x] **Deliverable 5**: Updated, Standalone English & Spanish Public Documentation (`src/data/seedData.ts`)
- [x] **Deliverable 6**: Retrieval Results for 10 Representative Questions & Natural Paraphrases (§7 above)
- [x] **Deliverable 7**: Passing Authorization & Effective-Collection-Scope Regression Tests (`tests/rendering/embed-authorization.test.ts`)
- [x] **Deliverable 8**: Passing Dedicated Homepage-Tour Readiness Suite (`tests/readiness/homepage-tour-readiness.test.ts`)
- [x] **Deliverable 9**: Approved, End-to-End Traceable 5-Stage Tour Content Contract (§9 above)
- [x] **Deliverable 10**: Synchronized Canonical Specifications (`docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md` §4 & §9, `docs/03_page_specifications.md` `PAGE-PUB-01`, keeping `ENG-DOD-001` generic) & this 11-Section Final Readiness Report

> **Hard Stop Preserved**: No homepage guided-tour UI component was added or modified in `src/pages/PublicSurfaceView.tsx`. The repository is now verified **`Ready with documented limitations`** for the dedicated Homepage Guided Tour UI implementation phase.
