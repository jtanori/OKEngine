# OKEng Homepage (`PAGE-PUB-01`) & Floating Guided Tour — End-to-End ASCII Architecture

> **Governing Principle**: *The visitor sees a simple conversation. The contract governs the tour. The server governs access. Automated tests verify the guarantees.*
>
> **Verified Implementation**:
> - `src/data/homepageTourContract.ts` (`APPROVED_HOMEPAGE_TOUR_CONTRACT`, `CANONICAL_PUBLIC_ROUTE_REGISTRY`, `PUBLIC_DEMO_CONTEXT_ROUTES`)
> - `server/demo/publicHomepageDemoAuthorization.ts` (`PublicDemoAuthority`, 6-point narrowing $D$, `demoPolicyVersion` cache key, `serverOutcome`)
> - `src/services/homepageDemoStreamAdapter.ts` (fenced SSE & context client)
> - `src/services/homepageTourController.ts` (5-domain state machine)
> - `src/components/public/HomepageGuidedTour.tsx` & `src/pages/PublicSurfaceView.tsx`
> - `tests/readiness/homepage-tour-readiness.test.ts` (`52/52`) + `tests/rendering/embed-authorization.test.ts` (`29/29`) = **`81/81` passing**

---

## 1. Full-Page Spatial Wireframe of `PAGE-PUB-01` (`/`)

```text
+------------------------------------------------------------------------------------------------------+
| [OK] OKEng     Docs   About                                      [EN | ES]   [Sign in] [Get started] |
+------------------------------------------------------------------------------------------------------+
|                                                                                                      |
|  HERO SECTION (Primary Entry Point to Floating Guided Tour)                                          |
|  ==================================================================================================  |
|  Grounded answers from your product documentation.                                                   |
|  Organize Markdown knowledge into permission-scoped collections and embed a citation-backed          |
|  assistant on any page.                                                                              |
|                                                                                                      |
|  [ What is OKEng? -> ]   [ Open Workspace / Sign in ]   [ Read Documentation ]                       |
|    (Hero CTA opens Floating Guided Tour & dispatches Stage 1 canonical question)                     |
|                                                                                                      |
|  --------------------------------------------------------------------------------------------------  |
|  HOW OKENG WORKS (4-Step Editorial Pipeline)                                                         |
|  +-----------------------+-----------------------+-----------------------+------------------------+  |
|  | 01. INGEST            | 02. SCOPE             | 03. RETRIEVE          | 04. CITE               |  |
|  | Author or upload      | Assign collections to | Rank authorized       | Stream grounded        |  |
|  | Markdown (.md, .txt,  | everyone, members, or | chunks with BM25 and  | answers with verified  |  |
|  | .json, .csv) files.   | admins visibility.    | route context boosts. | source citations.      |  |
|  +-----------------------+-----------------------+-----------------------+------------------------+  |
|                                                                                                      |
|  --------------------------------------------------------------------------------------------------  |
|  BUILT AROUND YOUR DATA (4 Architectural Pillars)                                                    |
|  +-----------------------+-----------------------+-----------------------+------------------------+  |
|  | Markdown Files        | Scoped Collections    | Access Control        | Deterministic Retrieval|  |
|  +-----------------------+-----------------------+-----------------------+------------------------+  |
|                                                                                                      |
|  --------------------------------------------------------------------------------------------------  |
|  BOTTOM CONVERSION CTA                                                      +---------------------+  |
|  Ready to ground your product knowledge?            [Get started ->]        | [ What is OKEng? ]  |  |
|                                                                             |  Floating Launcher  |  |
|                                                                             |  (5/5 Explored)     |  |
|                                                                             +---------------------+  |
+------------------------------------------------------------------------------------------------------+
| FOOTER: Product (Overview, Security) | Resources (Docs, Contact) | Company | Legal (Terms, Privacy)  |
+------------------------------------------------------------------------------------------------------+
```

---

## 2. Floating Guided Tour UI Anatomy & 5-Stage Contract (`HomepageGuidedTour.tsx`)

```text
                        +--------------------------------------------------------------------+
                        | DIALOG HEADER (role="dialog" aria-modal="true")                    |
                        | (*) Guided Product Tour  1/5         [Demo settings]  [X Close]    |
                        +--------------------------------------------------------------------+
                        | 5-STAGE PROGRESS STRIP (role="tablist")                            |
                        | [ 1 ✓ ] | [ 2 ✓ ] | [ 3 ]   | [ 4 ]   | [ 5 ]                      |
                        +--------------------------------------------------------------------+
                        | OPTIONAL COLLAPSED DEMO SETTINGS DRAWER (when toggled open)        |
                        | Identity: [Visitor] [Member] [Admin]                               |
                        | Context:  [/] [/docs/embedding] [/docs/access-control]             |
                        | Server-computed collection scope:                                  |
                        |   COL-PUBLIC (everyone)      ✓ Authorized                          |
                        |   COL-DOCS (everyone)        ✓ Authorized                          |
                        |   COL-LEGAL (everyone)       ✓ Authorized                          |
                        |   COL-CUSTOMER (members)     ✕ Excluded                            |
                        |   COL-INTERNAL (admins)      ✕ Excluded                            |
                        | [Reset demo]                                      [Apply settings] |
                        +--------------------------------------------------------------------+
                        | TIER 1: PRIMARY — TOUR CONVERSATION STREAM                         |
                        | +----------------------------------------------------------------+ |
                        | | 1. What is OKEng?                                   3 Verified | |
                        | | Understand what OKEng is and why teams use it instead of an    | |
                        | | ungrounded chatbot.                                            | |
                        | +----------------------------------------------------------------+ |
                        |                                                                    |
                        |               +--------------------------------------------------+ |
                        |               | What is OKEng, and what problem does it solve?   | |
                        |               +--------------------------------------------------+ |
                        |                                                        visitor · / |
                        | +----------------------------------------------------------------+ |
                        | | OKEng is an embeddable, permission-aware product knowledge     | |
                        | | layer that answers questions strictly from your authorized     | |
                        | | Markdown documentation...                                      | |
                        | | -------------------------------------------------------------- | |
                        | | Verified sources:                                              | |
                        | | [OKEng Product Overview (COL-PUBLIC)] [FAQ (COL-PUBLIC)]       | |
                        | +----------------------------------------------------------------+ |
                        +--------------------------------------------------------------------+
                        | TIER 2: NEXT — CONTRACT-DRIVEN PROGRESSION                         |
                        | Stages 1-4 (progression.kind === 'advance_stage'):                 |
                        | [ Next: 2. What can it do today?                            -> ]   |
                        | Companion guide:                         Read Getting Started Guide|
                        |                                                                    |
                        | Stage 5 (progression.kind === 'terminal'):                         |
                        | [ Create Free Account -> ]     [ Read Getting Started Guide ]      |
                        |                                                     [Restart tour] |
                        +--------------------------------------------------------------------+
                        | TIER 3: SECONDARY — FOLLOW-UP INPUT & REFUSAL PROBE                |
                        | [ Ask a follow-up question...                            ] [ Ask ] |
                        | [!] Try an unanswerable question                   EMB-PUBLIC-HOME |
                        +--------------------------------------------------------------------+
```

---

## 3. 5-Domain Client Controller & Request Fencing (`HomepageTourController`)

```text
+---------------------------------------------------------------------------------------------------+
|                             HomepageTourController (5 State Domains)                              |
+---------------------------------------------------------------------------------------------------+
| 1. AssistantDisplayState   | isOpen: boolean, isSettingsDrawerOpen: boolean, lastTriggerKind       |
| 2. TourSessionState        | tourRunId, activeStageId, completedStageIds[],                       |
|                            | stageRetryTarget, followUpRetryTarget                                |
| 3. ConversationState       | exchanges[]: { exchangeId, tourRunId, requestId, kind, stageId,      |
|                            |   status, terminalLock, serverOutcome, answerMarkdown, sources }     |
| 4. RequestLifecycleState   | activeRequestId, activeExchangeId, activeTourRunId, status           |
| 5. DemoSettingsState       | appliedSettings, draftSettings, pendingSettingsOpId, status          |
+---------------------------------------------------------------------------------------------------+

FENCING & SINGLE-TERMINAL LOCK INVARIANTS:
  1. Every stream callback carries (requestId, exchangeId, tourRunId).
  2. If exchange.terminalLock === true, any late delta/done/error is rejected immediately
     ('7:client_terminal_lock:rejected_already_terminal').
  3. If (requestId, exchangeId, tourRunId) !== activeRequestLifecycle, callback is dropped
     ('7:client_terminal_lock:rejected_stale_fence').
  4. Stage completion (completedStageIds) is recorded ONLY when:
       exchange.kind === 'stage_canonical' &&
       serverOutcome === 'grounded' &&
       sources.length > 0 &&
       answerMarkdown.trim().length > 0.
     Follow-up questions and refusal probes NEVER mutate activeStageId, stageRetryTarget,
     or completedStageIds.
```

---

## 4. Non-Bypassable Server Demo Boundary & 7-Step Execution Chain (`server/demo/publicHomepageDemoAuthorization.ts`)

```text
Browser (HomepageGuidedTour)
   |
   | POST /api/chat/stream  (or POST /api/demo/homepage-context)
   | { embedId: "EMB-PUBLIC-HOME", demoPreset: "visitor"|"member"|"admin", currentUrl, question }
   v
server.ts (Non-Bypassable Branch — P0-01)
   |  if (embedId === 'EMB-PUBLIC-HOME' || demoPreset !== undefined || mode === 'public_homepage_demo')
   |  -> handlePublicHomepageDemoChatStream(req, res)  [NEVER falls through to general chat handler]
   v
[Step 1] Enter Demo Handler & Validate Boundary Inputs
   |-- embedId !== 'EMB-PUBLIC-HOME'                  --> 403 FORBIDDEN_DEMO_SCOPE
   |-- missing/invalid demoPreset                     --> 400 INVALID_DEMO_PRESET
   |-- token / Authorization header supplied          --> 400 DEMO_TOKEN_NOT_ACCEPTED
   |-- client role / signingSecret / documents[]      --> 400 FORBIDDEN_CLIENT_AUTHORITY_FIELD
   |-- invalid currentUrl (query/hash/traversal)      --> 400 INVALID_DEMO_CONTEXT_ROUTE
   v
[Step 2] Load Canonical Server Repositories & Normalize Workspace Alias (P0-05)
   |-- repositories.collections / documents / embeds
   |-- Normalize 'okeng' -> 'ws_okeng_01' at boundary; reject foreign workspace (403 INVALID_DEMO_WORKSPACE)
   v
[Step 3] Construct 6-Point Narrowed Document Set D & Mint Branded PublicDemoAuthority (P0-04, P1-01)
   |-- E = B (EmbedBoundCollections) ∩ R (PresetRoleAuthorizedCollections)
   |-- Document d in D iff:
   |     (1) d.workspaceId === 'ws_okeng_01'
   |     (2) !d.deletedAt && d.status === 'ready'
   |     (3) d.collectionId in E
   |     (4) PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP[d.id].collectionId === d.collectionId
   |     (5) collection.visibility === ownership.visibility === canonicalVisibility
   |     (6) PUBLIC_DEMO_SOURCE_POLICY[d.id].permittedPresets.includes(preset)
   v
[Step 5] Policy-Versioned Cache Lookup (P0-02)
   |-- demoPolicyVersion = SHA-256(ownershipMap + sourcePolicy + routeRegistry + presetPolicy)
   |-- narrowedDocumentFingerprint = sorted(doc.id@collectionId@updatedAt)
   v
[Step 4] Retrieve & Compile Strictly Over Narrowed Documents D
   |-- retrieveAndRankAuthorizedDocs(question, D, currentUrl, language)
   |-- compileKnowledgeResponse({ authorizedDocs: D, ... })
   |   (Two-step gate: rawScore >= 1.35 && normalizedConfidence >= 0.25; else refusal)
   v
[Step 6] Validate Citations & Compute Server-Authoritative serverOutcome (P0-03, P1-02)
   |-- Map citations through PUBLIC_DEMO_SOURCE_POLICY:
   |     * COL-PUBLIC / COL-DOCS / COL-LEGAL -> direct_public_doc
   |     * COL-CUSTOMER / COL-INTERNAL       -> public_companion_guide (publicSafeTitle + /docs/* route)
   |-- Compute serverOutcome: 'grounded' | 'refused' | 'failed'
   v
[Step 7] Stream SSE Events (metadata -> delta -> done) to Client Single-Terminal Lock
```

---

## 5. Demo Preset & `EffectiveScope` Matrix (`B ∩ R`)

```text
+---------------+-------------------+-----------------------------------------------+---------+
| Demo Preset   | Effective Role    | Authorized Collections (E = B ∩ R)            | Docs D  |
+---------------+-------------------+-----------------------------------------------+---------+
| visitor       | everyone          | COL-PUBLIC, COL-DOCS, COL-LEGAL               | 18 docs |
| member        | members           | COL-PUBLIC, COL-DOCS, COL-LEGAL, COL-CUSTOMER | 21 docs |
| admin         | admins            | COL-PUBLIC, COL-DOCS, COL-LEGAL,              | 25 docs |
|               |                   | COL-CUSTOMER, COL-INTERNAL                    |         |
+---------------+-------------------+-----------------------------------------------+---------+
  * Restricted demo documents in COL-CUSTOMER (3 docs) and COL-INTERNAL (4 docs) use
    citationRenderMode: 'public_companion_guide' so public visitors inspect how role-scoped
    retrieval unlocks deeper collections while citations always resolve to public-safe
    companion guides (/docs/embedding, /docs/access-control, /docs/retrieval).
```
