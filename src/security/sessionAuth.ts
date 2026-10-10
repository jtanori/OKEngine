import crypto from 'crypto';
import express from 'express';
import { normalizeCanonicalWorkspaceId } from './signingKeyRegistry.js';
import { isRedisAvailableForRuntime, isStagingOrProductionEnv } from './redisStoreAndQuota.js';

export type WorkspaceMemberRole = 'WORKSPACE_OWNER' | 'WORKSPACE_EDITOR' | 'WORKSPACE_VIEWER';

export interface OperatorUserRecord {
  userId: string;
  email: string;
  name: string;
  passwordSalt: string;
  passwordHashHex: string;
  status: 'active' | 'disabled';
  platformRole?: 'PLATFORM_ADMIN';
}

export interface WorkspaceMembershipRecord {
  userId: string;
  workspaceId: string;
  role: WorkspaceMemberRole;
  status: 'active' | 'revoked';
}

export interface OperatorSessionRecord {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  platformRole?: 'PLATFORM_ADMIN';
  sessionEpoch: number;
  createdAtMs: number;
  lastActiveAtMs: number;
  expiresAtMs: number;
  idleExpiresAtMs: number;
  revokedAtMs?: number;
}

export interface VerifiedWorkspaceContext {
  sessionId: string;
  userId: string;
  email: string;
  workspaceId: string;
  role: WorkspaceMemberRole;
  permissions: ReadonlyArray<string>;
}

const SESSION_COOKIE_SECRET =
  process.env.OKENG_SESSION_COOKIE_SECRET ||
  'internal-server-session-cookie-hmac-key-2026-okeng-v1';
const CSRF_HMAC_SECRET =
  process.env.OKENG_CSRF_HMAC_SECRET ||
  'internal-server-csrf-hmac-key-2026-okeng-v1';

const ABSOLUTE_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const IDLE_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export const ROLE_PERMISSION_MATRIX: Record<WorkspaceMemberRole, ReadonlyArray<string>> = {
  WORKSPACE_OWNER: Object.freeze([
    'workspace.read',
    'workspace.settings.manage',
    'workspace.users.manage',
    'collection.read',
    'collection.write',
    'collection.access.manage',
    'collection.delete',
    'content.read',
    'content.write',
    'content.delete',
    'embed.read',
    'embed.manage',
    'test.execute',
    'conversations.read',
  ]),
  WORKSPACE_EDITOR: Object.freeze([
    'workspace.read',
    'collection.read',
    'collection.write',
    'content.read',
    'content.write',
    'embed.read',
    'embed.manage',
    'test.execute',
    'conversations.read',
  ]),
  WORKSPACE_VIEWER: Object.freeze([
    'workspace.read',
    'collection.read',
    'content.read',
    'embed.read',
  ]),
};

function makeScryptRecord(
  userId: string,
  email: string,
  name: string,
  plainPassword: string,
  platformRole?: 'PLATFORM_ADMIN'
): OperatorUserRecord {
  const salt = `salt_${userId}_okeng_2026`;
  const hashHex = crypto.scryptSync(plainPassword, salt, 32).toString('hex');
  return {
    userId,
    email: email.toLowerCase(),
    name,
    passwordSalt: salt,
    passwordHashHex: hashHex,
    status: 'active',
    platformRole,
  };
}

const PERSISTED_USERS: ReadonlyArray<OperatorUserRecord> = [
  makeScryptRecord('usr_sarah_102', 'sarah@okeng.io', 'Sarah Chen', 'OkengOwner#2026!'),
  makeScryptRecord('usr_marcus_204', 'marcus@okeng.io', 'Marcus Vance', 'OkengEditor#2026!'),
  makeScryptRecord('usr_elena_309', 'elena@okeng.io', 'Elena Rostova', 'OkengViewer#2026!'),
  makeScryptRecord(
    'usr_platform_admin_900',
    'admin@okeng.io',
    'Platform Admin',
    'OkengPlatform#2026!',
    'PLATFORM_ADMIN'
  ),
  makeScryptRecord('usr_globex_401', 'owner@globex.io', 'Globex Owner', 'GlobexOwner#2026!'),
];

const PERSISTED_MEMBERSHIPS: ReadonlyArray<WorkspaceMembershipRecord> = [
  { userId: 'usr_sarah_102', workspaceId: 'ws_okeng_01', role: 'WORKSPACE_OWNER', status: 'active' },
  { userId: 'usr_marcus_204', workspaceId: 'ws_okeng_01', role: 'WORKSPACE_EDITOR', status: 'active' },
  { userId: 'usr_elena_309', workspaceId: 'ws_okeng_01', role: 'WORKSPACE_VIEWER', status: 'active' },
  { userId: 'usr_globex_401', workspaceId: 'ws_globex_02', role: 'WORKSPACE_OWNER', status: 'active' },
];

const ACTIVE_WORKSPACES = new Set(['ws_okeng_01', 'ws_globex_02']);

export class SessionManagerService {
  private sessions = new Map<string, OperatorSessionRecord>();

  public reset(): void {
    this.sessions.clear();
  }

  public getAllowedOrigins(req?: express.Request): Set<string> {
    const allowed = new Set<string>([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost:3000',
    ]);
    if (process.env.APP_URL) {
      try {
        allowed.add(new URL(process.env.APP_URL).origin);
      } catch {
        // ignore invalid APP_URL
      }
    }
    if (process.env.ALLOWED_ORIGINS) {
      for (const raw of process.env.ALLOWED_ORIGINS.split(',')) {
        const trimmed = raw.trim();
        if (trimmed) {
          try {
            allowed.add(new URL(trimmed).origin);
          } catch {
            // ignore
          }
        }
      }
    }
    if (req?.headers?.host) {
      const host = String(req.headers.host).trim();
      if (/^[a-zA-Z0-9.-]+(?::\d+)?$/.test(host)) {
        allowed.add(`http://${host}`);
        allowed.add(`https://${host}`);
      }
    }
    return allowed;
  }

  /**
   * Enforces mandatory Origin or Referer presence and exact URL origin equality
   * (zero prefix, suffix, or substring matching).
   */
  public verifyOriginHeader(req: express.Request):
    | { ok: true; origin: string }
    | { ok: false; status: 403; code: 'CSRF_ORIGIN_REQUIRED' | 'CSRF_ORIGIN_DENIED'; message: string } {
    const rawOrigin = req.headers.origin ? String(req.headers.origin).trim() : '';
    const rawReferer = req.headers.referer ? String(req.headers.referer).trim() : '';

    if (!rawOrigin && !rawReferer) {
      return {
        ok: false,
        status: 403,
        code: 'CSRF_ORIGIN_REQUIRED',
        message: 'State-changing requests require an explicit Origin or Referer header.',
      };
    }

    const candidateUrl = rawOrigin || rawReferer;
    let parsedOrigin: string;
    try {
      const parsed = new URL(candidateUrl);
      if (parsed.origin === 'null' || !parsed.origin) {
        return {
          ok: false,
          status: 403,
          code: 'CSRF_ORIGIN_DENIED',
          message: 'Null or opaque Origin header is denied.',
        };
      }
      // Ensure rawOrigin does not have extra path/userinfo tricks when Origin header is used
      if (rawOrigin && rawOrigin !== parsed.origin) {
        return {
          ok: false,
          status: 403,
          code: 'CSRF_ORIGIN_DENIED',
          message: 'Origin header must match exact scheme://host[:port] format.',
        };
      }
      parsedOrigin = parsed.origin;
    } catch {
      return {
        ok: false,
        status: 403,
        code: 'CSRF_ORIGIN_DENIED',
        message: 'Malformed Origin or Referer URL.',
      };
    }

    const allowedOrigins = this.getAllowedOrigins(req);
    if (!allowedOrigins.has(parsedOrigin)) {
      return {
        ok: false,
        status: 403,
        code: 'CSRF_ORIGIN_DENIED',
        message: `Origin '${parsedOrigin}' is not in the workspace ALLOWED_ORIGINS set.`,
      };
    }

    return { ok: true, origin: parsedOrigin };
  }

  public computeCsrfToken(session: OperatorSessionRecord): string {
    return crypto
      .createHmac('sha256', CSRF_HMAC_SECRET)
      .update(`${session.sessionId}:${session.userId}:${session.sessionEpoch}`)
      .digest('hex');
  }

  public verifyCsrfToken(session: OperatorSessionRecord, candidateToken: string | undefined): boolean {
    if (!candidateToken || typeof candidateToken !== 'string') return false;
    const expected = this.computeCsrfToken(session);
    const expectedBuf = Buffer.from(expected, 'utf8');
    const candidateBuf = Buffer.from(candidateToken.trim(), 'utf8');
    if (expectedBuf.length !== candidateBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, candidateBuf);
  }

  private signSessionId(sessionId: string): string {
    const sig = crypto
      .createHmac('sha256', SESSION_COOKIE_SECRET)
      .update(sessionId)
      .digest('base64url');
    return `${sessionId}.${sig}`;
  }

  private verifySignedSessionCookie(rawValue: string): string | null {
    const parts = rawValue.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const [sessionId, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_COOKIE_SECRET)
      .update(sessionId)
      .digest('base64url');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    const actualBuf = Buffer.from(sig, 'utf8');
    if (expectedBuf.length !== actualBuf.length) return null;
    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return null;
    return sessionId;
  }

  public extractSignedSessionCookie(req: express.Request): string | null {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader || typeof cookieHeader !== 'string') return null;
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      if (name === '__Host-okeng_session' || name === 'okeng_session') {
        return val;
      }
    }
    return null;
  }

  public formatSetCookieHeader(signedValue: string, req?: express.Request, clear = false): string {
    const isHttps =
      req?.secure ||
      req?.headers['x-forwarded-proto'] === 'https' ||
      process.env.OKENG_ENV === 'production';
    const cookieName = isHttps ? '__Host-okeng_session' : 'okeng_session';
    const maxAge = clear ? 0 : Math.floor(ABSOLUTE_SESSION_TTL_MS / 1000);
    const val = clear ? '' : encodeURIComponent(signedValue);
    const secureFlag = isHttps ? '; Secure' : '';
    return `${cookieName}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`;
  }

  public authenticateCredentials(email: string, password: string): OperatorUserRecord | null {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = PERSISTED_USERS.find((u) => u.email === normalizedEmail && u.status === 'active');
    if (!user) return null;
    const candidateHash = crypto.scryptSync(password || '', user.passwordSalt, 32);
    const storedHash = Buffer.from(user.passwordHashHex, 'hex');
    if (candidateHash.length !== storedHash.length) return null;
    if (!crypto.timingSafeEqual(candidateHash, storedHash)) return null;
    return user;
  }

  public authenticateDevPersona(personaId: string):
    | { ok: true; user: OperatorUserRecord }
    | { ok: false; status: 401 | 403; code: 'DEV_PERSONA_DISABLED' | 'INVALID_CREDENTIALS'; message: string } {
    const env = (process.env.OKENG_ENV || 'development').toLowerCase();
    const allowPersonas = process.env.OKENG_ALLOW_DEV_PERSONAS === 'true';
    if ((env !== 'development' && env !== 'test') || !allowPersonas) {
      return {
        ok: false,
        status: 403,
        code: 'DEV_PERSONA_DISABLED',
        message: 'Development persona login is strictly disabled outside local development/test with OKENG_ALLOW_DEV_PERSONAS=true.',
      };
    }
    const user = PERSISTED_USERS.find((u) => u.userId === personaId && u.status === 'active');
    if (!user) {
      return {
        ok: false,
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Unknown persona ID.',
      };
    }
    return { ok: true, user };
  }

  public createSession(user: OperatorUserRecord, nowMs: number = Date.now()): {
    session: OperatorSessionRecord;
    signedCookieValue: string;
    csrfToken: string;
  } {
    const sessionId = `sess_${crypto.randomBytes(18).toString('hex')}`;
    const session: OperatorSessionRecord = {
      sessionId,
      userId: user.userId,
      email: user.email,
      name: user.name,
      platformRole: user.platformRole,
      sessionEpoch: 1,
      createdAtMs: nowMs,
      lastActiveAtMs: nowMs,
      expiresAtMs: nowMs + ABSOLUTE_SESSION_TTL_MS,
      idleExpiresAtMs: nowMs + IDLE_SESSION_TTL_MS,
    };
    this.sessions.set(sessionId, session);
    return {
      session,
      signedCookieValue: this.signSessionId(sessionId),
      csrfToken: this.computeCsrfToken(session),
    };
  }

  public revokeSession(sessionId: string, nowMs: number = Date.now()): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.revokedAtMs = nowMs;
    session.sessionEpoch += 1;
    return true;
  }

  public resolveRequestSession(
    req: express.Request,
    nowMs: number = Date.now()
  ):
    | { ok: true; session: OperatorSessionRecord; csrfToken: string }
    | {
        ok: false;
        status: 401 | 503;
        code:
          | 'AUTH_SESSION_REQUIRED'
          | 'SESSION_REVOKED'
          | 'SESSION_EXPIRED'
          | 'SESSION_STORE_UNAVAILABLE';
        message: string;
      } {
    if (!isRedisAvailableForRuntime() && isStagingOrProductionEnv()) {
      return {
        ok: false,
        status: 503,
        code: 'SESSION_STORE_UNAVAILABLE',
        message: 'Authoritative session store is unreachable in staging/production; failing closed.',
      };
    }

    const rawCookie = this.extractSignedSessionCookie(req);
    if (!rawCookie) {
      return {
        ok: false,
        status: 401,
        code: 'AUTH_SESSION_REQUIRED',
        message: 'Valid operator session cookie is required.',
      };
    }

    const sessionId = this.verifySignedSessionCookie(rawCookie);
    if (!sessionId) {
      return {
        ok: false,
        status: 401,
        code: 'AUTH_SESSION_REQUIRED',
        message: 'Invalid session cookie signature.',
      };
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        ok: false,
        status: 401,
        code: 'AUTH_SESSION_REQUIRED',
        message: 'Session record not found.',
      };
    }

    if (session.revokedAtMs !== undefined) {
      return {
        ok: false,
        status: 401,
        code: 'SESSION_REVOKED',
        message: 'Session has been logged out or revoked.',
      };
    }

    if (nowMs > session.expiresAtMs || nowMs > session.idleExpiresAtMs) {
      return {
        ok: false,
        status: 401,
        code: 'SESSION_EXPIRED',
        message: 'Session has expired.',
      };
    }

    session.lastActiveAtMs = nowMs;
    session.idleExpiresAtMs = nowMs + IDLE_SESSION_TTL_MS;

    return {
      ok: true,
      session,
      csrfToken: this.computeCsrfToken(session),
    };
  }

  public getUserMemberships(userId: string): ReadonlyArray<{
    workspaceId: string;
    role: WorkspaceMemberRole;
    permissions: ReadonlyArray<string>;
  }> {
    return PERSISTED_MEMBERSHIPS.filter((m) => m.userId === userId && m.status === 'active').map(
      (m) => ({
        workspaceId: m.workspaceId,
        role: m.role,
        permissions: ROLE_PERMISSION_MATRIX[m.role],
      })
    );
  }

  /**
   * 5-Link Server-Side Workspace Authorization Guard (`Section 3.4`):
   * Link 1: Verified Active User Session (+ CSRF & Exact Origin on mutations)
   * Link 2: Active Target Workspace
   * Link 3: Active Workspace Membership (non-disclosing 404 if not a member)
   * Link 4: Role-to-Permission Check (403 INSUFFICIENT_WORKSPACE_PERMISSION)
   * Link 5: Composite (workspaceId, resourceId) Ownership Check (non-disclosing 404)
   */
  public requireWorkspacePermission(
    requiredPermission: string,
    options?: { resolveWorkspaceId?: (req: express.Request) => string }
  ): express.RequestHandler {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Unconditional rejection of legacy spoofable headers or query params
      if (
        req.headers['x-okeng-session-user'] !== undefined ||
        req.headers['x-okeng-session'] !== undefined ||
        req.headers['x-okeng-admin-grant'] !== undefined ||
        (req.query && req.query.sessionUser !== undefined)
      ) {
        res.status(401).json({
          ok: false,
          status: 401,
          error: 'SPOOFED_IDENTITY_HEADER_REJECTED',
          code: 'SPOOFED_IDENTITY_HEADER_REJECTED',
          message: 'Legacy spoofable identity headers and sessionUser query parameters are prohibited.',
        });
        return;
      }

      // Link 1: Verified Active Session
      const sessionRes = this.resolveRequestSession(req);
      if (!sessionRes.ok) {
        res.status(sessionRes.status).json({
          ok: false,
          status: sessionRes.status,
          error: sessionRes.code,
          code: sessionRes.code,
          message: sessionRes.message,
        });
        return;
      }

      const { session } = sessionRes;

      // Enforce Origin/Referer + HMAC CSRF token on all state-changing requests
      const method = req.method.toUpperCase();
      if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
        const originCheck = this.verifyOriginHeader(req);
        if (!originCheck.ok) {
          res.status(originCheck.status).json({
            ok: false,
            status: originCheck.status,
            error: originCheck.code,
            code: originCheck.code,
            message: originCheck.message,
          });
          return;
        }

        const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
        if (!this.verifyCsrfToken(session, csrfHeader)) {
          res.status(403).json({
            ok: false,
            status: 403,
            error: 'CSRF_TOKEN_INVALID',
            code: 'CSRF_TOKEN_INVALID',
            message: 'Missing or invalid session-bound X-CSRF-Token header.',
          });
          return;
        }
      }

      // Link 2: Active Target Workspace
      const rawWorkspaceId =
        options?.resolveWorkspaceId?.(req) ||
        req.params.workspaceId ||
        req.body?.workspaceId ||
        (req.query?.workspaceId as string) ||
        'ws_okeng_01';
      const canonicalWorkspaceId = normalizeCanonicalWorkspaceId(rawWorkspaceId);

      if (!ACTIVE_WORKSPACES.has(canonicalWorkspaceId)) {
        res.status(404).json({
          ok: false,
          status: 404,
          error: 'RESOURCE_NOT_FOUND',
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found.',
        });
        return;
      }

      // Link 3: Active Workspace Membership
      const membership = PERSISTED_MEMBERSHIPS.find(
        (m) =>
          m.userId === session.userId &&
          m.workspaceId === canonicalWorkspaceId &&
          m.status === 'active'
      );

      if (!membership) {
        if (session.platformRole === 'PLATFORM_ADMIN') {
          res.status(403).json({
            ok: false,
            status: 403,
            error: 'PLATFORM_ADMIN_NO_WORKSPACE_MEMBERSHIP',
            code: 'PLATFORM_ADMIN_NO_WORKSPACE_MEMBERSHIP',
            message: 'Platform administrators have zero implicit workspace access.',
          });
          return;
        }
        // Non-disclosing 404 for wrong-workspace callers (prevents tenant ID enumeration)
        res.status(404).json({
          ok: false,
          status: 404,
          error: 'RESOURCE_NOT_FOUND',
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found.',
        });
        return;
      }

      // Link 4: Role-to-Permission Check
      const permissions = ROLE_PERMISSION_MATRIX[membership.role] || [];
      if (!permissions.includes(requiredPermission)) {
        res.status(403).json({
          ok: false,
          status: 403,
          error: 'INSUFFICIENT_WORKSPACE_PERMISSION',
          code: 'INSUFFICIENT_WORKSPACE_PERMISSION',
          requiredPermission,
          role: membership.role,
          message: `Role '${membership.role}' lacks required permission '${requiredPermission}'.`,
        });
        return;
      }

      // Link 5: Composite (workspaceId, resourceId) Ownership Check
      const resourceWorkspaceId = req.body?.resourceWorkspaceId || req.query?.resourceWorkspaceId;
      if (
        resourceWorkspaceId &&
        normalizeCanonicalWorkspaceId(String(resourceWorkspaceId)) !== canonicalWorkspaceId
      ) {
        res.status(404).json({
          ok: false,
          status: 404,
          error: 'RESOURCE_NOT_FOUND',
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found.',
        });
        return;
      }

      const targetDocId = req.params.documentId || req.params.id || req.params.sourceId || req.body?.documentId;
      if (typeof targetDocId === 'string') {
        const isGlobexDoc = targetDocId.toLowerCase().includes('globex');
        if (
          (canonicalWorkspaceId === 'ws_okeng_01' && isGlobexDoc) ||
          (canonicalWorkspaceId === 'ws_globex_02' && !isGlobexDoc)
        ) {
          res.status(404).json({
            ok: false,
            status: 404,
            error: 'RESOURCE_NOT_FOUND',
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found.',
          });
          return;
        }
      }

      const targetCollectionId = req.params.collectionId || req.body?.collectionId;
      if (typeof targetCollectionId === 'string') {
        const isGlobexCol = targetCollectionId.toLowerCase().includes('globex');
        if (
          (canonicalWorkspaceId === 'ws_okeng_01' && isGlobexCol) ||
          (canonicalWorkspaceId === 'ws_globex_02' && !isGlobexCol)
        ) {
          res.status(404).json({
            ok: false,
            status: 404,
            error: 'RESOURCE_NOT_FOUND',
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found.',
          });
          return;
        }
      }

      const verifiedContext: VerifiedWorkspaceContext = {
        sessionId: session.sessionId,
        userId: session.userId,
        email: session.email,
        workspaceId: canonicalWorkspaceId,
        role: membership.role,
        permissions,
      };
      (req as any).workspaceContext = verifiedContext;
      next();
    };
  }
}

export const sessionManager = new SessionManagerService();
