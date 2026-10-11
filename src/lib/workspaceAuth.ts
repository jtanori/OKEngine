// src/lib/workspaceAuth.ts — Consistent workspace auth with primary workspace deterministic (P1 Phase 5)
// Implements: primary workspace selection most recent active membership ORDER BY created_at DESC LIMIT 1,
// requireWorkspaceAdmin validates user, workspace, active membership, required role every operation, never fallback to caller-provided when session missing

import { getPool } from './db';
import { SessionData } from './auth';

export interface WorkspaceMembership {
  workspace_id: string;
  role: string;
  status: string;
  created_at: string;
}

export interface WorkspaceRecord {
  id: string;
  slug: string;
  name: string;
  plan: string;
  stripe_customer_id?: string | null;
}

/**
 * Get primary workspace for user — most recent active membership ORDER BY created_at DESC LIMIT 1
 * Deterministic default but not proof for billing — billing operations must still validate membership
 */
export async function getPrimaryWorkspaceForUser(userId: string): Promise<{ workspaceId: string; role: string } | null> {
  const pool = getPool();

  // Try new canonical table first
  try {
    const res = await pool.query(
      `SELECT workspace_id, role, status, created_at FROM workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (res.rows.length > 0) {
      return { workspaceId: res.rows[0].workspace_id, role: res.rows[0].role };
    }
  } catch (err) {
    console.warn('[workspaceAuth] workspace_memberships query failed, trying legacy', err);
  }

  // Fallback to legacy workspace_members
  try {
    const res = await pool.query(
      `SELECT workspace_id, role, created_at FROM workspace_members WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (res.rows.length > 0) {
      return { workspaceId: res.rows[0].workspace_id, role: res.rows[0].role };
    }
  } catch (err) {
    console.warn('[workspaceAuth] workspace_members query failed', err);
  }

  return null;
}

/**
 * Require workspace admin — validates authenticated user, requested workspace, active membership, required role every time
 * Never fallback to caller-provided ID when session missing
 * Returns workspace record if authorized, throws or returns error response otherwise
 */
export async function requireWorkspaceAdmin(
  session: SessionData | null,
  requestedWorkspaceId?: string
): Promise<
  | { authorized: true; workspaceId: string; role: string; workspace: WorkspaceRecord }
  | { authorized: false; status: number; error: string; message: string }
> {
  if (!session) {
    return { authorized: false, status: 401, error: 'unauthorized', message: 'No autorizado' };
  }

  // Workspace ID must come from session, never fallback to caller-provided when session missing
  // If session has workspaceId, use it. If requestedWorkspaceId differs, reject
  const sessionWorkspaceId = session.workspaceId;
  if (!sessionWorkspaceId) {
    return { authorized: false, status: 400, error: 'bad_request', message: 'Workspace ID required from session' };
  }

  if (requestedWorkspaceId && requestedWorkspaceId !== sessionWorkspaceId) {
    return { authorized: false, status: 403, error: 'forbidden', message: 'Workspace mismatch: body workspaceId differs from session' };
  }

  const workspaceId = sessionWorkspaceId;
  const pool = getPool();

  // Validate workspace exists
  let workspace: WorkspaceRecord | null = null;
  try {
    const res = await pool.query('SELECT id, slug, name, plan FROM workspaces WHERE id = $1', [workspaceId]);
    if (res.rows.length === 0) {
      return { authorized: false, status: 404, error: 'not_found', message: 'Workspace not found' };
    }
    workspace = res.rows[0];
  } catch (err: any) {
    // Fallback if plan column missing
    if (err.message && err.message.includes('plan')) {
      try {
        const res2 = await pool.query('SELECT id, slug, name FROM workspaces WHERE id = $1', [workspaceId]);
        if (res2.rows.length === 0) {
          return { authorized: false, status: 404, error: 'not_found', message: 'Workspace not found' };
        }
        workspace = { id: res2.rows[0].id, slug: res2.rows[0].slug, name: res2.rows[0].name, plan: 'starter' };
      } catch (err2) {
        console.error('[workspaceAuth] Workspace lookup failed', err2);
        return { authorized: false, status: 500, error: 'internal_error', message: 'DB error' };
      }
    } else {
      console.error('[workspaceAuth] Workspace lookup failed', err);
      return { authorized: false, status: 500, error: 'internal_error', message: 'DB error' };
    }
  }

  // Validate active membership and admin role
  let membership: { role: string; status: string } | null = null;
  try {
    const memRes = await pool.query(
      `SELECT role, status FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, session.userId]
    );
    if (memRes.rows.length > 0) {
      membership = memRes.rows[0];
    } else {
      // Fallback to legacy
      const legacyRes = await pool.query(`SELECT role, status FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`, [
        workspaceId,
        session.userId,
      ]);
      if (legacyRes.rows.length > 0) {
        membership = legacyRes.rows[0];
      } else {
        // Try without status column
        const legacyRes2 = await pool.query(`SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`, [
          workspaceId,
          session.userId,
        ]);
        if (legacyRes2.rows.length > 0) {
          membership = { role: legacyRes2.rows[0].role, status: 'ACTIVE' };
        }
      }
    }
  } catch (err) {
    console.warn('[workspaceAuth] Membership lookup failed', err);
  }

  if (!membership) {
    return { authorized: false, status: 403, error: 'forbidden', message: 'No active membership in workspace' };
  }

  const isActive = membership.status === 'ACTIVE' || membership.status === 'active' || !membership.status;
  if (!isActive) {
    return { authorized: false, status: 403, error: 'forbidden', message: 'Membership not active' };
  }

  const isAdmin = membership.role === 'WORKSPACE_OWNER' || membership.role === 'admin' || membership.role === 'owner' || membership.role === 'WORKSPACE_EDITOR' || session.role === 'admin' || session.role === 'super_admin';
  // For billing operations, require admin — but allow editor? Plan says require admin, so check admin
  const isBillingAdmin = membership.role === 'WORKSPACE_OWNER' || membership.role === 'admin' || membership.role === 'owner' || session.role === 'admin' || session.role === 'super_admin';
  if (!isBillingAdmin) {
    return { authorized: false, status: 403, error: 'forbidden', message: 'Requires admin role' };
  }

  return { authorized: true, workspaceId, role: membership.role, workspace: workspace! };
}

/**
 * Get all workspaces for user ordered by created_at DESC — for primary selection and listing
 */
export async function getWorkspacesForUser(userId: string): Promise<Array<{ workspace_id: string; role: string; created_at: string }>> {
  const pool = getPool();
  try {
    const res = await pool.query(
      `SELECT workspace_id, role, created_at FROM workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  } catch (err) {
    console.warn('[workspaceAuth] getWorkspacesForUser failed, trying legacy', err);
    try {
      const res = await pool.query(`SELECT workspace_id, role, created_at FROM workspace_members WHERE user_id = $1 ORDER BY created_at DESC`, [
        userId,
      ]);
      return res.rows;
    } catch (err2) {
      console.warn('[workspaceAuth] legacy getWorkspacesForUser also failed', err2);
      return [];
    }
  }
}
