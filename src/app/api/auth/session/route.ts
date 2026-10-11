import { NextRequest, NextResponse } from 'next/server';
import { getAuthDataMode, getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns only the current caller's safe UI/session projection. Auth access and
 * refresh tokens stay in the HttpOnly cookie and never enter browser JavaScript.
 */
export async function GET(request: NextRequest) {
  const mode = getAuthDataMode();
  const session = await getSession(request);
  const response = NextResponse.json({
    mode,
    authenticated: Boolean(session),
    session: session ? {
      userId: session.userId,
      email: session.email,
      name: session.name || session.email.split('@')[0],
      role: session.role,
      workspaceId: session.workspaceId,
      workspaceSlug: session.workspaceSlug,
      workspaceName: session.workspaceName,
      workspaceRole: session.workspaceRole,
      permissions: session.permissions || [],
      createdAt: session.createdAt,
    } : null,
  });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie');
  return response;
}
