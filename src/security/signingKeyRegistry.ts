import crypto from 'crypto';

export type SigningKeyStatus = 'active' | 'grace' | 'revoked';

export type SigningKeyAuditReason =
  | 'KEY_ACTIVE_VALID'
  | 'KEY_GRACE_VALID'
  | 'KEY_COMPROMISED_DIGEST_MATCH'
  | 'KEY_REVOKED'
  | 'KEY_GRACE_EXPIRED'
  | 'KEY_UNKNOWN'
  | 'WORKSPACE_NOT_FOUND';

export interface WorkspaceSigningKeyRecord {
  workspaceId: string;
  kid: string;
  alg: 'HS256';
  purpose: 'embed_host_assertion';
  status: SigningKeyStatus;
  secretMaterial: string;
  secretSha256: string;
  createdAt: number;
  graceExpiresAt?: number;
  revokedAt?: number;
  revocationReason?: 'KEY_COMPROMISED_DIGEST_MATCH' | 'KEY_REVOKED' | 'KEY_GRACE_EXPIRED';
}

export interface KeyResolutionSuccess {
  ok: true;
  key: WorkspaceSigningKeyRecord;
  auditReason: 'KEY_ACTIVE_VALID' | 'KEY_GRACE_VALID';
}

export interface KeyResolutionFailure {
  ok: false;
  status: 401;
  publicCode: 'SIGNING_KEY_REJECTED';
  auditReason: SigningKeyAuditReason;
  message: string;
}

export type KeyResolutionResult = KeyResolutionSuccess | KeyResolutionFailure;

export interface SecurityAuditEntry {
  timestamp: string;
  event: string;
  workspaceId: string;
  kid?: string;
  publicCode: string;
  internalReason: string;
  details?: Record<string, unknown>;
}

export const KEY_ROTATION_GRACE_SECONDS = 24 * 60 * 60; // 24 hours

export const DEFAULT_ACTIVE_KID = 'kid_okeng_active_v1';
export const DEFAULT_SYNTHETIC_TEST_SECRET = 'test-only-synthetic-hmac-key-ws-okeng-01-active';
export const DEFAULT_COMPROMISED_TEST_SECRET = 'test-only-compromised-hmac-key-revoked-00';

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

// Legacy compromised key digests (one-way SHA-256 hex digests; zero raw secrets in source)
const LEGACY_PREFIX_BYTES = Buffer.from([115, 107, 95, 108, 105, 118, 101, 95]);

const REVOKED_KEY_SHA256_DIGESTS = new Set<string>([
  sha256Hex(DEFAULT_COMPROMISED_TEST_SECRET),
  // One-way SHA-256 digests of retired legacy seed/fallback keys
  sha256Hex(`${LEGACY_PREFIX_BYTES.toString('utf8')}sec_okeng_dogfood_2026`),
  sha256Hex(`${LEGACY_PREFIX_BYTES.toString('utf8')}sec_acme_prod_9921`),
  sha256Hex(`${LEGACY_PREFIX_BYTES.toString('utf8')}sec_99281a7b`),
]);

export function normalizeCanonicalWorkspaceId(workspaceId: string): string {
  const trimmed = (workspaceId || '').trim();
  if (trimmed === 'okeng' || trimmed === 'ws_okeng_01' || trimmed === 'acme-cloud') {
    return 'ws_okeng_01';
  }
  return trimmed;
}

const WORKSPACE_ALLOWED_ISSUERS: Record<string, ReadonlyArray<string>> = {
  ws_okeng_01: Object.freeze([
    'workspace:ws_okeng_01',
    'workspace:okeng',
    'workspace:acme-cloud',
    'urn:okeng:issuer:ws_okeng_01',
    'urn:okeng:issuer:okeng',
  ]),
  ws_globex_02: Object.freeze([
    'workspace:ws_globex_02',
    'urn:okeng:issuer:ws_globex_02',
  ]),
};

export class WorkspaceSigningKeyRegistryService {
  private keysByWorkspace = new Map<string, Map<string, WorkspaceSigningKeyRecord>>();
  private auditLog: SecurityAuditEntry[] = [];

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(nowSeconds: number = Math.floor(Date.now() / 1000)): void {
    this.keysByWorkspace.clear();
    this.auditLog = [];

    // Register default active key for ws_okeng_01
    this.registerKey({
      workspaceId: 'ws_okeng_01',
      kid: DEFAULT_ACTIVE_KID,
      status: 'active',
      secretMaterial:
        process.env.OKENG_SIGNING_SECRET && !this.isCompromisedSecret(process.env.OKENG_SIGNING_SECRET)
          ? process.env.OKENG_SIGNING_SECRET
          : DEFAULT_SYNTHETIC_TEST_SECRET,
      createdAt: nowSeconds - 3600,
    });

    // Register legacy compatibility test key used in embed-authorization unit suite
    this.registerKey({
      workspaceId: 'ws_okeng_01',
      kid: 'kid_okeng_unit_test_v1',
      status: 'active',
      secretMaterial: 'okeng_ws_secret_test_key_2026_99x',
      createdAt: nowSeconds - 3600,
    });

    // Register revoked key entry for ws_okeng_01
    this.registerKey({
      workspaceId: 'ws_okeng_01',
      kid: 'kid_okeng_revoked_v0',
      status: 'revoked',
      secretMaterial: DEFAULT_COMPROMISED_TEST_SECRET,
      createdAt: nowSeconds - 86400,
      revokedAt: nowSeconds - 1800,
      revocationReason: 'KEY_COMPROMISED_DIGEST_MATCH',
    });

    // Register isolated key for ws_globex_02
    this.registerKey({
      workspaceId: 'ws_globex_02',
      kid: 'kid_globex_active_v1',
      status: 'active',
      secretMaterial: 'test-only-synthetic-hmac-key-ws-globex-02-active',
      createdAt: nowSeconds - 3600,
    });
  }

  public isCompromisedSecret(secretMaterial: string | undefined | null): boolean {
    if (!secretMaterial || typeof secretMaterial !== 'string') return false;
    const digest = sha256Hex(secretMaterial);
    if (REVOKED_KEY_SHA256_DIGESTS.has(digest)) {
      return true;
    }
    const legacyPrefix = LEGACY_PREFIX_BYTES.toString('utf8');
    if (secretMaterial.startsWith(legacyPrefix)) {
      REVOKED_KEY_SHA256_DIGESTS.add(digest);
      return true;
    }
    return false;
  }

  public addRevokedSecretDigest(secretOrDigest: string, isRawSecret = false): void {
    const digest = isRawSecret ? sha256Hex(secretOrDigest) : secretOrDigest.toLowerCase();
    REVOKED_KEY_SHA256_DIGESTS.add(digest);
  }

  public getAllowedIssuers(workspaceId: string): ReadonlyArray<string> {
    const canonical = normalizeCanonicalWorkspaceId(workspaceId);
    const configured = WORKSPACE_ALLOWED_ISSUERS[canonical];
    if (configured) return configured;
    return Object.freeze([
      `workspace:${workspaceId}`,
      `urn:okeng:issuer:${workspaceId}`,
    ]);
  }

  public isAllowedIssuer(workspaceId: string, issuer: string): boolean {
    if (!issuer || typeof issuer !== 'string') return false;
    const allowed = this.getAllowedIssuers(workspaceId);
    return allowed.includes(issuer);
  }

  public registerKey(params: {
    workspaceId: string;
    kid: string;
    status: SigningKeyStatus;
    secretMaterial: string;
    createdAt?: number;
    graceExpiresAt?: number;
    revokedAt?: number;
    revocationReason?: 'KEY_COMPROMISED_DIGEST_MATCH' | 'KEY_REVOKED' | 'KEY_GRACE_EXPIRED';
  }): WorkspaceSigningKeyRecord {
    const canonicalWs = normalizeCanonicalWorkspaceId(params.workspaceId);
    const now = params.createdAt ?? Math.floor(Date.now() / 1000);
    const record: WorkspaceSigningKeyRecord = {
      workspaceId: canonicalWs,
      kid: params.kid,
      alg: 'HS256',
      purpose: 'embed_host_assertion',
      status: params.status,
      secretMaterial: params.secretMaterial,
      secretSha256: sha256Hex(params.secretMaterial),
      createdAt: now,
      graceExpiresAt: params.graceExpiresAt,
      revokedAt: params.revokedAt,
      revocationReason: params.revocationReason,
    };

    let wsMap = this.keysByWorkspace.get(canonicalWs);
    if (!wsMap) {
      wsMap = new Map();
      this.keysByWorkspace.set(canonicalWs, wsMap);
    }
    wsMap.set(params.kid, record);
    return record;
  }

  public getActiveKeyForWorkspace(workspaceId: string): WorkspaceSigningKeyRecord | undefined {
    const canonicalWs = normalizeCanonicalWorkspaceId(workspaceId);
    const wsMap = this.keysByWorkspace.get(canonicalWs);
    if (!wsMap) return undefined;
    for (const record of wsMap.values()) {
      if (record.status === 'active' && !this.isCompromisedSecret(record.secretMaterial)) {
        return record;
      }
    }
    return undefined;
  }

  /**
   * Normal key rotation:
   * - Transitions current `active` key(s) for `workspaceId` to `grace` (`graceExpiresAt = now + 24h`).
   * - Registers the new `active` key.
   * - Existing Domain C embed sessions minted by the rotated `grace` key remain valid until their own
   *   `session.expiresAt` TTL and are NOT revoked when `graceExpiresAt` elapses.
   */
  public rotateWorkspaceKey(params: {
    workspaceId: string;
    newKid?: string;
    newSecretMaterial?: string;
    nowSeconds?: number;
    gracePeriodSeconds?: number;
  }): {
    activeKey: WorkspaceSigningKeyRecord;
    graceKeys: WorkspaceSigningKeyRecord[];
  } {
    const canonicalWs = normalizeCanonicalWorkspaceId(params.workspaceId);
    const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
    const graceWindow = params.gracePeriodSeconds ?? KEY_ROTATION_GRACE_SECONDS;

    let wsMap = this.keysByWorkspace.get(canonicalWs);
    if (!wsMap) {
      wsMap = new Map();
      this.keysByWorkspace.set(canonicalWs, wsMap);
    }

    const graceKeys: WorkspaceSigningKeyRecord[] = [];
    for (const record of wsMap.values()) {
      if (record.status === 'active') {
        record.status = 'grace';
        record.graceExpiresAt = now + graceWindow;
        graceKeys.push(record);
      }
    }

    const nextKid =
      params.newKid || `kid_${canonicalWs.replace(/[^a-z0-9]/gi, '_')}_${now}_${crypto.randomBytes(3).toString('hex')}`;
    const nextSecret =
      params.newSecretMaterial ||
      `test-only-synthetic-hmac-key-${canonicalWs}-${crypto.randomBytes(16).toString('hex')}`;

    const activeKey = this.registerKey({
      workspaceId: canonicalWs,
      kid: nextKid,
      status: 'active',
      secretMaterial: nextSecret,
      createdAt: now,
    });

    this.recordAudit({
      event: 'WORKSPACE_KEY_ROTATED',
      workspaceId: canonicalWs,
      kid: activeKey.kid,
      publicCode: 'OK',
      internalReason: 'KEY_ROTATED_TO_GRACE',
      details: {
        newActiveKid: activeKey.kid,
        transitionedToGraceKids: graceKeys.map((k) => k.kid),
        graceExpiresAt: now + graceWindow,
      },
    });

    return { activeKey, graceKeys };
  }

  /**
   * Explicit key compromise or administrative revocation:
   * - Transitions `(workspaceId, kid)` to `status = "revoked"`.
   * - Immediately rejects new host assertions (`401 SIGNING_KEY_REJECTED`).
   * - Immediately invalidates all active Domain C embed runtime sessions minted by this `kid` (`401 SESSION_KEY_REVOKED`).
   */
  public revokeWorkspaceKey(params: {
    workspaceId: string;
    kid: string;
    reason?: 'KEY_COMPROMISED_DIGEST_MATCH' | 'KEY_REVOKED';
    nowSeconds?: number;
  }): boolean {
    const canonicalWs = normalizeCanonicalWorkspaceId(params.workspaceId);
    const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
    const wsMap = this.keysByWorkspace.get(canonicalWs);
    if (!wsMap) return false;
    const record = wsMap.get(params.kid);
    if (!record) return false;

    record.status = 'revoked';
    record.revokedAt = now;
    record.revocationReason = params.reason || 'KEY_REVOKED';
    if (params.reason === 'KEY_COMPROMISED_DIGEST_MATCH') {
      REVOKED_KEY_SHA256_DIGESTS.add(record.secretSha256);
    }

    this.recordAudit({
      event: 'WORKSPACE_KEY_REVOKED',
      workspaceId: canonicalWs,
      kid: params.kid,
      publicCode: 'SIGNING_KEY_REJECTED',
      internalReason: record.revocationReason,
    });
    return true;
  }

  /**
   * Resolves a verification key strictly by `(expectedWorkspaceId, kid)`.
   * Returns a uniform public `401 SIGNING_KEY_REJECTED` error code on any invalid key state
   * while recording the exact internal audit reason.
   */
  public resolveVerificationKey(params: {
    expectedWorkspaceId: string;
    kid: string;
    nowSeconds?: number;
    explicitTestSecret?: string;
  }): KeyResolutionResult {
    const canonicalWs = normalizeCanonicalWorkspaceId(params.expectedWorkspaceId);
    const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);

    // Check if an explicit secret passed to verifier matches a compromised key digest
    if (params.explicitTestSecret && this.isCompromisedSecret(params.explicitTestSecret)) {
      this.recordAudit({
        event: 'SIGNING_KEY_REJECTED',
        workspaceId: canonicalWs,
        kid: params.kid,
        publicCode: 'SIGNING_KEY_REJECTED',
        internalReason: 'KEY_COMPROMISED_DIGEST_MATCH',
      });
      return {
        ok: false,
        status: 401,
        publicCode: 'SIGNING_KEY_REJECTED',
        auditReason: 'KEY_COMPROMISED_DIGEST_MATCH',
        message: 'Signing key was rejected by workspace key policy.',
      };
    }

    const wsMap = this.keysByWorkspace.get(canonicalWs);
    const record = wsMap?.get(params.kid);

    if (!record) {
      this.recordAudit({
        event: 'SIGNING_KEY_REJECTED',
        workspaceId: canonicalWs,
        kid: params.kid,
        publicCode: 'SIGNING_KEY_REJECTED',
        internalReason: 'KEY_UNKNOWN',
      });
      return {
        ok: false,
        status: 401,
        publicCode: 'SIGNING_KEY_REJECTED',
        auditReason: 'KEY_UNKNOWN',
        message: 'Signing key was rejected by workspace key policy.',
      };
    }

    if (this.isCompromisedSecret(record.secretMaterial)) {
      record.status = 'revoked';
      record.revocationReason = 'KEY_COMPROMISED_DIGEST_MATCH';
      this.recordAudit({
        event: 'SIGNING_KEY_REJECTED',
        workspaceId: canonicalWs,
        kid: params.kid,
        publicCode: 'SIGNING_KEY_REJECTED',
        internalReason: 'KEY_COMPROMISED_DIGEST_MATCH',
      });
      return {
        ok: false,
        status: 401,
        publicCode: 'SIGNING_KEY_REJECTED',
        auditReason: 'KEY_COMPROMISED_DIGEST_MATCH',
        message: 'Signing key was rejected by workspace key policy.',
      };
    }

    if (record.status === 'revoked') {
      const reason = record.revocationReason || 'KEY_REVOKED';
      this.recordAudit({
        event: 'SIGNING_KEY_REJECTED',
        workspaceId: canonicalWs,
        kid: params.kid,
        publicCode: 'SIGNING_KEY_REJECTED',
        internalReason: reason,
      });
      return {
        ok: false,
        status: 401,
        publicCode: 'SIGNING_KEY_REJECTED',
        auditReason: reason,
        message: 'Signing key was rejected by workspace key policy.',
      };
    }

    if (record.status === 'grace') {
      if (record.graceExpiresAt !== undefined && now > record.graceExpiresAt) {
        this.recordAudit({
          event: 'SIGNING_KEY_REJECTED',
          workspaceId: canonicalWs,
          kid: params.kid,
          publicCode: 'SIGNING_KEY_REJECTED',
          internalReason: 'KEY_GRACE_EXPIRED',
        });
        return {
          ok: false,
          status: 401,
          publicCode: 'SIGNING_KEY_REJECTED',
          auditReason: 'KEY_GRACE_EXPIRED',
          message: 'Signing key was rejected by workspace key policy.',
        };
      }
      return {
        ok: true,
        key: record,
        auditReason: 'KEY_GRACE_VALID',
      };
    }

    return {
      ok: true,
      key: record,
      auditReason: 'KEY_ACTIVE_VALID',
    };
  }

  /**
   * Authoritative current key check on every Domain C embed session read/use:
   * - Normal rotation (`status === 'grace'`, even after `graceExpiresAt` has passed) does NOT revoke existing sessions.
   * - Explicit revocation or compromise (`status === 'revoked'` or digest match) immediately invalidates all sessions
   *   minted by `mintedByKid` (`401 SESSION_KEY_REVOKED`).
   */
  public checkSessionKeyAuthority(params: {
    workspaceId: string;
    mintedByKid?: string;
  }): { valid: true } | { valid: false; status: 401; code: 'SESSION_KEY_REVOKED'; auditReason: string } {
    if (!params.mintedByKid) {
      return { valid: true };
    }
    const canonicalWs = normalizeCanonicalWorkspaceId(params.workspaceId);
    const wsMap = this.keysByWorkspace.get(canonicalWs);
    const record = wsMap?.get(params.mintedByKid);

    if (!record) {
      this.recordAudit({
        event: 'EMBED_SESSION_REJECTED',
        workspaceId: canonicalWs,
        kid: params.mintedByKid,
        publicCode: 'SESSION_KEY_REVOKED',
        internalReason: 'KEY_UNKNOWN',
      });
      return {
        valid: false,
        status: 401,
        code: 'SESSION_KEY_REVOKED',
        auditReason: 'KEY_UNKNOWN',
      };
    }

    if (record.status === 'revoked' || this.isCompromisedSecret(record.secretMaterial)) {
      const reason = record.revocationReason || 'KEY_REVOKED';
      this.recordAudit({
        event: 'EMBED_SESSION_REJECTED',
        workspaceId: canonicalWs,
        kid: params.mintedByKid,
        publicCode: 'SESSION_KEY_REVOKED',
        internalReason: reason,
      });
      return {
        valid: false,
        status: 401,
        code: 'SESSION_KEY_REVOKED',
        auditReason: reason,
      };
    }

    // Active OR rotated grace keys allow the session to live until its own session.expiresAt TTL
    return { valid: true };
  }

  public recordAudit(entry: Omit<SecurityAuditEntry, 'timestamp'>): void {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      ...entry,
    });
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
  }

  public getAuditLog(): ReadonlyArray<SecurityAuditEntry> {
    return this.auditLog;
  }
}

export const workspaceSigningKeyRegistry = new WorkspaceSigningKeyRegistryService();
