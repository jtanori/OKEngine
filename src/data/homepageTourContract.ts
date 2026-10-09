// ============================================================================
// Single Authoritative Homepage Capability Inventory & 5-Stage Tour Contract
// (PUBLIC-01 §9.1 & §9.2 — Shared by Runtime UI and Readiness Test Suite)
// ============================================================================

export interface CanonicalCapabilityEntry {
  id: string;
  domain: string;
  status: 'Verified' | 'Limited';
  implementationEvidence: string[];
  verifiedBehaviorAndBounds: string;
  acceptanceTestIds: string[];
}

export const CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY: CanonicalCapabilityEntry[] = [
  {
    id: 'CAP-WORKSPACE-ISOLATION',
    domain: 'Workspace & Multi-Tenant Isolation',
    status: 'Verified',
    implementationEvidence: ['src/services/auth.ts', 'src/services/store.ts'],
    verifiedBehaviorAndBounds:
      'Every collection, document, chunk, and embed is scoped to a single workspace (ws_okeng_01) with 5-link RBAC (WORKSPACE_OWNER / WORKSPACE_USER) and knowledgeVersion cache epoch invalidation.',
    acceptanceTestIds: ['READINESS-DOC-01', 'READINESS-HYDRATION-01', 'TOUR-STAGE-01', 'TOUR-STAGE-05'],
  },
  {
    id: 'CAP-COLLECTION-RBAC',
    domain: 'Pre-Retrieval Collection Visibility & EffectiveScope',
    status: 'Verified',
    implementationEvidence: ['src/services/embedAuthorization.ts'],
    verifiedBehaviorAndBounds:
      'Enforces 3-tier collection visibility (everyone, members, admins) prior to chunk scoring via EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections.',
    acceptanceTestIds: ['READINESS-SEC-01', 'READINESS-SEC-02', 'TOUR-STAGE-01', 'TOUR-STAGE-02', 'TOUR-STAGE-04'],
  },
  {
    id: 'CAP-SIGNED-HOST-IDENTITY',
    domain: 'Signed Host Identity Assertions (HS256)',
    status: 'Verified',
    implementationEvidence: ['src/services/embedAuthorization.ts', 'server.ts'],
    verifiedBehaviorAndBounds:
      'Verifies short-lived HMAC-SHA256 (HS256) tokens with a 4-case boundary; invalid, expired, tampered, wrong-workspace, or unverified role assertions fail closed with HTTP 401 before retrieval.',
    acceptanceTestIds: ['READINESS-SEC-02', 'READINESS-SEC-03', 'TOUR-STAGE-04'],
  },
  {
    id: 'CAP-FILE-INGESTION-BOUNDED',
    domain: 'Document Ingestion & File Upload Formats',
    status: 'Limited',
    implementationEvidence: [
      'src/components/UploadDropzone.tsx',
      'src/components/MarkdownEditor.tsx',
      'src/services/validation.ts',
    ],
    verifiedBehaviorAndBounds:
      'Browser FileReader.readAsText() upload dropzone accepts .md, .txt, .json, and .csv text files plus direct Markdown authoring in the workspace editor with filename and script-tag validation; no binary PDF/DOCX OCR parser or automated web crawler.',
    acceptanceTestIds: ['READINESS-DOC-01', 'READINESS-CLAIMS-01', 'TOUR-STAGE-02'],
  },
  {
    id: 'CAP-HEADING-CHUNKING',
    domain: 'Heading-Aware Markdown Segmentation',
    status: 'Verified',
    implementationEvidence: ['src/services/engine/knowledgeParser.ts'],
    verifiedBehaviorAndBounds:
      'Splits Markdown and text along structural headings (#, ##, ###), extracting ordered steps, bullet lists, callout warnings, fenced code blocks, and 1-indexed lineStart–lineEnd ranges.',
    acceptanceTestIds: ['READINESS-DOC-01', 'READINESS-Q03', 'TOUR-STAGE-03'],
  },
  {
    id: 'CAP-BM25-RETRIEVAL',
    domain: 'Lexical BM25 Ranking & Deterministic Compilation',
    status: 'Verified',
    implementationEvidence: [
      'src/services/engine/bm25Retriever.ts',
      'src/services/engine/responseCompiler.ts',
    ],
    verifiedBehaviorAndBounds:
      'Scores authorized chunks using custom BM25 (k1 = 1.5, b = 0.75) plus field boosts (title +1.8, intent +2.0, heading +1.1, synonym +0.75), enforces the two-step relevance threshold (rawScore >= 1.35 and normalizedConfidence >= 0.25), and compiles deterministic/extractive responses offline.',
    acceptanceTestIds: ['READINESS-Q01', 'READINESS-Q03', 'TOUR-STAGE-01', 'TOUR-STAGE-02', 'TOUR-STAGE-03'],
  },
  {
    id: 'CAP-ROUTE-CONTEXT-BOOST',
    domain: 'Host Route Context & Pinned Document Boost',
    status: 'Verified',
    implementationEvidence: [
      'src/services/engine/bm25Retriever.ts',
      'src/services/engine/responseCompiler.ts',
      'src/data/seedData.ts',
    ],
    verifiedBehaviorAndBounds:
      'Applies a +2.2 rawScore boost (exposed as routeBoost = 0.15) when currentUrl matches doc.route and prioritizes routeRules pinnedDocumentIds strictly inside the already-authorized EffectiveScope; never overrides collection visibility.',
    acceptanceTestIds: ['READINESS-Q08', 'READINESS-SEC-01', 'TOUR-STAGE-04'],
  },
  {
    id: 'CAP-GROUNDED-CITATIONS',
    domain: 'Verifiable Source Citations & Next-Step Actions',
    status: 'Verified',
    implementationEvidence: [
      'src/services/engine/responseCompiler.ts',
      'src/components/SourceList.tsx',
      'src/components/NextStepButton.tsx',
    ],
    verifiedBehaviorAndBounds:
      'Emits structured citations (docId, title, filename, collectionId, lineRange, score) strictly from authorizedDocs and surfaces router-validated nextStep CTAs.',
    acceptanceTestIds: ['READINESS-LINKS-01', 'READINESS-Q04', 'TOUR-STAGE-01', 'TOUR-STAGE-03'],
  },
  {
    id: 'CAP-MISSING-TOPIC-REFUSAL',
    domain: 'Conservative Missing-Topic Refusal ("Nothing Shown" Fallback)',
    status: 'Verified',
    implementationEvidence: [
      'src/services/engine/bm25Retriever.ts',
      'src/services/engine/responseCompiler.ts',
    ],
    verifiedBehaviorAndBounds:
      'Two-step relevance gate: candidates with rawScore < 1.35 are capped at normalizedConfidence <= 0.20 in bm25Retriever.ts and excluded by the compiler filter (normalizedConfidence >= 0.25 in responseCompiler.ts), returning answerType: "unknown", retrievalMode: "none", and 0 fabricated sources.',
    acceptanceTestIds: ['READINESS-Q10', 'READINESS-UNANSWERABLE-01', 'TOUR-STAGE-03'],
  },
  {
    id: 'CAP-EMBED-MODES-BOUNDED',
    domain: 'Embed Presentation Modes (Live Public vs. Simulator)',
    status: 'Limited',
    implementationEvidence: [
      'src/pages/PublicSurfaceView.tsx',
      'public/widget.js',
      'src/pages/EmbedConfigView.tsx',
      'src/pages/WidgetPreviewView.tsx',
    ],
    verifiedBehaviorAndBounds:
      'inline (EMB-PUBLIC-HOME on /) and documentation (EMB-PUBLIC-DOCS on /docs) are live on public pages; /widget.js provides a standalone drop-in floating launcher and drawer; all 6 modes (widget, panel, fullscreen, inline, documentation, contextual) are configurable in Embed Studio and previewable in the Host Simulator.',
    acceptanceTestIds: ['READINESS-Q07', 'TOUR-STAGE-02', 'TOUR-STAGE-05'],
  },
  {
    id: 'CAP-INSTALLATION-RECIPE',
    domain: 'Configuration-Driven Embed Installation & Verification',
    status: 'Verified',
    implementationEvidence: [
      'src/pages/EmbedInstallationView.tsx',
      'src/pages/TestConsoleView.tsx',
    ],
    verifiedBehaviorAndBounds:
      'Generates framework-specific installation recipes (React, Vue, JavaScript) distinguishing frontend-only public embeds from backend+frontend signed-token embeds, paired with Test Console (PAGE-APP-06) verification.',
    acceptanceTestIds: ['READINESS-Q06', 'READINESS-Q09', 'TOUR-STAGE-05'],
  },
  {
    id: 'CAP-MULTILINGUAL-ES',
    domain: 'Bilingual EN/ES UI & Retrieval Alignment',
    status: 'Verified',
    implementationEvidence: [
      'src/i18n/I18nContext.tsx',
      'src/services/engine/bm25Retriever.ts',
      'src/data/seedData.ts',
    ],
    verifiedBehaviorAndBounds:
      'Full EN/ES UI localization, bilingual tokenization/stopword/synonym maps, +0.65 rawScore boost when doc.language matches preferredLanguage, doc_pub_01.translations.es, and native Spanish doc_docs_es_20.',
    acceptanceTestIds: ['READINESS-I18N-01'],
  },
  {
    id: 'CAP-GENERATIVE-FALLBACK',
    domain: 'Optional Gemini Synthesis with Deterministic Fallback',
    status: 'Limited',
    implementationEvidence: ['server.ts', 'src/services/api.ts'],
    verifiedBehaviorAndBounds:
      'Server-side /api/chat/stream optionally synthesizes over pre-filtered authorizedDocs via Gemini when GEMINI_API_KEY is configured and falls back deterministically to compileKnowledgeResponse when unconfigured.',
    acceptanceTestIds: ['READINESS-SEC-01'],
  },
];

export type HomepageTourStageId =
  | 'STAGE-1-WHAT-IS-OKENG'
  | 'STAGE-2-WHAT-IT-DOES-TODAY'
  | 'STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS'
  | 'STAGE-4-CONTEXT-AND-ACCESS-CONTROL'
  | 'STAGE-5-GET-STARTED';

export type PublicHomepageDemoPreset = 'visitor' | 'member' | 'admin';

export const PUBLIC_DEMO_CONTEXT_ROUTES = [
  '/',
  '/docs/embedding',
  '/docs/access-control',
] as const;

export type PublicDemoContextRoute = (typeof PUBLIC_DEMO_CONTEXT_ROUTES)[number];

export const CANONICAL_PUBLIC_ROUTE_REGISTRY = [
  '/',
  '/about',
  '/contact',
  '/docs',
  '/terms',
  '/privacy',
  '/acceptable-use',
  '/login',
  '/signup',
  '/forgot-password',
  '/password/reset',
  '/docs/product-overview',
  '/docs/product-concepts',
  '/docs/faq',
  '/docs/security-overview',
  '/docs/getting-started',
  '/docs/workspaces',
  '/docs/collections',
  '/docs/files',
  '/docs/markdown',
  '/docs/ingestion',
  '/docs/retrieval',
  '/docs/access-control',
  '/docs/embedding',
  '/docs/troubleshooting',
  '/docs/facturacion-y-planes',
] as const;

export type CanonicalPublicRoute = (typeof CANONICAL_PUBLIC_ROUTE_REGISTRY)[number];

const PUBLIC_DEMO_CONTEXT_ROUTE_SET = new Set<string>(PUBLIC_DEMO_CONTEXT_ROUTES);
const CANONICAL_PUBLIC_ROUTE_SET = new Set<string>(CANONICAL_PUBLIC_ROUTE_REGISTRY);

function hasStrictPathnameForm(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0) return false;
  if (!url.startsWith('/')) return false;
  if (url.startsWith('//')) return false;
  if (
    url.includes('?') ||
    url.includes('#') ||
    url.includes('%') ||
    url.includes('\\') ||
    url.includes('..') ||
    url.includes('/./') ||
    url.endsWith('/.') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)
  ) {
    return false;
  }
  if (url.length > 1 && url.endsWith('/')) {
    return false;
  }
  return true;
}

/**
 * Validates that a URL is one of the 3 allowed homepage demo context routes ('/', '/docs/embedding', '/docs/access-control').
 * Rejects query strings, fragments, percent-encoding, backslashes, dot segments, trailing slashes, and schemes.
 */
export function isValidPublicDemoContextRoute(url: unknown): url is PublicDemoContextRoute {
  return hasStrictPathnameForm(url) && PUBLIC_DEMO_CONTEXT_ROUTE_SET.has(url);
}

/**
 * Validates that a URL is an exact match in CANONICAL_PUBLIC_ROUTE_REGISTRY.
 * Rejects query strings, fragments, percent-encoding, backslashes, dot segments, trailing slashes, and schemes.
 */
export function isValidPublicCitationDestinationRoute(url: unknown): url is CanonicalPublicRoute {
  return hasStrictPathnameForm(url) && CANONICAL_PUBLIC_ROUTE_SET.has(url);
}

export interface HomepageTourActionLink {
  label: string;
  labelKey: string;
  url: CanonicalPublicRoute;
  category: 'docs' | 'signup';
}

export type HomepageTourProgression =
  | {
      kind: 'advance_stage';
      nextStageId: HomepageTourStageId;
      ctaLabelKey: string;
      ctaLabelDefault: string;
      companionDocLink: HomepageTourActionLink;
      secondaryDocLink?: HomepageTourActionLink;
    }
  | {
      kind: 'terminal';
      primaryDestination: HomepageTourActionLink;
      secondaryDestination: HomepageTourActionLink;
      restartActionLabelKey: string;
      restartActionLabelDefault: string;
    };

export interface HomepageTourStageContract {
  stageNumber: 1 | 2 | 3 | 4 | 5;
  stageId: HomepageTourStageId;
  title: string;
  titleKey: string;
  visitorNeed: string;
  needKey: string;
  learningOutcome: string;
  outcomeKey: string;
  suggestedPrompt: string;
  promptKey: string;
  paraphrasePrompts: string[];
  paraphraseKey: string;
  acceptableSourceSet: {
    primaryFilenames: string[];
    acceptableSecondaryFilenames: string[];
  };
  requiredCapabilities: string[];
  expectedConceptKeywords: string[];
  progression: HomepageTourProgression;
  nextAction: {
    label: string;
    url: CanonicalPublicRoute;
    category: 'docs' | 'signup';
  };
  secondaryAction?: {
    label: string;
    url: CanonicalPublicRoute;
    category: 'docs' | 'signup';
  };
  accessAssumptions: {
    embedId: 'EMB-PUBLIC-HOME';
    callerIdentity: 'anonymous';
    allowedCollections: ('COL-PUBLIC' | 'COL-DOCS' | 'COL-LEGAL')[];
    excludedCollections: ('COL-CUSTOMER' | 'COL-INTERNAL')[];
  };
  fallbackAndErrorBehavior: string;
  acceptanceTestId: string;
}

export const APPROVED_HOMEPAGE_TOUR_CONTRACT: HomepageTourStageContract[] = [
  {
    stageNumber: 1,
    stageId: 'STAGE-1-WHAT-IS-OKENG',
    title: '1. What is OKEng?',
    titleKey: 'public.tour.STAGE-1-WHAT-IS-OKENG.title',
    visitorNeed: 'Understand what OKEng is and why teams use it instead of an ungrounded chatbot.',
    needKey: 'public.tour.STAGE-1-WHAT-IS-OKENG.need',
    learningOutcome:
      'Visitor learns that OKEng is a multi-tenant knowledge engine and embeddable assistant platform that enforces collection permissions before retrieval and cites canonical documents.',
    outcomeKey: 'public.tour.STAGE-1-WHAT-IS-OKENG.outcome',
    suggestedPrompt: 'What is OKEng, and what problem does it solve?',
    promptKey: 'public.tour.STAGE-1-WHAT-IS-OKENG.prompt',
    paraphrasePrompts: [
      'Why would my engineering team use OKEng for product documentation?',
    ],
    paraphraseKey: 'public.tour.STAGE-1-WHAT-IS-OKENG.paraphrase',
    acceptableSourceSet: {
      primaryFilenames: ['product-overview.md'],
      acceptableSecondaryFilenames: ['product-concepts.md', 'faq.md'],
    },
    requiredCapabilities: [
      'CAP-WORKSPACE-ISOLATION',
      'CAP-COLLECTION-RBAC',
      'CAP-BM25-RETRIEVAL',
      'CAP-GROUNDED-CITATIONS',
    ],
    expectedConceptKeywords: ['OKEng', 'collection', 'retrieval', 'citation'],
    progression: {
      kind: 'advance_stage',
      nextStageId: 'STAGE-2-WHAT-IT-DOES-TODAY',
      ctaLabelKey: 'public.tour.STAGE-1-WHAT-IS-OKENG.next_stage_cta',
      ctaLabelDefault: 'Next: What can it do today?',
      companionDocLink: {
        label: 'Read Getting Started Guide',
        labelKey: 'public.tour.STAGE-1-WHAT-IS-OKENG.cta_primary',
        url: '/docs/getting-started',
        category: 'docs',
      },
    },
    nextAction: {
      label: 'Read Getting Started Guide',
      url: '/docs/getting-started',
      category: 'docs',
    },
    accessAssumptions: {
      embedId: 'EMB-PUBLIC-HOME',
      callerIdentity: 'anonymous',
      allowedCollections: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'],
      excludedCollections: ['COL-CUSTOMER', 'COL-INTERNAL'],
    },
    fallbackAndErrorBehavior:
      'Renders deterministic answer from COL-PUBLIC/COL-DOCS without requiring an external LLM API key.',
    acceptanceTestId: 'TOUR-STAGE-01',
  },
  {
    stageNumber: 2,
    stageId: 'STAGE-2-WHAT-IT-DOES-TODAY',
    title: '2. What can it do today?',
    titleKey: 'public.tour.STAGE-2-WHAT-IT-DOES-TODAY.title',
    visitorNeed: 'Explore the practical features and file formats you can use right now.',
    needKey: 'public.tour.STAGE-2-WHAT-IT-DOES-TODAY.need',
    learningOutcome:
      'Visitor understands today’s verified capabilities (Markdown/text ingestion, 3-tier collections, BM25 + route/language ranking, live vs. simulator embed modes) and explicit boundaries.',
    outcomeKey: 'public.tour.STAGE-2-WHAT-IT-DOES-TODAY.outcome',
    suggestedPrompt: 'What can I do with OKEng today?',
    promptKey: 'public.tour.STAGE-2-WHAT-IT-DOES-TODAY.prompt',
    paraphrasePrompts: [
      'Which features and file types are supported in OKEng right now?',
    ],
    paraphraseKey: 'public.tour.STAGE-2-WHAT-IT-DOES-TODAY.paraphrase',
    acceptableSourceSet: {
      primaryFilenames: ['product-overview.md', 'faq.md'],
      acceptableSecondaryFilenames: ['files.md', 'embedding.md', 'getting-started.md'],
    },
    requiredCapabilities: [
      'CAP-FILE-INGESTION-BOUNDED',
      'CAP-COLLECTION-RBAC',
      'CAP-BM25-RETRIEVAL',
      'CAP-EMBED-MODES-BOUNDED',
    ],
    expectedConceptKeywords: ['OKEng', 'Markdown', 'collection'],
    progression: {
      kind: 'advance_stage',
      nextStageId: 'STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS',
      ctaLabelKey: 'public.tour.STAGE-2-WHAT-IT-DOES-TODAY.next_stage_cta',
      ctaLabelDefault: 'Next: Answers grounded in knowledge',
      companionDocLink: {
        label: 'Explore Documentation',
        labelKey: 'public.tour.STAGE-2-WHAT-IT-DOES-TODAY.cta_primary',
        url: '/docs',
        category: 'docs',
      },
    },
    nextAction: {
      label: 'Explore Documentation',
      url: '/docs',
      category: 'docs',
    },
    accessAssumptions: {
      embedId: 'EMB-PUBLIC-HOME',
      callerIdentity: 'anonymous',
      allowedCollections: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'],
      excludedCollections: ['COL-CUSTOMER', 'COL-INTERNAL'],
    },
    fallbackAndErrorBehavior:
      'Presents only Verified and accurately bounded Limited capabilities; never claims vector DBs, automated crawlers, or binary OCR.',
    acceptanceTestId: 'TOUR-STAGE-02',
  },
  {
    stageNumber: 3,
    stageId: 'STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS',
    title: '3. Answers grounded in knowledge',
    titleKey: 'public.tour.STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS.title',
    visitorNeed: 'See how OKEng answers from your docs, links to source files, and avoids guessing.',
    needKey: 'public.tour.STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS.need',
    learningOutcome:
      'Visitor learns how heading-aware chunking, BM25 scoring, verifiable citations (document + line range), and deterministic missing-topic refusal prevent fabrication.',
    outcomeKey: 'public.tour.STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS.outcome',
    suggestedPrompt:
      'How does OKEng answer questions using my documentation, and how do citations help me verify an answer?',
    promptKey: 'public.tour.STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS.prompt',
    paraphrasePrompts: [
      'How does OKEng chunk and score Markdown files to produce cited answers?',
    ],
    paraphraseKey: 'public.tour.STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS.paraphrase',
    acceptableSourceSet: {
      primaryFilenames: ['retrieval.md', 'ingestion.md'],
      acceptableSecondaryFilenames: ['markdown.md', 'product-concepts.md', 'faq.md'],
    },
    requiredCapabilities: [
      'CAP-HEADING-CHUNKING',
      'CAP-BM25-RETRIEVAL',
      'CAP-GROUNDED-CITATIONS',
      'CAP-MISSING-TOPIC-REFUSAL',
    ],
    expectedConceptKeywords: ['chunk', 'BM25', 'citation'],
    progression: {
      kind: 'advance_stage',
      nextStageId: 'STAGE-4-CONTEXT-AND-ACCESS-CONTROL',
      ctaLabelKey: 'public.tour.STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS.next_stage_cta',
      ctaLabelDefault: 'Next: Context and access control',
      companionDocLink: {
        label: 'Explore Retrieval Guide',
        labelKey: 'public.tour.STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS.cta_primary',
        url: '/docs/retrieval',
        category: 'docs',
      },
    },
    nextAction: {
      label: 'Explore Retrieval Guide',
      url: '/docs/retrieval',
      category: 'docs',
    },
    accessAssumptions: {
      embedId: 'EMB-PUBLIC-HOME',
      callerIdentity: 'anonymous',
      allowedCollections: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'],
      excludedCollections: ['COL-CUSTOMER', 'COL-INTERNAL'],
    },
    fallbackAndErrorBehavior:
      'When no authorized chunk meets the two-step relevance threshold (rawScore >= 1.35 and normalizedConfidence >= 0.25), returns a deterministic refusal with zero fabricated sources.',
    acceptanceTestId: 'TOUR-STAGE-03',
  },
  {
    stageNumber: 4,
    stageId: 'STAGE-4-CONTEXT-AND-ACCESS-CONTROL',
    title: '4. Context and access control',
    titleKey: 'public.tour.STAGE-4-CONTEXT-AND-ACCESS-CONTROL.title',
    visitorNeed: 'See how you control access across public, customer, and internal documentation.',
    needKey: 'public.tour.STAGE-4-CONTEXT-AND-ACCESS-CONTROL.need',
    learningOutcome:
      'Visitor understands EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections before retrieval, why invalid tokens halt with 401, and how current_url boosts relevant authorized docs.',
    outcomeKey: 'public.tour.STAGE-4-CONTEXT-AND-ACCESS-CONTROL.outcome',
    suggestedPrompt:
      'How do collections, visibility tiers, and host context control what an Embed can retrieve?',
    promptKey: 'public.tour.STAGE-4-CONTEXT-AND-ACCESS-CONTROL.prompt',
    paraphrasePrompts: [
      'How does OKEng enforce everyone, members, and admins permissions before retrieval?',
    ],
    paraphraseKey: 'public.tour.STAGE-4-CONTEXT-AND-ACCESS-CONTROL.paraphrase',
    acceptableSourceSet: {
      primaryFilenames: ['collections.md', 'access-control.md', 'security-overview.md'],
      acceptableSecondaryFilenames: ['retrieval.md', 'embedding.md'],
    },
    requiredCapabilities: [
      'CAP-COLLECTION-RBAC',
      'CAP-SIGNED-HOST-IDENTITY',
      'CAP-ROUTE-CONTEXT-BOOST',
    ],
    expectedConceptKeywords: ['everyone', 'members', 'admins'],
    progression: {
      kind: 'advance_stage',
      nextStageId: 'STAGE-5-GET-STARTED',
      ctaLabelKey: 'public.tour.STAGE-4-CONTEXT-AND-ACCESS-CONTROL.next_stage_cta',
      ctaLabelDefault: 'Next: Get started',
      companionDocLink: {
        label: 'Read Access Control Guide',
        labelKey: 'public.tour.STAGE-4-CONTEXT-AND-ACCESS-CONTROL.cta_primary',
        url: '/docs/access-control',
        category: 'docs',
      },
    },
    nextAction: {
      label: 'Read Access Control Guide',
      url: '/docs/access-control',
      category: 'docs',
    },
    accessAssumptions: {
      embedId: 'EMB-PUBLIC-HOME',
      callerIdentity: 'anonymous',
      allowedCollections: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'],
      excludedCollections: ['COL-CUSTOMER', 'COL-INTERNAL'],
    },
    fallbackAndErrorBehavior:
      'Host route context never overrides collection visibility; invalid or tampered tokens fail closed with 401.',
    acceptanceTestId: 'TOUR-STAGE-04',
  },
  {
    stageNumber: 5,
    stageId: 'STAGE-5-GET-STARTED',
    title: '5. Get started',
    titleKey: 'public.tour.STAGE-5-GET-STARTED.title',
    visitorNeed: 'Follow the quick steps to set up your workspace and add the assistant to your site.',
    needKey: 'public.tour.STAGE-5-GET-STARTED.need',
    learningOutcome:
      'Visitor learns the 4-step workflow (Workspace -> Collections & Markdown -> Embed Studio -> Test Console & Installation) and can jump directly to Getting Started or Sign Up.',
    outcomeKey: 'public.tour.STAGE-5-GET-STARTED.outcome',
    suggestedPrompt:
      'What are the steps to get started and integrate OKEng into my website or application?',
    promptKey: 'public.tour.STAGE-5-GET-STARTED.prompt',
    paraphrasePrompts: [
      'How do I set up my first OKEng workspace and embed it on my site?',
    ],
    paraphraseKey: 'public.tour.STAGE-5-GET-STARTED.paraphrase',
    acceptableSourceSet: {
      primaryFilenames: ['getting-started.md', 'embedding.md'],
      acceptableSecondaryFilenames: ['workspaces.md', 'faq.md', 'product-overview.md'],
    },
    requiredCapabilities: [
      'CAP-WORKSPACE-ISOLATION',
      'CAP-EMBED-MODES-BOUNDED',
      'CAP-INSTALLATION-RECIPE',
    ],
    expectedConceptKeywords: ['workspace', 'collection', 'embed'],
    progression: {
      kind: 'terminal',
      primaryDestination: {
        label: 'Create Free Account',
        labelKey: 'public.tour.STAGE-5-GET-STARTED.cta_primary',
        url: '/signup',
        category: 'signup',
      },
      secondaryDestination: {
        label: 'Read Getting Started Guide',
        labelKey: 'public.tour.STAGE-5-GET-STARTED.cta_secondary',
        url: '/docs/getting-started',
        category: 'docs',
      },
      restartActionLabelKey: 'public.tour.restart',
      restartActionLabelDefault: 'Restart tour',
    },
    nextAction: {
      label: 'Create Free Account',
      url: '/signup',
      category: 'signup',
    },
    secondaryAction: {
      label: 'Read Getting Started Guide',
      url: '/docs/getting-started',
      category: 'docs',
    },
    accessAssumptions: {
      embedId: 'EMB-PUBLIC-HOME',
      callerIdentity: 'anonymous',
      allowedCollections: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'],
      excludedCollections: ['COL-CUSTOMER', 'COL-INTERNAL'],
    },
    fallbackAndErrorBehavior:
      'Both /signup and /docs/getting-started resolve deterministically via the public AppRouter.',
    acceptanceTestId: 'TOUR-STAGE-05',
  },
];

const CAPABILITY_MAP = new Map<string, CanonicalCapabilityEntry>(
  CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY.map((entry) => [entry.id, entry])
);

export function resolveTourStageCapabilities(
  stage: HomepageTourStageContract
): CanonicalCapabilityEntry[] {
  return stage.requiredCapabilities
    .map((capId) => CAPABILITY_MAP.get(capId))
    .filter((entry): entry is CanonicalCapabilityEntry => Boolean(entry));
}

export function getTourStageContract(
  stageId: HomepageTourStageId
): HomepageTourStageContract {
  const found = APPROVED_HOMEPAGE_TOUR_CONTRACT.find((s) => s.stageId === stageId);
  if (!found) {
    throw new Error(`Unknown HomepageTourStageId: ${stageId}`);
  }
  return found;
}

export const OUT_OF_DOMAIN_REFUSAL_PROBE =
  'What is the orbital velocity of Jupiter moons in relativistic quantum mechanics?';

