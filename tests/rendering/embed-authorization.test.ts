import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getEmbedCollectionIds,
  canAccessCollection,
  resolveEmbedAuthorization,
  verifyEmbedIdentityToken,
  createEmbedIdentityToken,
  resolveRequestEmbedIdentity,
  filterAuthorizedDocuments,
  filterAuthorizedCitations,
  filterAuthorizedRouteRules,
  filterAuthorizedSuggestedQuestions,
  resolveAuthorizedSuggestions,
  buildSimulatorDebugOutput,
  computeEmbedVerificationProof,
  createEmbedRuntimeSession,
  appendImmutableSessionTurn,
  upgradeEmbedSessionIdentity,
  resolveTestConsoleScope,
} from '../../src/services/embedAuthorization';
import { compileKnowledgeResponse } from '../../src/services/engine/responseCompiler';
import { routeToPath, parsePathname } from '../../src/app/router';
import { evaluateEmbedInstallationContract } from '../../src/components/EmbedCard';
import {
  serializeRetrievalCacheKey,
  serializeAnswerCacheKey,
  serializeSessionCacheKey,
  isCachePartitionComplete,
  CacheService,
  MemoryCacheAdapter,
} from '../../src/cache/cache.module';
import { store } from '../../src/services/store';
import { EN_DICTIONARY } from '../../src/i18n/locales/en';
import { ES_DICTIONARY } from '../../src/i18n/locales/es';
import {
  formatCacheDecisionLabel,
  resolveScenarioInspectorTab,
} from '../../src/pages/TestConsoleView';
import {
  Collection,
  EmbedInstance,
  EmbedIdentity,
  KnowledgeDocument,
  SourceCitation,
  EmbedRouteRule,
} from '../../src/types';

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected: unknown) {
      assert.deepStrictEqual(actual, expected);
    },
    toContain(item: unknown) {
      assert.ok(Array.isArray(actual) && actual.includes(item));
    },
    toBeGreaterThan(expected: number) {
      assert.ok(typeof actual === 'number' && actual > expected);
    },
    not: {
      toBe(expected: T) {
        assert.notStrictEqual(actual, expected);
      },
      toContain(item: unknown) {
        assert.ok(Array.isArray(actual) && !actual.includes(item));
      },
    },
  };
}

const TEST_SECRET = 'ok_live_sec_992837465_hmac_sha256_key';
const WORKSPACE_ID = 'ws_01HXYZ';

const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'COL-PUBLIC',
    workspaceId: WORKSPACE_ID,
    name: 'Public Documentation',
    description: 'Public help articles',
    visibility: 'everyone',
    fileCount: 3,
    createdAt: '2026-10-06T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'COL-MEMBERS',
    workspaceId: WORKSPACE_ID,
    name: 'Customer & Member Guides',
    description: 'Authenticated member guides',
    visibility: 'members',
    fileCount: 2,
    createdAt: '2026-10-06T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'COL-ADMINS',
    workspaceId: WORKSPACE_ID,
    name: 'Internal Security & Admin Runbooks',
    description: 'Strict admin runbooks',
    visibility: 'admins',
    fileCount: 2,
    createdAt: '2026-10-06T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z',
  },
];

function makeEmbed(
  collectionIds: string[],
  id = 'EMB-TEST',
  useHostUserContext = false
): EmbedInstance {
  return {
    id,
    workspaceId: WORKSPACE_ID,
    name: 'Test Embed',
    status: 'active',
    mode: 'widget',
    position: 'bottom-right',
    accentColor: '#1D4ED8',
    greetingText: 'How can we help you today?',
    placeholderText: 'Ask a question...',
    allowedCollectionIds: collectionIds,
    knowledgeScope: {
      collectionIds,
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext,
      routeRules: [],
    },
    createdAt: '2026-10-06T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z',
  };
}

describe('Canonical Mixed-Visibility Embed Authorization & Progressive Identity Contract', () => {
  describe('1. getEmbedCollectionIds & canAccessCollection Matrix', () => {
    it('deduplicates, trims, and canonically sorts collection IDs from knowledgeScope or allowedCollectionIds', () => {
      const embed = makeEmbed(['COL-ADMINS', 'COL-PUBLIC', 'COL-ADMINS', '  ']);
      const ids = getEmbedCollectionIds(embed);
      expect(ids).toEqual(['COL-ADMINS', 'COL-PUBLIC']);
      expect(Object.isFrozen(ids)).toBe(true);

      // Fallback to allowedCollectionIds when knowledgeScope.collectionIds is empty
      const legacyEmbed: EmbedInstance = {
        ...embed,
        knowledgeScope: { collectionIds: [] },
        allowedCollectionIds: ['COL-MEMBERS', 'COL-PUBLIC', 'COL-MEMBERS'],
      };
      expect(getEmbedCollectionIds(legacyEmbed)).toEqual(['COL-MEMBERS', 'COL-PUBLIC']);
    });

    it('enforces the exact 9-cell visibility matrix across anonymous, member, and admin identities', () => {
      const anon: EmbedIdentity = { kind: 'anonymous' };
      const member: EmbedIdentity = {
        kind: 'authenticated',
        userId: 'usr_member',
        role: 'member',
      };
      const admin: EmbedIdentity = {
        kind: 'authenticated',
        userId: 'usr_admin',
        role: 'admin',
      };

      // Anonymous: everyone=true, members=false, admins=false
      expect(canAccessCollection(anon, 'everyone')).toBe(true);
      expect(canAccessCollection(anon, 'members')).toBe(false);
      expect(canAccessCollection(anon, 'admins')).toBe(false);

      // Member: everyone=true, members=true, admins=false
      expect(canAccessCollection(member, 'everyone')).toBe(true);
      expect(canAccessCollection(member, 'members')).toBe(true);
      expect(canAccessCollection(member, 'admins')).toBe(false);

      // Admin: everyone=true, members=true, admins=true
      expect(canAccessCollection(admin, 'everyone')).toBe(true);
      expect(canAccessCollection(admin, 'members')).toBe(true);
      expect(canAccessCollection(admin, 'admins')).toBe(true);
    });

    it('resolves progressive AuthorizationScope across public-only, mixed, and protected-only Embeds and freezes collectionIds', () => {
      const anon: EmbedIdentity = { kind: 'anonymous' };
      const member: EmbedIdentity = {
        kind: 'authenticated',
        userId: 'usr_member',
        role: 'member',
      };
      const admin: EmbedIdentity = {
        kind: 'authenticated',
        userId: 'usr_admin',
        role: 'admin',
      };

      // Case A: Mixed Embed (Public + Members + Admins)
      const mixedEmbed = makeEmbed([
        'COL-ADMINS',
        'COL-PUBLIC',
        'COL-MEMBERS',
        'COL-UNKNOWN',
      ]);
      const mixedIds = getEmbedCollectionIds(mixedEmbed);

      const anonScope = resolveEmbedAuthorization(anon, mixedIds, MOCK_COLLECTIONS);
      expect(anonScope.collectionIds).toEqual(['COL-PUBLIC']);
      expect(Object.isFrozen(anonScope)).toBe(true);
      expect(Object.isFrozen(anonScope.collectionIds)).toBe(true);

      const memberScope = resolveEmbedAuthorization(member, mixedIds, MOCK_COLLECTIONS);
      expect(memberScope.collectionIds).toEqual(['COL-MEMBERS', 'COL-PUBLIC']);

      const adminScope = resolveEmbedAuthorization(admin, mixedIds, MOCK_COLLECTIONS);
      expect(adminScope.collectionIds).toEqual([
        'COL-ADMINS',
        'COL-MEMBERS',
        'COL-PUBLIC',
      ]);

      // Case B: Protected-only Embed (Members + Admins)
      const protectedEmbed = makeEmbed(['COL-MEMBERS', 'COL-ADMINS']);
      const protectedIds = getEmbedCollectionIds(protectedEmbed);

      const anonProtectedScope = resolveEmbedAuthorization(
        anon,
        protectedIds,
        MOCK_COLLECTIONS
      );
      // Anonymous initializes safely with empty scope (NOT a 401 error)
      expect(anonProtectedScope.collectionIds).toEqual([]);
      expect(
        resolveEmbedAuthorization(member, protectedIds, MOCK_COLLECTIONS).collectionIds
      ).toEqual(['COL-MEMBERS']);
      expect(
        resolveEmbedAuthorization(admin, protectedIds, MOCK_COLLECTIONS).collectionIds
      ).toEqual(['COL-ADMINS', 'COL-MEMBERS']);
    });
  });

  describe('2. Strict HS256 Token Verification & No-Silent-Downgrade Invariant', () => {
    it('resolves missing token to anonymous and verifies valid HS256 member/admin tokens', async () => {
      const missingRes = await resolveRequestEmbedIdentity({
        identityToken: undefined,
        expectedWorkspaceId: WORKSPACE_ID,
        expectedEmbedId: 'EMB-MIXED',
        signingSecret: TEST_SECRET,
      });
      expect(missingRes.ok).toBe(true);
      if (missingRes.ok) {
        expect(missingRes.identity).toEqual({ kind: 'anonymous' });
      }

      const now = Math.floor(Date.now() / 1000);
      const validMemberToken = await createEmbedIdentityToken(
        {
          sub: 'usr_42',
          role: 'member',
          workspace_id: WORKSPACE_ID,
          embed_id: 'EMB-MIXED',
          iat: now - 10,
          exp: now + 300,
        },
        TEST_SECRET
      );

      const memberRes = await verifyEmbedIdentityToken({
        token: validMemberToken,
        expectedWorkspaceId: WORKSPACE_ID,
        expectedEmbedId: 'EMB-MIXED',
        signingSecret: TEST_SECRET,
      });
      expect(memberRes.ok).toBe(true);
      if (memberRes.ok) {
        expect(memberRes.identity).toEqual({
          kind: 'authenticated',
          userId: 'usr_42',
          role: 'member',
        });
      }
    });

    it('rejects non-HS256 algorithms, header key-injection parameters, bad signatures, expired tokens, and workspace/embed mismatches without silent downgrade', async () => {
      const now = Math.floor(Date.now() / 1000);

      // 1. Algorithm 'none' rejection
      const noneToken = await createEmbedIdentityToken(
        {
          sub: 'usr_42',
          role: 'admin',
          workspace_id: WORKSPACE_ID,
          iat: now,
          exp: now + 300,
        },
        TEST_SECRET,
        { alg: 'none', typ: 'JWT' }
      );
      const noneRes = await verifyEmbedIdentityToken({
        token: noneToken,
        expectedWorkspaceId: WORKSPACE_ID,
        signingSecret: TEST_SECRET,
      });
      expect(noneRes.ok).toBe(false);
      if (!noneRes.ok) {
        expect(noneRes.code).toBe('UNSUPPORTED_JWT_ALGORITHM');
        expect(noneRes.status).toBe(401);
      }

      // 2. Header key injection (jwk) rejection
      const jwkToken = await createEmbedIdentityToken(
        {
          sub: 'usr_42',
          role: 'admin',
          workspace_id: WORKSPACE_ID,
          iat: now,
          exp: now + 300,
        },
        TEST_SECRET,
        { alg: 'HS256', typ: 'JWT', jwk: { kty: 'oct' } }
      );
      const jwkRes = await verifyEmbedIdentityToken({
        token: jwkToken,
        expectedWorkspaceId: WORKSPACE_ID,
        signingSecret: TEST_SECRET,
      });
      expect(jwkRes.ok).toBe(false);
      if (!jwkRes.ok) {
        expect(jwkRes.code).toBe('FORBIDDEN_KEY_INJECTION_HEADER');
      }

      // 3. Invalid signature rejection (never downgrades to anonymous)
      const wrongSecretToken = await createEmbedIdentityToken(
        {
          sub: 'usr_42',
          role: 'admin',
          workspace_id: WORKSPACE_ID,
          iat: now,
          exp: now + 300,
        },
        'wrong_secret_key'
      );
      const badSigRes = await verifyEmbedIdentityToken({
        token: wrongSecretToken,
        expectedWorkspaceId: WORKSPACE_ID,
        signingSecret: TEST_SECRET,
      });
      expect(badSigRes.ok).toBe(false);
      if (!badSigRes.ok) {
        expect(badSigRes.code).toBe('INVALID_TOKEN_SIGNATURE');
        expect(badSigRes.status).toBe(401);
      }

      // 4. Expired token rejection
      const expiredToken = await createEmbedIdentityToken(
        {
          sub: 'usr_42',
          role: 'member',
          workspace_id: WORKSPACE_ID,
          iat: now - 600,
          exp: now - 120,
        },
        TEST_SECRET
      );
      const expRes = await verifyEmbedIdentityToken({
        token: expiredToken,
        expectedWorkspaceId: WORKSPACE_ID,
        signingSecret: TEST_SECRET,
      });
      expect(expRes.ok).toBe(false);
      if (!expRes.ok) {
        expect(expRes.code).toBe('TOKEN_EXPIRED');
        expect(expRes.status).toBe(401);
      }

      // 5. Workspace mismatch rejection (404 non-disclosing)
      const wrongWsToken = await createEmbedIdentityToken(
        {
          sub: 'usr_42',
          role: 'member',
          workspace_id: 'ws_OTHER_TENANT',
          iat: now,
          exp: now + 300,
        },
        TEST_SECRET
      );
      const wsRes = await verifyEmbedIdentityToken({
        token: wrongWsToken,
        expectedWorkspaceId: WORKSPACE_ID,
        signingSecret: TEST_SECRET,
      });
      expect(wsRes.ok).toBe(false);
      if (!wsRes.ok) {
        expect(wsRes.code).toBe('RESOURCE_NOT_FOUND');
        expect(wsRes.status).toBe(404);
      }

      // 6. Embed ID mismatch rejection (404 non-disclosing)
      const wrongEmbedToken = await createEmbedIdentityToken(
        {
          sub: 'usr_42',
          role: 'member',
          workspace_id: WORKSPACE_ID,
          embed_id: 'EMB-OTHER',
          iat: now,
          exp: now + 300,
        },
        TEST_SECRET
      );
      const embRes = await verifyEmbedIdentityToken({
        token: wrongEmbedToken,
        expectedWorkspaceId: WORKSPACE_ID,
        expectedEmbedId: 'EMB-TARGET',
        signingSecret: TEST_SECRET,
      });
      expect(embRes.ok).toBe(false);
      if (!embRes.ok) {
        expect(embRes.code).toBe('RESOURCE_NOT_FOUND');
        expect(embRes.status).toBe(404);
      }
    });
  });

  describe('3. Positive & Negative Consumer Isolation Across All 8 Knowledge-Facing Consumers', () => {
    const mockDocs: KnowledgeDocument[] = [
      {
        id: 'doc_pub_1',
        workspaceId: WORKSPACE_ID,
        collectionId: 'COL-PUBLIC',
        title: 'Public Quickstart Guide',
        filename: 'public-quickstart.md',
        content: '# Public Quickstart\nInstall the public widget in 2 minutes.',
        type: 'markdown',
        status: 'ready',
        fileSize: '1.2 KB',
        language: 'en',
        createdAt: '2026-10-06T00:00:00Z',
        updatedAt: '2026-10-06T00:00:00Z',
        indexedAt: '2026-10-06T00:00:00Z',
        chunkCount: 1,
      },
      {
        id: 'doc_mem_1',
        workspaceId: WORKSPACE_ID,
        collectionId: 'COL-MEMBERS',
        title: 'Member Billing & Quota Guide',
        filename: 'member-billing-quota.md',
        content: '# Member Billing\nManage team seat quotas and member invoices.',
        type: 'markdown',
        status: 'ready',
        fileSize: '1.4 KB',
        language: 'en',
        createdAt: '2026-10-06T00:00:00Z',
        updatedAt: '2026-10-06T00:00:00Z',
        indexedAt: '2026-10-06T00:00:00Z',
        chunkCount: 1,
      },
      {
        id: 'doc_adm_1',
        workspaceId: WORKSPACE_ID,
        collectionId: 'COL-ADMINS',
        title: 'Admin SAML Key Rotation Runbook',
        filename: 'admin-saml-rotation.md',
        content: '# Admin SAML Runbook\nRotate production SAML signing certificates.',
        type: 'markdown',
        status: 'ready',
        fileSize: '1.8 KB',
        language: 'en',
        createdAt: '2026-10-06T00:00:00Z',
        updatedAt: '2026-10-06T00:00:00Z',
        indexedAt: '2026-10-06T00:00:00Z',
        chunkCount: 1,
      },
    ];

    const mockCitations: SourceCitation[] = [
      {
        docId: 'doc_pub_1',
        title: 'Public Quickstart Guide',
        filename: 'public-quickstart.md',
        collectionId: 'COL-PUBLIC',
        snippet: 'Install the public widget in 2 minutes.',
        similarity: 0.91,
      },
      {
        docId: 'doc_mem_1',
        title: 'Member Billing & Quota Guide',
        filename: 'member-billing-quota.md',
        collectionId: 'COL-MEMBERS',
        snippet: 'Manage team seat quotas and member invoices.',
        similarity: 0.89,
      },
      {
        docId: 'doc_adm_1',
        title: 'Admin SAML Key Rotation Runbook',
        filename: 'admin-saml-rotation.md',
        collectionId: 'COL-ADMINS',
        snippet: 'Rotate production SAML signing certificates.',
        similarity: 0.95,
      },
    ];

    const mockRouteRules: EmbedRouteRule[] = [
      {
        id: 'rule_pub',
        routePattern: '/docs/*',
        promptTitle: 'Public Docs Help',
        suggestedQuestions: ['How do I install the public widget?'],
        collectionIds: ['COL-PUBLIC'],
        documentIds: ['doc_pub_1'],
      },
      {
        id: 'rule_mem',
        routePattern: '/billing/*',
        promptTitle: 'Member Billing Help',
        suggestedQuestions: ['How do I manage team seat quotas?'],
        collectionIds: ['COL-MEMBERS'],
        documentIds: ['doc_mem_1'],
      },
      {
        id: 'rule_adm',
        routePattern: '/admin/security/*',
        promptTitle: 'Admin Security Runbook',
        suggestedQuestions: ['How do I rotate SAML signing certificates?'],
        collectionIds: ['COL-ADMINS'],
        documentIds: ['doc_adm_1'],
      },
    ];

    const mixedEmbed = makeEmbed(
      ['COL-PUBLIC', 'COL-MEMBERS', 'COL-ADMINS'],
      'EMB-MIXED'
    );
    const mixedColIds = getEmbedCollectionIds(mixedEmbed);

    it('enforces both positive and negative assertions across all 8 consumers for Anonymous, Member, and Admin', () => {
      const anonScope = resolveEmbedAuthorization(
        { kind: 'anonymous' },
        mixedColIds,
        MOCK_COLLECTIONS
      );
      const memberScope = resolveEmbedAuthorization(
        {
          kind: 'authenticated',
          userId: 'usr_mem',
          role: 'member',
        },
        mixedColIds,
        MOCK_COLLECTIONS
      );
      const adminScope = resolveEmbedAuthorization(
        {
          kind: 'authenticated',
          userId: 'usr_adm',
          role: 'admin',
        },
        mixedColIds,
        MOCK_COLLECTIONS
      );

      // Consumer 1: Retrieval (store.retrieveKnowledge & store.queryKnowledge)
      const anonRetrieval = store.retrieveKnowledge({
        query: 'How do I install OKEng or configure SAML SSO?',
        authorizationScope: anonScope,
      });
      expect(anonRetrieval.authorizedCollectionIds).toEqual(['COL-PUBLIC']);
      expect(
        anonRetrieval.sources.every((s) => s.collectionId === 'COL-PUBLIC')
      ).toBe(true);
      expect(
        anonRetrieval.sources.some(
          (s) => s.collectionId === 'COL-MEMBERS' || s.collectionId === 'COL-ADMINS'
        )
      ).toBe(false);

      // Consumer 2: Citations
      const anonCitations = filterAuthorizedCitations(mockCitations, anonScope);
      expect(anonCitations.map((c) => c.collectionId)).toEqual(['COL-PUBLIC']);
      expect(anonCitations.some((c) => c.collectionId === 'COL-MEMBERS')).toBe(false);
      expect(anonCitations.some((c) => c.collectionId === 'COL-ADMINS')).toBe(false);

      const memberCitations = filterAuthorizedCitations(mockCitations, memberScope);
      expect(memberCitations.map((c) => c.collectionId)).toEqual([
        'COL-PUBLIC',
        'COL-MEMBERS',
      ]);
      expect(memberCitations.some((c) => c.collectionId === 'COL-ADMINS')).toBe(false);

      const adminCitations = filterAuthorizedCitations(mockCitations, adminScope);
      expect(adminCitations.map((c) => c.collectionId)).toEqual([
        'COL-PUBLIC',
        'COL-MEMBERS',
        'COL-ADMINS',
      ]);

      // Consumer 3 & 4: Suggestions & Starter Questions
      const candidateQuestions = [
        'How do I use the Public Quickstart Guide?',
        'How do I manage Member Billing & Quota Guide?',
        'How do I run the Admin SAML Key Rotation Runbook?',
      ];
      const anonSuggestions = resolveAuthorizedSuggestions({
        authorizationScope: anonScope,
        documents: mockDocs,
        configuredSuggestions: candidateQuestions,
      });
      expect(anonSuggestions).toContain('How do I use the Public Quickstart Guide?');
      expect(anonSuggestions).not.toContain('How do I manage Member Billing & Quota Guide?');
      expect(anonSuggestions).not.toContain(
        'How do I run the Admin SAML Key Rotation Runbook?'
      );

      const memberSuggestions = filterAuthorizedSuggestedQuestions(
        candidateQuestions,
        memberScope,
        mockDocs
      );
      expect(memberSuggestions).toContain('How do I use the Public Quickstart Guide?');
      expect(memberSuggestions).toContain('How do I manage Member Billing & Quota Guide?');
      expect(memberSuggestions).not.toContain(
        'How do I run the Admin SAML Key Rotation Runbook?'
      );

      // Consumer 5: Route Rules
      const anonRules = filterAuthorizedRouteRules(mockRouteRules, anonScope, mockDocs);
      expect(anonRules.map((r) => r.id)).toEqual(['rule_pub']);
      expect(anonRules.some((r) => r.id === 'rule_mem' || r.id === 'rule_adm')).toBe(false);

      const memberRules = filterAuthorizedRouteRules(mockRouteRules, memberScope, mockDocs);
      expect(memberRules.map((r) => r.id)).toEqual(['rule_pub', 'rule_mem']);
      expect(memberRules.some((r) => r.id === 'rule_adm')).toBe(false);

      const adminRules = filterAuthorizedRouteRules(mockRouteRules, adminScope, mockDocs);
      expect(adminRules.map((r) => r.id)).toEqual(['rule_pub', 'rule_mem', 'rule_adm']);

      // Consumer 6 & 7: Related Articles & Documentation Navigation
      const anonDocs = filterAuthorizedDocuments(mockDocs, anonScope);
      expect(anonDocs.map((d) => d.id)).toEqual(['doc_pub_1']);
      expect(anonDocs.some((d) => d.id === 'doc_mem_1' || d.id === 'doc_adm_1')).toBe(false);

      const memberDocs = filterAuthorizedDocuments(mockDocs, memberScope);
      expect(memberDocs.map((d) => d.id)).toEqual(['doc_pub_1', 'doc_mem_1']);
      expect(memberDocs.some((d) => d.id === 'doc_adm_1')).toBe(false);

      // Consumer 8: Simulator Debug Output
      const anonDebug = buildSimulatorDebugOutput({
        embed: mixedEmbed,
        identity: { kind: 'anonymous' },
        collections: MOCK_COLLECTIONS,
      });
      expect(anonDebug.authorizedCollectionIds).toEqual(['COL-PUBLIC']);
      expect(anonDebug.excludedCollections.map((c) => c.id)).toEqual([
        'COL-ADMINS',
        'COL-MEMBERS',
      ]);
      expect(
        anonDebug.excludedCollections.every((c) => c.reason === 'insufficient_role')
      ).toBe(true);
    });

    it('preserves historical conversation turn immutability across mid-conversation identity upgrades', () => {
      const session = createEmbedRuntimeSession({
        sessionId: 'sess_test_1',
        workspaceId: WORKSPACE_ID,
        embed: mixedEmbed,
        identity: { kind: 'anonymous' },
        collections: MOCK_COLLECTIONS,
      });
      expect(session.authorizationScope.collectionIds).toEqual(['COL-PUBLIC']);

      const withAnonTurn = appendImmutableSessionTurn(session, {
        id: 'turn_1',
        role: 'assistant',
        content: 'Public answer',
        sources: [
          {
            docId: 'doc_pub_1',
            title: 'Public Quickstart Guide',
            filename: 'public-quickstart.md',
            collectionId: 'COL-PUBLIC',
          },
        ],
        createdAt: '2026-10-06T00:00:00Z',
      });

      const upgraded = upgradeEmbedSessionIdentity({
        session: withAnonTurn,
        newIdentity: {
          kind: 'authenticated',
          userId: 'usr_admin',
          role: 'admin',
        },
        embed: mixedEmbed,
        collections: MOCK_COLLECTIONS,
      });

      expect(upgraded.authorizationScope.collectionIds).toEqual([
        'COL-ADMINS',
        'COL-MEMBERS',
        'COL-PUBLIC',
      ]);
      // Historical turn preserves its exact anonymous identity and scope snapshot
      expect(upgraded.turns[0].identityAtTurn).toEqual({ kind: 'anonymous' });
      expect(upgraded.turns[0].authorizedCollectionIdsAtTurn).toEqual(['COL-PUBLIC']);
      expect(Object.isFrozen(upgraded.turns[0])).toBe(true);
    });
  });

  describe('4. Three-Class Cache Contract, Fail-Safe Bypass & Split Version Invalidation', () => {
    it('isolates RetrievalCacheKey, AnswerCacheKey, and SessionCacheKey across identities and versions', () => {
      const anonScope = resolveEmbedAuthorization(
        { kind: 'anonymous' },
        ['COL-PUBLIC', 'COL-MEMBERS'],
        MOCK_COLLECTIONS
      );
      const memberScope = resolveEmbedAuthorization(
        { kind: 'authenticated', userId: 'usr_1', role: 'member' },
        ['COL-PUBLIC', 'COL-MEMBERS'],
        MOCK_COLLECTIONS
      );

      const anonKey = serializeRetrievalCacheKey({
        embedId: 'EMB-MIXED',
        authorizedCollectionIds: anonScope.collectionIds,
        query: 'how do i configure sso',
        retrievalParameters: { route: '/settings', locale: 'en' },
        authorizationVersion: 'av1',
        knowledgeVersion: 12,
      });
      const memberKey = serializeRetrievalCacheKey({
        embedId: 'EMB-MIXED',
        authorizedCollectionIds: memberScope.collectionIds,
        query: 'how do i configure sso',
        retrievalParameters: { route: '/settings', locale: 'en' },
        authorizationVersion: 'av1',
        knowledgeVersion: 12,
      });
      expect(anonKey).not.toBe(memberKey);

      const ansV12 = serializeAnswerCacheKey({
        embedId: 'EMB-MIXED',
        identity: memberScope.identity,
        authorizationScope: memberScope,
        query: 'how do i configure sso',
        hostContext: { route: '/settings' },
        conversationContext: {},
        responseLanguage: 'en',
        answerMode: 'deterministic',
        authorizationVersion: 'av1',
        knowledgeVersion: 12,
      });
      const ansV13 = serializeAnswerCacheKey({
        embedId: 'EMB-MIXED',
        identity: memberScope.identity,
        authorizationScope: memberScope,
        query: 'how do i configure sso',
        hostContext: { route: '/settings' },
        conversationContext: {},
        responseLanguage: 'en',
        answerMode: 'deterministic',
        authorizationVersion: 'av1',
        knowledgeVersion: 13,
      });
      expect(ansV12).not.toBe(ansV13);

      const sessionV1 = serializeSessionCacheKey({
        sessionId: 'sess_1',
        identity: anonScope.identity,
        authorizationScope: anonScope,
        authorizationVersion: 'av1',
      });
      const sessionV2 = serializeSessionCacheKey({
        sessionId: 'sess_1',
        identity: anonScope.identity,
        authorizationScope: anonScope,
        authorizationVersion: 'av2',
      });
      expect(sessionV1).not.toBe(sessionV2);
    });

    it('enforces the Fail-Safe Bypass Rule when cache partition fields are incomplete', async () => {
      expect(
        isCachePartitionComplete({
          workspaceId: WORKSPACE_ID,
          authorizedCollectionIds: ['COL-PUBLIC'],
          knowledgeVersion: 1,
          responseLanguage: 'en',
          answerMode: 'deterministic',
        })
      ).toBe(true);

      expect(
        isCachePartitionComplete({
          workspaceId: WORKSPACE_ID,
          authorizedCollectionIds: ['COL-PUBLIC'],
          knowledgeVersion: NaN,
          responseLanguage: 'en',
          answerMode: 'deterministic',
          bypassIfIncomplete: true,
        })
      ).toBe(false);

      const localCache = new CacheService(new MemoryCacheAdapter());
      const res = await localCache.getAnswer({
        workspaceId: WORKSPACE_ID,
        authorizedCollectionIds: ['COL-PUBLIC'],
        currentUrl: '/docs',
        answerMode: 'deterministic',
        responseLanguage: 'en',
        knowledgeVersion: NaN,
        question: 'How do I install OKEng?',
        bypassIfIncomplete: true,
      });
      expect(res.status).toBe('BYPASSED');
    });

    it('splits authorizationVersion (Embed config changes) from knowledgeVersion (corpus mutations)', () => {
      const initialKnowledgeVersion = store.getKnowledgeVersion();
      const targetEmbed = store.getEmbeds()[0];
      const initialAuthVersion = store.getEmbedAuthorizationVersion(targetEmbed.id);

      // Updating an Embed's collectionIds changes authorizationVersion, NOT knowledgeVersion
      store.updateEmbed(targetEmbed.id, {
        allowedCollectionIds: ['COL-PUBLIC', 'COL-ADMIN'],
        knowledgeScope: { collectionIds: ['COL-PUBLIC', 'COL-ADMIN'] },
      });
      const updatedAuthVersion = store.getEmbedAuthorizationVersion(targetEmbed.id);
      expect(updatedAuthVersion).not.toBe(initialAuthVersion);
      expect(store.getKnowledgeVersion()).toBe(initialKnowledgeVersion);

      // Updating collection visibility bumps knowledgeVersion
      const firstCol = store.getCollections()[0];
      store.updateCollection(firstCol.id, { visibility: firstCol.visibility });
      expect(store.getKnowledgeVersion()).toBeGreaterThan(initialKnowledgeVersion);
    });
  });

  describe('5. Pure EmbedInstallationFacts & Dual-Proof Verification', () => {
    it('guarantees allowsAnonymousInitialization === true across public-only, mixed, and protected-only Embeds', () => {
      const publicEmbed = makeEmbed(['COL-PUBLIC'], 'EMB-PUB', false);
      const mixedEmbed = makeEmbed(['COL-PUBLIC', 'COL-MEMBERS'], 'EMB-MIX', true);
      const protectedEmbed = makeEmbed(['COL-MEMBERS', 'COL-ADMINS'], 'EMB-PROT', true);

      const pubContract = evaluateEmbedInstallationContract(publicEmbed, MOCK_COLLECTIONS);
      expect(pubContract.visibilityProfile).toBe('public-only');
      expect(pubContract.allowsAnonymousInitialization).toBe(true);
      expect(pubContract.hasAnonymousAccessibleContent).toBe(true);
      expect(pubContract.supportsAuthenticatedAccess).toBe(false);
      expect(pubContract.signingState).toBe('none');

      const mixContract = evaluateEmbedInstallationContract(mixedEmbed, MOCK_COLLECTIONS);
      expect(mixContract.visibilityProfile).toBe('mixed');
      expect(mixContract.allowsAnonymousInitialization).toBe(true);
      expect(mixContract.hasAnonymousAccessibleContent).toBe(true);
      expect(mixContract.supportsAuthenticatedAccess).toBe(true);
      expect(mixContract.requiresVerifiedIdentityForProtectedContent).toBe(true);
      expect(mixContract.signingState).toBe('optional');

      const protContract = evaluateEmbedInstallationContract(
        protectedEmbed,
        MOCK_COLLECTIONS
      );
      expect(protContract.visibilityProfile).toBe('protected-only');
      expect(protContract.allowsAnonymousInitialization).toBe(true);
      expect(protContract.hasAnonymousAccessibleContent).toBe(false);
      expect(protContract.supportsAuthenticatedAccess).toBe(true);
      expect(protContract.requiresVerifiedIdentityForProtectedContent).toBe(true);
      expect(protContract.signingState).toBe('required');
    });

    it('computes structured Dual-Proof Verification across anonymous, member, admin, and error states', () => {
      const mixedEmbed = makeEmbed(
        ['COL-PUBLIC', 'COL-MEMBERS', 'COL-ADMINS'],
        'EMB-MIX'
      );

      const anonProof = computeEmbedVerificationProof({
        embed: mixedEmbed,
        collections: MOCK_COLLECTIONS,
        identity: { kind: 'anonymous' },
        tokenVerified: false,
      });
      expect(anonProof.embedFound).toBe(true);
      expect(anonProof.sessionCreated).toBe(true);
      expect(anonProof.publicScopeVerified).toBe(true);
      expect(anonProof.identityVerified).toBe(false);
      expect(anonProof.protectedScopeVerified).toBe(false);
      expect(anonProof.actualAuthorizedCollectionIds).toEqual(['COL-PUBLIC']);

      const memberProof = computeEmbedVerificationProof({
        embed: mixedEmbed,
        collections: MOCK_COLLECTIONS,
        identity: {
          kind: 'authenticated',
          userId: 'usr_1',
          role: 'member',
        },
        tokenVerified: true,
      });
      expect(memberProof.publicScopeVerified).toBe(true);
      expect(memberProof.identityVerified).toBe(true);
      expect(memberProof.protectedScopeVerified).toBe(true);
      expect(memberProof.actualAuthorizedCollectionIds).toEqual([
        'COL-MEMBERS',
        'COL-PUBLIC',
      ]);

      const errorProof = computeEmbedVerificationProof({
        embed: mixedEmbed,
        collections: MOCK_COLLECTIONS,
        identity: { kind: 'anonymous' },
        tokenVerified: false,
        errorCode: 'INVALID_TOKEN_SIGNATURE',
      });
      expect(errorProof.sessionCreated).toBe(false);
      expect(errorProof.errorCode).toBe('INVALID_TOKEN_SIGNATURE');
    });
  });

  describe('6. Test Console Canonical Contract & 6 Mandatory Behavioral Tests (PAGE-APP-06)', () => {
    const MIXED_EMBED = makeEmbed(
      ['COL-PUBLIC', 'COL-MEMBERS', 'COL-ADMINS'],
      'EMB-PRODUCT-HELP',
      true
    );
    const PUBLIC_ONLY_EMBED = makeEmbed(['COL-PUBLIC'], 'EMB-PUBLIC-DOCS', false);

    it('Behavioral Test #1: Zero-state live Access & Epoch calculation before any query is run', () => {
      const zeroStateScope = resolveTestConsoleScope({
        scopeValue: 'workspace',
        identityMode: 'members',
        collections: MOCK_COLLECTIONS,
        embeds: [MIXED_EMBED, PUBLIC_ONLY_EMBED],
      });

      expect(zeroStateScope.isInvalidToken).toBe(false);
      expect(zeroStateScope.allowedCollections.map((c) => c.id)).toEqual([
        'COL-PUBLIC',
        'COL-MEMBERS',
      ]);
      expect(zeroStateScope.excludedByRoleCollections.length).toBe(1);
      expect(zeroStateScope.excludedByRoleCollections[0].collection.id).toBe('COL-ADMINS');
      expect(zeroStateScope.excludedByRoleCollections[0].requiredRoleLabel).toBe('Admin');
      expect(zeroStateScope.outsideScopeCollections.length).toBe(0);
      expect(zeroStateScope.authorizationVersion.startsWith('av1:')).toBe(true);
    });

    it('Behavioral Test #2: Canonical EffectiveScope (TargetScope ∩ Identity) at the retrieval engine boundary', () => {
      // Case A: Anonymous querying an Embed with Public + Members + Admin collections
      const anonOnMixedEmbed = resolveTestConsoleScope({
        scopeValue: 'embed:EMB-PRODUCT-HELP',
        identityMode: 'everyone',
        collections: MOCK_COLLECTIONS,
        embeds: [MIXED_EMBED],
      });
      expect(anonOnMixedEmbed.authorizationScope.collectionIds).toEqual(['COL-PUBLIC']);
      expect(anonOnMixedEmbed.excludedByRoleCollections.map((x) => x.collection.id)).toEqual([
        'COL-MEMBERS',
        'COL-ADMINS',
      ]);

      // Verify at retrieval engine boundary that Members and Admin documents NEVER enter candidate pool
      const diag = store.queryKnowledge({
        question: 'How are production KMS keys rotated and how do I invite team members?',
        role: anonOnMixedEmbed.effectiveRoleLabel,
        identity: anonOnMixedEmbed.identity,
        targetScopeCollectionIds: anonOnMixedEmbed.targetScopeCollectionIds,
        authorizationScope: anonOnMixedEmbed.authorizationScope,
        currentUrl: '/settings/security/kms',
      });

      for (const chunk of diag.retrievedChunks) {
        expect(chunk.collectionId).toBe('COL-PUBLIC');
      }
      for (const src of diag.sources) {
        expect(src.collectionId).toBe('COL-PUBLIC');
      }

      // Case B: Admin querying an Embed with ONLY Public collection attached (TargetScope narrows Admin)
      const adminOnPublicEmbed = resolveTestConsoleScope({
        scopeValue: 'embed:EMB-PUBLIC-DOCS',
        identityMode: 'admins',
        collections: MOCK_COLLECTIONS,
        embeds: [MIXED_EMBED, PUBLIC_ONLY_EMBED],
      });
      expect(adminOnPublicEmbed.authorizationScope.collectionIds).toEqual(['COL-PUBLIC']);
      expect(adminOnPublicEmbed.outsideScopeCollections.map((c) => c.id)).toEqual([
        'COL-MEMBERS',
        'COL-ADMINS',
      ]);
    });

    it('Behavioral Test #3: Invalid token (401) halts before retrieval with Anonymous fallback: None', () => {
      const invalidTokenScope = resolveTestConsoleScope({
        scopeValue: 'embed:EMB-PRODUCT-HELP',
        identityMode: 'invalid_token',
        collections: MOCK_COLLECTIONS,
        embeds: [MIXED_EMBED],
      });

      expect(invalidTokenScope.isInvalidToken).toBe(true);
      expect(invalidTokenScope.errorCode).toBe('INVALID_TOKEN_SIGNATURE');
      expect(invalidTokenScope.anonymousFallback).toBe('none');
      expect(invalidTokenScope.authorizationScope.collectionIds).toEqual([]);
      expect(invalidTokenScope.allowedCollections.length).toBe(0);
    });

    it('Behavioral Test #4: Ranked chunks expose BM25, route boost, line ranges, and matched tokens alongside Answer Plan', () => {
      const wsCollections = store.getCollections();
      const wsDocs = store.getDocuments();
      const memberScope = resolveTestConsoleScope({
        scopeValue: 'workspace',
        identityMode: 'members',
        collections: wsCollections,
        embeds: store.getEmbeds(),
      });
      const allowedSet = new Set(memberScope.authorizationScope.collectionIds);
      const authorizedDocs = wsDocs.filter((d) => allowedSet.has(d.collectionId));

      const plan = compileKnowledgeResponse({
        question: 'Where do I invite team members?',
        authorizedDocs,
        currentUrl: '/settings/organization/members',
        answerMode: 'deterministic',
        effectiveRole: 'members',
      });

      expect(plan.retrievedChunks.length).toBeGreaterThan(0);
      const topChunk = plan.retrievedChunks[0];
      expect(typeof topChunk.bm25Score).toBe('number');
      expect(typeof topChunk.routeBoost).toBe('number');
      expect(typeof topChunk.lineStart).toBe('number');
      expect(typeof topChunk.lineEnd).toBe('number');
      expect(topChunk.lineEnd >= topChunk.lineStart).toBe(true);
      expect(topChunk.matchedTokens.length).toBeGreaterThan(0);
      expect(plan.answerType).toBe('location');
    });

    it('Behavioral Test #5: 4-Way Cache Partition & Epoch Isolation (same context HIT, different identity MISS, different scope MISS, invalidate MISS)', async () => {
      const testCache = new CacheService(new MemoryCacheAdapter());
      const wsId = 'ws_test_console_cache';
      const question = 'Where do I invite team members?';

      const memberWorkspaceScope = resolveTestConsoleScope({
        scopeValue: 'workspace',
        identityMode: 'members',
        collections: MOCK_COLLECTIONS,
        embeds: [MIXED_EMBED, PUBLIC_ONLY_EMBED],
      });

      const baseCtx = {
        workspaceId: wsId,
        embedId: memberWorkspaceScope.scopeValue,
        identity: memberWorkspaceScope.identity,
        authorizationScope: memberWorkspaceScope.authorizationScope,
        authorizationVersion: memberWorkspaceScope.authorizationVersion,
        authorizedCollectionIds: memberWorkspaceScope.authorizationScope.collectionIds,
        knowledgeVersion: testCache.getKnowledgeVersion(wsId),
        currentUrl: '/settings/organization',
        responseLanguage: 'en' as const,
        answerMode: 'deterministic' as const,
        question,
      };

      // 1. Same context: MISS -> HIT
      const run1 = await testCache.getOrComputeAnswerSingleFlight(baseCtx, async () => ({
        value: { answer: 'Team invite answer' },
      }));
      expect(run1.telemetry.answerCache).toBe('MISS');

      const run2 = await testCache.getOrComputeAnswerSingleFlight(baseCtx, async () => ({
        value: { answer: 'Should not recompute' },
      }));
      expect(run2.telemetry.answerCache).toBe('HIT');

      // 2. Same query + different identity (Anonymous vs Member) -> different partition (MISS)
      const anonWorkspaceScope = resolveTestConsoleScope({
        scopeValue: 'workspace',
        identityMode: 'everyone',
        collections: MOCK_COLLECTIONS,
        embeds: [MIXED_EMBED, PUBLIC_ONLY_EMBED],
      });
      const anonRun = await testCache.getOrComputeAnswerSingleFlight(
        {
          ...baseCtx,
          identity: anonWorkspaceScope.identity,
          authorizationScope: anonWorkspaceScope.authorizationScope,
          authorizedCollectionIds: anonWorkspaceScope.authorizationScope.collectionIds,
        },
        async () => ({ value: { answer: 'Anon answer' } })
      );
      expect(anonRun.telemetry.answerCache).toBe('MISS');

      // 3. Same query + same identity + different scope (Embed vs Workspace) -> different partition (MISS)
      const memberPublicEmbedScope = resolveTestConsoleScope({
        scopeValue: 'embed:EMB-PUBLIC-DOCS',
        identityMode: 'members',
        collections: MOCK_COLLECTIONS,
        embeds: [MIXED_EMBED, PUBLIC_ONLY_EMBED],
      });
      const diffScopeRun = await testCache.getOrComputeAnswerSingleFlight(
        {
          ...baseCtx,
          embedId: memberPublicEmbedScope.scopeValue,
          authorizationScope: memberPublicEmbedScope.authorizationScope,
          authorizationVersion: memberPublicEmbedScope.authorizationVersion,
          authorizedCollectionIds: memberPublicEmbedScope.authorizationScope.collectionIds,
        },
        async () => ({ value: { answer: 'Scoped embed answer' } })
      );
      expect(diffScopeRun.telemetry.answerCache).toBe('MISS');

      // 4. Invalidate cache -> new knowledgeVersion epoch -> MISS
      const inv = await testCache.invalidateWorkspace(wsId);
      expect(inv.newKnowledgeVersion).toBeGreaterThan(baseCtx.knowledgeVersion);

      const postInvalidateRun = await testCache.getOrComputeAnswerSingleFlight(
        {
          ...baseCtx,
          knowledgeVersion: testCache.getKnowledgeVersion(wsId),
        },
        async () => ({ value: { answer: 'Recomputed after epoch bump' } })
      );
      expect(postInvalidateRun.telemetry.answerCache).toBe('MISS');
    });

    it('Behavioral Test #6: Collection Detail -> Test Console deep-link preserves collectionId while keeping Identity strictly enforced', () => {
      const href = routeToPath(
        'test',
        { collectionId: 'COL-ADMINS' },
        'okeng'
      );
      expect(href).toBe('/workspaces/okeng/test?collectionId=COL-ADMINS');

      const parsed = parsePathname(href);
      expect(parsed.appRoute).toBe('test');
      expect(parsed.params.workspaceSlug).toBe('okeng');
      expect(parsed.params.collectionId).toBe('COL-ADMINS');

      // Convenience default sets Identity = admins, which authorizes COL-ADMINS
      const convenienceScope = resolveTestConsoleScope({
        scopeValue: `collection:${parsed.params.collectionId}`,
        identityMode: 'admins',
        collections: MOCK_COLLECTIONS,
        embeds: [MIXED_EMBED],
      });
      expect(convenienceScope.allowedCollections.map((c) => c.id)).toEqual(['COL-ADMINS']);

      // Switching Identity to Anonymous immediately excludes COL-ADMINS (deep-link never grants permission)
      const switchedToAnonScope = resolveTestConsoleScope({
        scopeValue: `collection:${parsed.params.collectionId}`,
        identityMode: 'everyone',
        collections: MOCK_COLLECTIONS,
        embeds: [MIXED_EMBED],
      });
      expect(switchedToAnonScope.allowedCollections.length).toBe(0);
      expect(switchedToAnonScope.excludedByRoleCollections.length).toBe(1);
      expect(switchedToAnonScope.excludedByRoleCollections[0].collection.id).toBe('COL-ADMINS');
      expect(switchedToAnonScope.excludedByRoleCollections[0].requiredRoleLabel).toBe('Admin');
    });

    it('Behavioral Test #7: Enforces 100% EN/ES localization parity across all test.* dictionary keys (I18N-001)', () => {
      const enTestKeys = Object.keys(EN_DICTIONARY)
        .filter((k) => k.startsWith('test.'))
        .sort();
      const esTestKeys = Object.keys(ES_DICTIONARY)
        .filter((k) => k.startsWith('test.'))
        .sort();

      expect(enTestKeys.length).toBeGreaterThan(80);
      expect(enTestKeys).toEqual(esTestKeys);

      for (const key of enTestKeys) {
        expect(typeof EN_DICTIONARY[key]).toBe('string');
        expect(EN_DICTIONARY[key].trim().length).toBeGreaterThan(0);
        expect(typeof ES_DICTIONARY[key]).toBe('string');
        expect(ES_DICTIONARY[key].trim().length).toBeGreaterThan(0);
      }
    });

    it('Behavioral Test #8: Normalizes backend HIT to user-facing HIT_EXACT in presentation layer via formatCacheDecisionLabel()', () => {
      expect(formatCacheDecisionLabel('HIT')).toBe('HIT_EXACT');
      expect(formatCacheDecisionLabel('SEMANTIC_HIT')).toBe('SEMANTIC_HIT');
      expect(formatCacheDecisionLabel('NEGATIVE_HIT')).toBe('NEGATIVE_HIT');
      expect(formatCacheDecisionLabel('MISS')).toBe('MISS');
      expect(formatCacheDecisionLabel('BYPASSED')).toBe('BYPASSED');
      expect(formatCacheDecisionLabel(undefined)).toBe('MISS');
    });

    it('Behavioral Test #9: Routes Verification Scenarios to their canonical inspection tab via resolveScenarioInspectorTab()', () => {
      expect(resolveScenarioInspectorTab('access-boundary')).toBe('access');
      expect(resolveScenarioInspectorTab('progressive-identity')).toBe('access');
      expect(resolveScenarioInspectorTab('multilingual-retrieval')).toBe('retrieval');
      expect(resolveScenarioInspectorTab('cache-reuse')).toBe('cache');
    });
  });

  // ==========================================================================
  // PUBLIC-01–03 & PAGE-PUB-01: Homepage Dogfooding & Host Environment Bar Verification
  // ==========================================================================
  describe('PUBLIC-01–03 & PAGE-PUB-01: Homepage Dogfooding & Mixed-Access EMB-PUBLIC-HOME', () => {
    const okengWorkspace = store.getWorkspace();
    const okengCollections = store.getCollections();
    const okengDocuments = store.getDocuments();
    const homeEmbed = store.getPublicEmbed('EMB-PUBLIC-HOME')!;

    it('Homepage Test #1: OKEng workspace extends existing collections with COL-CUSTOMER (members) and COL-INTERNAL (admins) and binds EMB-PUBLIC-HOME across all 5 collections', () => {
      assert.ok(homeEmbed, 'EMB-PUBLIC-HOME must exist in OKEng workspace');
      expect(homeEmbed.name).toBe('OKEng Homepage Assistant');
      expect(homeEmbed.contextConfig?.useCurrentPage).toBe(true);
      expect(homeEmbed.contextConfig?.useHostUserContext).toBe(true);

      const boundIds = Array.from(getEmbedCollectionIds(homeEmbed));
      expect(boundIds).toEqual([
        'COL-CUSTOMER',
        'COL-DOCS',
        'COL-INTERNAL',
        'COL-LEGAL',
        'COL-PUBLIC',
      ]);

      const colMap = new Map(okengCollections.map((c) => [c.id, c]));
      expect(colMap.get('COL-PUBLIC')?.visibility).toBe('everyone');
      expect(colMap.get('COL-DOCS')?.visibility).toBe('everyone');
      expect(colMap.get('COL-LEGAL')?.visibility).toBe('everyone');
      expect(colMap.get('COL-CUSTOMER')?.visibility).toBe('members');
      expect(colMap.get('COL-INTERNAL')?.visibility).toBe('admins');
    });

    it('Homepage Test #2 (Scenario A — Visitor / Anonymous): Authorizes only Public Docs & Legal, excludes Customer & Admin Docs before retrieval, and matches Test Console scope', async () => {
      const targetIds = getEmbedCollectionIds(homeEmbed);
      const identityRes = await resolveRequestEmbedIdentity({
        identityToken: undefined,
        expectedWorkspaceId: okengWorkspace.id,
        expectedEmbedId: homeEmbed.id,
        signingSecret: okengWorkspace.signingSecret,
      });
      expect(identityRes.ok).toBe(true);
      if (!identityRes.ok) return;
      expect(identityRes.identity).toEqual({ kind: 'anonymous' });

      const authScope = resolveEmbedAuthorization(
        identityRes.identity,
        targetIds,
        okengCollections
      );
      expect(authScope.collectionIds).toEqual([
        'COL-DOCS',
        'COL-LEGAL',
        'COL-PUBLIC',
      ]);

      // Verify exact parity with Test Console scope resolver for EMB-PUBLIC-HOME + everyone
      const consoleScope = resolveTestConsoleScope({
        scopeValue: 'embed:EMB-PUBLIC-HOME',
        identityMode: 'everyone',
        collections: okengCollections,
        embeds: store.getEmbeds(),
      });
      expect(consoleScope.authorizationScope.collectionIds).toEqual(
        authScope.collectionIds
      );
      expect(
        consoleScope.excludedByRoleCollections.map((e) => e.collection.id).sort()
      ).toEqual(['COL-CUSTOMER', 'COL-INTERNAL']);

      // Asking a public question returns public citations + nextStep CTA
      const authorizedDocs = filterAuthorizedDocuments(okengDocuments, authScope);
      const publicRun = compileKnowledgeResponse({
        question: 'What is OKEng?',
        authorizedDocs,
        currentUrl: '/',
        answerMode: 'deterministic',
        uiLanguage: 'en',
        effectiveRole: 'everyone',
      });
      expect(publicRun.sources.length > 0).toBe(true);
      for (const cit of publicRun.sources) {
        assert.ok(
          ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL'].includes(cit.collectionId || ''),
          `Unexpected restricted citation ${cit.collectionId} for Visitor`
        );
      }

      // Asking a restricted Admin/Customer question as Visitor never leaks COL-CUSTOMER or COL-INTERNAL
      const restrictedAttempt = compileKnowledgeResponse({
        question:
          'What is the internal incident runbook for customer_auth_token_skew?',
        authorizedDocs,
        currentUrl: '/',
        answerMode: 'deterministic',
        uiLanguage: 'en',
        effectiveRole: 'everyone',
      });
      for (const cit of restrictedAttempt.sources) {
        assert.notStrictEqual(cit.collectionId, 'COL-CUSTOMER');
        assert.notStrictEqual(cit.collectionId, 'COL-INTERNAL');
      }
    });

    it('Homepage Test #3 (Scenario B — Member with Signed HMAC Assertion): Unlocks Customer Docs while keeping Admin Docs excluded before retrieval', async () => {
      const now = Math.floor(Date.now() / 1000);
      const memberToken = await createEmbedIdentityToken(
        {
          workspace_id: okengWorkspace.id,
          embed_id: homeEmbed.id,
          sub: 'usr_demo_member',
          role: 'member',
          iat: now,
          exp: now + 300,
        },
        okengWorkspace.signingSecret
      );

      const identityRes = await resolveRequestEmbedIdentity({
        identityToken: memberToken,
        expectedWorkspaceId: okengWorkspace.id,
        expectedEmbedId: homeEmbed.id,
        signingSecret: okengWorkspace.signingSecret,
      });
      expect(identityRes.ok).toBe(true);
      if (!identityRes.ok) return;
      expect(identityRes.identity).toEqual({
        kind: 'authenticated',
        userId: 'usr_demo_member',
        role: 'member',
      });

      const targetIds = getEmbedCollectionIds(homeEmbed);
      const authScope = resolveEmbedAuthorization(
        identityRes.identity,
        targetIds,
        okengCollections
      );
      expect(authScope.collectionIds).toEqual([
        'COL-CUSTOMER',
        'COL-DOCS',
        'COL-LEGAL',
        'COL-PUBLIC',
      ]);

      // Verify parity with Test Console scope resolver for EMB-PUBLIC-HOME + members
      const consoleScope = resolveTestConsoleScope({
        scopeValue: 'embed:EMB-PUBLIC-HOME',
        identityMode: 'members',
        collections: okengCollections,
        embeds: store.getEmbeds(),
      });
      expect(consoleScope.authorizationScope.collectionIds).toEqual(
        authScope.collectionIds
      );
      expect(
        consoleScope.excludedByRoleCollections.map((e) => e.collection.id)
      ).toEqual(['COL-INTERNAL']);

      const authorizedDocs = filterAuthorizedDocuments(okengDocuments, authScope);
      const memberRun = compileKnowledgeResponse({
        question: 'How do I configure customer authentication and host context?',
        authorizedDocs,
        currentUrl: '/docs/embedding',
        answerMode: 'deterministic',
        uiLanguage: 'en',
        effectiveRole: 'members',
      });
      expect(memberRun.sources.length > 0).toBe(true);
      assert.ok(
        memberRun.sources.some((c: SourceCitation) => c.collectionId === 'COL-CUSTOMER'),
        'Expected Member query to retrieve from COL-CUSTOMER'
      );
      for (const cit of memberRun.sources) {
        assert.notStrictEqual(cit.collectionId, 'COL-INTERNAL');
      }
    });

    it('Homepage Test #4 (Scenario C — Admin with Signed HMAC Assertion): Unlocks Public, Legal, Customer, and Admin Docs and retrieves internal architecture knowledge', async () => {
      const now = Math.floor(Date.now() / 1000);
      const adminToken = await createEmbedIdentityToken(
        {
          workspace_id: okengWorkspace.id,
          embed_id: homeEmbed.id,
          sub: 'usr_demo_admin',
          role: 'admin',
          iat: now,
          exp: now + 300,
        },
        okengWorkspace.signingSecret
      );

      const identityRes = await resolveRequestEmbedIdentity({
        identityToken: adminToken,
        expectedWorkspaceId: okengWorkspace.id,
        expectedEmbedId: homeEmbed.id,
        signingSecret: okengWorkspace.signingSecret,
      });
      expect(identityRes.ok).toBe(true);
      if (!identityRes.ok) return;
      expect(identityRes.identity).toEqual({
        kind: 'authenticated',
        userId: 'usr_demo_admin',
        role: 'admin',
      });

      const targetIds = getEmbedCollectionIds(homeEmbed);
      const authScope = resolveEmbedAuthorization(
        identityRes.identity,
        targetIds,
        okengCollections
      );
      expect(authScope.collectionIds).toEqual([
        'COL-CUSTOMER',
        'COL-DOCS',
        'COL-INTERNAL',
        'COL-LEGAL',
        'COL-PUBLIC',
      ]);

      const authorizedDocs = filterAuthorizedDocuments(okengDocuments, authScope);
      const adminRun = compileKnowledgeResponse({
        question:
          'How does the pre-retrieval authorization and cache pipeline work?',
        authorizedDocs,
        currentUrl: '/docs/access-control',
        answerMode: 'deterministic',
        uiLanguage: 'en',
        effectiveRole: 'admins',
      });
      expect(adminRun.sources.length > 0).toBe(true);
      assert.ok(
        adminRun.sources.some((c: SourceCitation) => c.collectionId === 'COL-INTERNAL'),
        'Expected Admin query to retrieve from COL-INTERNAL'
      );
    });

    it('Homepage Test #5 (Scenario D — Invalid Token -> Hard 401 Boundary): Rejects tampered host token on EMB-PUBLIC-HOME before retrieval with zero anonymous fallback', async () => {
      const now = Math.floor(Date.now() / 1000);
      const tamperedToken = await createEmbedIdentityToken(
        {
          workspace_id: okengWorkspace.id,
          embed_id: homeEmbed.id,
          sub: 'usr_demo_admin',
          role: 'admin',
          iat: now,
          exp: now + 300,
        },
        'wrong_signing_secret_tampered'
      );

      const tamperedRes = await resolveRequestEmbedIdentity({
        identityToken: tamperedToken,
        expectedWorkspaceId: okengWorkspace.id,
        expectedEmbedId: homeEmbed.id,
        signingSecret: okengWorkspace.signingSecret,
      });
      expect(tamperedRes.ok).toBe(false);
      if (!tamperedRes.ok) {
        expect(tamperedRes.code).toBe('INVALID_TOKEN_SIGNATURE');
        expect(tamperedRes.status).toBe(401);
      }
    });

    it('Homepage Test #6 (Scenario E — Multilingual Retrieval): Answers "¿Cómo funciona OKEng?" in Spanish from authorized public knowledge', () => {
      const targetIds = getEmbedCollectionIds(homeEmbed);
      const authScope = resolveEmbedAuthorization(
        { kind: 'anonymous' },
        targetIds,
        okengCollections
      );
      const authorizedDocs = filterAuthorizedDocuments(okengDocuments, authScope);

      const esRun = compileKnowledgeResponse({
        question: '¿Cómo funciona OKEng?',
        authorizedDocs,
        currentUrl: '/',
        answerMode: 'deterministic',
        uiLanguage: 'es',
        effectiveRole: 'everyone',
      });

      expect(esRun.languageContext.response_language).toBe('es');
      expect(esRun.sources.length > 0).toBe(true);
      assert.ok(
        esRun.summary.includes('OKEng'),
        'Expected Spanish answer summary to mention OKEng'
      );
    });

    it('Homepage Test #7: Enforces 100% EN/ES localization parity across all public.* dictionary keys (I18N-001)', () => {
      const enPublicKeys = Object.keys(EN_DICTIONARY)
        .filter((k) => k.startsWith('public.'))
        .sort();
      const esPublicKeys = Object.keys(ES_DICTIONARY)
        .filter((k) => k.startsWith('public.'))
        .sort();

      expect(enPublicKeys.length).toBeGreaterThan(50);
      expect(enPublicKeys).toEqual(esPublicKeys);

      for (const key of enPublicKeys) {
        expect(typeof EN_DICTIONARY[key]).toBe('string');
        expect(EN_DICTIONARY[key].trim().length).toBeGreaterThan(0);
        expect(typeof ES_DICTIONARY[key]).toBe('string');
        expect(ES_DICTIONARY[key].trim().length).toBeGreaterThan(0);
      }
    });

    it('Homepage Test #8 (EffectiveScope = Role ∩ Embed Bound Collections): Valid member/admin tokens on public-only EMB-PUBLIC-DOCS never access unbound COL-CUSTOMER or COL-INTERNAL in authorizedDocs, retrievedChunks, or citations', async () => {
      const docsEmbed = store.getPublicEmbed('EMB-PUBLIC-DOCS')!;
      assert.ok(docsEmbed, 'EMB-PUBLIC-DOCS must exist in OKEng workspace');
      const docsEmbedBoundIds = getEmbedCollectionIds(docsEmbed);
      expect(Array.from(docsEmbedBoundIds)).toEqual(['COL-DOCS']);

      const now = Math.floor(Date.now() / 1000);
      const adminTokenOnDocsEmbed = await createEmbedIdentityToken(
        {
          workspace_id: okengWorkspace.id,
          embed_id: docsEmbed.id,
          sub: 'usr_demo_admin',
          role: 'admin',
          iat: now,
          exp: now + 300,
        },
        okengWorkspace.signingSecret
      );

      const identityRes = await resolveRequestEmbedIdentity({
        identityToken: adminTokenOnDocsEmbed,
        expectedWorkspaceId: okengWorkspace.id,
        expectedEmbedId: docsEmbed.id,
        signingSecret: okengWorkspace.signingSecret,
      });
      expect(identityRes.ok).toBe(true);
      if (!identityRes.ok) return;

      // Even though caller is a verified admin, EMB-PUBLIC-DOCS only binds COL-DOCS
      const effectiveScope = resolveEmbedAuthorization(
        identityRes.identity,
        docsEmbedBoundIds,
        okengCollections
      );
      expect(effectiveScope.collectionIds).toEqual(['COL-DOCS']);

      const authorizedDocs = filterAuthorizedDocuments(okengDocuments, effectiveScope);
      for (const doc of authorizedDocs) {
        assert.strictEqual(
          doc.collectionId,
          'COL-DOCS',
          `Unbound collection ${doc.collectionId} leaked into authorizedDocs on EMB-PUBLIC-DOCS`
        );
      }

      const plan = compileKnowledgeResponse({
        question: 'How are production KMS keys rotated and how do I configure customer authentication?',
        authorizedDocs,
        currentUrl: '/docs',
        answerMode: 'deterministic',
        uiLanguage: 'en',
        effectiveRole: 'admins',
      });

      for (const chunk of plan.retrievedChunks) {
        assert.notStrictEqual(chunk.collectionId, 'COL-CUSTOMER');
        assert.notStrictEqual(chunk.collectionId, 'COL-INTERNAL');
        assert.notStrictEqual(chunk.collectionId, 'COL-LEGAL');
      }
      for (const src of plan.sources) {
        assert.notStrictEqual(src.collectionId, 'COL-CUSTOMER');
        assert.notStrictEqual(src.collectionId, 'COL-INTERNAL');
        assert.notStrictEqual(src.collectionId, 'COL-LEGAL');
      }
    });
  });
});



