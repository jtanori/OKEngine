// src/lib/auth.ts — Session, CSRF, Privilege for Next.js (SEC-SESSION-01, SEC-CSRF-01, SEC-PRIVILEGE-01)
// Adapted from src/services/sessionAndCsrf.ts and systemPrivileged.ts

import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from './env';
import { getRedis } from './redis';
import crypto from 'crypto';

export const SYSTEM_ROLES = ['viewer', 'member', 'admin', 'super_admin'] as const;
export type SystemRole = typeof SYSTEM_ROLES[number];

const ROLE_LEVEL: Record<SystemRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  super_admin: 4,
};

export function hasSystemRole(userRole: string, requiredRole: SystemRole): boolean {
  const userLevel = ROLE_LEVEL[userRole as SystemRole] || 0;
  const requiredLevel = ROLE_LEVEL[requiredRole] || 99;
  return userLevel >= requiredLevel;
}

export function requireSystemRole(userRole: string, requiredRole: SystemRole): void {
  if (!hasSystemRole(userRole, requiredRole)) {
    throw new Error(`Forbidden: requires ${requiredRole}`);
  }
}

export function getSystemRole(user: any): SystemRole {
  return (user?.role as SystemRole) || 'viewer';
}

// Session helpers — JWT style for Next.js, httpOnly cookie
// Phase 5: extended with workspaceRole for consistent workspace auth
export interface SessionData {
  userId: string;
  email: string;
  role: SystemRole;
  workspaceId?: string;
  workspaceRole?: string; // WORKSPACE_OWNER, WORKSPACE_EDITOR, admin, etc.
  createdAt: number;
}

function sign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function createSessionToken(data: SessionData): string {
  const env = getEnv();
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = sign(payload, env.SESSION_SECRET);
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): SessionData | null {
  try {
    const env = getEnv();
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = sign(payload, env.SESSION_SECRET);
    // Constant-time compare
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData;
    // Check expiry 12h
    const age = Date.now() - data.createdAt;
    if (age > 12 * 60 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getSession(request: NextRequest): Promise<SessionData | null> {
  const cookie = request.cookies.get('okeng.sid')?.value || request.cookies.get('__Host-okeng.sid')?.value;
  if (!cookie) return null;
  return verifySessionToken(cookie);
}

export function createSessionResponse(data: SessionData): NextResponse {
  const env = getEnv();
  const token = createSessionToken(data);
  const response = NextResponse.json({ success: true, user: { id: data.userId, email: data.email, role: data.role } });
  const isProd = env.NODE_ENV === 'production';
  response.cookies.set(isProd ? '__Host-okeng.sid' : 'okeng.sid', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 12 * 60 * 60,
    path: '/',
  });
  return response;
}

// CSRF
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function getCsrfToken(): Promise<string> {
  // Store in Redis or memory with TTL? For double-submit, we just need cookie + header match, no server store needed for double-submit
  // But we generate token and set cookie, client must send same in header
  return generateCsrfToken();
}

export function validateCsrf(request: NextRequest): boolean {
  const method = request.method;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (request.nextUrl.pathname === '/api/csrf-token') return true;
  if (request.nextUrl.pathname === '/api/health') return true;

  const cookieToken = request.cookies.get('okeng.csrf')?.value || request.cookies.get('__Host-okeng.csrf')?.value;
  const headerToken = request.headers.get('x-csrf-token') || request.headers.get('x-okeng-csrf');

  if (!cookieToken || !headerToken) return false;

  try {
    // Constant-time compare
    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
