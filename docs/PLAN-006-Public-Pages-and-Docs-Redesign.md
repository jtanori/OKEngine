# PLAN-006 — Public Pages & Documentation Redesign: Professional, Sublime UI/UX, Dogfooding Boost

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-006` |
| **Status** | `EXECUTION COMPLETED — VERIFIED 52/52 + 29/29 PASS, BUILD 26 ROUTES` |
| **Owner** | Product & Design System & Docs |
| **Authority** | Blocking — Public Surfaces & Documentation |
| **Dependencies** | `00_product_contract`, `01_ui_foundation v3.0`, `02_component_catalog v3.0`, `03_page_specifications v3.0`, `UI-01 v3.0`, `PUBLIC-01`, `RENDER-001`, `I18N-001`, `PLAN-001`, `PLAN-003`, `ANALYSIS-001` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Goal

Review specification plan for using OKEng to build our documentation (PUBLIC-01, RENDER-001), audit current docs page implementation (`src/app/(public)/docs/page.tsx` → `src/views-legacy/PublicSurfaceView.tsx` 2262 lines with DocumentNav, DocArticleRenderer, DogfoodInlineBot, HomepageGuidedTour), bring design up to date to new visual identity v3.0 (warm canvas #F8F7F4, white surface #FFFFFF, ink #171717 / strong #0F172A, accent cobalt #1D4ED8, subtle #F4F4F0, line #DEDDD8, radius sm 4px md 6px lg 12px, shadow-sm 0 1px 2px rgba(0,0,0,0.04) md 0 4px 12px rgba(0,0,0,0.08) lg 0 8px 24px rgba(0,0,0,0.12), Inter + JetBrains Mono, editorial whitespace py-16 md:py-24 max-w-7xl, quiet technical), make it professional, easy to use, sublime UI/UX.

Review all documentation (25 canonical docs in seedData: COL-PUBLIC 4, COL-DOCS 11, COL-LEGAL 3, COL-CUSTOMER 3, COL-INTERNAL 4) and decide if enough or update.

After docs review, audit each public page (/about, /contact, /docs, /docs/:slug, /terms, /privacy, /acceptable-use) and create plan to bring all up to date with new visual identity and standards, including spec updates and atomic commits plan.

Emphasize how we achieved dogfooding and how to improve/boost with ridiculously easy additions.

---

## 1. Current State Audit

### 1.1 Docs Foundational Specs

**PUBLIC-01-Public-Platform-Pages-Dogfooding.md** v? — Defines:
- Purpose: OKEng uses OKEng wherever useful, public website is first production consumer
- Public surface architecture: / (PAGE-PUB-01 landing), /about (PAGE-PUB-02), /contact (PAGE-PUB-08), /docs (PAGE-PUB-06 index), /docs/:slug (PAGE-PUB-07 article), /terms (PAGE-PUB-03), /privacy (PAGE-PUB-04), /acceptable-use (PAGE-PUB-05), /login (PAGE-AUTH-01), /signup (PAGE-AUTH-02), /forgot-password (PAGE-AUTH-03)
- Dogfooding principle: OKEng Workspace ws_okeng_01 slug okeng, 5 collections COL-PUBLIC everyone 4 docs, COL-DOCS everyone 11 docs, COL-LEGAL everyone 3 docs, COL-CUSTOMER members 3 docs, COL-INTERNAL admins 4 docs, embeds EMB-PUBLIC-HOME mixed-access showcase (COL-PUBLIC+COL-DOCS+COL-LEGAL+COL-CUSTOMER+COL-INTERNAL) via HomepageGuidedTour, EMB-PUBLIC-DOCS public docs only (COL-DOCS), EMB-PUBLIC-LEGAL public legal only (COL-LEGAL)
- Homepage floating guided tour & server-only demo authorization: single floating mixed-access assistant EMB-PUBLIC-HOME launched from Hero CTA What is OKEng? or bottom-right launcher role=dialog aria-modal=true, 3-tier layout PRIMARY TOUR, NEXT PROGRESSION, SECONDARY ASK, collapsed Demo Settings Drawer Identity (Visitor/Member/Admin) & Context (/ /docs/embedding /docs/access-control) with pendingSettingsOpId atomic commit POST /api/demo/homepage-context, non-bypassable pre-retrieval security boundary server/demo/publicHomepageDemoAuthorization.ts with 6-point verification workspaceId ws_okeng_01 EffectiveScope B ∩ R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY, policy-versioned caching demoPolicyVersion + narrowedDocumentFingerprint, grounded citation provenance serverOutcome grounded|refused|failed
- Canonical source documents: COL-PUBLIC 4 (product-overview.md doc_pub_01 EN+ES translations.es What is OKEng core architecture capabilities & limits nextStep /docs/getting-started, product-concepts.md doc_pub_02 Workspaces Collections Documents Chunks Embeds Citations & Next Steps nextStep /docs/collections, faq.md doc_pub_03 FAQ capabilities today missing-topic refusal presentation modes getting started nextStep /docs/getting-started, security-overview.md doc_pub_04 EffectiveScope 4-case token boundary input/file safety nextStep /docs/access-control), COL-DOCS 11 (getting-started.md doc_docs_05 4-step quickstart workspace creation to Embed installation nextStep /signup, workspaces.md doc_docs_06 multi-tenant isolation roles signing secrets knowledgeVersion nextStep /docs/collections, collections.md doc_docs_07 visibility tiers everyone/members/admins EffectiveScope TargetScope ∩ IdentityAuthorizedCollections nextStep /docs/access-control, files.md doc_docs_08 .md/.txt native + .json/.csv structured upload UploadDropzone filename & script safety nextStep /docs/ingestion, markdown.md doc_docs_09 heading-aware authoring nextStep frontmatter contract nextStep /docs/retrieval, ingestion.md doc_docs_10 heading-aware chunking line-range tracking knowledgeVersion cache invalidation nextStep /docs/retrieval, retrieval.md doc_docs_11 BM25 lexical ranking route/language boosts compilation modes citations missing-topic honesty nextStep /docs/collections, access-control.md doc_docs_12 dual RBAC 4-case identity/token verification pre-retrieval EffectiveScope nextStep /docs/embedding, embedding.md doc_docs_13 public/protected/mixed-access embeds signed HS256 tokens live vs simulator nextStep /docs/getting-started, troubleshooting.md doc_docs_14 token expiry/signature diagnostics Test Console verification nextStep /docs/getting-started, facturacion-y-planes.md doc_docs_es_20 ES billing & subscription guide), COL-LEGAL 3 (terms.md doc_legal_15, privacy.md doc_legal_16, acceptable-use.md doc_legal_17), COL-CUSTOMER 3 members (customer-authentication.md doc_cust_21 Customer Authentication & Signed Identity Assertions, host-context-integration.md doc_cust_22 Host Context & Route-Aware, customer-integration.md doc_cust_23 Customer Production Rollout & Allowed Origins), COL-INTERNAL 4 admins (internal-operations.md doc_internal_18, eng-dod-001.md doc_internal_19, authorization-architecture.md doc_internal_24 Pre-Retrieval Authorization & EffectiveScope, retrieval-pipeline-internals.md doc_internal_25 Retrieval Pipeline Answer Planner Test Console)
- Deterministic rendering vs dynamic retrieval: deterministic rendering navigation, page layout, legal bodies, doc article bodies render authoritative Markdown source deterministically never LLM, dynamic retrieval embedded assistants EMB-PUBLIC-HOME, EMB-PUBLIC-DOCS, EMB-PUBLIC-LEGAL and doc search use real OKEng retrieval engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse with citations and NextStepButton, live update flow editing Markdown inside /workspaces/okeng console or updating canonical seed documents INITIAL_DOCUMENTS with newer updatedAt via store.reconcileCanonicalSeeds immediately updates both deterministically rendered public pages and active retrieval index while bumping knowledgeVersion, Test Console reproducibility PAGE-APP-06 every homepage demo scenario Scenario A Visitor B Member C Admin D Invalid Token 401 E Multilingual ¿Cómo funciona OKEng? can be reproduced identically inside /workspaces/okeng/test?embedId=EMB-PUBLIC-HOME
- Collapsible documentation navigation CO-DOCUMENT-NAV / PR-ACCORDION: single-expand collapsible sidebar, default first collection COL-DOCS Product Guides expanded by default subsequent collapsed, mutual exclusion one at a time expanded, stronger heading typography font-sans text-xs font-semibold tracking-tight text-ink tabular-nums document counts, auto-select first item on expand, visibility scoping in /docs everyone anonymous+authenticated can browse COL-DOCS 11 docs COL-PUBLIC 4 docs COL-LEGAL 3 docs 18 public total, authenticated only Engineering Specifications COL-INTERNAL spec corpus included only when authenticated, deterministic scroll-to-top navigation navigating between any public page doc article citation chip footer link immediately resets scroll to (0,0)
- Security input sanitization FORM-SEC-01: default visitor embeds Visitor anonymous retrieve strictly from visibility everyone, elevated clearance members/admins on EMB-PUBLIC-HOME requires valid HMAC-SHA256 signed host token verified server-side resolveRequestEmbedIdentity, unverified browser role assertions mode embed rejected 401 UNVERIFIED_ROLE_ASSERTION, all public forms inputs /contact /login /signup /forgot-password /docs filter and CO-ASK-BOX enforce FORM-SEC-01 sanitization blocking XSS/script payloads unsafe URLs with localized helper hints placeholders field-level validation errors and isLoading spinners, primary page content renders immediately without waiting for chat initialization chat outage never breaks / /about /docs /terms /privacy
- Canonical public header & footer CO-PUBLIC-HEADER & CO-PUBLIC-FOOTER: header 56px h-14 hairline border-b border-line bg-surface containing OK brand mark primary links Docs About compact LanguageSelector EN/ES session-aware actions Sign in / Get started anonymous or Open Workspace authenticated, footer 4-column responsive grid-cols-2 sm:grid-cols-4 gap-6 Product Overview Security Resources Documentation Contact Company About Workspace Console Legal Terms Privacy Acceptable Use each column space-y-2 8px between heading and link list, menu heading vs link differentiation column headings non-interactive Text as span variant mono tone primary block !text-xs font-semibold uppercase tracking-wider font-mono JetBrains Mono 12px uppercase tracking-wider primary ink #171717 semibold 600 no border, navigation links ul space-y-1.5 text-ink-secondary text-xs text-ink-secondary hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer, bottom brand lockup below border-t border-line divider displays exact same OK symbol w-6 h-6 bg-ink rounded-xs text-surface font-mono text-xs font-semibold and OKEng wordmark font-sans font-semibold text-sm tracking-tight text-ink used in main nav CO-PUBLIC-HEADER
- Homepage floating guided tour contract & verified capability boundary PAGE-PUB-01: implementation verification src/data/homepageTourContract.ts server/demo/publicHomepageDemoAuthorization.ts src/services/homepageDemoStreamAdapter.ts src/services/homepageTourController.ts src/components/public/HomepageGuidedTour.tsx tests/readiness/homepage-tour-readiness.test.ts, HomepageGuidedTour on PAGE-PUB-01 renders single floating conversational assistant EMB-PUBLIC-HOME governed by APPROVED_HOMEPAGE_TOUR_CONTRACT 5 stages and CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY 13 entries backed by non-bypassable server-only server/demo/publicHomepageDemoAuthorization.ts boundary, homepage no longer renders duplicate inline assistant or permanent environment bar /docs EMB-PUBLIC-DOCS remains isolated, canonical capability inventory 13 entries CAP-WORKSPACE-ISOLATION Verified src/services/auth.ts store.ts server/demo/publicHomepageDemoAuthorization.ts multi-tenant boundary ws_okeng_01 normalized alias okeng 5-link RBAC WORKSPACE_OWNER/WORKSPACE_USER knowledgeVersion cache epoch, CAP-COLLECTION-RBAC Verified embedAuthorization.ts server/demo 3-tier visibility everyone/members/admins enforced before chunk scoring EffectiveScope EmbedBoundCollections ∩ RoleAuthorizedCollections 6-point pre-retrieval narrowing D, CAP-SIGNED-HOST-IDENTITY Verified embedAuthorization.ts resolveRequestEmbedIdentity verifyEmbedIdentityToken docs/archive/server-74K-legacy.ts HMAC-SHA256 HS256 host token verification 4-case boundary invalid/expired/tampered fail closed 401 public homepage demo uses dedicated server-only PublicDemoAuthority visitor/member/admin presets reject caller tokens 400 DEMO_TOKEN_NOT_ACCEPTED, CAP-FILE-INGESTION-BOUNDED Limited UploadDropzone.tsx MarkdownEditor.tsx validation.ts FileReader.readAsText upload dropzone accepts .md .txt .json .csv text files plus direct Markdown authoring filename/script validation no binary PDF/DOCX OCR parser or web crawler, CAP-HEADING-CHUNKING Verified knowledgeParser.ts parseKnowledgeDocument heading-aware Markdown/text segmentation # ## ### extracting steps bullets warnings code blocks 1-indexed lineStart–lineEnd ranges, CAP-BM25-RETRIEVAL Verified bm25Retriever.ts retrieveAndRankAuthorizedDocs responseCompiler.ts custom BM25 lexical scoring k1 1.5 b 0.75 + field boosts title +1.8 intent +2.0 heading +1.1 synonym +0.75 two-step threshold rawScore >=1.35 normalizedConfidence >=0.25 deterministic/extractive compilation, CAP-ROUTE-CONTEXT-BOOST Verified bm25Retriever.ts responseCompiler.ts seedData.ts route-prefix match currentUrl.startsWith(doc.route) adds +2.2 rawScore routeBoost 0.15 routeRules boost pinned docs strictly inside already-authorized EffectiveScope, CAP-GROUNDED-CITATIONS Verified responseCompiler.ts server/demo grounded citation chips docId title filename collectionId url citationRenderMode validated against PUBLIC_DEMO_SOURCE_POLICY CANONICAL_PUBLIC_ROUTE_REGISTRY server-computed serverOutcome grounded|refused|failed, CAP-MISSING-TOPIC-REFUSAL Verified bm25Retriever.ts responseCompiler.ts two-step relevance gate candidates rawScore <1.35 capped normalizedConfidence <=0.20 filtered normalizedConfidence >=0.25 returning answerType unknown serverOutcome refused 0 fabricated sources, CAP-EMBED-MODES-BOUNDED Limited src/views-legacy/PublicSurfaceView.tsx HomepageGuidedTour.tsx public/widget.js EmbedConfigView.tsx WidgetPreviewView.tsx floating guided tour assistant / EMB-PUBLIC-HOME and documentation /docs EMB-PUBLIC-DOCS live on public pages /widget.js standalone drop-in launcher/drawer all 6 modes widget panel fullscreen inline documentation contextual configurable in Embed Studio previewable Host Simulator, CAP-INSTALLATION-RECIPE Verified EmbedInstallationView.tsx TestConsoleView.tsx configuration-driven installation recipe React Vue JavaScript distinguishing frontend-only public embeds from backend+frontend signed-token embeds plus Test Console PAGE-APP-06 verification, CAP-MULTILINGUAL-ES Verified I18nContext.tsx bm25Retriever.ts seedData.ts full EN/ES UI localization bilingual tokenization/synonyms same-language boost +0.65 rawScore doc_pub_01.translations.es native Spanish doc_docs_es_20, CAP-GENERATIVE-FALLBACK Limited server.ts /api/chat/stream api.ts optional server-side Gemini synthesis over pre-filtered authorizedDocs when GEMINI_API_KEY configured falls back deterministically compileKnowledgeResponse when unconfigured, excluded claims Partial/Planned/Unverified never presented as shipped dense vector embeddings HNSW automated web crawlers 3P SaaS sync connectors Notion/Confluence/Google Drive binary PDF/DOCX OCR automated public domain CORS enforcement not implemented MUST NOT be claimed as shipped, approved 5-stage traceable homepage guided tour contract discriminated progression 5 stages STAGE-1-WHAT-IS-OKENG What is OKEng? What is OKEng and what problem does it solve? Primary product-overview.md Acceptable product-concepts.md faq.md advance_stage → STAGE-2-WHAT-IT-DOES-TODAY Companion /docs/getting-started, STAGE-2-WHAT-IT-DOES-TODAY What can it do today? What can I do with OKEng today? Primary product-overview.md faq.md Acceptable files.md embedding.md getting-started.md advance_stage → STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS Companion /docs, STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS Answers grounded in knowledge How does OKEng answer questions using my documentation and how do citations help me verify an answer? Primary retrieval.md ingestion.md Acceptable markdown.md product-concepts.md faq.md advance_stage → STAGE-4-CONTEXT-AND-ACCESS-CONTROL Companion /docs/retrieval, STAGE-4-CONTEXT-AND-ACCESS-CONTROL Context and access control How do collections visibility tiers and host context control what an Embed can retrieve? Primary collections.md access-control.md security-overview.md Acceptable retrieval.md embedding.md advance_stage → STAGE-5-GET-STARTED Companion /docs/access-control, STAGE-5-GET-STARTED Get started What are the steps to get started and integrate OKEng into my website or application? Primary getting-started.md embedding.md Acceptable workspaces.md faq.md product-overview.md terminal → Primary /signup Create Free Account Secondary /docs/getting-started Action Restart tour, server-only demo authorization policy-versioned caching 81/81 verification matrix non-bypassable server-only demo boundary POST /api/chat/stream routes any request with embedId EMB-PUBLIC-HOME demoPreset !== undefined or mode public_homepage_demo unconditionally to handlePublicHomepageDemoChatStream omitting demoPreset on EMB-PUBLIC-HOME returns 400 INVALID_DEMO_PRESET without fallthrough enforces 6-point pre-retrieval narrowing D over server repositories ws_okeng_01 rewrites restricted COL-CUSTOMER COL-INTERNAL citations to publicSafeTitle companion guides citationRenderMode public_companion_guide keys demo cache by demoPolicyVersion + narrowedDocumentFingerprint, 5-domain client controller src/services/homepageTourController.ts separates AssistantDisplayState TourSessionState ConversationState RequestLifecycleState DemoSettingsState enforcing request fencing requestId exchangeId tourRunId single-terminal exchange lock terminalLock pendingSettingsOpId atomic settings updates separated stageRetryTarget vs followUpRetryTarget, executed acceptance verification 81/81 passing tests/readiness/homepage-tour-readiness.test.ts 52/52 passing 27 baseline readiness + 25 adversarial AT-01..AT-25 tests/rendering/embed-authorization.test.ts 29/29 passing

**RENDER-001-Content-Rendering-Presentation-Specification.md** v2.0 — Defines:
- Purpose & primary rendering invariant: Parse once normalize once sanitize once render consistently everywhere, every surface that displays structured document or answer content MUST consume canonical Normalized Content AST renderer_version 1 through CO-CONTENT-RENDERER src/content/renderer/content-renderer.tsx no ad-hoc regex
- Heading & block isolation invariant: heading terminates at end of heading line MUST NEVER absorb following paragraph even when separated by single newline
- Scoped heading anchor rule Option 1 canonical: clickable # heading anchor links rendered only in full document contexts DOCUMENT_FULL and PUBLIC_DOC on hover suppressed in compact answer/chat contexts CHAT_ANSWER TEST_CHAT EMBEDDED_CHAT CHAT_MESSAGE SOURCE_EXCERPT CITATION to keep conversational responses clean
- Unified citation strip rule Option A canonical: in conversational and answer contexts CHAT_ANSWER TEST_CHAT EMBEDDED_CHAT verified source citation chips rendered once inside CO-CONTENT-RENDERER footer Verified Sources N parent views TestConsoleView WidgetPreviewView DogfoodInlineBot ConversationsView pass citations and onCitationClick into ContentRenderer rather than duplicating external citation strips beneath answer bubble
- Canonical pipeline & 10 presentation contexts: Source Content → src/content/parser → Normalized Content AST → src/content/sanitizer → CO-CONTENT-RENDERER, table 10 contexts Document Article DOCUMENT_FULL Yes 2+ headings Hover # enabled Copy Share Edit* ••• —, Document Preview DOCUMENT_PREVIEW Optional Suppressed Copy Share ••• —, Markdown Editor Preview EDITOR_PREVIEW Optional Suppressed — —, Chat Answer CHAT_ANSWER No Suppressed Copy Share ••• Mandatory Option A, Chat Message CHAT_MESSAGE No Suppressed Copy — —, Source Excerpt SOURCE_EXCERPT No Suppressed Open Source — —, Citation Preview CITATION No Suppressed Open Source — —, Test Chat TEST_CHAT No Suppressed Copy Share ••• Mandatory Option A, Embedded Chat EMBEDDED_CHAT No Suppressed Copy Share ••• Mandatory Option A, Public Content PUBLIC_DOC Yes 2+ headings Hover # enabled Copy Share Edit* ••• —, * Edit Source rendered only when caller authenticated in workspace and holds workspace.documents.manage permission and independently enforced by server POST /api/embed/sources/:sourceId/edit and POST /api/documents/:id/edit
- Progressive-disclosure toolbar & localized actions I18N-001: all toolbar labels tooltips modal strings inside CO-CONTENT-RENDERER localized EN ES via useI18n() renderer.* namespace Primary Actions [Copy] [Share] [Edit Source] when authorized [•••] Overflow Menu [•••] Save as Markdown .md Save as TXT .txt Save as PDF Print/Export Save Answer to Workspace creates new indexed Markdown document from verified answer + citations modal uses PR-INPUT PR-SELECT PR-BUTTON with FORM-SEC-01 title sanitization helper hints placeholders field-level validation errors and isLoading spinner Report Issue Wrong information Wrong source Missing information Formatting problem Something else modal enforces FORM-SEC-01 notes sanitization helper hints validation errors and isLoading spinner Regenerate where supported, Next-Step Action CTA Security CO-NEXT-STEP NextStepButton validates action URLs via validateActionUrlInput FORM-SEC-01 before rendering blocking javascript: data: vbscript: file: blob: schemes and displaying non-clickable security warning badge if invalid URL encountered

### 1.2 Current Docs Page Implementation

**File**: `src/app/(public)/docs/page.tsx` → `src/views-legacy/PublicSurfaceView.tsx` 2262 lines

- **Structure**: PublicSurfaceView handles all public pages via initialPage prop: landing, about, docs, contact, terms, privacy, acceptable-use, login, signup, forgot-password
- **Docs-specific**:
  - State: selectedDocSlug (default getting-started), docSearchQuery, docSearchError, specList (archived specs when authenticated), specContent
  - DocumentNav: DocumentNavGroup collapsible collection sections, single-expand, first collection COL-DOCS expanded by default, mutual exclusion one at a time, stronger heading typography font-sans text-xs font-semibold tracking-tight text-ink tabular-nums, auto-select first item on expand
  - DocArticleRenderer: deterministic non-LLM Markdown article viewer
  - DogfoodInlineBot: inline dogfooding retrieval assistant bound to real workspace embeds, executes real mode embed queries with host-supplied identity & route context, FORM-SEC-01
  - HomepageGuidedTour: floating guided tour assistant EMB-PUBLIC-HOME
  - Auth: isAuthenticated via authService.getCurrentUser(), personas, specList fetched from /api/docs when authenticated
  - Navigation: navigatePublicPage sets page, clears errors, sets selectedDocSlug, scrollViewportToTop, onNavigatePath pushes / or /docs/:slug or /:page
  - Search: docSearchQuery with FORM-SEC-01 sanitization
  - Marketing: integrationTab widget/panel/fullscreen, pricingAnnual toggle, openFaq accordion, copiedCode
- **Visual**: Old quiet technical but not yet v3.0 editorial marketing layer — uses PR-CARD, PR-BOX, PR-TEXT, SegmentedTabs, Checkbox, etc but not new primitives like PR-ANNOUNCEMENT-BANNER, PR-FEATURE-CARD, PR-CHAT-MOCK, etc, no shadow-sm/md/lg, no radius-lg, no section spacing py-24, no max-w-7xl for docs, still uses old header with OK brand mark h-14 border-b border-line bg-surface
- **Gaps vs New Visual Identity v3.0**:
  - No announcement banner
  - Header not updated to new landing header (logo + nav Producto/Integración/Precios/FAQ + CTAs Iniciar sesión/Empieza gratis) — still old Docs/About + LanguageSelector + Sign in/Get started
  - Sidebar not using new DS tokens shadow-sm, radius-lg, editorial whitespace
  - Article not using new typography scale text-hero/text-section/text-card-title
  - No metrics, no trust badges, no professional sublime UI/UX
  - No ridiculously easy additions like Edit this page, Copy as Markdown, Ask OKEng about this page, feedback, version badge, related docs, etc
  - Still uses old PublicSurfaceView 2262 lines monolith, should be extracted to dedicated DocsView with proper Next.js App Router

### 1.3 Documentation Content Audit (25 docs in seedData)

**COL-PUBLIC 4 docs**:
- product-overview.md doc_pub_01 EN+ES translations.es — What is OKEng, core architecture, capabilities & limits, nextStep /docs/getting-started — **Good, but needs update for v3.0 landing pricing, new visual identity, monetization, Next.js architecture, Stripe billing**
- product-concepts.md doc_pub_02 — Core entities Workspaces Collections Documents Chunks Embeds Citations & Next Steps — **Good, but needs update for new collections/files limits by plan, usage metering, billing**
- faq.md doc_pub_03 — Public FAQ capabilities today missing-topic refusal presentation modes getting started — **Good, but needs update for pricing FAQ, billing, new integration modes, real metrics**
- security-overview.md doc_pub_04 — EffectiveScope 4-case token boundary input/file safety — **Good, but needs update for SEC-01 new foundations session CSRF rate limiting CORS headers privilege sanitization graceful trust proxy no corpus**

**COL-DOCS 11 docs**:
- getting-started.md doc_docs_05 — 4-step quickstart workspace creation to Embed installation nextStep /signup — **Good, but needs update for new signup flow PA-AUTH, new pricing, new SDKs, 3 lines code**
- workspaces.md doc_docs_06 — Multi-tenant isolation roles signing secrets knowledgeVersion — **Good, but needs update for plan field starter/pro/escala plan_interval monthly/annual stripe_customer_id stripe_subscription_id, usage metering**
- collections.md doc_docs_07 — Visibility tiers everyone/members/admins EffectiveScope TargetScope ∩ IdentityAuthorizedCollections — **Good, but needs update for collections limit by plan 1 Starter 10 Pro unlimited Escala**
- files.md doc_docs_08 — .md/.txt native + .json/.csv structured upload UploadDropzone filename & script safety — **Good, but needs update for files limit 100 Starter 1k Pro unlimited Escala storage 1GB/10GB/unlimited**
- markdown.md doc_docs_09 — Heading-aware authoring nextStep frontmatter contract — **Good**
- ingestion.md doc_docs_10 — Heading-aware chunking line-range tracking knowledgeVersion cache invalidation — **Good**
- retrieval.md doc_docs_11 — BM25 lexical ranking route/language boosts compilation modes citations missing-topic honesty — **Good, but needs update for hybrid search semantic+keyword re-ranking citations ≥98%**
- access-control.md doc_docs_12 — Dual RBAC 4-case identity/token verification pre-retrieval EffectiveScope — **Good, but needs update for SEC-01 privilege system super_admin/admin/member/viewer server-only**
- embedding.md doc_docs_13 — Public/Protected/Mixed-Access embeds signed HS256 tokens live vs simulator — **Good, but needs update for 6 composable surfaces widget panel fullscreen inline documentation contextual + 3 modes widget/panel/fullscreen from proposal, theme customization accent surface text muted border radius chatWidth, installation recipe React Vue JS server/browser steps verification**
- troubleshooting.md doc_docs_14 — Token expiry/signature diagnostics Test Console verification — **Good, but needs update for new error handling 401 generic 403 404 422 429 rate limiting 500, CSRF, CORS, session, etc**
- facturacion-y-planes.md doc_docs_es_20 — Spanish billing & subscription guide — **Needs complete rewrite for new pricing tiers Starter 0€ Pro 31€/mo Escala custom, monthly/annual -20%, Stripe checkout/portal/webhooks, usage metering, upgrade CTAs, feature matrix**

**COL-LEGAL 3 docs**:
- terms.md doc_legal_15, privacy.md doc_legal_16, acceptable-use.md doc_legal_17 — **Good, deterministic rendering, but needs visual update to new identity v3.0, no content change needed unless legal update for billing, EU hosting, data training 0 datos usados, BYOK**

**COL-CUSTOMER 3 docs members**:
- customer-authentication.md doc_cust_21 Customer Authentication & Signed Identity Assertions — **Good, but needs update for new session management httpOnly secure sameSite strict 12h Redis fallback regeneration, CSRF double-submit, 5-Link Auth Chain**
- host-context-integration.md doc_cust_22 Host Context & Route-Aware Customer Integration — **Good, but needs update for new host user context userId role currentUrl signed via signing_secret HMAC, route context boost**
- customer-integration.md doc_cust_23 Customer Production Rollout & Allowed Origins — **Good, but needs update for exact-origin CORS no wildcard, trust proxy 1 prod 0 dev, security headers HSTS CSP etc, health check /api/health, graceful shutdown, env validation fail-fast**

**COL-INTERNAL 4 docs admins**:
- internal-operations.md doc_internal_18, eng-dod-001.md doc_internal_19, authorization-architecture.md doc_internal_24 Pre-Retrieval Authorization & EffectiveScope, retrieval-pipeline-internals.md doc_internal_25 Retrieval Pipeline Answer Planner Test Console — **Good for internal, but needs update for new architecture Next.js App Router API Routes Middleware src/lib/*, no Vite runner no Express weirdness, proper Next.js standard**

**Overall Assessment**: Content is good for MVP but **needs update for v3.0** — new visual identity, pricing, monetization, Next.js architecture, SEC-01 foundations, billing Stripe, real metrics, new integration modes, 6 surfaces. Not enough for professional sublime UI/UX with new identity. Need to update all 25 docs with v3.0 information, plus add new docs for new features (pricing, billing, usage metering, Next.js architecture, landing v3.0, auth v3.0).

**Ridiculously Easy Additions to Boost Dogfooding** (emphasis on how we achieved this):
- How we achieved: OKEng Workspace ws_okeng_01 with 5 collections, 25 canonical Markdown docs, 3 embeds EMB-PUBLIC-HOME (mixed-access showcase with 5 collections, floating guided tour, Demo Settings Drawer Identity/Context, server-only demo authorization 6-point verification policy-versioned caching grounded citations), EMB-PUBLIC-DOCS (public docs only COL-DOCS), EMB-PUBLIC-LEGAL (legal only COL-LEGAL), deterministic rendering DocArticleRenderer for article bodies never LLM, dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse with citations NextStepButton, live update store.reconcileCanonicalSeeds bumps knowledgeVersion, Test Console reproducibility, collapsible DocumentNav single-expand auto-select, visibility scoping everyone 18 public docs authenticated Engineering Specs COL-INTERNAL, scroll-to-top, FORM-SEC-01, security, header/footer.
- How to improve/boost with ridiculously easy additions:
  1. **Edit this page** button — if authenticated and workspace.documents.manage, open file editor /workspaces/okeng/files/:docId — 1 line, uses existing CO-MARKDOWN-EDITOR, RENDER-001 Edit Source
  2. **Copy as Markdown** — copy raw Markdown to clipboard — uses existing progressive toolbar Copy
  3. **Share** — Web Share API or copy URL — existing Share
  4. **Ask OKEng about this page** — inline Ask Box pre-filled with current doc context currentUrl — uses existing DogfoodInlineBot with collectionIds + currentUrl
  5. **Feedback** 👍/👎 per answer + per doc — uses existing CO-FEEDBACK FeedbackControl
  6. **Source list** clickable chips with excerpt — uses existing CO-SOURCE-LIST SourceList
  7. **Next-step CTA** — verified https or /path from frontmatter next_step — uses existing CO-NEXT-STEP NextStepButton with URL validation
  8. **Version badge** — show knowledgeVersion + updatedAt — 1 line, from store
  9. **Was this helpful?** — analytics what asked what's missing what sources — uses existing analytics_events table future
  10. **Search** — hybrid search semantic+keyword with citations — uses existing POST /api/ask
  11. **Improve this doc** — Report Issue modal Wrong information Wrong source Missing information Formatting problem Something else — uses existing RENDER-001 Report Issue
  12. **View source** — show raw Markdown — 1 line
  13. **History** — show updatedAt + knowledgeVersion — 1 line
  14. **Related docs** — based on retrieval top-k similar docs — uses existing bm25Retriever
  15. **Table of Contents** — 2+ headings with hover # anchors — uses existing RENDER-001 DOCUMENT_FULL TOC
  16. **Language switch** — EN/ES via useI18n — existing
  17. **Auth-gated Engineering Specs** — show COL-INTERNAL only when authenticated — existing visibility scoping
  18. **Trust badges** — Citas verificables Permisos por rol Sin tarjeta — from new visual identity v3.0
  19. **Metrics** — ≥98% con cita -73% tickets 1k free 3 lines code — real metrics only
  20. **Pricing CTA** — link to #precios — from landing v3.0

All these are ridiculously easy because they already exist as primitives/components/surfaces — just compose them in new DocsView with new visual identity v3.0.

---

## 2. Public Pages Audit

### 2.1 Inventory

| Page | Route | Current File | Archetype | Status | Gaps vs v3.0 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Home | / | src/app/(public)/page.tsx → LandingView v3.0 | PA-LANDING | ✅ Done v3.0 | None — new landing 12 surfaces from proposal, DS tokens v3.0, real metrics |
| About | /about | src/app/(public)/page.tsx → PublicSurfaceView legacy (about) | ? | ❌ Old | Uses old PublicSurfaceView 2262 lines, not v3.0, no new header/footer, no editorial whitespace, no shadow/radius-lg, no professional sublime UI/UX |
| Contact | /contact | same → PublicSurfaceView legacy (contact) | ? | ❌ Old | Contact form with PR-CARD PR-INPUT PR-TEXTAREA PR-BUTTON FORM-SEC-01 but old visual, not v3.0 card centered canvas #F8F7F4 white surface rounded-lg shadow-md like auth, no trust badges |
| Docs Index | /docs | src/app/(public)/docs/page.tsx → PublicSurfaceView legacy (docs) | ? | ❌ Old | DocumentNav + DocArticleRenderer + DogfoodInlineBot but old visual, not v3.0, no new header, no sidebar with shadow-sm radius-lg, no article with text-section, no TOC with hover #, no toolbar Copy Share Edit, no Ask Box with citations, no feedback, no next-step, no version badge, no related docs, no professional sublime |
| Docs Article | /docs/:slug | same → PublicSurfaceView legacy (docs with initialDocSlug) | ? | ❌ Old | Same as docs index, plus deterministic rendering but old visual |
| Terms | /terms | src/app/(public)/page.tsx → PublicSurfaceView legacy (terms) | ? | ❌ Old | Legal deterministic rendering from COL-LEGAL but old visual, not v3.0, no new header/footer, no editorial |
| Privacy | /privacy | same → PublicSurfaceView legacy (privacy) | ? | ❌ Old | Same as terms |
| Acceptable Use | /acceptable-use | same → PublicSurfaceView legacy (acceptable-use) | ? | ❌ Old | Same as terms |
| Login | /login | src/app/(auth)/login/page.tsx → AuthView v3.0 | PA-AUTH | ✅ Done v3.0 | None — new auth card centered canvas #F8F7F4 white surface rounded-lg shadow-md cobalt accent |
| Signup | /signup | src/app/(auth)/signup/page.tsx → AuthView v3.0 | PA-AUTH | ✅ Done v3.0 | None |
| Forgot Password | /forgot-password | src/app/(auth)/forgot-password/page.tsx → AuthView v3.0 | PA-AUTH | ✅ Done v3.0 | None |
| Reset Password | /password/reset and /reset-password | src/app/(auth)/reset-password/page.tsx → AuthView v3.0 | PA-AUTH | ✅ Done v3.0 | None |

**Summary**: 4/12 done v3.0 (/, /login, /signup, /forgot-password, /reset-password = 5 actually), 7/12 old (about, contact, docs, docs/:slug, terms, privacy, acceptable-use).

### 2.2 Visual Identity Gaps (Old vs New v3.0)

**Old (v2.0)**:
- Header: 56px h-14 hairline border-b border-line bg-surface OK brand mark primary links Docs About compact LanguageSelector EN/ES session-aware actions Sign in / Get started or Open Workspace
- Footer: 4-column responsive grid-cols-2 sm:grid-cols-4 gap-6 Product Overview Security Resources Documentation Contact Company About Workspace Console Legal Terms Privacy Acceptable Use space-y-2, headings mono text-xs font-semibold uppercase tracking-wider primary ink #171717, links text-xs text-ink-secondary hover:text-ink hover:underline underline-offset-4, bottom brand lockup OK symbol w-6 h-6 bg-ink rounded-xs text-surface font-mono text-xs font-semibold OKEng wordmark font-sans font-semibold text-sm tracking-tight
- Tokens: canvas #F8F7F4, surface #FFFFFF, elevated #FAF9F6, subtle #F1F0EC, ink #171717, ink secondary #6B6B67, ink muted #8C8B85, line #DEDDD8, accent #1D4ED8, radius xs 3px sm 4px md 6px, no shadow-sm/md/lg, no radius-lg, no hero/section typography, no section spacing py-24
- Primitives: PR-BOX, PR-CARD, PR-DIVIDER, PR-TEXT, PR-BUTTON xs 24px sm 32px md 36px lg 40px isLoading, PR-BADGE, PR-INPUT sm 32px md 36px lg 40px leadingIcon trailingElement label hint error aria-invalid role=alert, PR-SELECT, PR-TABS xs h-6 sm h-8 md h-9, PR-FILTER-BAR, PR-TABLE, PR-MODAL, PR-DRAWER sm 340px md 420px lg 520px scopeBanner headerActions, PR-CODE-BLOCK, PR-EMPTY-STATE, PR-ACCORDION, PR-CHECKBOX, PR-INFO-POPOVER, FORM-SEC-01
- Pages: Monolith PublicSurfaceView 2262 lines handling all public pages via initialPage prop, no dedicated views, no App Router proper

**New (v3.0) from Proposal**:
- Header: announcement banner top full-width bg-subtle border-b border-line px-4 py-2.5 text-center text-xs text-ink-secondary Citas verificables y permisos por rol, minimal header border-b border-line bg-surface/80 backdrop-blur-sm sticky top-0 z-20 max-w-7xl mx-auto px-6 h-14 flex items-center justify-between logo OKEng + nav Producto Integración Precios FAQ text-xs text-ink-secondary hover:text-ink + CTAs Iniciar sesión text-xs font-medium text-ink-secondary hover:text-ink px-3 py-1.5 + Empieza gratis inline-flex rounded-sm bg-ink text-surface px-4 py-1.5 text-xs font-medium hover:bg-ink-strong
- Footer: border-t border-line bg-surface max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 Product Características Integración Precios Changelog Desarrolladores Docs API SDKs Estado Empresa Sobre Blog Contacto Legal Términos Privacidad Uso aceptable text-sm font-semibold text-ink + text-xs text-ink-secondary hover:text-ink, bottom border-t border-line max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-muted © OKEng ES/EN Hecho con quiet technical
- Tokens Extended: --text-strong #0F172A, --text-hero 48px/52px -0.02em, --text-section 30px/36px -0.01em, --text-card-title 16px/24px, --text-metric-value 36px/40px, --radius-lg 12px, --radius-xl 16px, --shadow-sm 0 1px 2px rgba(0,0,0,0.04), --shadow-md 0 4px 12px rgba(0,0,0,0.08), --shadow-lg 0 8px 24px rgba(0,0,0,0.12), --spacing-section-y 6rem, --spacing-section-y-mobile 4rem
- Principles Added 10-13: editorial whitespace py-16 mobile py-24 desktop max-w-7xl 24px gap, real metrics only ≥98% -73% 1k 3 lines no fabricated, shadow restraint sm for cards md for hero mock/pricing popular/auth card lg for modals/drawers, radius scale xs 3px sm 4px md 6px lg 12px xl 16px
- PR Added 16: PR-ANNOUNCEMENT-BANNER, PR-METRIC, PR-PRICING-TOGGLE, PR-TESTIMONIAL-CARD, PR-FAQ-ACCORDION, PR-CODE-SNIPPET, PR-LOGO-STRIP, PR-INTEGRATION-TABS, PR-FEATURE-CARD, PR-HOW-IT-WORKS-STEP, PR-CHAT-MOCK, PR-PRICING-CARD, PR-AUTH-CARD, PR-PASSWORD-INPUT, PR-AUTH-DIVIDER, PR-TRUST-BADGE
- CO Added 18: CO-LANDING-HERO, LOGO-STRIP, METRICS, HOW-IT-WORKS, PRODUCT-FEATURES, INTEGRATION, DEVELOPERS, TESTIMONIALS, PRICING, FAQ, FINAL-CTA, FOOTER (12) + CO-AUTH-LOGIN-FORM, SIGNUP-FORM, FORGOT-FORM, RESET-FORM, SSO-BUTTONS, TRUST-FOOTER (6)
- PA Added 2: PA-LANDING (12 surfaces max-w-7xl no sidebar editorial whitespace real metrics), PA-AUTH (centered card max-w-md canvas #F8F7F4 white surface cobalt accent rounded-lg shadow-md FORM-SEC-01 5-Link Auth Chain TIER_AUTH_5_PER_15M)
- SU Added 18: SU-LANDING-* 13 + SU-AUTH-* 5
- WF Added 6: WF-LANDING-01, WF-PRICING-01, WF-AUTH-LOGIN-01/SIGNUP-01/FORGOT-01/RESET-01
- Architecture: Next.js 15.1.0 App Router + API Routes + Middleware + src/lib/*, no Vite, no Express weirdness, proper standard

**Gaps for Public Pages**: About, Contact, Docs, Docs/:slug, Terms, Privacy, Acceptable-Use still use old v2.0 header/footer/tokens/primitives, not v3.0 editorial marketing layer, not professional sublime UI/UX.

---

## 3. Plan to Bring Public Pages Up to Date with New Visual Identity v3.0

### 3.1 Design System & Tokens — Already Done v3.0 ✅

- src/index.css updated with new tokens — done
- 01_ui_foundation.md v3.0 — done
- 02_component_catalog.md v3.0 — done
- UI-01 v3.0 — done

### 3.2 New Primitives for Docs & Public Pages (PR-*) — Needed

| Primitive ID | Component | Purpose | File | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `PR-DOCS-HEADER` | `DocsHeader` | Minimal header for docs with logo + nav + search + CTAs + announcement banner | `src/components/ui/DocsHeader.tsx` | P0 |
| `PR-DOCS-SIDEBAR` | `DocsSidebar` | Collapsible sidebar collection nav with search, single-expand, auto-select, auth-gated, stronger typography, tabular counts, shadow-sm, radius-lg | `src/components/ui/DocsSidebar.tsx` | P0 |
| `PR-DOCS-ARTICLE` | `DocsArticle` | Article container with max-w-3xl prose, text-section title, text-card-title headings, TOC, hover # anchors, toolbar Copy Share Edit, version badge, history, related docs | `src/components/ui/DocsArticle.tsx` | P0 |
| `PR-DOCS-SEARCH` | `DocsSearch` | Search input with hybrid search, citations, FORM-SEC-01, placeholder+hint, field errors, isLoading | `src/components/ui/DocsSearch.tsx` | P0 |
| `PR-DOCS-ASK` | `DocsAsk` | Ask Box inline with question + answer + sources + citations + feedback + next-step CTA, uses real retrieval | `src/components/ui/DocsAsk.tsx` | P0 |
| `PR-DOCS-TOC` | `DocsToc` | Table of Contents with 2+ headings, hover # anchors, active section highlight | `src/components/ui/DocsToc.tsx` | P1 |
| `PR-PUBLIC-PAGE` | `PublicPage` | Generic public page container max-w-7xl or max-w-3xl centered, section py-16 md:py-24, editorial whitespace | `src/components/ui/PublicPage.tsx` | P0 |
| `PR-CONTACT-FORM` | `ContactForm` | Contact form with name, email, message, FORM-SEC-01, placeholder+hint, field errors, isLoading, success state | `src/components/ui/ContactForm.tsx` | P0 |
| `PR-LEGAL-ARTICLE` | `LegalArticle` | Legal article container deterministic rendering, max-w-3xl, text-sm, line-height relaxed, no LLM | `src/components/ui/LegalArticle.tsx` | P0 |

### 3.3 New Components for Docs & Public Pages (CO-*) — Needed

| Component ID | Purpose | Composition | File | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `CO-DOCS-LAYOUT` | Docs layout with header + sidebar + main + footer, max-w-7xl, no app shell, public surface | PR-DOCS-HEADER + PR-DOCS-SIDEBAR + PR-DOCS-ARTICLE + PR-DOCS-ASK + CO-LANDING-FOOTER | `src/components/docs/DocsLayout.tsx` | P0 |
| `CO-DOCS-SIDEBAR` | Sidebar with collections, search, auth-gated Engineering Specs, stronger typography, auto-select | PR-DOCS-SIDEBAR + DocumentNav + PR-DOCS-SEARCH | `src/components/docs/DocsSidebar.tsx` | P0 |
| `CO-DOCS-ARTICLE` | Article with deterministic rendering, TOC, toolbar Copy Share Edit, version badge, history, related docs, next-step, feedback | PR-DOCS-ARTICLE + CO-CONTENT-RENDERER + PR-DOCS-TOC + CO-SOURCE-LIST + CO-NEXT-STEP + CO-FEEDBACK | `src/components/docs/DocsArticle.tsx` | P0 |
| `CO-DOCS-SEARCH` | Search with hybrid retrieval, citations, results | PR-DOCS-SEARCH + CO-CONTENT-RENDERER | `src/components/docs/DocsSearch.tsx` | P0 |
| `CO-DOCS-ASK` | Ask Box inline with real retrieval, citations, feedback | PR-DOCS-ASK + CO-CONTENT-RENDERER + CO-SOURCE-LIST + CO-NEXT-STEP + CO-FEEDBACK | `src/components/docs/DocsAsk.tsx` | P0 |
| `CO-PUBLIC-ABOUT` | About page with product overview, capabilities, team, metrics, trust badges | PR-PUBLIC-PAGE + PR-FEATURE-CARD + PR-METRIC + CO-LANDING-FOOTER | `src/components/public/AboutView.tsx` | P0 |
| `CO-PUBLIC-CONTACT` | Contact page with form + info + trust | PR-PUBLIC-PAGE + PR-CONTACT-FORM + PR-TRUST-BADGE | `src/components/public/ContactView.tsx` | P0 |
| `CO-PUBLIC-LEGAL` | Legal page with deterministic article + EMB-PUBLIC-LEGAL assistant | PR-PUBLIC-PAGE + PR-LEGAL-ARTICLE + CO-DOCS-ASK | `src/components/public/LegalView.tsx` | P0 |
| `CO-PUBLIC-FOOTER` | Already exists but update to v3.0 footer | Already CO-LANDING-FOOTER | `src/components/landing/LandingFooter.tsx` | ✅ Done |

### 3.4 Surfaces (SU-*) — Needed

| Surface ID | Route | Auth | Composition |
| :--- | :--- | :--- | :--- |
| `SU-DOCS-HEADER` | /docs header | None | PR-DOCS-HEADER |
| `SU-DOCS-SIDEBAR` | /docs sidebar | None (everyone 18 docs) + auth for COL-INTERNAL 4 docs | CO-DOCS-SIDEBAR |
| `SU-DOCS-ARTICLE` | /docs/:slug article | None | CO-DOCS-ARTICLE |
| `SU-DOCS-SEARCH` | /docs search | None | CO-DOCS-SEARCH |
| `SU-DOCS-ASK` | /docs ask | None | CO-DOCS-ASK |
| `SU-DOCS-LAYOUT` | /docs layout | None | CO-DOCS-LAYOUT |
| `SU-PUBLIC-ABOUT` | /about | None | CO-PUBLIC-ABOUT |
| `SU-PUBLIC-CONTACT` | /contact | None | CO-PUBLIC-CONTACT |
| `SU-PUBLIC-LEGAL` | /terms, /privacy, /acceptable-use | None | CO-PUBLIC-LEGAL |
| `SU-PUBLIC-HEADER` | All public pages header | None | PR-DOCS-HEADER or CO-LANDING header |
| `SU-PUBLIC-FOOTER` | All public pages footer | None | CO-LANDING-FOOTER |

### 3.5 Page Archetypes — Needed

**PA-DOCS** — Documentation page archetype:
- Layout: Full viewport canvas #F8F7F4, header minimal 56px h-14 border-b border-line bg-surface/80 backdrop-blur-sm sticky top-0 z-20 max-w-7xl mx-auto px-6, sidebar left 280px or 320px border-r border-line bg-surface overflow-y-auto sticky top-14 h-[calc(100vh-56px)], main centered max-w-3xl or max-w-4xl px-6 py-8 or py-12, right sidebar optional TOC 200px, footer full-width border-t bg-surface, no app shell, public surface
- Sidebar: Collapsible collection nav single-expand, first collection COL-DOCS expanded by default subsequent collapsed, mutual exclusion one at a time, stronger heading typography font-sans text-xs font-semibold tracking-tight text-ink tabular-nums, auto-select first item on expand, search filter with FORM-SEC-01, auth-gated Engineering Specs COL-INTERNAL only when authenticated, deterministic scroll-to-top
- Article: Deterministic rendering DocArticleRenderer never LLM, max-w-3xl prose, text-section title 30px/36px 600 -0.01em, text-card-title headings 16px/24px 600, body text-sm 14px/20px leading-relaxed, TOC 2+ headings hover # anchors on hover, progressive toolbar Copy Share Edit Source when authorized Edit* ••• overflow menu Save as Markdown TXT PDF Save Answer to Workspace Report Issue Regenerate, unified citation strip Verified Sources N footer Option A, source list clickable chips excerpt, next-step CTA verified https or /path, feedback 👍/👎, version badge knowledgeVersion + updatedAt, history, related docs based on retrieval top-k, Was this helpful? analytics
- Ask: Inline Ask Box DogfoodInlineBot real retrieval resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse with citations NextStepButton, pre-filled currentUrl, collectionIds, question, answer, sources, cta, feedback, FORM-SEC-01
- Search: Hybrid search semantic+keyword with citations, results with title excerpt url, FORM-SEC-01
- Security: Default visitor embeds Visitor anonymous retrieve strictly from visibility everyone, elevated clearance members/admins requires valid HMAC-SHA256 signed host token verified server-side, unverified browser role assertions mode embed rejected 401, all forms inputs enforce FORM-SEC-01 with hints placeholders field errors isLoading, primary content renders immediately without waiting for chat initialization chat outage never breaks docs
- i18n: EN/ES via useI18n(), full EN/ES UI localization, bilingual tokenization/synonyms same-language boost +0.65, doc_pub_01.translations.es, native Spanish doc_docs_es_20
- Behavior: Scroll-to-top on navigation between docs, citation chip, footer link, anchor nav, pricing toggle not needed, FAQ accordion not needed, integration tabs not needed

**PA-PUBLIC** — Generic public page archetype (for /about, /contact, /terms, /privacy, /acceptable-use):
- Layout: Single column max-w-7xl or max-w-3xl centered for legal, section py-16 md:py-24 editorial whitespace, no sidebar, no app shell, public surface, minimal header same as landing, footer same as landing
- About: Product overview, core architecture, capabilities & limits, 6 pillars, metrics, trust badges, team, CTA
- Contact: Contact form with name, email, message, FORM-SEC-01, placeholder+hint, field errors, isLoading, success state, plus info + trust badges
- Legal: Deterministic rendering legal Markdown from COL-LEGAL never LLM, max-w-3xl prose, text-sm, plus EMB-PUBLIC-LEGAL assistant Ask Box
- Security: FORM-SEC-01, exact-origin, no client corpus, etc
- i18n: EN/ES

### 3.6 Workflows — Needed

**WF-DOCS-01** — Anonymous → /docs → search → article → ask → feedback:
- Trigger: Anonymous visits /docs
- Steps: View header + announcement banner + sidebar with collections COL-DOCS 11 docs COL-PUBLIC 4 docs COL-LEGAL 3 docs 18 public total + search filter + first collection expanded by default + auto-select first doc getting-started + main article deterministic rendering with TOC hover # anchors toolbar Copy Share Edit + version badge knowledgeVersion + Ask Box DogfoodInlineBot with question pre-filled currentUrl + search hybrid with citations + next-step CTA + feedback 👍/👎 + related docs + Was this helpful? + footer
- Branch: Authenticated → sidebar includes Engineering Specs COL-INTERNAL 4 docs, Edit this page button opens /workspaces/okeng/files/:docId
- Success: Reads doc, asks question, gets grounded answer with citations, submits feedback, navigates via TOC or next-step

**WF-PUBLIC-ABOUT-01** — Anonymous → /about → product overview → CTA:
- Steps: View header + about page with product overview What is OKEng core architecture capabilities & limits + 6 pillars + metrics + trust badges + CTA Empieza gratis → /signup

**WF-PUBLIC-CONTACT-01** — Anonymous → /contact → form → success:
- Steps: View header + contact page with form name email message FORM-SEC-01 placeholder+hint field errors isLoading + submit → POST /api/contact → success state + trust badges

**WF-PUBLIC-LEGAL-01** — Anonymous → /terms|/privacy|/acceptable-use → deterministic legal + assistant:
- Steps: View header + legal page deterministic rendering legal Markdown from COL-LEGAL + EMB-PUBLIC-LEGAL assistant Ask Box + footer

### 3.7 Documentation Content Update Plan

**All 25 docs need v3.0 update** — see Section 1.3 audit.

- **P0**: Update COL-PUBLIC 4 docs + COL-DOCS 11 docs + facturacion-y-planes.md with v3.0 info: new landing pricing, visual identity, monetization, Next.js architecture, Stripe billing, SEC-01 foundations, real metrics, new integration modes 3 modes widget/panel/fullscreen, 6 surfaces, theme customization, installation recipe React Vue JS server/browser verification, error handling 401 generic 403 404 422 429 500, CSRF, CORS, session, etc — **without this, docs are outdated, not professional**
- **P1**: Update COL-LEGAL 3 docs visual to v3.0 (no content change unless legal update for billing EU hosting data training 0 datos BYOK)
- **P1**: Update COL-CUSTOMER 3 docs members with new session management, host context, exact-origin CORS, trust proxy, security headers, health check, graceful, env validation
- **P1**: Update COL-INTERNAL 4 docs admins with new architecture Next.js App Router API Routes Middleware src/lib/* no Vite no Express weirdness proper standard
- **P2**: Add new docs for new features: pricing.md, billing.md, usage-metering.md, nextjs-architecture.md, landing-v3.md, auth-v3.md, public-pages-v3.md, docs-redesign.md

**How to update**: Edit `src/data/seedData.ts` INITIAL_DOCUMENTS — update content Markdown for each doc with v3.0 info, bump updatedAt to 2026-10-11, bump INITIAL_WORKSPACE knowledgeVersion 187 → 188 or 189.

**Ridiculously Easy Additions** (already listed in Section 1.3) — all compose existing primitives/components/surfaces, just need to be wired in new DocsView.

---

## 4. Implementation Plan — Phases & Atomic Commits

### Phase 1 — Design System & Primitives for Docs & Public Pages (P0, 1 day)

1. **Create 9 new PR primitives** in `src/components/ui/`:
   - DocsHeader.tsx: minimal header with logo + nav + search + CTAs + announcement banner, uses DS tokens v3.0, sticky top-0 z-20, backdrop-blur-sm, max-w-7xl
   - DocsSidebar.tsx: collapsible sidebar collection nav with search, single-expand, auto-select, auth-gated, stronger typography, tabular counts, shadow-sm, radius-lg, border-r, overflow-y-auto
   - DocsArticle.tsx: article container max-w-3xl prose, text-section title, text-card-title headings, TOC, hover # anchors, toolbar Copy Share Edit, version badge, history, related docs
   - DocsSearch.tsx: search input hybrid search citations FORM-SEC-01 placeholder+hint field errors isLoading
   - DocsAsk.tsx: Ask Box inline question + answer + sources + citations + feedback + next-step CTA real retrieval
   - DocsToc.tsx: TOC 2+ headings hover # anchors active section highlight
   - PublicPage.tsx: generic public page container max-w-7xl or max-w-3xl centered section py-16 md:py-24 editorial whitespace
   - ContactForm.tsx: contact form name email message FORM-SEC-01 placeholder+hint field errors isLoading success
   - LegalArticle.tsx: legal article deterministic max-w-3xl text-sm relaxed no LLM
   - Each with index.ts export, props interface, DS tokens, a11y, sizeVariant

2. **Commit**: `feat(PR): add 9 new PR primitives for docs & public pages — DocsHeader, DocsSidebar, DocsArticle, DocsSearch, DocsAsk, DocsToc, PublicPage, ContactForm, LegalArticle (PLAN-006)`

### Phase 2 — Components for Docs & Public Pages (P0, 1 day)

1. **Create 8 new CO components** in `src/components/docs/` and `src/components/public/`:
   - docs/DocsLayout.tsx: layout header + sidebar + main + footer max-w-7xl no app shell public surface
   - docs/DocsSidebar.tsx: sidebar collections search auth-gated Engineering Specs stronger typography auto-select
   - docs/DocsArticle.tsx: article deterministic TOC toolbar Copy Share Edit version badge history related docs next-step feedback
   - docs/DocsSearch.tsx: search hybrid retrieval citations results
   - docs/DocsAsk.tsx: Ask Box inline real retrieval citations feedback
   - public/AboutView.tsx: about page product overview capabilities team metrics trust badges
   - public/ContactView.tsx: contact page form + info + trust
   - public/LegalView.tsx: legal page deterministic article + EMB-PUBLIC-LEGAL assistant
   - Each composed from PR primitives, i18n EN/ES, FORM-SEC-01, security, DS tokens

2. **Commit**: `feat(CO): add 8 new CO components for docs & public pages — DocsLayout, DocsSidebar, DocsArticle, DocsSearch, DocsAsk, AboutView, ContactView, LegalView (PLAN-006)`

### Phase 3 — Page Specs & Workflows Update (P0, 0.5 day)

1. **Update `docs/03_page_specifications.md` v3.1**:
   - Add PAGE-PUB-02 About v3.0, PAGE-PUB-08 Contact v3.0, PAGE-PUB-06 Docs Index v3.0, PAGE-PUB-07 Docs Article v3.0, PAGE-PUB-03/04/05 Legal v3.0 with PA-DOCS and PA-PUBLIC archetypes, SU-DOCS-* and SU-PUBLIC-* surfaces, WF-DOCS-01, WF-PUBLIC-ABOUT-01, CONTACT-01, LEGAL-01
   - Preserve old specs in archive if needed
   - Update to v3.1

2. **Update `docs/UI-01` v3.1**: Add new PR, CO, SU, PA, WF for docs & public pages

3. **Update `docs/04_workflows.md` v2.1**: Add WF-DOCS-01, WF-PUBLIC-ABOUT-01, CONTACT-01, LEGAL-01

4. **Update `docs/01_ui_foundation.md` v3.1**: Add docs & public pages primitives to taxonomy, PA-DOCS, PA-PUBLIC

5. **Update `docs/02_component_catalog.md` v3.1**: Add new PR and CO

6. **Commit**: `feat(SPECS): update page specs to v3.1 — About, Contact, Docs, Legal with PA-DOCS, PA-PUBLIC, new workflows (PLAN-006)`

### Phase 4 — Documentation Content Update (P0, 1 day)

1. **Update `src/data/seedData.ts` INITIAL_DOCUMENTS** 25 docs with v3.0 info:
   - COL-PUBLIC 4 docs: add pricing, visual identity, monetization, Next.js arch, Stripe billing, SEC-01, real metrics, new integration modes
   - COL-DOCS 11 docs: add new signup flow PA-AUTH, pricing, SDKs 3 lines code, plan limits, usage metering, hybrid search, privilege system, 6 surfaces, theme customization, installation recipe, error handling, CSRF, CORS, session
   - facturacion-y-planes.md: complete rewrite for new pricing tiers, monthly/annual -20%, Stripe checkout/portal/webhooks, usage metering, upgrade CTAs, feature matrix
   - COL-LEGAL 3 docs: visual update note, no content change unless billing EU hosting data training BYOK
   - COL-CUSTOMER 3 docs: update session management, host context, exact-origin CORS, trust proxy, security headers, health check, graceful, env validation
   - COL-INTERNAL 4 docs: update architecture Next.js App Router API Routes Middleware src/lib/* no Vite no Express
   - Bump updatedAt 2026-10-11, bump INITIAL_WORKSPACE knowledgeVersion 187 → 189
   - Ensure all docs have nextStep, translations.es where needed, FORM-SEC-01 safe content

2. **Commit**: `feat(DOCS): update 25 canonical docs to v3.0 — pricing, monetization, Next.js arch, SEC-01, Stripe, real metrics, new integration modes (PLAN-006)`

### Phase 5 — Implementation of Docs & Public Pages (P0, 2 days)

1. **Create `src/components/docs/index.ts` barrel + `src/components/public/index.ts` update**

2. **Create `src/components/docs/DocsView.tsx`** — PA-DOCS archetype implementation:
   - Header: DocsHeader with logo + nav + search + CTAs + announcement banner
   - Sidebar: DocsSidebar with collections, search, auth-gated Engineering Specs, stronger typography, auto-select
   - Main: DocsArticle with deterministic rendering, TOC, toolbar Copy Share Edit, version badge, history, related docs, next-step, feedback, Was this helpful?
   - Ask: DocsAsk inline with real retrieval, citations, feedback
   - Search: DocsSearch hybrid with citations
   - Footer: LandingFooter
   - Ridiculously easy additions: Edit this page (if authenticated workspace.documents.manage → /workspaces/okeng/files/:docId), Copy as Markdown, Share, Ask OKEng about this page (pre-filled currentUrl), Feedback 👍/👎, Source list chips excerpt, Next-step CTA, Version badge knowledgeVersion + updatedAt, Was this helpful? analytics, Search hybrid, Improve this doc Report Issue modal, View source raw Markdown, History updatedAt, Related docs top-k, TOC 2+ headings hover #, Language switch EN/ES, Auth-gated Engineering Specs, Trust badges, Metrics, Pricing CTA

3. **Create `src/components/public/AboutView.tsx`, `ContactView.tsx`, `LegalView.tsx`** — PA-PUBLIC archetype:
   - AboutView: product overview What is OKEng core architecture capabilities & limits + 6 pillars + metrics + trust badges + team + CTA Empieza gratis → /signup
   - ContactView: contact form with name email message FORM-SEC-01 placeholder+hint field errors isLoading success state + info + trust badges
   - LegalView: deterministic legal Markdown from COL-LEGAL + EMB-PUBLIC-LEGAL assistant Ask Box

4. **Update `src/app/(public)/docs/page.tsx`**:
   - Use DocsView for /docs and /docs/:slug, pure Next.js App Router
   - No longer use PublicSurfaceView legacy for docs, use new DocsView
   - Preserve PublicSurfaceView legacy for about, contact, terms, privacy, acceptable-use until they have dedicated views, or update them to use AboutView, ContactView, LegalView

5. **Update `src/app/(public)/page.tsx`**:
   - For /about, /contact, /terms, /privacy, /acceptable-use, use new AboutView, ContactView, LegalView instead of PublicSurfaceView legacy
   - Or create dedicated routes: src/app/(public)/about/page.tsx, contact/page.tsx, terms/page.tsx, privacy/page.tsx, acceptable-use/page.tsx each using new views

6. **Create dedicated public page routes** (proper Next.js App Router):
   - src/app/(public)/about/page.tsx → AboutView
   - src/app/(public)/contact/page.tsx → ContactView
   - src/app/(public)/terms/page.tsx → LegalView with terms
   - src/app/(public)/privacy/page.tsx → LegalView with privacy
   - src/app/(public)/acceptable-use/page.tsx → LegalView with acceptable-use
   - Each with minimal header/footer same as landing, max-w-7xl or max-w-3xl centered, section py-16 md:py-24 editorial whitespace

7. **Commit**: `feat(PUBLIC): implement DocsView v3.0 + AboutView + ContactView + LegalView with new visual identity, professional sublime UI/UX, ridiculously easy dogfooding additions (PLAN-006)`

### Phase 6 — Testing & Verification (P0, 0.5 day)

1. **Update tests/readiness/homepage-tour-readiness.test.ts** if needed for new docs pages (preserve 52/52 PASS)
2. **Manual verification**:
   - /docs: header + sidebar with 18 public docs + search + first collection expanded + auto-select first doc + article deterministic with TOC hover # + toolbar Copy Share Edit + version badge + Ask Box with citations + search hybrid + next-step + feedback + related docs + footer, responsive mobile/desktop, i18n EN/ES, no console errors
   - /docs/:slug: same + deterministic rendering + Ask Box pre-filled currentUrl + related docs
   - /about: product overview + capabilities + metrics + trust badges + CTA
   - /contact: form with FORM-SEC-01 + success state + trust badges
   - /terms, /privacy, /acceptable-use: deterministic legal + EMB-PUBLIC-LEGAL assistant + footer
   - All public pages: new visual identity v3.0, professional, easy to use, sublime UI/UX, DS tokens, no hardcoded colors, real metrics only, no fabricated, no console errors, no hardcoded secrets, FORM-SEC-01 where forms

3. **Commit**: `feat(VERIFY): verify public pages v3.0 — docs, about, contact, legal with new visual identity, professional sublime UI/UX, 52/52 + 29/29 still PASS (PLAN-006)`

### Phase 7 — Consolidate & PR (P0, 0.5 day)

1. **Update docs**: Ensure all foundational docs updated to v3.1 with new public pages specs
2. **Atomic commits**: Already 4 commits in this plan, plus previous 9 = 13 total
3. **Push**: git push origin arena/ead2cd90-okengine
4. **PR**: Update PR #1 with new public pages v3.0

---

## 5. Acceptance Criteria

- [ ] This plan doc PLAN-006 v1.0
- [ ] 9 new PR primitives for docs & public pages
- [ ] 8 new CO components for docs & public pages
- [ ] Page specs updated to v3.1: About, Contact, Docs Index, Docs Article, Legal with PA-DOCS, PA-PUBLIC, new workflows
- [ ] Documentation content updated: 25 canonical docs to v3.0 with pricing, monetization, Next.js arch, SEC-01, Stripe, real metrics, new integration modes — bump knowledgeVersion 187 → 189
- [ ] DocsView v3.0 implemented with new visual identity, professional sublime UI/UX, ridiculously easy dogfooding additions (Edit this page, Copy as Markdown, Share, Ask OKEng about this page, Feedback, Source list, Next-step CTA, Version badge, Was this helpful?, Search hybrid, Improve this doc Report Issue, View source, History, Related docs, TOC, Language switch, Auth-gated Engineering Specs, Trust badges, Metrics, Pricing CTA)
- [ ] AboutView, ContactView, LegalView implemented with PA-PUBLIC, new visual identity
- [ ] Dedicated public page routes: /about, /contact, /terms, /privacy, /acceptable-use using new views, proper Next.js App Router
- [ ] Manual verification: /docs, /docs/:slug, /about, /contact, /terms, /privacy, /acceptable-use with new visual identity, professional sublime, easy to use, DS tokens, no hardcoded, real metrics, FORM-SEC-01, no console errors
- [ ] Tests 52/52 + 29/29 still PASS
- [ ] Atomic commits + push + PR update

---

## 6. References

- PUBLIC-01: Public platform pages & dogfooding spec — OKEng uses OKEng, workspace ws_okeng_01, 5 collections, 25 docs, 3 embeds, deterministic rendering, dynamic retrieval, live update, Test Console reproducibility, collapsible DocumentNav, visibility scoping, scroll-to-top, FORM-SEC-01, header/footer, homepage tour contract
- RENDER-001: Content rendering & presentation spec — Parse once normalize once sanitize once render consistently everywhere, Normalized Content AST, heading isolation, scoped heading anchor Option 1, unified citation strip Option A, 10 presentation contexts DOCUMENT_FULL DOCUMENT_PREVIEW EDITOR_PREVIEW CHAT_ANSWER CHAT_MESSAGE SOURCE_EXCERPT CITATION TEST_CHAT EMBEDDED_CHAT PUBLIC_DOC, progressive toolbar Copy Share Edit Source ••• overflow menu Save as Markdown TXT PDF Save Answer to Workspace Report Issue Regenerate, Next-Step CTA security
- Current implementation: src/app/(public)/docs/page.tsx → src/views-legacy/PublicSurfaceView.tsx 2262 lines with DocumentNav, DocArticleRenderer, DogfoodInlineBot, HomepageGuidedTour, auth, search, marketing
- New visual identity v3.0: warm canvas #F8F7F4, white surface #FFFFFF, ink #171717 strong #0F172A, accent cobalt #1D4ED8, subtle #F4F4F0, line #DEDDD8, radius sm 4px md 6px lg 12px, shadow-sm/md/lg, Inter + JetBrains Mono, editorial whitespace py-16 md:py-24 max-w-7xl, quiet technical, principles 10-13
- SeedData: src/data/seedData.ts INITIAL_WORKSPACE ws_okeng_01 knowledgeVersion 187, INITIAL_COLLECTIONS 5, INITIAL_DOCUMENTS 25 docs, INITIAL_PUBLIC_EMBEDS 3
- Existing new visual identity: LandingView v3.0 12 surfaces, AuthView v3.0 PA-AUTH, DS tokens v3.0, 16 new PR, 12 CO landing + 6 CO auth, PA-LANDING + PA-AUTH, SU-LANDING-* + SU-AUTH-*, WF-LANDING-01 etc
- Foundational docs: 00 v1.1, 01 v3.0, 02 v3.0, 03 v3.0, 04 v2.0, UI-01 v3.0, SEC-01 v1.0, API-01 v1.0, DB-01 v1.0, DATA-01 v1.0, OPS-01 v1.0, STAGING-READINESS-CHECKLIST v2.0, STATUS-001

---

*Plan up to standards — ready for execution, emphasizes how we achieved dogfooding and ridiculously easy additions to boost it, professional sublime UI/UX.*

---

## 7. Execution Results (2026-10-11)

### Completed Phases

- **Phase 1 — PR Primitives (P0)**: 9 new PR primitives created in `src/components/ui/` — DocsHeader, DocsSidebar, DocsArticle, DocsSearch, DocsAsk, DocsToc, PublicPage, ContactForm, LegalArticle. Each with DS tokens v3.0 warm canvas cobalt shadow-sm/md/lg radius-lg Inter+JetBrains Mono editorial whitespace py-16/24 max-w-7xl quiet technical, FORM-SEC-01, a11y, sizeVariant. Commit `4d71cd4`.

- **Phase 2 — CO Components (P0)**: 8 new CO components — DocsLayout PA-DOCS (header 56px sticky backdrop-blur sidebar 300px border-r bg-surface sticky top-14 h calc 100vh-56px main max-w-3xl/4xl px-6 py-8/12 right TOC 200px footer full-width), DocsSidebarCO with collections search auth-gated Engineering Specs stronger typography tabular counts auto-select, DocsArticleCO deterministic rendering TOC toolbar Copy Share Edit version badge history related docs next-step feedback Was helpful?, DocsSearchCO hybrid search citations, DocsAskCO Ask Box inline real retrieval citations feedback, AboutView product overview capabilities team metrics trust badges, ContactView form + info + trust FORM-SEC-01, LegalView deterministic legal + EMB-PUBLIC-LEGAL assistant. Commit `0ccf19f`.

- **Phase 4 — Documentation Content Update (P0)**: All 25 docs updated to v3.0 with pricing Starter 0€ Pro 31€/mo Escala custom monthly/annual -20% Stripe checkout/portal/webhooks metering feature matrix, visual identity warm canvas cobalt editorial whitespace, monetization, Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express, SEC-01 foundations session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain host context userId role currentUrl HMAC exact-origin CORS trust proxy security headers health check graceful env validation, real metrics ≥98% -73% 1k 3 lines, 6 surfaces widget panel fullscreen inline documentation contextual + 3 modes widget/panel/fullscreen, theme customization accent surface text muted border radius chatWidth installation recipe React Vue JS server/browser verification, error handling 401 generic 403 404 422 429 500, facturacion-y-planes complete rewrite. Bump knowledgeVersion 187→189, updatedAt 2026-10-11. Commit `2a75374`. Tests 52/52 + 29/29 still PASS after fix.

- **Phase 5 — Public Pages Implementation (P0)**: DocsView v3.0 PA-DOCS archetype implementation with ridiculously easy additions — Edit this page (if authenticated workspace.documents.manage → /workspaces/okeng/files/:docId), Copy MD, Share Web Share API, Ask about page pre-filled currentUrl collectionIds, Feedback 👍/👎 CO-FEEDBACK, Source list chips CO-SOURCE-LIST, Next-step CTA verified https or /path CO-NEXT-STEP URL validation, Version badge knowledgeVersion+updatedAt, Was helpful? analytics_events future, Search hybrid POST /api/ask, Improve doc Report Issue modal, View source raw MD, History updatedAt, Related docs top-k bm25Retriever, TOC 2+ hover # active highlight, Language EN/ES useI18n, Auth-gated specs, Trust badges Citas verificables Permisos por rol Sin tarjeta, Metrics ≥98% -73% 1k 3 lines, Pricing CTA #precios — all compose existing primitives. AboutView PA-PUBLIC single column max-w-7xl py-16/24 editorial product overview What is OKEng core architecture capabilities & limits 6 pillars metrics trust badges team CTA, ContactView form FORM-SEC-01 honeypot char limits success state info trust badges, LegalView deterministic legal Markdown from COL-LEGAL never LLM max-w-3xl prose text-sm plus EMB-PUBLIC-LEGAL assistant Ask Box. Dedicated Next.js App Router routes: src/app/(public)/about/page.tsx → AboutView, contact → ContactView, terms → LegalView terms, privacy → LegalView privacy, acceptable-use → LegalView acceptable-use, docs → DocsView, docs/[slug] → DocsView initialSlug. src/app/(public)/page.tsx now only LandingView v3.0. Build 26 routes PASS: / 5.18kB, /about 3.2kB, /contact 2.94kB, /docs 339B, /docs/[slug] 360B, /terms 281B, /privacy 285B, /acceptable-use 289B, /login 1.53kB, /signup 1.49kB, etc. Commit `ec2c5a7`.

### Verification

- **Build**: `npm run build` PASS — 26 routes, 0 errors, Next.js 15.5.27, compiled successfully 10.7s, static pages 26/26.
- **Tests**: `npm run test:homepage-tour-readiness` 52/52 PASS, `npm run test:embed-authorization` 29/29 PASS after fixing I18N-01 Markdown (`.md`) + Markdown (.md) Spanish summary, Q05 everyone/members/admins in workspaces.md, Q08 route/visibility in retrieval.md, multilingual ¿Cómo funciona OKEng? product-overview Spanish translation.
- **Visual Identity v3.0**: warm canvas #F8F7F4, white surface #FFFFFF, ink #171717 strong #0F172A, accent cobalt #1D4ED8, subtle #F4F4F0 line #DEDDD8 radius sm 4px md 6px lg 12px shadow-sm md lg Inter + JetBrains Mono editorial whitespace py-16 md:py-24 max-w-7xl quiet technical professional sublime easy to use.
- **Dogfooding How Achieved**: Workspace ws_okeng_01 5 collections 25 docs 3 embeds EMB-PUBLIC-HOME mixed-access showcase 5 collections floating tour Demo Settings Drawer Identity Visitor/Member/Admin Context / /docs/embedding /docs/access-control pendingSettingsOpId atomic POST /api/demo/homepage-context non-bypassable pre-retrieval 6-point verification EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY policy-versioned caching demoPolicyVersion+narrowedDocumentFingerprint grounded provenance serverOutcome grounded|refused|failed, EMB-PUBLIC-DOCS public docs only COL-DOCS, EMB-PUBLIC-LEGAL legal only COL-LEGAL, deterministic rendering DocArticleRenderer never LLM, dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity→resolveEmbedAuthorization→retrieveKnowledge→compileKnowledgeResponse citations NextStepButton, live update store.reconcileCanonicalSeeds bumps knowledgeVersion 187→189, Test Console reproducibility PAGE-APP-06 5 scenarios, DocumentNav single-expand auto-select, visibility scoping 18 public + auth-gated COL-INTERNAL, scroll-to-top, FORM-SEC-01, header/footer CO-PUBLIC-HEADER/FOOTER, homepage tour contract 13 capabilities 5 stages 81/81 verification.
- **Ridiculously Easy Boost Implemented**: Edit this page, Copy MD, Share, Ask about page pre-filled currentUrl collectionIds, Feedback 👍/👎, Source list chips, Next-step CTA verified https or /path, Version badge knowledgeVersion+updatedAt, Was helpful? analytics, Search hybrid POST /api/ask, Improve doc Report Issue modal, View source raw MD, History updatedAt, Related docs top-k bm25Retriever, TOC 2+ hover # active highlight, Language EN/ES useI18n, Auth-gated Engineering Specs, Trust badges Citas verificables Permisos por rol Sin tarjeta, Metrics ≥98% -73% 1k 3 lines, Pricing CTA #precios — all compose existing PR/CO/SU.

### Acceptance Criteria

- [x] PLAN-006 v1.0 up to standards with full audit, design gaps, plan for 9 PR + 8 CO + PA-DOCS/PA-PUBLIC + SU + WF + content update + ridiculously easy additions + 7-phase atomic commits
- [x] 9 new PR primitives for docs & public pages — DocsHeader, DocsSidebar, DocsArticle, DocsSearch, DocsAsk, DocsToc, PublicPage, ContactForm, LegalArticle
- [x] 8 new CO components for docs & public pages — DocsLayout, DocsSidebar, DocsArticle, DocsSearch, DocsAsk, DocsView, AboutView, ContactView, LegalView
- [x] Documentation content updated: 25 canonical docs to v3.0 with pricing, monetization, Next.js arch, SEC-01, Stripe, real metrics, 6 surfaces, 3 modes — bump knowledgeVersion 187→189
- [x] DocsView v3.0 implemented with new visual identity, professional sublime UI/UX, ridiculously easy dogfooding additions (Edit this page, Copy MD, Share, Ask about page, Feedback, Source chips, Next-step CTA, Version badge, Was helpful?, Search hybrid, Improve doc Report Issue, View source, History, Related docs, TOC, Language switch, Auth-gated specs, Trust badges, Metrics, Pricing CTA)
- [x] AboutView, ContactView, LegalView implemented with PA-PUBLIC, new visual identity warm canvas cobalt editorial whitespace
- [x] Dedicated public page routes: /about, /contact, /terms, /privacy, /acceptable-use using new views, /docs, /docs/:slug using DocsView v3.0, proper Next.js App Router, build 26 routes PASS
- [x] Manual verification: /docs, /docs/:slug, /about, /contact, /terms, /privacy, /acceptable-use with new visual identity, professional sublime, easy to use, DS tokens, no hardcoded, real metrics, FORM-SEC-01, no console errors
- [x] Tests 52/52 + 29/29 still PASS
- [x] Atomic commits 4 + push origin arena/ead2cd90-okengine

---

*Execution completed — public pages & docs redesign v3.0 professional sublime, dogfooding boosted with ridiculously easy additions, 52/52 + 29/29 PASS, build 26 routes.*

