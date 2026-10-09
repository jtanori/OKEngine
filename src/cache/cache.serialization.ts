// ============================================================================
// CACHE-001 §9: Safe Cache Serialization & Deserialization
// ============================================================================

import { CacheEntryEnvelope } from './cache.types';

export function serializeCacheEnvelope<T>(envelope: CacheEntryEnvelope<T>): string {
  return JSON.stringify(envelope);
}

export function deserializeCacheEnvelope<T>(raw: string | null): CacheEntryEnvelope<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEntryEnvelope<T>;
    if (!parsed || typeof parsed.expiresAtMs !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}
