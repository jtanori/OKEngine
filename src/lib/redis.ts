// src/lib/redis.ts — Redis optional + in-memory fallback (DB-REDIS-01, OPS-REDIS-01)
import { getEnv } from './env';

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: { EX?: number }) => Promise<void>;
  del: (key: string) => Promise<void>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<void>;
  quit: () => Promise<void>;
  ping: () => Promise<string>;
};

let redisClient: RedisClient | null = null;
let memoryStore: Map<string, { value: string; expiresAt?: number }> = new Map();
let warnedFallback = false;

function createMemoryClient(): RedisClient {
  if (!warnedFallback) {
    console.warn('[redis] REDIS_URL not set, using in-memory store — not suitable for production multi-instance');
    warnedFallback = true;
  }

  return {
    async get(key: string) {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key: string, value: string, opts?: { EX?: number }) {
      const expiresAt = opts?.EX ? Date.now() + opts.EX * 1000 : undefined;
      memoryStore.set(key, { value, expiresAt });
    },
    async del(key: string) {
      memoryStore.delete(key);
    },
    async incr(key: string) {
      const current = memoryStore.get(key);
      const num = current ? parseInt(current.value, 10) || 0 : 0;
      const next = num + 1;
      const expiresAt = current?.expiresAt;
      memoryStore.set(key, { value: String(next), expiresAt });
      return next;
    },
    async expire(key: string, seconds: number) {
      const entry = memoryStore.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + seconds * 1000;
      }
    },
    async quit() {
      memoryStore.clear();
    },
    async ping() {
      return 'PONG';
    },
  };
}

export async function getRedis(): Promise<RedisClient> {
  if (redisClient) return redisClient;

  const env = getEnv();

  if (!env.REDIS_URL) {
    redisClient = createMemoryClient();
    return redisClient;
  }

  try {
    // Use node-redis if available, else fallback to memory
    // Dynamic import to avoid hard dependency if not installed
    const { createClient } = await import('redis');
    const client = createClient({ url: env.REDIS_URL });
    client.on('error', (err: any) => console.error('[redis] Client error', err));
    await client.connect();
    console.log('[redis] Connected');

    redisClient = {
      async get(key: string) {
        return client.get(key);
      },
      async set(key: string, value: string, opts?: { EX?: number }) {
        if (opts?.EX) await client.set(key, value, { EX: opts.EX });
        else await client.set(key, value);
      },
      async del(key: string) {
        await client.del(key);
      },
      async incr(key: string) {
        return client.incr(key);
      },
      async expire(key: string, seconds: number) {
        await client.expire(key, seconds);
      },
      async quit() {
        await client.quit();
      },
      async ping() {
        return client.ping();
      },
    };

    return redisClient;
  } catch (err: any) {
    console.warn(`[redis] Failed to connect to REDIS_URL, falling back to memory: ${err.message}`);
    redisClient = createMemoryClient();
    return redisClient;
  }
}

export async function checkRedis(): Promise<{ up: boolean; mode: 'redis' | 'fallback' | 'down'; error?: string }> {
  try {
    const env = getEnv();
    if (!env.REDIS_URL) {
      return { up: true, mode: 'fallback' };
    }
    const client = await getRedis();
    await client.ping();
    // If we are using memory fallback despite REDIS_URL present, it's down
    if (memoryStore.size > 0 && warnedFallback) {
      // Actually check if client is memory
      return { up: true, mode: 'fallback' };
    }
    return { up: true, mode: 'redis' };
  } catch (err: any) {
    return { up: false, mode: 'down', error: err.message };
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {}
    redisClient = null;
    memoryStore.clear();
    console.log('[redis] Closed');
  }
}
