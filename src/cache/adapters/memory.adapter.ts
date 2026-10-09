// ============================================================================
// CACHE-001 §9: Process-Local In-Memory Cache Adapter (TTL + Prefix Indexing)
// Used automatically when REDIS_URL is not configured or unreachable.
// ============================================================================

import { CacheAdapter } from './cache.adapter';

interface MemoryRecord {
  serializedValue: string;
  expiresAtMs: number;
}

export class MemoryCacheAdapter implements CacheAdapter {
  public readonly backendName = 'memory' as const;
  private store = new Map<string, MemoryRecord>();
  private simulatedOutage = false;

  setSimulatedOutage(outage: boolean): void {
    this.simulatedOutage = outage;
  }

  isHealthy(): boolean {
    return !this.simulatedOutage;
  }

  async get(key: string): Promise<string | null> {
    if (this.simulatedOutage) {
      throw new Error('CACHE_ADAPTER_OUTAGE: Memory adapter simulated outage');
    }
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAtMs) {
      this.store.delete(key);
      return null;
    }
    return entry.serializedValue;
  }

  async set(key: string, serializedValue: string, ttlMs: number): Promise<void> {
    if (this.simulatedOutage) {
      throw new Error('CACHE_ADAPTER_OUTAGE: Memory adapter simulated outage');
    }
    this.store.set(key, {
      serializedValue,
      expiresAtMs: Date.now() + Math.max(1, ttlMs),
    });
  }

  async del(key: string): Promise<number> {
    if (this.simulatedOutage) {
      throw new Error('CACHE_ADAPTER_OUTAGE: Memory adapter simulated outage');
    }
    return this.store.delete(key) ? 1 : 0;
  }

  async delByPrefix(prefix: string): Promise<number> {
    if (this.simulatedOutage) {
      throw new Error('CACHE_ADAPTER_OUTAGE: Memory adapter simulated outage');
    }
    let deleted = 0;
    for (const k of Array.from(this.store.keys())) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
        deleted++;
      }
    }
    return deleted;
  }

  async listKeysByPrefix(prefix: string): Promise<string[]> {
    if (this.simulatedOutage) {
      throw new Error('CACHE_ADAPTER_OUTAGE: Memory adapter simulated outage');
    }
    const now = Date.now();
    const matched: string[] = [];
    for (const [k, v] of this.store.entries()) {
      if (now > v.expiresAtMs) {
        this.store.delete(k);
        continue;
      }
      if (k.startsWith(prefix)) {
        matched.push(k);
      }
    }
    return matched;
  }

  async clearAll(): Promise<void> {
    this.store.clear();
  }
}
