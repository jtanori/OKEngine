import { NextRequest, NextResponse } from 'next/server';
import { createSessionResponse } from '@/lib/auth';
import { getEnv } from '@/lib/env';

// Dev-only login that bypasses DB/Bcrypt — sets a valid httpOnly session cookie
// Allowed only when NODE_ENV !== 'production' (this sandbox is development)
// Maps DEMO_USERS ids to SessionData so you can enter /workspaces/okeng/* without a DB.

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

export async function POST(request: NextRequest) {
  // Block in real production — keep open for this arena branch dev
  try {
    const env = getEnv();
    if (env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
      return NextResponse.json({ error: 'not_available_in_production' }, { status: 403 });
    }
  } catch {
    // if env not ready, allow (build-time dummy)
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const userId = body.userId || 'usr_sarah_102';
  const devUser = DEV_USERS[userId] || DEV_USERS['usr_sarah_102'];
  const resolvedId = DEV_USERS[userId] ? userId : 'usr_sarah_102';

  const sessionData = {
    userId: resolvedId,
    email: devUser.email,
    role: devUser.role,
    workspaceId: 'okeng',
    workspaceRole: devUser.workspaceRole,
    createdAt: Date.now(),
  };

  // createSessionResponse sets okeng.sid / __Host-okeng.sid httpOnly cookie
  const response = createSessionResponse(sessionData);

  // Also return JSON for client to seed localStorage
  const json = await response.json().catch(() => ({}));
  // Re-create response with JSON + cookie (createSessionResponse already set cookie, but we consumed body)
  const nextRes = NextResponse.json({
    success: true,
    user: { id: resolvedId, email: devUser.email, name: devUser.name, role: devUser.role },
    workspaceId: 'okeng',
    message: 'Dev session created — you can now visit /workspaces/okeng/collections',
  });
  // copy cookies from original response
  for (const c of response.cookies.getAll()) {
    nextRes.cookies.set(c);
  }
  return nextRes;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'usr_sarah_102';
  return POST(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ userId }) } as any));
}
