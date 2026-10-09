// ============================================================================
// CACHE-001: Cache Module Factory
// Automatically selects RedisAdapter when REDIS_URL is configured and reachable,
// and falls back to MemoryCacheAdapter otherwise.
// ============================================================================

import { CacheService } from './cache.service';
import { MemoryCacheAdapter } from './adapters/memory.adapter';
import { RedisCacheAdapter } from './adapters/redis.adapter';
import { cacheMetrics } from './cache.metrics';

const redisUrl =
  (typeof process !== 'undefined' && process.env?.REDIS_URL) || '';
const cacheBackendPref =
  (typeof process !== 'undefined' && process.env?.CACHE_BACKEND) || 'auto';

function createConfiguredCacheService(): CacheService {
  if (
    (cacheBackendPref === 'redis' || cacheBackendPref === 'auto') &&
    redisUrl &&
    redisUrl.startsWith('redis')
  ) {
    return new CacheService(new RedisCacheAdapter(redisUrl));
  }
  return new CacheService(new MemoryCacheAdapter());
}

export const cacheService = createConfiguredCacheService();
export { cacheMetrics, MemoryCacheAdapter, RedisCacheAdapter, CacheService };
export * from './cache.types';
export * from './cache.keys';

