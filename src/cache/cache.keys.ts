// ============================================================================
// CACHE-001 §3 & §6: Deterministic Scoped Cache Key Builder
// Ensures cache lookups are strictly partitioned by:
// workspace_id + embed_id + access_scope + knowledge_version + context_hash
// + response_language + answer_mode + normalized_question
// ============================================================================

import {
  CacheKeyContext,
  RetrievalCacheKey,
  AnswerCacheKey,
  SessionCacheKey,
} from './cache.types';
import { EmbedIdentity } from '../types';

/**
 * Normalize question for exact cache lookup and semantic token comparison.
 */
export function normalizeQuestionForCache(question: string): string {
  return question
    .toLowerCase()
    .trim()
    .replace(/[¿?¡!.,;:"'()[\]{}]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Normalize host URL/route context so contextual queries ("how do I configure this?")
 * never collide across different routes (/settings/security/sso vs /billing/invoices).
 */
export function normalizeRouteContext(currentUrl?: string): string {
  if (!currentUrl) return '/';
  const cleaned = currentUrl.trim().toLowerCase().split('?')[0].replace(/\/+$/, '');
  return cleaned || '/';
}

/**
 * Deterministic identity fingerprint for cache partitioning.
 */
export function serializeIdentityForCache(identity?: EmbedIdentity): string {
  if (!identity || identity.kind === 'anonymous') {
    return 'id:anonymous';
  }
  return `id:auth:${identity.role}:${identity.userId}`;
}

/**
 * Deterministic scope fingerprint from sorted authorizedCollectionIds + narrowedDocumentIds.
 */
export function buildAuthorizationScopeHash(
  authorizedCollectionIds: readonly string[] | string[],
  narrowedDocumentIds?: readonly string[] | string[]
): string {
  const cols = Array.from(new Set(authorizedCollectionIds)).sort().join(',');
  const docs =
    narrowedDocumentIds && narrowedDocumentIds.length > 0
      ? `|docs:${Array.from(new Set(narrowedDocumentIds)).sort().join(',')}`
      : '';
  return `cols:${cols}${docs}`;
}

/**
 * Fail-Safe Bypass Rule:
 * If a cache partition cannot be proven to contain every output-affecting
 * authorization/context dimension, bypass the cache.
 */
export function isCachePartitionComplete(ctx: Partial<CacheKeyContext>): boolean {
  if (!ctx) return false;
  if (!ctx.workspaceId || typeof ctx.workspaceId !== 'string') return false;
  if (!Array.isArray(ctx.authorizedCollectionIds)) return false;
  if (typeof ctx.knowledgeVersion !== 'number' || !Number.isFinite(ctx.knowledgeVersion)) {
    return false;
  }
  if (!ctx.responseLanguage || !ctx.answerMode) return false;
  if (ctx.bypassIfIncomplete && !ctx.authorizationVersion) return false;
  return true;
}

/**
 * Build partition scope key (everything except the specific question).
 * Semantic answer cache candidates MUST match this exact partition scope key.
 */
export function buildPartitionScopeKey(ctx: Omit<CacheKeyContext, 'question'>): string {
  const ws = ctx.workspaceId || 'okeng';
  const emb = ctx.embedId || 'default';
  const av = ctx.authorizationVersion || 'av-default';
  const idPart = ctx.identity ? `:${serializeIdentityForCache(ctx.identity)}` : '';
  const scope = buildAuthorizationScopeHash(
    ctx.authorizedCollectionIds,
    ctx.narrowedDocumentIds
  );
  const route = normalizeRouteContext(ctx.currentUrl);
  return `okeng:v1:ws:${ws}:emb:${emb}:av:${av}:kv:${ctx.knowledgeVersion}:lang:${ctx.responseLanguage}:mode:${ctx.answerMode}:route:${route}${idPart}:${scope}`;
}

/**
 * Build full L1 Exact Answer Cache Key.
 */
export function buildAnswerCacheKey(ctx: CacheKeyContext): string {
  const partition = buildPartitionScopeKey(ctx);
  const qNorm = normalizeQuestionForCache(ctx.question);
  return `${partition}:ans:${qNorm}`;
}

/**
 * Build L2 Retrieval Cache Key (authorized chunks/ranked docs).
 */
export function buildRetrievalCacheKey(ctx: CacheKeyContext): string {
  const ws = ctx.workspaceId || 'okeng';
  const emb = ctx.embedId || 'default';
  const av = ctx.authorizationVersion || 'av-default';
  const scope = buildAuthorizationScopeHash(
    ctx.authorizedCollectionIds,
    ctx.narrowedDocumentIds
  );
  const route = normalizeRouteContext(ctx.currentUrl);
  const qNorm = normalizeQuestionForCache(ctx.question);
  return `okeng:v1:ws:${ws}:emb:${emb}:av:${av}:kv:${ctx.knowledgeVersion}:lang:${ctx.responseLanguage}:route:${route}:${scope}:ret:${qNorm}`;
}

/**
 * Build canonical typed RetrievalCacheKey string.
 */
export function serializeRetrievalCacheKey(key: RetrievalCacheKey): string {
  const cols = Array.from(new Set(key.authorizedCollectionIds)).sort().join(',');
  const paramsJson = JSON.stringify(
    Object.keys(key.retrievalParameters || {})
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = key.retrievalParameters[k];
        return acc;
      }, {})
  );
  const qNorm = normalizeQuestionForCache(key.query);
  return `okeng:v1:ret:emb:${key.embedId}:av:${key.authorizationVersion}:kv:${key.knowledgeVersion}:cols:[${cols}]:params:${paramsJson}:q:${qNorm}`;
}

/**
 * Build canonical typed AnswerCacheKey string.
 */
export function serializeAnswerCacheKey(key: AnswerCacheKey): string {
  const cols = Array.from(new Set(key.authorizationScope.collectionIds)).sort().join(',');
  const idPart = serializeIdentityForCache(key.identity);
  const hostJson = JSON.stringify(
    Object.keys(key.hostContext || {})
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = key.hostContext[k];
        return acc;
      }, {})
  );
  const convJson = JSON.stringify(
    Object.keys(key.conversationContext || {})
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = key.conversationContext[k];
        return acc;
      }, {})
  );
  const qNorm = normalizeQuestionForCache(key.query);
  return `okeng:v1:ans:emb:${key.embedId}:${idPart}:av:${key.authorizationVersion}:kv:${key.knowledgeVersion}:cols:[${cols}]:host:${hostJson}:conv:${convJson}:lang:${key.responseLanguage}:mode:${key.answerMode}:q:${qNorm}`;
}

/**
 * Build canonical typed SessionCacheKey string.
 */
export function serializeSessionCacheKey(key: SessionCacheKey): string {
  const cols = Array.from(new Set(key.authorizationScope.collectionIds)).sort().join(',');
  const idPart = serializeIdentityForCache(key.identity);
  const kvPart = key.knowledgeVersion !== undefined ? `:kv:${key.knowledgeVersion}` : '';
  return `okeng:v1:sess:${key.sessionId}:${idPart}:av:${key.authorizationVersion}${kvPart}:cols:[${cols}]`;
}

/**
 * Build Class C Document Cache Key.
 */
export function buildDocumentCacheKey(
  workspaceId: string,
  documentId: string,
  knowledgeVersion: number
): string {
  return `okeng:v1:ws:${workspaceId}:kv:${knowledgeVersion}:doc:${documentId}`;
}

/**
 * Build Class D Authorization Scope Cache Key.
 */
export function buildAuthorizationCacheKey(
  workspaceId: string,
  role: string,
  scopeColIds?: readonly string[] | string[],
  authorizationVersion?: string
): string {
  const narrowed =
    scopeColIds && scopeColIds.length > 0 ? [...scopeColIds].sort().join(',') : 'all';
  const av = authorizationVersion ? `:av:${authorizationVersion}` : '';
  return `okeng:v1:ws:${workspaceId}:auth:${role}:narrow:${narrowed}${av}`;
}

