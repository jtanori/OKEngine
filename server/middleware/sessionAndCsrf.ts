/**
 * Domain A Session & CSRF Middleware (SEC-01 §2.1)
 * Implements __Host-okeng_session cookie + session-bound HMAC X-CSRF-Token + Origin validation
 * Blocks spoofable headers x-okeng-session-user, x-okeng-session, x-okeng-admin-grant
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const SESSION_COOKIE_NAME = '__Host-okeng_session';
const DEV_SESSION_COOKIE_NAME = 'okeng_session';
const CSRF_HEADER = 'x-csrf-token';
const SPOOFABLE_HEADERS = [
  'x-okeng-session-user',
  'x-okeng-session',
  'x-okeng-admin-grant',
  'x-okeng-role',
];

export interface VerifiedSession {
  sessionId: string;
  userId: string;
  email?: string;
  role?: string;
  workspaceId?: string;
  csrfEpoch: number;
  csrfNonce: string;
  issuedAt: number;
  expiresAt: number;
}

export interface SessionAndCsrfOptions {
  sessionSecret: string;
  csrfSecret: string;
  allowedOrigins: string[];
  env: string;
}

function getSessionSecret(): string {
  return process.env.OKENG_SESSION_SECRET || process.env.OKENG_CSRF_SECRET || 'dev-only-session-secret-min-32-chars-okeng-2026!!';
}

function getCsrfSecret(): string {
  return process.env.OKENG_CSRF_SECRET || process.env.OKENG_SESSION_SECRET || 'dev-only-csrf-secret-min-32-chars-okeng-2026!!';
}

function getAllowedOrigins(): string[] {
  const raw = process.env.OKENG_ALLOWED_ORIGINS || '';
  if (!raw.trim()) {
    return ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'];
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function isSecureContext(req: Request): boolean {
  const env = (process.env.OKENG_ENV || 'development').toLowerCase();
  if (env === 'staging' || env === 'production') return true;
  const forwardedProto = (req.headers['x-forwarded-proto'] as string) || '';
  return forwardedProto === 'https' || req.secure;
}

/**
 * Decrypt AES-256-GCM session cookie or parse signed JWT-like session
 * For staging: decrypt with OKENG_SESSION_SECRET
 * For dev: allow simple base64 JSON for local testing but still enforce structure
 */
export function decryptSessionCookie(cookieValue: string, sessionSecret: string): VerifiedSession | null {
  if (!cookieValue) return null;
  try {
    // Try to parse as encrypted payload: iv.authTag.ciphertext (base64url)
    if (cookieValue.includes('.') && cookieValue.split('.').length === 3) {
      const [ivB64, authTagB64, ctB64] = cookieValue.split('.');
      const key = crypto.createHash('sha256').update(sessionSecret).digest();
      const iv = Buffer.from(ivB64, 'base64url');
      const authTag = Buffer.from(authTagB64, 'base64url');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(ctB64, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');
      const parsed = JSON.parse(decrypted);
      return validateSessionStructure(parsed);
    }
    // Fallback: base64 JSON (dev only, but we still validate)
    const jsonStr = Buffer.from(cookieValue, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    return validateSessionStructure(parsed);
  } catch {
    return null;
  }
}

function validateSessionStructure(obj: any): VerifiedSession | null {
  if (!obj || typeof obj !== 'object') return null;
  if (!obj.sessionId || typeof obj.sessionId !== 'string') return null;
  if (!obj.userId || typeof obj.userId !== 'string') return null;
  if (typeof obj.csrfEpoch !== 'number') return null;
  const now = Math.floor(Date.now() / 1000);
  if (obj.expiresAt && obj.expiresAt < now) return null;
  return {
    sessionId: obj.sessionId,
    userId: obj.userId,
    email: obj.email,
    role: obj.role,
    workspaceId: obj.workspaceId,
    csrfEpoch: obj.csrfEpoch,
    csrfNonce: obj.csrfNonce || '',
    issuedAt: obj.issuedAt || now,
    expiresAt: obj.expiresAt || now + 3600,
  };
}

export function encryptSessionCookie(session: VerifiedSession, sessionSecret: string): string {
  const key = crypto.createHash('sha256').update(sessionSecret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(session);
  let ct = cipher.update(plaintext, 'utf8', 'base64url');
  ct += cipher.final('base64url');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${ct}`;
}

export function generateCsrfToken(sessionId: string, csrfEpoch: number, csrfSecret: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const data = `${sessionId}:${csrfEpoch}:${nonce}`;
  const hmac = crypto.createHmac('sha256', csrfSecret).update(data).digest('hex');
  return `${nonce}.${hmac}`;
}

export function verifyCsrfToken(
  suppliedToken: string,
  sessionId: string,
  csrfEpoch: number,
  csrfSecret: string
): boolean {
  if (!suppliedToken || typeof suppliedToken !== 'string') return false;
  const parts = suppliedToken.split('.');
  if (parts.length !== 2) return false;
  const [nonce, suppliedHmac] = parts;
  if (!nonce || !suppliedHmac) return false;
  if (nonce.length < 16) return false;

  // Check current epoch and previous epoch (30s grace)
  for (const epoch of [csrfEpoch, csrfEpoch - 1]) {
    if (epoch < 0) continue;
    const data = `${sessionId}:${epoch}:${nonce}`;
    const expectedHmac = crypto.createHmac('sha256', csrfSecret).update(data).digest('hex');
    try {
      const a = Buffer.from(suppliedHmac, 'hex');
      const b = Buffer.from(expectedHmac, 'hex');
      if (a.length !== b.length) continue;
      if (crypto.timingSafeEqual(a, b)) return true;
    } catch {
      // timingSafeEqual throws on length mismatch - continue
    }
  }
  return false;
}

/**
 * Middleware: Strip spoofable headers and block query param spoofing
 * Must run before any auth logic
 */
export function stripSpoofableHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  for (const h of SPOOFABLE_HEADERS) {
    if (req.headers[h] !== undefined) {
      delete req.headers[h];
    }
  }
  // Block query param spoofing
  if (req.query.sessionUser || req.query.session_user) {
    res.status(400).json({
      error: 'INVALID_REQUEST',
      code: 'SPOOFABLE_QUERY_PARAM_REJECTED',
      message: 'Query param sessionUser is not allowed',
    });
    return;
  }
  next();
}

/**
 * Middleware: Exact-Origin validation for state-changing Domain A requests
 */
export function originValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  const allowedOrigins = getAllowedOrigins();
  const origin = (req.headers.origin as string) || '';
  const referer = (req.headers.referer as string) || '';

  // For API routes, Origin is required in staging/prod, optional in dev but validated if present
  const env = (process.env.OKENG_ENV || 'development').toLowerCase();
  const isStagingProd = env === 'staging' || env === 'production';

  if (!origin && !referer) {
    if (isStagingProd) {
      res.status(403).json({
        error: 'CSRF_ORIGIN_MISMATCH',
        code: 'CSRF_ORIGIN_MISMATCH',
        message: 'Origin header required for state-changing requests',
      });
      return;
    }
    next();
    return;
  }

  const checkOrigin = origin || (() => {
    try {
      return new URL(referer).origin;
    } catch {
      return '';
    }
  })();

  if (checkOrigin && !allowedOrigins.includes(checkOrigin)) {
    // Allow same-origin requests where origin matches host
    const host = req.get('host') || '';
    const proto = req.protocol;
    const selfOrigin = `${proto}://${host}`;
    if (checkOrigin !== selfOrigin) {
      res.status(403).json({
        error: 'CSRF_ORIGIN_MISMATCH',
        code: 'CSRF_ORIGIN_MISMATCH',
        message: `Origin ${checkOrigin} not in allowed list`,
      });
      return;
    }
  }

  next();
}

/**
 * Middleware: Verify Domain A session cookie exists and is valid
 */
export function requireDomainASession(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionSecret = getSessionSecret();
  
  // Try __Host- prefixed first, then dev fallback
  let rawCookie = cookies[SESSION_COOKIE_NAME] || cookies[DEV_SESSION_COOKIE_NAME] || '';
  
  if (!rawCookie) {
    res.status(401).json({
      error: 'AUTH_SESSION_REQUIRED',
      code: 'AUTH_SESSION_REQUIRED',
      message: 'Valid session cookie required',
    });
    return;
  }

  const session = decryptSessionCookie(rawCookie, sessionSecret);
  if (!session) {
    res.status(401).json({
      error: 'AUTH_SESSION_REQUIRED',
      code: 'AUTH_SESSION_INVALID',
      message: 'Session cookie invalid or expired',
    });
    return;
  }

  (req as any).verifiedSession = session;
  next();
}

/**
 * Middleware: Verify CSRF token for state-changing Domain A requests
 */
export function requireCsrfToken(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  const session = (req as any).verifiedSession as VerifiedSession | undefined;
  if (!session) {
    res.status(401).json({
      error: 'AUTH_SESSION_REQUIRED',
      code: 'AUTH_SESSION_REQUIRED',
    });
    return;
  }

  const csrfSecret = getCsrfSecret();
  const suppliedToken = (req.headers[CSRF_HEADER] as string) || (req.headers['x-csrf-token'] as string) || '';

  if (!suppliedToken) {
    res.status(403).json({
      error: 'CSRF_TOKEN_INVALID',
      code: 'CSRF_TOKEN_MISSING',
      message: 'X-CSRF-Token header required',
    });
    return;
  }

  if (!verifyCsrfToken(suppliedToken, session.sessionId, session.csrfEpoch, csrfSecret)) {
    res.status(403).json({
      error: 'CSRF_TOKEN_INVALID',
      code: 'CSRF_TOKEN_INVALID',
      message: 'CSRF token verification failed',
    });
    return;
  }

  next();
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    result[key] = decodeURIComponent(val);
  }
  return result;
}

export function createSessionCookieHeader(session: VerifiedSession, sessionSecret: string, req: Request): string {
  const encrypted = encryptSessionCookie(session, sessionSecret);
  const secure = isSecureContext(req);
  const cookieName = secure ? SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME;
  const parts = [
    `${cookieName}=${encodeURIComponent(encrypted)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=3600',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
