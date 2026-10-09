// ============================================================================
// CACHE-001 §13: Cache Observability & Telemetry Metrics Collector
// ============================================================================

import { CacheMetricsSnapshot } from './cache.types';

class CacheMetricsCollector {
  private metrics: CacheMetricsSnapshot = {
    exactHits: 0,
    semanticHits: 0,
    negativeHits: 0,
    retrievalHits: 0,
    authorizationHits: 0,
    misses: 0,
    invalidations: 0,
    knowledgeVersionBumps: 0,
    stampedesPrevented: 0,
    adapterOutages: 0,
    llmCallsAvoided: 0,
    tokensAvoided: 0,
  };

  recordExactHit(tokensSaved = 140): void {
    this.metrics.exactHits += 1;
    this.metrics.llmCallsAvoided += 1;
    this.metrics.tokensAvoided += tokensSaved;
  }

  recordSemanticHit(tokensSaved = 140): void {
    this.metrics.semanticHits += 1;
    this.metrics.llmCallsAvoided += 1;
    this.metrics.tokensAvoided += tokensSaved;
  }

  recordNegativeHit(): void {
    this.metrics.negativeHits += 1;
    this.metrics.llmCallsAvoided += 1;
  }

  recordRetrievalHit(): void {
    this.metrics.retrievalHits += 1;
  }

  recordAuthorizationHit(): void {
    this.metrics.authorizationHits += 1;
  }

  recordMiss(): void {
    this.metrics.misses += 1;
  }

  recordInvalidation(count = 1): void {
    this.metrics.invalidations += count;
  }

  recordKnowledgeVersionBump(): void {
    this.metrics.knowledgeVersionBumps += 1;
  }

  recordStampedePrevented(sharedCallers = 1): void {
    this.metrics.stampedesPrevented += sharedCallers;
    this.metrics.llmCallsAvoided += sharedCallers;
  }

  recordAdapterOutage(): void {
    this.metrics.adapterOutages += 1;
  }

  snapshot(): CacheMetricsSnapshot {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      exactHits: 0,
      semanticHits: 0,
      negativeHits: 0,
      retrievalHits: 0,
      authorizationHits: 0,
      misses: 0,
      invalidations: 0,
      knowledgeVersionBumps: 0,
      stampedesPrevented: 0,
      adapterOutages: 0,
      llmCallsAvoided: 0,
      tokensAvoided: 0,
    };
  }
}

export const cacheMetrics = new CacheMetricsCollector();
