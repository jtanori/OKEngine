import Redis from 'ioredis';
import { CacheStorageAdapter } from '../cache.types';

export class RedisUnavailableError extends Error {
  public readonly status = 503;
  public readonly code: string;

  constructor(message: string, code = 'REDIS_UNAVAILABLE') {
    super(message);
    this.name = 'RedisUnavailableError';
    this.code = code;
  }
}

export const LUA_SLIDING_WINDOW_RATE_LIMIT = `
local key = KEYS[1]
local nowMs = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local memberId = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, '-inf', nowMs - windowMs)
local currentCount = redis.call('ZCARD', key)
if currentCount >= maxRequests then
  return {0, currentCount}
end
redis.call('ZADD', key, nowMs, memberId)
redis.call('PEXPIRE', key, windowMs)
return {1, currentCount + 1}
`;

export const LUA_QUOTA_RESERVE_LEASE = `
local quotaKey = KEYS[1]
local activeZsetKey = KEYS[2]
local resvKey = KEYS[3]
local requestId = ARGV[1]
local estTokens = tonumber(ARGV[2])
local dailyBudget = tonumber(ARGV[3])
local nowMs = tonumber(ARGV[4])
local leaseTtlMs = tonumber(ARGV[5])

-- Reclaim expired leases
local expiredIds = redis.call('ZRANGEBYSCORE', activeZsetKey, '-inf', nowMs)
for _, expId in ipairs(expiredIds) do
  local expResvKey = 'okeng:resv:' .. expId
  local state = redis.call('HGET', expResvKey, 'state')
  local reserved = tonumber(redis.call('HGET', expResvKey, 'reserved') or '0')
  if state == 'RESERVED' then
    redis.call('HSET', expResvKey, 'state', 'RELEASED')
    local curActive = tonumber(redis.call('HGET', quotaKey, 'activeReserved') or '0')
    redis.call('HSET', quotaKey, 'activeReserved', math.max(0, curActive - reserved))
  end
  redis.call('ZREM', activeZsetKey, expId)
end

-- Check idempotency if requestId already exists
if redis.call('EXISTS', resvKey) == 1 then
  local existingState = redis.call('HGET', resvKey, 'state')
  local existingReserved = tonumber(redis.call('HGET', resvKey, 'reserved') or '0')
  return {1, existingState, existingReserved}
end

local usedTokens = tonumber(redis.call('HGET', quotaKey, 'used') or '0')
local activeReserved = tonumber(redis.call('HGET', quotaKey, 'activeReserved') or '0')

if (usedTokens + activeReserved + estTokens) > dailyBudget then
  return {0, 'QUOTA_EXCEEDED', usedTokens + activeReserved}
end

local expiresAtMs = nowMs + leaseTtlMs
redis.call('HSET', resvKey, 'state', 'RESERVED', 'reserved', estTokens, 'expiresAt', expiresAtMs)
redis.call('PEXPIRE', resvKey, leaseTtlMs * 2)
redis.call('HSET', quotaKey, 'activeReserved', activeReserved + estTokens)
redis.call('EXPIRE', quotaKey, 86400)
redis.call('ZADD', activeZsetKey, expiresAtMs, requestId)
redis.call('EXPIRE', activeZsetKey, 86400)

return {1, 'RESERVED', estTokens}
`;

export const LUA_QUOTA_SETTLE_LEASE = `
local quotaKey = KEYS[1]
local activeZsetKey = KEYS[2]
local resvKey = KEYS[3]
local requestId = ARGV[1]
local actualTokens = math.max(0, tonumber(ARGV[2]))

local state = redis.call('HGET', resvKey, 'state')
if state ~= 'RESERVED' then
  return {0, state or 'MISSING'}
end

local reserved = tonumber(redis.call('HGET', resvKey, 'reserved') or '0')
local activeReserved = tonumber(redis.call('HGET', quotaKey, 'activeReserved') or '0')
local usedTokens = tonumber(redis.call('HGET', quotaKey, 'used') or '0')

redis.call('HSET', resvKey, 'state', 'SETTLED', 'settledTokens', actualTokens)
redis.call('HSET', quotaKey, 'activeReserved', math.max(0, activeReserved - reserved))
redis.call('HSET', quotaKey, 'used', usedTokens + actualTokens)
redis.call('ZREM', activeZsetKey, requestId)

return {1, 'SETTLED', usedTokens + actualTokens}
`;

export const LUA_QUOTA_RELEASE_LEASE = `
local quotaKey = KEYS[1]
local activeZsetKey = KEYS[2]
local resvKey = KEYS[3]
local requestId = ARGV[1]

local state = redis.call('HGET', resvKey, 'state')
if state ~= 'RESERVED' then
  return {0, state or 'MISSING'}
end

local reserved = tonumber(redis.call('HGET', resvKey, 'reserved') or '0')
local activeReserved = tonumber(redis.call('HGET', quotaKey, 'activeReserved') or '0')

redis.call('HSET', resvKey, 'state', 'RELEASED')
redis.call('HSET', quotaKey, 'activeReserved', math.max(0, activeReserved - reserved))
redis.call('ZREM', activeZsetKey, requestId)

return {1, 'RELEASED', math.max(0, activeReserved - reserved)}
`;

/**
 * Production-grade ioredis adapter with strict 500ms command/connect timeout
 * and zero silent in-memory fallback.
 */
export class RedisCacheAdapter implements CacheStorageAdapter {
  private readonly url: string;
  private readonly client: Redis;

  constructor(url: string) {
    this.url = url;
    this.client = new Redis(url, {
      connectTimeout: 500,
      commandTimeout: 500,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    // Suppress unhandled error events on background socket rejections
    this.client.on('error', () => {
      // Handled per command via promise rejection -> RedisUnavailableError
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'ready') return;
    try {
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new RedisUnavailableError('Redis connection timeout (500ms)')), 500)
        ),
      ]);
    } catch (err: any) {
      throw new RedisUnavailableError(
        `Redis unreachable at ${this.redactUrl(this.url)}: ${err?.message || 'connection failed'}`
      );
    }
  }

  private redactUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.password) parsed.password = 'REDACTED';
      return parsed.toString();
    } catch {
      return 'redis://<redacted>';
    }
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnected();
    try {
      return await this.client.get(key);
    } catch (err: any) {
      throw new RedisUnavailableError(`Redis GET failed: ${err?.message || 'unknown error'}`);
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.ensureConnected();
    try {
      const ttl = Math.max(1, Math.floor(ttlSeconds));
      await this.client.set(key, value, 'EX', ttl);
    } catch (err: any) {
      throw new RedisUnavailableError(`Redis SET failed: ${err?.message || 'unknown error'}`);
    }
  }

  async setNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    await this.ensureConnected();
    try {
      const ttl = Math.max(1, Math.floor(ttlSeconds));
      const res = await this.client.set(key, value, 'EX', ttl, 'NX');
      return res === 'OK';
    } catch (err: any) {
      throw new RedisUnavailableError(
        `Redis SET NX EX failed: ${err?.message || 'unknown error'}`,
        'REPLAY_STORE_UNAVAILABLE'
      );
    }
  }

  async del(key: string): Promise<void> {
    await this.ensureConnected();
    try {
      await this.client.del(key);
    } catch (err: any) {
      throw new RedisUnavailableError(`Redis DEL failed: ${err?.message || 'unknown error'}`);
    }
  }

  async delByPrefix(prefix: string): Promise<number> {
    await this.ensureConnected();
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length === 0) return 0;
      return await this.client.del(...keys);
    } catch (err: any) {
      throw new RedisUnavailableError(`Redis DEL_BY_PREFIX failed: ${err?.message || 'unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    await this.ensureConnected();
    try {
      await this.client.flushdb();
    } catch (err: any) {
      throw new RedisUnavailableError(`Redis FLUSHDB failed: ${err?.message || 'unknown error'}`);
    }
  }

  async size(): Promise<number> {
    await this.ensureConnected();
    try {
      return await this.client.dbsize();
    } catch (err: any) {
      throw new RedisUnavailableError(`Redis DBSIZE failed: ${err?.message || 'unknown error'}`);
    }
  }

  async ping(): Promise<boolean> {
    await this.ensureConnected();
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  getBackendName(): string {
    return 'redis-ioredis';
  }
}
