// ============================================================================
// CACHE-001: Multi-Layer Cache Service
// Owns:
//  - L1 Exact & Semantic Answer Cache (scoped by tenant + permissions + knowledge_version + route + language)
//  - L2 Retrieval Cache
//  - Class C Document Cache & Class D Authorization Cache
//  - Workspace Knowledge Generation Versioning (workspace.knowledge_version)
//  - Single-Flight Stampede Protection (CACHE-010)
//  - Negative Caching (CACHE-011)
//  - Graceful Outage Degradation (CACHE-012)
// ============================================================================

import { CacheAdapter } from './adapters/cache.adapter';
import {
  CacheKeyContext,
  CacheEntryEnvelope,
  CacheDecisionTelemetry,
} from './cache.types';
import {
  buildAnswerCacheKey,
  buildPartitionScopeKey,
  buildRetrievalCacheKey,
  buildAuthorizationCacheKey,
  normalizeQuestionForCache,
  isCachePartitionComplete,
} from './cache.keys';
import { DEFAULT_CACHE_POLICY, CachePolicyConfig } from './cache.policy';
import {
  serializeCacheEnvelope,
  deserializeCacheEnvelope,
} from './cache.serialization';
import { cacheMetrics } from './cache.metrics';
import { tokenizeAndStem, expandWithSynonyms } from '../services/engine/bm25Retriever';

export class CacheService {
  private adapter: CacheAdapter;
  private policy: CachePolicyConfig;
  private knowledgeVersions = new Map<string, number>();
  private inFlightLocks = new Map<string, Promise<any>>();
  private inFlightWaiterCounts = new Map<string, number>();

  constructor(adapter: CacheAdapter, policy: CachePolicyConfig = DEFAULT_CACHE_POLICY) {
    this.adapter = adapter;
    this.policy = policy;
    // Default initial knowledge_version = 184 per CACHE-001 §4
    this.knowledgeVersions.set('okeng', 184);
    this.knowledgeVersions.set('ws_okeng_01', 184);
    this.knowledgeVersions.set('acme-cloud', 184);
  }

  getBackendName(): 'redis' | 'memory' {
    return this.adapter.backendName;
  }

  getAdapter(): CacheAdapter {
    return this.adapter;
  }

  /**
   * Get current workspace knowledge_version (defaults to 184).
   */
  getKnowledgeVersion(workspaceId: string): number {
    const key = workspaceId === 'ws_okeng_01' ? 'okeng' : workspaceId;
    return this.knowledgeVersions.get(key) ?? 184;
  }

  /**
   * Increment workspace.knowledge_version on document write/update/delete (CACHE-003 & CACHE-004).
   * Immediately obsoletes all previous answer and retrieval cache entries for that workspace.
   */
  bumpKnowledgeVersion(workspaceId: string): number {
    const key = workspaceId === 'ws_okeng_01' ? 'okeng' : workspaceId;
    const next = this.getKnowledgeVersion(key) + 1;
    this.knowledgeVersions.set(key, next);
    this.knowledgeVersions.set(workspaceId, next);
    cacheMetrics.recordKnowledgeVersionBump();
    return next;
  }

  /**
   * Compute semantic similarity between two normalized queries using stemmed tokens + synonym expansion.
   * Used strictly within the same (workspace, authorization scope, knowledge_version, route, response_language) partition.
   */
  computeSemanticSimilarity(q1: string, q2: string): number {
    const n1 = normalizeQuestionForCache(q1);
    const n2 = normalizeQuestionForCache(q2);
    if (n1 === n2) return 1.0;

    const stems1 = tokenizeAndStem(n1);
    const stems2 = tokenizeAndStem(n2);
    if (stems1.length === 0 || stems2.length === 0) return 0;

    const syn1 = expandWithSynonyms(stems1);
    const syn2 = expandWithSynonyms(stems2);

    const set1 = new Set(stems1);
    const set2 = new Set(stems2);

    let overlap = 0;
    for (const t of set1) {
      if (set2.has(t)) {
        overlap += 1.0;
      } else if (syn2.has(t)) {
        overlap += 0.85;
      }
    }
    for (const t of set2) {
      if (set1.has(t)) {
        overlap += 1.0;
      } else if (syn1.has(t)) {
        overlap += 0.85;
      }
    }

    const score = overlap / (set1.size + set2.size);
    return Number(Math.min(0.99, score).toFixed(2));
  }

  /**
   * Look up L1 Answer Cache:
   * 1. Exact key match
   * 2. Semantic match (>= threshold) strictly within identical partition scope
   * Degrades gracefully to MISS on adapter outage (CACHE-012).
   */
  async getAnswer<T>(ctx: CacheKeyContext): Promise<{
    status: 'HIT' | 'SEMANTIC_HIT' | 'NEGATIVE_HIT' | 'MISS' | 'BYPASSED';
    value?: T;
    similarity?: number;
    degradedOutage?: boolean;
  }> {
    if (!isCachePartitionComplete(ctx)) {
      return { status: 'BYPASSED' };
    }
    const exactKey = buildAnswerCacheKey(ctx);
    const partitionPrefix = buildPartitionScopeKey(ctx) + ':ans:';

    try {
      // 1. Check Exact Answer Cache
      const rawExact = await this.adapter.get(exactKey);
      const exactEnv = deserializeCacheEnvelope<T>(rawExact);
      if (exactEnv && Date.now() <= exactEnv.expiresAtMs) {
        if (exactEnv.isNegative) {
          cacheMetrics.recordNegativeHit();
          return { status: 'NEGATIVE_HIT', value: exactEnv.value, similarity: 1.0 };
        }
        cacheMetrics.recordExactHit();
        return { status: 'HIT', value: exactEnv.value, similarity: 1.0 };
      }

      // 2. Check Semantic Answer Cache within identical security/version/context/language partition
      const candidateKeys = await this.adapter.listKeysByPrefix(partitionPrefix);
      let bestMatch: { value: T; similarity: number; isNegative?: boolean } | null = null;

      for (const cKey of candidateKeys) {
        if (cKey === exactKey) continue;
        const rawCand = await this.adapter.get(cKey);
        const candEnv = deserializeCacheEnvelope<T>(rawCand);
        if (!candEnv || Date.now() > candEnv.expiresAtMs || !candEnv.normalizedQuestion) {
          continue;
        }
        const sim = this.computeSemanticSimilarity(ctx.question, candEnv.normalizedQuestion);
        if (sim >= this.policy.semanticSimilarityThreshold) {
          if (!bestMatch || sim > bestMatch.similarity) {
            bestMatch = {
              value: candEnv.value,
              similarity: sim,
              isNegative: candEnv.isNegative,
            };
          }
        }
      }

      if (bestMatch) {
        if (bestMatch.isNegative) {
          cacheMetrics.recordNegativeHit();
          return {
            status: 'NEGATIVE_HIT',
            value: bestMatch.value,
            similarity: bestMatch.similarity,
          };
        }
        cacheMetrics.recordSemanticHit();
        return {
          status: 'SEMANTIC_HIT',
          value: bestMatch.value,
          similarity: bestMatch.similarity,
        };
      }

      cacheMetrics.recordMiss();
      return { status: 'MISS' };
    } catch {
      cacheMetrics.recordAdapterOutage();
      return { status: 'MISS', degradedOutage: true };
    }
  }

  /**
   * Store compiled/generated answer in L1 Answer Cache (or Negative Cache with short TTL).
   */
  async setAnswer<T>(
    ctx: CacheKeyContext,
    value: T,
    options?: { isNegative?: boolean; customTtlMs?: number }
  ): Promise<void> {
    const exactKey = buildAnswerCacheKey(ctx);
    const scopeKey = buildPartitionScopeKey(ctx);
    const isNegative = Boolean(options?.isNegative);
    const ttlMs =
      options?.customTtlMs ??
      (isNegative ? this.policy.negativeAnswerTtlMs : this.policy.answerTtlMs);

    const now = Date.now();
    const envelope: CacheEntryEnvelope<T> = {
      key: exactKey,
      cacheClass: 'answer',
      workspaceId: ctx.workspaceId,
      scopeKey,
      knowledgeVersion: ctx.knowledgeVersion,
      responseLanguage: ctx.responseLanguage,
      normalizedQuestion: normalizeQuestionForCache(ctx.question),
      stemmedTokens: tokenizeAndStem(ctx.question),
      isNegative,
      value,
      createdAtMs: now,
      expiresAtMs: now + ttlMs,
    };

    try {
      await this.adapter.set(exactKey, serializeCacheEnvelope(envelope), ttlMs);
    } catch {
      cacheMetrics.recordAdapterOutage();
    }
  }

  /**
   * Single-Flight Stampede Protection (CACHE-010):
   * Ensures 100 concurrent identical cache misses execute `loader()` only ONCE,
   * sharing the resolved result with all 99 waiting callers.
   */
  async getOrComputeAnswerSingleFlight<T>(
    ctx: CacheKeyContext,
    loader: () => Promise<{ value: T; isNegative?: boolean }>,
    options?: { customTtlMs?: number }
  ): Promise<{
    value: T;
    telemetry: CacheDecisionTelemetry;
  }> {
    // 1. Check cache first
    const lookup = await this.getAnswer<T>(ctx);
    if (lookup.status !== 'MISS' && lookup.value !== undefined) {
      return {
        value: lookup.value,
        telemetry: {
          answerCache: lookup.status,
          retrievalCache: 'SKIPPED',
          authorizationCache: 'HIT',
          knowledgeVersion: ctx.knowledgeVersion,
          semanticSimilarity: lookup.similarity,
          llmStatus: 'SKIPPED_CACHE',
          adapterBackend: lookup.degradedOutage
            ? 'degraded-outage'
            : this.adapter.backendName,
        },
      };
    }

    // 2. Check if an identical request is already in flight
    const lockKey = buildAnswerCacheKey(ctx);
    const existingPromise = this.inFlightLocks.get(lockKey);
    if (existingPromise) {
      const currentWaiters = (this.inFlightWaiterCounts.get(lockKey) || 0) + 1;
      this.inFlightWaiterCounts.set(lockKey, currentWaiters);
      cacheMetrics.recordStampedePrevented(1);
      const sharedResult = await existingPromise;
      return {
        value: sharedResult.value,
        telemetry: {
          answerCache: 'HIT',
          retrievalCache: 'SKIPPED',
          authorizationCache: 'HIT',
          knowledgeVersion: ctx.knowledgeVersion,
          semanticSimilarity: 1.0,
          llmStatus: 'SKIPPED_CACHE',
          adapterBackend: this.adapter.backendName,
          stampedeShared: true,
        },
      };
    }

    // 3. Acquire single-flight lock and compute once
    const computePromise = (async () => {
      try {
        const computed = await loader();
        await this.setAnswer(ctx, computed.value, {
          isNegative: computed.isNegative,
          customTtlMs: options?.customTtlMs,
        });
        return computed;
      } finally {
        this.inFlightLocks.delete(lockKey);
        this.inFlightWaiterCounts.delete(lockKey);
      }
    })();

    this.inFlightLocks.set(lockKey, computePromise);
    const result = await computePromise;

    return {
      value: result.value,
      telemetry: {
        answerCache: 'MISS',
        retrievalCache: 'MISS',
        authorizationCache: 'HIT',
        knowledgeVersion: ctx.knowledgeVersion,
        llmStatus:
          ctx.answerMode === 'generative' ? 'INVOKED' : 'SKIPPED_DETERMINISTIC',
        adapterBackend: lookup.degradedOutage
          ? 'degraded-outage'
          : this.adapter.backendName,
      },
    };
  }

  /**
   * L2 Retrieval Cache Lookup & Write
   */
  async getRetrieval<T>(ctx: CacheKeyContext): Promise<T | null> {
    const key = buildRetrievalCacheKey(ctx);
    try {
      const raw = await this.adapter.get(key);
      const env = deserializeCacheEnvelope<T>(raw);
      if (env && Date.now() <= env.expiresAtMs) {
        cacheMetrics.recordRetrievalHit();
        return env.value;
      }
      return null;
    } catch {
      cacheMetrics.recordAdapterOutage();
      return null;
    }
  }

  async setRetrieval<T>(ctx: CacheKeyContext, value: T, ttlMs?: number): Promise<void> {
    const key = buildRetrievalCacheKey(ctx);
    const effectiveTtl = ttlMs ?? this.policy.retrievalTtlMs;
    const now = Date.now();
    const env: CacheEntryEnvelope<T> = {
      key,
      cacheClass: 'retrieval',
      workspaceId: ctx.workspaceId,
      scopeKey: key,
      knowledgeVersion: ctx.knowledgeVersion,
      value,
      createdAtMs: now,
      expiresAtMs: now + effectiveTtl,
    };
    try {
      await this.adapter.set(key, serializeCacheEnvelope(env), effectiveTtl);
    } catch {
      cacheMetrics.recordAdapterOutage();
    }
  }

  /**
   * Class D Authorization Scope Cache
   */
  async getAuthorizationScope(
    workspaceId: string,
    role: string,
    scopeColIds?: string[]
  ): Promise<string[] | null> {
    const key = buildAuthorizationCacheKey(workspaceId, role, scopeColIds);
    try {
      const raw = await this.adapter.get(key);
      const env = deserializeCacheEnvelope<string[]>(raw);
      if (env && Date.now() <= env.expiresAtMs) {
        cacheMetrics.recordAuthorizationHit();
        return env.value;
      }
      return null;
    } catch {
      cacheMetrics.recordAdapterOutage();
      return null;
    }
  }

  async setAuthorizationScope(
    workspaceId: string,
    role: string,
    authorizedColIds: string[],
    scopeColIds?: string[]
  ): Promise<void> {
    const key = buildAuthorizationCacheKey(workspaceId, role, scopeColIds);
    const now = Date.now();
    const env: CacheEntryEnvelope<string[]> = {
      key,
      cacheClass: 'authorization',
      workspaceId,
      scopeKey: key,
      knowledgeVersion: this.getKnowledgeVersion(workspaceId),
      value: authorizedColIds,
      createdAtMs: now,
      expiresAtMs: now + this.policy.authorizationTtlMs,
    };
    try {
      await this.adapter.set(key, serializeCacheEnvelope(env), this.policy.authorizationTtlMs);
    } catch {
      cacheMetrics.recordAdapterOutage();
    }
  }

  /**
   * Explicitly invalidate all cached entries for a workspace (and bump its knowledge_version).
   */
  async invalidateWorkspace(workspaceId: string): Promise<{
    newKnowledgeVersion: number;
    keysRemoved: number;
  }> {
    const newKv = this.bumpKnowledgeVersion(workspaceId);
    let removed = 0;
    try {
      removed = await this.adapter.delByPrefix(`okeng:v1:ws:${workspaceId}:`);
      cacheMetrics.recordInvalidation(Math.max(1, removed));
    } catch {
      cacheMetrics.recordAdapterOutage();
    }
    return { newKnowledgeVersion: newKv, keysRemoved: removed };
  }
}
