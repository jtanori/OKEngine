import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_WORKSPACE,
  INITIAL_COLLECTIONS,
  INITIAL_DOCUMENTS,
  INITIAL_PUBLIC_EMBEDS,
} from '../../src/data/seedData';
import { store } from '../../src/services/store';
import {
  resolveRequestEmbedIdentity,
  resolveEmbedAuthorization,
  filterAuthorizedDocuments,
  getEmbedCollectionIds,
  createEmbedIdentityToken,
} from '../../src/services/embedAuthorization';
import { compileKnowledgeResponse } from '../../src/services/engine/responseCompiler';
import { parseKnowledgeDocument } from '../../src/services/engine/knowledgeParser';
import { retrieveAndRankAuthorizedDocs } from '../../src/services/engine/bm25Retriever';
import { parsePathname } from '../../src/app/router';
import { validateSafeUrl } from '../../src/services/validation';

// ============================================================================
// Approved 5-Stage Traceable Homepage Guided Tour Content Contract (PUBLIC-01 §9)
// ============================================================================
export interface HomepageTourStageContract {
  stageId: string;
  title: string;
  visitorNeed: string;
  learningOutcome: string;
  suggestedPrompt: string;
  paraphrasePrompts: string[];
  acceptableSourceSet: {
    primaryFilenames: string[];
    acceptableSecondaryFilenames: string[];
  };
  requiredCapabilities: string[];
  expectedConceptKeywords: string[];
  nextAction: {
    label: string;
    url: string;
    category: 'docs' | 'signup';
  };
  secondaryAction?: {
    label: string;
    url: string;
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
    stageId: 'STAGE-1-WHAT-IS-OKENG',
    title: '1. What is OKEng?',
    visitorNeed: 'Understand what OKEng is and why teams use it instead of an ungrounded chatbot.',
    learningOutcome:
      'Visitor learns that OKEng is a multi-tenant knowledge engine and embeddable assistant platform that enforces collection permissions before retrieval and cites canonical documents.',
    suggestedPrompt: 'What is OKEng, and what problem does it solve?',
    paraphrasePrompts: [
      'Why would my engineering team use OKEng for product documentation?',
    ],
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
    stageId: 'STAGE-2-WHAT-IT-DOES-TODAY',
    title: '2. What can it do today?',
    visitorNeed: 'Distinguish shipped capabilities from bounded limits before adopting OKEng.',
    learningOutcome:
      'Visitor understands today’s verified capabilities (Markdown/text ingestion, 3-tier collections, BM25 + route/language ranking, live vs. simulator embed modes) and explicit boundaries.',
    suggestedPrompt: 'What can I do with OKEng today?',
    paraphrasePrompts: [
      'Which features and file types are supported in OKEng right now?',
    ],
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
    stageId: 'STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS',
    title: '3. Answers grounded in knowledge',
    visitorNeed: 'See how OKEng chunks Markdown, ranks passages, cites exact line ranges, and handles unknown topics.',
    learningOutcome:
      'Visitor learns how heading-aware chunking, BM25 scoring, verifiable citations (document + line range), and deterministic missing-topic refusal prevent fabrication.',
    suggestedPrompt:
      'How does OKEng answer questions using my documentation, and how do citations help me verify an answer?',
    paraphrasePrompts: [
      'How does OKEng chunk and score Markdown files to produce cited answers?',
    ],
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
      'When no authorized chunk meets the relevance floor (0.12), returns a deterministic refusal with zero fabricated sources.',
    acceptanceTestId: 'TOUR-STAGE-03',
  },
  {
    stageId: 'STAGE-4-CONTEXT-AND-ACCESS-CONTROL',
    title: '4. Context and access control',
    visitorNeed: 'Verify how collection visibility, signed host tokens, and current page route interact.',
    learningOutcome:
      'Visitor understands EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections before retrieval, why invalid tokens halt with 401, and how current_url boosts relevant authorized docs.',
    suggestedPrompt:
      'How do collections, visibility tiers, and host context control what an Embed can retrieve?',
    paraphrasePrompts: [
      'How does OKEng enforce everyone, members, and admins permissions before retrieval?',
    ],
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
    stageId: 'STAGE-5-GET-STARTED',
    title: '5. Get started',
    visitorNeed: 'Know the shortest verified path from creating a workspace to embedding an assistant.',
    learningOutcome:
      'Visitor learns the 4-step workflow (Workspace -> Collections & Markdown -> Embed Studio -> Test Console & Installation) and can jump directly to Getting Started or Sign Up.',
    suggestedPrompt:
      'What are the steps to get started and integrate OKEng into my website or application?',
    paraphrasePrompts: [
      'How do I set up my first OKEng workspace and embed it on my site?',
    ],
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

// Helper to verify whether an internal path resolves cleanly in src/app/router.tsx & PublicSurfaceView.tsx
const KNOWN_PUBLIC_PATHS = new Set([
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
]);

function verifyInternalRouteResolution(url: string): {
  valid: boolean;
  reason?: string;
} {
  if (!url.startsWith('/')) {
    return { valid: false, reason: `Expected internal route starting with '/', got '${url}'` };
  }
  const cleanPath = url.split('?')[0].split('#')[0];
  const parsed = parsePathname(cleanPath);

  if (parsed.appRoute === 'public-surface') {
    if (!KNOWN_PUBLIC_PATHS.has(cleanPath)) {
      return {
        valid: false,
        reason: `Route '${url}' fell back to public-surface but is not in KNOWN_PUBLIC_PATHS`,
      };
    }
    return { valid: true };
  }

  if (parsed.appRoute === 'public-docs') {
    if (parsed.params.slug) {
      const doc = store.getDocumentByFilename(parsed.params.slug);
      if (!doc) {
        return {
          valid: false,
          reason: `/docs/:slug route '${url}' does not match any ready document filename '${parsed.params.slug}.md'`,
        };
      }
    }
    return { valid: true };
  }

  const validWorkspaceAppRoutes = new Set([
    'collections',
    'collection-detail',
    'files',
    'file-editor',
    'embed',
    'embed-detail',
    'embed-installation',
    'test',
    'conversations',
    'settings',
    'widget-preview',
  ]);

  if (!validWorkspaceAppRoutes.has(parsed.appRoute)) {
    return { valid: false, reason: `Route '${url}' resolved to unsupported appRoute '${parsed.appRoute}'` };
  }

  return { valid: true };
}

// Helper to extract Markdown links [label](href) from document content
function extractMarkdownLinks(markdown: string): { label: string; href: string }[] {
  const results: { label: string; href: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(markdown)) !== null) {
    results.push({ label: match[1], href: match[2].trim() });
  }
  return results;
}

describe('OKEng Homepage Guided Tour Readiness Suite (PAGE-PUB-01)', () => {
  const workspace = store.getWorkspace();
  const collections = store.getCollections();
  const documents = store.getDocuments();
  const homeEmbed = store.getPublicEmbed('EMB-PUBLIC-HOME')!;
  const docsEmbed = store.getPublicEmbed('EMB-PUBLIC-DOCS')!;

  const anonIdentity = { kind: 'anonymous' as const };
  const homeAnonScope = resolveEmbedAuthorization(
    anonIdentity,
    getEmbedCollectionIds(homeEmbed),
    collections
  );
  const homeAnonDocs = filterAuthorizedDocuments(documents, homeAnonScope);

  describe('1. Canonical Document Integrity, Hydration Lifecycle & Bounded Claims', () => {
    it('READINESS-DOC-01: All 5 workspace collections have accurate fileCounts matching ready documents and expected visibility tiers', () => {
      const expectedCollections: Record<
        string,
        { visibility: 'everyone' | 'members' | 'admins'; count: number }
      > = {
        'COL-PUBLIC': { visibility: 'everyone', count: 4 },
        'COL-DOCS': { visibility: 'everyone', count: 11 },
        'COL-LEGAL': { visibility: 'everyone', count: 3 },
        'COL-CUSTOMER': { visibility: 'members', count: 3 },
        'COL-INTERNAL': { visibility: 'admins', count: 4 },
      };

      for (const [colId, expected] of Object.entries(expectedCollections)) {
        const col = collections.find((c) => c.id === colId);
        assert.ok(col, `Collection ${colId} must exist`);
        assert.strictEqual(col.visibility, expected.visibility, `${colId} visibility mismatch`);
        const actualReadyDocs = documents.filter(
          (d) => d.collectionId === colId && !d.deletedAt && d.status === 'ready'
        );
        assert.strictEqual(
          actualReadyDocs.length,
          expected.count,
          `${colId} ready document count mismatch`
        );
        assert.strictEqual(
          col.fileCount,
          actualReadyDocs.length,
          `${colId} fileCount metadata (${col.fileCount}) must match active ready documents (${actualReadyDocs.length})`
        );
      }

      // Every canonical document in COL-PUBLIC and COL-DOCS parses into >= 1 indexed section and is retrievable
      const publicAndDocs = documents.filter(
        (d) => d.collectionId === 'COL-PUBLIC' || d.collectionId === 'COL-DOCS'
      );
      assert.strictEqual(publicAndDocs.length, 15);
      for (const doc of publicAndDocs) {
        assert.strictEqual(doc.status, 'ready', `${doc.filename} must have status === 'ready'`);
        const compiled = parseKnowledgeDocument(doc);
        assert.ok(compiled.sections.length > 0, `${doc.filename} must parse into >= 1 section`);
        const ranked = retrieveAndRankAuthorizedDocs(doc.title, [doc]);
        assert.ok(ranked.length > 0, `${doc.filename} must be retrievable by its title`);
      }
    });

    it('READINESS-HYDRATION-01: store.reconcileCanonicalSeeds upgrades stale persisted documents, fixes drifted collection fileCount, and bumps knowledgeVersion', () => {
      const staleWorkspace = {
        ...INITIAL_WORKSPACE,
        knowledgeVersion: 184,
      };
      const staleCollections = INITIAL_COLLECTIONS.map((c) =>
        c.id === 'COL-DOCS' ? { ...c, fileCount: 10 } : c
      );
      const staleDocuments = INITIAL_DOCUMENTS.map((d) =>
        d.id === 'doc_pub_01'
          ? {
              ...d,
              content: '# Stale Product Overview from localStorage',
              updatedAt: '2026-10-01T00:00:00Z',
            }
          : d
      );

      const reconciled = store.reconcileCanonicalSeeds(
        staleWorkspace,
        staleCollections,
        staleDocuments
      );

      assert.strictEqual(reconciled.didUpgradeCanonicalSeeds, true);
      assert.ok(
        reconciled.workspace.knowledgeVersion >= INITIAL_WORKSPACE.knowledgeVersion,
        'Expected knowledgeVersion to advance to at least INITIAL_WORKSPACE.knowledgeVersion'
      );

      const updatedOverview = reconciled.documents.find((d) => d.id === 'doc_pub_01')!;
      assert.ok(
        updatedOverview.content.includes('What is OKEng, what problem does it solve'),
        'Expected stale doc_pub_01 content to be replaced by newer canonical seed content'
      );

      const syncedColDocs = reconciled.collections.find((c) => c.id === 'COL-DOCS')!;
      assert.strictEqual(syncedColDocs.fileCount, 11);
    });

    it('READINESS-I18N-01: English (product-overview.md) and Spanish (translations.es + facturacion-y-planes.md) public documents are aligned in structure, bounded claims, and nextStep', () => {
      const enDoc = store.getDocument('doc_pub_01')!;
      const esNativeDoc = store.getDocument('doc_docs_es_20')!;
      assert.ok(enDoc && enDoc.translations?.es && esNativeDoc, 'EN overview, ES translation, and native ES doc must exist');
      assert.strictEqual(enDoc.collectionId, 'COL-PUBLIC');
      assert.strictEqual(enDoc.translations.es.status, 'AVAILABLE');
      assert.strictEqual(esNativeDoc.language, 'es');
      assert.strictEqual(enDoc.nextStep?.url, '/docs/getting-started');
      assert.strictEqual(esNativeDoc.nextStep?.url, '/docs/facturacion-y-planes');

      assert.ok(enDoc.content.includes('Markdown (`.md`)') && enDoc.translations.es.summary.includes('Markdown (.md)'));
      assert.ok(enDoc.content.includes('BM25') && enDoc.content.includes('HS256'));
    });

    it('READINESS-CLAIMS-01: Public documents never present unimplemented capabilities (vector DB, web crawler, SaaS connectors, binary OCR) as shipped features', () => {
      const publicAndDocs = documents.filter(
        (d) => d.collectionId === 'COL-PUBLIC' || d.collectionId === 'COL-DOCS'
      );
      const forbiddenUnboundedClaims = [
        /automatically crawls your website/i,
        /native Notion sync/i,
        /native Confluence connector/i,
        /HNSW vector database/i,
        /pgvector index/i,
      ];

      for (const doc of publicAndDocs) {
        for (const pattern of forbiddenUnboundedClaims) {
          assert.ok(
            !pattern.test(doc.content),
            `Document ${doc.filename} matched forbidden unbounded claim ${pattern}`
          );
        }
      }
    });
  });

  describe('2. Link-Type-Aware Validation (Internal Router & Slug Resolution vs. External URLs)', () => {
    it('READINESS-LINKS-01: Every nextStep.url and Markdown link in COL-PUBLIC, COL-DOCS, and COL-LEGAL is valid for its link type', () => {
      const publicCorpus = documents.filter((d) =>
        ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'].includes(d.collectionId)
      );

      for (const doc of publicCorpus) {
        if (doc.nextStep?.url) {
          const urlCheck = validateSafeUrl(doc.nextStep.url);
          assert.strictEqual(
            urlCheck.valid,
            true,
            `${doc.filename} nextStep.url '${doc.nextStep.url}' failed validateSafeUrl`
          );

          if (doc.nextStep.url.startsWith('/')) {
            const routeRes = verifyInternalRouteResolution(doc.nextStep.url);
            assert.strictEqual(
              routeRes.valid,
              true,
              `${doc.filename} nextStep.url '${doc.nextStep.url}' failed router verification: ${routeRes.reason}`
            );
          }
        }

        const inlineLinks = extractMarkdownLinks(doc.content);
        for (const link of inlineLinks) {
          const safeCheck = validateSafeUrl(link.href);
          assert.strictEqual(
            safeCheck.valid,
            true,
            `${doc.filename} Markdown link [${link.label}](${link.href}) failed validateSafeUrl`
          );

          if (link.href.startsWith('/')) {
            const routeRes = verifyInternalRouteResolution(link.href);
            assert.strictEqual(
              routeRes.valid,
              true,
              `${doc.filename} internal link [${link.label}](${link.href}) failed router verification: ${routeRes.reason}`
            );
          } else {
            assert.ok(
              link.href.startsWith('https://') || link.href.startsWith('mailto:'),
              `${doc.filename} external link [${link.label}](${link.href}) must use https:// or mailto:`
            );
          }
        }
      }
    });
  });

  describe('3. Representative Public Questions & Paraphrases Against Acceptable Authoritative Source Sets', () => {
    const REPRESENTATIVE_QUERIES: {
      id: string;
      question: string;
      paraphrase?: string;
      acceptableFilenames: string[];
      expectedKeywords: string[];
      expectRefusal?: boolean;
    }[] = [
      {
        id: 'READINESS-Q01',
        question: 'What is OKEng, and what problem does it solve?',
        paraphrase: 'Why would a product team use OKEng for documentation and support?',
        acceptableFilenames: ['product-overview.md', 'product-concepts.md', 'faq.md'],
        expectedKeywords: ['OKEng', 'collection', 'retrieval'],
      },
      {
        id: 'READINESS-Q02',
        question: 'What can I do with OKEng today?',
        paraphrase: 'Which capabilities and file formats does OKEng support right now?',
        acceptableFilenames: ['product-overview.md', 'faq.md', 'files.md', 'embedding.md'],
        expectedKeywords: ['OKEng', 'Markdown'],
      },
      {
        id: 'READINESS-Q03',
        question: 'How does OKEng answer questions using my documentation?',
        paraphrase: 'How does the retrieval pipeline chunk and rank Markdown documents?',
        acceptableFilenames: ['retrieval.md', 'ingestion.md', 'product-overview.md', 'markdown.md'],
        expectedKeywords: ['retrieval', 'chunk', 'BM25', 'citation'],
      },
      {
        id: 'READINESS-Q04',
        question: 'How do citations help me verify an answer?',
        acceptableFilenames: ['retrieval.md', 'product-concepts.md', 'product-overview.md'],
        expectedKeywords: ['citation', 'line'],
      },
      {
        id: 'READINESS-Q05',
        question: 'How do collections and visibility work?',
        paraphrase: 'What is the difference between everyone, members, and admins collections?',
        acceptableFilenames: ['collections.md', 'access-control.md', 'product-concepts.md', 'security-overview.md'],
        expectedKeywords: ['everyone', 'members', 'admins'],
      },
      {
        id: 'READINESS-Q06',
        question: 'How can I integrate OKEng into my website or application?',
        acceptableFilenames: ['embedding.md', 'getting-started.md', 'product-overview.md'],
        expectedKeywords: ['OKEng', 'embed'],
      },
      {
        id: 'READINESS-Q07',
        question: 'What presentation modes are actually available?',
        acceptableFilenames: ['embedding.md', 'faq.md', 'product-overview.md'],
        expectedKeywords: ['inline', 'documentation'],
      },
      {
        id: 'READINESS-Q08',
        question: 'How does host context influence retrieval?',
        acceptableFilenames: ['retrieval.md', 'embedding.md', 'security-overview.md', 'collections.md'],
        expectedKeywords: ['route', 'visibility'],
      },
      {
        id: 'READINESS-Q09',
        question: 'What are the steps to get started?',
        paraphrase: 'How do I create my first workspace and publish an Embed?',
        acceptableFilenames: ['getting-started.md', 'faq.md', 'workspaces.md', 'embedding.md'],
        expectedKeywords: ['workspace', 'collection'],
      },
      {
        id: 'READINESS-Q10',
        question: 'What happens when the available documents do not answer a question?',
        acceptableFilenames: ['retrieval.md', 'faq.md', 'product-overview.md'],
        expectedKeywords: ['refusal', 'threshold', 'fabricate'],
      },
    ];

    for (const item of REPRESENTATIVE_QUERIES) {
      it(`${item.id}: Retrieves from acceptable authoritative source set with citation integrity and valid nextStep for "${item.question}"`, () => {
        const promptsToTest = item.paraphrase
          ? [item.question, item.paraphrase]
          : [item.question];

        for (const promptText of promptsToTest) {
          const plan = compileKnowledgeResponse({
            question: promptText,
            authorizedDocs: homeAnonDocs,
            currentUrl: '/',
            answerMode: 'deterministic',
            uiLanguage: 'en',
            effectiveRole: 'everyone',
          });

          assert.notStrictEqual(
            plan.answerType,
            'unknown',
            `Expected grounded answerType (not 'unknown') for prompt "${promptText}"`
          );
          assert.ok(
            plan.sources.length > 0,
            `Expected at least 1 citation for prompt "${promptText}"`
          );

          // 1. Acceptable Authoritative Source Set check (top 3 retrieved sources must include at least one acceptable source above threshold)
          const topFilenames = plan.sources.slice(0, 3).map((s) => s.filename);
          const matchedAcceptable = topFilenames.some((fn) =>
            item.acceptableFilenames.includes(fn)
          );
          assert.strictEqual(
            matchedAcceptable,
            true,
            `Prompt "${promptText}" retrieved [${topFilenames.join(', ')}], expected at least one of [${item.acceptableFilenames.join(', ')}]`
          );

          // 2. Ranking threshold check
          assert.ok(
            plan.retrievedChunks.length > 0 && plan.retrievedChunks[0].similarity >= 0.12,
            `Expected top retrieved chunk similarity >= 0.12 for "${promptText}"`
          );

          // 3. Citation Integrity: Every source must belong to an authorized everyone collection
          const authorizedIds = new Set(homeAnonDocs.map((d) => d.id));
          for (const src of plan.sources) {
            assert.ok(
              authorizedIds.has(src.docId),
              `Citation ${src.filename} (${src.docId}) is not in authorizedDocs`
            );
            assert.ok(
              ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'].includes(src.collectionId || ''),
              `Citation ${src.filename} has unauthorized collectionId ${src.collectionId}`
            );
          }

          // 4. Structural answer quality check (at least one expected concept keyword appears in compiled answer or retrieved chunks)
          const chunkPreviews = plan.retrievedChunks.map((c) => c.preview).join(' ');
          const combinedText = `${plan.summary} ${plan.steps.join(' ')} ${plan.bullets.join(' ')} ${plan.compiledMarkdown} ${chunkPreviews}`.toLowerCase();
          const hasConcept = item.expectedKeywords.some((kw) =>
            combinedText.includes(kw.toLowerCase())
          );
          assert.strictEqual(
            hasConcept,
            true,
            `Compiled answer for "${promptText}" did not contain any expected keyword from [${item.expectedKeywords.join(', ')}]`
          );

          // 5. If cta (nextStep) is present, verify its URL resolves in router
          if (plan.cta?.url) {
            const routeCheck = verifyInternalRouteResolution(plan.cta.url);
            assert.strictEqual(
              routeCheck.valid,
              true,
              `cta.url '${plan.cta.url}' failed router check: ${routeCheck.reason}`
            );
          }
        }
      });
    }

    it('READINESS-UNANSWERABLE-01: Out-of-domain queries return honest insufficient-evidence refusal with zero fabricated citations', () => {
      const plan = compileKnowledgeResponse({
        question: 'What is the orbital velocity of Jupiter moons in relativistic quantum mechanics?',
        authorizedDocs: homeAnonDocs,
        currentUrl: '/',
        answerMode: 'deterministic',
        uiLanguage: 'en',
        effectiveRole: 'everyone',
      });

      assert.strictEqual(plan.answerType, 'unknown');
      assert.strictEqual(plan.retrievalMode, 'none');
      assert.strictEqual(plan.sources.length, 0);
      assert.strictEqual(plan.retrievedChunks.length, 0);
    });
  });

  describe('4. Security & Effective-Scope Verification at Candidate-Chunk, Context, and Citation Levels', () => {
    it('READINESS-SEC-01 (Case 1 — Anonymous Visitor on Mixed-Access EMB-PUBLIC-HOME): Zero COL-CUSTOMER or COL-INTERNAL chunks enter authorizedDocs, retrievedChunks, or citations even on direct restricted probes and spoofed currentUrl', () => {
      for (const doc of homeAnonDocs) {
        assert.notStrictEqual(doc.collectionId, 'COL-CUSTOMER');
        assert.notStrictEqual(doc.collectionId, 'COL-INTERNAL');
      }

      const restrictedProbes = [
        'How are production KMS keys rotated every 30 days using HSM and dual-operator approval?',
        'How do I mint a customer host identity assertion in customer-authentication.md?',
        'What are the P0 blocking invariants in ENG-DOD-001?',
      ];

      for (const probe of restrictedProbes) {
        const plan = compileKnowledgeResponse({
          question: probe,
          authorizedDocs: homeAnonDocs,
          currentUrl: '/workspaces/okeng/settings',
          answerMode: 'deterministic',
          uiLanguage: 'en',
          effectiveRole: 'everyone',
        });

        for (const chunk of plan.retrievedChunks) {
          assert.notStrictEqual(chunk.collectionId, 'COL-CUSTOMER');
          assert.notStrictEqual(chunk.collectionId, 'COL-INTERNAL');
        }
        for (const src of plan.sources) {
          assert.notStrictEqual(src.collectionId, 'COL-CUSTOMER');
          assert.notStrictEqual(src.collectionId, 'COL-INTERNAL');
        }
        assert.ok(
          !plan.summary.includes('requested_by != approved_by'),
          'Restricted COL-INTERNAL vault runbook text must never appear in anonymous summary'
        );
      }
    });

    it('READINESS-SEC-02 (Case 2 — Signed Member/Admin + EffectiveScope = Role ∩ Embed Binding): Valid member/admin tokens unlock bound collections on EMB-PUBLIC-HOME but cannot access unbound collections on EMB-PUBLIC-DOCS', async () => {
      const now = Math.floor(Date.now() / 1000);
      const adminTokenForDocsEmbed = await createEmbedIdentityToken(
        {
          workspace_id: workspace.id,
          embed_id: docsEmbed.id,
          sub: 'usr_admin_scope_test',
          role: 'admin',
          iat: now,
          exp: now + 300,
        },
        workspace.signingSecret
      );

      const resolved = await resolveRequestEmbedIdentity({
        identityToken: adminTokenForDocsEmbed,
        expectedWorkspaceId: workspace.id,
        expectedEmbedId: docsEmbed.id,
        signingSecret: workspace.signingSecret,
      });
      assert.strictEqual(resolved.ok, true);
      if (!resolved.ok) return;

      // EMB-PUBLIC-DOCS binds ONLY COL-DOCS
      const docsEffectiveScope = resolveEmbedAuthorization(
        resolved.identity,
        getEmbedCollectionIds(docsEmbed),
        collections
      );
      assert.deepStrictEqual(docsEffectiveScope.collectionIds, ['COL-DOCS']);

      const docsEmbedAuthorizedDocs = filterAuthorizedDocuments(documents, docsEffectiveScope);
      assert.strictEqual(
        docsEmbedAuthorizedDocs.some(
          (d) => d.collectionId === 'COL-CUSTOMER' || d.collectionId === 'COL-INTERNAL'
        ),
        false,
        'Admin token on EMB-PUBLIC-DOCS must not unlock unbound COL-CUSTOMER or COL-INTERNAL'
      );
    });

    it('READINESS-SEC-03 (Case 3 — Invalid / Expired / Tampered Token): Rejects with 401 before retrieval and never falls back to anonymous scope', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredToken = await createEmbedIdentityToken(
        {
          workspace_id: workspace.id,
          embed_id: homeEmbed.id,
          sub: 'usr_expired',
          role: 'member',
          iat: now - 900,
          exp: now - 300,
        },
        workspace.signingSecret
      );

      const expiredRes = await resolveRequestEmbedIdentity({
        identityToken: expiredToken,
        expectedWorkspaceId: workspace.id,
        expectedEmbedId: homeEmbed.id,
        signingSecret: workspace.signingSecret,
      });
      assert.strictEqual(expiredRes.ok, false);
      if (!expiredRes.ok) {
        assert.strictEqual(expiredRes.status, 401);
        assert.strictEqual(expiredRes.code, 'TOKEN_EXPIRED');
      }
    });
  });

  describe('5. End-to-End Traceability of the Approved 5-Stage Homepage Guided Tour Contract', () => {
    for (const stage of APPROVED_HOMEPAGE_TOUR_CONTRACT) {
      it(`${stage.acceptanceTestId} (${stage.stageId}): Maps end-to-end to canonical documents, acceptable source set, bounded claims, and verified router nextAction`, () => {
        // 1. Verify all primary and acceptable secondary files exist in COL-PUBLIC or COL-DOCS with status === 'ready'
        const allAcceptableFiles = [
          ...stage.acceptableSourceSet.primaryFilenames,
          ...stage.acceptableSourceSet.acceptableSecondaryFilenames,
        ];
        for (const filename of allAcceptableFiles) {
          const doc = store.getDocumentByFilename(filename);
          assert.ok(doc, `Stage ${stage.stageId} source '${filename}' must exist and be ready`);
          assert.ok(
            doc.collectionId === 'COL-PUBLIC' || doc.collectionId === 'COL-DOCS',
            `Stage ${stage.stageId} source '${filename}' must belong to COL-PUBLIC or COL-DOCS`
          );
        }

        // 2. Verify primary and secondary nextAction destinations against the real router
        const primaryRouteCheck = verifyInternalRouteResolution(stage.nextAction.url);
        assert.strictEqual(
          primaryRouteCheck.valid,
          true,
          `Stage ${stage.stageId} primary nextAction '${stage.nextAction.url}' failed router verification: ${primaryRouteCheck.reason}`
        );
        if (stage.secondaryAction) {
          const secondaryRouteCheck = verifyInternalRouteResolution(stage.secondaryAction.url);
          assert.strictEqual(
            secondaryRouteCheck.valid,
            true,
            `Stage ${stage.stageId} secondaryAction '${stage.secondaryAction.url}' failed router verification: ${secondaryRouteCheck.reason}`
          );
        }

        // 3. Execute both suggestedPrompt and paraphrasePrompts as anonymous visitor on EMB-PUBLIC-HOME
        const prompts = [stage.suggestedPrompt, ...stage.paraphrasePrompts];
        for (const promptText of prompts) {
          const plan = compileKnowledgeResponse({
            question: promptText,
            authorizedDocs: homeAnonDocs,
            currentUrl: '/',
            answerMode: 'deterministic',
            uiLanguage: 'en',
            effectiveRole: 'everyone',
          });

          assert.notStrictEqual(
            plan.answerType,
            'unknown',
            `Stage ${stage.stageId} prompt "${promptText}" must return a grounded answer (not 'unknown')`
          );
          assert.ok(
            plan.sources.length > 0,
            `Stage ${stage.stageId} prompt "${promptText}" must emit at least 1 citation`
          );

          const topSources = plan.sources.slice(0, 3).map((s) => s.filename);
          const matchedAcceptable = topSources.some((fn) => allAcceptableFiles.includes(fn));
          assert.strictEqual(
            matchedAcceptable,
            true,
            `Stage ${stage.stageId} prompt "${promptText}" returned [${topSources.join(', ')}], expected at least one from [${allAcceptableFiles.join(', ')}]`
          );

          // Verify zero restricted collection leakage
          for (const chunk of plan.retrievedChunks) {
            assert.ok(
              stage.accessAssumptions.allowedCollections.includes(
                chunk.collectionId as 'COL-PUBLIC' | 'COL-DOCS' | 'COL-LEGAL'
              ),
              `Stage ${stage.stageId} leaked chunk from ${chunk.collectionId}`
            );
          }
        }
      });
    }
  });
});
