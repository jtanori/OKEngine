// ============================================================================
// CACHE-001: Multi-Layer Knowledge & Answer Cache Types
// ============================================================================

import {
  SupportedLanguage,
  EmbedIdentity,
  AuthorizationScope,
} from '../types';
import { AnswerMode } from '../services/engine/responseCompiler';

export type CacheClass = 'answer' | 'retrieval' | 'document' | 'authorization' | 'session';

export type CacheHitStatus = 'HIT' | 'SEMANTIC_HIT' | 'NEGATIVE_HIT' | 'MISS' | 'BYPASSED';

export type RetrievalCacheKey = {
  embedId: string;
  authorizedCollectionIds: readonly string[]; // Deduplicated, sorted canonical order
  authorizationVersion: string;               // Who/what this Embed can authorize
  knowledgeVersion: number;                   // What knowledge exists in authorized universe
  query: string;
  retrievalParameters: Record<string, unknown>;
};

export type AnswerCacheKey = {
  embedId: string;
  identity: EmbedIdentity;
  authorizationScope: AuthorizationScope;
  authorizationVersion: string;
  knowledgeVersion: number;
  hostContext: Record<string, unknown>;
  conversationContext: Record<string, unknown>;
  responseLanguage: string;
  answerMode: AnswerMode;
  query: string;
};

export type SessionCacheKey = {
  sessionId: string;
  identity: EmbedIdentity;
  authorizationScope: AuthorizationScope;
  authorizationVersion: string;
  knowledgeVersion?: number;
};

export interface CacheKeyContext {
  workspaceId: string;
  embedId?: string;
  identity?: EmbedIdentity;
  authorizationScope?: AuthorizationScope;
  authorizationVersion?: string;
  authorizedCollectionIds: readonly string[] | string[];
  narrowedDocumentIds?: readonly string[] | string[];
  knowledgeVersion: number;
  currentUrl: string;
  responseLanguage: SupportedLanguage;
  answerMode: AnswerMode;
  question: string;
  bypassIfIncomplete?: boolean;
}

export interface CacheEntryEnvelope<T> {
  key: string;
  cacheClass: CacheClass;
  workspaceId: string;
  scopeKey: string;
  knowledgeVersion: number;
  responseLanguage?: SupportedLanguage;
  normalizedQuestion?: string;
  stemmedTokens?: string[];
  isNegative?: boolean;
  value: T;
  createdAtMs: number;
  expiresAtMs: number;
}

export interface CacheDecisionTelemetry {
  answerCache: CacheHitStatus;
  retrievalCache: 'HIT' | 'MISS' | 'SKIPPED';
  authorizationCache: 'HIT' | 'MISS';
  knowledgeVersion: number;
  semanticSimilarity?: number;
  llmStatus: 'SKIPPED_CACHE' | 'SKIPPED_DETERMINISTIC' | 'INVOKED';
  adapterBackend: 'redis' | 'memory' | 'degraded-outage';
  stampedeShared?: boolean;
}

export interface CacheMetricsSnapshot {
  exactHits: number;
  semanticHits: number;
  negativeHits: number;
  retrievalHits: number;
  authorizationHits: number;
  misses: number;
  invalidations: number;
  knowledgeVersionBumps: number;
  stampedesPrevented: number;
  adapterOutages: number;
  llmCallsAvoided: number;
  tokensAvoided: number;
}
