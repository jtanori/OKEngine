// ============================================================================
// SERVER-ONLY PRIVILEGED DEMO AUTHORIZATION BOUNDARY
// (server/demo/publicHomepageDemoAuthorization.ts)
//
// SECURITY INVARIANTS (P0-01 .. P0-05, P1-01, P1-02, P1-05):
// 1. Lives strictly under server/ outside the browser src/ bundle.
// 2. PublicDemoAuthority is branded with a module-private unique symbol and can
//    only be minted by authorizePublicHomepageDemoRequest().
// 3. Rejects any embedId !== 'EMB-PUBLIC-HOME' with 403 FORBIDDEN_DEMO_SCOPE.
// 4. Rejects missing/unknown demoPreset with 400 INVALID_DEMO_PRESET.
// 5. Rejects client-supplied tokens, roles, secrets, or corpus arrays before
//    retrieval (400 DEMO_TOKEN_NOT_ACCEPTED / 400 FORBIDDEN_CLIENT_AUTHORITY_FIELD).
// 6. Normalizes workspace alias ('okeng' -> 'ws_okeng_01') at the repository
//    boundary and enforces strict record.workspaceId === 'ws_okeng_01'.
// 7. Enforces 6-point pre-retrieval narrowing D and policy-versioned cache key
//    (demoPolicyVersion + narrowedDocumentFingerprint).
// 8. Computes server-authoritative serverOutcome ('grounded' | 'refused' | 'failed')
//    and maps citations to public-safe titles and validated routes.
// ============================================================================

import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import type {
  AccessVisibility,
  Collection,
  EmbedInstance,
  KnowledgeDocument,
  Workspace,
} from '../../src/types';
import { INITIAL_WORKSPACE } from '../../src/data/seedData';
import { repositories } from '../../src/repositories';
import {
  computeEmbedAuthorizationVersion,
  getEmbedCollectionIds,
} from '../../src/services/embedAuthorization';
import { retrieveAndRankAuthorizedDocs } from '../../src/services/engine/bm25Retriever';
import {
  compileKnowledgeResponse,
  type CompiledAnswerPlan,
  type CompiledRetrievedChunk,
} from '../../src/services/engine/responseCompiler';
import { validateChatQuestion } from '../../src/services/validation';
import {
  APPROVED_HOMEPAGE_TOUR_CONTRACT,
  CANONICAL_PUBLIC_ROUTE_REGISTRY,
  PUBLIC_DEMO_CONTEXT_ROUTES,
  isValidPublicCitationDestinationRoute,
  isValidPublicDemoContextRoute,
  type CanonicalPublicRoute,
  type HomepageTourStageId,
  type PublicDemoContextRoute,
  type PublicHomepageDemoPreset,
} from '../../src/data/homepageTourContract';

const PUBLIC_DEMO_AUTHORITY_BRAND: unique symbol = Symbol('PublicDemoAuthority');

export const CANONICAL_DEMO_WORKSPACE_ID = 'ws_okeng_01' as const;
export const CANONICAL_DEMO_EMBED_ID = 'EMB-PUBLIC-HOME' as const;

export type CanonicalDemoCollectionId =
  | 'COL-PUBLIC'
  | 'COL-DOCS'
  | 'COL-LEGAL'
  | 'COL-CUSTOMER'
  | 'COL-INTERNAL';

export const CANONICAL_DEMO_COLLECTION_ORDER: readonly CanonicalDemoCollectionId[] =
  Object.freeze([
    'COL-PUBLIC',
    'COL-DOCS',
    'COL-LEGAL',
    'COL-CUSTOMER',
    'COL-INTERNAL',
  ] as const);

export const COLLECTION_CANONICAL_VISIBILITY_MAP: Readonly<
  Record<CanonicalDemoCollectionId, AccessVisibility>
> = Object.freeze({
  'COL-PUBLIC': 'everyone',
  'COL-DOCS': 'everyone',
  'COL-LEGAL': 'everyone',
  'COL-CUSTOMER': 'members',
  'COL-INTERNAL': 'admins',
});

export const PRESET_VISIBILITY_POLICY: Readonly<
  Record<PublicHomepageDemoPreset, readonly AccessVisibility[]>
> = Object.freeze({
  visitor: Object.freeze(['everyone'] as const),
  member: Object.freeze(['everyone', 'members'] as const),
  admin: Object.freeze(['everyone', 'members', 'admins'] as const),
});

export const PRESET_EFFECTIVE_ROLE_MAP: Readonly<
  Record<PublicHomepageDemoPreset, AccessVisibility>
> = Object.freeze({
  visitor: 'everyone',
  member: 'members',
  admin: 'admins',
});

export interface PublicDemoDocumentOwnershipEntry {
  documentId: string;
  collectionId: CanonicalDemoCollectionId;
  visibility: AccessVisibility;
  canonicalFilename: string;
}

export interface PublicDemoSourcePolicyEntry {
  documentId: string;
  collectionId: CanonicalDemoCollectionId;
  permittedPresets: readonly PublicHomepageDemoPreset[];
  citationRenderMode: 'direct_public_doc' | 'public_companion_guide';
  publicSafeTitle: string;
  publicSafeFilename: string;
  canonicalDestinationRoute: CanonicalPublicRoute;
}

export const PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP: Readonly<
  Record<string, PublicDemoDocumentOwnershipEntry>
> = Object.freeze({
  doc_pub_01: {
    documentId: 'doc_pub_01',
    collectionId: 'COL-PUBLIC',
    visibility: 'everyone',
    canonicalFilename: 'product-overview.md',
  },
  doc_pub_02: {
    documentId: 'doc_pub_02',
    collectionId: 'COL-PUBLIC',
    visibility: 'everyone',
    canonicalFilename: 'product-concepts.md',
  },
  doc_pub_03: {
    documentId: 'doc_pub_03',
    collectionId: 'COL-PUBLIC',
    visibility: 'everyone',
    canonicalFilename: 'faq.md',
  },
  doc_pub_04: {
    documentId: 'doc_pub_04',
    collectionId: 'COL-PUBLIC',
    visibility: 'everyone',
    canonicalFilename: 'security-overview.md',
  },
  doc_docs_05: {
    documentId: 'doc_docs_05',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'getting-started.md',
  },
  doc_docs_06: {
    documentId: 'doc_docs_06',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'workspaces.md',
  },
  doc_docs_07: {
    documentId: 'doc_docs_07',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'collections.md',
  },
  doc_docs_08: {
    documentId: 'doc_docs_08',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'files.md',
  },
  doc_docs_09: {
    documentId: 'doc_docs_09',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'markdown.md',
  },
  doc_docs_10: {
    documentId: 'doc_docs_10',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'ingestion.md',
  },
  doc_docs_11: {
    documentId: 'doc_docs_11',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'retrieval.md',
  },
  doc_docs_12: {
    documentId: 'doc_docs_12',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'access-control.md',
  },
  doc_docs_13: {
    documentId: 'doc_docs_13',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'embedding.md',
  },
  doc_docs_14: {
    documentId: 'doc_docs_14',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'troubleshooting.md',
  },
  doc_docs_es_20: {
    documentId: 'doc_docs_es_20',
    collectionId: 'COL-DOCS',
    visibility: 'everyone',
    canonicalFilename: 'facturacion-y-planes.md',
  },
  doc_legal_15: {
    documentId: 'doc_legal_15',
    collectionId: 'COL-LEGAL',
    visibility: 'everyone',
    canonicalFilename: 'terms.md',
  },
  doc_legal_16: {
    documentId: 'doc_legal_16',
    collectionId: 'COL-LEGAL',
    visibility: 'everyone',
    canonicalFilename: 'privacy.md',
  },
  doc_legal_17: {
    documentId: 'doc_legal_17',
    collectionId: 'COL-LEGAL',
    visibility: 'everyone',
    canonicalFilename: 'acceptable-use.md',
  },
  doc_cust_21: {
    documentId: 'doc_cust_21',
    collectionId: 'COL-CUSTOMER',
    visibility: 'members',
    canonicalFilename: 'customer-onboarding-checklist.md',
  },
  doc_cust_22: {
    documentId: 'doc_cust_22',
    collectionId: 'COL-CUSTOMER',
    visibility: 'members',
    canonicalFilename: 'member-billing-runbook.md',
  },
  doc_cust_23: {
    documentId: 'doc_cust_23',
    collectionId: 'COL-CUSTOMER',
    visibility: 'members',
    canonicalFilename: 'customer-embed-deployment.md',
  },
  doc_internal_18: {
    documentId: 'doc_internal_18',
    collectionId: 'COL-INTERNAL',
    visibility: 'admins',
    canonicalFilename: 'internal-operations.md',
  },
  doc_internal_19: {
    documentId: 'doc_internal_19',
    collectionId: 'COL-INTERNAL',
    visibility: 'admins',
    canonicalFilename: 'security-audit-policy.md',
  },
  doc_internal_24: {
    documentId: 'doc_internal_24',
    collectionId: 'COL-INTERNAL',
    visibility: 'admins',
    canonicalFilename: 'admin-architecture-reference.md',
  },
  doc_internal_25: {
    documentId: 'doc_internal_25',
    collectionId: 'COL-INTERNAL',
    visibility: 'admins',
    canonicalFilename: 'admin-key-rotation-sop.md',
  },
});

export const PUBLIC_DEMO_SOURCE_POLICY: Readonly<
  Record<string, PublicDemoSourcePolicyEntry>
> = Object.freeze({
  doc_pub_01: {
    documentId: 'doc_pub_01',
    collectionId: 'COL-PUBLIC',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'OKEng Product Overview',
    publicSafeFilename: 'product-overview.md',
    canonicalDestinationRoute: '/docs/product-overview',
  },
  doc_pub_02: {
    documentId: 'doc_pub_02',
    collectionId: 'COL-PUBLIC',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Core Product Concepts',
    publicSafeFilename: 'product-concepts.md',
    canonicalDestinationRoute: '/docs/product-concepts',
  },
  doc_pub_03: {
    documentId: 'doc_pub_03',
    collectionId: 'COL-PUBLIC',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Frequently Asked Questions (FAQ)',
    publicSafeFilename: 'faq.md',
    canonicalDestinationRoute: '/docs/faq',
  },
  doc_pub_04: {
    documentId: 'doc_pub_04',
    collectionId: 'COL-PUBLIC',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Security & Isolation Overview',
    publicSafeFilename: 'security-overview.md',
    canonicalDestinationRoute: '/docs/security-overview',
  },
  doc_docs_05: {
    documentId: 'doc_docs_05',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Getting Started with OKEng',
    publicSafeFilename: 'getting-started.md',
    canonicalDestinationRoute: '/docs/getting-started',
  },
  doc_docs_06: {
    documentId: 'doc_docs_06',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Workspaces & Team Membership',
    publicSafeFilename: 'workspaces.md',
    canonicalDestinationRoute: '/docs/workspaces',
  },
  doc_docs_07: {
    documentId: 'doc_docs_07',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Collections & Visibility Boundaries',
    publicSafeFilename: 'collections.md',
    canonicalDestinationRoute: '/docs/collections',
  },
  doc_docs_08: {
    documentId: 'doc_docs_08',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Files & Document Management',
    publicSafeFilename: 'files.md',
    canonicalDestinationRoute: '/docs/files',
  },
  doc_docs_09: {
    documentId: 'doc_docs_09',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Authoring Markdown Documents',
    publicSafeFilename: 'markdown.md',
    canonicalDestinationRoute: '/docs/markdown',
  },
  doc_docs_10: {
    documentId: 'doc_docs_10',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Ingestion & Chunking Pipeline',
    publicSafeFilename: 'ingestion.md',
    canonicalDestinationRoute: '/docs/ingestion',
  },
  doc_docs_11: {
    documentId: 'doc_docs_11',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Retrieval, Context & Source Attribution',
    publicSafeFilename: 'retrieval.md',
    canonicalDestinationRoute: '/docs/retrieval',
  },
  doc_docs_12: {
    documentId: 'doc_docs_12',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Access Control & Clearance Mapping',
    publicSafeFilename: 'access-control.md',
    canonicalDestinationRoute: '/docs/access-control',
  },
  doc_docs_13: {
    documentId: 'doc_docs_13',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Embedding & Signed Host Identity',
    publicSafeFilename: 'embedding.md',
    canonicalDestinationRoute: '/docs/embedding',
  },
  doc_docs_14: {
    documentId: 'doc_docs_14',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Troubleshooting & Diagnostics',
    publicSafeFilename: 'troubleshooting.md',
    canonicalDestinationRoute: '/docs/troubleshooting',
  },
  doc_docs_es_20: {
    documentId: 'doc_docs_es_20',
    collectionId: 'COL-DOCS',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Facturación, Planes y Límites de Asientos',
    publicSafeFilename: 'facturacion-y-planes.md',
    canonicalDestinationRoute: '/docs/facturacion-y-planes',
  },
  doc_legal_15: {
    documentId: 'doc_legal_15',
    collectionId: 'COL-LEGAL',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Terms of Service',
    publicSafeFilename: 'terms.md',
    canonicalDestinationRoute: '/terms',
  },
  doc_legal_16: {
    documentId: 'doc_legal_16',
    collectionId: 'COL-LEGAL',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Privacy Policy',
    publicSafeFilename: 'privacy.md',
    canonicalDestinationRoute: '/privacy',
  },
  doc_legal_17: {
    documentId: 'doc_legal_17',
    collectionId: 'COL-LEGAL',
    permittedPresets: ['visitor', 'member', 'admin'],
    citationRenderMode: 'direct_public_doc',
    publicSafeTitle: 'Acceptable Use Policy',
    publicSafeFilename: 'acceptable-use.md',
    canonicalDestinationRoute: '/acceptable-use',
  },
  doc_cust_21: {
    documentId: 'doc_cust_21',
    collectionId: 'COL-CUSTOMER',
    permittedPresets: ['member', 'admin'],
    citationRenderMode: 'public_companion_guide',
    publicSafeTitle: 'Member Access Control Companion Guide',
    publicSafeFilename: 'access-control.md',
    canonicalDestinationRoute: '/docs/access-control',
  },
  doc_cust_22: {
    documentId: 'doc_cust_22',
    collectionId: 'COL-CUSTOMER',
    permittedPresets: ['member', 'admin'],
    citationRenderMode: 'public_companion_guide',
    publicSafeTitle: 'Workspace & Team Membership Companion Guide',
    publicSafeFilename: 'workspaces.md',
    canonicalDestinationRoute: '/docs/workspaces',
  },
  doc_cust_23: {
    documentId: 'doc_cust_23',
    collectionId: 'COL-CUSTOMER',
    permittedPresets: ['member', 'admin'],
    citationRenderMode: 'public_companion_guide',
    publicSafeTitle: 'Embedding & Signed Host Identity Companion Guide',
    publicSafeFilename: 'embedding.md',
    canonicalDestinationRoute: '/docs/embedding',
  },
  doc_internal_18: {
    documentId: 'doc_internal_18',
    collectionId: 'COL-INTERNAL',
    permittedPresets: ['admin'],
    citationRenderMode: 'public_companion_guide',
    publicSafeTitle: 'Security & Isolation Companion Guide',
    publicSafeFilename: 'access-control.md',
    canonicalDestinationRoute: '/docs/access-control',
  },
  doc_internal_19: {
    documentId: 'doc_internal_19',
    collectionId: 'COL-INTERNAL',
    permittedPresets: ['admin'],
    citationRenderMode: 'public_companion_guide',
    publicSafeTitle: 'Access Control & Security Audit Companion Guide',
    publicSafeFilename: 'access-control.md',
    canonicalDestinationRoute: '/docs/access-control',
  },
  doc_internal_24: {
    documentId: 'doc_internal_24',
    collectionId: 'COL-INTERNAL',
    permittedPresets: ['admin'],
    citationRenderMode: 'public_companion_guide',
    publicSafeTitle: 'Retrieval & Authorization Companion Guide',
    publicSafeFilename: 'retrieval.md',
    canonicalDestinationRoute: '/docs/retrieval',
  },
  doc_internal_25: {
    documentId: 'doc_internal_25',
    collectionId: 'COL-INTERNAL',
    permittedPresets: ['admin'],
    citationRenderMode: 'public_companion_guide',
    publicSafeTitle: 'Signed Host Identity & Key Rotation Companion Guide',
    publicSafeFilename: 'embedding.md',
    canonicalDestinationRoute: '/docs/embedding',
  },
});

export interface PublicDemoPolicyOverride {
  ownershipMap?: Record<string, PublicDemoDocumentOwnershipEntry>;
  sourcePolicy?: Record<string, PublicDemoSourcePolicyEntry>;
  routeRegistry?: readonly string[];
  presetVisibilityPolicy?: Record<PublicHomepageDemoPreset, readonly AccessVisibility[]>;
  collectionVisibilityMap?: Record<CanonicalDemoCollectionId, AccessVisibility>;
}

/**
 * Cross-validates PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP, PUBLIC_DEMO_SOURCE_POLICY,
 * and CANONICAL_PUBLIC_ROUTE_REGISTRY at startup and in tests (P1-01 & P1-02).
 */
export function validatePublicDemoRegistries(
  override?: PublicDemoPolicyOverride
): { valid: boolean; errors: string[] } {
  const ownershipMap = override?.ownershipMap ?? PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP;
  const sourcePolicy = override?.sourcePolicy ?? PUBLIC_DEMO_SOURCE_POLICY;
  const routeSet = new Set<string>(override?.routeRegistry ?? CANONICAL_PUBLIC_ROUTE_REGISTRY);
  const collectionVisMap =
    override?.collectionVisibilityMap ?? COLLECTION_CANONICAL_VISIBILITY_MAP;

  const errors: string[] = [];

  for (const [docId, own] of Object.entries(ownershipMap)) {
    if (own.documentId !== docId) {
      errors.push(`Ownership key '${docId}' mismatches documentId '${own.documentId}'`);
    }
    const expectedVis = collectionVisMap[own.collectionId];
    if (!expectedVis || own.visibility !== expectedVis) {
      errors.push(
        `Document '${docId}' in '${own.collectionId}' has visibility '${own.visibility}', expected '${expectedVis}'`
      );
    }
    const policy = sourcePolicy[docId];
    if (!policy) {
      errors.push(`Document '${docId}' exists in ownershipMap but is missing from sourcePolicy`);
    }
  }

  for (const [docId, policy] of Object.entries(sourcePolicy)) {
    const own = ownershipMap[docId];
    if (!own) {
      errors.push(`Source policy '${docId}' does not exist in ownershipMap`);
      continue;
    }
    if (policy.collectionId !== own.collectionId) {
      errors.push(
        `Source policy '${docId}' collectionId '${policy.collectionId}' mismatches ownership '${own.collectionId}'`
      );
    }
    const maxAllowedPresets: PublicHomepageDemoPreset[] =
      own.visibility === 'everyone'
        ? ['visitor', 'member', 'admin']
        : own.visibility === 'members'
        ? ['member', 'admin']
        : ['admin'];
    if (
      !policy.permittedPresets ||
      policy.permittedPresets.length === 0 ||
      policy.permittedPresets.some((p) => !maxAllowedPresets.includes(p))
    ) {
      errors.push(
        `Source policy '${docId}' permittedPresets [${policy.permittedPresets?.join(',')}] exceeds or violates visibility '${own.visibility}' max allowed [${maxAllowedPresets.join(',')}]`
      );
    }
    if (!policy.publicSafeTitle || policy.publicSafeTitle.trim().length === 0) {
      errors.push(`Source policy '${docId}' must define a non-empty publicSafeTitle`);
    }
    if (!policy.publicSafeFilename || policy.publicSafeFilename.trim().length === 0) {
      errors.push(`Source policy '${docId}' must define a non-empty publicSafeFilename`);
    }
    if (
      !isValidPublicCitationDestinationRoute(policy.canonicalDestinationRoute) ||
      !routeSet.has(policy.canonicalDestinationRoute)
    ) {
      errors.push(
        `Source policy '${docId}' canonicalDestinationRoute '${policy.canonicalDestinationRoute}' is not a valid canonical public route`
      );
    }
    if (
      (own.collectionId === 'COL-CUSTOMER' || own.collectionId === 'COL-INTERNAL') &&
      policy.citationRenderMode !== 'public_companion_guide'
    ) {
      errors.push(
        `Restricted demo document '${docId}' in '${own.collectionId}' must use citationRenderMode === 'public_companion_guide'`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Computes a deterministic SHA-256 policy version over all demo authorization
 * and source policy maps (P0-02). Mutating any policy entry immediately changes
 * demoPolicyVersion even when document updatedAt timestamps do not change.
 */
export function computeDemoPolicyVersion(override?: PublicDemoPolicyOverride): string {
  const ownershipMap = override?.ownershipMap ?? PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP;
  const sourcePolicy = override?.sourcePolicy ?? PUBLIC_DEMO_SOURCE_POLICY;
  const routeRegistry = override?.routeRegistry ?? CANONICAL_PUBLIC_ROUTE_REGISTRY;
  const presetVisibilityPolicy = override?.presetVisibilityPolicy ?? PRESET_VISIBILITY_POLICY;
  const collectionVisibilityMap =
    override?.collectionVisibilityMap ?? COLLECTION_CANONICAL_VISIBILITY_MAP;

  const sortedOwnership = Object.keys(ownershipMap)
    .sort()
    .map((k) => ownershipMap[k]);
  const sortedSourcePolicy = Object.keys(sourcePolicy)
    .sort()
    .map((k) => sourcePolicy[k]);
  const sortedRoutes = [...routeRegistry].sort();

  const canonicalPayload = JSON.stringify({
    ownership: sortedOwnership,
    sourcePolicy: sortedSourcePolicy,
    routes: sortedRoutes,
    presetVisibilityPolicy,
    collectionVisibilityMap,
  });

  return crypto.createHash('sha256').update(canonicalPayload).digest('hex').slice(0, 24);
}

/**
 * Normalizes the public workspace alias ('okeng' -> 'ws_okeng_01') at the
 * repository boundary (P0-05). Any other workspace ID is returned unchanged
 * so cross-tenant IDs fail strict equality checks.
 */
export function normalizeDemoWorkspaceIdAtBoundary(
  rawWorkspaceId: string | undefined | null
): string {
  if (
    !rawWorkspaceId ||
    rawWorkspaceId === 'okeng' ||
    rawWorkspaceId === CANONICAL_DEMO_WORKSPACE_ID
  ) {
    return CANONICAL_DEMO_WORKSPACE_ID;
  }
  return rawWorkspaceId;
}

export interface PublicDemoCollectionStatusRow {
  collectionId: CanonicalDemoCollectionId;
  name: string;
  visibility: AccessVisibility;
  authorized: boolean;
  readyDocumentCount: number;
}

export interface PublicDemoAuthority {
  readonly [PUBLIC_DEMO_AUTHORITY_BRAND]: true;
  readonly kind: 'public_homepage_demo';
  readonly workspaceId: typeof CANONICAL_DEMO_WORKSPACE_ID;
  readonly embedId: typeof CANONICAL_DEMO_EMBED_ID;
  readonly preset: PublicHomepageDemoPreset;
  readonly effectiveRole: AccessVisibility;
  readonly currentUrl: PublicDemoContextRoute;
  readonly embedBoundCollectionIds: CanonicalDemoCollectionId[];
  readonly roleAuthorizedCollectionIds: CanonicalDemoCollectionId[];
  readonly effectiveScopeCollectionIds: CanonicalDemoCollectionId[];
  readonly narrowedDocuments: KnowledgeDocument[];
  readonly narrowedDocumentIds: string[];
  readonly narrowedDocumentFingerprint: string;
  readonly demoPolicyVersion: string;
  readonly authorizationVersion: string | number;
  readonly knowledgeVersion: number;
  readonly collectionStatuses: PublicDemoCollectionStatusRow[];
}

export function isValidPublicDemoAuthority(
  candidate: unknown
): candidate is PublicDemoAuthority {
  return Boolean(
    candidate &&
      typeof candidate === 'object' &&
      (candidate as Record<symbol, unknown>)[PUBLIC_DEMO_AUTHORITY_BRAND] === true
  );
}

export interface PublicDemoRepositorySnapshot {
  workspace: Workspace;
  collections: Collection[];
  documents: KnowledgeDocument[];
  embeds: EmbedInstance[];
}

export interface PublicHomepageDemoExecutionTrace {
  steps: string[];
  enteredDemoHandler: boolean;
  readFromServerRepositories: boolean;
  workspaceIdNormalized: string;
  narrowedDocumentIds: string[];
  retrievalInputDocumentIds: string[];
  cacheKeyUsed?: string;
  cacheDecision?: 'HIT' | 'MISS';
  serverOutcome?: 'grounded' | 'refused' | 'failed';
}

export interface AuthorizePublicHomepageDemoInput {
  embedId: unknown;
  demoPreset: unknown;
  currentUrl?: unknown;
  workspaceId?: unknown;
  // Forbidden caller-supplied authority/corpus fields (explicitly rejected if present)
  identityToken?: unknown;
  authorizationHeader?: unknown;
  role?: unknown;
  userRole?: unknown;
  signingSecret?: unknown;
  documents?: unknown;
  collections?: unknown;
  embeds?: unknown;
  // Optional test-only repository snapshot & policy override
  repositorySnapshot?: PublicDemoRepositorySnapshot;
  policyOverride?: PublicDemoPolicyOverride;
  executionTrace?: PublicHomepageDemoExecutionTrace;
}

export type AuthorizePublicHomepageDemoResult =
  | {
      ok: true;
      authority: PublicDemoAuthority;
    }
  | {
      ok: false;
      status: 400 | 403;
      code:
        | 'FORBIDDEN_DEMO_SCOPE'
        | 'INVALID_DEMO_PRESET'
        | 'INVALID_DEMO_CONTEXT_ROUTE'
        | 'DEMO_TOKEN_NOT_ACCEPTED'
        | 'FORBIDDEN_CLIENT_AUTHORITY_FIELD'
        | 'INVALID_DEMO_WORKSPACE'
        | 'DEMO_REGISTRY_VALIDATION_FAILED';
      message: string;
    };

function normalizeRepositorySnapshotAtBoundary(
  snapshot: PublicDemoRepositorySnapshot
): PublicDemoRepositorySnapshot {
  const normWsId =
    snapshot.workspace.id === 'okeng'
      ? CANONICAL_DEMO_WORKSPACE_ID
      : snapshot.workspace.id;
  return {
    workspace: { ...snapshot.workspace, id: normWsId },
    collections: snapshot.collections.map((c) => ({
      ...c,
      workspaceId: c.workspaceId === 'okeng' ? CANONICAL_DEMO_WORKSPACE_ID : c.workspaceId,
    })),
    documents: snapshot.documents.map((d) => ({
      ...d,
      workspaceId: d.workspaceId === 'okeng' ? CANONICAL_DEMO_WORKSPACE_ID : d.workspaceId,
    })),
    embeds: snapshot.embeds.map((e) => ({
      ...e,
      workspaceId: e.workspaceId === 'okeng' ? CANONICAL_DEMO_WORKSPACE_ID : e.workspaceId,
    })),
  };
}

export async function loadCanonicalServerDemoRepositorySnapshot(): Promise<PublicDemoRepositorySnapshot> {
  const [collections, embeds] = await Promise.all([
    repositories.collections.listByWorkspace(CANONICAL_DEMO_WORKSPACE_ID),
    repositories.embeds.listByWorkspace(CANONICAL_DEMO_WORKSPACE_ID),
  ]);
  const documents = await repositories.documents.listAuthorized({
    workspaceId: CANONICAL_DEMO_WORKSPACE_ID,
    authorizedCollectionIds: collections.map((c) => c.id),
  });
  return normalizeRepositorySnapshotAtBoundary({
    workspace: { ...INITIAL_WORKSPACE },
    collections,
    documents,
    embeds,
  });
}

export async function authorizePublicHomepageDemoRequest(
  input: AuthorizePublicHomepageDemoInput
): Promise<AuthorizePublicHomepageDemoResult> {
  const trace = input.executionTrace;
  if (trace) {
    trace.enteredDemoHandler = true;
    trace.steps.push('1:enter_demo_handler');
  }

  // 1. Enforce embedId === 'EMB-PUBLIC-HOME' (403 FORBIDDEN_DEMO_SCOPE for any other embed)
  if (input.embedId !== CANONICAL_DEMO_EMBED_ID) {
    return {
      ok: false,
      status: 403,
      code: 'FORBIDDEN_DEMO_SCOPE',
      message: 'Public homepage demo presets are strictly bound to EMB-PUBLIC-HOME.',
    };
  }

  // 2. Reject any caller-supplied token or Authorization header (never mix demo presets with JWTs)
  if (
    (input.identityToken !== undefined &&
      input.identityToken !== null &&
      input.identityToken !== '') ||
    (input.authorizationHeader !== undefined &&
      input.authorizationHeader !== null &&
      input.authorizationHeader !== '')
  ) {
    return {
      ok: false,
      status: 400,
      code: 'DEMO_TOKEN_NOT_ACCEPTED',
      message:
        'Public homepage demo requests do not accept signed identity tokens or Authorization headers.',
    };
  }

  // 3. Reject any caller-supplied authority or corpus override fields
  if (
    input.role !== undefined ||
    input.userRole !== undefined ||
    input.signingSecret !== undefined ||
    input.documents !== undefined ||
    input.collections !== undefined ||
    input.embeds !== undefined
  ) {
    return {
      ok: false,
      status: 400,
      code: 'FORBIDDEN_CLIENT_AUTHORITY_FIELD',
      message:
        'Client-supplied role, signingSecret, documents, collections, or embeds are forbidden on the public demo boundary.',
    };
  }

  // 4. Validate requested preset against ['visitor', 'member', 'admin']
  if (
    input.demoPreset !== 'visitor' &&
    input.demoPreset !== 'member' &&
    input.demoPreset !== 'admin'
  ) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_DEMO_PRESET',
      message: "Invalid demoPreset. Expected one of: 'visitor', 'member', 'admin'.",
    };
  }
  const preset: PublicHomepageDemoPreset = input.demoPreset;

  // 5. Validate workspaceId at boundary
  const normalizedCallerWsId = normalizeDemoWorkspaceIdAtBoundary(
    typeof input.workspaceId === 'string' ? input.workspaceId : undefined
  );
  if (normalizedCallerWsId !== CANONICAL_DEMO_WORKSPACE_ID) {
    return {
      ok: false,
      status: 403,
      code: 'INVALID_DEMO_WORKSPACE',
      message: `Public homepage demo is restricted to workspace '${CANONICAL_DEMO_WORKSPACE_ID}'.`,
    };
  }

  // 6. Validate currentUrl against PUBLIC_DEMO_CONTEXT_ROUTES ('/', '/docs/embedding', '/docs/access-control')
  const rawUrl = input.currentUrl === undefined ? '/' : input.currentUrl;
  if (!isValidPublicDemoContextRoute(rawUrl)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_DEMO_CONTEXT_ROUTE',
      message: `Invalid demo context route. Allowed routes: ${PUBLIC_DEMO_CONTEXT_ROUTES.join(', ')}.`,
    };
  }
  const currentUrl: PublicDemoContextRoute = rawUrl;

  // 7. Cross-validate registries
  const registryCheck = validatePublicDemoRegistries(input.policyOverride);
  if (!registryCheck.valid) {
    return {
      ok: false,
      status: 400,
      code: 'DEMO_REGISTRY_VALIDATION_FAILED',
      message: `Public demo registry validation failed: ${registryCheck.errors.join('; ')}`,
    };
  }

  // 8. Load canonical server repository state and normalize workspace alias at boundary
  const snapshot = input.repositorySnapshot
    ? normalizeRepositorySnapshotAtBoundary(input.repositorySnapshot)
    : await loadCanonicalServerDemoRepositorySnapshot();

  if (trace) {
    trace.readFromServerRepositories = true;
    trace.workspaceIdNormalized = snapshot.workspace.id;
    trace.steps.push('2:read_server_repositories');
  }

  if (snapshot.workspace.id !== CANONICAL_DEMO_WORKSPACE_ID) {
    return {
      ok: false,
      status: 403,
      code: 'INVALID_DEMO_WORKSPACE',
      message: 'Canonical server workspace mismatch.',
    };
  }

  const homeEmbed = snapshot.embeds.find(
    (e) =>
      e.id === CANONICAL_DEMO_EMBED_ID &&
      e.workspaceId === CANONICAL_DEMO_WORKSPACE_ID &&
      e.status === 'active'
  );
  if (!homeEmbed) {
    return {
      ok: false,
      status: 403,
      code: 'FORBIDDEN_DEMO_SCOPE',
      message: 'Canonical EMB-PUBLIC-HOME embed is not active.',
    };
  }

  const ownershipMap =
    input.policyOverride?.ownershipMap ?? PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP;
  const sourcePolicy = input.policyOverride?.sourcePolicy ?? PUBLIC_DEMO_SOURCE_POLICY;
  const presetVisPolicy =
    input.policyOverride?.presetVisibilityPolicy ?? PRESET_VISIBILITY_POLICY;
  const collectionVisMap =
    input.policyOverride?.collectionVisibilityMap ?? COLLECTION_CANONICAL_VISIBILITY_MAP;

  const allowedVisibilities = presetVisPolicy[preset];
  const effectiveRole = PRESET_EFFECTIVE_ROLE_MAP[preset];

  const workspaceCollections = snapshot.collections.filter(
    (c) => c.workspaceId === CANONICAL_DEMO_WORKSPACE_ID
  );
  const collectionById = new Map<string, Collection>(
    workspaceCollections.map((c) => [c.id, c])
  );

  // Embed-bound collections B (preserved in CANONICAL_DEMO_COLLECTION_ORDER)
  const rawBoundSet = new Set<string>(getEmbedCollectionIds(homeEmbed));
  const embedBoundCollectionIds = CANONICAL_DEMO_COLLECTION_ORDER.filter(
    (id): id is CanonicalDemoCollectionId =>
      rawBoundSet.has(id) && id in collectionVisMap && collectionById.has(id)
  );

  // Role-authorized collections R (must match both collection.visibility and canonical visibility map)
  const roleAuthorizedCollectionIds = embedBoundCollectionIds.filter((colId) => {
    const col = collectionById.get(colId);
    const canonicalVis = collectionVisMap[colId];
    if (!col || !canonicalVis) return false;
    if (col.visibility !== canonicalVis) return false;
    return allowedVisibilities.includes(col.visibility);
  });

  // Effective scope E = B ∩ R
  const effectiveScopeSet = new Set<CanonicalDemoCollectionId>(roleAuthorizedCollectionIds);
  const effectiveScopeCollectionIds = embedBoundCollectionIds.filter((id) =>
    effectiveScopeSet.has(id)
  );

  // 6-point pre-retrieval document eligibility filter D
  const narrowedDocuments = snapshot.documents.filter((doc) => {
    // (1) Strict canonical workspace equality
    if (doc.workspaceId !== CANONICAL_DEMO_WORKSPACE_ID) return false;
    // (2) Ready & non-deleted
    if (doc.deletedAt || doc.status !== 'ready') return false;
    // (3) Collection in E = B ∩ R
    if (!effectiveScopeSet.has(doc.collectionId as CanonicalDemoCollectionId)) return false;
    // (4) Ownership map entry exists and matches doc.collectionId
    const ownership = ownershipMap[doc.id];
    if (!ownership || ownership.collectionId !== doc.collectionId) return false;
    // (5) Collection visibility matches ownership visibility and canonical collection visibility
    const col = collectionById.get(doc.collectionId);
    const canonicalColVis = collectionVisMap[doc.collectionId as CanonicalDemoCollectionId];
    if (!col || col.visibility !== ownership.visibility || col.visibility !== canonicalColVis) {
      return false;
    }
    // (6) Source policy exists and permits preset
    const policy = sourcePolicy[doc.id];
    if (!policy || !policy.permittedPresets.includes(preset)) return false;
    return true;
  });

  const narrowedDocumentIds = narrowedDocuments.map((d) => d.id).sort();
  const narrowedDocumentFingerprint = narrowedDocuments
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => `${d.id}@${d.collectionId}@${d.updatedAt}`)
    .join('|');

  const demoPolicyVersion = computeDemoPolicyVersion(input.policyOverride);

  if (trace) {
    trace.narrowedDocumentIds = narrowedDocumentIds;
    trace.steps.push('3:construct_narrowed_documents_D');
  }

  const canonicalCollectionOrder: CanonicalDemoCollectionId[] = [
    'COL-PUBLIC',
    'COL-DOCS',
    'COL-LEGAL',
    'COL-CUSTOMER',
    'COL-INTERNAL',
  ];

  const collectionStatuses: PublicDemoCollectionStatusRow[] = canonicalCollectionOrder
    .map((colId) => {
      const col = collectionById.get(colId);
      if (!col) return null;
      const authorized = effectiveScopeSet.has(colId);
      const readyDocumentCount = narrowedDocuments.filter(
        (d) => d.collectionId === colId
      ).length;
      return {
        collectionId: colId,
        name: col.name,
        visibility: col.visibility,
        authorized,
        readyDocumentCount,
      };
    })
    .filter((row): row is PublicDemoCollectionStatusRow => row !== null);

  const computedAuthVer = computeEmbedAuthorizationVersion(
    homeEmbed,
    workspaceCollections
  );

  const authority: PublicDemoAuthority = Object.freeze({
    [PUBLIC_DEMO_AUTHORITY_BRAND]: true as const,
    kind: 'public_homepage_demo' as const,
    workspaceId: CANONICAL_DEMO_WORKSPACE_ID,
    embedId: CANONICAL_DEMO_EMBED_ID,
    preset,
    effectiveRole,
    currentUrl,
    embedBoundCollectionIds,
    roleAuthorizedCollectionIds,
    effectiveScopeCollectionIds,
    narrowedDocuments,
    narrowedDocumentIds,
    narrowedDocumentFingerprint,
    demoPolicyVersion,
    authorizationVersion: computedAuthVer,
    knowledgeVersion: snapshot.workspace.knowledgeVersion ?? 1,
    collectionStatuses,
  });

  return { ok: true, authority };
}

export function buildPublicHomepageDemoCacheKey(params: {
  authority: PublicDemoAuthority;
  question: string;
  language: 'en' | 'es';
}): string {
  if (!isValidPublicDemoAuthority(params.authority)) {
    throw new Error('Cannot build demo cache key without a valid branded PublicDemoAuthority.');
  }
  const normalizedQuestion = params.question.trim().toLowerCase();
  const scopeKey = [...params.authority.effectiveScopeCollectionIds].sort().join(',');
  return [
    params.authority.workspaceId,
    params.authority.embedId,
    `preset:${params.authority.preset}`,
    `role:${params.authority.effectiveRole}`,
    `scope:${scopeKey}`,
    `policy:${params.authority.demoPolicyVersion}`,
    `docs:${params.authority.narrowedDocumentFingerprint}`,
    `authVer:${params.authority.authorizationVersion}`,
    `knowVer:${params.authority.knowledgeVersion}`,
    `url:${params.authority.currentUrl}`,
    `lang:${params.language}`,
    `q:${normalizedQuestion}`,
  ].join('::');
}

export interface ValidatedPublicDemoCitation {
  docId: string;
  title: string;
  filename: string;
  collectionId: CanonicalDemoCollectionId;
  snippet: string;
  similarity: number;
  url: CanonicalPublicRoute;
  citationRenderMode: 'direct_public_doc' | 'public_companion_guide';
}

export interface CompiledPublicDemoAnswer {
  serverOutcome: 'grounded' | 'refused' | 'failed';
  answerType: CompiledAnswerPlan['answerType'];
  retrievalMode: CompiledAnswerPlan['retrievalMode'];
  summary: string;
  steps: string[];
  bullets: string[];
  warnings: string[];
  codeBlocks: CompiledAnswerPlan['codeBlocks'];
  compiledMarkdown: string;
  sources: ValidatedPublicDemoCitation[];
  retrievedChunks: CompiledRetrievedChunk[];
  nextStep: { label: string; url: CanonicalPublicRoute } | null;
}

const FORBIDDEN_UNSUPPORTED_CLAIM_PATTERNS = [
  /automatically crawls your website/i,
  /native Notion sync/i,
  /native Confluence connector/i,
  /HNSW vector database/i,
  /pgvector index/i,
];

/**
 * Runs retrieval and compilation strictly over the branded authority's narrowedDocuments D,
 * validates citations and chunk provenance against PUBLIC_DEMO_SOURCE_POLICY, and computes
 * the server-authoritative serverOutcome ('grounded' | 'refused' | 'failed') (P0-03 & P1-05).
 */
export function compileAndVerifyPublicDemoAnswer(params: {
  authority: PublicDemoAuthority;
  question: string;
  language: 'en' | 'es';
  stageId?: HomepageTourStageId;
  policyOverride?: PublicDemoPolicyOverride;
  executionTrace?: PublicHomepageDemoExecutionTrace;
  compilerOverride?: (docs: KnowledgeDocument[]) => CompiledAnswerPlan;
}): CompiledPublicDemoAnswer {
  if (!isValidPublicDemoAuthority(params.authority)) {
    throw new Error('compileAndVerifyPublicDemoAnswer requires a branded PublicDemoAuthority.');
  }

  const { authority, question, language, stageId, policyOverride, executionTrace } = params;
  const ownershipMap =
    policyOverride?.ownershipMap ?? PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP;
  const sourcePolicy = policyOverride?.sourcePolicy ?? PUBLIC_DEMO_SOURCE_POLICY;

  if (executionTrace) {
    executionTrace.retrievalInputDocumentIds = authority.narrowedDocuments
      .map((d) => d.id)
      .sort();
    executionTrace.steps.push('4:retrieve_and_compile_from_D');
  }

  const ranked = retrieveAndRankAuthorizedDocs(
    question,
    authority.narrowedDocuments,
    authority.currentUrl,
    language
  );

  const plan: CompiledAnswerPlan = params.compilerOverride
    ? params.compilerOverride(authority.narrowedDocuments)
    : compileKnowledgeResponse({
        question,
        authorizedDocs: authority.narrowedDocuments,
        currentUrl: authority.currentUrl,
        answerMode: 'deterministic',
        uiLanguage: language,
        effectiveRole: authority.effectiveRole,
      });

  // Case 1: Honest missing-topic refusal
  const topCandidate = ranked[0];
  if (
    plan.answerType === 'unknown' ||
    !topCandidate ||
    topCandidate.score < 1.35 ||
    topCandidate.normalizedConfidence < 0.25
  ) {
    if (executionTrace) {
      executionTrace.serverOutcome = 'refused';
      executionTrace.steps.push('6:validate_citations_and_outcome:refused');
    }
    return {
      serverOutcome: 'refused',
      answerType: 'unknown',
      retrievalMode: 'none',
      summary: plan.summary,
      steps: [],
      bullets: [],
      warnings: [],
      codeBlocks: [],
      compiledMarkdown: plan.compiledMarkdown,
      sources: [],
      retrievedChunks: [],
      nextStep: null,
    };
  }

  // Validate every emitted source and chunk against D, ownershipMap, sourcePolicy, and route registry
  const narrowedDocMap = new Map<string, KnowledgeDocument>(
    authority.narrowedDocuments.map((d) => [d.id, d])
  );

  let provenanceBroken = false;
  const validatedSources: ValidatedPublicDemoCitation[] = [];

  for (const src of plan.sources) {
    const docInD = narrowedDocMap.get(src.docId);
    const ownership = ownershipMap[src.docId];
    const policy = sourcePolicy[src.docId];

    if (
      !docInD ||
      !ownership ||
      !policy ||
      docInD.collectionId !== ownership.collectionId ||
      docInD.collectionId !== policy.collectionId ||
      !policy.permittedPresets.includes(authority.preset) ||
      !isValidPublicCitationDestinationRoute(policy.canonicalDestinationRoute)
    ) {
      provenanceBroken = true;
      continue;
    }

    validatedSources.push({
      docId: src.docId,
      title: policy.publicSafeTitle,
      filename: policy.publicSafeFilename,
      collectionId: policy.collectionId,
      snippet: src.snippet,
      similarity: src.similarity,
      url: policy.canonicalDestinationRoute,
      citationRenderMode: policy.citationRenderMode,
    });
  }

  // Validate retrievedChunks provenance against D
  const validatedChunks = plan.retrievedChunks.filter((chunk) => {
    const docInD = narrowedDocMap.get(chunk.documentId);
    const policy = sourcePolicy[chunk.documentId];
    if (!docInD || !policy || docInD.collectionId !== chunk.collectionId) {
      provenanceBroken = true;
      return false;
    }
    return true;
  });

  // Check unsupported capability claims
  const combinedText = `${plan.summary} ${plan.steps.join(' ')} ${plan.bullets.join(' ')} ${plan.compiledMarkdown}`;
  const hasForbiddenClaim = FORBIDDEN_UNSUPPORTED_CLAIM_PATTERNS.some((pat) =>
    pat.test(combinedText)
  );

  // If canonical stageId is supplied, verify at least one source matches stage's acceptableSourceSet
  let stageSourceValid = true;
  if (stageId) {
    const stageContract = APPROVED_HOMEPAGE_TOUR_CONTRACT.find(
      (s) => s.stageId === stageId
    );
    if (stageContract) {
      const acceptableFilenames = new Set([
        ...stageContract.acceptableSourceSet.primaryFilenames,
        ...stageContract.acceptableSourceSet.acceptableSecondaryFilenames,
      ]);
      const matchedStageSource = validatedSources.some((src) => {
        const rawDoc = narrowedDocMap.get(src.docId);
        return rawDoc ? acceptableFilenames.has(rawDoc.filename) : false;
      });
      if (!matchedStageSource) {
        stageSourceValid = false;
      }
    }
  }

  if (
    provenanceBroken ||
    validatedSources.length === 0 ||
    validatedChunks.length === 0 ||
    hasForbiddenClaim ||
    !stageSourceValid
  ) {
    if (executionTrace) {
      executionTrace.serverOutcome = 'failed';
      executionTrace.steps.push('6:validate_citations_and_outcome:failed');
    }
    return {
      serverOutcome: 'failed',
      answerType: plan.answerType,
      retrievalMode: plan.retrievalMode,
      summary:
        language === 'es'
          ? 'No se pudo verificar una respuesta fundamentada con fuentes autorizadas para esta consulta.'
          : 'Unable to verify a grounded answer with authorized source citations for this query.',
      steps: [],
      bullets: [],
      warnings: [],
      codeBlocks: [],
      compiledMarkdown: '',
      sources: [],
      retrievedChunks: [],
      nextStep: null,
    };
  }

  let validatedNextStep: { label: string; url: CanonicalPublicRoute } | null = null;
  if (plan.cta && isValidPublicCitationDestinationRoute(plan.cta.url)) {
    validatedNextStep = {
      label: plan.cta.label,
      url: plan.cta.url,
    };
  }

  if (executionTrace) {
    executionTrace.serverOutcome = 'grounded';
    executionTrace.steps.push('6:validate_citations_and_outcome:grounded');
  }

  return {
    serverOutcome: 'grounded',
    answerType: plan.answerType,
    retrievalMode: plan.retrievalMode,
    summary: plan.summary,
    steps: plan.steps,
    bullets: plan.bullets,
    warnings: plan.warnings,
    codeBlocks: plan.codeBlocks,
    compiledMarkdown: plan.compiledMarkdown,
    sources: validatedSources,
    retrievedChunks: validatedChunks,
    nextStep: validatedNextStep,
  };
}

// ============================================================================
// Policy-Versioned Demo Cache (P0-02 & P1-05 Step 5)
// ============================================================================

const publicHomepageDemoCache = new Map<string, CompiledPublicDemoAnswer>();

export function clearPublicHomepageDemoCache(): void {
  publicHomepageDemoCache.clear();
}

export function getPublicHomepageDemoCacheSize(): number {
  return publicHomepageDemoCache.size;
}

export function getOrComputePublicDemoAnswerWithCache(params: {
  authority: PublicDemoAuthority;
  question: string;
  language: 'en' | 'es';
  stageId?: HomepageTourStageId;
  policyOverride?: PublicDemoPolicyOverride;
  executionTrace?: PublicHomepageDemoExecutionTrace;
  compilerOverride?: (docs: KnowledgeDocument[]) => CompiledAnswerPlan;
}): {
  answer: CompiledPublicDemoAnswer;
  cacheKey: string;
  cacheDecision: 'HIT' | 'MISS';
} {
  const cacheKey = buildPublicHomepageDemoCacheKey({
    authority: params.authority,
    question: params.question,
    language: params.language,
  });

  if (params.executionTrace) {
    params.executionTrace.cacheKeyUsed = cacheKey;
  }

  const cached = publicHomepageDemoCache.get(cacheKey);
  if (cached) {
    if (params.executionTrace) {
      params.executionTrace.cacheDecision = 'HIT';
      params.executionTrace.serverOutcome = cached.serverOutcome;
      params.executionTrace.steps.push('5:cache_lookup:HIT');
    }
    return {
      answer: cached,
      cacheKey,
      cacheDecision: 'HIT',
    };
  }

  if (params.executionTrace) {
    params.executionTrace.cacheDecision = 'MISS';
    params.executionTrace.steps.push('5:cache_lookup:MISS');
  }

  const computed = compileAndVerifyPublicDemoAnswer(params);

  // Only cache grounded or refused outcomes; never cache failed outcomes
  if (computed.serverOutcome === 'grounded' || computed.serverOutcome === 'refused') {
    publicHomepageDemoCache.set(cacheKey, computed);
  }

  return {
    answer: computed,
    cacheKey,
    cacheDecision: 'MISS',
  };
}

// ============================================================================
// Express Route Handlers for POST /api/demo/homepage-context & /api/chat/stream
// ============================================================================

export async function handlePublicHomepageDemoContext(
  req: Request,
  res: Response
): Promise<void> {
  const authHeader = req.headers.authorization;
  const authResult = await authorizePublicHomepageDemoRequest({
    embedId: req.body?.embedId ?? CANONICAL_DEMO_EMBED_ID,
    demoPreset: req.body?.demoPreset ?? req.body?.preset,
    currentUrl: req.body?.currentUrl ?? '/',
    workspaceId: req.body?.workspaceId,
    identityToken: req.body?.token ?? req.body?.identityToken,
    authorizationHeader: authHeader,
    role: req.body?.role,
    userRole: req.body?.userRole,
    signingSecret: req.body?.signingSecret,
    documents: req.body?.documents,
    collections: req.body?.collections,
    embeds: req.body?.embeds,
  });

  if (!authResult.ok) {
    res.status(authResult.status).json({
      error: authResult.code,
      message: authResult.message,
    });
    return;
  }

  const { authority } = authResult;
  res.json({
    ok: true,
    workspaceId: authority.workspaceId,
    embedId: authority.embedId,
    preset: authority.preset,
    effectiveRole: authority.effectiveRole,
    currentUrl: authority.currentUrl,
    embedBoundCollectionIds: authority.embedBoundCollectionIds,
    roleAuthorizedCollectionIds: authority.roleAuthorizedCollectionIds,
    effectiveScopeCollectionIds: authority.effectiveScopeCollectionIds,
    narrowedDocumentIds: authority.narrowedDocumentIds,
    demoPolicyVersion: authority.demoPolicyVersion,
    authorizationVersion: authority.authorizationVersion,
    knowledgeVersion: authority.knowledgeVersion,
    collectionStatuses: authority.collectionStatuses,
  });
}

export async function handlePublicHomepageDemoChatStream(
  req: Request,
  res: Response
): Promise<void> {
  const startTime = Date.now();
  const authHeader = req.headers.authorization;

  // Validate demo authorization boundary first (before retrieval or SSE headers)
  const authResult = await authorizePublicHomepageDemoRequest({
    embedId: req.body?.embedId,
    demoPreset: req.body?.demoPreset,
    currentUrl: req.body?.currentUrl ?? '/',
    workspaceId: req.body?.workspaceId,
    identityToken: req.body?.token ?? req.body?.identityToken,
    authorizationHeader: authHeader,
    role: req.body?.role,
    userRole: req.body?.userRole,
    signingSecret: req.body?.signingSecret,
    documents: req.body?.documents,
    collections: req.body?.collections,
    embeds: req.body?.embeds,
  });

  if (!authResult.ok) {
    res.status(authResult.status).json({
      error: authResult.code,
      message: authResult.message,
    });
    return;
  }

  const qCheck = validateChatQuestion(req.body?.question);
  if (!qCheck.valid) {
    res.status(400).json({
      error: 'INVALID_QUESTION',
      message: qCheck.error || 'Question is required',
    });
    return;
  }
  const question = qCheck.sanitized || String(req.body.question);
  const language: 'en' | 'es' =
    req.body?.uiLanguage === 'es' || req.body?.language === 'es' ? 'es' : 'en';
  const stageId: HomepageTourStageId | undefined = req.body?.stageId;
  const { authority } = authResult;

  const { answer, cacheKey, cacheDecision } = getOrComputePublicDemoAnswerWithCache({
    authority,
    question,
    language,
    stageId,
  });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(
    `data: ${JSON.stringify({
      type: 'metadata',
      mode: 'public_homepage_demo',
      preset: authority.preset,
      role: authority.effectiveRole,
      currentUrl: authority.currentUrl,
      serverOutcome: answer.serverOutcome,
      cacheTelemetry: {
        decision: cacheDecision,
        cacheKey,
        demoPolicyVersion: authority.demoPolicyVersion,
      },
      answerPlan: {
        answerMode: 'deterministic',
        answerType: answer.answerType,
        retrievalMode: answer.retrievalMode,
        stepsCount: answer.steps.length,
      },
      effectiveCollectionIds: authority.effectiveScopeCollectionIds,
      collectionStatuses: authority.collectionStatuses,
      authorizationVersion: authority.authorizationVersion,
      knowledgeVersion: authority.knowledgeVersion,
      retrievedChunks: answer.retrievedChunks,
      sources: answer.sources,
      cta: answer.nextStep,
    })}\n\n`
  );

  const textToStream = answer.compiledMarkdown || answer.summary;
  res.write(`data: ${JSON.stringify({ type: 'chunk', text: textToStream })}\n\n`);
  res.write(
    `data: ${JSON.stringify({
      type: 'done',
      serverOutcome: answer.serverOutcome,
      latencyMs: Date.now() - startTime,
      tokens: Math.max(8, Math.round(textToStream.length / 4)),
    })}\n\n`
  );
  res.end();
}
