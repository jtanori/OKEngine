// Domain A auth sessions are verified by Supabase Auth. The legacy signed cookie
// is retained only for the explicitly selected in-memory demo adapter.
import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient, SUPABASE_AUTH_COOKIE_NAME } from './supabase/server';
import { getEnv } from './env';
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

export function getSystemRole(user: { role?: unknown } | null | undefined): SystemRole {
  const role = user?.role;
  return typeof role === 'string' && SYSTEM_ROLES.includes(role as SystemRole)
    ? role as SystemRole
    : 'viewer';
}

export interface SessionData {
  /** OKEngine's profile ID. New Auth-backed profiles use the Auth UUID as text. */
  userId: string;
  email: string;
  name?: string;
  /** Platform privilege only; workspace role remains separate. */
  role: SystemRole;
  workspaceId?: string;
  workspaceSlug?: string;
  workspaceName?: string;
  workspaceRole?: string;
  permissions?: string[];
  createdAt: number;
}

function sign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/** Legacy demo-session helper. It is not used for Supabase Auth sessions. */
export function createSessionToken(data: SessionData): string {
  const env = getEnv();
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = sign(payload, env.SESSION_SECRET);
  return `${payload}.${sig}`;
}

/** Legacy demo-session helper. Production Auth never trusts this cookie. */
export function verifySessionToken(token: string): SessionData | null {
  try {
    const env = getEnv();
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = sign(payload, env.SESSION_SECRET);
    const received = Buffer.from(sig);
    const expected = Buffer.from(expectedSig);
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData;
    if (!Number.isFinite(data.createdAt) || Date.now() - data.createdAt > 12 * 60 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function getDataMode(): string {
  // NODE_ENV is controlled by the framework/runtime and cannot be downgraded by
  // a stale OKENG_ENV=development or OKENG_DATA_MODE=memory setting.
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') return 'supabase';
  const env = (process.env.OKENG_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  if (env === 'production' || env === 'staging') return 'supabase';
  return (process.env.OKENG_DATA_MODE || 'memory').toLowerCase();
}

export function getAuthDataMode(): 'memory' | 'supabase' {
  return getDataMode() === 'memory' ? 'memory' : 'supabase';
}

function systemRoleFromPlatformRole(platformRole: unknown): SystemRole {
  if (platformRole === 'PLATFORM_OWNER') return 'super_admin';
  if (platformRole === 'PLATFORM_ADMIN') return 'admin';
  return 'member';
}

/**
 * Resolve an app session from a verified Supabase Auth user and RLS-protected
 * profile/membership rows. A signed custom cookie is accepted only in memory
 * mode for the explicit local demo flow.
 */
export async function getSession(request: NextRequest): Promise<SessionData | null> {
  if (getDataMode() === 'memory') {
    const cookie = request.cookies.get('okeng.sid')?.value || request.cookies.get('__Host-okeng.sid')?.value;
    return cookie ? verifySessionToken(cookie) : null;
  }
  if (getDataMode() !== 'supabase') return null;

  const hasAuthCookie = request.cookies.getAll().some(({ name }) => name.startsWith(SUPABASE_AUTH_COOKIE_NAME));
  if (!hasAuthCookie) return null;

  try {
    const { client } = createRouteSupabaseClient(request);
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return null;

    const { data: profile, error: profileError } = await client
      .from('users')
      .select('id, email, name, platform_role, account_status')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();
    if (profileError || !profile || profile.account_status !== 'ACTIVE') return null;

    const { data: memberships, error: membershipError } = await client
      .from('workspace_memberships')
      .select('id, workspace_id, role, permissions, status, created_at')
      .eq('user_id', profile.id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1);
    if (membershipError) return null;

    const membership = memberships?.[0];
    let workspace: { id: string; slug: string; name: string } | null = null;
    if (membership?.workspace_id) {
      const { data, error } = await client
        .from('workspaces')
        .select('id, slug, name')
        .eq('id', membership.workspace_id)
        .maybeSingle();
      if (error) return null;
      workspace = data;
    }

    return {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      role: systemRoleFromPlatformRole(profile.platform_role),
      workspaceId: membership?.workspace_id,
      workspaceSlug: workspace?.slug,
      workspaceName: workspace?.name,
      workspaceRole: membership?.role,
      permissions: Array.isArray(membership?.permissions) ? membership.permissions : [],
      createdAt: Date.parse(authData.user.created_at) || Date.now(),
    };
  } catch (error) {
    // Fail closed on missing configuration, network failures, or malformed data.
    // Do not log Auth cookies or access/refresh tokens.
    console.error('[auth/session] Supabase Auth/session resolution failed', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

/** Legacy memory-only session response used by the explicitly gated dev-login route. */
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

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function getCsrfToken(): Promise<string> {
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

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
