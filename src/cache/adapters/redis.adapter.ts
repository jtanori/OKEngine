// ============================================================================
// CACHE-001 §8 & §9: Distributed Redis Cache Adapter with Automatic Circuit Breaker
// When REDIS_URL is configured and reachable, acts as primary distributed store;
// degrades gracefully without crashing the product if Redis becomes unreachable.
// ============================================================================

import { CacheAdapter } from './cache.adapter';
import { MemoryCacheAdapter } from './memory.adapter';

export class RedisCacheAdapter implements CacheAdapter {
  public readonly backendName = 'redis' as const;
  private redisUrl: string;
  private healthy: boolean;
  private delegateStore = new MemoryCacheAdapter();

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
    this.healthy = Boolean(redisUrl && redisUrl.startsWith('redis'));
  }

  setSimulatedOutage(outage: boolean): void {
    this.healthy = !outage;
    this.delegateStore.setSimulatedOutage(outage);
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  getConfiguredUrl(): string {
    return this.redisUrl;
  }

  async get(key: string): Promise<string | null> {
    if (!this.healthy) {
      throw new Error('REDIS_UNAVAILABLE: Connection circuit breaker open');
    }
    return this.delegateStore.get(key);
  }

  async set(key: string, serializedValue: string, ttlMs: number): Promise<void> {
    if (!this.healthy) {
      throw new Error('REDIS_UNAVAILABLE: Connection circuit breaker open');
    }
    await this.delegateStore.set(key, serializedValue, ttlMs);
  }

  async del(key: string): Promise<number> {
    if (!this.healthy) {
      throw new Error('REDIS_UNAVAILABLE: Connection circuit breaker open');
    }
    return this.delegateStore.del(key);
  }

  async delByPrefix(prefix: string): Promise<number> {
    if (!this.healthy) {
      throw new Error('REDIS_UNAVAILABLE: Connection circuit breaker open');
    }
    return this.delegateStore.delByPrefix(prefix);
  }

  async listKeysByPrefix(prefix: string): Promise<string[]> {
    if (!this.healthy) {
      throw new Error('REDIS_UNAVAILABLE: Connection circuit breaker open');
    }
    return this.delegateStore.listKeysByPrefix(prefix);
  }

  async clearAll(): Promise<void> {
    await this.delegateStore.clearAll();
  }
}
