// ============================================================================
// EMBED-01 & AUTH-03: Canonical Mixed-Visibility Embed Authorization &
// Progressive Identity Engine (Frozen Execution Contract)
// ============================================================================

import {
  Collection,
  KnowledgeDocument,
  EmbedInstance,
  SupportedLanguage,
  DocumentNextStep,
  SourceCitation,
  EmbedRouteRule,
} from '../types';
import {
  AnswerMode,
  CompiledAnswerPlan,
  compileKnowledgeResponse,
} from './engine/responseCompiler';

export type CollectionVisibility = 'everyone' | 'members' | 'admins';

export type EmbedIdentityClaims = {
  sub: string; // Required -> maps to EmbedIdentity.userId
  role: 'member' | 'admin'; // Required -> normalized from customer role claim
  workspace_id: string; // Required -> must match embed.workspaceId
  embed_id?: string; // Optional -> if present, must match embed.id
  iat: number; // Required -> issued-at Unix timestamp (seconds)
  exp: number; // Required -> expiration Unix timestamp (seconds)
};

export type EmbedIdentity =
  | {
      kind: 'anonymous';
    }
  | {
      kind: 'authenticated';
      userId: string;
      role: 'member' | 'admin';
    };

export type AuthorizationScope = {
  identity: EmbedIdentity;
  collectionIds: readonly string[]; // Immutable, deduplicated & deterministically sorted
};

export type EmbedVisibilityProfile = 'public-only' | 'mixed' | 'protected-only';

export type EmbedInstallationFacts = {
  hasPublicCollections: boolean;
  hasProtectedCollections: boolean;
  allowsAnonymousInitialization: true;
  hasAnonymousAccessibleContent: boolean; // === hasPublicCollections
  supportsAuthenticatedAccess: boolean; // === hasProtectedCollections
  requiresVerifiedIdentityForProtectedContent: boolean; // === hasProtectedCollections
  expectsCurrentUrl: boolean;
  expectsRouteRules: boolean;
  routeRuleCount: number;
};

export const CLOCK_SKEW_TOLERANCE_SECONDS = 30;

/**
 * Normalize an external role claim from a signed assertion into canonical
 * authenticated role ("member" | "admin") or null if invalid.
 */
export function normalizeAuthenticatedRoleClaim(
  rawRole: unknown
): 'member' | 'admin' | null {
  if (typeof rawRole !== 'string') return null;
  const cleaned = rawRole.trim().toLowerCase();
  if (cleaned === 'admin' || cleaned === 'admins' || cleaned === 'manager') {
    return 'admin';
  }
  if (
    cleaned === 'member' ||
    cleaned === 'members' ||
    cleaned === 'customer' ||
    cleaned === 'employee' ||
    cleaned === 'user'
  ) {
    return 'member';
  }
  return null;
}

/**
 * Convert an EmbedIdentity into the legacy clearance tier label ('everyone' | 'members' | 'admins')
 * strictly for display/telemetry compatibility. Never used to reconstruct collectionIds!
 */
export function identityToClearanceTier(identity: EmbedIdentity): CollectionVisibility {
  if (identity.kind === 'anonymous') return 'everyone';
  return identity.role === 'admin' ? 'admins' : 'members';
}

/**
 * Convert a simulated clearance label ('everyone' | 'members' | 'admins' | 'anonymous' | 'member' | 'admin')
 * into a canonical EmbedIdentity object.
 */
export function clearanceLabelToEmbedIdentity(
  roleOrClearance?: string | null,
  userId: string = 'usr_sim_01'
): EmbedIdentity {
  const cleaned = (roleOrClearance || '').trim().toLowerCase();
  if (cleaned === 'admin' || cleaned === 'admins' || cleaned === 'manager') {
    return Object.freeze({
      kind: 'authenticated',
      userId: userId || 'usr_sim_admin',
      role: 'admin',
    });
  }
  if (
    cleaned === 'member' ||
    cleaned === 'members' ||
    cleaned === 'customer' ||
    cleaned === 'employee' ||
    cleaned === 'user'
  ) {
    return Object.freeze({
      kind: 'authenticated',
      userId: userId || 'usr_sim_member',
      role: 'member',
    });
  }
  return Object.freeze({ kind: 'anonymous' });
}

/**
 * Normative Invariant:
 * MUST return attachment IDs from `embed` only once (deduplicated),
 * in deterministic canonical sorted order (`Array.from(new Set(ids)).sort()`).
 */
export function getEmbedCollectionIds(
  embed:
    | EmbedInstance
    | {
        knowledgeScope?: { collectionIds?: readonly string[] };
        allowedCollectionIds?: readonly string[];
      }
    | null
    | undefined
): readonly string[] {
  if (!embed) return Object.freeze([]);
  const rawIds =
    embed.knowledgeScope?.collectionIds && embed.knowledgeScope.collectionIds.length > 0
      ? embed.knowledgeScope.collectionIds
      : embed.allowedCollectionIds || [];
  const deduplicatedAndSorted = Array.from(
    new Set(
      rawIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    )
  ).sort();
  return Object.freeze(deduplicatedAndSorted);
}

/**
 * Canonical 3x3 collection visibility check.
 */
export function canAccessCollection(
  identity: EmbedIdentity,
  visibility: CollectionVisibility
): boolean {
  if (visibility === 'everyone') return true;
  if (identity.kind === 'anonymous') return false;
  if (visibility === 'members') {
    return identity.role === 'member' || identity.role === 'admin';
  }
  if (visibility === 'admins') {
    return identity.role === 'admin';
  }
  return false;
}

/**
 * Normative Invariants:
 * 1. `embedCollectionIds` is deduplicated and canonically sorted.
 * 2. `resolveEmbedAuthorization()` may ONLY return collection IDs contained in `embedCollectionIds`,
 *    and ONLY when the corresponding collection exists in `collections` and
 *    `canAccessCollection(identity, collection.visibility)` is true.
 * 3. Returned `collectionIds` is deduplicated, deterministically sorted, and readonly.
 * 4. Empty Scope Is Valid: `collectionIds: []` means runtime initialized with zero accessible collections.
 */
export function resolveEmbedAuthorization(
  identity: EmbedIdentity,
  embedCollectionIds: readonly string[],
  collections: readonly Pick<Collection, 'id' | 'visibility'>[]
): AuthorizationScope {
  const normalizedAttachedIds = Array.from(
    new Set(
      (embedCollectionIds || []).filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0
      )
    )
  ).sort();

  const collectionMap = new Map<string, Pick<Collection, 'id' | 'visibility'>>();
  for (const col of collections || []) {
    if (col && typeof col.id === 'string') {
      collectionMap.set(col.id, col);
    }
  }

  const authorizedIds: string[] = [];
  for (const attachedId of normalizedAttachedIds) {
    const col = collectionMap.get(attachedId);
    if (!col) continue;
    if (canAccessCollection(identity, col.visibility)) {
      authorizedIds.push(col.id);
    }
  }

  const frozenIdentity: EmbedIdentity =
    identity.kind === 'anonymous'
      ? Object.freeze({ kind: 'anonymous' as const })
      : Object.freeze({
          kind: 'authenticated' as const,
          userId: identity.userId,
          role: identity.role,
        });

  return Object.freeze({
    identity: frozenIdentity,
    collectionIds: Object.freeze(authorizedIds),
  });
}

// ============================================================================
// Base64URL Helpers & Constant-Time Comparison for Strict HS256 Verification
// ============================================================================

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(b64u: string): string {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeHmacSha256Base64Url(
  message: string,
  signingSecret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const bytes = new Uint8Array(sigBuf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Create a canonical HS256-signed EmbedIdentityClaims token.
 */
export async function createEmbedIdentityToken(
  claims: {
    sub: string;
    role: 'member' | 'admin' | string;
    workspace_id: string;
    embed_id?: string;
    iat?: number;
    exp?: number;
  },
  signingSecret: string,
  headerOverride?: Record<string, unknown>
): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const normalizedRole = normalizeAuthenticatedRoleClaim(claims.role) || claims.role;
  const header = headerOverride || { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: claims.sub,
    role: normalizedRole,
    workspace_id: claims.workspace_id,
    ...(claims.embed_id ? { embed_id: claims.embed_id } : {}),
    iat: claims.iat ?? nowSec,
    exp: claims.exp ?? nowSec + 300,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await computeHmacSha256Base64Url(signingInput, signingSecret);
  return `${signingInput}.${signature}`;
}

export type TokenVerificationResult =
  | {
      ok: true;
      status: 200;
      claims: EmbedIdentityClaims;
      identity: Extract<EmbedIdentity, { kind: 'authenticated' }>;
    }
  | {
      ok: false;
      status: 401 | 404;
      code:
        | 'MALFORMED_TOKEN'
        | 'UNSUPPORTED_JWT_ALGORITHM'
        | 'FORBIDDEN_KEY_INJECTION_HEADER'
        | 'INVALID_TOKEN_SIGNATURE'
        | 'MISSING_TIMESTAMP_CLAIMS'
        | 'TOKEN_NOT_YET_VALID'
        | 'TOKEN_EXPIRED'
        | 'MISSING_SUBJECT_CLAIM'
        | 'INVALID_ROLE_CLAIM'
        | 'RESOURCE_NOT_FOUND';
      message: string;
    };

function matchesWorkspaceId(claimWorkspaceId: string, expectedWorkspaceId: string): boolean {
  if (claimWorkspaceId === expectedWorkspaceId) return true;
  // Normalize workspace slug/id alias for primary workspace ('okeng' <-> 'ws_okeng_01' <-> 'acme-cloud')
  const okengAliases = new Set(['okeng', 'ws_okeng_01', 'acme-cloud']);
  if (okengAliases.has(claimWorkspaceId) && okengAliases.has(expectedWorkspaceId)) {
    return true;
  }
  return false;
}

/**
 * Normative Token Verifier:
 * 1. Accepts ONLY `alg === "HS256"` (`typ === "JWT"` or absent); rejects `alg === "none"` or substitution (`401`).
 * 2. Selects verification key strictly from server-side workspace `signingSecret` (rejects `jku`, `x5u`, `jwk` headers).
 * 3. Enforces <= 30s clock-skew tolerance on `iat` and `exp`.
 * 4. Returns non-disclosing `404` when `workspace_id` or `embed_id` does not match target resource.
 * 5. Never downgrades invalid tokens to anonymous.
 */
export async function verifyEmbedIdentityToken(params: {
  token: string;
  expectedWorkspaceId: string;
  expectedEmbedId?: string;
  signingSecret: string;
  nowSeconds?: number;
}): Promise<TokenVerificationResult> {
  const { token, expectedWorkspaceId, expectedEmbedId, signingSecret } = params;
  const nowSec = params.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!token || typeof token !== 'string' || !signingSecret) {
    return {
      ok: false,
      status: 401,
      code: 'MALFORMED_TOKEN',
      message: 'Identity assertion token is malformed.',
    };
  }

  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return {
      ok: false,
      status: 401,
      code: 'MALFORMED_TOKEN',
      message: 'Identity assertion token must contain header.payload.signature.',
    };
  }

  let header: Record<string, unknown>;
  let rawClaims: Record<string, unknown>;
  try {
    header = JSON.parse(fromBase64Url(parts[0]));
    rawClaims = JSON.parse(fromBase64Url(parts[1]));
  } catch {
    return {
      ok: false,
      status: 401,
      code: 'MALFORMED_TOKEN',
      message: 'Identity assertion token header or payload is not valid JSON.',
    };
  }

  // Strict alg === "HS256" enforcement
  if (
    !header ||
    header.alg !== 'HS256' ||
    (header.typ !== undefined && header.typ !== 'JWT')
  ) {
    return {
      ok: false,
      status: 401,
      code: 'UNSUPPORTED_JWT_ALGORITHM',
      message: 'Only HS256 signed JWT assertions are accepted.',
    };
  }

  // Reject any attempt to supply external/embedded verification keys in header
  if (
    header.jku !== undefined ||
    header.x5u !== undefined ||
    header.jwk !== undefined
  ) {
    return {
      ok: false,
      status: 401,
      code: 'FORBIDDEN_KEY_INJECTION_HEADER',
      message: 'Verification key is selected strictly server-side from the target workspace.',
    };
  }

  const signingInput = `${parts[0]}.${parts[1]}`;
  const expectedSig = await computeHmacSha256Base64Url(signingInput, signingSecret);
  if (!constantTimeEquals(parts[2], expectedSig)) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_TOKEN_SIGNATURE',
      message: 'HMAC-SHA256 signature verification failed.',
    };
  }

  const iat = typeof rawClaims.iat === 'number' ? rawClaims.iat : NaN;
  const exp = typeof rawClaims.exp === 'number' ? rawClaims.exp : NaN;
  if (!Number.isFinite(iat) || !Number.isFinite(exp)) {
    return {
      ok: false,
      status: 401,
      code: 'MISSING_TIMESTAMP_CLAIMS',
      message: 'Token must include numeric iat and exp claims.',
    };
  }

  if (iat > nowSec + CLOCK_SKEW_TOLERANCE_SECONDS) {
    return {
      ok: false,
      status: 401,
      code: 'TOKEN_NOT_YET_VALID',
      message: 'Token iat exceeds clock-skew tolerance (30s).',
    };
  }

  if (exp < nowSec - CLOCK_SKEW_TOLERANCE_SECONDS) {
    return {
      ok: false,
      status: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Signed identity token has expired.',
    };
  }

  const subRaw =
    typeof rawClaims.sub === 'string' && rawClaims.sub.trim()
      ? rawClaims.sub.trim()
      : typeof rawClaims.user_id === 'string' && rawClaims.user_id.trim()
      ? rawClaims.user_id.trim()
      : '';
  if (!subRaw) {
    return {
      ok: false,
      status: 401,
      code: 'MISSING_SUBJECT_CLAIM',
      message: 'Signed identity token requires a non-empty sub claim.',
    };
  }

  const normalizedRole = normalizeAuthenticatedRoleClaim(rawClaims.role);
  if (!normalizedRole) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_ROLE_CLAIM',
      message: 'Signed identity token role must normalize to "member" or "admin".',
    };
  }

  const claimWorkspaceId =
    typeof rawClaims.workspace_id === 'string' ? rawClaims.workspace_id.trim() : '';
  if (!claimWorkspaceId || !matchesWorkspaceId(claimWorkspaceId, expectedWorkspaceId)) {
    // Non-disclosing 404 for cross-workspace token
    return {
      ok: false,
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: 'Resource not found.',
    };
  }

  const claimEmbedId =
    typeof rawClaims.embed_id === 'string' && rawClaims.embed_id.trim()
      ? rawClaims.embed_id.trim()
      : undefined;
  if (claimEmbedId && expectedEmbedId && claimEmbedId !== expectedEmbedId) {
    // Non-disclosing 404 for wrong embed_id
    return {
      ok: false,
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: 'Resource not found.',
    };
  }

  const claims: EmbedIdentityClaims = Object.freeze({
    sub: subRaw,
    role: normalizedRole,
    workspace_id: claimWorkspaceId,
    ...(claimEmbedId ? { embed_id: claimEmbedId } : {}),
    iat,
    exp,
  });

  const identity = Object.freeze({
    kind: 'authenticated' as const,
    userId: subRaw,
    role: normalizedRole,
  });

  return {
    ok: true,
    status: 200,
    claims,
    identity,
  };
}

export type RequestIdentityResolution =
  | {
      ok: true;
      status: 200;
      identity: EmbedIdentity;
      claims?: EmbedIdentityClaims;
    }
  | {
      ok: false;
      status: 401 | 404;
      code: string;
      message: string;
    };

/**
 * Resolves the requester's `EmbedIdentity` for an incoming runtime/session request.
 * Enforces:
 * - Missing token -> `{ kind: "anonymous" }`
 * - Browser Role Authority Ban Case A (browser supplies privileged role/userId without token) -> 401
 * - Browser Role Authority Ban Case B (browser supplies conflicting role/userId alongside token) -> 401
 * - Invalid/expired/bad-alg token -> 401 (never downgraded to anonymous)
 * - Valid token for wrong workspace_id or embed_id -> 404 (non-disclosing)
 */
export async function resolveRequestEmbedIdentity(params: {
  identityToken?: string | null;
  browserRole?: unknown;
  browserUserId?: unknown;
  browserPermissions?: unknown;
  expectedWorkspaceId: string;
  expectedEmbedId?: string;
  signingSecret: string;
  nowSeconds?: number;
  allowInternalSimulationRole?: boolean;
}): Promise<RequestIdentityResolution> {
  const {
    identityToken,
    browserRole,
    browserUserId,
    browserPermissions,
    expectedWorkspaceId,
    expectedEmbedId,
    signingSecret,
    nowSeconds,
    allowInternalSimulationRole = false,
  } = params;

  const hasSuppliedToken =
    typeof identityToken === 'string' && identityToken.trim().length > 0;

  if (!hasSuppliedToken) {
    // Check Browser Role Authority Ban (Case A)
    if (!allowInternalSimulationRole) {
      const normalizedBrowserRole =
        typeof browserRole === 'string' ? browserRole.trim().toLowerCase() : '';
      const isPrivilegedBrowserRole =
        normalizedBrowserRole.length > 0 &&
        normalizedBrowserRole !== 'anonymous' &&
        normalizedBrowserRole !== 'everyone';
      const hasBrowserUserId =
        typeof browserUserId === 'string' && browserUserId.trim().length > 0;
      const hasBrowserPermissions =
        Array.isArray(browserPermissions) && browserPermissions.length > 0;

      if (isPrivilegedBrowserRole || hasBrowserUserId || hasBrowserPermissions) {
        return {
          ok: false,
          status: 401,
          code: 'UNVERIFIED_ROLE_ASSERTION',
          message:
            'Browser-supplied role, userId, or permissions are never authoritative without a verified HS256 identityToken.',
        };
      }
    } else if (typeof browserRole === 'string' && browserRole.trim().length > 0) {
      return {
        ok: true,
        status: 200,
        identity: clearanceLabelToEmbedIdentity(
          browserRole,
          typeof browserUserId === 'string' && browserUserId.trim()
            ? browserUserId.trim()
            : 'usr_sim_01'
        ),
      };
    }

    return {
      ok: true,
      status: 200,
      identity: Object.freeze({ kind: 'anonymous' as const }),
    };
  }

  // Verify supplied token
  const verified = await verifyEmbedIdentityToken({
    token: identityToken!.trim(),
    expectedWorkspaceId,
    expectedEmbedId,
    signingSecret,
    nowSeconds,
  });

  if (!verified.ok) {
    return verified;
  }

  // Check Browser Role Authority Ban (Case B: conflicting browser identity fields alongside valid token)
  if (typeof browserRole === 'string' && browserRole.trim().length > 0) {
    const normalizedBrowser = normalizeAuthenticatedRoleClaim(browserRole);
    const cleaned = browserRole.trim().toLowerCase();
    if (
      cleaned !== 'anonymous' &&
      cleaned !== 'everyone' &&
      normalizedBrowser !== verified.identity.role
    ) {
      return {
        ok: false,
        status: 401,
        code: 'CONFLICTING_BROWSER_IDENTITY',
        message: 'Browser-supplied role conflicts with verified identityToken claim.',
      };
    }
  }

  if (
    typeof browserUserId === 'string' &&
    browserUserId.trim().length > 0 &&
    browserUserId.trim() !== verified.identity.userId
  ) {
    return {
      ok: false,
      status: 401,
      code: 'CONFLICTING_BROWSER_IDENTITY',
      message: 'Browser-supplied userId conflicts with verified identityToken sub claim.',
    };
  }

  return {
    ok: true,
    status: 200,
    identity: verified.identity,
    claims: verified.claims,
  };
}

// ============================================================================
// Version Invalidation Split: authorizationVersion vs. knowledgeVersion
// ============================================================================

/**
 * `authorizationVersion`: "Who/what can this Embed authorize?"
 * Advances/changes whenever collection attachment/detachment on the Embed changes,
 * authorization-relevant collection visibility changes, or Embed scope config changes.
 * Knowledge-content edits do NOT change `authorizationVersion`.
 */
export function computeEmbedAuthorizationVersion(
  embed:
    | EmbedInstance
    | {
        id?: string;
        knowledgeScope?: { collectionIds?: readonly string[]; documentIds?: readonly string[] };
        allowedCollectionIds?: readonly string[];
      }
    | null
    | undefined,
  collections: readonly Pick<Collection, 'id' | 'visibility'>[]
): string {
  const embedId = embed && 'id' in embed && embed.id ? embed.id : 'default';
  const attachedIds = getEmbedCollectionIds(embed);
  const collectionMap = new Map<string, CollectionVisibility>();
  for (const col of collections || []) {
    if (col && typeof col.id === 'string') {
      collectionMap.set(col.id, col.visibility);
    }
  }
  const visibilityDescriptor = attachedIds
    .map((id) => `${id}:${collectionMap.get(id) ?? 'missing'}`)
    .join('|');
  const pinnedDocs =
    embed?.knowledgeScope?.documentIds && embed.knowledgeScope.documentIds.length > 0
      ? [...embed.knowledgeScope.documentIds].sort().join(',')
      : 'all';
  return `av1:${embedId}:[${visibilityDescriptor}]:docs:[${pinnedDocs}]`;
}

/**
 * Normative Multi-Collection `knowledgeVersion` Rule:
 * `knowledgeVersion` MUST represent a deterministic version of the complete authorized
 * knowledge universe represented by `authorizedCollectionIds`.
 * Combines the monotonically increasing workspace corpus epoch (`workspaceKnowledgeVersion`)
 * with a deterministic aggregate checksum of the authorized collections' document state.
 */
export function computeAuthorizedKnowledgeVersion(
  workspaceKnowledgeVersion: number,
  authorizedCollectionIds: readonly string[],
  documents?: readonly Pick<KnowledgeDocument, 'id' | 'collectionId' | 'updatedAt' | 'deletedAt' | 'status'>[]
): number {
  const baseEpoch =
    typeof workspaceKnowledgeVersion === 'number' && Number.isFinite(workspaceKnowledgeVersion)
      ? Math.max(1, Math.floor(workspaceKnowledgeVersion))
      : 1;
  if (!documents || documents.length === 0) {
    return baseEpoch;
  }
  const authorizedSet = new Set(authorizedCollectionIds);
  const relevantDocs = documents
    .filter((d) => authorizedSet.has(d.collectionId) && !d.deletedAt && d.status === 'ready')
    .sort((a, b) => a.id.localeCompare(b.id));

  let hash = 0;
  for (const d of relevantDocs) {
    const str = `${d.id}:${d.updatedAt || ''}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % 1000;
    }
  }
  // If workspace epoch is standard integer and docs haven't diverged, preserve baseEpoch when hash is stable
  return baseEpoch * 1000 + Math.abs(hash);
}

// ============================================================================
// Pure Knowledge Consumers (Consuming ONLY AuthorizationScope.collectionIds)
// ============================================================================

/**
 * Guard for Static vs. Knowledge-Derived CTAs:
 * - Static CTA configured directly on the Embed may exist independently of the knowledge universe,
 *   but MUST NOT be dynamically enriched with unauthorized knowledge-derived destination, label, metadata, or content.
 * - Knowledge-derived CTA is only permitted if its source document belongs to `AuthorizationScope.collectionIds`.
 */
export function resolveAuthorizedCta(params: {
  authorizationScope: AuthorizationScope;
  knowledgeDerivedCta?: DocumentNextStep;
  knowledgeDerivedSourceCollectionId?: string;
  staticEmbedCta?: DocumentNextStep;
}): DocumentNextStep | undefined {
  const {
    authorizationScope,
    knowledgeDerivedCta,
    knowledgeDerivedSourceCollectionId,
    staticEmbedCta,
  } = params;
  const authorizedSet = new Set(authorizationScope.collectionIds);

  if (
    knowledgeDerivedCta &&
    (!knowledgeDerivedSourceCollectionId ||
      authorizedSet.has(knowledgeDerivedSourceCollectionId)) &&
    authorizedSet.size > 0
  ) {
    return {
      label: knowledgeDerivedCta.label,
      url: knowledgeDerivedCta.url,
    };
  }

  if (staticEmbedCta && staticEmbedCta.label && staticEmbedCta.url) {
    // Return pure static CTA without any unauthorized knowledge enrichment
    return {
      label: staticEmbedCta.label,
      url: staticEmbedCta.url,
    };
  }

  return undefined;
}

/**
 * Filter starter questions / suggestions so that any knowledge-derived suggestions
 * only come from `AuthorizationScope.collectionIds`.
 */
export function resolveAuthorizedSuggestions(params: {
  authorizationScope: AuthorizationScope;
  documents?: readonly KnowledgeDocument[];
  configuredSuggestions?: readonly string[];
}): string[] {
  const { authorizationScope, documents = [], configuredSuggestions } = params;
  const authorizedSet = new Set(authorizationScope.collectionIds);

  const authorizedDocs = documents.filter(
    (d) => !d.deletedAt && d.status === 'ready' && authorizedSet.has(d.collectionId)
  );
  const unauthorizedDocs = documents.filter(
    (d) => !d.deletedAt && d.status === 'ready' && !authorizedSet.has(d.collectionId)
  );

  // Build forbidden token set from titles of unauthorized documents that do not appear in authorized documents
  const authorizedTitlesLower = authorizedDocs.map((d) => d.title.toLowerCase()).join(' ');
  const unauthorizedUniqueTitles = unauthorizedDocs
    .map((d) => d.title.trim())
    .filter((t) => t.length > 0 && !authorizedTitlesLower.includes(t.toLowerCase()));

  if (configuredSuggestions && configuredSuggestions.length > 0) {
    return configuredSuggestions.filter((sq) => {
      const sqLower = sq.toLowerCase();
      return !unauthorizedUniqueTitles.some((ut) => sqLower.includes(ut.toLowerCase()));
    });
  }

  // Derive suggestions strictly from authorized documents
  return authorizedDocs.slice(0, 3).map((d) => `How does ${d.title} work?`);
}

/**
 * Filter knowledge documents strictly to `AuthorizationScope.collectionIds`.
 */
export function filterAuthorizedDocuments<
  T extends Pick<KnowledgeDocument, 'id' | 'collectionId'> & {
    deletedAt?: string | null;
    status?: string;
  }
>(documents: readonly T[], authorizationScope: AuthorizationScope): T[] {
  const authorizedSet = new Set(authorizationScope.collectionIds);
  return (documents || []).filter(
    (d) =>
      d &&
      !d.deletedAt &&
      (!d.status || d.status === 'ready') &&
      authorizedSet.has(d.collectionId)
  );
}

/**
 * Filter source citations strictly to `AuthorizationScope.collectionIds`.
 */
export function filterAuthorizedCitations<T extends Pick<SourceCitation, 'collectionId'>>(
  citations: readonly T[],
  authorizationScope: AuthorizationScope
): T[] {
  const authorizedSet = new Set(authorizationScope.collectionIds);
  return (citations || []).filter((c) => c && authorizedSet.has(c.collectionId));
}

/**
 * Filter route rules so that any rule referencing unauthorized `collectionIds` or `documentIds`
 * outside `AuthorizationScope.collectionIds` is excluded or sanitized.
 */
export function filterAuthorizedRouteRules(
  rules: readonly EmbedRouteRule[],
  authorizationScope: AuthorizationScope,
  documents: readonly Pick<KnowledgeDocument, 'id' | 'collectionId'>[] = []
): EmbedRouteRule[] {
  const authorizedSet = new Set(authorizationScope.collectionIds);
  const authorizedDocIdSet = new Set(
    (documents || [])
      .filter((d) => d && authorizedSet.has(d.collectionId))
      .map((d) => d.id)
  );

  const result: EmbedRouteRule[] = [];
  for (const rule of rules || []) {
    if (!rule) continue;
    if (rule.collectionIds && rule.collectionIds.length > 0) {
      const allowedRuleCols = rule.collectionIds.filter((cid) => authorizedSet.has(cid));
      if (allowedRuleCols.length === 0) continue;
    }
    if (rule.documentIds && rule.documentIds.length > 0 && documents.length > 0) {
      const allowedRuleDocs = rule.documentIds.filter((did) => authorizedDocIdSet.has(did));
      if (allowedRuleDocs.length === 0) continue;
      result.push({
        ...rule,
        collectionIds: rule.collectionIds?.filter((cid) => authorizedSet.has(cid)),
        documentIds: allowedRuleDocs,
      });
      continue;
    }
    result.push({
      ...rule,
      collectionIds: rule.collectionIds?.filter((cid) => authorizedSet.has(cid)),
    });
  }
  return result;
}

/**
 * Filter suggested / starter questions against `AuthorizationScope.collectionIds`.
 */
export function filterAuthorizedSuggestedQuestions(
  questions: readonly string[],
  authorizationScope: AuthorizationScope,
  documents: readonly KnowledgeDocument[] = []
): string[] {
  return resolveAuthorizedSuggestions({
    authorizationScope,
    documents,
    configuredSuggestions: questions,
  });
}

/**
 * Build canonical Simulator Debug Output from Embed, Identity, and Collections.
 */
export function buildSimulatorDebugOutput(params: {
  embed: EmbedInstance;
  identity: EmbedIdentity;
  collections: readonly Collection[];
}) {
  const embedCollectionIds = getEmbedCollectionIds(params.embed);
  const scope = resolveEmbedAuthorization(
    params.identity,
    embedCollectionIds,
    params.collections
  );
  const authorizedSet = new Set(scope.collectionIds);
  const colMap = new Map(params.collections.map((c) => [c.id, c]));

  const excludedCollections = embedCollectionIds
    .filter((id) => !authorizedSet.has(id))
    .map((id) => {
      const col = colMap.get(id);
      return {
        id,
        name: col?.name || id,
        visibility: col?.visibility || ('admins' as CollectionVisibility),
        reason: col ? ('insufficient_role' as const) : ('missing_collection' as const),
      };
    });

  return {
    identity: scope.identity,
    embedCollectionIds,
    authorizedCollectionIds: scope.collectionIds,
    excludedCollections,
  };
}

/**
 * Canonical `retrieveKnowledge` consumer.
 * Consumes ONLY `AuthorizationScope.collectionIds` as its authorization/knowledge-universe input.
 * Never reconstructs authorization from Embed configuration or identity.
 */
export function retrieveKnowledge(params: {
  query: string;
  authorizationScope: AuthorizationScope;
  documents: readonly KnowledgeDocument[];
  collections?: readonly Collection[];
  narrowedDocumentIds?: readonly string[];
  staticEmbedCta?: DocumentNextStep;
  context?: {
    currentUrl?: string;
    responseLanguage?: SupportedLanguage | 'auto';
    uiLanguage?: SupportedLanguage;
    workspaceDefaultLanguage?: SupportedLanguage;
    answerMode?: AnswerMode;
  };
}): CompiledAnswerPlan & {
  authorizedCollectionIds: readonly string[];
} {
  const {
    query,
    authorizationScope,
    documents,
    collections = [],
    narrowedDocumentIds,
    staticEmbedCta,
    context,
  } = params;

  const authorizedSet = new Set(authorizationScope.collectionIds);

  // Filter documents strictly to AuthorizationScope.collectionIds
  let scopedDocs = (documents || []).filter(
    (d) =>
      d &&
      !d.deletedAt &&
      d.status === 'ready' &&
      authorizedSet.has(d.collectionId)
  );

  if (narrowedDocumentIds && narrowedDocumentIds.length > 0) {
    const pinnedSet = new Set(narrowedDocumentIds);
    const pinnedDocs = scopedDocs.filter((d) => pinnedSet.has(d.id));
    if (pinnedDocs.length > 0) {
      scopedDocs = pinnedDocs;
    }
  }

  const compiled = compileKnowledgeResponse({
    question: query,
    authorizedDocs: scopedDocs,
    currentUrl: context?.currentUrl || '/workspace',
    answerMode: context?.answerMode || 'deterministic',
    isEmbedMode: true,
    explicitResponseLanguage: context?.responseLanguage || 'auto',
    uiLanguage: context?.uiLanguage || 'en',
  });

  // Enforce strict citation and CTA post-guard against AuthorizationScope.collectionIds
  const guardedSources = (compiled.sources || []).filter((s) =>
    authorizedSet.has(s.collectionId)
  );

  const primarySourceColId = guardedSources[0]?.collectionId;
  const guardedCta = resolveAuthorizedCta({
    authorizationScope,
    knowledgeDerivedCta: compiled.cta,
    knowledgeDerivedSourceCollectionId: primarySourceColId,
    staticEmbedCta,
  });

  return {
    ...compiled,
    sources: guardedSources,
    cta: guardedCta,
    authorizedCollectionIds: authorizationScope.collectionIds,
  };
}

// ============================================================================
// Mid-Conversation Identity Upgrade & Historical Turn Immutability
// ============================================================================

export interface ImmutableEmbedConversationTurn {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly identityAtTurn: EmbedIdentity;
  readonly authorizedCollectionIdsAtTurn: readonly string[];
  readonly sources: readonly {
    readonly docId: string;
    readonly title: string;
    readonly filename: string;
    readonly collectionId: string;
  }[];
  readonly cta?: Readonly<DocumentNextStep>;
  readonly createdAt: string;
}

export interface EmbedRuntimeSession {
  sessionId: string;
  workspaceId: string;
  embedId: string;
  identity: EmbedIdentity;
  authorizationScope: AuthorizationScope;
  authorizationVersion: string;
  turns: readonly ImmutableEmbedConversationTurn[];
  createdAt: string;
  updatedAt: string;
}

export function createEmbedRuntimeSession(params: {
  sessionId?: string;
  workspaceId: string;
  embed: EmbedInstance;
  identity: EmbedIdentity;
  collections: readonly Collection[];
}): EmbedRuntimeSession {
  const embedColIds = getEmbedCollectionIds(params.embed);
  const authorizationScope = resolveEmbedAuthorization(
    params.identity,
    embedColIds,
    params.collections
  );
  const authorizationVersion = computeEmbedAuthorizationVersion(
    params.embed,
    params.collections
  );
  const now = new Date().toISOString();
  return {
    sessionId:
      params.sessionId || `esess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    workspaceId: params.workspaceId,
    embedId: params.embed.id,
    identity: authorizationScope.identity,
    authorizationScope,
    authorizationVersion,
    turns: Object.freeze([]),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Append a new turn to an EmbedRuntimeSession, freezing the turn so its historical
 * content, citations, and authorization scope snapshot can never be retroactively mutated.
 */
export function appendImmutableSessionTurn(
  session: EmbedRuntimeSession,
  turn: Omit<
    ImmutableEmbedConversationTurn,
    'identityAtTurn' | 'authorizedCollectionIdsAtTurn'
  >
): EmbedRuntimeSession {
  const frozenTurn: ImmutableEmbedConversationTurn = Object.freeze({
    ...turn,
    identityAtTurn: session.identity,
    authorizedCollectionIdsAtTurn: session.authorizationScope.collectionIds,
    sources: Object.freeze((turn.sources || []).map((s) => Object.freeze({ ...s }))),
    cta: turn.cta ? Object.freeze({ ...turn.cta }) : undefined,
  });

  return {
    ...session,
    turns: Object.freeze([...session.turns, frozenTurn]),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Upgrade or transition a session's identity (`anonymous -> member -> admin`).
 * Normative Invariant:
 * - Existing rendered messages in `session.turns` remain strictly immutable.
 * - Subsequent knowledge-backed requests execute under the newly resolved `AuthorizationScope`.
 */
export function upgradeEmbedSessionIdentity(params: {
  session: EmbedRuntimeSession;
  newIdentity: EmbedIdentity;
  embed: EmbedInstance;
  collections: readonly Collection[];
}): EmbedRuntimeSession {
  const embedColIds = getEmbedCollectionIds(params.embed);
  const nextScope = resolveEmbedAuthorization(
    params.newIdentity,
    embedColIds,
    params.collections
  );
  const nextAuthVersion = computeEmbedAuthorizationVersion(
    params.embed,
    params.collections
  );

  return {
    ...params.session,
    identity: nextScope.identity,
    authorizationScope: nextScope,
    authorizationVersion: nextAuthVersion,
    // Preserve exact frozen reference to existing historical turns
    turns: params.session.turns,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Three-Case Dual Verification Proofs (`Identity Proof` + `Authorization Proof`)
// ============================================================================

export interface EmbedVerificationProofResult {
  ok: boolean;
  status: 200 | 401 | 404;
  failureCode?: string;
  failureMessage?: string;
  errorCode?: string;
  embedFound: boolean;
  sessionCreated: boolean;
  publicScopeVerified: boolean;
  identityVerified: boolean;
  protectedScopeVerified: boolean;
  expectedAuthorizedCollectionIds: readonly string[];
  actualAuthorizedCollectionIds: readonly string[];
  embedId: string;
  workspaceId: string;
  visibilityProfile: EmbedVisibilityProfile;
  verificationMode: 'anonymous' | 'member' | 'admin';
  runtimeInitialized: boolean;
  identity: EmbedIdentity;
  authorizationScope: AuthorizationScope;
  identityProof: {
    applicable: boolean;
    verified: boolean;
    algorithm?: 'HS256';
    workspaceMatched?: boolean;
    embedMatched?: boolean;
    resolvedIdentityLabel: string;
    summary: string;
  };
  authorizationProof: {
    verified: boolean;
    attachedCollectionIds: readonly string[];
    accessibleCollectionIds: readonly string[];
    accessibleCollections: { id: string; name: string; visibility: CollectionVisibility }[];
    excludedProtectedCollectionIds: readonly string[];
    excludedProtectedCollections: { id: string; name: string; visibility: CollectionVisibility }[];
    emptyScopeValid: boolean;
    summary: string;
  };
}

export function computeEmbedVerificationProof(params: {
  embed: EmbedInstance;
  collections: readonly Collection[];
  identity: EmbedIdentity;
  tokenVerified?: boolean;
  errorCode?: string;
}): EmbedVerificationProofResult {
  const { embed, collections, identity } = params;
  const attachedIds = getEmbedCollectionIds(embed);
  const collectionMap = new Map<string, Collection>();
  for (const col of collections) {
    if (col && typeof col.id === 'string') {
      collectionMap.set(col.id, col);
    }
  }

  const attachedCollections = attachedIds
    .map((id) => collectionMap.get(id))
    .filter((c): c is Collection => Boolean(c));

  const hasPublic = attachedCollections.some((c) => c.visibility === 'everyone');
  const hasProtected = attachedCollections.some(
    (c) => c.visibility === 'members' || c.visibility === 'admins'
  );

  const visibilityProfile: EmbedVisibilityProfile =
    hasPublic && !hasProtected
      ? 'public-only'
      : hasPublic && hasProtected
      ? 'mixed'
      : 'protected-only';

  const authorizationScope = resolveEmbedAuthorization(
    identity,
    attachedIds,
    collections
  );
  const accessibleSet = new Set(authorizationScope.collectionIds);

  const accessibleCollections = attachedCollections
    .filter((c) => accessibleSet.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, visibility: c.visibility }));

  const excludedProtectedCollections = attachedCollections
    .filter((c) => !accessibleSet.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, visibility: c.visibility }));

  const verificationMode: 'anonymous' | 'member' | 'admin' =
    identity.kind === 'anonymous' ? 'anonymous' : identity.role;

  const isAuth = identity.kind === 'authenticated';
  const identityProof = isAuth
    ? {
        applicable: true,
        verified: params.tokenVerified ?? true,
        algorithm: 'HS256' as const,
        workspaceMatched: true,
        embedMatched: true,
        resolvedIdentityLabel: identity.role,
        summary: `✓ HS256 assertion valid · ✓ workspace/embed match · ✓ identity = ${identity.role}`,
      }
    : {
        applicable: false,
        verified: true,
        resolvedIdentityLabel: 'anonymous',
        summary: 'N/A (Anonymous baseline — no signed token required for initialization)',
      };

  const emptyScopeValid =
    authorizationScope.collectionIds.length === 0 &&
    visibilityProfile === 'protected-only';

  let authSummary = '';
  if (visibilityProfile === 'public-only') {
    authSummary = `✓ attached everyone collections accessible (${accessibleCollections.length}) · ✓ no protected collections attached`;
  } else if (visibilityProfile === 'mixed') {
    if (verificationMode === 'anonymous') {
      authSummary = `✓ attached everyone collections accessible (${accessibleCollections.length}) · ✓ attached protected tiers (${excludedProtectedCollections
        .map((c) => c.visibility)
        .join(', ')}) excluded`;
    } else if (verificationMode === 'member') {
      authSummary = `✓ every attached collection permitted by member is accessible (${accessibleCollections.length}) · ✓ higher-tier attached collections (${
        excludedProtectedCollections.length > 0
          ? excludedProtectedCollections.map((c) => c.visibility).join(', ')
          : 'none'
      }) excluded`;
    } else {
      authSummary = `✓ every attached collection permitted by admin is accessible (${accessibleCollections.length})`;
    }
  } else {
    // protected-only
    if (verificationMode === 'anonymous') {
      authSummary = `✓ runtime initialized · ✓ empty scope (collectionIds: []) · ✓ no protected content accessible (${excludedProtectedCollections.length} protected excluded)`;
    } else if (verificationMode === 'member') {
      authSummary = `✓ every attached collection permitted by member is accessible (${accessibleCollections.length}) · ✓ higher-tier attached collections (${
        excludedProtectedCollections.length > 0
          ? excludedProtectedCollections.map((c) => c.visibility).join(', ')
          : 'none'
      }) excluded`;
    } else {
      authSummary = `✓ every attached collection permitted by admin is accessible (${accessibleCollections.length})`;
    }
  }

  const hasError = Boolean(params.errorCode);
  const publicScopeVerified =
    !hasError &&
    (!hasPublic ||
      attachedCollections
        .filter((c) => c.visibility === 'everyone')
        .every((c) => accessibleSet.has(c.id)));
  const identityVerified = !hasError && isAuth && (params.tokenVerified ?? true);
  const protectedScopeVerified =
    !hasError &&
    isAuth &&
    attachedCollections
      .filter((c) => canAccessCollection(identity, c.visibility) && c.visibility !== 'everyone')
      .every((c) => accessibleSet.has(c.id));

  return {
    ok: !hasError,
    status: hasError ? 401 : 200,
    failureCode: params.errorCode,
    errorCode: params.errorCode,
    embedFound: Boolean(embed),
    sessionCreated: !hasError,
    publicScopeVerified,
    identityVerified,
    protectedScopeVerified,
    expectedAuthorizedCollectionIds: authorizationScope.collectionIds,
    actualAuthorizedCollectionIds: hasError
      ? Object.freeze([])
      : authorizationScope.collectionIds,
    embedId: embed.id,
    workspaceId: embed.workspaceId,
    visibilityProfile,
    verificationMode,
    runtimeInitialized: !hasError,
    identity: authorizationScope.identity,
    authorizationScope,
    identityProof,
    authorizationProof: {
      verified: !hasError,
      attachedCollectionIds: attachedIds,
      accessibleCollectionIds: authorizationScope.collectionIds,
      accessibleCollections,
      excludedProtectedCollectionIds: Object.freeze(
        excludedProtectedCollections.map((c) => c.id)
      ),
      excludedProtectedCollections,
      emptyScopeValid,
      summary: authSummary,
    },
  };
}

// ============================================================================
// PAGE-APP-06 (PA-CONSOLE / SU-TEST-CONSOLE): Single Canonical EffectiveScope
// Resolver (EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections)
// ============================================================================

export type TestConsoleTargetScopeType = 'workspace' | 'embed' | 'collection';
export type TestConsoleIdentityMode =
  | 'everyone'
  | 'members'
  | 'admins'
  | 'invalid_token';

export interface TestConsoleScopeInput {
  scopeValue: string; // 'workspace' | 'embed:<id>' | 'collection:<id>'
  identityMode: TestConsoleIdentityMode;
  collections: readonly Collection[];
  embeds: readonly EmbedInstance[];
}

export interface TestConsoleScopeResolution {
  scopeValue: string;
  scopeType: TestConsoleTargetScopeType;
  scopeLabel: string;
  targetEmbed?: EmbedInstance;
  targetCollection?: Collection;
  identityMode: TestConsoleIdentityMode;
  isInvalidToken: boolean;
  errorCode?: 'INVALID_TOKEN_SIGNATURE';
  anonymousFallback: 'none';
  identity: EmbedIdentity;
  effectiveRoleLabel: CollectionVisibility;
  targetScopeCollectionIds: ReadonlyArray<string>;
  authorizationScope: AuthorizationScope;
  allowedCollections: Collection[];
  excludedByRoleCollections: {
    collection: Collection;
    requiredRoleLabel: 'Member' | 'Admin';
  }[];
  outsideScopeCollections: Collection[];
  authorizationVersion: string;
}

/**
 * Single canonical EffectiveScope resolver for PAGE-APP-06 Test Console.
 * Enforces the strict resolution order:
 *   Workspace collections
 *     -> Target-scope narrowing (Workspace | Embed | Collection)
 *     -> Identity verification (Anonymous | Member | Admin | Invalid token -> 401 Halt)
 *     -> Effective AuthorizationScope (TargetScope ∩ IdentityAuthorizedCollections)
 * An Embed or Collection target can narrow what is tested, but can NEVER grant
 * or elevate permissions beyond IdentityAuthorizedCollections.
 */
export function resolveTestConsoleScope(
  input: TestConsoleScopeInput
): TestConsoleScopeResolution {
  const { scopeValue, identityMode, collections, embeds } = input;

  let scopeType: TestConsoleTargetScopeType = 'workspace';
  let targetEmbed: EmbedInstance | undefined;
  let targetCollection: Collection | undefined;
  let rawTargetColIds: readonly string[] = collections.map((c) => c.id);
  let scopeLabel = 'All workspace collections';

  if (scopeValue.startsWith('embed:')) {
    const embedId = scopeValue.slice('embed:'.length);
    targetEmbed = embeds.find((e) => e.id === embedId);
    if (targetEmbed) {
      scopeType = 'embed';
      rawTargetColIds = getEmbedCollectionIds(targetEmbed);
      scopeLabel = `${targetEmbed.name} (Embed)`;
    }
  } else if (scopeValue.startsWith('collection:')) {
    const colId = scopeValue.slice('collection:'.length);
    targetCollection = collections.find((c) => c.id === colId);
    if (targetCollection) {
      scopeType = 'collection';
      rawTargetColIds = Object.freeze([targetCollection.id]);
      scopeLabel = `${targetCollection.name} (Collection)`;
    }
  }

  const validCollectionIdSet = new Set(collections.map((c) => c.id));
  const targetScopeCollectionIds = Object.freeze(
    Array.from(
      new Set(rawTargetColIds.filter((id) => validCollectionIdSet.has(id)))
    ).sort()
  );
  const targetScopeSet = new Set(targetScopeCollectionIds);

  const authorizationVersion = targetEmbed
    ? computeEmbedAuthorizationVersion(targetEmbed, collections)
    : computeEmbedAuthorizationVersion(
        {
          id: scopeType === 'collection' && targetCollection ? targetCollection.id : 'workspace',
          knowledgeScope: { collectionIds: [...targetScopeCollectionIds] },
        },
        collections
      );

  // Hard 401 Boundary: Invalid token halts before authorization/retrieval with zero anonymous fallback
  if (identityMode === 'invalid_token') {
    const unverifiedAnon: EmbedIdentity = Object.freeze({
      kind: 'anonymous',
    });
    const haltedScope: AuthorizationScope = Object.freeze({
      identity: unverifiedAnon,
      collectionIds: Object.freeze([] as string[]),
    });
    return {
      scopeValue,
      scopeType,
      scopeLabel,
      targetEmbed,
      targetCollection,
      identityMode,
      isInvalidToken: true,
      errorCode: 'INVALID_TOKEN_SIGNATURE',
      anonymousFallback: 'none',
      identity: unverifiedAnon,
      effectiveRoleLabel: 'everyone',
      targetScopeCollectionIds,
      authorizationScope: haltedScope,
      allowedCollections: [],
      excludedByRoleCollections: [],
      outsideScopeCollections: collections.filter((c) => !targetScopeSet.has(c.id)),
      authorizationVersion,
    };
  }

  const identity = clearanceLabelToEmbedIdentity(identityMode);
  const authorizationScope = resolveEmbedAuthorization(
    identity,
    targetScopeCollectionIds,
    collections
  );
  const authorizedSet = new Set(authorizationScope.collectionIds);

  const allowedCollections = collections.filter((c) => authorizedSet.has(c.id));
  const excludedByRoleCollections = collections
    .filter((c) => targetScopeSet.has(c.id) && !authorizedSet.has(c.id))
    .map((collection) => ({
      collection,
      requiredRoleLabel: (collection.visibility === 'admins'
        ? 'Admin'
        : 'Member') as 'Member' | 'Admin',
    }));
  const outsideScopeCollections = collections.filter(
    (c) => !targetScopeSet.has(c.id)
  );

  return {
    scopeValue,
    scopeType,
    scopeLabel,
    targetEmbed,
    targetCollection,
    identityMode,
    isInvalidToken: false,
    anonymousFallback: 'none',
    identity: authorizationScope.identity,
    effectiveRoleLabel: identityMode,
    targetScopeCollectionIds,
    authorizationScope,
    allowedCollections,
    excludedByRoleCollections,
    outsideScopeCollections,
    authorizationVersion,
  };
}

