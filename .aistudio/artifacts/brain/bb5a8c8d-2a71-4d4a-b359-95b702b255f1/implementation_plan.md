# OKEng Homepage Guided Tour — Readiness Closure Pass (`PAGE-PUB-01`)

This closure pass resolves the four review findings with executable verification, actual measured retrieval outputs across all 30 query variants, isolated runtime evidence separated from unit tests, and a reproducible `git` change-set and `/docs` synchronization audit. Work remains strictly limited to readiness closure—no guided-tour UI, no homepage redesign, and no changes to the embedded assistant's presentation.

## User Review & Critical Refinements Incorporated

> [!IMPORTANT]
> **Hard-Stop & Verdict Discipline**: This pass authorizes zero UI implementation. The final readiness report will issue `Ready for guided-tour UI implementation` **only** if all seven mandatory closure gates below have direct supporting evidence; otherwise it will retain `Not ready` and name the exact blocker.

- **Refinement 1 — Executable Capability Traceability from One Authoritative Source**:
  - Define a single authoritative capability inventory (`CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY`) including `CAP-MISSING-TOPIC-REFUSAL`, `CAP-ROUTE-CONTEXT-BOOST`, and `CAP-INSTALLATION-RECIPE`.
  - Add an executable readiness test that extracts every `stage.requiredCapabilities` ID from `APPROVED_HOMEPAGE_TOUR_CONTRACT`, asserts each resolves to **exactly one** canonical inventory entry with a permitted public status (`Verified` or bounded `Limited`), non-empty implementation evidence, explicit bounds, and acceptance-test references, and validates the published Markdown table in `docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md` against that single source of truth.
- **Refinement 2 — Actual Measured Retrieval Output & Code-Verified Engine Semantics**:
  - Correct earlier report prose where engine constants were misstated against the actual code in `bm25Retriever.ts`, `responseCompiler.ts`, and `UploadDropzone.tsx`:
    - **Actual Refusal / Relevance Threshold**: `rawScore >= 1.35` in `bm25Retriever.ts` and `normalizedConfidence >= 0.25` in `responseCompiler.ts` (`ranked.filter(r => r.normalizedConfidence >= 0.25 && r.score > 0).slice(0, 3)`), returning `answerType: 'unknown'` and `retrievalMode: 'none'` when no chunk qualifies (not `0.12` / `'refusal'`).
    - **Actual BM25 & Route-Boost Semantics**: `k1 = 1.5`, `b = 0.75`, title boost `+1.8`, intent boost `+2.0`, heading boost `+1.1`, synonym boost `+0.75`, same-language boost `+0.65`, and host route boost `fieldBoost += 2.2` on `rawScore` when `currentUrl.startsWith(doc.route)` (exposed as `routeBoost: 0.15` on `CompiledRetrievedChunk`), plus `EMB-PUBLIC-HOME` `routeRules` / `pinnedDocumentIds`.
    - **Actual Upload Dropzone Bounds**: `accept=".md,.txt,.json,.csv"` via browser `file.text()`, `validateFilenameInput`, and `containsUnsafeMarkdownScript` (zero `.pdf`/`.docx` or binary OCR support).
  - Execute all **30 query variants** (`20` representative variants = `10` primary + `10` natural paraphrases, plus `10` tour-stage variants = `5` primary + `5` stage paraphrases) and the out-of-domain refusal probe against the real `compileKnowledgeResponse` pipeline, recording the **actual measured** top-3 filenames, exact `normalizedConfidence` and `bm25Score` scores, `routeBoost`, citation scope, answer-quality check, and router resolution.
- **Refinement 3 — Separate Live Runtime Observations from Unit Test Results**:
  - Reproduce the stale persisted state (`knowledgeVersion: 184`, `COL-DOCS.fileCount: 10`, and pre-update `doc_pub_01`) in an isolated disposable fixture, capture the exact before-and-after state and hydration output, and execute live HTTP requests against the running server (`GET http://localhost:3000/` and `POST http://localhost:3000/api/chat/stream`) to verify whether the live runtime serves the updated canonical content.
  - Record unit test results (`Verified`) and live server/runtime observations (`Observed` or `Unverified` if any runtime path cannot be exercised) in separate columns with raw evidence captures.
- **Refinement 4 — Reproducible Change-Set & `/docs` Synchronization Audit**:
  - Capture `git status` and `git diff` summaries before and after the closure pass, separating pre-existing workspace modifications from closure-pass edits.
  - Programmatically verify that `/docs` (`PublicSurfaceView` + `DocArticleRenderer`) and `EMB-PUBLIC-HOME` consume the exact same hydrated `store` document corpus (`COL-PUBLIC`, `COL-DOCS`, `COL-LEGAL`), and verify via `git diff` that zero guided-tour UI files were modified.

---

## 1. Overview & Required Closure Criteria

- **What It Does**: Executes a reproducible, evidence-captured closure pass across capability traceability, 30-variant retrieval measurement, isolated runtime hydration + live `/api/chat/stream` verification, and `git` change-set auditing.
- **Required Closure Gates**:

| Gate | Evidence Required to Pass |
| :--- | :--- |
| **1. Capability traceability** | Every tour-required capability (`stage.requiredCapabilities`) resolves to **exactly one** complete canonical entry in the authoritative inventory, and published specs match that inventory |
| **2. Retrieval coverage** | All **30 query variants** (`20` representative + `10` tour-stage) executed against the real compiler and individually recorded with actual measured scores (`normalizedConfidence >= 0.25`) and top-3 sources; refusal probe separately documented (`answerType === 'unknown'`, `0` sources) |
| **3. Citation and authorization** | Zero unauthorized document, candidate chunk, model-context content, or citation leakage across all 4 identity cases and `EffectiveScope = Role ∩ Embed Binding` |
| **4. Runtime reconciliation** | Captured before/after state from disposable stale-state reproduction + live HTTP/SSE evidence (`GET /` and `POST /api/chat/stream`) showing updated canonical content retrieval (or explicit `Unverified` classification if any live step is unavailable) |
| **5. Documentation synchronization** | Executable check confirming `/docs` slug resolution (`store.getDocumentByFilename`) and `EMB-PUBLIC-HOME` (`filterAuthorizedDocuments`) read from the identical synchronized `store` corpus |
| **6. Change-set integrity** | Reproducible `git status` / `git diff --stat` manifest separating prior changes from closure-pass changes and proving zero guided-tour UI modifications |
| **7. Regression safety** | All authorization and readiness test suites pass with zero hard-stop security regressions and a clean production build |

---

## 2. Six-Step Execution Order

1. **Step 1 — Baseline Repository Snapshot**:
   - Capture pre-closure `git status --short` and `git diff --stat`, and inspect the current canonical inventory, tour contract, readiness suite, and report.
2. **Step 2 — Authoritative Capability Inventory & Executable Traceability**:
   - Define `CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY` (including `CAP-MISSING-TOPIC-REFUSAL`, `CAP-ROUTE-CONTEXT-BOOST`, and `CAP-INSTALLATION-RECIPE` plus corrected engine/upload bounds) and add executable readiness assertions verifying 1:1 resolution from `APPROVED_HOMEPAGE_TOUR_CONTRACT` and synchronization with `docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md`.
3. **Step 3 — Complete 30-Query Matrix Execution & Measured Output Capture**:
   - Add explicit natural paraphrases for all 10 representative questions (`20` representative variants + `10` tour-stage variants = `30` total variants + refusal probe), execute them against `compileKnowledgeResponse`, and export the actual measured top-3 sources, `normalizedConfidence`, `bm25Score`, `routeBoost`, citation scope, and router validation into Section 7 and Section 9 of the readiness report.
4. **Step 4 — Isolated Stale-State Reproduction & Live Runtime HTTP/SSE Check**:
   - Run an isolated stale-storage fixture reproduction (`kv: 184` -> `kv: 185`, `COL-DOCS: 10` -> `11`, stale `doc_pub_01` -> upgraded `doc_pub_01`) and execute live requests against the running server (`http://localhost:3000/` and `POST http://localhost:3000/api/chat/stream` with updated canonical documents), recording separate `Verified (Code/Test)` and `Observed (Live Runtime)` evidence.
5. **Step 5 — `/docs` Corpus Equivalence & Reproducible Change-Set Audit**:
   - Add an executable test verifying that every public `/docs/:slug` document rendered by the documentation hub is reference-identical to the `COL-PUBLIC` / `COL-DOCS` corpus used by `EMB-PUBLIC-HOME`, and record the post-pass `git status` / `git diff` manifest confirming zero guided-tour UI file changes.
6. **Step 6 — Full Regression Execution & Final Closure Report**:
   - Run `embed-authorization.test.ts`, `homepage-tour-readiness.test.ts`, and `compile_applet`, and update `homepage_tour_readiness_report.md` with all measured tables, runtime logs, change-set diffs, and the final gate verdict.

---

## 3. Key Decisions & Trade-Offs

- **Decision 1: Single Authoritative Capability Inventory Validated Against Markdown Docs**
  - *Chosen Approach*: Define `CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY` in the readiness contract module and have `READINESS-CAP-01` both (a) verify that every `stage.requiredCapabilities` ID resolves to exactly one inventory entry with valid status, evidence, bounds, and test IDs, and (b) parse `docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md` to assert every canonical `CAP-*` ID is documented in the specification.
  - *Why*: Eliminates manual copy-paste drift between tests, specifications, and the readiness report.
- **Decision 2: Aligning Report Thresholds with Actual Engine Code (`0.25` Normalized Confidence / `1.35` Raw Score)**
  - *Chosen Approach*: Report and assert the actual implemented thresholds in `responseCompiler.ts` (`normalizedConfidence >= 0.25`, `answerType: 'unknown'`, `retrievalMode: 'none'`) and `bm25Retriever.ts` (`k1 = 1.5`, `b = 0.75`, `rawScore >= 1.35`, route `fieldBoost += 2.2` / `routeBoost = 0.15`), and update any canonical doc text that previously mentioned `0.12` or `k1 = 1.2` so documentation, tests, and code agree 100%.
  - *Why*: Readiness documentation must reflect the real code path rather than an unverified specification assumption.

---

## 4. Technical Architecture & Verification Flow *(Technical Reference)*

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│              AUTHORITATIVE CAPABILITY & CONTRACT REGISTRY                    │
│  • CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY (14 entries incl. 3 new CAP-* IDs)│
│  • APPROVED_HOMEPAGE_TOUR_CONTRACT (5 stages -> 1:1 capability resolution)   │
└──────────────────┬────────────────────────────────────────┬──────────────────┘
                   │                                        │
                   ▼                                        ▼
┌────────────────────────────────────────┐ ┌───────────────────────────────────┐
│   EXECUTABLE READINESS SUITE           │ │   ISOLATED RUNTIME VERIFICATION   │
│   • READINESS-CAP-01 (1:1 ID & spec)   │ │   • Disposable stale storage      │
│   • READINESS-Q01..Q10 (20 variants)   │ │     snapshot (kv=184 -> kv=185)   │
│   • TOUR-STAGE-01..05 (10 variants)    │ │   • Live GET / & POST             │
│   • READINESS-DOCS-SYNC-01 (/docs ==   │ │     /api/chat/stream SSE capture  │
│     EMB-PUBLIC-HOME corpus)            │ │   • Reproducible git diff audit   │
└──────────────────┬─────────────────────┘ └────────────────┬──────────────────┘
                   └───────────────────┬────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│              AUDITABLE CLOSURE REPORT (homepage_tour_readiness_report.md)    │
│  • Measured 30-query + refusal tables (actual top-3 sources & scores)        │
│  • Code-Verified vs. Runtime-Observed evidence columns                       │
│  • Pre/Post git status & diff manifest proving 0 guided-tour UI edits        │
└──────────────────────────────────────────────────────────────────────────────┘
```
