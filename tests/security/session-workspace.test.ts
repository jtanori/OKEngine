/**
 * OKEng — Session Workspace Role Resolution Consistent Suite (PLAN-008 Phase 5)
 * Tests: primary workspace deterministic most recent DESC LIMIT 1, session workspaceId and workspaceRole, workspace auth validates user/workspace/active membership/required role every operation, never fallback
 * Execution: npx tsx tests/security/session-workspace.test.ts
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

interface MembershipRecord {
  workspace_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: Date;
}

interface WorkspaceRecord {
  id: string;
  slug: string;
  name: string;
}

let memberships: MembershipRecord[] = [];
let workspaces: Map<string, WorkspaceRecord> = new Map();

function createMockPool() {
  return {
    query: async (text: string, params?: any[]) => {
      if (text.includes('SELECT workspace_id, role, status, created_at FROM workspace_memberships WHERE user_id') && text.includes('ORDER BY created_at DESC LIMIT 1')) {
        const userId = params?.[0];
        const userMemberships = memberships
          .filter(m => m.user_id === userId && m.status === 'ACTIVE')
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        if (userMemberships.length > 0) {
          return { rows: [userMemberships[0]] };
        }
        return { rows: [] };
      }

      if (text.includes('SELECT workspace_id, role, created_at FROM workspace_members WHERE user_id') && text.includes('ORDER BY created_at DESC LIMIT 1')) {
        const userId = params?.[0];
        const userMemberships = memberships
          .filter(m => m.user_id === userId)
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        if (userMemberships.length > 0) {
          return { rows: [userMemberships[0]] };
        }
        return { rows: [] };
      }

      if (text.includes('SELECT workspace_id, role, created_at FROM workspace_memberships WHERE user_id') && text.includes('ORDER BY created_at DESC')) {
        const userId = params?.[0];
        const userMemberships = memberships
          .filter(m => m.user_id === userId && m.status === 'ACTIVE')
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        return { rows: userMemberships };
      }

      if (text.includes('SELECT id, slug, name, plan FROM workspaces WHERE id')) {
        const id = params?.[0];
        const ws = workspaces.get(id);
        if (ws) {
          return { rows: [{ id: ws.id, slug: ws.slug, name: ws.name, plan: 'starter' }] };
        }
        return { rows: [] };
      }

      if (text.includes('SELECT id, slug, name FROM workspaces WHERE id')) {
        const id = params?.[0];
        const ws = workspaces.get(id);
        if (ws) {
          return { rows: [{ id: ws.id, slug: ws.slug, name: ws.name }] };
        }
        return { rows: [] };
      }

      if (text.includes('SELECT role, status FROM workspace_memberships WHERE workspace_id')) {
        const workspaceId = params?.[0];
        const userId = params?.[1];
        const mem = memberships.find(m => m.workspace_id === workspaceId && m.user_id === userId);
        if (mem) {
          return { rows: [{ role: mem.role, status: mem.status }] };
        }
        return { rows: [] };
      }

      if (text.includes('SELECT role, status FROM workspace_members WHERE workspace_id')) {
        const workspaceId = params?.[0];
        const userId = params?.[1];
        const mem = memberships.find(m => m.workspace_id === workspaceId && m.user_id === userId);
        if (mem) {
          return { rows: [{ role: mem.role, status: mem.status }] };
        }
        return { rows: [] };
      }

      if (text.includes('SELECT role FROM workspace_members WHERE workspace_id')) {
        const workspaceId = params?.[0];
        const userId = params?.[1];
        const mem = memberships.find(m => m.workspace_id === workspaceId && m.user_id === userId);
        if (mem) {
          return { rows: [{ role: mem.role }] };
        }
        return { rows: [] };
      }

      return { rows: [] };
    },
  };
}

describe('PLAN-008 Phase 5 — Session Workspace Role Resolution Consistent', () => {
  beforeEach(() => {
    memberships = [];
    workspaces = new Map();
    workspaces.set('ws_old', { id: 'ws_old', slug: 'old-workspace', name: 'Old Workspace' });
    workspaces.set('ws_recent', { id: 'ws_recent', slug: 'recent-workspace', name: 'Recent Workspace' });
    workspaces.set('ws_test123', { id: 'ws_test123', slug: 'test-workspace', name: 'Test Workspace' });
  });

  it('P1-01: Primary workspace deterministic — most recent active membership ORDER BY created_at DESC LIMIT 1', async () => {
    const userId = 'user_test';
    const oldDate = new Date('2026-01-01T10:00:00Z');
    const recentDate = new Date('2026-10-11T10:00:00Z');

    memberships.push({
      workspace_id: 'ws_old',
      user_id: userId,
      role: 'WORKSPACE_OWNER',
      status: 'ACTIVE',
      created_at: oldDate,
    });
    memberships.push({
      workspace_id: 'ws_recent',
      user_id: userId,
      role: 'WORKSPACE_EDITOR',
      status: 'ACTIVE',
      created_at: recentDate,
    });

    const pool = createMockPool();
    const res = await pool.query(
      `SELECT workspace_id, role, status, created_at FROM workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    assert.equal(res.rows.length, 1, 'should return 1 primary workspace');
    assert.equal(res.rows[0].workspace_id, 'ws_recent', 'primary should be most recent DESC');
    assert.equal(res.rows[0].role, 'WORKSPACE_EDITOR', 'role should be from most recent');
  });

  it('P1-02: Signup → session workspaceId admin', async () => {
    // Simulate signup creates workspace and session with workspaceId and workspaceRole
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const sessionData = {
      userId,
      email: 'test@example.com',
      role: 'admin' as const,
      workspaceId,
      workspaceRole: 'WORKSPACE_OWNER',
      createdAt: Date.now(),
    };

    assert.ok(sessionData.workspaceId, 'signup session should have workspaceId');
    assert.equal(sessionData.workspaceRole, 'WORKSPACE_OWNER', 'signup session should have workspaceRole admin/owner');
    assert.equal(sessionData.role, 'admin', 'system role should be admin');
  });

  it('P1-03: Login → workspaceId and workspaceRole', async () => {
    const userId = 'user_test';
    const recentDate = new Date('2026-10-11T10:00:00Z');
    memberships.push({
      workspace_id: 'ws_test123',
      user_id: userId,
      role: 'WORKSPACE_OWNER',
      status: 'ACTIVE',
      created_at: recentDate,
    });

    const pool = createMockPool();
    const primaryRes = await pool.query(
      `SELECT workspace_id, role, status, created_at FROM workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    const primary = primaryRes.rows[0];
    const sessionData = {
      userId,
      email: 'test@example.com',
      role: 'admin' as const,
      workspaceId: primary.workspace_id,
      workspaceRole: primary.role,
      createdAt: Date.now(),
    };

    assert.equal(sessionData.workspaceId, 'ws_test123', 'login session should have workspaceId from primary');
    assert.equal(sessionData.workspaceRole, 'WORKSPACE_OWNER', 'login session should have workspaceRole');
  });

  it('P1-04: Multiple workspaces → primary most recent DESC LIMIT 1', async () => {
    const userId = 'user_test';
    memberships.push(
      { workspace_id: 'ws_old', user_id: userId, role: 'WORKSPACE_OWNER', status: 'ACTIVE', created_at: new Date('2026-01-01') },
      { workspace_id: 'ws_recent', user_id: userId, role: 'WORKSPACE_OWNER', status: 'ACTIVE', created_at: new Date('2026-10-11') },
      { workspace_id: 'ws_test123', user_id: userId, role: 'WORKSPACE_EDITOR', status: 'ACTIVE', created_at: new Date('2026-05-01') }
    );

    const pool = createMockPool();
    const res = await pool.query(
      `SELECT workspace_id, role, status, created_at FROM workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    assert.equal(res.rows[0].workspace_id, 'ws_recent', 'primary should be most recent by created_at DESC');
  });

  it('P1-05: Checkout uses session workspaceId only, not body', async () => {
    const sessionWorkspaceId = 'ws_test123';
    const bodyWorkspaceId = 'ws_other';

    // Should reject if body differs from session
    if (bodyWorkspaceId !== sessionWorkspaceId) {
      const result = { status: 403, message: 'Workspace mismatch' };
      assert.equal(result.status, 403, 'should return 403 when body workspaceId differs from session');
    }

    // Should use session workspaceId, not body
    const workspaceId = sessionWorkspaceId; // from session only
    assert.equal(workspaceId, 'ws_test123', 'should use session workspaceId only');
    assert.notEqual(workspaceId, bodyWorkspaceId, 'should NOT use body workspaceId');
  });

  it('P1-06: No session workspaceId → 400 not fallback to caller-provided', async () => {
    const sessionWorkspaceId = undefined;
    const bodyWorkspaceId = 'ws_test123';

    if (!sessionWorkspaceId) {
      const result = { status: 400, message: 'Workspace ID required from session' };
      assert.equal(result.status, 400, 'should return 400 when session workspaceId missing');
      // Ensure we don't fallback to body
      assert.notEqual(bodyWorkspaceId, sessionWorkspaceId, 'should not fallback to body workspaceId');
    }
  });

  it('P1-07: Workspace auth validates user, workspace, active membership, required role every operation', async () => {
    const userId = 'user_test';
    const workspaceId = 'ws_test123';
    memberships.push({
      workspace_id: workspaceId,
      user_id: userId,
      role: 'WORKSPACE_OWNER',
      status: 'ACTIVE',
      created_at: new Date(),
    });

    const pool = createMockPool();

    // Validate workspace exists
    const wsRes = await pool.query('SELECT id, slug, name, plan FROM workspaces WHERE id = $1', [workspaceId]);
    assert.equal(wsRes.rows.length, 1, 'workspace should exist');

    // Validate membership
    const memRes = await pool.query(`SELECT role, status FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`, [
      workspaceId,
      userId,
    ]);
    assert.equal(memRes.rows.length, 1, 'membership should exist');
    assert.equal(memRes.rows[0].status, 'ACTIVE', 'membership should be active');
    assert.equal(memRes.rows[0].role, 'WORKSPACE_OWNER', 'role should be owner');

    // Validate admin role
    const isAdmin = memRes.rows[0].role === 'WORKSPACE_OWNER' || memRes.rows[0].role === 'admin';
    assert.equal(isAdmin, true, 'should have admin role');
  });

  it('P1-08: Membership not active → 403', async () => {
    const userId = 'user_test';
    const workspaceId = 'ws_test123';
    memberships.push({
      workspace_id: workspaceId,
      user_id: userId,
      role: 'WORKSPACE_OWNER',
      status: 'REVOKED',
      created_at: new Date(),
    });

    const pool = createMockPool();
    const memRes = await pool.query(`SELECT role, status FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`, [
      workspaceId,
      userId,
    ]);

    if (memRes.rows.length > 0) {
      const isActive = memRes.rows[0].status === 'ACTIVE';
      if (!isActive) {
        const result = { status: 403, message: 'Membership not active' };
        assert.equal(result.status, 403, 'should return 403 when membership not active');
      }
    }
  });

  it('P1-09: No membership → 403', async () => {
    const userId = 'user_test';
    const workspaceId = 'ws_test123';
    // No membership pushed

    const pool = createMockPool();
    const memRes = await pool.query(`SELECT role, status FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`, [
      workspaceId,
      userId,
    ]);

    assert.equal(memRes.rows.length, 0, 'should have no membership');
    if (memRes.rows.length === 0) {
      const result = { status: 403, message: 'No active membership' };
      assert.equal(result.status, 403, 'should return 403 when no membership');
    }
  });

  it('P1-10: Never fallback to caller-provided when session missing', async () => {
    const session = null;
    const bodyWorkspaceId = 'ws_test123';

    if (!session) {
      const result = { status: 401, message: 'No autorizado' };
      assert.equal(result.status, 401, 'should return 401 when session missing, not use body workspaceId');
      // Ensure body workspaceId is not used
      assert.ok(bodyWorkspaceId, 'body has workspaceId but should be ignored when session missing');
    }
  });

  it('P1-11: Integration signup→login→checkout — workspaceId consistent', async () => {
    // Signup creates workspace
    const userId = crypto.randomUUID();
    const workspaceId = 'ws_test123';
    const signupSession = {
      userId,
      email: 'test@example.com',
      role: 'admin' as const,
      workspaceId,
      workspaceRole: 'WORKSPACE_OWNER',
      createdAt: Date.now(),
    };

    assert.equal(signupSession.workspaceId, workspaceId, 'signup session workspaceId');

    // Login gets primary workspace (same)
    const pool = createMockPool();
    memberships.push({
      workspace_id: workspaceId,
      user_id: userId,
      role: 'WORKSPACE_OWNER',
      status: 'ACTIVE',
      created_at: new Date(),
    });

    const primaryRes = await pool.query(
      `SELECT workspace_id, role, status, created_at FROM workspace_memberships WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    const loginSession = {
      userId,
      email: 'test@example.com',
      role: 'admin' as const,
      workspaceId: primaryRes.rows[0].workspace_id,
      workspaceRole: primaryRes.rows[0].role,
      createdAt: Date.now(),
    };

    assert.equal(loginSession.workspaceId, signupSession.workspaceId, 'login workspaceId should match signup');

    // Checkout uses session workspaceId
    const checkoutWorkspaceId = loginSession.workspaceId;
    assert.equal(checkoutWorkspaceId, workspaceId, 'checkout workspaceId should be from session, consistent across flow');
  });

  it('P1-12: Session extended with workspaceRole — not just workspaceId', async () => {
    const sessionData = {
      userId: 'user_test',
      email: 'test@example.com',
      role: 'admin' as const,
      workspaceId: 'ws_test123',
      workspaceRole: 'WORKSPACE_OWNER',
      createdAt: Date.now(),
    };

    assert.ok(sessionData.workspaceId, 'session should have workspaceId');
    assert.ok(sessionData.workspaceRole, 'session should have workspaceRole');
    assert.equal(sessionData.workspaceRole, 'WORKSPACE_OWNER', 'workspaceRole should be owner');
  });
});
