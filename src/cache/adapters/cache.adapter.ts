// ============================================================================
// CACHE-001 §9: Common Cache Adapter Contract
// Application code depends only on CacheService, never directly on Redis.
// ============================================================================

export interface CacheAdapter {
  readonly backendName: 'redis' | 'memory';
  isHealthy(): boolean;
  get(key: string): Promise<string | null>;
  set(key: string, serializedValue: string, ttlMs: number): Promise<void>;
  del(key: string): Promise<number>;
  delByPrefix(prefix: string): Promise<number>;
  listKeysByPrefix(prefix: string): Promise<string[]>;
  clearAll(): Promise<void>;
}
