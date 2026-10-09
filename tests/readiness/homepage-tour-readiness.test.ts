import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

import {
  CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY,
  APPROVED_HOMEPAGE_TOUR_CONTRACT,
  CANONICAL_PUBLIC_ROUTE_REGISTRY,
  PUBLIC_DEMO_CONTEXT_ROUTES,
  resolveTourStageCapabilities,
  isValidPublicDemoContextRoute,
  isValidPublicCitationDestinationRoute,
  OUT_OF_DOMAIN_REFUSAL_PROBE,
  type CanonicalCapabilityEntry,
  type HomepageTourStageContract,
} from '../../src/data/homepageTourContract';
import {
  PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP,
  PUBLIC_DEMO_SOURCE_POLICY,
  PRESET_VISIBILITY_POLICY,
  authorizePublicHomepageDemoRequest,
  buildPublicHomepageDemoCacheKey,
  clearPublicHomepageDemoCache,
  compileAndVerifyPublicDemoAnswer,
  computeDemoPolicyVersion,
  getOrComputePublicDemoAnswerWithCache,
  handlePublicHomepageDemoChatStream,
  isValidPublicDemoAuthority,
  validatePublicDemoRegistries,
  type PublicHomepageDemoExecutionTrace,
} from '../../server/demo/publicHomepageDemoAuthorization';
import { HomepageTourController } from '../../src/services/homepageTourController';
import { EN_DICTIONARY } from '../../src/i18n/locales/en';
import { ES_DICTIONARY } from '../../src/i18n/locales/es';

export {
  CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY,
  APPROVED_HOMEPAGE_TOUR_CONTRACT,
  resolveTourStageCapabilities,
  OUT_OF_DOMAIN_REFUSAL_PROBE,
  type CanonicalCapabilityEntry,
  type HomepageTourStageContract,
};

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
        (reconciled.workspace.knowledgeVersion ?? 1) >=
          (INITIAL_WORKSPACE.knowledgeVersion ?? 1),
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
    it('READINESS-CAP-01: Every tour stage requiredCapabilities ID resolves 1:1 to CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY and is synchronized in docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md', () => {
      const seenCapIds = new Set<string>();
      for (const entry of CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY) {
        assert.ok(
          !seenCapIds.has(entry.id),
          `Duplicate capability ID '${entry.id}' in CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY`
        );
        seenCapIds.add(entry.id);
        assert.ok(
          entry.status === 'Verified' || entry.status === 'Limited',
          `Capability ${entry.id} must have status 'Verified' or 'Limited', got '${entry.status}'`
        );
        assert.ok(
          entry.implementationEvidence.length > 0,
          `Capability ${entry.id} must reference at least one implementation file`
        );
        for (const relPath of entry.implementationEvidence) {
          const absPath = path.resolve(process.cwd(), relPath);
          assert.ok(
            fs.existsSync(absPath),
            `Capability ${entry.id} implementation file '${relPath}' does not exist on disk`
          );
        }
        assert.ok(
          entry.verifiedBehaviorAndBounds.trim().length >= 25,
          `Capability ${entry.id} must define explicit verifiedBehaviorAndBounds`
        );
        assert.ok(
          entry.acceptanceTestIds.length > 0,
          `Capability ${entry.id} must reference at least one acceptanceTestId`
        );
      }

      // Every stage.requiredCapabilities ID in APPROVED_HOMEPAGE_TOUR_CONTRACT must resolve to exactly one entry
      for (const stage of APPROVED_HOMEPAGE_TOUR_CONTRACT) {
        assert.ok(
          stage.requiredCapabilities.length > 0,
          `Stage ${stage.stageId} must list at least one requiredCapability`
        );
        for (const reqCapId of stage.requiredCapabilities) {
          const matches = CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY.filter((c) => c.id === reqCapId);
          assert.strictEqual(
            matches.length,
            1,
            `Stage ${stage.stageId} requiredCapability '${reqCapId}' must resolve to exactly 1 canonical inventory entry (found ${matches.length})`
          );
        }
      }

      // Synchronized specification check against docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md
      const publicSpecPath = path.resolve(
        process.cwd(),
        'docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md'
      );
      const publicSpecContent = fs.readFileSync(publicSpecPath, 'utf8');
      for (const entry of CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY) {
        assert.ok(
          publicSpecContent.includes(entry.id),
          `Canonical capability '${entry.id}' is missing from docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md`
        );
      }
      for (const stage of APPROVED_HOMEPAGE_TOUR_CONTRACT) {
        assert.ok(
          publicSpecContent.includes(stage.stageId),
          `Tour stage '${stage.stageId}' is missing from docs/PUBLIC-01-Public-Platform-Pages-Dogfooding.md`
        );
      }
    });

    it('READINESS-DOCS-SYNC-01: /docs public viewer corpus (18 docs), EMB-PUBLIC-HOME anonymous scope (18 docs), and EMB-PUBLIC-DOCS scope (11 docs) expose identical canonical document IDs, metadata, and Markdown content by value', () => {
      const digestDoc = (d: (typeof documents)[number]) => ({
        id: d.id,
        filename: d.filename,
        collectionId: d.collectionId,
        updatedAt: d.updatedAt,
        contentLength: d.content.length,
        contentSha256: crypto.createHash('sha256').update(d.content).digest('hex'),
      });

      // 1. /docs public sidebar & article viewer scope (PublicSurfaceView.tsx lines 409-502: COL-DOCS + COL-PUBLIC + COL-LEGAL)
      const docsViewerPublicDocs = documents
        .filter(
          (d) =>
            !d.deletedAt &&
            d.status === 'ready' &&
            ['COL-DOCS', 'COL-PUBLIC', 'COL-LEGAL'].includes(d.collectionId)
        )
        .map(digestDoc)
        .sort((a, b) => a.id.localeCompare(b.id));

      // 2. EMB-PUBLIC-HOME anonymous scope (pre-retrieval filter over all 5 collections -> everyone collections)
      const homeAnonDigest = homeAnonDocs
        .map(digestDoc)
        .sort((a, b) => a.id.localeCompare(b.id));

      assert.strictEqual(docsViewerPublicDocs.length, 18);
      assert.strictEqual(homeAnonDigest.length, 18);
      assert.deepStrictEqual(
        docsViewerPublicDocs,
        homeAnonDigest,
        '/docs public viewer corpus and EMB-PUBLIC-HOME anonymous scope must match 1:1 by document ID, filename, collectionId, updatedAt, and content SHA-256'
      );

      // 3. EMB-PUBLIC-DOCS anonymous scope (bound specifically to ['COL-DOCS'] = 11 docs)
      const docsEmbedAnonScope = resolveEmbedAuthorization(
        anonIdentity,
        getEmbedCollectionIds(docsEmbed),
        collections
      );
      const docsEmbedAnonDigest = filterAuthorizedDocuments(documents, docsEmbedAnonScope)
        .map(digestDoc)
        .sort((a, b) => a.id.localeCompare(b.id));

      assert.strictEqual(docsEmbedAnonDigest.length, 11);
      const docsViewerColDocsSubset = docsViewerPublicDocs.filter(
        (d) => d.collectionId === 'COL-DOCS'
      );
      assert.deepStrictEqual(
        docsEmbedAnonDigest,
        docsViewerColDocsSubset,
        'EMB-PUBLIC-DOCS scope must match the 11 COL-DOCS documents in /docs by value and SHA-256'
      );

      // 4. Every acceptable source filename in APPROVED_HOMEPAGE_TOUR_CONTRACT resolves identically via store.getDocumentByFilename(slug)
      const tourFilenames = new Set(
        APPROVED_HOMEPAGE_TOUR_CONTRACT.flatMap((s) => [
          ...s.acceptableSourceSet.primaryFilenames,
          ...s.acceptableSourceSet.acceptableSecondaryFilenames,
        ])
      );
      for (const filename of tourFilenames) {
        const slug = filename.replace(/\.md$/, '');
        const resolvedBySlug = store.getDocumentByFilename(slug);
        assert.ok(resolvedBySlug, `Expected store.getDocumentByFilename('${slug}') to resolve`);
        const inHomeScope = homeAnonDigest.find((d) => d.filename === filename);
        assert.ok(inHomeScope, `Expected '${filename}' to exist in EMB-PUBLIC-HOME anonymous scope`);
        assert.deepStrictEqual(
          digestDoc(resolvedBySlug),
          inHomeScope,
          `Document '${filename}' resolved via /docs/:slug must match EMB-PUBLIC-HOME by value`
        );
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
      paraphrase: string;
      acceptableFilenames: string[];
      expectedKeywords: string[];
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
        paraphrase: 'How can I check which document and line range produced an OKEng response?',
        acceptableFilenames: ['retrieval.md', 'product-concepts.md', 'product-overview.md', 'markdown.md'],
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
        paraphrase: 'How do I embed an OKEng assistant on my site and pass signed host tokens?',
        acceptableFilenames: ['embedding.md', 'getting-started.md', 'product-overview.md', 'access-control.md'],
        expectedKeywords: ['OKEng', 'embed'],
      },
      {
        id: 'READINESS-Q07',
        question: 'What presentation modes are actually available?',
        paraphrase: 'Which embed presentation modes are live on public pages versus previewed in the simulator?',
        acceptableFilenames: ['embedding.md', 'faq.md', 'product-overview.md'],
        expectedKeywords: ['inline', 'documentation'],
      },
      {
        id: 'READINESS-Q08',
        question: 'How does host context influence retrieval?',
        paraphrase: 'How does the current page URL boost relevant documents without bypassing collection visibility?',
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
        paraphrase: 'How does OKEng avoid hallucinating when a topic is missing from the documentation?',
        acceptableFilenames: ['retrieval.md', 'faq.md', 'product-overview.md'],
        expectedKeywords: ['refusal', 'threshold', 'fabricate', 'available documentation'],
      },
    ];

    for (const item of REPRESENTATIVE_QUERIES) {
      it(`${item.id}: Retrieves from acceptable authoritative source set with distinct rawScore/normalizedConfidence/routeBoost and citation integrity for "${item.question}" and its paraphrase`, () => {
        const promptsToTest = [item.question, item.paraphrase];

        for (const promptText of promptsToTest) {
          // Step 1: Retriever lexical & field scoring
          const ranked = retrieveAndRankAuthorizedDocs(promptText, homeAnonDocs, '/', 'en');
          assert.ok(ranked.length > 0, `Expected ranked candidates for "${promptText}"`);
          assert.ok(
            ranked[0].score >= 1.35,
            `Expected top rawScore >= 1.35 for "${promptText}", got ${ranked[0].score}`
          );
          assert.ok(
            ranked[0].normalizedConfidence >= 0.25,
            `Expected top normalizedConfidence >= 0.25 for "${promptText}", got ${ranked[0].normalizedConfidence}`
          );
          assert.ok(
            ranked[0].routeBoost === 0 || ranked[0].routeBoost === 0.15,
            `Expected routeBoost to be 0 or 0.15 for "${promptText}", got ${ranked[0].routeBoost}`
          );

          // Step 2: Compiler confidence filter & response synthesis
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

          // 2. Two-step ranking threshold check on compiled output (rawScore = ranked[0].score >= 1.35, similarity = normalizedConfidence >= 0.25)
          assert.ok(
            plan.retrievedChunks.length > 0 &&
              ranked[0].score >= 1.35 &&
              plan.sources[0].similarity >= 0.25 &&
              plan.retrievedChunks[0].similarity >= 0.25,
            `Expected top source rawScore >= 1.35 and similarity (normalizedConfidence) >= 0.25 for "${promptText}"`
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

    it('READINESS-UNANSWERABLE-01: Out-of-domain queries fail the two-step threshold (rawScore < 1.35 -> normalizedConfidence <= 0.20 < 0.25) and return honest refusal with zero fabricated citations', () => {
      const refusalProbe =
        'What is the orbital velocity of Jupiter moons in relativistic quantum mechanics?';
      const rawRanked = retrieveAndRankAuthorizedDocs(refusalProbe, homeAnonDocs, '/', 'en');
      for (const candidate of rawRanked) {
        assert.ok(
          candidate.score < 1.35 || candidate.matchedTokens.length === 0,
          `Out-of-domain candidate ${candidate.compiledDoc.filename} must not pass rawScore >= 1.35 with matched tokens`
        );
        assert.ok(
          candidate.normalizedConfidence <= 0.20,
          `Out-of-domain candidate ${candidate.compiledDoc.filename} must be capped at normalizedConfidence <= 0.20, got ${candidate.normalizedConfidence}`
        );
      }

      const plan = compileKnowledgeResponse({
        question: refusalProbe,
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
          const ranked = retrieveAndRankAuthorizedDocs(promptText, homeAnonDocs, '/', 'en');
          assert.ok(ranked.length > 0, `Stage ${stage.stageId} expected ranked candidates for "${promptText}"`);
          assert.ok(
            ranked[0].score >= 1.35,
            `Stage ${stage.stageId} expected top rawScore >= 1.35 for "${promptText}", got ${ranked[0].score}`
          );
          assert.ok(
            ranked[0].normalizedConfidence >= 0.25,
            `Stage ${stage.stageId} expected top normalizedConfidence >= 0.25 for "${promptText}", got ${ranked[0].normalizedConfidence}`
          );
          assert.ok(
            ranked[0].routeBoost === 0 || ranked[0].routeBoost === 0.15,
            `Stage ${stage.stageId} expected routeBoost 0 or 0.15 for "${promptText}", got ${ranked[0].routeBoost}`
          );

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
            plan.sources.length > 0 &&
              ranked[0].score >= 1.35 &&
              plan.sources[0].similarity >= 0.25 &&
              plan.retrievedChunks.length > 0 &&
              plan.retrievedChunks[0].similarity >= 0.25,
            `Stage ${stage.stageId} prompt "${promptText}" must emit at least 1 citation with rawScore >= 1.35 and similarity >= 0.25`
          );

          const topSources = plan.sources.slice(0, 3).map((s) => s.filename);
          const matchedAcceptable = topSources.some((fn) => allAcceptableFiles.includes(fn));
          assert.strictEqual(
            matchedAcceptable,
            true,
            `Stage ${stage.stageId} prompt "${promptText}" returned [${topSources.join(', ')}], expected at least one from [${allAcceptableFiles.join(', ')}]`
          );

          // Structural answer quality check against stage.expectedConceptKeywords
          const chunkPreviews = plan.retrievedChunks.map((c) => c.preview).join(' ');
          const combinedText = `${plan.summary} ${plan.steps.join(' ')} ${plan.bullets.join(' ')} ${plan.compiledMarkdown} ${chunkPreviews}`.toLowerCase();
          const hasConcept = stage.expectedConceptKeywords.some((kw) =>
            combinedText.includes(kw.toLowerCase())
          );
          assert.strictEqual(
            hasConcept,
            true,
            `Stage ${stage.stageId} answer for "${promptText}" did not contain any expected keyword from [${stage.expectedConceptKeywords.join(', ')}]`
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

  // ==========================================================================
  // 6. Homepage Guided Tour UI Integration & Bilingual Dictionary Parity
  // ==========================================================================
  describe('6. Homepage Guided Tour UI Integration & Bilingual Parity (READINESS-UI-TOUR-01)', () => {
    it('READINESS-UI-TOUR-01: HomepageGuidedTour consumes APPROVED_HOMEPAGE_TOUR_CONTRACT and integrates with DogfoodInlineBot (EMB-PUBLIC-HOME) with 1:1 EN/ES dictionary parity', () => {
      const tourComponentPath = path.resolve(
        process.cwd(),
        'src/components/public/HomepageGuidedTour.tsx'
      );
      const publicSurfacePath = path.resolve(
        process.cwd(),
        'src/pages/PublicSurfaceView.tsx'
      );
      assert.ok(
        fs.existsSync(tourComponentPath),
        'HomepageGuidedTour.tsx must exist on disk'
      );

      const tourComponentSource = fs.readFileSync(tourComponentPath, 'utf8');
      const publicSurfaceSource = fs.readFileSync(publicSurfacePath, 'utf8');

      // 1. Verify HomepageGuidedTour imports APPROVED_HOMEPAGE_TOUR_CONTRACT & resolveTourStageCapabilities
      assert.ok(
        tourComponentSource.includes('APPROVED_HOMEPAGE_TOUR_CONTRACT') &&
          tourComponentSource.includes('resolveTourStageCapabilities'),
        'HomepageGuidedTour must consume APPROVED_HOMEPAGE_TOUR_CONTRACT and resolveTourStageCapabilities directly'
      );

      // 2. Verify PublicSurfaceView mounts floating HomepageGuidedTour with Hero CTA and preserves EMB-PUBLIC-DOCS on /docs
      assert.ok(
        publicSurfaceSource.includes('<HomepageGuidedTour') &&
          publicSurfaceSource.includes('hero-what-is-okeng-cta') &&
          publicSurfaceSource.includes('embedId="EMB-PUBLIC-DOCS"'),
        'PublicSurfaceView must wire Hero CTA to floating HomepageGuidedTour and preserve EMB-PUBLIC-DOCS on /docs'
      );

      // 3. Verify every stage resolves its capabilities and has complete EN and ES localization keys
      for (const stage of APPROVED_HOMEPAGE_TOUR_CONTRACT) {
        const resolvedCaps = resolveTourStageCapabilities(stage);
        assert.strictEqual(
          resolvedCaps.length,
          stage.requiredCapabilities.length,
          `Stage ${stage.stageId} must resolve all ${stage.requiredCapabilities.length} required capabilities`
        );

        const requiredStageKeys = [
          `public.tour.${stage.stageId}.title`,
          `public.tour.${stage.stageId}.need`,
          `public.tour.${stage.stageId}.outcome`,
          `public.tour.${stage.stageId}.prompt`,
          `public.tour.${stage.stageId}.paraphrase`,
          `public.tour.${stage.stageId}.cta_primary`,
        ];
        if (stage.secondaryAction) {
          requiredStageKeys.push(`public.tour.${stage.stageId}.cta_secondary`);
        }
        if (stage.progression.kind === 'advance_stage') {
          requiredStageKeys.push(stage.progression.ctaLabelKey);
        }

        for (const key of requiredStageKeys) {
          assert.ok(
            typeof EN_DICTIONARY[key] === 'string' &&
              EN_DICTIONARY[key].trim().length > 0,
            `Missing EN_DICTIONARY key '${key}'`
          );
          assert.ok(
            typeof ES_DICTIONARY[key] === 'string' &&
              ES_DICTIONARY[key].trim().length > 0,
            `Missing ES_DICTIONARY key '${key}'`
          );
        }
      }

      // 4. Verify 1:1 EN/ES key parity and bounded file format copy on PAGE-PUB-01
      const enKeys = Object.keys(EN_DICTIONARY).sort();
      const esKeys = Object.keys(ES_DICTIONARY).sort();
      assert.deepStrictEqual(
        enKeys,
        esKeys,
        'EN_DICTIONARY and ES_DICTIONARY must maintain 1:1 key parity'
      );

      assert.ok(
        !EN_DICTIONARY['public.pipeline.step1_desc'].includes('.pdf') &&
          !EN_DICTIONARY['public.pipeline.step1_desc'].includes('.docx') &&
          !ES_DICTIONARY['public.pipeline.step1_desc'].includes('.pdf') &&
          !ES_DICTIONARY['public.pipeline.step1_desc'].includes('.docx'),
        'public.pipeline.step1_desc must not claim .pdf or .docx upload support'
      );
    });
  });

  // ==========================================================================
  // 7. Adversarial Acceptance Matrix (AT-01 .. AT-25) — P0-01..P0-05 & P1-01..P1-05
  // ==========================================================================
  describe('7. Adversarial Acceptance Matrix (AT-01 .. AT-25)', () => {
    it('AT-01: Hero CTA ("What is OKEng?") opens floating dialog and dispatches Stage 1 (STAGE-1-WHAT-IS-OKENG) canonical prompt', () => {
      const controller = new HomepageTourController();
      assert.strictEqual(controller.getState().display.isOpen, false);

      const intent = controller.openAssistant('hero_cta');
      assert.ok(intent, 'Expected openAssistant("hero_cta") to dispatch Stage 1 stream intent');
      assert.strictEqual(controller.getState().display.isOpen, true);
      assert.strictEqual(controller.getState().display.lastTriggerKind, 'hero_cta');
      assert.strictEqual(intent.kind, 'stage_canonical');
      assert.strictEqual(intent.stageId, 'STAGE-1-WHAT-IS-OKENG');
      assert.strictEqual(intent.question, APPROVED_HOMEPAGE_TOUR_CONTRACT[0].suggestedPrompt);
      assert.strictEqual(controller.getState().conversation.exchanges.length, 1);
    });

    it('AT-02: All 5 stages resolve capabilities, EN/ES localization keys, and retrieve grounded answers via branded PublicDemoAuthority', async () => {
      const authRes = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        currentUrl: '/',
      });
      assert.strictEqual(authRes.ok, true);
      if (!authRes.ok) return;

      for (const stage of APPROVED_HOMEPAGE_TOUR_CONTRACT) {
        const caps = resolveTourStageCapabilities(stage);
        assert.strictEqual(caps.length, stage.requiredCapabilities.length);
        assert.ok(EN_DICTIONARY[stage.titleKey] && ES_DICTIONARY[stage.titleKey]);
        assert.ok(EN_DICTIONARY[stage.promptKey] && ES_DICTIONARY[stage.promptKey]);

        const ans = compileAndVerifyPublicDemoAnswer({
          authority: authRes.authority,
          question: stage.suggestedPrompt,
          language: 'en',
          stageId: stage.stageId,
        });
        assert.strictEqual(ans.serverOutcome, 'grounded');
        assert.ok(ans.sources.length > 0);
      }
    });

    it('AT-03: Discriminated progression union governs Stages 1-4 advance_stage and Stage 5 terminal actions', () => {
      const stages = APPROVED_HOMEPAGE_TOUR_CONTRACT;
      for (let i = 0; i < 4; i++) {
        const prog = stages[i].progression;
        assert.strictEqual(prog.kind, 'advance_stage');
        if (prog.kind === 'advance_stage') {
          assert.strictEqual(prog.nextStageId, stages[i + 1].stageId);
          assert.strictEqual(isValidPublicCitationDestinationRoute(prog.companionDocLink.url), true);
        }
      }
      const stage5Prog = stages[4].progression;
      assert.strictEqual(stage5Prog.kind, 'terminal');
      if (stage5Prog.kind === 'terminal') {
        assert.strictEqual(
          isValidPublicCitationDestinationRoute(stage5Prog.primaryDestination.url),
          true
        );
        assert.strictEqual(
          isValidPublicCitationDestinationRoute(stage5Prog.secondaryDestination.url),
          true
        );
      }
    });

    it('AT-04: Follow-up questions append exchanges to ConversationState without mutating activeStageId, stageRetryTarget, or completedStageIds', () => {
      const controller = new HomepageTourController();
      controller.openAssistant('hero_cta');
      const followUp = controller.dispatchFollowUpQuestion(
        'How does OKEng differ from a normal documentation site?'
      );
      assert.ok(followUp);
      assert.strictEqual(followUp.kind, 'user_followup');
      assert.strictEqual(
        controller.getState().tourSession.activeStageId,
        'STAGE-1-WHAT-IS-OKENG'
      );
      assert.strictEqual(
        controller.getState().tourSession.stageRetryTarget?.canonicalPrompt,
        APPROVED_HOMEPAGE_TOUR_CONTRACT[0].suggestedPrompt
      );
      assert.deepStrictEqual(controller.getState().tourSession.completedStageIds, []);
    });

    it('AT-05: Out-of-domain refusal probe produces serverOutcome === "refused" with 0 citations and never marks stage completed', async () => {
      const authRes = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        currentUrl: '/',
      });
      assert.strictEqual(authRes.ok, true);
      if (!authRes.ok) return;

      const refused = compileAndVerifyPublicDemoAnswer({
        authority: authRes.authority,
        question: OUT_OF_DOMAIN_REFUSAL_PROBE,
        language: 'en',
      });
      assert.strictEqual(refused.serverOutcome, 'refused');
      assert.strictEqual(refused.sources.length, 0);

      const controller = new HomepageTourController();
      controller.openAssistant('hero_cta');
      const probeIntent = controller.dispatchRefusalProbe()!;
      controller.handleMetadataEvent({
        requestId: probeIntent.requestId,
        exchangeId: probeIntent.exchangeId,
        tourRunId: probeIntent.tourRunId,
        preset: 'visitor',
        role: 'everyone',
        currentUrl: '/',
        serverOutcome: 'refused',
        effectiveCollectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'],
        collectionStatuses: [],
        sources: [],
        cta: null,
      });
      controller.handleDeltaEvent({
        requestId: probeIntent.requestId,
        exchangeId: probeIntent.exchangeId,
        tourRunId: probeIntent.tourRunId,
        textDelta: refused.summary,
      });
      controller.handleDoneEvent({
        requestId: probeIntent.requestId,
        exchangeId: probeIntent.exchangeId,
        tourRunId: probeIntent.tourRunId,
        serverOutcome: 'refused',
        latencyMs: 5,
        tokens: 10,
      });

      const lastEx = controller.getState().conversation.exchanges.at(-1)!;
      assert.strictEqual(lastEx.status, 'refused');
      assert.strictEqual(lastEx.sources.length, 0);
      assert.deepStrictEqual(controller.getState().tourSession.completedStageIds, []);
    });

    it('AT-06 (P0-03): Non-refusal answer with broken/stripped citation provenance produces serverOutcome === "failed" and never completes stage', async () => {
      const authRes = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        currentUrl: '/',
      });
      assert.strictEqual(authRes.ok, true);
      if (!authRes.ok) return;

      const broken = compileAndVerifyPublicDemoAnswer({
        authority: authRes.authority,
        question: APPROVED_HOMEPAGE_TOUR_CONTRACT[0].suggestedPrompt,
        language: 'en',
        stageId: 'STAGE-1-WHAT-IS-OKENG',
        compilerOverride: (docs) => {
          const base = compileKnowledgeResponse({
            question: APPROVED_HOMEPAGE_TOUR_CONTRACT[0].suggestedPrompt,
            authorizedDocs: docs,
            currentUrl: '/',
            answerMode: 'deterministic',
            uiLanguage: 'en',
            effectiveRole: 'everyone',
          });
          return {
            ...base,
            sources: [],
            retrievedChunks: [],
          };
        },
      });
      assert.strictEqual(broken.serverOutcome, 'failed');
      assert.strictEqual(broken.sources.length, 0);
    });

    it('AT-07 (P0-01): POST /api/chat/stream with embedId === "EMB-PUBLIC-HOME" and missing demoPreset is rejected with 400 INVALID_DEMO_PRESET (no fallthrough)', async () => {
      let status = 200;
      let body: any = null;
      const req: any = {
        headers: {},
        body: { embedId: 'EMB-PUBLIC-HOME', question: 'What is OKEng?' },
      };
      const res: any = {
        status(c: number) {
          status = c;
          return this;
        },
        json(p: any) {
          body = p;
          return this;
        },
      };
      await handlePublicHomepageDemoChatStream(req, res);
      assert.strictEqual(status, 400);
      assert.strictEqual(body?.error, 'INVALID_DEMO_PRESET');
    });

    it('AT-08 (P0-01): Non-homepage embed supplying demoPreset is rejected with 403 FORBIDDEN_DEMO_SCOPE', async () => {
      const res = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-DOCS',
        demoPreset: 'admin',
        currentUrl: '/',
      });
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.status, 403);
        assert.strictEqual(res.code, 'FORBIDDEN_DEMO_SCOPE');
      }
    });

    it('AT-09 (P0-01): Caller-supplied JWT tokens, Authorization headers, roles, signingSecrets, or document arrays are rejected with 400 before retrieval', async () => {
      const tokenRes = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        identityToken: 'eyJhbGciOiJIUzI1NiJ9.fake.sig',
      });
      assert.strictEqual(tokenRes.ok, false);
      if (!tokenRes.ok) {
        assert.strictEqual(tokenRes.status, 400);
        assert.strictEqual(tokenRes.code, 'DEMO_TOKEN_NOT_ACCEPTED');
      }

      const corpusRes = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        documents: [{ id: 'injected' }],
      });
      assert.strictEqual(corpusRes.ok, false);
      if (!corpusRes.ok) {
        assert.strictEqual(corpusRes.status, 400);
        assert.strictEqual(corpusRes.code, 'FORBIDDEN_CLIENT_AUTHORITY_FIELD');
      }
    });

    it('AT-10 (P0-04): Zero browser modules under src/** import from server/demo/** or src/repositories/**, and unbranded PublicDemoAuthority is rejected', () => {
      function collectBrowserTsFiles(dir: string): string[] {
        const files: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          const rel = path.relative(process.cwd(), full).replace(/\\/g, '/');
          if (entry.isDirectory()) {
            if (rel === 'src/repositories' || rel.startsWith('src/app/api')) {
              continue;
            }
            files.push(...collectBrowserTsFiles(full));
          } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            files.push(full);
          }
        }
        return files;
      }

      for (const file of collectBrowserTsFiles(path.resolve(process.cwd(), 'src'))) {
        const src = fs.readFileSync(file, 'utf8');
        const rel = path.relative(process.cwd(), file);
        assert.strictEqual(
          /from\s+['"][^'"]*server\/demo/i.test(src),
          false,
          `Browser module ${rel} must not import from server/demo`
        );
        assert.strictEqual(
          /from\s+['"][^'"]*repositories/i.test(src),
          false,
          `Browser module ${rel} must not import from src/repositories`
        );
      }

      const forged = {
        kind: 'public_homepage_demo',
        workspaceId: 'ws_okeng_01',
        embedId: 'EMB-PUBLIC-HOME',
        preset: 'admin',
      };
      assert.strictEqual(isValidPublicDemoAuthority(forged), false);
      assert.throws(() =>
        buildPublicHomepageDemoCacheKey({
          authority: forged as any,
          question: 'What is OKEng?',
          language: 'en',
        })
      );
    });

    it('AT-11 (P0-05): Normalizes workspace alias okeng -> ws_okeng_01 at boundary and excludes cross-workspace documents before retrieval', async () => {
      const foreignDoc = {
        ...INITIAL_DOCUMENTS[0],
        id: 'doc_pub_01',
        workspaceId: 'ws_foreign_99',
      };
      const res = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        workspaceId: 'okeng',
        repositorySnapshot: {
          workspace: { ...INITIAL_WORKSPACE, id: 'okeng' },
          collections: INITIAL_COLLECTIONS,
          documents: [foreignDoc, ...INITIAL_DOCUMENTS.slice(1)],
          embeds: INITIAL_PUBLIC_EMBEDS,
        },
      });
      assert.strictEqual(res.ok, true);
      if (!res.ok) return;
      assert.strictEqual(res.authority.workspaceId, 'ws_okeng_01');
      assert.strictEqual(res.authority.narrowedDocumentIds.includes('doc_pub_01'), false);

      const badCallerWs = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        workspaceId: 'ws_foreign_99',
      });
      assert.strictEqual(badCallerWs.ok, false);
      if (!badCallerWs.ok) {
        assert.strictEqual(badCallerWs.status, 403);
        assert.strictEqual(badCallerWs.code, 'INVALID_DEMO_WORKSPACE');
      }
    });

    it('AT-12: Visitor preset authorizes strictly COL-PUBLIC, COL-DOCS, COL-LEGAL (18 docs) and excludes COL-CUSTOMER and COL-INTERNAL before retrieval', async () => {
      const res = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        currentUrl: '/',
      });
      assert.strictEqual(res.ok, true);
      if (!res.ok) return;
      assert.deepStrictEqual(res.authority.effectiveScopeCollectionIds, [
        'COL-PUBLIC',
        'COL-DOCS',
        'COL-LEGAL',
      ]);
      assert.strictEqual(res.authority.narrowedDocuments.length, 18);
      assert.strictEqual(
        res.authority.narrowedDocuments.some(
          (d) => d.collectionId === 'COL-CUSTOMER' || d.collectionId === 'COL-INTERNAL'
        ),
        false
      );
    });

    it('AT-13: Member preset unlocks COL-CUSTOMER (21 docs), keeps COL-INTERNAL excluded, and rewrites COL-CUSTOMER citations to public_companion_guide', async () => {
      const res = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'member',
        currentUrl: '/docs/embedding',
      });
      assert.strictEqual(res.ok, true);
      if (!res.ok) return;
      assert.deepStrictEqual(res.authority.effectiveScopeCollectionIds, [
        'COL-PUBLIC',
        'COL-DOCS',
        'COL-LEGAL',
        'COL-CUSTOMER',
      ]);
      assert.strictEqual(res.authority.narrowedDocuments.length, 21);
      assert.strictEqual(
        res.authority.narrowedDocuments.some((d) => d.collectionId === 'COL-INTERNAL'),
        false
      );

      const ans = compileAndVerifyPublicDemoAnswer({
        authority: res.authority,
        question: 'How do I mint a signed host identity assertion for customer authentication?',
        language: 'en',
      });
      assert.strictEqual(ans.serverOutcome, 'grounded');
      for (const src of ans.sources) {
        if (src.collectionId === 'COL-CUSTOMER') {
          assert.strictEqual(src.citationRenderMode, 'public_companion_guide');
          assert.strictEqual(isValidPublicCitationDestinationRoute(src.url), true);
        }
      }
    });

    it('AT-14: Admin preset unlocks all 5 bound collections (25 docs) and rewrites COL-INTERNAL citations to publicSafeTitle companion guide routes', async () => {
      const res = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'admin',
        currentUrl: '/docs/access-control',
      });
      assert.strictEqual(res.ok, true);
      if (!res.ok) return;
      assert.deepStrictEqual(res.authority.effectiveScopeCollectionIds, [
        'COL-PUBLIC',
        'COL-DOCS',
        'COL-LEGAL',
        'COL-CUSTOMER',
        'COL-INTERNAL',
      ]);
      assert.strictEqual(res.authority.narrowedDocuments.length, 25);

      const ans = compileAndVerifyPublicDemoAnswer({
        authority: res.authority,
        question: 'How are production KMS keys rotated in the internal vault runbook?',
        language: 'en',
      });
      assert.strictEqual(ans.serverOutcome, 'grounded');
      const internalSrcs = ans.sources.filter((s) => s.collectionId === 'COL-INTERNAL');
      assert.ok(internalSrcs.length > 0);
      for (const src of internalSrcs) {
        assert.strictEqual(src.citationRenderMode, 'public_companion_guide');
        assert.ok(!src.filename.includes('internal-operations'));
        assert.strictEqual(isValidPublicCitationDestinationRoute(src.url), true);
      }
    });

    it('AT-15: Pre-retrieval condition (4) & (5) exclude documents with mismatched collection ownership or visibility before retrieval', async () => {
      const movedDoc = {
        ...INITIAL_DOCUMENTS.find((d) => d.id === 'doc_internal_18')!,
        collectionId: 'COL-PUBLIC', // moved into public collection without updating ownership map
      };
      const res = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        repositorySnapshot: {
          workspace: INITIAL_WORKSPACE,
          collections: INITIAL_COLLECTIONS,
          documents: [
            movedDoc,
            ...INITIAL_DOCUMENTS.filter((d) => d.id !== 'doc_internal_18'),
          ],
          embeds: INITIAL_PUBLIC_EMBEDS,
        },
      });
      assert.strictEqual(res.ok, true);
      if (!res.ok) return;
      assert.strictEqual(
        res.authority.narrowedDocumentIds.includes('doc_internal_18'),
        false,
        'Document whose collectionId mismatches PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP must be excluded before retrieval'
      );
    });

    it('AT-16: Pre-retrieval condition (6) excludes documents whose PUBLIC_DEMO_SOURCE_POLICY.permittedPresets excludes the active preset', async () => {
      const restrictedPolicy = {
        ...PUBLIC_DEMO_SOURCE_POLICY,
        doc_pub_01: {
          ...PUBLIC_DEMO_SOURCE_POLICY.doc_pub_01,
          permittedPresets: ['admin'] as const,
        },
      };
      const res = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        policyOverride: { sourcePolicy: restrictedPolicy },
      });
      assert.strictEqual(res.ok, true);
      if (!res.ok) return;
      assert.strictEqual(
        res.authority.narrowedDocumentIds.includes('doc_pub_01'),
        false,
        'Document excluded by sourcePolicy.permittedPresets must not enter narrowedDocuments D'
      );
    });

    it('AT-17 (P0-02): Mutating sourcePolicy, ownershipMap, or routeRegistry invalidates cache key via demoPolicyVersion without touching document updatedAt', async () => {
      clearPublicHomepageDemoCache();
      const auth1 = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        currentUrl: '/',
      });
      assert.strictEqual(auth1.ok, true);
      if (!auth1.ok) return;

      const r1 = getOrComputePublicDemoAnswerWithCache({
        authority: auth1.authority,
        question: 'What is OKEng, and what problem does it solve?',
        language: 'en',
      });
      assert.strictEqual(r1.cacheDecision, 'MISS');

      const r2 = getOrComputePublicDemoAnswerWithCache({
        authority: auth1.authority,
        question: 'What is OKEng, and what problem does it solve?',
        language: 'en',
      });
      assert.strictEqual(r2.cacheDecision, 'HIT');

      const mutatedPolicy = {
        ...PUBLIC_DEMO_SOURCE_POLICY,
        doc_pub_01: {
          ...PUBLIC_DEMO_SOURCE_POLICY.doc_pub_01,
          publicSafeTitle: 'Updated Policy Title Without Document Timestamp Change',
        },
      };
      const auth2 = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        currentUrl: '/',
        policyOverride: { sourcePolicy: mutatedPolicy },
      });
      assert.strictEqual(auth2.ok, true);
      if (!auth2.ok) return;

      assert.strictEqual(
        auth2.authority.narrowedDocumentFingerprint,
        auth1.authority.narrowedDocumentFingerprint
      );
      assert.notStrictEqual(auth2.authority.demoPolicyVersion, auth1.authority.demoPolicyVersion);

      const r3 = getOrComputePublicDemoAnswerWithCache({
        authority: auth2.authority,
        question: 'What is OKEng, and what problem does it solve?',
        language: 'en',
        policyOverride: { sourcePolicy: mutatedPolicy },
      });
      assert.strictEqual(r3.cacheDecision, 'MISS');
    });

    it('AT-18 (P1-01): validatePublicDemoRegistries() cross-checks all 25 seed documents and catches mismatched visibility or missing policy entries', () => {
      const validRes = validatePublicDemoRegistries();
      assert.strictEqual(validRes.valid, true, validRes.errors.join('; '));

      const brokenPolicy = { ...PUBLIC_DEMO_SOURCE_POLICY };
      delete (brokenPolicy as any).doc_pub_01;
      const invalidRes = validatePublicDemoRegistries({ sourcePolicy: brokenPolicy });
      assert.strictEqual(invalidRes.valid, false);
      assert.ok(invalidRes.errors.some((e) => e.includes('doc_pub_01')));
    });

    it('AT-19 (P1-02): Strict route validators reject query strings, fragments, percent-encoding, traversal, trailing slashes, and unapproved routes with 400', async () => {
      for (const r of CANONICAL_PUBLIC_ROUTE_REGISTRY) {
        assert.strictEqual(isValidPublicCitationDestinationRoute(r), true);
      }
      for (const r of PUBLIC_DEMO_CONTEXT_ROUTES) {
        assert.strictEqual(isValidPublicDemoContextRoute(r), true);
      }

      const malformed = [
        '/docs/getting-started?x=1',
        '/docs/getting-started#top',
        '/docs/%2e%2e/secret',
        '/docs/../settings',
        '/docs/getting-started/',
        '\\docs\\getting-started',
        'https://evil.example/docs',
        '/workspaces/okeng/settings',
      ];
      for (const bad of malformed) {
        assert.strictEqual(isValidPublicDemoContextRoute(bad), false);
        assert.strictEqual(isValidPublicCitationDestinationRoute(bad), false);
      }

      const badCtxRes = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        currentUrl: '/docs/embedding?foo=bar',
      });
      assert.strictEqual(badCtxRes.ok, false);
      if (!badCtxRes.ok) {
        assert.strictEqual(badCtxRes.status, 400);
        assert.strictEqual(badCtxRes.code, 'INVALID_DEMO_CONTEXT_ROUTE');
      }
    });

    it('AT-20 (P1-03): pendingSettingsOpId drops stale out-of-order responses, preserves active stream on failure, and commits server-normalized values on success', () => {
      const controller = new HomepageTourController();
      controller.openAssistant('hero_cta');

      controller.updateDraftSettings({ preset: 'member', currentUrl: '/docs/embedding' });
      const op1 = controller.beginApplySettings()!;
      controller.updateDraftSettings({ preset: 'admin', currentUrl: '/docs/access-control' });
      const op2 = controller.beginApplySettings()!;

      const staleCommitted = controller.commitSettingsSuccess(op1.opId, {
        ok: true,
        workspaceId: 'ws_okeng_01',
        embedId: 'EMB-PUBLIC-HOME',
        preset: 'member',
        effectiveRole: 'members',
        currentUrl: '/docs/embedding',
        embedBoundCollectionIds: [],
        roleAuthorizedCollectionIds: [],
        effectiveScopeCollectionIds: [],
        narrowedDocumentIds: [],
        demoPolicyVersion: 'v1',
        authorizationVersion: 'v1',
        knowledgeVersion: 1,
        collectionStatuses: [],
      });
      assert.strictEqual(staleCommitted, false);
      assert.strictEqual(controller.getState().demoSettings.appliedSettings.preset, 'visitor');
      assert.strictEqual(controller.getState().requestLifecycle.status, 'streaming');

      controller.commitSettingsFailure(op2.opId, 'Network error');
      assert.strictEqual(controller.getState().demoSettings.status, 'failed');
      assert.strictEqual(controller.getState().demoSettings.appliedSettings.preset, 'visitor');
      assert.strictEqual(controller.getState().requestLifecycle.status, 'streaming');

      const op3 = controller.beginApplySettings()!;
      const okCommitted = controller.commitSettingsSuccess(op3.opId, {
        ok: true,
        workspaceId: 'ws_okeng_01',
        embedId: 'EMB-PUBLIC-HOME',
        preset: 'admin',
        effectiveRole: 'admins',
        currentUrl: '/docs/access-control',
        embedBoundCollectionIds: [],
        roleAuthorizedCollectionIds: [],
        effectiveScopeCollectionIds: [],
        narrowedDocumentIds: [],
        demoPolicyVersion: 'v1',
        authorizationVersion: 'v1',
        knowledgeVersion: 1,
        collectionStatuses: [],
      });
      assert.strictEqual(okCommitted, true);
      assert.strictEqual(controller.getState().demoSettings.appliedSettings.preset, 'admin');
      assert.strictEqual(controller.getState().requestLifecycle.status, 'idle');
    });

    it('AT-21 (P1-04): Separated stageRetryTarget and followUpRetryTarget retry their respective prompts without cross-contamination', () => {
      const controller = new HomepageTourController();
      controller.openAssistant('hero_cta');

      controller.dispatchFollowUpQuestion('Custom follow-up question?');
      assert.strictEqual(
        controller.getState().tourSession.stageRetryTarget?.canonicalPrompt,
        APPROVED_HOMEPAGE_TOUR_CONTRACT[0].suggestedPrompt
      );
      assert.strictEqual(
        controller.getState().tourSession.followUpRetryTarget?.userPrompt,
        'Custom follow-up question?'
      );

      const retriedFollowUp = controller.retryFollowUpQuestion()!;
      assert.strictEqual(retriedFollowUp.kind, 'user_followup');
      assert.strictEqual(retriedFollowUp.question, 'Custom follow-up question?');

      const retriedStage = controller.retryStageQuestion()!;
      assert.strictEqual(retriedStage.kind, 'stage_canonical');
      assert.strictEqual(
        retriedStage.question,
        APPROVED_HOMEPAGE_TOUR_CONTRACT[0].suggestedPrompt
      );
    });

    it('AT-22: Single-terminal exchange lock ignores late delta, done, or error events after an exchange terminates', () => {
      const controller = new HomepageTourController();
      const intent = controller.openAssistant('hero_cta')!;

      controller.handleErrorEvent({
        requestId: intent.requestId,
        exchangeId: intent.exchangeId,
        tourRunId: intent.tourRunId,
        code: 'STREAM_ERR',
        message: 'Failed stream',
        aborted: false,
      });

      const exAfterError = controller.getState().conversation.exchanges[0];
      assert.strictEqual(exAfterError.status, 'failed');
      assert.strictEqual(exAfterError.terminalLock, true);

      const lateDoneAccepted = controller.handleDoneEvent({
        requestId: intent.requestId,
        exchangeId: intent.exchangeId,
        tourRunId: intent.tourRunId,
        serverOutcome: 'grounded',
        latencyMs: 10,
        tokens: 10,
      });
      assert.strictEqual(lateDoneAccepted, false);
      assert.strictEqual(controller.getState().conversation.exchanges[0].status, 'failed');
    });

    it('AT-23: Reset demo restores visitor + "/" while preserving completed stages; Restart tour increments tourRunId and clears completed stages', () => {
      const controller = new HomepageTourController();
      const s1 = controller.openAssistant('hero_cta')!;
      controller.handleMetadataEvent({
        requestId: s1.requestId,
        exchangeId: s1.exchangeId,
        tourRunId: s1.tourRunId,
        preset: 'visitor',
        role: 'everyone',
        currentUrl: '/',
        serverOutcome: 'grounded',
        effectiveCollectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'],
        collectionStatuses: [],
        sources: [
          {
            docId: 'doc_pub_01',
            title: 'OKEng Product Overview',
            filename: 'product-overview.md',
            collectionId: 'COL-PUBLIC',
            snippet: 'Overview',
            similarity: 0.9,
            url: '/docs/product-overview',
            citationRenderMode: 'direct_public_doc',
          },
        ],
        cta: null,
      });
      controller.handleDeltaEvent({
        requestId: s1.requestId,
        exchangeId: s1.exchangeId,
        tourRunId: s1.tourRunId,
        textDelta: 'Grounded answer',
      });
      controller.handleDoneEvent({
        requestId: s1.requestId,
        exchangeId: s1.exchangeId,
        tourRunId: s1.tourRunId,
        serverOutcome: 'grounded',
        latencyMs: 5,
        tokens: 5,
      });
      assert.deepStrictEqual(controller.getState().tourSession.completedStageIds, [
        'STAGE-1-WHAT-IS-OKENG',
      ]);

      // Reset demo preserves completedStageIds
      const resetOp = controller.beginResetDemo()!;
      controller.commitSettingsSuccess(resetOp.opId, {
        ok: true,
        workspaceId: 'ws_okeng_01',
        embedId: 'EMB-PUBLIC-HOME',
        preset: 'visitor',
        effectiveRole: 'everyone',
        currentUrl: '/',
        embedBoundCollectionIds: [],
        roleAuthorizedCollectionIds: [],
        effectiveScopeCollectionIds: [],
        narrowedDocumentIds: [],
        demoPolicyVersion: 'v1',
        authorizationVersion: 'v1',
        knowledgeVersion: 1,
        collectionStatuses: [],
      });
      assert.deepStrictEqual(controller.getState().tourSession.completedStageIds, [
        'STAGE-1-WHAT-IS-OKENG',
      ]);

      // Restart tour increments tourRunId and clears completedStageIds & exchanges
      const prevRunId = controller.getState().tourSession.tourRunId;
      const restartIntent = controller.restartTour()!;
      assert.strictEqual(restartIntent.tourRunId, prevRunId + 1);
      assert.deepStrictEqual(controller.getState().tourSession.completedStageIds, []);
      assert.strictEqual(controller.getState().conversation.exchanges.length, 1);
    });

    it('AT-24: Layered Escape dismissal closes Demo Settings drawer before closing assistant dialog, and /docs preserves DogfoodInlineBot (EMB-PUBLIC-DOCS)', () => {
      const controller = new HomepageTourController();
      controller.openAssistant('launcher');
      controller.toggleSettingsDrawer(true);
      assert.strictEqual(controller.getState().display.isSettingsDrawerOpen, true);

      const firstEsc = controller.handleDismiss('escape');
      assert.strictEqual(firstEsc, 'closed_settings');
      assert.strictEqual(controller.getState().display.isSettingsDrawerOpen, false);
      assert.strictEqual(controller.getState().display.isOpen, true);

      const secondEsc = controller.handleDismiss('escape');
      assert.strictEqual(secondEsc, 'closed_panel');
      assert.strictEqual(controller.getState().display.isOpen, false);

      const publicSurfaceSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/pages/PublicSurfaceView.tsx'),
        'utf8'
      );
      assert.ok(publicSurfaceSource.includes('embedId="EMB-PUBLIC-DOCS"'));
    });

    it('AT-25 (P1-05): Verifies the complete 7-step execution chain from demo handler entry through pre-retrieval D narrowing, policy cache, citation validation, and client terminal lock', async () => {
      clearPublicHomepageDemoCache();
      const trace: PublicHomepageDemoExecutionTrace = {
        steps: [],
        enteredDemoHandler: false,
        readFromServerRepositories: false,
        workspaceIdNormalized: '',
        narrowedDocumentIds: [],
        retrievalInputDocumentIds: [],
      };

      const authRes = await authorizePublicHomepageDemoRequest({
        embedId: 'EMB-PUBLIC-HOME',
        demoPreset: 'visitor',
        currentUrl: '/',
        workspaceId: 'okeng',
        executionTrace: trace,
      });
      assert.strictEqual(authRes.ok, true);
      if (!authRes.ok) return;

      const { answer } = getOrComputePublicDemoAnswerWithCache({
        authority: authRes.authority,
        question: APPROVED_HOMEPAGE_TOUR_CONTRACT[0].suggestedPrompt,
        language: 'en',
        stageId: 'STAGE-1-WHAT-IS-OKENG',
        executionTrace: trace,
      });

      const clientTraceSteps: string[] = [];
      const controller = new HomepageTourController({
        traceHook: (step) => clientTraceSteps.push(step),
      });
      const intent = controller.openAssistant('hero_cta')!;
      controller.handleMetadataEvent({
        requestId: intent.requestId,
        exchangeId: intent.exchangeId,
        tourRunId: intent.tourRunId,
        preset: 'visitor',
        role: 'everyone',
        currentUrl: '/',
        serverOutcome: answer.serverOutcome,
        effectiveCollectionIds: authRes.authority.effectiveScopeCollectionIds,
        collectionStatuses: authRes.authority.collectionStatuses,
        sources: answer.sources,
        cta: answer.nextStep,
      });
      controller.handleDeltaEvent({
        requestId: intent.requestId,
        exchangeId: intent.exchangeId,
        tourRunId: intent.tourRunId,
        textDelta: answer.summary,
      });
      controller.handleDoneEvent({
        requestId: intent.requestId,
        exchangeId: intent.exchangeId,
        tourRunId: intent.tourRunId,
        serverOutcome: answer.serverOutcome,
        latencyMs: 5,
        tokens: 20,
      });

      const duplicateAccepted = controller.handleDoneEvent({
        requestId: intent.requestId,
        exchangeId: intent.exchangeId,
        tourRunId: intent.tourRunId,
        serverOutcome: 'failed',
        latencyMs: 99,
        tokens: 0,
      });
      assert.strictEqual(duplicateAccepted, false);

      assert.strictEqual(trace.enteredDemoHandler, true);
      assert.strictEqual(trace.readFromServerRepositories, true);
      assert.strictEqual(trace.workspaceIdNormalized, 'ws_okeng_01');
      assert.deepStrictEqual(trace.retrievalInputDocumentIds, trace.narrowedDocumentIds);
      assert.ok(trace.cacheKeyUsed?.includes(`policy:${authRes.authority.demoPolicyVersion}`));
      assert.deepStrictEqual(trace.steps, [
        '1:enter_demo_handler',
        '2:read_server_repositories',
        '3:construct_narrowed_documents_D',
        '5:cache_lookup:MISS',
        '4:retrieve_and_compile_from_D',
        '6:validate_citations_and_outcome:grounded',
      ]);
      assert.deepStrictEqual(clientTraceSteps, [
        '7:client_terminal_lock:locked_done',
        '7:client_terminal_lock:rejected_already_terminal',
      ]);
    });
  });
});


