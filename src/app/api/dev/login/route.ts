import { NextRequest, NextResponse } from 'next/server';
import { createSessionResponse, getAuthDataMode } from '@/lib/auth';
import { getEnv } from '@/lib/env';

// Dev-only login that bypasses DB — sets httpOnly session cookie
// FAIL-CLOSED: only allowed when explicit flag ENABLE_DEV_LOGIN=true AND never in production
// See review P1 — never expose session creation via GET, never default to super_admin

const DEV_USERS: Record<string, { email: string; role: 'super_admin' | 'admin' | 'member' | 'viewer'; name: string; workspaceRole: string }> = {
  usr_sarah_102: {
    email: 'sarah.chen@okeng.io',
    role: 'super_admin',
    name: 'Sarah Chen (Owner)',
    workspaceRole: 'WORKSPACE_OWNER',
  },
  usr_marcus_204: {
    email: 'marcus.vance@okeng.io',
    role: 'member',
    name: 'Marcus Vance (Writer)',
    workspaceRole: 'WORKSPACE_USER',
  },
  usr_elena_309: {
    email: 'elena.rostova@okeng.io',
    role: 'viewer',
    name: 'Elena Rostova (Reader)',
    workspaceRole: 'WORKSPACE_USER',
  },
  usr_platform_admin_900: {
    email: 'devon.k@okeng.internal',
    role: 'super_admin',
    name: 'Devon K. (Platform Admin)',
    workspaceRole: 'WORKSPACE_OWNER',
  },
};

function isProduction(): boolean {
  // Fail closed across framework and application deployment labels.
  const environment = (process.env.OKENG_ENV || '').toLowerCase();
  return process.env.NODE_ENV === 'production'
    || process.env.VERCEL_ENV === 'production'
    || environment === 'production'
    || environment === 'staging';
}

export async function POST(request: NextRequest) {
  // 1. Always block in production, regardless of flag or missing env values
  if (isProduction()) {
    return NextResponse.json({ error: 'not_available_in_production' }, { status: 403 });
  }

  // 2. This legacy mock session belongs only to the memory demo adapter.
  // Never mint it when Supabase Auth/RLS is the selected identity source.
  if (getAuthDataMode() !== 'memory') {
    return NextResponse.json({ error: 'dev_login_not_available_in_supabase_mode' }, { status: 403 });
  }

  // 3. Require explicit server-controlled flag — missing/malformed = blocked (fail closed)
  if (process.env.ENABLE_DEV_LOGIN !== 'true') {
    return NextResponse.json({ error: 'dev_login_disabled', hint: 'Set ENABLE_DEV_LOGIN=true in server env to enable' }, { status: 403 });
  }

  // 3. Validate env — if env throws, fail closed (do not swallow)
  try {
    getEnv();
  } catch {
    return NextResponse.json({ error: 'env_not_ready' }, { status: 503 });
  }

  // 4. Parse and validate userId — never default to super_admin implicitly
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const userId = body.userId;
  if (!userId || typeof userId !== 'string' || !DEV_USERS[userId]) {
    return NextResponse.json(
      { error: 'invalid_userId', valid: Object.keys(DEV_USERS) },
      { status: 400 }
    );
  }

  const devUser = DEV_USERS[userId];

  const sessionData = {
    userId,
    email: devUser.email,
    role: devUser.role,
    workspaceId: 'okeng',
    workspaceRole: devUser.workspaceRole,
    createdAt: Date.now(),
  };

  const response = createSessionResponse(sessionData);
  const nextRes = NextResponse.json({
    success: true,
    user: { id: userId, email: devUser.email, name: devUser.name, role: devUser.role },
    workspaceId: 'okeng',
    message: 'Dev session created — you can now visit /workspaces/okeng/collections',
  });
  for (const c of response.cookies.getAll()) {
    nextRes.cookies.set(c);
  }
  return nextRes;
}

export async function GET() {
  // Do not expose session creation via GET — per P1 review, GET must not mint sessions
  return NextResponse.json({ error: 'method_not_allowed', allowed: ['POST'] }, { status: 405 });
}
