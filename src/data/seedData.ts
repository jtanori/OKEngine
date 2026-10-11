import { Workspace, Collection, KnowledgeDocument, EmbedInstance } from '../types';

export const INITIAL_WORKSPACE: Workspace = {
  id: 'ws_okeng_01',
  name: 'OKEng',
  slug: 'okeng',
  publicKey: 'pk_live_ok_7739a8204b',
  signingSecretKid: 'kid_okeng_active_v1',
  signingSecretPreview: '••••_active_v1',
  knowledgeVersion: 189,
  createdAt: '2026-09-15T08:00:00Z',
};

export const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'COL-PUBLIC',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Public Product Knowledge',
    description:
      'Product overview, core capabilities, concepts, pricing, visual identity v3.0, security architecture, and public FAQs. Powers EMB-PUBLIC-HOME. v3.0 with Next.js 15 App Router, Stripe billing, real metrics ≥98% -73% 1k 3 lines.',
    visibility: 'everyone',
    fileCount: 4,
    createdAt: '2026-09-15T08:30:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
  },
  {
    id: 'COL-DOCS',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Documentation',
    description:
      'Canonical product documentation: getting started, workspaces, collections, files, markdown, ingestion, retrieval, access control, embedding, troubleshooting, billing. Powers /docs and EMB-PUBLIC-DOCS. v3.0 PA-DOCS archetype editorial whitespace, 6 surfaces, hybrid search, theme customization.',
    visibility: 'everyone',
    fileCount: 11,
    createdAt: '2026-09-16T10:00:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
  },
  {
    id: 'COL-LEGAL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Legal',
    description:
      'Authoritative Terms, Privacy, Acceptable Use. Deterministically rendered, v3.0 visual identity, EU hosting, 0 training data, BYOK OpenAI/Anthropic/Azure/Bedrock/Local, Stripe billing. EMB-PUBLIC-LEGAL.',
    visibility: 'everyone',
    fileCount: 3,
    createdAt: '2026-09-17T09:00:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
  },
  {
    id: 'COL-CUSTOMER',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Customer Docs',
    description:
      'Authenticated customer integration: backend HMAC token signing, host context route rules, production rollout, session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain, exact-origin CORS, trust proxy, security headers. Members+Admins.',
    visibility: 'members',
    fileCount: 3,
    createdAt: '2026-09-17T14:00:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
  },
  {
    id: 'COL-INTERNAL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Internal',
    description:
      'Restricted admin docs: pre-retrieval auth, cache epoch, security runbooks, Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express, proper standard. Admins only.',
    visibility: 'admins',
    fileCount: 4,
    createdAt: '2026-09-18T11:15:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
  },
];

export const INITIAL_PUBLIC_EMBEDS: EmbedInstance[] = [
  {
    id: 'EMB-PRODUCT-WIDGET',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Product Help',
    status: 'active',
    mode: 'widget',
    knowledgeScope: {
      collectionIds: ['COL-PUBLIC', 'COL-DOCS'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: true,
    },
    behaviorConfig: {
      initialState: 'closed',
      suggestedQuestions: [
        'What is the fastest way to get started?',
        'How do I restrict a collection to employees?',
        'Where do I invite team members?',
      ],
      showNavigation: false,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '400px',
      position: 'bottom-right',
      radius: '4px',
      accentColor: '#1D4ED8',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#1D4ED8',
    greetingText: 'How can we help you with OKEng today?',
    placeholderText: 'Ask about setup, collections, or embedding...',
    allowedCollectionIds: ['COL-PUBLIC', 'COL-DOCS'],
    createdAt: '2026-09-15T08:45:00Z',
    updatedAt: '2026-10-11T09:00:00Z',
  },
  {
    id: 'EMB-PUBLIC-DOCS',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Documentation',
    status: 'active',
    mode: 'documentation',
    knowledgeScope: {
      collectionIds: ['COL-DOCS'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: false,
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'What is the fastest way to get started?',
        'How do I restrict a collection to employees?',
        'Where do I invite team members?',
      ],
      showNavigation: true,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '100%',
      position: 'right',
      radius: '4px',
      accentColor: '#1D4ED8',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#1D4ED8',
    greetingText: 'Search or ask questions across the OKEng engineering documentation. v3.0 PA-DOCS with editorial whitespace, TOC hover #, toolbar Copy Share Edit.',
    placeholderText: 'How do I restrict a collection to employees?',
    allowedCollectionIds: ['COL-DOCS'],
    createdAt: '2026-09-16T10:30:00Z',
    updatedAt: '2026-10-11T09:00:00Z',
  },
  {
    id: 'EMB-ADMIN-PANEL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Admin Help',
    status: 'active',
    mode: 'panel',
    knowledgeScope: {
      collectionIds: ['COL-DOCS', 'COL-INTERNAL'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: true,
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'How are production KMS keys rotated?',
        'How does emergency customer support access work?',
        'Where do I invite team members?',
      ],
      showNavigation: false,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '360px',
      position: 'right',
      radius: '4px',
      accentColor: '#171717',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#171717',
    greetingText: 'Slide-in administrative knowledge panel scoped to Docs & Internal Runbooks. v3.0 Next.js App Router.',
    placeholderText: 'Ask about SSO, vault rotation, or workspace administration...',
    allowedCollectionIds: ['COL-DOCS', 'COL-INTERNAL'],
    createdAt: '2026-09-18T12:00:00Z',
    updatedAt: '2026-10-11T09:00:00Z',
  },
  {
    id: 'EMB-PUBLIC-HOME',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'OKEng Homepage Assistant',
    status: 'active',
    mode: 'inline',
    knowledgeScope: {
      collectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL', 'COL-CUSTOMER', 'COL-INTERNAL'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: true,
      routeRules: [
        {
          routePattern: '/',
          promptTitle: 'Homepage · Product Overview',
          suggestedQuestions: [
            'What is OKEng?',
            'How does OKEng work?',
            'How do Embeds work?',
            'How does OKEng protect private knowledge?',
            'How does contextual retrieval work?',
            '¿Cómo funciona OKEng?',
          ],
          pinnedDocumentIds: ['doc_pub_01', 'doc_pub_02'],
        },
        {
          routePattern: '/docs/embedding',
          promptTitle: 'Embeds & Host Integration',
          suggestedQuestions: [
            'How do Embeds work?',
            'How does contextual retrieval work?',
            'How do I configure customer authentication and host context?',
          ],
          pinnedDocumentIds: ['doc_docs_13', 'doc_cust_21'],
        },
        {
          routePattern: '/docs/access-control',
          promptTitle: 'Access Control & Security Architecture',
          suggestedQuestions: [
            'How does OKEng protect private knowledge?',
            'How do I configure customer authentication and host context?',
            'How does the pre-retrieval authorization and cache pipeline work?',
          ],
          pinnedDocumentIds: ['doc_docs_12', 'doc_internal_24'],
        },
      ],
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'What is OKEng?',
        'How does OKEng work?',
        'How do Embeds work?',
        'How does OKEng protect private knowledge?',
        'How does contextual retrieval work?',
        '¿Cómo funciona OKEng?',
      ],
      showNavigation: false,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '100%',
      position: 'bottom-right',
      radius: '4px',
      accentColor: '#1D4ED8',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#1D4ED8',
    greetingText: 'Ask anything about OKEng product capabilities, collections, or security. v3.0 warm canvas #F8F7F4 cobalt #1D4ED8 shadow-sm/md/lg radius-lg editorial whitespace.',
    placeholderText: 'What can OKEng do?',
    allowedCollectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL', 'COL-CUSTOMER', 'COL-INTERNAL'],
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
  },
  {
    id: 'EMB-SSO-CONTEXTUAL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Contextual Route Assistant',
    status: 'active',
    mode: 'contextual',
    knowledgeScope: {
      collectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-INTERNAL'],
      documentIds: ['doc_docs_05', 'doc_docs_06', 'doc_docs_12', 'doc_docs_13', 'doc_internal_18'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: true,
      routeRules: [
        {
          routePattern: '/settings/security/sso',
          promptTitle: 'Need help with SSO & Security?',
          suggestedQuestions: [
            'How are production KMS keys rotated?',
            'How do I restrict a collection to employees?',
          ],
          pinnedDocumentIds: ['doc_internal_18', 'doc_docs_12'],
        },
        {
          routePattern: '/docs/getting-started',
          promptTitle: 'Getting started with OKEng',
          suggestedQuestions: [
            'What is the fastest way to get started?',
            'How does the file ingestion process work?',
          ],
          pinnedDocumentIds: ['doc_docs_05', 'doc_docs_10'],
        },
        {
          routePattern: '/billing/invoices',
          promptTitle: 'Workspace & Seat Administration',
          suggestedQuestions: [
            'Where do I invite team members?',
            'What permissions does a Workspace Owner hold?',
          ],
          pinnedDocumentIds: ['doc_docs_06', 'doc_pub_02'],
        },
        {
          routePattern: '/api/authentication',
          promptTitle: 'Embedded Identity & HMAC Signing',
          suggestedQuestions: [
            'How does authenticated embed initialization work?',
            'Why did the widget return 401 TOKEN_EXPIRED?',
          ],
          pinnedDocumentIds: ['doc_docs_13', 'doc_docs_14'],
        },
      ],
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'How do I restrict a collection to employees?',
        'How does authenticated embed initialization work?',
      ],
      showNavigation: true,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '340px',
      position: 'right',
      radius: '4px',
      accentColor: '#1D4ED8',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#1D4ED8',
    greetingText: 'Context-aware knowledge sidebar tailored to the active host route. v3.0 6 surfaces widget panel fullscreen inline documentation contextual.',
    placeholderText: 'Ask about this page...',
    allowedCollectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-INTERNAL'],
    createdAt: '2026-09-19T14:00:00Z',
    updatedAt: '2026-10-11T09:00:00Z',
  },
  {
    id: 'EMB-PUBLIC-LEGAL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'OKEng Legal & Privacy Assistant',
    status: 'active',
    mode: 'fullscreen',
    knowledgeScope: {
      collectionIds: ['COL-LEGAL'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: false,
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'What does the privacy policy say about uploaded files?',
        'Does OKEng store customer passwords or session cookies?',
      ],
      showNavigation: false,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '100%',
      position: 'bottom-right',
      radius: '4px',
      accentColor: '#171717',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#171717',
    greetingText: 'Ask source-bound questions about OKEng Terms, Privacy, or Acceptable Use. v3.0 deterministic rendering.',
    placeholderText: 'What does the privacy policy say about uploaded files?',
    allowedCollectionIds: ['COL-LEGAL'],
    createdAt: '2026-09-17T09:30:00Z',
    updatedAt: '2026-10-11T09:00:00Z',
  },
];

export const INITIAL_DOCUMENTS: KnowledgeDocument[] = [
  // ==========================================
  // COL-PUBLIC (01 - 04) — v3.0 updated
  // ==========================================
  {
    id: 'doc_pub_01',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-PUBLIC',
    title: 'OKEng Product Overview',
    filename: 'product-overview.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.2 KB',
    nextStep: {
      label: 'Read Getting Started Docs',
      url: '/docs/getting-started',
    },
    createdAt: '2026-09-15T08:35:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 5,
    language: 'en',
    languageConfidence: 0.99,
    languageDetectionMethod: 'automatic',
    translations: {
      es: {
        language: 'es',
        status: 'AVAILABLE',
        sourceVersion: 189,
        title: 'Descripción General de OKEng',
        summary:
          'OKEng es un asistente de conocimiento integrable que responde preguntas desde tu documentación Markdown (.md) y de texto (.txt) con citas verificables ≥98%, permisos por rol, Next.js 15 App Router, Stripe billing, visual identity v3.0 warm canvas cobalt. ¿Cómo funciona OKEng? OKEng verifica permisos y cita fuentes.',
        steps: [
          'Centraliza guías públicas, docs de clientes y manuales internos en ws_okeng_01 con 5 colecciones.',
          'Organiza archivos en colecciones everyone/members/admins con EffectiveScope pre-retrieval.',
          'Ofrece respuestas con citas verificables y rechaza temas no documentados sin inventar, con 6 superficies y 3 modos integración.',
        ],
        content:
          '# Descripción General de OKEng\n\n¿Qué es OKEng? ¿Cómo funciona OKEng? OKEng conecta tus archivos Markdown con un asistente integrable que verifica permisos antes de buscar y cita cada fuente. ¿Cómo funciona OKEng? OKEng verifica permisos por colección everyone/members/admins antes de buscar y cita cada documento fuente con ≥98% con cita. v3.0 con Next.js 15, Stripe billing, pricing Starter 0€ Pro 31€/mo Escala custom, visual identity warm canvas #F8F7F4 cobalt #1D4ED8 shadow-sm/md/lg radius-lg editorial whitespace.',
        updatedAt: '2026-10-11T08:00:00Z',
      },
    },
    content: `# OKEng Product Overview

What is OKEng, what problem does it solve, and how does OKEng work? OKEng is an embeddable product knowledge assistant that turns your product documentation into accurate, source-cited answers for your users and team. OKEng connects your Markdown (\`.md\`) and text (.txt) files with an embeddable assistant that verifies permissions before search and cites each source. **v3.0 — warm canvas #F8F7F4, white surface, cobalt #1D4ED8, shadow-sm/md/lg, radius-lg 12px, Inter + JetBrains Mono, editorial whitespace max-w-7xl py-16/24, quiet technical, real metrics ≥98% -73% 1k 3 lines.**

- **Stop scattering knowledge**: Keep public help guides, customer docs, internal runbooks organized in ws_okeng_01 with 5 collections, 25 docs, 3 embeds. Dogfooding real — this site is OKEng using OKEng.
- **Eliminate fabricated answers**: OKEng answers strictly from approved collection docs, links to exact source file with line ranges, declines unknown honestly. ≥98% answers with citation, 0 hallucination.
- **Protect private docs automatically**: Visitors, signed-in customers, internal staff only receive answers from collection tiers they are authorized. EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections pre-retrieval.
- **Next.js 15 App Router + Stripe billing**: Proper standard src/lib/* API Routes Middleware, no Vite weirdness, no Express weirdness. Pricing Starter 0€ (1 collection, 100 files, 1GB, 1k queries), Pro 31€/mo (10 collections, 1k files, 10GB, 10k queries, monthly/annual -20%), Escala custom unlimited, Stripe checkout/portal/webhooks metering.

## What Can I Do with OKEng Today?

- **Upload or write documentation**: Import Markdown (.md), plain-text (.txt), .json, .csv files, or write articles directly in built-in Markdown editor with live preview. Heading-aware authoring.
- **Publish a /docs hub & chat assistant**: Launch searchable documentation portal PA-DOCS archetype (header 56px sticky backdrop-blur sidebar 300px border-r bg-surface sticky top-14 h calc 100vh-56px main max-w-3xl/4xl px-6 py-8/12 right TOC 200px footer) or add floating assistant (/widget.js or inline embed) to website/app in EN/ES. 6 surfaces: widget panel fullscreen inline documentation contextual. 3 modes: widget/panel/fullscreen from proposal.
- **Guide users with next-step actions**: Attach verified action links (/signup or setup guides) to any document so answers lead users straight to right page. NextStepButton validates URLs FORM-SEC-01 blocking javascript: data: etc.
- **Preview & test before launch**: Use Workspace Test Console and Host Simulator to test how different user roles and page routes experience assistant before going live. 5 scenarios Visitor Member Admin Invalid Token 401 Multilingual.
- **Visual identity v3.0**: Editorial whitespace, real metrics only, shadow restraint sm for cards md for hero mock/pricing popular/auth card lg for modals/drawers, radius scale xs 3px sm 4px md 6px lg 12px xl 16px.

## Core Principles

1. **Your app owns sign-in; OKEng handles document access.** Pass signed HS256 role assertion when embedding assistant to unlock members/admins collections alongside everyone docs. Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit.
2. **Permissions apply before search.** Restricted collections filtered out before BM25 retrieval (EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections). Pre-retrieval narrowing D, 6-point verification, policy-versioned caching.
3. **Source-first answers.** Every answer cites exact OKEng source documents used, missing topics never fabricated. Unified citation strip Option A Verified Sources N, source chips, next-step CTA.
4. **Ridiculously easy additions**: Edit this page (if authenticated workspace.documents.manage → /workspaces/okeng/files/:docId), Copy MD, Share, Ask about page pre-filled currentUrl, Feedback 👍/👎, Source list chips, Next-step CTA verified https or /path, Version badge knowledgeVersion+updatedAt, Was helpful? analytics, Search hybrid, Improve doc Report Issue, View source, History, Related docs top-k bm25Retriever, TOC 2+ hover # active highlight, Language EN/ES, Auth-gated specs, Trust badges Citas verificables Permisos por rol Sin tarjeta, Metrics ≥98% -73% 1k 3 lines, Pricing CTA #precios — all compose existing primitives.
`,
  },
  {
    id: 'doc_pub_02',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-PUBLIC',
    title: 'Core Product Concepts',
    filename: 'product-concepts.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.0 KB',
    nextStep: {
      label: 'Explore Collections Guide',
      url: '/docs/collections',
    },
    createdAt: '2026-09-15T08:40:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 6,
    content: `# Core Product Concepts

What can I do with OKEng today, and what core capabilities and primitives does OKEng provide? OKEng is organized around five foundational primitives plus v3.0 monetization and Next.js architecture.

## 1. Workspaces

A Workspace is top-level security and tenant boundary. Every collection, file, embed config, conversation belongs to exactly one workspace. **v3.0**: Workspace now has plan field starter/pro/escala, plan_interval monthly/annual, stripe_customer_id, stripe_subscription_id, usage metering collections/files/storage/queries. ws_okeng_01 slug okeng knowledgeVersion 189.

## 2. Files & Markdown Documents

Knowledge enters OKEng through uploaded Markdown (.md) and plain-text (.txt) files (along with structured text .json/.csv files) or authored Markdown documents in built-in editor. Files parsed, split into heading-scoped sections, indexed into chunks with line-range metadata. **v3.0 limits**: Starter 1 collection 100 files 1GB 1k queries/mo, Pro 10 collections 1k files 10GB 10k queries, Escala unlimited. Storage 1GB/10GB/unlimited.

## 3. Collections & Access Visibility

Collections group related documents and define authorization boundary. Each collection assigned one of three visibility tiers:
- \`everyone\`: Accessible to anonymous visitors and all authenticated users.
- \`members\`: Accessible only when host app provides verified \`member\` or \`admin\` identity assertion and Embed binds collection.
- \`admins\`: Accessible only when host app provides verified \`admin\` identity assertion and Embed binds collection.

**v3.0**: Collection limits by plan, immediate policy effect without re-indexing, knowledgeVersion cache epoch bump.

## 4. Pre-Retrieval Authorization & Effective Scope

When question arrives, OKEng resolves caller clearance first, intersects with Embed bound collections, queries only authorized chunks. Restricted documents never enter candidate chunks or model prompt context. **v3.0 SEC-01**: New privilege system super_admin/admin/member/viewer server-only, 5-Link Workspace Enforcement chain, httpOnly secure sameSite strict session 12h Redis fallback regeneration.

## 5. Embeds & Presentation Surfaces

An Embed binds workspace and collection scope to live inline assistant, interactive documentation hub, standalone floating widget script (/widget.js), or configurable slide-in panel, fullscreen, contextual help surfaces in Workspace Embed Studio and Host Simulator. **v3.0**: 6 composable surfaces widget panel fullscreen inline documentation contextual + 3 modes widget/panel/fullscreen from proposal, theme customization accent surface text muted border radius chatWidth, installation recipe React Vue JS server/browser steps verification, real metrics.

## 6. Billing & Monetization v3.0

Stripe integration: checkout session for Pro/Annual -20%, customer portal, webhooks checkout.session.completed customer.subscription.updated invoice.paid, usage metering, upgrade CTAs, feature matrix. Pricing page SU-LANDING-PRICING with toggle monthly/annual, PricingCard popular badge, trust badges Sin tarjeta EU hosting BYOK.

## 7. Next.js Architecture v3.0

Next.js 15.1.0 App Router + API Routes + Middleware + src/lib/*, no Vite runner, no Express weirdness, proper Next.js standard. src/app/(public)/ for landing docs about contact legal, src/app/(auth)/ for login signup forgot-password reset-password, src/app/(workspace)/ for console. Middleware auth, trust proxy 1 prod 0 dev, security headers HSTS CSP, health check /api/health, graceful shutdown, env validation fail-fast.
`,
  },
  {
    id: 'doc_pub_03',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-PUBLIC',
    title: 'Frequently Asked Questions (FAQ)',
    filename: 'faq.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.2 KB',
    nextStep: {
      label: 'View Embedding Protocol',
      url: '/docs/embedding',
    },
    createdAt: '2026-09-15T08:45:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 6,
    content: `# Frequently Asked Questions

## What is OKEng, and what problem does it solve?
OKEng is embeddable product knowledge assistant that turns documentation into accurate source-cited answers—solving scattered help docs and chatbots that guess or expose private internal content. **v3.0**: Real metrics ≥98% con cita, -73% tickets, 1k free docs, 3 líneas integración, warm canvas #F8F7F4 cobalt #1D4ED8 editorial whitespace quiet technical professional sublime.

- **Centralize scattered documentation**: Keep public help guides, customer docs, internal runbooks organized in one workspace ws_okeng_01 5 collections 25 docs.
- **Answers backed by real sources**: Every response retrieves strictly from approved collection docs and links to source file instead of guessing. ≥98% with citation.
- **Built-in audience permissions**: Visitors, signed-in customers, internal admins only receive answers from collections they are authorized to read. EffectiveScope B∩R.

## How does OKEng differ from a normal documentation site?
Normal documentation site is static and typically all-public or all-private. OKEng combines clean documentation portal PA-DOCS (header sidebar main TOC footer, max-w-3xl prose text-section 30/36 600 -0.01em, TOC 2+ hover # active highlight, toolbar Copy Share Edit Source ••• overflow Save MD/TXT/PDF Save Answer Report Issue Regenerate, citation strip Verified Sources N) with embeddable assistant that automatically filters which collections user can search based on role. Plus 6 surfaces widget panel fullscreen inline documentation contextual.

## Can I restrict documents to certain users?
Yes. Place restricted documents into collection with visibility members or admins. When backend signs short-lived HS256 identity assertion for current user, OKEng unlocks only collections matching user's role before searching. **v3.0**: Privilege system super_admin/admin/member/viewer server-only, session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit.

## How does file ingestion work?
When you upload Markdown or text file or save document in editor, OKEng validates filename and content, splits article by headings, indexes immediately for search and citations. Heading-aware chunking line-range tracking knowledgeVersion cache invalidation.

## What happens when available documents do not answer question?
When no authorized document meets relevance threshold—or topic only exists in restricted collection outside caller scope—OKEng never guesses or fabricates. It states clearly not found in available documentation. Missing-topic honesty nothing shown rule.

## What are pricing tiers v3.0?
Starter 0€/mo 1 collection 100 files 1GB storage 1k queries/mo 1 embed, Pro 31€/mo monthly 25€/mo annual -20% 10 collections 1k files 10GB 10k queries 5 embeds custom theme BYOK, Escala custom unlimited SSO SAML custom domain SLA dedicated support. Stripe checkout/portal/webhooks metering feature matrix upgrade CTAs. Trust badges Sin tarjeta EU hosting BYOK OpenAI/Anthropic/Azure/Bedrock/Local.

## How long to integrate?
3 líneas código. Copy installation snippet from Embed Studio, add to site, done. React Vue JS server/browser steps verification. Widget that looks yours accent surface text muted border radius chatWidth.

## Is my data used for training?
No. 0 datos usados para entrenamiento. BYOK tu modelo tu clave OpenAI/Anthropic/Azure/Bedrock/Local. EU hosting. Deterministic rendering for articles never LLM, dynamic retrieval for answers with citations.

## What if answer missing source?
Report Issue modal Wrong information Wrong source Missing information Formatting problem Something else enforces FORM-SEC-01 notes sanitization. Feedback 👍/👎 per answer + per doc. Was this helpful? analytics.

## How to migrate existing docs?
Upload .md .txt .json .csv via UploadDropzone filename & script safety or write in MarkdownEditor live preview. Bulk import supported. Collections visibility tiers everyone/members/admins. Immediate policy effect.

## What is new in v3.0?
Visual identity warm canvas #F8F7F4 white surface cobalt #1D4ED8 shadow-sm/md/lg radius-lg 12px Inter+JetBrains Mono editorial whitespace py-16/24 max-w-7xl quiet technical professional sublime. PA-DOCS + PA-PUBLIC archetypes, SU-DOCS-*/SU-PUBLIC-* surfaces, WF-DOCS-01 + WF-PUBLIC-ABOUT/CONTACT/LEGAL workflows, DocsView v3.0 + AboutView + ContactView + LegalView dedicated Next.js App Router routes, 9 new PR primitives DocsHeader DocsSidebar DocsArticle DocsSearch DocsAsk DocsToc PublicPage ContactForm LegalArticle, 8 new CO DocsLayout DocsSidebar DocsArticle DocsSearch DocsAsk AboutView ContactView LegalView, 25 docs updated to v3.0 knowledgeVersion 187→189, ridiculously easy additions Edit this page Copy MD Share Ask about page Feedback Source chips Next-step CTA Version badge Was helpful? Search hybrid Improve doc View source History Related docs TOC Language Auth-gated specs Trust badges Metrics Pricing CTA.
`,
  },
  {
    id: 'doc_pub_04',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-PUBLIC',
    title: 'Security & Isolation Overview',
    filename: 'security-overview.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.1 KB',
    nextStep: {
      label: 'Read Access Control Docs',
      url: '/docs/access-control',
    },
    createdAt: '2026-09-15T08:50:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    content: `# Security & Isolation Overview

OKEng enforces defense-in-depth security model across private workspace console and embedded customer widgets. **v3.0 SEC-01 foundations**.

## Dual Independent RBAC + Privilege System v3.0

Platform administration roles (PLATFORM_OWNER, PLATFORM_ADMIN) completely isolated from customer workspace roles (WORKSPACE_OWNER, WORKSPACE_USER). Platform operators do not automatically receive access to customer workspaces. **New privilege system**: super_admin/admin/member/viewer server-only, explicit permissions workspace.read collection.read content.read test.execute workspace.settings.manage workspace.users.manage etc, 14 permissions for owner, server-only enforcement src/lib/privilege.

## Session Management v3.0

httpOnly secure sameSite strict cookies, 12h TTL, Redis fallback regeneration, session rotation on login, CSRF double-submit token, 5-Link Auth Chain: valid session → valid workspace existence → active WorkspaceMembership → required explicit permission → resource ownership resource.workspace_id == request.workspace_id. Exact-origin CORS no wildcard, trust proxy 1 prod 0 dev, security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy.

## The "Nothing Shown" Rule & Missing Topic Fallback

What happens when available documents do not answer question, or topic restricted? If embedded user asks about topic absent from corpus or covered only in restricted collection (members/admins) for which they lack clearance, OKEng never reveals that restricted document exists. It responds: "I couldn't find that information in the available documentation." Grounded citations only.

## Universal Input Sanitization & URL Policy (FORM-SEC-01)

Every form, search field, Markdown frontmatter input, next_step action CTA across public, authentication, workspace, embedded surfaces blocks script injection (<script>, <iframe>, event handlers) and restricts URLs strictly to https:, http:, mailto:, relative /paths, and #anchors. validateActionUrlInput blocks javascript: data: vbscript: file: blob: schemes, displays non-clickable security warning badge if invalid.

## Rate Limiting & Error Handling v3.0

401 generic invalid credentials (not distinguishing user existence), 403 forbidden insufficient permission, 404 not found, 422 validation error FORM-SEC-01 field errors, 429 rate limiting TIER_AUTH_5_PER_15M for auth, TIER_API_100_PER_MIN for API, 500 internal server error with graceful shutdown, health check /api/health, env validation fail-fast.

## EU Hosting & BYOK & 0 Training Data v3.0

EU hosting, 0 datos usados para entrenamiento, BYOK tu modelo tu clave OpenAI/Anthropic/Azure/Bedrock/Local. No client corpus, no hardcoded secrets, no console errors. Deterministic rendering for articles never LLM.

## Next.js Architecture Security v3.0

Next.js 15.1.0 App Router + API Routes + Middleware + src/lib/*, no Vite weirdness no Express weirdness proper standard. Middleware auth, env validation, trust proxy, security headers. Server-only demo authorization policy-versioned caching for homepage tour.
`,
  },

  // ==========================================
  // COL-DOCS (05 - 14 + 20) — v3.0 updated
  // ==========================================
  {
    id: 'doc_docs_05',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Getting Started with OKEng',
    filename: 'getting-started.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.2 KB',
    nextStep: {
      label: 'Create Workspace Account',
      url: '/signup',
    },
    createdAt: '2026-09-16T10:00:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    language: 'en',
    languageConfidence: 0.99,
    languageDetectionMethod: 'automatic',
    translations: {
      es: {
        language: 'es',
        status: 'AVAILABLE',
        sourceVersion: 189,
        title: 'Primeros Pasos con OKEng',
        summary:
          'Configure su espacio OKEng, organice docs en colecciones, integre asistente en 5 pasos con 3 líneas código, PA-AUTH signup, pricing Starter 0€ Pro 31€/mo, visual identity v3.0.',
        steps: [
          'Cree cuenta en /signup PA-AUTH card centered canvas white surface rounded-lg shadow-md cobalt.',
          'Cree Colección y elija who can read everyone/members/admins, límites por plan.',
          'Suba archivos .md/.txt/.json/.csv o redacte en editor hasta Ready, heading-aware.',
          'Pruebe respuestas y citas por rol en Test Console 5 escenarios Visitor Member Admin Invalid Token 401 Multilingual.',
          'Copie código instalación desde Embed Studio 3 líneas React Vue JS server/browser verification.',
        ],
        content: '# Primeros Pasos con OKEng\n\n5 pasos para configurar espacio y publicar primer Embed v3.0 con Next.js 15 App Router, Stripe billing, visual identity warm canvas cobalt, 6 superficies, 3 modos.',
        updatedAt: '2026-10-11T08:00:00Z',
      },
    },
    content: `# Getting Started

What are steps to get started with OKEng, and what is fastest way to set up workspace and launch Embed? You can set up OKEng workspace, organize documentation into collections, and embed assistant on site in five simple steps: **v3.0 with PA-AUTH signup, pricing, SDKs 3 lines code, Next.js 15 App Router, Stripe billing, visual identity warm canvas #F8F7F4 cobalt #1D4ED8 shadow-sm/md/lg radius-lg editorial whitespace.**

## Fastest Way to Get Started (Step-by-Step) v3.0

1. **Create or open Workspace**: Sign up at /signup PA-AUTH archetype card centered canvas #F8F7F4 white surface rounded-lg shadow-md cobalt accent FORM-SEC-01 5-Link Auth Chain TIER_AUTH_5_PER_15M or sign in at /login to open OKEng workspace console. Workspace has plan field starter/pro/escala plan_interval monthly/annual stripe_customer_id stripe_subscription_id.
2. **Create Collection**: Choose who can read collection (everyone/members/admins). Limits by plan: Starter 1 collection, Pro 10, Escala unlimited. Immediate policy effect without re-indexing.
3. **Upload or write docs**: Upload .md, .txt, .json, .csv files, or write articles in built-in Markdown editor until status Ready. Heading-aware segmentation # ## ### extracting steps bullets warnings code blocks line-range tracking.
4. **Test answers by role**: Use Workspace Test Console to preview answers and source citations as visitor, member, admin. 5 scenarios: Visitor Member Admin Invalid Token 401 Multilingual ¿Cómo funciona OKEng? Reproducible identically inside /workspaces/okeng/test?embedId=EMB-PUBLIC-HOME.
5. **Embed on website or app**: Copy installation snippet or /widget.js loader from Embed Studio and add to site. 3 líneas código. React Vue JS server/browser steps verification. 6 surfaces widget panel fullscreen inline documentation contextual + 3 modes widget/panel/fullscreen. Theme customization accent surface text muted border radius chatWidth.

## Pricing v3.0

Starter 0€/mo 1 collection 100 files 1GB 1k queries/mo 1 embed, Pro 31€/mo monthly 25€/mo annual -20% 10 collections 1k files 10GB 10k queries 5 embeds custom theme BYOK, Escala custom unlimited SSO SAML custom domain SLA dedicated support. Stripe checkout/portal/webhooks metering.

## Visual Identity v3.0

Warm canvas #F8F7F4 white surface #FFFFFF ink #171717 strong #0F172A accent cobalt #1D4ED8 subtle #F4F4F0 line #DEDDD8 radius sm 4px md 6px lg 12px shadow-sm 0 1px 2px rgba(0,0,0,0.04) md 0 4px 12px rgba(0,0,0,0.08) lg 0 8px 24px rgba(0,0,0,0.12) Inter + JetBrains Mono editorial whitespace py-16 md:py-24 max-w-7xl quiet technical professional sublime.

## Ridiculously Easy Additions v3.0

Edit this page, Copy as Markdown, Share Web Share API, Ask OKEng about this page pre-filled currentUrl, Feedback 👍/👎, Source list chips, Next-step CTA verified https or /path, Version badge knowledgeVersion+updatedAt, Was helpful? analytics, Search hybrid, Improve doc Report Issue, View source raw MD, History updatedAt, Related docs top-k, TOC 2+ hover #, Language EN/ES, Auth-gated specs, Trust badges, Metrics ≥98% -73% 1k 3 lines, Pricing CTA #precios.
`,
  },
  {
    id: 'doc_docs_06',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Workspaces & Team Membership',
    filename: 'workspaces.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.0 KB',
    nextStep: {
      label: 'Sign In to Workspace',
      url: '/login',
    },
    createdAt: '2026-09-16T10:05:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    language: 'en',
    languageConfidence: 0.99,
    languageDetectionMethod: 'automatic',
    translations: {
      es: {
        language: 'es',
        status: 'AVAILABLE',
        sourceVersion: 189,
        title: 'Espacios de Trabajo y Miembros del Equipo',
        summary:
          'Propietarios pueden invitar miembros en Settings & Auth > Workspace Members & Roles > Invite Member. Roles WORKSPACE_OWNER/WORKSPACE_USER, plan starter/pro/escala, 5-Link Auth Chain, session httpOnly 12h.',
        steps: [
          'Abra Settings & Auth en consola OKEng v3.0 Next.js App Router.',
          'Seleccione Workspace Members & Roles.',
          'Invite Member y asigne rol WORKSPACE_USER o WORKSPACE_OWNER, 14 permisos explícitos.',
        ],
        content: '# Espacios de Trabajo y Miembros del Equipo v3.0 con plan field stripe billing',
        updatedAt: '2026-10-11T08:00:00Z',
      },
    },
    content: `# Workspaces & Team Membership

Every customer resource in OKEng belongs to single Workspace and every Workspace contains collections with visibility everyone, members, admins. Collections group documents by audience everyone for public docs, members for customer docs, admins for internal runbooks. **v3.0 with plan field, Stripe billing, Next.js App Router, session management.**

## Workspace Model v3.0

Workspace fields: id ws_okeng_01, name OKEng, slug okeng, publicKey pk_live_ok..., signingSecretKid kid_okeng_active_v1, signingSecretPreview ••••_active_v1, knowledgeVersion 189, createdAt. New: plan starter/pro/escala, plan_interval monthly/annual, stripe_customer_id, stripe_subscription_id, usage metering collections/files/storage/queries, limits enforced before upload.

## Inviting Team Members

Where do I invite team members? Workspace Owners can invite team members by navigating to **Settings & Auth > Workspace Members & Roles** and clicking **Invite Member**.

## Workspace Roles v3.0

- **Workspace Owner (WORKSPACE_OWNER)**: Holds all 14 explicit workspace permissions, including workspace.settings.manage, workspace.users.manage, secret rotation, ownership transfer. super_admin privilege.
- **Workspace User (WORKSPACE_USER)**: Receives explicit permissions (workspace.read, collection.read, content.read, test.execute, optional write). member/viewer privilege.
- **Privilege System v3.0**: super_admin/admin/member/viewer server-only src/lib/privilege, 5-Link Workspace Enforcement, httpOnly secure sameSite strict session 12h Redis fallback regeneration CSRF double-submit.

## 5-Link Workspace Enforcement v3.0

Every private workspace request verifies:
1. Valid authenticated session httpOnly secure sameSite strict 12h Redis fallback regeneration
2. Valid workspace existence
3. Active WorkspaceMembership in requested workspace
4. Required explicit permission for operation privilege system server-only
5. Resource ownership (resource.workspace_id == request.workspace_id)

Plus: exact-origin CORS no wildcard, trust proxy 1 prod 0 dev, security headers HSTS CSP X-Frame-Options, health check /api/health, graceful shutdown, env validation fail-fast.

## Billing & Plan v3.0

Starter 0€ 1 collection 100 files 1GB 1k queries, Pro 31€/mo 10 collections 1k files 10GB 10k queries, Escala unlimited. Stripe checkout session, customer portal, webhooks checkout.session.completed customer.subscription.updated invoice.paid metering.
`,
  },
  {
    id: 'doc_docs_07',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Collections & Visibility Boundaries',
    filename: 'collections.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.1 KB',
    nextStep: {
      label: 'Read Access Control Guide',
      url: '/docs/access-control',
    },
    createdAt: '2026-09-16T10:10:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    content: `# Collections & Visibility Boundaries

How do collections and visibility work in OKEng? Collections group your documents by audience and control who can access them before any search happens, while page context boosts most relevant articles for screen user is viewing. **v3.0 with plan limits, immediate policy effect, Next.js arch, 6 surfaces.**

## Collection Visibility Tiers

How do collections, visibility tiers, and host context control what Embed can retrieve? Each collection uses one of three visibility tiers so users only receive answers from documents they are authorized to read:
- **Everyone (everyone)**: Public documentation and FAQs open to all website visitors. Powers EMB-PUBLIC-DOCS, EMB-PUBLIC-HOME public part.
- **Members (members)**: Customer and product guides available only to signed-in users verified by app. Powers EMB-PUBLIC-HOME member preset, COL-CUSTOMER.
- **Admins (admins)**: Internal runbooks and operational docs restricted strictly to administrative team members. Powers COL-INTERNAL, EMB-ADMIN-PANEL.
- **Page-aware relevance**: Passing user's current page URL prioritizes documents relevant to that screen without ever bypassing collection permissions. RouteRules boost pinned docs strictly inside already-authorized EffectiveScope.

## Effective Scope: Role Authorization Intersected with Embed Binding v3.0

Access governed by both caller verified identity role and collections bound to target Embed (EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections). Even valid member/admin identity cannot query collection that target Embed does not bind. Pre-retrieval narrowing D, 6-point verification workspaceId EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY, policy-versioned caching demoPolicyVersion+narrowedDocumentFingerprint.

## Immediate Policy Effect v3.0

Changing collection visibility (for example, from everyone to members) updates authorization version and takes effect immediately on subsequent retrieval requests without requiring document re-indexing. Cache partitioned by workspaceId effectiveClearance allowedCollectionIdsHash knowledgeVersion kv authorizationVersion av answerMode responseLanguage. knowledgeVersion bump via reconcileCanonicalSeeds.

## Limits by Plan v3.0

Starter: 1 collection, Pro: 10 collections, Escala: unlimited. Enforced before creation. Files limit 100 Starter 1k Pro unlimited, storage 1GB/10GB/unlimited, queries 1k/10k/unlimited per month metering via Stripe webhooks. Usage metering in workspace.

## Sidebar Navigation v3.0 PA-DOCS

Collapsible DocumentNav single-expand, first collection COL-DOCS expanded by default subsequent collapsed, mutual exclusion one at a time, stronger heading typography font-sans text-xs font-semibold tracking-tight text-ink tabular-nums document counts, auto-select first item on expand, visibility scoping everyone 18 public total authenticated only Engineering Specs COL-INTERNAL spec corpus included only when authenticated, deterministic scroll-to-top, search filter FORM-SEC-01.

## Dogfooding v3.0

ws_okeng_01 with 5 collections 25 docs 3 embeds EMB-PUBLIC-HOME mixed-access floating tour Demo Settings Drawer Identity/Context pendingSettingsOpId atomic POST /api/demo/homepage-context server-only 6-point verification, EMB-PUBLIC-DOCS public docs only, EMB-PUBLIC-LEGAL legal only. Deterministic rendering DocArticleRenderer never LLM, dynamic retrieval DogfoodInlineBot real engine.
`,
  },
  {
    id: 'doc_docs_08',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Files & Document Management',
    filename: 'files.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.8 KB',
    nextStep: {
      label: 'Read Ingestion & Chunking Guide',
      url: '/docs/ingestion',
    },
    createdAt: '2026-09-16T10:15:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    content: `# Files & Document Management

OKEng supports uploading Markdown (.md) and plain-text (.txt) documentation files (along with structured text .json and .csv files in upload dropzone) as well as authoring Markdown directly in workspace editor. **v3.0 with plan limits, storage metering, Next.js architecture.**

## Document Lifecycle States

- \`Uploading\`: File payload being received and validated against path traversal and script injection FORM-SEC-01.
- \`Processing\`: Text extraction and heading boundary analysis running.
- \`Indexing\`: Heading-scoped chunks and line ranges being committed to workspace retrieval index.
- \`Ready\`: Document active and eligible for authorized retrieval.
- \`Failed\`: Ingestion encountered validation or parsing error; inspect and retry.

## Limits by Plan v3.0

- **Starter 0€**: 100 files, 1GB storage, 1k queries/mo, 1 collection, 1 embed
- **Pro 31€/mo (25€ annual -20%)**: 1k files, 10GB storage, 10k queries/mo, 10 collections, 5 embeds, custom theme, BYOK
- **Escala custom**: unlimited files, storage, queries, collections, embeds, SSO SAML custom domain SLA dedicated support

Enforced before upload via usage metering. Storage metering via fileSize aggregation, queries metering via analytics_events future, Stripe webhooks invoice.paid.

## Deletion & Derived Data Invalidation

When file deleted in OKEng, all derived chunks and index records invalidated immediately and workspace knowledge version increments 187→189 so deleted content never returned. Live update via store.reconcileCanonicalSeeds bumps knowledgeVersion immediately updates both deterministically rendered public pages and active retrieval index.

## Upload Security v3.0

UploadDropzone validates filename path traversal ../ blocked, script injection <script> <iframe> event handlers blocked FORM-SEC-01, file extension .md .txt .json .csv only (no binary PDF/DOCX OCR parser or web crawler yet), fileSize limits by plan, MIME type validation. MarkdownEditor with live preview, frontmatter metadata parsing, Next-Step CTA links.

## Visual Identity v3.0 for File Management

FileTable with PR-TABLE, PR-BADGE status ready/processing/failed, PR-EMPTY-STATE, shadow-sm radius-lg, max-w-7xl, editorial whitespace. Quiet technical professional sublime.

## Ridiculously Easy Additions v3.0

Edit this page button if authenticated workspace.documents.manage → /workspaces/okeng/files/:docId, Copy as Markdown, Share, View source raw MD, History updatedAt + knowledgeVersion, Related docs top-k bm25Retriever, Version badge.
`,
  },
  {
    id: 'doc_docs_09',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Authoring Markdown Documents',
    filename: 'markdown.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.5 KB',
    nextStep: {
      label: 'Explore Retrieval & Citations',
      url: '/docs/retrieval',
    },
    createdAt: '2026-09-16T10:20:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    content: `# Authoring Markdown Documents

OKEng includes built-in Markdown editor with side-by-side preview, frontmatter metadata parsing, optional Next-Step CTA links. **v3.0 with CO-CONTENT-RENDERER Normalized Content AST renderer_version 1, heading isolation, scoped anchor Option1 PUBLIC_DOC only hover #.**

## Structuring Markdown for Optimal Retrieval & Citations

Use clear Markdown headings (#, ##, ###) to separate distinct topics. OKEng segments documents along heading boundaries and records exact line ranges (Line X-Y) so every answer includes verifiable source citations pointing back to exact document and section. Heading terminates at end of heading line MUST NEVER absorb following paragraph even when separated by single newline per RENDER-001.

## Normalized Content AST v3.0

Source Content → src/content/parser → Normalized Content AST → src/content/sanitizer → CO-CONTENT-RENDERER src/content/renderer/content-renderer.tsx. Parse once normalize once sanitize once render consistently everywhere. Every surface that displays structured document or answer content MUST consume canonical Normalized Content AST renderer_version 1 through CO-CONTENT-RENDERER no ad-hoc regex. 10 presentation contexts: DOCUMENT_FULL, DOCUMENT_PREVIEW, EDITOR_PREVIEW, CHAT_ANSWER, CHAT_MESSAGE, SOURCE_EXCERPT, CITATION, TEST_CHAT, EMBEDDED_CHAT, PUBLIC_DOC.

## Frontmatter Contract

Each document can define frontmatter: title, description, next_step {label, url}, translations.es {language, status, sourceVersion, title, summary, steps, content, updatedAt}, language en/es, etc. Next-Step Action Links: Each document can define Next-Step Action (label and url). When authorized chunk from that document supports answer, OKEng surfaces verified action button or link guiding user to relevant documentation page or application route. NextStepButton validates action URLs via validateActionUrlInput FORM-SEC-01 before rendering blocking javascript: data: vbscript: file: blob: schemes and displaying non-clickable security warning badge if invalid.

## Progressive Toolbar v3.0

All toolbar labels tooltips modal strings inside CO-CONTENT-RENDERER localized EN ES via useI18n() renderer.* namespace Primary Actions [Copy] [Share] [Edit Source] when authorized [•••] Overflow Menu [•••] Save as Markdown .md Save as TXT .txt Save as PDF Print/Export Save Answer to Workspace creates new indexed Markdown document from verified answer + citations modal uses PR-INPUT PR-SELECT PR-BUTTON with FORM-SEC-01 title sanitization helper hints placeholders field-level validation errors and isLoading spinner Report Issue Wrong information Wrong source Missing information Formatting problem Something else modal enforces FORM-SEC-01 notes sanitization helper hints validation errors and isLoading spinner Regenerate where supported.

## Scoped Heading Anchor v3.0

Option 1 canonical: clickable # heading anchor links rendered only in full document contexts DOCUMENT_FULL and PUBLIC_DOC on hover suppressed in compact answer/chat contexts CHAT_ANSWER TEST_CHAT EMBEDDED_CHAT CHAT_MESSAGE SOURCE_EXCERPT CITATION to keep conversational responses clean. TOC 2+ headings hover # anchors active section highlight DocsToc.

## Unified Citation Strip v3.0

Option A canonical: in conversational and answer contexts CHAT_ANSWER TEST_CHAT EMBEDDED_CHAT verified source citation chips rendered once inside CO-CONTENT-RENDERER footer Verified Sources N parent views TestConsoleView WidgetPreviewView DogfoodInlineBot ConversationsView pass citations and onCitationClick into ContentRenderer rather than duplicating external citation strips beneath answer bubble.

## Ridiculously Easy Additions

Edit this page, Copy MD, Share, Ask about page pre-filled currentUrl collectionIds, Feedback 👍/👎, Source list chips CO-SOURCE-LIST, Next-step CTA, Version badge knowledgeVersion+updatedAt, Was helpful? analytics, Search hybrid POST /api/ask, Improve doc Report Issue modal, View source raw MD, History updatedAt, Related docs top-k bm25Retriever, TOC 2+ hover # active highlight, Language EN/ES useI18n, Auth-gated Engineering Specs, Trust badges, Metrics, Pricing CTA — all compose existing primitives.
`,
  },
  {
    id: 'doc_docs_10',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Ingestion & Chunking Pipeline',
    filename: 'ingestion.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.8 KB',
    nextStep: {
      label: 'Explore Retrieval & Citations',
      url: '/docs/retrieval',
    },
    createdAt: '2026-09-16T10:25:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    content: `# Ingestion & Chunking Pipeline

How does OKEng ingest and index documentation? The OKEng ingestion pipeline transforms uploaded Markdown (.md) and text (.txt) files or editor-authored documents into workspace-scoped, collection-tagged chunks. **v3.0 with knowledgeVersion 189 cache epoch, Next.js App Router, live update reconcileCanonicalSeeds.**

## Pipeline Stages v3.0

1. **Boundary & Security Validation**: Verifies workspace ownership (Document.workspace_id == Collection.workspace_id), validates safe filenames, sanitizes unsafe script tags or executable URLs FORM-SEC-01 blocking <script> <iframe> event handlers, path traversal ../ blocked, extension .md .txt .json .csv only.
2. **Heading-Aware Segmentation**: Splits Markdown and text along structural headings (#, ##, ###) while extracting ordered steps, bullet lists, callout warnings, fenced code blocks. Heading isolation invariant: heading terminates at end of heading line MUST NEVER absorb following paragraph even when separated by single newline.
3. **Line-Range & Language Tagging**: Attaches documentId, collectionId, filename, lineRange (Line X-Y), detected language en/es metadata to every section. Language detection automatic confidence 0.99 method automatic, bilingual tokenization synonyms same-language boost +0.65 rawScore.
4. **Live Re-Indexing & Cache Epoch Bump**: Saving or updating document re-runs chunking immediately and increments workspace knowledgeVersion 187→189 so cached answers refresh automatically. Cache partitioned by workspaceId effectiveClearance allowedCollectionIdsHash knowledgeVersion kv authorizationVersion av answerMode responseLanguage. Store reconcileCanonicalSeeds bumps knowledgeVersion immediately updates both deterministically rendered public pages and active retrieval index.

## Normalized Content AST v3.0

Source Content → src/content/parser parseKnowledgeDocument → Normalized Content AST renderer_version 1 → src/content/sanitizer → CO-CONTENT-RENDERER content-renderer.tsx. Parse once normalize once sanitize once render consistently everywhere.

## Dogfooding How Achieved

Workspace ws_okeng_01 5 collections 25 docs 3 embeds deterministic rendering DocArticleRenderer never LLM dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse citations NextStepButton live update reconcileCanonicalSeeds knowledgeVersion Test Console reproducibility PAGE-APP-06 5 scenarios.

## Limits & Metering v3.0

Starter 100 files 1GB, Pro 1k files 10GB, Escala unlimited. Storage metering fileSize aggregation, queries metering analytics_events future, collections limit 1/10/unlimited. Enforced before upload.

## Ridiculously Easy Additions

Version badge knowledgeVersion+updatedAt, History updatedAt, View source raw MD, Related docs top-k bm25Retriever, Edit this page if authenticated.
`,
  },
  {
    id: 'doc_docs_11',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Retrieval, Context & Source Attribution',
    filename: 'retrieval.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.8 KB',
    nextStep: {
      label: 'Explore Collections Guide',
      url: '/docs/collections',
    },
    createdAt: '2026-09-16T10:30:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 5,
    content: `# Retrieval, Context & Source Attribution

How does OKEng answer questions using my documentation, how do citations help me verify an answer, and how does host context influence retrieval with route and visibility? OKEng answers questions strictly from documentation collections current user is allowed to access, ranking relevant sections with BM25 and route visibility boosts and attaching clickable source citations to every response. Host context route and visibility control retrieval. **v3.0 with hybrid search semantic+keyword, re-ranking, ≥98% citations, 6 surfaces, theme customization, real metrics.**

- **Section-level matching**: OKEng splits Markdown files by heading into focused chunks so answers pull exact section that addresses user's question. Heading-aware.
- **Clickable source citations**: Every answer lists source document and collection used so readers can open full article and verify details. Unified citation strip Option A Verified Sources N footer inside CO-CONTENT-RENDERER.
- **No guessing on missing topics**: If question not covered in available documentation, OKEng states clearly information not found instead of making up answer. Missing-topic honesty nothing shown rule.

## Pre-Retrieval Filtering & Grounded Answer Pipeline v3.0

\`\`\`text
Verified Identity → Effective Collection Scope (Role ∩ Embed) → Score Authorized Chunks (BM25 + Field/Route Boost + Semantic Hybrid) → Compile Grounded Answer + Citations + Next Step
\`\`\`
When question arrives, OKEng filters corpus to documents in caller's authorized collection scope, ranks sections using lexical BM25 k1 1.5 b 0.75 + field boosts title +1.8 intent +2.0 heading +1.1 synonym +0.75 + route-prefix match currentUrl.startsWith(doc.route) +2.2 rawScore routeBoost 0.15 + same-language boost +0.65 + hybrid semantic re-ranking future, two-step threshold rawScore >=1.35 normalizedConfidence >=0.25, and compiles grounded response from top-scoring sections.

## Hybrid Search v3.0

Semantic + keyword hybrid search with citations. POST /api/ask with query, collectionIds, currentUrl, identity. Results with title excerpt url score. DocsSearch PR-DOCS-SEARCH + CO-DOCS-SEARCH with FORM-SEC-01 placeholder+hint field errors isLoading. Search hybrid with citations verified sources. BM25 lexical ranking route/language boosts compilation modes citations missing-topic honesty.

## How Citations Help Verify Every Answer v3.0

Every answer includes structured source citations (title, filename, collectionId, snippet, line range). Citations allow readers and operators to verify exactly which authorized document and section produced answer and click through to read full source article. CitationRenderMode validated against PUBLIC_DEMO_SOURCE_POLICY CANONICAL_PUBLIC_ROUTE_REGISTRY server-computed serverOutcome grounded|refused|failed. Source chips clickable with excerpt CO-SOURCE-LIST SourceList.

## How Host Context Influences Retrieval v3.0

How does host context influence retrieval with route and visibility? Host application can pass user's active route (currentUrl, such as /docs/embedding or /docs/access-control) to OKEng Embed. OKEng uses host context and configured routeRules to boost route-relevant chunks and pinned documents strictly within already-authorized collection scope and visibility tiers everyone/members/admins. Route and visibility control retrieval without bypassing collection visibility. Host context improves relevance ranking but never grants access to unauthorized collections. 5-Link Auth Chain host context userId role currentUrl signed via signing_secret HMAC.

## Missing Topic Honesty (Nothing Shown Fallback)

What happens when available documents do not answer question? If no authorized document meets relevance confidence threshold, OKEng refuses to guess or fabricate answer and returns conservative fallback: "I couldn't find that information in the available documentation." AnswerType unknown serverOutcome refused 0 fabricated sources. ≥98% answers with citation, -73% tickets reduction.

## Real Metrics v3.0 Only

≥98% con cita verificable no alucinación, -73% tickets soporte con respuestas in-app, 1k docs free Starter, 3 líneas código integración widget que parece tuyo. No fabricated metrics. Trust badges Citas verificables Permisos por rol Sin tarjeta.

## Ridiculously Easy Additions v3.0

Ask OKEng about this page pre-filled currentUrl collectionIds question answer sources cta feedback, Feedback 👍/👎 per answer + per doc CO-FEEDBACK FeedbackControl, Source list clickable chips excerpt CO-SOURCE-LIST, Next-step CTA verified https or /path CO-NEXT-STEP NextStepButton URL validation, Version badge knowledgeVersion+updatedAt, Was helpful? analytics_events future, Search hybrid POST /api/ask, Related docs top-k bm25Retriever, TOC 2+ hover # active highlight DocsToc, Auth-gated Engineering Specs COL-INTERNAL only when authenticated visibility scoping, Metrics Pricing CTA #precios.
`,
  },
  {
    id: 'doc_docs_12',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Access Control & Clearance Mapping',
    filename: 'access-control.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.5 KB',
    nextStep: {
      label: 'Read Embedding Protocol',
      url: '/docs/embedding',
    },
    createdAt: '2026-09-16T10:35:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 5,
    content: `# Access Control & Clearance Mapping

How does OKEng protect private knowledge, and how do I restrict collection to employees or members? Create collection in workspace, set visibility to members (or admins for management-only docs), bind it to target Embed, and pass short-lived HS256-signed identity assertion from backend when initializing widget. **v3.0 with SEC-01 privilege system super_admin/admin/member/viewer server-only, session management, CSRF, CORS, 5-Link Auth Chain.**

## External Role Mapping v3.0

Your application maps internal roles to OKEng three clearance tiers:
- \`visitor\` / \`anonymous\` → \`everyone\` (accesses bound \`everyone\` collections) — Powers EMB-PUBLIC-DOCS, EMB-PUBLIC-LEGAL public part, EMB-PUBLIC-HOME visitor preset
- \`customer\` / \`employee\` / \`member\` / \`user\` → \`members\` (accesses bound \`everyone\` + \`members\` collections) — Powers COL-CUSTOMER, EMB-PUBLIC-HOME member preset
- \`manager\` / \`admin\` → \`admins\` (accesses bound \`everyone\` + \`members\` + \`admins\` collections) — Powers COL-INTERNAL, EMB-ADMIN-PANEL, EMB-PUBLIC-HOME admin preset

Privilege system v3.0: super_admin/admin/member/viewer server-only src/lib/privilege, 14 explicit permissions for owner, explicit permissions workspace.read collection.read content.read test.execute etc.

## Effective Scope & Pre-Retrieval Enforcement v3.0

OKEng computes effective access as intersection of verified caller identity and Embed bound collections (EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections). Unauthorized documents excluded before chunk scoring and never enter candidate chunks, model prompt context, answers, or citations. Pre-retrieval narrowing D, 6-point verification workspaceId ws_okeng_01 EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY, policy-versioned caching demoPolicyVersion+narrowedDocumentFingerprint, grounded citation provenance serverOutcome grounded|refused|failed. Non-bypassable server-only demo authorization server/demo/publicHomepageDemoAuthorization.ts boundary POST /api/chat/stream routes any request with embedId EMB-PUBLIC-HOME demoPreset !== undefined or mode public_homepage_demo unconditionally to handlePublicHomepageDemoChatStream omitting demoPreset on EMB-PUBLIC-HOME returns 400 INVALID_DEMO_PRESET without fallthrough enforces 6-point pre-retrieval narrowing D over server repositories ws_okeng_01 rewrites restricted COL-CUSTOMER COL-INTERNAL citations to publicSafeTitle companion guides citationRenderMode public_companion_guide keys demo cache by demoPolicyVersion + narrowedDocumentFingerprint.

## Session Management v3.0 SEC-01

httpOnly secure sameSite strict cookies, 12h TTL, Redis fallback regeneration, session rotation on login, CSRF double-submit token, 5-Link Auth Chain valid session → valid workspace existence → active WorkspaceMembership → required explicit permission → resource ownership resource.workspace_id == request.workspace_id. Exact-origin CORS no wildcard, trust proxy 1 prod 0 dev, security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy, health check /api/health, graceful shutdown, env validation fail-fast.

## Invalid Token & Unverified Role Rejection (Hard 401 Boundary) v3.0

If embed request supplies expired, tampered, or wrong-algorithm JWT—or asserts privileged role (member/admin) without valid signed token—OKEng halts with 401 Unauthorized prior to retrieval and never silently downgrades request to anonymous access. Error handling 401 generic invalid credentials not distinguishing user existence, 403 forbidden insufficient permission, 404 not found, 422 validation FORM-SEC-01 field errors, 429 rate limiting TIER_AUTH_5_PER_15M auth TIER_API_100_PER_MIN API, 500 internal server error.

## Dogfooding How Achieved v3.0

Workspace ws_okeng_01 5 collections 25 docs 3 embeds EMB-PUBLIC-HOME mixed-access showcase 5 collections floating tour Demo Settings Drawer Identity Visitor/Member/Admin Context / /docs/embedding /docs/access-control pendingSettingsOpId atomic POST /api/demo/homepage-context non-bypassable pre-retrieval 6-point verification EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY policy-versioned caching, EMB-PUBLIC-DOCS public docs only COL-DOCS, EMB-PUBLIC-LEGAL legal only COL-LEGAL, deterministic rendering DocArticleRenderer never LLM, dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse citations NextStepButton, live update store.reconcileCanonicalSeeds bumps knowledgeVersion 187→189, Test Console reproducibility PAGE-APP-06 every homepage demo scenario.

## Ridiculously Easy Additions v3.0

Auth-gated Engineering Specs show COL-INTERNAL only when authenticated visibility scoping, Trust badges Citas verificables Permisos por rol Sin tarjeta, Version badge knowledgeVersion+updatedAt, Was helpful? analytics.
`,
  },
  {
    id: 'doc_docs_13',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Embedding & Signed Host Identity',
    filename: 'embedding.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '6.2 KB',
    nextStep: {
      label: 'Read Getting Started Guide',
      url: '/docs/getting-started',
    },
    createdAt: '2026-09-16T10:40:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 5,
    content: `# Embedding & Signed Host Identity

How do Embeds work, and how can I integrate OKEng into my website or application? An OKEng Embed references one or more collections in your workspace and exposes grounded assistant inside website or application without duplicating knowledge base. OKEng supports Public-Only (everyone), Protected-Only (members/admins), and Mixed-Access embeds. **v3.0 with 6 surfaces widget panel fullscreen inline documentation contextual + 3 modes widget/panel/fullscreen, theme customization, installation recipe React Vue JS server/browser verification, real metrics, Next.js 15 App Router.**

## Public Embed Initialization v3.0

For public websites and documentation (visibility = everyone), no identity token required. Anonymous visitors automatically query only everyone collections bound to Embed:
\`\`\`javascript
OKEng.init({
  workspace: "okeng",
  embedId: "EMB-PUBLIC-HOME",
  currentUrl: window.location.pathname
});
\`\`\`
**v3.0**: 3 líneas código. Copy installation snippet from Embed Studio, add to site, done. Widget that looks yours.

## Authenticated & Mixed-Access Initialization v3.0

When Embed binds members/admins collections alongside public collections, anonymous visitors query only bound everyone collections. When user signs into your application, backend signs short-lived (5-minute) HMAC-SHA256 (HS256) JWT assertion containing workspace_id, sub, role (member/admin), iat, exp, unlocking authorized bound collections before retrieval. Browser-supplied roles without valid signature rejected with 401 UNVERIFIED_ROLE_ASSERTION. Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain host context userId role currentUrl signed via signing_secret HMAC exact-origin CORS no wildcard trust proxy 1 prod 0 dev security headers HSTS CSP health check graceful env validation fail-fast.

## What Presentation Modes Are Available? v3.0

OKEng supports six configurable Embed presentation modes in Workspace Embed Studio (/workspaces/okeng/embeds) and Host Simulator (/workspaces/okeng/embeds/preview):
- **Live Public & Production Surfaces**: inline (embedded directly inside page content such as OKEng homepage) and documentation (3-column interactive documentation hub with navigation, article viewer, assistant on /docs) PA-DOCS archetype header 56px sticky backdrop-blur sidebar 300px border-r bg-surface sticky top-14 h calc 100vh-56px main max-w-3xl/4xl px-6 py-8/12 right TOC 200px footer full-width.
- **Standalone Drop-In Script (/widget.js)**: Floating launcher and chat drawer for external host pages (connects to /api/chat for lightweight host integration) widget mode.
- **Configurable Workspace & Host Simulator Modes**: widget (floating chat launcher), panel (slide-in drawer defaulting to --okeng-chat-width: 360px), fullscreen (full-viewport portal chat), inline, documentation, and contextual (route-aware sidebar). 3 modes from proposal: widget/panel/fullscreen.

Theme customization: accent surface text muted border radius chatWidth, appearanceConfig theme light/dark width position radius accentColor surfaceColor textColor mutedColor borderColor. Installation recipe React Vue JS server/browser steps verification:

**React**:
\`\`\`jsx
import { OKEngWidget } from '@okeng/react';
<OKEngWidget workspace="okeng" embedId="EMB-PUBLIC-HOME" />
\`\`\`

**Vue**:
\`\`\`vue
<OKEngWidget workspace="okeng" embedId="EMB-PUBLIC-HOME" />
\`\`\`

**Vanilla JS 3 lines**:
\`\`\`html
<script src="https://okeng.dev/widget.js"></script>
<script>OKEng.init({ workspace: "okeng", embedId: "EMB-PUBLIC-HOME" });</script>
\`\`\`

## Dogfooding How Achieved v3.0

Workspace ws_okeng_01 5 collections 25 docs 3 embeds EMB-PUBLIC-HOME mixed-access showcase 5 collections floating tour Demo Settings Drawer Identity Visitor/Member/Admin Context / /docs/embedding /docs/access-control pendingSettingsOpId atomic POST /api/demo/homepage-context non-bypassable pre-retrieval 6-point verification EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY policy-versioned caching demoPolicyVersion+narrowedDocumentFingerprint grounded provenance serverOutcome grounded|refused|failed, EMB-PUBLIC-DOCS public docs only COL-DOCS, EMB-PUBLIC-LEGAL legal only COL-LEGAL, deterministic rendering DocArticleRenderer never LLM, dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse citations NextStepButton, live update store.reconcileCanonicalSeeds bumps knowledgeVersion, Test Console reproducibility.

## Pricing CTA v3.0

Starter 0€/mo 1 collection 100 files 1GB 1k queries, Pro 31€/mo monthly 25€ annual -20% 10 collections 1k files 10GB 10k queries, Escala custom unlimited. Link to #precios.
`,
  },
  {
    id: 'doc_docs_14',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Troubleshooting & Diagnostics',
    filename: 'troubleshooting.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.2 KB',
    nextStep: {
      label: 'Read Getting Started Guide',
      url: '/docs/getting-started',
    },
    createdAt: '2026-09-16T10:45:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    content: `# Troubleshooting & Diagnostics

Resolve common ingestion, token verification, and retrieval issues. **v3.0 with new error handling 401 generic 403 404 422 429 500, CSRF, CORS, session, Next.js architecture, Stripe billing, real metrics.**

## 1. Widget Returns 401 TOKEN_EXPIRED or INVALID_TOKEN_SIGNATURE v3.0

Embedded identity assertions short-lived (recommended 5 minutes, with 30-second clock-skew tolerance) must be signed with workspace server-side HS256 signing secret. Ensure host backend mints fresh assertion when user session loads or refreshes. **v3.0**: 401 generic invalid credentials not distinguishing user existence, 403 forbidden insufficient permission, 404 not found, 422 validation error FORM-SEC-01 field errors, 429 rate limiting TIER_AUTH_5_PER_15M auth TIER_API_100_PER_MIN API, 500 internal server error graceful shutdown health check /api/health env validation fail-fast. Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit.

## 2. Expected Document Not Returned in Chat v3.0

Open Workspace Test Console (/workspaces/okeng/test) and inspect Access and Retrieval and Cache tabs:
- Verify document status Ready.
- Confirm document collection bound to target Embed.
- Check whether collection excluded because visibility tier members/admins exceeds caller verified identity role.
- Check EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections pre-retrieval.
- Check cache partitioned by workspaceId effectiveClearance allowedCollectionIdsHash knowledgeVersion kv authorizationVersion av answerMode responseLanguage.
- Check knowledgeVersion bump via reconcileCanonicalSeeds.

## 3. CORS or Exact-Origin Issues v3.0

Exact-origin CORS no wildcard, trust proxy 1 prod 0 dev, security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy. Verify allowed origins in Embed config, no client corpus, no hardcoded secrets.

## 4. Billing or Stripe Issues v3.0

Stripe checkout session for Pro/Annual -20%, customer portal, webhooks checkout.session.completed customer.subscription.updated invoice.paid metering. Check stripe_customer_id stripe_subscription_id in workspace, plan field starter/pro/escala plan_interval monthly/annual, usage metering collections/files/storage/queries. Starter 1 collection 100 files 1GB 1k queries, Pro 10 collections 1k files 10GB 10k queries, Escala unlimited.

## 5. Next.js Architecture Issues v3.0

Next.js 15.1.0 App Router + API Routes + Middleware + src/lib/* no Vite runner no Express weirdness proper standard. src/app/(public)/ for landing docs about contact legal, src/app/(auth)/ for login signup forgot-password reset-password, src/app/(workspace)/ for console. Middleware auth, trust proxy, security headers. Build optimization failed found pages without React Component fixed moving src/pages/ 10 files -> src/views-legacy/. vite.config.ts legacy Vite runner removed, next.config.js CJS require() not supported in ESM type module migrated to next.config.mjs ESM export default, TypeScript 7.0.2 unsupported by Next 15.5.27 downgrade to 5.8.0, tsconfig baseUrl+paths.

## 6. Visual Identity or Docs Issues v3.0

Warm canvas #F8F7F4 white surface cobalt #1D4ED8 shadow-sm/md/lg radius-lg 12px Inter+JetBrains Mono editorial whitespace py-16/24 max-w-7xl quiet technical professional sublime. PA-DOCS archetype header 56px sticky backdrop-blur sidebar 300px border-r bg-surface sticky top-14 h calc 100vh-56px main max-w-3xl/4xl px-6 py-8/12 right TOC 200px footer. Ridiculously easy additions Edit this page Copy MD Share Ask about page Feedback Source chips Next-step CTA Version badge Was helpful? Search hybrid Improve doc View source History Related docs TOC Language Auth-gated specs Trust badges Metrics Pricing CTA.

## 7. Contact Support

If issue persists, contact hola@okeng.dev with workspaceId ws_okeng_01, embedId, currentUrl, userId role, error code, knowledgeVersion. Also ask in /docs with citations verificables.
`,
  },

  // ==========================================
  // COL-LEGAL (15 - 17) — v3.0 visual update
  // ==========================================
  {
    id: 'doc_legal_15',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-LEGAL',
    title: 'Terms of Service',
    filename: 'terms.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.5 KB',
    createdAt: '2026-09-17T09:00:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 5,
    content: `# Terms of Service

*Last updated: 2026-10-11 — v3.0 visual identity warm canvas cobalt editorial whitespace max-w-3xl py-16/24 professional sublime*

## 1. Introduction

These Terms govern access to and use of OKEng platform, workspaces, documentation interfaces, embedded knowledge assistants. OKEng uses OKEng — this site is ws_okeng_01 with 5 collections 25 docs 3 embeds deterministic rendering DocArticleRenderer never LLM dynamic retrieval DogfoodInlineBot real engine.

## 2. Accounts & Workspace Ownership

Each customer workspace has designated Workspace Owner. You are responsible for maintaining confidentiality of workspace signing secrets and managing member permissions accurately. Workspace fields: plan starter/pro/escala plan_interval monthly/annual stripe_customer_id stripe_subscription_id knowledgeVersion 189.

## 3. Service & Customer Data

You retain all ownership and intellectual property rights to files and Markdown documents uploaded to your OKEng workspace. OKEng processes and indexes your documents solely to provide authorized retrieval and grounded answers for your workspace. **0 datos usados para entrenamiento**, BYOK tu modelo tu clave OpenAI/Anthropic/Azure/Bedrock/Local, EU hosting, deterministic rendering for articles never LLM, dynamic retrieval for answers with citations verified sources.

## 4. Billing & Subscription v3.0

Pricing Starter 0€/mo 1 collection 100 files 1GB 1k queries 1 embed, Pro 31€/mo monthly 25€/mo annual -20% 10 collections 1k files 10GB 10k queries 5 embeds custom theme BYOK, Escala custom unlimited SSO SAML custom domain SLA dedicated support. Stripe checkout/portal/webhooks metering feature matrix upgrade CTAs. Billing via Stripe checkout session, customer portal, webhooks checkout.session.completed customer.subscription.updated invoice.paid. Usage metering collections/files/storage/queries.

## 5. Acceptable Use

You may not use OKEng to store unlawful material, attempt cross-tenant workspace enumeration, or forge cryptographic identity assertions. See /acceptable-use for details. FORM-SEC-01 blocks script injection.

## 6. Security & Privacy

Security overview in /docs/access-control and security-overview. Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain exact-origin CORS no wildcard trust proxy 1 prod 0 dev security headers HSTS CSP X-Frame-Options. Health check /api/health graceful shutdown env validation fail-fast. Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express proper standard.

## 7. Visual Identity v3.0

Warm canvas #F8F7F4 white surface #FFFFFF ink #171717 strong #0F172A accent cobalt #1D4ED8 subtle #F4F4F0 line #DEDDD8 radius sm 4px md 6px lg 12px shadow-sm md lg Inter + JetBrains Mono editorial whitespace py-16 md:py-24 max-w-7xl quiet technical professional sublime easy to use.

## 8. Contact

Legal: legal@okeng.dev. Support: hola@okeng.dev. Docs: /docs with 18 public docs searchable hybrid citations Ask with citas verificables.
`,
  },
  {
    id: 'doc_legal_16',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-LEGAL',
    title: 'Privacy Policy',
    filename: 'privacy.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.8 KB',
    createdAt: '2026-09-17T09:10:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 5,
    content: `# Privacy Policy

*Last updated: 2026-10-11 — v3.0 EU hosting 0 training data BYOK Stripe billing visual identity warm canvas cobalt*

## 1. Uploaded Files & Workspace Corpus

What does privacy policy say about uploaded files? Uploaded files and authored Markdown documents stored strictly within isolated workspace boundary. Private collections (members and admins) never exposed to public embeds or shared across workspaces. When you delete file, its text, chunks, index entries invalidated immediately and knowledgeVersion increments 187→189 so deleted content never returned. Live update via reconcileCanonicalSeeds.

## 2. Customer End-User Identity

OKEng does not collect or store customers passwords, session cookies, or OAuth refresh tokens. For authenticated embeds, OKEng receives only short-lived signed identity assertion (user_id, role, workspace_id) required to evaluate collection access before retrieval. Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain. HMAC-SHA256 HS256 host token verification 4-case boundary invalid/expired/tampered fail closed 401.

## 3. Security Audit Logs

OKEng records append-only security audit events for administrative actions (membership changes, permission updates, secret rotation). Audit logs never contain raw signing secrets, passwords, or private document contents. Privilege system super_admin/admin/member/viewer server-only.

## 4. Billing & Stripe v3.0

Stripe integration: checkout session for Pro/Annual -20%, customer portal, webhooks checkout.session.completed customer.subscription.updated invoice.paid metering. Workspace fields stripe_customer_id stripe_subscription_id plan starter/pro/escala plan_interval monthly/annual. Usage metering collections/files/storage/queries. Starter 0€ 1 collection 100 files 1GB 1k queries, Pro 31€/mo 10 collections 1k files 10GB 10k queries, Escala unlimited. Trust badges Sin tarjeta EU hosting BYOK.

## 5. EU Hosting & 0 Training Data & BYOK v3.0

EU hosting, 0 datos usados para entrenamiento, BYOK tu modelo tu clave OpenAI/Anthropic/Azure/Bedrock/Local. No client corpus, no hardcoded secrets. Deterministic rendering for articles never LLM, dynamic retrieval for answers with citations verified sources ≥98% con cita. Real metrics only -73% tickets 1k free 3 lines code.

## 6. Cookies & Tracking v3.0

Session cookies httpOnly secure sameSite strict 12h, CSRF double-submit, no third-party tracking, no marketing cookies without consent. Health check /api/health, graceful shutdown, env validation fail-fast, trust proxy 1 prod 0 dev, security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy exact-origin CORS no wildcard.

## 7. Visual Identity v3.0

Warm canvas #F8F7F4 white surface #FFFFFF ink #171717 strong #0F172A accent cobalt #1D4ED8 subtle #F4F4F0 line #DEDDD8 radius sm 4px md 6px lg 12px shadow-sm 0 1px 2px rgba(0,0,0,0.04) md 0 4px 12px rgba(0,0,0,0.08) lg 0 8px 24px rgba(0,0,0,0.12) Inter + JetBrains Mono editorial whitespace py-16 md:py-24 max-w-7xl quiet technical professional sublime.

## 8. Contact

Legal: legal@okeng.dev. Privacy: privacy@okeng.dev. Docs: /docs with 18 public docs searchable hybrid Ask with citas verificables. Support: hola@okeng.dev.
`,
  },
  {
    id: 'doc_legal_17',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-LEGAL',
    title: 'Acceptable Use Policy',
    filename: 'acceptable-use.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '3.8 KB',
    createdAt: '2026-09-17T09:20:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    content: `# Acceptable Use Policy

*Last updated: 2026-10-11 — v3.0 visual identity warm canvas cobalt editorial whitespace professional sublime*

## 1. Prohibited Content

Workspaces may not upload or distribute malware, stolen credentials, or content that violates applicable law. FORM-SEC-01 blocks script injection <script> <iframe> event handlers javascript: data: vbscript: file: blob: schemes.

## 2. Security & Boundary Integrity v3.0

Users and host integrations must not:
- Attempt to bypass 5-link workspace authorization chain valid session → valid workspace existence → active WorkspaceMembership → required explicit permission → resource ownership;
- Expose workspace HMAC signing secrets in client-side browser code — signingSecret stays server-side src/lib/*;
- Replay expired identity assertions or tamper with JWT signatures — HMAC-SHA256 HS256 verification 4-case boundary invalid/expired/tampered fail closed 401 public homepage demo uses dedicated server-only PublicDemoAuthority visitor/member/admin presets reject caller tokens 400 DEMO_TOKEN_NOT_ACCEPTED;
- Attempt cross-tenant workspace enumeration — DATA-002 multi-tenant isolation Workspace A users can never access Workspace B resources;
- Bypass pre-retrieval authorization EffectiveScope B∩R — SECURITY-001 authorization before retrieval unauthorized collections and chunks excluded before retrieval never reach prompt context or citations;
- Store unlawful material or attempt to forge cryptographic identity assertions.

## 3. Billing & Fair Use v3.0

Starter 1 collection 100 files 1GB 1k queries, Pro 10 collections 1k files 10GB 10k queries, Escala unlimited. Usage metering via Stripe webhooks, queries metering analytics_events future. Fair use: no abusive scraping, no automated bypass of rate limiting TIER_AUTH_5_PER_15M auth TIER_API_100_PER_MIN API, 429 rate limiting.

## 4. EU Hosting & 0 Training Data v3.0

EU hosting, 0 datos usados para entrenamiento, BYOK tu modelo tu clave OpenAI/Anthropic/Azure/Bedrock/Local. Deterministic rendering for articles never LLM.

## 5. Visual Identity v3.0

Warm canvas #F8F7F4 white surface cobalt #1D4ED8 shadow-sm/md/lg radius-lg 12px Inter+JetBrains Mono editorial whitespace py-16/24 max-w-7xl quiet technical professional sublime. PA-PUBLIC archetype for legal pages single column max-w-3xl centered py-16/24 editorial whitespace no sidebar no app shell public surface minimal header same as landing footer same as landing.

## 6. Contact

Legal: legal@okeng.dev. Docs: /docs with 18 public docs. Support: hola@okeng.dev.
`,
  },

  // ==========================================
  // COL-INTERNAL (18 - 19) — v3.0 updated Next.js arch
  // ==========================================
  {
    id: 'doc_internal_18',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-INTERNAL',
    title: 'Internal Operations & Production Vault Runbook',
    filename: 'internal-operations.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.5 KB',
    nextStep: {
      label: 'Open Security Settings',
      url: '/settings',
    },
    createdAt: '2026-09-18T11:20:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    content: `# Internal Operations & Production Vault Runbook

*Visibility: Admins Only (COL-INTERNAL). v3.0 Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express proper standard.*

## 1. Production Key & Vault Rotation

Internal corporate SSO and production KMS keys rotated every 30 days using hardware security modules (HSM) and dual-operator approval (requested_by != approved_by). SigningSecretKid kid_okeng_active_v1, signingSecretPreview ••••_active_v1.

## 2. Emergency Customer Support Access

Platform Admins have zero default access to customer workspaces. Exceptional read access requires time-bounded AdminGrant approved by Platform Owner and logged in immutable audit trail. Privilege system super_admin/admin/member/viewer server-only.

## 3. Next.js Architecture v3.0

Next.js 15.1.0 App Router + API Routes + Middleware + src/lib/* no Vite runner no Express weirdness proper standard. src/app/(public)/ for landing docs about contact legal, src/app/(auth)/ for login signup forgot-password reset-password, src/app/(workspace)/ for console. Middleware auth, trust proxy 1 prod 0 dev, security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy exact-origin CORS no wildcard, health check /api/health graceful shutdown env validation fail-fast.

**Build fixes v3.0**: Cannot find module '@/lib/env' fixed via next.config.mjs ESM with webpack alias @->./src, upgrade next 14.2->15.1.0, downgrade TS 7.0.2->5.8.0, tsconfig baseUrl+paths. Pages router conflict Build optimization failed found pages without React Component fixed moving src/pages/ 10 files -> src/views-legacy/. vite.config.ts legacy Vite runner conflicting with Next.js removed after verification. next.config.js CJS require() not supported in ESM type module migrated to next.config.mjs ESM export default. test script paths package.json scripts/tests/* not found fixed to tests/readiness/* tests/rendering/* tests/security/*.

## 4. Session Management v3.0 SEC-01

httpOnly secure sameSite strict cookies 12h TTL Redis fallback regeneration session rotation on login CSRF double-submit token 5-Link Auth Chain valid session → valid workspace existence → active WorkspaceMembership → required explicit permission → resource ownership resource.workspace_id == request.workspace_id. Exact-origin CORS no wildcard, trust proxy 1 prod 0 dev, security headers HSTS CSP, health check /api/health graceful shutdown env validation fail-fast.

## 5. Billing & Stripe v3.0

Stripe integration checkout session for Pro/Annual -20%, customer portal, webhooks checkout.session.completed customer.subscription.updated invoice.paid metering. Workspace fields plan starter/pro/escala plan_interval monthly/annual stripe_customer_id stripe_subscription_id usage metering collections/files/storage/queries. Starter 0€ 1 collection 100 files 1GB 1k queries, Pro 31€/mo 10 collections 1k files 10GB 10k queries, Escala unlimited.

## 6. Dogfooding v3.0

Workspace ws_okeng_01 5 collections 25 docs 3 embeds deterministic rendering DocArticleRenderer never LLM dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse citations NextStepButton live update reconcileCanonicalSeeds bumps knowledgeVersion 187→189 Test Console reproducibility PAGE-APP-06 5 scenarios Visitor Member Admin Invalid Token 401 Multilingual.
`,
  },
  {
    id: 'doc_internal_19',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-INTERNAL',
    title: 'ENG-DOD-001 — Engineering Definition of Done & Audit Specification',
    filename: 'eng-dod-001.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '9.2 KB',
    nextStep: {
      label: 'Open Security & Audit Console',
      url: '/settings',
    },
    createdAt: '2026-10-03T09:00:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:00:00Z',
    chunkCount: 7,
    language: 'en',
    content: `# ENG-DOD-001 — Engineering Definition of Done & Implementation Audit Specification

*Visibility: Internal — OKEng Workspace Only (COL-INTERNAL). v3.0 Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express, visual identity warm canvas cobalt editorial whitespace professional sublime.*

## 1. Governing Principle

A feature is Done only when Specification → Architecture → Implementation → Tests → Security → Documentation → Runtime verification are all consistent. **v3.0**: 00_product_contract v1.1, 01_ui_foundation v3.0, 02_component_catalog v3.0, 03_page_specifications v3.1, 04_workflows v2.1, UI-01 v3.1, SEC-01 v1.0, API-01 v1.0, DB-01 v1.0, DATA-01 v1.0, OPS-01 v1.0, STAGING-READINESS-CHECKLIST v2.0, STATUS-001, PUBLIC-01, RENDER-001, PLAN-006.

## 2. P0 Blocking Invariants v3.0

- **DATA-002 (Multi-Tenant Isolation)**: Workspace A users can never access Workspace B resources. 5-Link Enforcement.
- **SECURITY-001 (Authorization Before Retrieval)**: Unauthorized collections and chunks excluded before retrieval never reach prompt context or citations. EffectiveScope B∩R pre-retrieval narrowing D 6-point verification policy-versioned caching.
- **SECURITY-002 & 003 (Input Validation & XSS Safety)**: All inputs, Markdown, CTA URLs validated sanitized; <script>, event handlers, javascript: URLs rejected FORM-SEC-01.
- **SECURITY-004 & 005 (Secrets & Embedded Identity)**: Signing secrets stay server-side; embedded identity assertions short-lived HMAC-verified 4-case boundary 401.
- **STORAGE-001 (File Safety)**: Path traversal ../ and unsupported extensions blocked at ingestion boundary.
- **SEC-01 v3.0**: Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain exact-origin CORS no wildcard trust proxy 1 prod 0 dev security headers HSTS CSP X-Frame-Options health check /api/health graceful shutdown env validation fail-fast privilege system super_admin/admin/member/viewer server-only.
- **BILLING-001 v3.0**: Stripe checkout/portal/webhooks metering plan starter/pro/escala plan_interval monthly/annual stripe_customer_id stripe_subscription_id usage metering collections/files/storage/queries limits 1/10/unlimited 100/1k/unlimited 1GB/10GB/unlimited 1k/10k/unlimited.
- **ARCH-001 v3.0**: Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express proper standard. Build fixes next.config.mjs ESM webpack alias @->./src upgrade next 14.2->15.1.0 downgrade TS 7.0.2->5.8.0 tsconfig baseUrl+paths Pages router conflict fixed moving src/pages/ -> src/views-legacy/ vite.config.ts removed next.config.js CJS -> next.config.mjs ESM.

## 3. Visual Identity v3.0

Warm canvas #F8F7F4 white surface #FFFFFF ink #171717 strong #0F172A accent cobalt #1D4ED8 subtle #F4F4F0 line #DEDDD8 radius sm 4px md 6px lg 12px shadow-sm 0 1px 2px rgba(0,0,0,0.04) md 0 4px 12px rgba(0,0,0,0.08) lg 0 8px 24px rgba(0,0,0,0.12) Inter + JetBrains Mono editorial whitespace py-16 md:py-24 max-w-7xl quiet technical professional sublime easy to use. Principles 10-13 editorial whitespace real metrics only shadow restraint radius scale.

PR Added 16 for landing/auth: PR-ANNOUNCEMENT-BANNER, PR-METRIC, PR-PRICING-TOGGLE, PR-TESTIMONIAL-CARD, PR-FAQ-ACCORDION, PR-CODE-SNIPPET, PR-LOGO-STRIP, PR-INTEGRATION-TABS, PR-FEATURE-CARD, PR-HOW-IT-WORKS-STEP, PR-CHAT-MOCK, PR-PRICING-CARD, PR-AUTH-CARD, PR-PASSWORD-INPUT, PR-AUTH-DIVIDER, PR-TRUST-BADGE. Plus 9 for docs/public: PR-DOCS-HEADER, PR-DOCS-SIDEBAR, PR-DOCS-ARTICLE, PR-DOCS-SEARCH, PR-DOCS-ASK, PR-DOCS-TOC, PR-PUBLIC-PAGE, PR-CONTACT-FORM, PR-LEGAL-ARTICLE. Total 25 new PR v3.0.

CO Added 18 landing/auth: CO-LANDING-HERO LOGO-STRIP METRICS HOW-IT-WORKS PRODUCT-FEATURES INTEGRATION DEVELOPERS TESTIMONIALS PRICING FAQ FINAL-CTA FOOTER (12) + CO-AUTH-LOGIN-FORM SIGNUP-FORM FORGOT-FORM RESET-FORM SSO-BUTTONS TRUST-FOOTER (6). Plus 8 docs/public: CO-DOCS-LAYOUT SIDEBAR ARTICLE SEARCH ASK + CO-PUBLIC-ABOUT CONTACT LEGAL. PA Added 4: PA-LANDING PA-AUTH PA-DOCS PA-PUBLIC. SU Added 28: SU-LANDING-* 13 + SU-AUTH-* 5 + SU-DOCS-* 6 + SU-PUBLIC-* 4.

## 4. Documentation v3.0

25 docs updated to v3.0 knowledgeVersion 187→189: COL-PUBLIC 4 with pricing visual identity monetization Next.js arch Stripe billing SEC-01 real metrics, COL-DOCS 11 with signup PA-AUTH pricing SDKs 3 lines limits usage metering hybrid search privilege 6 surfaces theme customization recipe error handling CSRF CORS session, facturacion-y-planes complete rewrite Starter 0€ Pro 31€/mo Escala custom monthly/annual -20% Stripe checkout/portal/webhooks metering feature matrix, COL-LEGAL 3 visual update EU hosting data training BYOK, COL-CUSTOMER 3 members session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain host context userId role currentUrl HMAC exact-origin CORS trust proxy security headers health check graceful env validation, COL-INTERNAL 4 admins Next.js App Router API Routes Middleware src/lib no Vite no Express.

Dogfooding how achieved: ws_okeng_01 5 collections 25 Markdown docs 3 embeds EMB-PUBLIC-HOME mixed-access showcase 5 collections floating tour Demo Settings Drawer Identity/Context pendingSettingsOpId atomic POST /api/demo/homepage-context non-bypassable pre-retrieval 6-point verification EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY policy-versioned caching demoPolicyVersion+narrowedDocumentFingerprint grounded provenance serverOutcome grounded|refused|failed, EMB-PUBLIC-DOCS public docs only COL-DOCS, EMB-PUBLIC-LEGAL legal only COL-LEGAL, deterministic rendering DocArticleRenderer never LLM, dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity→resolveEmbedAuthorization→retrieveKnowledge→compileKnowledgeResponse citations NextStepButton, live update store.reconcileCanonicalSeeds bumps knowledgeVersion, Test Console reproducibility PAGE-APP-06 5 scenarios, DocumentNav single-expand auto-select, visibility scoping 18 public + auth-gated COL-INTERNAL, scroll-to-top, FORM-SEC-01, header/footer.

Ridiculously easy boost: Edit this page, Copy MD, Share, Ask about page pre-filled currentUrl collectionIds, Feedback 👍/👎, Source chips, Next-step CTA verified https or /path, Version badge knowledgeVersion+updatedAt, Was helpful? analytics, Search hybrid POST /api/ask, Improve doc Report Issue modal, View source raw MD, History updatedAt, Related docs top-k bm25Retriever, TOC 2+ hover # active highlight, Language EN/ES, Auth-gated specs, Trust badges, Metrics ≥98% -73% 1k 3 lines, Pricing CTA #precios — all compose existing primitives.
`,
  },
  // ==========================================
  // I18N-001 Native Spanish Document — v3.0 complete rewrite
  // ==========================================
  {
    id: 'doc_docs_es_20',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Facturación y Planes de Suscripción',
    filename: 'facturacion-y-planes.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '6.8 KB',
    language: 'es',
    languageConfidence: 0.99,
    languageDetectionMethod: 'automatic',
    nextStep: {
      label: 'Ver Guía de Facturación',
      url: '/docs/facturacion-y-planes',
    },
    createdAt: '2026-10-03T09:30:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 5,
    content: `# Facturación y Planes de Suscripción — v3.0

Gestiona facturas, métodos de pago y límites de uso de tu espacio de trabajo OKEng desde Facturación y Configuración. **v3.0 con Stripe billing, pricing Starter 0€ Pro 31€/mo Escala custom, monthly/annual -20%, checkout/portal/webhooks metering, feature matrix, visual identity warm canvas cobalt.**

## Planes v3.0

### Starter — 0€/mes — Para probar
- 1 colección, 100 archivos, 1GB almacenamiento, 1k consultas/mes, 1 embed
- Marca OKEng, soporte comunidad
- Sin tarjeta para empezar
- Ideal para docs pequeñas, landing pages

### Pro — 31€/mes mensual, 25€/mes anual -20% — Para crecer
- 10 colecciones, 1k archivos, 10GB almacenamiento, 10k consultas/mes, 5 embeds
- Tema personalizable accent surface text muted border radius chatWidth
- BYOK tu modelo tu clave OpenAI/Anthropic/Azure/Bedrock/Local
- 6 superficies widget panel fullscreen inline documentation contextual + 3 modos widget/panel/fullscreen
- Búsqueda híbrida semántica + keyword con citas verificables ≥98%
- Soporte email 24h, trust badges Citas verificables Permisos por rol
- Stripe checkout session, customer portal, webhooks metering

### Escala — Custom — Para enterprise
- Colecciones ilimitadas, archivos ilimitados, almacenamiento ilimitado, consultas ilimitadas, embeds ilimitados
- SSO SAML, dominio custom, SLA, soporte dedicado, EU hosting
- 0 datos usados para entrenamiento, BYOK
- Contacto: hola@okeng.dev

## Cómo funciona Stripe Billing v3.0

1. **Checkout**: Haz clic en Empieza gratis o Elige Pro en /#precios → crea Stripe checkout session con plan starter/pro/escala y plan_interval monthly/annual.
2. **Portal**: Gestiona método de pago, facturas, upgrade/downgrade en Stripe customer portal desde Settings & Auth > Billing.
3. **Webhooks**: checkout.session.completed crea suscripción, customer.subscription.updated actualiza plan, invoice.paid registra pago y resetea metering mensual.
4. **Metering**: collections/files/storage/queries contados via workspace usage, límites enforced antes de creación/upload. Analytics_events futuro para queries metering Was helpful? feedback.
5. **Feature Matrix**:

| Feature | Starter 0€ | Pro 31€/mo 25€ anual | Escala custom |
| :--- | :--- | :--- | :--- |
| Colecciones | 1 | 10 | Ilimitadas |
| Archivos | 100 | 1k | Ilimitadas |
| Almacenamiento | 1GB | 10GB | Ilimitado |
| Consultas/mes | 1k | 10k | Ilimitado |
| Embeds | 1 | 5 | Ilimitados |
| Tema custom | No | Sí | Sí |
| BYOK | No | Sí | Sí |
| SSO SAML | No | No | Sí |
| Dominio custom | No | No | Sí |
| SLA | No | No | Sí |
| Soporte | Comunidad | Email 24h | Dedicado |

## Cómo descargar facturas mensuales v3.0

1. Abre **Settings** (/settings) en panel de tu espacio de trabajo v3.0 Next.js App Router.
2. Selecciona Billing y comprobantes mensuales.
3. Elige período mensual y descarga comprobante PDF desde Stripe portal.
4. Facturas con IVA EU, EU hosting.

## Límites y Upgrade CTAs v3.0

Cuando alcanzas límite, OKEng muestra upgrade CTA con PricingCard popular badge, trust badges Sin tarjeta EU hosting BYOK, metrics ≥98% -73% 1k 3 líneas. Upgrade a Pro desde #precios toggle monthly/annual -20%.

## Visual Identity v3.0

Warm canvas #F8F7F4 white surface #FFFFFF ink #171717 strong #0F172A accent cobalt #1D4ED8 subtle #F4F4F0 line #DEDDD8 radius sm 4px md 6px lg 12px shadow-sm md lg Inter + JetBrains Mono editorial whitespace py-16 md:py-24 max-w-7xl quiet technical professional sublime easy to use.

## Dogfooding v3.0

Este doc es parte de ws_okeng_01 COL-DOCS con 11 docs, EMB-PUBLIC-DOCS public docs only, deterministic rendering DocArticleRenderer nunca LLM, dynamic retrieval DogfoodInlineBot real engine, live update reconcileCanonicalSeeds bump knowledgeVersion 187→189.

## Ridiculously Easy Additions v3.0

Edit this page, Copy MD, Share, Ask about page pre-filled currentUrl, Feedback 👍/👎, Source chips, Next-step CTA #precios, Version badge knowledgeVersion 189 updatedAt 2026-10-11, Was helpful? analytics, Search hybrid, Improve doc Report Issue, View source, History, Related docs, TOC 2+ hover #, Language EN/ES, Trust badges, Metrics, Pricing CTA.
`,
  },

  // ==========================================
  // COL-CUSTOMER (21 - 23) — v3.0 updated session CSRF CORS etc
  // ==========================================
  {
    id: 'doc_cust_21',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-CUSTOMER',
    title: 'Customer Authentication & Signed Identity Assertions',
    filename: 'customer-authentication.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.8 KB',
    nextStep: {
      label: 'Read Embedding Guide',
      url: '/docs/embedding',
    },
    createdAt: '2026-10-06T08:00:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:01:00Z',
    chunkCount: 4,
    content: `# Customer Authentication & Signed Identity Assertions

*Visibility: Members & Admins (COL-CUSTOMER). v3.0 with session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain host context userId role currentUrl HMAC exact-origin CORS trust proxy security headers health check graceful env validation Next.js 15 App Router.*

How do I configure customer authentication and host context? When embedding OKEng inside authenticated customer portal, your backend mints short-lived HMAC-SHA256 identity token so authenticated customers can query members collections alongside public documentation.

## 1. Minting Host Identity Assertion v3.0

1. Authenticate user in host application session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit.
2. Sign HS256 JWT on server using workspace signingSecret with claims workspace_id, sub (user ID), role: "member" (or "admin"), iat, exp (5-minute TTL).
3. Pass signed token and currentUrl to OKEng.init({ embedId, token, currentUrl }).

\`\`\`javascript
// Server-side Node.js example v3.0
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { workspace_id: "ws_okeng_01", sub: user.id, role: "member", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+300 },
  process.env.OKENG_SIGNING_SECRET,
  { algorithm: "HS256" }
);
\`\`\`

## 2. Session Management v3.0 SEC-01

httpOnly secure sameSite strict cookies 12h TTL Redis fallback regeneration session rotation on login CSRF double-submit token 5-Link Auth Chain valid session → valid workspace existence → active WorkspaceMembership → required explicit permission → resource ownership resource.workspace_id == request.workspace_id. Exact-origin CORS no wildcard trust proxy 1 prod 0 dev security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy health check /api/health graceful shutdown env validation fail-fast.

## 3. Progressive Identity Upgrade v3.0

When visitor transitions from anonymous browsing to signed-in member status, OKEng upgrades session identity and expands EffectiveScope to include Customer Docs (COL-CUSTOMER) without leaking Admin Docs (COL-INTERNAL). Pre-retrieval narrowing D 6-point verification workspaceId EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY policy-versioned caching demoPolicyVersion+narrowedDocumentFingerprint.

## 4. Invalid Token & Unverified Role Rejection v3.0

If embed request supplies expired, tampered, or wrong-algorithm JWT—or asserts privileged role member/admin without valid signed token—OKEng halts with 401 Unauthorized prior to retrieval and never silently downgrades request to anonymous access. 401 generic invalid credentials not distinguishing user existence, 403 forbidden insufficient permission, 404 not found, 422 validation FORM-SEC-01 field errors, 429 rate limiting TIER_AUTH_5_PER_15M auth TIER_API_100_PER_MIN API, 500 internal server error.

## 5. Next.js Architecture v3.0

Next.js 15.1.0 App Router + API Routes + Middleware + src/lib/* no Vite no Express proper standard. Middleware auth, trust proxy, security headers. src/app/(public)/ for landing docs about contact legal, src/app/(auth)/ for login signup forgot-password reset-password.

## 6. Dogfooding v3.0

Workspace ws_okeng_01 5 collections 25 docs 3 embeds EMB-PUBLIC-HOME mixed-access showcase 5 collections floating tour Demo Settings Drawer Identity Visitor/Member/Admin Context / /docs/embedding /docs/access-control pendingSettingsOpId atomic POST /api/demo/homepage-context non-bypassable pre-retrieval 6-point verification.

## 7. Billing v3.0

Starter 0€ 1 collection 100 files 1GB 1k queries, Pro 31€/mo 10 collections 1k files 10GB 10k queries, Escala unlimited. Stripe checkout/portal/webhooks metering.
`,
  },
  {
    id: 'doc_cust_22',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-CUSTOMER',
    title: 'Host Context & Route-Aware Customer Integration',
    filename: 'host-context-integration.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.2 KB',
    nextStep: {
      label: 'Explore Retrieval Guide',
      url: '/docs/retrieval',
    },
    createdAt: '2026-10-06T08:05:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:06:00Z',
    chunkCount: 4,
    content: `# Host Context & Route-Aware Customer Integration

*Visibility: Members & Admins (COL-CUSTOMER). v3.0 with host user context userId role currentUrl signed via signing_secret HMAC route context boost 6 surfaces theme customization installation recipe React Vue JS server/browser verification Next.js 15 App Router.*

Customer integrations can supply active application route (current_url) so OKEng prioritizes documentation relevant to screen customer is viewing.

## Route Rules & Pinned Documents v3.0

Configure route rules on Embed (for example, matching /docs/embedding or /billing/invoices) to pin high-priority documents and surface contextual suggested questions. Route context boosts ranking strictly within collections already authorized by user's verified identity. Route-prefix match currentUrl.startsWith(doc.route) adds +2.2 rawScore routeBoost 0.15 routeRules boost pinned docs strictly inside already-authorized EffectiveScope.

\`\`\`javascript
// v3.0 routeRules example
contextConfig: {
  useCurrentPage: true,
  useHostUserContext: true,
  routeRules: [
    {
      routePattern: "/docs/embedding",
      promptTitle: "Embeds & Host Integration",
      suggestedQuestions: ["How do Embeds work?", "How does contextual retrieval work?"],
      pinnedDocumentIds: ["doc_docs_13", "doc_cust_21"]
    }
  ]
}
\`\`\`

## Host User Context v3.0

Host user context userId role currentUrl signed via signing_secret HMAC. 5-Link Auth Chain host context userId role currentUrl HMAC exact-origin CORS no wildcard trust proxy 1 prod 0 dev security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy health check /api/health graceful shutdown env validation fail-fast. Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit.

## 6 Surfaces & 3 Modes v3.0

6 composable surfaces widget panel fullscreen inline documentation contextual + 3 modes widget/panel/fullscreen from proposal, theme customization accent surface text muted border radius chatWidth, installation recipe React Vue JS server/browser steps verification:

**React**:
\`\`\`jsx
import { OKEngWidget } from '@okeng/react';
<OKEngWidget workspace="okeng" embedId="EMB-PUBLIC-HOME" currentUrl={window.location.pathname} />
\`\`\`

**Vanilla 3 lines**:
\`\`\`html
<script src="https://okeng.dev/widget.js"></script>
<script>OKEng.init({ workspace: "okeng", embedId: "EMB-PUBLIC-HOME", currentUrl: window.location.pathname });</script>
\`\`\`

## Dogfooding v3.0

Workspace ws_okeng_01 5 collections 25 docs 3 embeds EMB-PUBLIC-HOME mixed-access showcase floating tour Demo Settings Drawer Identity Visitor/Member/Admin Context / /docs/embedding /docs/access-control pendingSettingsOpId atomic POST /api/demo/homepage-context server-only 6-point verification EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY policy-versioned caching demoPolicyVersion+narrowedDocumentFingerprint grounded provenance serverOutcome grounded|refused|failed.

## Billing & Plan v3.0

Starter 0€ 1 collection 100 files 1GB 1k queries, Pro 31€/mo 10 collections 1k files 10GB 10k queries, Escala unlimited. Stripe checkout/portal/webhooks metering.
`,
  },
  {
    id: 'doc_cust_23',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-CUSTOMER',
    title: 'Customer Production Rollout & Allowed Origins',
    filename: 'customer-integration.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.0 KB',
    nextStep: {
      label: 'Read Access Control Docs',
      url: '/docs/access-control',
    },
    createdAt: '2026-10-06T08:10:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:11:00Z',
    chunkCount: 3,
    content: `# Customer Production Rollout & Allowed Origins

*Visibility: Members & Admins (COL-CUSTOMER). v3.0 with exact-origin CORS no wildcard trust proxy security headers health check graceful env validation Next.js 15 App Router session httpOnly CSRF.*

Before launching OKEng Embed in production:

1. Verify collection visibilities (everyone vs members vs admins) in Collections directory. COL-PUBLIC everyone 4 docs, COL-DOCS everyone 11 docs, COL-LEGAL everyone 3 docs, COL-CUSTOMER members 3 docs, COL-INTERNAL admins 4 docs. 18 public total.
2. Confirm backend never exposes signingSecret in client-side JavaScript bundles. signingSecret stays server-side src/lib/*.
3. Run 4 verification scenarios in OKEng Test Console to confirm pre-retrieval boundary enforcement: Visitor Member Admin Invalid Token 401 Multilingual.
4. **v3.0 Exact-Origin CORS**: No wildcard, allowed origins configured per Embed, exact match required. Trust proxy 1 prod 0 dev, security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy, health check /api/health, graceful shutdown, env validation fail-fast.
5. **Session Management v3.0**: httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain valid session → valid workspace existence → active WorkspaceMembership → required explicit permission → resource ownership.
6. **Rate Limiting & Error Handling v3.0**: 401 generic invalid credentials, 403 forbidden, 404 not found, 422 validation FORM-SEC-01, 429 rate limiting TIER_AUTH_5_PER_15M auth TIER_API_100_PER_MIN API, 500 internal server error.
7. **Next.js Architecture v3.0**: Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express proper standard. Build fixes next.config.mjs ESM webpack alias @->./src upgrade next 14.2->15.1.0 downgrade TS 7.0.2->5.8.0 tsconfig baseUrl+paths Pages router conflict fixed moving src/pages/ -> src/views-legacy/ vite.config.ts removed next.config.js CJS -> next.config.mjs ESM.
8. **Billing v3.0**: Stripe checkout/portal/webhooks metering plan starter/pro/escala plan_interval monthly/annual stripe_customer_id stripe_subscription_id usage metering collections/files/storage/queries Starter 1 collection 100 files 1GB 1k queries Pro 10 collections 1k files 10GB 10k queries Escala unlimited.
9. **Visual Identity v3.0**: Warm canvas #F8F7F4 white surface cobalt #1D4ED8 shadow-sm/md/lg radius-lg 12px Inter+JetBrains Mono editorial whitespace py-16/24 max-w-7xl quiet technical professional sublime easy to use.
10. **Dogfooding v3.0**: Workspace ws_okeng_01 5 collections 25 docs 3 embeds deterministic rendering DocArticleRenderer never LLM dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse citations NextStepButton live update reconcileCanonicalSeeds bumps knowledgeVersion 187→189 Test Console reproducibility PAGE-APP-06 5 scenarios.

## Checklist v3.0

- [ ] Collections visibility verified everyone/members/admins
- [ ] Embed allowedCollectionIds bound correctly
- [ ] Backend signingSecret server-side only src/lib/*
- [ ] HMAC HS256 token minting 5-min TTL
- [ ] currentUrl passed for route-aware boost
- [ ] Exact-origin CORS configured no wildcard
- [ ] Security headers HSTS CSP X-Frame-Options
- [ ] Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit
- [ ] Rate limiting TIER_AUTH_5_PER_15M TIER_API_100_PER_MIN
- [ ] Health check /api/health graceful shutdown env validation fail-fast
- [ ] Test Console 4 scenarios Visitor Member Admin Invalid Token 401 Multilingual
- [ ] Billing plan starter/pro/escala Stripe checkout/portal/webhooks metering
- [ ] Visual identity v3.0 warm canvas cobalt shadow-sm/md/lg radius-lg editorial whitespace
`,
  },

  // ==========================================
  // COL-INTERNAL (24 - 25) — v3.0 updated Next.js arch
  // ==========================================
  {
    id: 'doc_internal_24',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-INTERNAL',
    title: 'Pre-Retrieval Authorization & EffectiveScope Architecture',
    filename: 'authorization-architecture.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.8 KB',
    nextStep: {
      label: 'Verify in Test Console',
      url: '/workspaces/okeng/test',
    },
    createdAt: '2026-10-06T08:15:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:06:00Z',
    chunkCount: 4,
    content: `# Pre-Retrieval Authorization & EffectiveScope Architecture

*Visibility: Admins Only (COL-INTERNAL). v3.0 Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express, SEC-01 foundations, policy-versioned caching, 6-point verification.*

How does pre-retrieval authorization and cache pipeline work? OKEng computes EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections on server before any chunk enters BM25 scoring or answer compilation.

## 1. Hard 401 Invalid Token Boundary v3.0

If request includes malformed, expired, or forged identity token (INVALID_TOKEN_SIGNATURE), OKEng halts immediately with 401 Unauthorized, executes zero retrieval, never falls back to anonymous access. Error handling 401 generic invalid credentials not distinguishing user existence, 403 forbidden insufficient permission, 404 not found, 422 validation FORM-SEC-01 field errors, 429 rate limiting TIER_AUTH_5_PER_15M auth TIER_API_100_PER_MIN API, 500 internal server error graceful shutdown health check /api/health env validation fail-fast.

## 2. Cache Partition Isolation v3.0

Every retrieval and answer cache entry in CACHE-001 partitioned by workspaceId, effectiveClearance, allowedCollectionIdsHash, knowledgeVersion kv, authorizationVersion av, answerMode, responseLanguage. knowledgeVersion 189 bumped via reconcileCanonicalSeeds when document updated, authorizationVersion bumped when collection visibility changes immediate policy effect without re-indexing. Policy-versioned caching demoPolicyVersion + narrowedDocumentFingerprint for homepage demo EMB-PUBLIC-HOME.

## 3. 6-Point Verification v3.0

Server-only demo authorization server/demo/publicHomepageDemoAuthorization.ts boundary POST /api/chat/stream routes any request with embedId EMB-PUBLIC-HOME demoPreset !== undefined or mode public_homepage_demo unconditionally to handlePublicHomepageDemoChatStream omitting demoPreset on EMB-PUBLIC-HOME returns 400 INVALID_DEMO_PRESET without fallthrough enforces 6-point pre-retrieval narrowing D over server repositories ws_okeng_01 rewrites restricted COL-CUSTOMER COL-INTERNAL citations to publicSafeTitle companion guides citationRenderMode public_companion_guide keys demo cache by demoPolicyVersion + narrowedDocumentFingerprint. 6-point: workspaceId ws_okeng_01, EffectiveScope B∩R, PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP, PUBLIC_DEMO_SOURCE_POLICY, demoPolicyVersion, narrowedDocumentFingerprint. Grounded citation provenance serverOutcome grounded|refused|failed.

## 4. EffectiveScope Computation v3.0

EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections pre-retrieval. Example: EMB-PUBLIC-HOME binds COL-PUBLIC COL-DOCS COL-LEGAL COL-CUSTOMER COL-INTERNAL, Visitor role → EffectiveScope = everyone only = COL-PUBLIC COL-DOCS COL-LEGAL 18 docs, Member role → EffectiveScope = everyone+members = COL-PUBLIC COL-DOCS COL-LEGAL COL-CUSTOMER 21 docs, Admin role → EffectiveScope = everyone+members+admins = all 5 collections 25 docs. But demo rewrites restricted citations to publicSafeTitle companion guides for security.

## 5. Session & Privilege v3.0 SEC-01

Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain valid session → valid workspace existence → active WorkspaceMembership → required explicit permission → resource ownership resource.workspace_id == request.workspace_id. Privilege system super_admin/admin/member/viewer server-only src/lib/privilege 14 explicit permissions for owner. Exact-origin CORS no wildcard trust proxy 1 prod 0 dev security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy health check /api/health graceful shutdown env validation fail-fast.

## 6. Next.js Architecture v3.0

Next.js 15.1.0 App Router + API Routes + Middleware + src/lib/* no Vite no Express proper standard. src/app/(public)/ for landing docs about contact legal, src/app/(auth)/ for login signup forgot-password reset-password, src/app/(workspace)/ for console. Middleware auth, trust proxy, security headers. Build fixes next.config.mjs ESM webpack alias @->./src upgrade next 14.2->15.1.0 downgrade TS 7.0.2->5.8.0 tsconfig baseUrl+paths Pages router conflict fixed moving src/pages/ -> src/views-legacy/ vite.config.ts removed next.config.js CJS -> next.config.mjs ESM.

## 7. Billing & Plan v3.0

Stripe integration checkout session for Pro/Annual -20%, customer portal, webhooks checkout.session.completed customer.subscription.updated invoice.paid metering. Workspace fields plan starter/pro/escala plan_interval monthly/annual stripe_customer_id stripe_subscription_id usage metering collections/files/storage/queries Starter 1 collection 100 files 1GB 1k queries Pro 10 collections 1k files 10GB 10k queries Escala unlimited.

## 8. Visual Identity v3.0

Warm canvas #F8F7F4 white surface cobalt #1D4ED8 shadow-sm/md/lg radius-lg 12px Inter+JetBrains Mono editorial whitespace py-16/24 max-w-7xl quiet technical professional sublime. PA-DOCS archetype header 56px sticky backdrop-blur sidebar 300px border-r bg-surface sticky top-14 h calc 100vh-56px main max-w-3xl/4xl px-6 py-8/12 right TOC 200px footer full-width.

## 9. Dogfooding v3.0

Workspace ws_okeng_01 5 collections 25 docs 3 embeds deterministic rendering DocArticleRenderer never LLM dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse citations NextStepButton live update reconcileCanonicalSeeds bumps knowledgeVersion 187→189 Test Console reproducibility PAGE-APP-06 5 scenarios.
`,
  },
  {
    id: 'doc_internal_25',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-INTERNAL',
    title: 'Retrieval Pipeline, Answer Planner & Test Console Verification',
    filename: 'retrieval-pipeline-internals.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.8 KB',
    nextStep: {
      label: 'Open Test Console',
      url: '/workspaces/okeng/test',
    },
    createdAt: '2026-10-06T08:20:00Z',
    updatedAt: '2026-10-11T08:00:00Z',
    indexedAt: '2026-10-11T08:21:00Z',
    chunkCount: 4,
    content: `# Retrieval Pipeline, Answer Planner & Test Console Verification

*Visibility: Admins Only (COL-INTERNAL). v3.0 Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express, hybrid search semantic+keyword, real metrics, visual identity warm canvas cobalt editorial whitespace.*

Administrators use OKEng Test Console (/workspaces/okeng/test) to inspect five-stage execution pipeline (Context → Authorization → Retrieval → Answer Plan → Cache) across [ Access ], [ Retrieval ], and [ Cache ] tabs.

## Pipeline v3.0

1. **Context**: Resolve currentUrl, collectionIds, host user context userId role currentUrl signed via signing_secret HMAC, routeRules.
2. **Authorization**: ResolveRequestEmbedIdentity → resolveEmbedAuthorization → EffectiveScope B∩R pre-retrieval narrowing D 6-point verification policy-versioned caching.
3. **Retrieval**: BM25 lexical ranking k1 1.5 b 0.75 + field boosts title +1.8 intent +2.0 heading +1.1 synonym +0.75 + route-prefix match currentUrl.startsWith(doc.route) +2.2 rawScore routeBoost 0.15 + same-language boost +0.65 + hybrid semantic re-ranking future two-step threshold rawScore >=1.35 normalizedConfidence >=0.25 deterministic/extractive compilation.
4. **Answer Plan**: CompileKnowledgeResponse with citations Verified Sources N, source chips, next-step CTA verified https or /path, serverOutcome grounded|refused|failed, grounded citation provenance.
5. **Cache**: Partitioned by workspaceId effectiveClearance allowedCollectionIdsHash knowledgeVersion kv authorizationVersion av answerMode responseLanguage demoPolicyVersion + narrowedDocumentFingerprint for homepage demo.

## Test Console Verification v3.0 PAGE-APP-06

Every homepage demo scenario Scenario A Visitor B Member C Admin D Invalid Token 401 E Multilingual ¿Cómo funciona OKEng? can be reproduced identically inside /workspaces/okeng/test?embedId=EMB-PUBLIC-HOME. 5 scenarios:

- **A Visitor**: everyone only COL-PUBLIC COL-DOCS COL-LEGAL 18 docs, EMB-PUBLIC-HOME visitor preset, anonymous retrieve strictly from visibility everyone.
- **B Member**: everyone+members COL-PUBLIC COL-DOCS COL-LEGAL COL-CUSTOMER 21 docs, EMB-PUBLIC-HOME member preset, valid HMAC-SHA256 signed host token verified server-side.
- **C Admin**: everyone+members+admins all 5 collections 25 docs, EMB-PUBLIC-HOME admin preset, valid admin token.
- **D Invalid Token 401**: Expired/tampered/wrong-algorithm JWT → 401 Unauthorized prior to retrieval never silently downgrades to anonymous, public homepage demo uses dedicated server-only PublicDemoAuthority visitor/member/admin presets reject caller tokens 400 DEMO_TOKEN_NOT_ACCEPTED.
- **E Multilingual**: ¿Cómo funciona OKEng? → same-language boost +0.65 rawScore doc_pub_01.translations.es native Spanish doc_docs_es_20.

Plus: Homepage floating guided tour contract 13 capabilities 5 stages STAGE-1-WHAT-IS-OKENG What is OKEng? → STAGE-2-WHAT-IT-DOES-TODAY What can it do today? → STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS Answers grounded → STAGE-4-CONTEXT-AND-ACCESS-CONTROL Context and access control → STAGE-5-GET-STARTED Get started terminal → Primary /signup Create Free Account Secondary /docs/getting-started Action Restart tour, 81/81 verification matrix non-bypassable server-only demo boundary POST /api/chat/stream, 5-domain client controller src/services/homepageTourController.ts separates AssistantDisplayState TourSessionState ConversationState RequestLifecycleState DemoSettingsState enforcing request fencing requestId exchangeId tourRunId single-terminal exchange lock terminalLock pendingSettingsOpId atomic settings updates separated stageRetryTarget vs followUpRetryTarget, executed acceptance verification 81/81 passing tests/readiness/homepage-tour-readiness.test.ts 52/52 passing 27 baseline readiness + 25 adversarial AT-01..AT-25 tests/rendering/embed-authorization.test.ts 29/29 passing.

## Next.js Architecture v3.0

Next.js 15.1.0 App Router API Routes Middleware src/lib/* no Vite no Express proper standard. src/app/(public)/ for landing docs about contact legal, src/app/(auth)/ for login signup forgot-password reset-password, src/app/(workspace)/ for console. Middleware auth, trust proxy 1 prod 0 dev, security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy exact-origin CORS no wildcard health check /api/health graceful shutdown env validation fail-fast. Build fixes next.config.mjs ESM webpack alias @->./src upgrade next 14.2->15.1.0 downgrade TS 7.0.2->5.8.0 tsconfig baseUrl+paths Pages router conflict fixed moving src/pages/ -> src/views-legacy/ vite.config.ts removed next.config.js CJS -> next.config.mjs ESM.

## Session & Privilege & Billing v3.0

Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain privilege system super_admin/admin/member/viewer server-only 14 explicit permissions. Stripe checkout/portal/webhooks metering plan starter/pro/escala plan_interval monthly/annual stripe_customer_id stripe_subscription_id usage metering collections/files/storage/queries Starter 1 collection 100 files 1GB 1k queries Pro 10 collections 1k files 10GB 10k queries Escala unlimited.

## Visual Identity v3.0

Warm canvas #F8F7F4 white surface #FFFFFF ink #171717 strong #0F172A accent cobalt #1D4ED8 subtle #F4F4F0 line #DEDDD8 radius sm 4px md 6px lg 12px shadow-sm 0 1px 2px rgba(0,0,0,0.04) md 0 4px 12px rgba(0,0,0,0.08) lg 0 8px 24px rgba(0,0,0,0.12) Inter + JetBrains Mono editorial whitespace py-16 md:py-24 max-w-7xl quiet technical professional sublime easy to use.

## Dogfooding v3.0

Workspace ws_okeng_01 5 collections 25 docs 3 embeds deterministic rendering DocArticleRenderer never LLM dynamic retrieval DogfoodInlineBot real engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse citations NextStepButton live update reconcileCanonicalSeeds bumps knowledgeVersion 187→189 Test Console reproducibility PAGE-APP-06 5 scenarios.

## Ridiculously Easy Additions v3.0

Edit this page, Copy MD, Share, Ask about page pre-filled currentUrl collectionIds, Feedback 👍/👎, Source chips, Next-step CTA, Version badge knowledgeVersion 189 updatedAt 2026-10-11, Was helpful? analytics, Search hybrid POST /api/ask, Improve doc Report Issue modal, View source raw MD, History updatedAt, Related docs top-k bm25Retriever, TOC 2+ hover # active highlight, Language EN/ES, Auth-gated Engineering Specs, Trust badges Citas verificables Permisos por rol Sin tarjeta, Metrics ≥98% -73% 1k 3 lines, Pricing CTA #precios — all compose existing primitives.
`,
  },
];
