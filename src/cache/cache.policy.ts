// ============================================================================
// CACHE-001 §5 & §11: TTL, Negative Cache, and Semantic Similarity Policies
// ============================================================================

export interface CachePolicyConfig {
  answerTtlMs: number;
  negativeAnswerTtlMs: number;
  retrievalTtlMs: number;
  authorizationTtlMs: number;
  documentTtlMs: number;
  semanticSimilarityThreshold: number;
}

export const DEFAULT_CACHE_POLICY: CachePolicyConfig = {
  // Class B: Exact / Semantic Answer Cache (4 hours)
  answerTtlMs: 4 * 60 * 60 * 1000,
  // Negative Cache for NO_SUPPORTED_ANSWER (10 minutes)
  negativeAnswerTtlMs: 10 * 60 * 1000,
  // Class A: Retrieval Cache (30 minutes)
  retrievalTtlMs: 30 * 60 * 1000,
  // Class D: Authorization Scope Cache (3 minutes)
  authorizationTtlMs: 3 * 60 * 1000,
  // Class C: Document AST Cache (12 hours)
  documentTtlMs: 12 * 60 * 60 * 1000,
  // Conservative semantic similarity threshold (CACHE-008)
  semanticSimilarityThreshold: 0.85,
};
