// Workspace authorization is resolved through the caller's Supabase JWT. The
// PostgreSQL RLS policies, not a shared pool or caller-supplied ID, are the
// tenant authorization boundary.
import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthResponseApplier, SessionData } from './auth';
import { createRouteSupabaseClient } from './supabase/server';

export interface WorkspaceMembership {
  workspace_id: string;
  role: string;
  status: string;
  created_at: string;
  permissions?: string[];
}

export interface WorkspaceRecord {
  id: string;
  slug: string;
  name: string;
  plan: string;
  stripe_customer_id?: string | null;
}

type PrimaryWorkspace = { workspaceId: string; role: string } | null;

/** Resolve the most recently active workspace using an already verified user JWT. */
export async function getPrimaryWorkspaceForUser(
  client: SupabaseClient,
  userId: string
): Promise<PrimaryWorkspace> {
  const { data, error } = await client
    .from('workspace_memberships')
    .select('workspace_id, role, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error('Workspace membership lookup failed');
  const membership = data?.[0];
  return membership ? { workspaceId: membership.workspace_id, role: membership.role } : null;
}

/**
 * Require an active workspace billing administrator, with all DB queries made
 * through the request's Auth JWT so the existing RLS policies apply. Callers
 * must also apply the returned response applier to preserve SSR refresh cookies.
 */
export type WorkspaceAdminResult =
  | ({ authorized: true; workspaceId: string; role: string; workspace: WorkspaceRecord } & { applyToResponse: AuthResponseApplier })
  | ({ authorized: false; status: number; error: string; message: string } & { applyToResponse: AuthResponseApplier });

export async function requireWorkspaceAdmin(
  request: NextRequest,
  session: SessionData | null,
  requestedWorkspaceId?: string
): Promise<WorkspaceAdminResult> {
  let applyToResponse: AuthResponseApplier = (response) => response;
  const denied = (status: number, error: string, message: string): WorkspaceAdminResult => ({
    authorized: false,
    status,
    error,
    message,
    applyToResponse,
  });

  if (!session) return denied(401, 'unauthorized', 'No autorizado');

  const sessionWorkspaceId = session.workspaceId;
  if (!sessionWorkspaceId) return denied(400, 'bad_request', 'Workspace ID required from session');
  if (requestedWorkspaceId && requestedWorkspaceId !== sessionWorkspaceId) {
    return denied(403, 'forbidden', 'Workspace mismatch');
  }

  try {
    const routeClient = createRouteSupabaseClient(request);
    applyToResponse = routeClient.applyToResponse;
    const { client } = routeClient;
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user || authData.user.id !== session.userId) {
      return denied(401, 'unauthorized', 'No autorizado');
    }

    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id, slug, name, plan, stripe_customer_id')
      .eq('id', sessionWorkspaceId)
      .maybeSingle();
    if (workspaceError) {
      console.error('[workspaceAuth] RLS workspace lookup failed', workspaceError.code || 'unknown');
      return denied(503, 'database_unavailable', 'Base de datos no disponible');
    }
    if (!workspace) return denied(404, 'not_found', 'Workspace not found');

    const { data: membership, error: membershipError } = await client
      .from('workspace_memberships')
      .select('role, status, permissions')
      .eq('workspace_id', sessionWorkspaceId)
      .eq('user_id', session.userId)
      .eq('status', 'ACTIVE')
      .maybeSingle();
    if (membershipError) {
      console.error('[workspaceAuth] RLS membership lookup failed', membershipError.code || 'unknown');
      return denied(503, 'database_unavailable', 'Base de datos no disponible');
    }
    if (!membership || membership.status !== 'ACTIVE') {
      return denied(403, 'forbidden', 'No active membership in workspace');
    }

    // Platform roles are not workspace billing grants. Only the active
    // workspace owner may start checkout or create a billing portal session.
    if (membership.role !== 'WORKSPACE_OWNER') {
      return denied(403, 'forbidden', 'Requires workspace owner role');
    }

    return {
      authorized: true,
      workspaceId: workspace.id,
      role: membership.role,
      workspace: workspace as WorkspaceRecord,
      applyToResponse,
    };
  } catch (error) {
    console.error('[workspaceAuth] Supabase request failed', error instanceof Error ? error.message : 'unknown error');
    return denied(503, 'database_unavailable', 'Base de datos no disponible');
  }
}

/** List all active memberships visible to a verified user-scoped Supabase client. */
export async function getWorkspacesForUser(
  client: SupabaseClient,
  userId: string
): Promise<Array<{ workspace_id: string; role: string; created_at: string }>> {
  const { data, error } = await client
    .from('workspace_memberships')
    .select('workspace_id, role, created_at')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Workspace membership lookup failed');
  return data || [];
}
