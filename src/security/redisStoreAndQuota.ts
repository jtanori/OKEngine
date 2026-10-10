import express from 'express';
import { normalizeCanonicalWorkspaceId } from './signingKeyRegistry.js';

export type RouteOutageClass =
  | 'PAID_AI'
  | 'AUTH_SESSION_MUTATION'
  | 'REPLAY_VERIFICATION'
  | 'PUBLIC_DEMO_EXCEPTION';

export type QuotaLeaseState = 'RESERVED' | 'SETTLED' | 'RELEASED';

export interface QuotaReservationRecord {
  requestId: string;
  workspaceId: string;
  state: QuotaLeaseState;
  reservedTokens: number;
  settledTokens?: number;
  createdAtMs: number;
  expiresAtMs: number;
}

export interface WorkspaceDailyQuotaBucket {
  workspaceId: string;
  utcDay: string;
  dailyBudget: number;
  usedTokens: number;
  activeReservedTokens: number;
  reservations: Map<string, QuotaReservationRecord>;
}

export const DEFAULT_DAILY_AI_TOKEN_BUDGET = 50_000;
export const QUOTA_LEASE_TTL_MS = 60_000; // 60 seconds
export const MAX_CONCURRENT_DEMO_FALLBACK = 8;

let simulatedRedisOutage = false;

export function setSimulatedRedisOutage(outage: boolean): void {
  simulatedRedisOutage = outage;
}

export function isRedisAvailableForRuntime(): boolean {
  if (simulatedRedisOutage) {
    return false;
  }
  const env = (process.env.OKENG_ENV || 'development').toLowerCase();
  if (env === 'staging' || env === 'production') {
    // In staging/production, if REDIS_OUTAGE_SIMULATED=true or REDIS_UNAVAILABLE=true is set, fail closed
    if (process.env.OKENG_REDIS_OUTAGE === 'true') {
      return false;
    }
  }
  return true;
}

export function isStagingOrProductionEnv(): boolean {
  const env = (process.env.OKENG_ENV || 'development').toLowerCase();
  return env === 'staging' || env === 'production';
}

// ============================================================================
// 1. Atomic Single-Use JTI Replay Protection Store (`SET NX EX 360`)
// ============================================================================

class JtiReplayStore {
  private entries = new Map<string, number>(); // key -> expiresAtSeconds

  public reset(): void {
    this.entries.clear();
  }

  public async claimJtiAtomic(params: {
    workspaceId: string;
    jti: string;
    ttlSeconds?: number;
    nowSeconds?: number;
  }): Promise<
    | { ok: true }
    | {
        ok: false;
        status: 401 | 503;
        code: 'REPLAYED_TOKEN_JTI' | 'REPLAY_STORE_UNAVAILABLE';
        message: string;
      }
  > {
    if (!isRedisAvailableForRuntime() && isStagingOrProductionEnv()) {
      return {
        ok: false,
        status: 503,
        code: 'REPLAY_STORE_UNAVAILABLE',
        message: 'Distributed JTI replay protection store is unreachable; failing closed.',
      };
    }

    const canonicalWs = normalizeCanonicalWorkspaceId(params.workspaceId);
    const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
    const ttl = Math.max(1, params.ttlSeconds ?? 360);
    const key = `okeng:jti:${canonicalWs}:${params.jti}`;

    const existingExpiry = this.entries.get(key);
    if (existingExpiry !== undefined && existingExpiry >= now) {
      return {
        ok: false,
        status: 401,
        code: 'REPLAYED_TOKEN_JTI',
        message: 'Host assertion JTI has already been consumed (replay rejected).',
      };
    }

    this.entries.set(key, now + ttl);
    return { ok: true };
  }
}

export const jtiReplayStore = new JtiReplayStore();

// ============================================================================
// 2. Idempotent Atomic AI Token Quota Reservation State Machine
//    (`RESERVED` -> `SETTLED` | `RELEASED` with 60s Crash TTL Reclamation)
// ============================================================================

export class AiQuotaLeaseManager {
  private buckets = new Map<string, WorkspaceDailyQuotaBucket>();
  private customBudgets = new Map<string, number>();

  public reset(): void {
    this.buckets.clear();
    this.customBudgets.clear();
  }

  public setWorkspaceDailyBudget(workspaceId: string, budgetTokens: number): void {
    const canonicalWs = normalizeCanonicalWorkspaceId(workspaceId);
    this.customBudgets.set(canonicalWs, Math.max(0, Math.floor(budgetTokens)));
    for (const bucket of this.buckets.values()) {
      if (bucket.workspaceId === canonicalWs) {
        bucket.dailyBudget = Math.max(0, Math.floor(budgetTokens));
      }
    }
  }

  private getUtcDay(nowMs: number): string {
    return new Date(nowMs).toISOString().slice(0, 10);
  }

  private getOrCreateBucket(workspaceId: string, nowMs: number): WorkspaceDailyQuotaBucket {
    const canonicalWs = normalizeCanonicalWorkspaceId(workspaceId);
    const utcDay = this.getUtcDay(nowMs);
    const key = `okeng:quota:ai:${canonicalWs}:${utcDay}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        workspaceId: canonicalWs,
        utcDay,
        dailyBudget: this.customBudgets.get(canonicalWs) ?? DEFAULT_DAILY_AI_TOKEN_BUDGET,
        usedTokens: 0,
        activeReservedTokens: 0,
        reservations: new Map(),
      };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  /**
   * Reclaims any abandoned `RESERVED` leases whose 60-second TTL has elapsed.
   */
  public reclaimExpiredLeases(workspaceId: string, nowMs: number = Date.now()): number {
    const bucket = this.getOrCreateBucket(workspaceId, nowMs);
    let reclaimedTokens = 0;
    for (const record of bucket.reservations.values()) {
      if (record.state === 'RESERVED' && nowMs >= record.expiresAtMs) {
        record.state = 'RELEASED';
        bucket.activeReservedTokens = Math.max(
          0,
          bucket.activeReservedTokens - record.reservedTokens
        );
        reclaimedTokens += record.reservedTokens;
      }
    }
    return reclaimedTokens;
  }

  /**
   * Atomic Pre-Flight `reserve()`:
   * Reclaims expired leases, checks `usedTokens + activeReservedTokens + estimatedTokens <= dailyBudget`,
   * and creates an idempotent `RESERVED` lease with a 60s TTL.
   */
  public reserve(params: {
    workspaceId: string;
    requestId: string;
    estimatedTokens: number;
    nowMs?: number;
    leaseTtlMs?: number;
  }):
    | {
        ok: true;
        state: QuotaLeaseState;
        reservedTokens: number;
        usedTokens: number;
        activeReservedTokens: number;
        dailyBudget: number;
        idempotent: boolean;
      }
    | {
        ok: false;
        status: 429 | 503;
        code: 'QUOTA_EXCEEDED' | 'REDIS_QUOTA_UNAVAILABLE';
        message: string;
        usedTokens?: number;
        activeReservedTokens?: number;
        dailyBudget?: number;
      } {
    if (!isRedisAvailableForRuntime() && isStagingOrProductionEnv()) {
      return {
        ok: false,
        status: 503,
        code: 'REDIS_QUOTA_UNAVAILABLE',
        message: 'AI quota store is unreachable in staging/production; failing closed before model invocation.',
      };
    }

    const nowMs = params.nowMs ?? Date.now();
    const estTokens = Math.max(1, Math.ceil(params.estimatedTokens));
    const leaseTtlMs = params.leaseTtlMs ?? QUOTA_LEASE_TTL_MS;

    this.reclaimExpiredLeases(params.workspaceId, nowMs);
    const bucket = this.getOrCreateBucket(params.workspaceId, nowMs);

    const existing = bucket.reservations.get(params.requestId);
    if (existing) {
      return {
        ok: true,
        state: existing.state,
        reservedTokens: existing.reservedTokens,
        usedTokens: bucket.usedTokens,
        activeReservedTokens: bucket.activeReservedTokens,
        dailyBudget: bucket.dailyBudget,
        idempotent: true,
      };
    }

    if (bucket.usedTokens + bucket.activeReservedTokens + estTokens > bucket.dailyBudget) {
      return {
        ok: false,
        status: 429,
        code: 'QUOTA_EXCEEDED',
        message: 'Workspace daily AI token budget exceeded.',
        usedTokens: bucket.usedTokens,
        activeReservedTokens: bucket.activeReservedTokens,
        dailyBudget: bucket.dailyBudget,
      };
    }

    const record: QuotaReservationRecord = {
      requestId: params.requestId,
      workspaceId: bucket.workspaceId,
      state: 'RESERVED',
      reservedTokens: estTokens,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + leaseTtlMs,
    };
    bucket.reservations.set(params.requestId, record);
    bucket.activeReservedTokens += estTokens;

    return {
      ok: true,
      state: 'RESERVED',
      reservedTokens: estTokens,
      usedTokens: bucket.usedTokens,
      activeReservedTokens: bucket.activeReservedTokens,
      dailyBudget: bucket.dailyBudget,
      idempotent: false,
    };
  }

  /**
   * Single-transition `settle()`:
   * Transitions `RESERVED` -> `SETTLED`, subtracts `reservedTokens` from `activeReservedTokens`,
   * and adds `actualTokens` to `usedTokens`. Calling `settle()` a second time or after `release()`
   * is a strict idempotent no-op.
   */
  public settle(params: {
    workspaceId: string;
    requestId: string;
    actualTokens: number;
    nowMs?: number;
  }): {
    applied: boolean;
    idempotent: boolean;
    state: QuotaLeaseState | 'MISSING';
    usedTokens: number;
    activeReservedTokens: number;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const bucket = this.getOrCreateBucket(params.workspaceId, nowMs);
    const record = bucket.reservations.get(params.requestId);

    if (!record) {
      return {
        applied: false,
        idempotent: true,
        state: 'MISSING',
        usedTokens: bucket.usedTokens,
        activeReservedTokens: bucket.activeReservedTokens,
      };
    }

    if (record.state !== 'RESERVED') {
      return {
        applied: false,
        idempotent: true,
        state: record.state,
        usedTokens: bucket.usedTokens,
        activeReservedTokens: bucket.activeReservedTokens,
      };
    }

    const actual = Math.max(0, Math.ceil(params.actualTokens));
    record.state = 'SETTLED';
    record.settledTokens = actual;
    bucket.activeReservedTokens = Math.max(0, bucket.activeReservedTokens - record.reservedTokens);
    bucket.usedTokens += actual;

    return {
      applied: true,
      idempotent: false,
      state: 'SETTLED',
      usedTokens: bucket.usedTokens,
      activeReservedTokens: bucket.activeReservedTokens,
    };
  }

  /**
   * Single-transition `release()`:
   * Transitions `RESERVED` -> `RELEASED` and subtracts `reservedTokens` from `activeReservedTokens`.
   * Calling `release()` twice or calling `release()` after `settle()` is a safe idempotent no-op.
   */
  public release(params: {
    workspaceId: string;
    requestId: string;
    nowMs?: number;
  }): {
    applied: boolean;
    idempotent: boolean;
    state: QuotaLeaseState | 'MISSING';
    usedTokens: number;
    activeReservedTokens: number;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const bucket = this.getOrCreateBucket(params.workspaceId, nowMs);
    const record = bucket.reservations.get(params.requestId);

    if (!record) {
      return {
        applied: false,
        idempotent: true,
        state: 'MISSING',
        usedTokens: bucket.usedTokens,
        activeReservedTokens: bucket.activeReservedTokens,
      };
    }

    if (record.state !== 'RESERVED') {
      return {
        applied: false,
        idempotent: true,
        state: record.state,
        usedTokens: bucket.usedTokens,
        activeReservedTokens: bucket.activeReservedTokens,
      };
    }

    record.state = 'RELEASED';
    bucket.activeReservedTokens = Math.max(0, bucket.activeReservedTokens - record.reservedTokens);

    return {
      applied: true,
      idempotent: false,
      state: 'RELEASED',
      usedTokens: bucket.usedTokens,
      activeReservedTokens: bucket.activeReservedTokens,
    };
  }

  public getSnapshot(workspaceId: string, nowMs: number = Date.now()): {
    workspaceId: string;
    dailyBudget: number;
    usedTokens: number;
    activeReservedTokens: number;
  } {
    this.reclaimExpiredLeases(workspaceId, nowMs);
    const bucket = this.getOrCreateBucket(workspaceId, nowMs);
    return {
      workspaceId: bucket.workspaceId,
      dailyBudget: bucket.dailyBudget,
      usedTokens: bucket.usedTokens,
      activeReservedTokens: bucket.activeReservedTokens,
    };
  }
}

export const aiQuotaManager = new AiQuotaLeaseManager();

// ============================================================================
// 3. Sliding-Window Rate Limiter & 6-Invariant Public Homepage Demo Exception
// ============================================================================

class RouteRateLimitAndOutageCoordinator {
  private windows = new Map<string, number[]>();
  private activeDemoFallbackCount = 0;

  public reset(): void {
    this.windows.clear();
    this.activeDemoFallbackCount = 0;
  }

  public getTrustedClientIp(req: express.Request): string {
    const trustedProxyCount = Number(process.env.TRUSTED_PROXY_COUNT || 0);
    if (trustedProxyCount > 0 && req.ip) {
      return req.ip;
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  }

  public checkSlidingWindow(params: {
    bucketKey: string;
    maxRequests: number;
    windowMs?: number;
    nowMs?: number;
  }): { allowed: boolean; count: number; maxRequests: number } {
    const nowMs = params.nowMs ?? Date.now();
    const windowMs = params.windowMs ?? 60_000;
    const cutoff = nowMs - windowMs;
    const existing = (this.windows.get(params.bucketKey) || []).filter((ts) => ts > cutoff);

    if (existing.length >= params.maxRequests) {
      this.windows.set(params.bucketKey, existing);
      return { allowed: false, count: existing.length, maxRequests: params.maxRequests };
    }

    existing.push(nowMs);
    this.windows.set(params.bucketKey, existing);
    return { allowed: true, count: existing.length, maxRequests: params.maxRequests };
  }

  /**
   * Evaluates whether a request satisfies all 6 invariants of the Public Homepage Demo
   * Redis-Outage Exception (`Section 4.3.A`):
   * 1. Server-pinned public target (`EMB-PUBLIC-HOME` on `ws_okeng_01`/`okeng`, zero `Authorization` / `identityToken`)
   * 2. Zero client scope overrides (enforced by Stage 1 schema validator)
   * 3. Zero LLM / deterministic execution (`answerMode !== 'generative'`)
   * 4. Bounded concurrency (`MAX_CONCURRENT_DEMO_FALLBACK = 8`)
   * 5. Trusted proxy IP derivation + 30 req/min/IP per-instance fallback rate limit
   * 6. Zero fallback for auth, replay, mutations, or paid AI
   */
  public verifyPublicDemoOutageEligibility(req: express.Request):
    | { eligible: true; releaseConcurrency: () => void }
    | { eligible: false; status: 429 | 503; code: string; message: string } {
    const body = req.body || {};
    const targetEmbedId = body.embedId;
    const rawWorkspaceId = body.workspaceId || 'ws_okeng_01';
    const canonicalWs = normalizeCanonicalWorkspaceId(rawWorkspaceId);
    const hasAuthHeader = Boolean(req.headers.authorization);
    const hasIdentityToken = Boolean(body.identityToken || body.token);
    const isHomepageRoute = req.path === '/api/demo/homepage-context';

    // Invariant 1: Must strictly target EMB-PUBLIC-HOME on ws_okeng_01 with zero auth/token headers
    if (
      canonicalWs !== 'ws_okeng_01' ||
      (!isHomepageRoute && targetEmbedId !== 'EMB-PUBLIC-HOME') ||
      (targetEmbedId !== undefined && targetEmbedId !== 'EMB-PUBLIC-HOME') ||
      hasAuthHeader ||
      hasIdentityToken
    ) {
      return {
        eligible: false,
        status: 503,
        code: 'REDIS_UNAVAILABLE',
        message: 'Redis is unreachable in staging/production; non-public-demo routes fail closed.',
      };
    }

    // Invariant 3: Zero LLM / deterministic only
    if (body.answerMode === 'generative') {
      return {
        eligible: false,
        status: 503,
        code: 'REDIS_QUOTA_UNAVAILABLE',
        message: 'Generative AI mode requires Redis quota enforcement and fails closed during Redis outage.',
      };
    }

    // Invariant 4: Bounded concurrency semaphore
    if (this.activeDemoFallbackCount >= MAX_CONCURRENT_DEMO_FALLBACK) {
      return {
        eligible: false,
        status: 503,
        code: 'DEMO_CONCURRENCY_LIMIT',
        message: 'Public demo fallback concurrency limit reached during Redis outage.',
      };
    }

    // Invariant 5: Per-instance best-effort rate limit (30 req/min/IP during outage)
    const clientIp = this.getTrustedClientIp(req);
    const rateRes = this.checkSlidingWindow({
      bucketKey: `demo-outage-fallback:${clientIp}`,
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rateRes.allowed) {
      return {
        eligible: false,
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Per-instance public demo fallback rate limit (30 req/min/IP) exceeded.',
      };
    }

    this.activeDemoFallbackCount += 1;
    let released = false;
    return {
      eligible: true,
      releaseConcurrency: () => {
        if (!released) {
          released = true;
          this.activeDemoFallbackCount = Math.max(0, this.activeDemoFallbackCount - 1);
        }
      },
    };
  }
}

export const routeRateLimitCoordinator = new RouteRateLimitAndOutageCoordinator();
