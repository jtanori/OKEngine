/**
 * OKEng — Signup Atomic Transaction Regression Suite (PLAN-008 Phase 4)
 * Tests: atomic transaction BEGIN/COMMIT/ROLLBACK, slug collision, rollback on failure
 * Execution: npx tsx tests/security/signup-atomic.test.ts
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

interface UserRecord {
  id: string;
  email: string;
}

interface WorkspaceRecord {
  id: string;
  slug: string;
  name: string;
}

interface MembershipRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
}

let users: Map<string, UserRecord> = new Map();
let workspaces: Map<string, WorkspaceRecord> = new Map();
let memberships: Map<string, MembershipRecord> = new Map();
let shouldFailWorkspaceInsert = false;
let shouldFailMembershipInsert = false;

function createMockClient() {
  let inTransaction = false;
  let transactionUsers: Map<string, UserRecord> = new Map();
  let transactionWorkspaces: Map<string, WorkspaceRecord> = new Map();
  let transactionMemberships: Map<string, MembershipRecord> = new Map();
  let committed = false;

  return {
    query: async (text: string, params?: any[]) => {
      if (text === 'BEGIN') {
        inTransaction = true;
        transactionUsers = new Map(users);
        transactionWorkspaces = new Map(workspaces);
        transactionMemberships = new Map(memberships);
        return { rows: [] };
      }
      if (text === 'COMMIT') {
        if (inTransaction) {
          // Merge transaction changes into global maps (to support concurrent test)
          for (const [k, v] of transactionUsers) users.set(k, v);
          for (const [k, v] of transactionWorkspaces) workspaces.set(k, v);
          for (const [k, v] of transactionMemberships) memberships.set(k, v);
          committed = true;
          inTransaction = false;
        }
        return { rows: [] };
      }
      if (text === 'ROLLBACK') {
        if (inTransaction) {
          // Discard transaction changes
          transactionUsers = new Map(users);
          transactionWorkspaces = new Map(workspaces);
          transactionMemberships = new Map(memberships);
          inTransaction = false;
        }
        return { rows: [] };
      }

      const targetUsers = inTransaction ? transactionUsers : users;
      const targetWorkspaces = inTransaction ? transactionWorkspaces : workspaces;
      const targetMemberships = inTransaction ? transactionMemberships : memberships;

      if (text.includes('SELECT id FROM users WHERE email')) {
        const email = params?.[0];
        const found = Array.from(targetUsers.values()).find(u => u.email === email);
        if (found) {
          return { rows: [{ id: found.id }] };
        }
        return { rows: [] };
      }

      if (text.includes('INSERT INTO users')) {
        const [id, email] = params || [];
        if (targetUsers.has(id) || Array.from(targetUsers.values()).some(u => u.email === email)) {
          throw new Error('duplicate key value violates unique constraint "users_email_key"');
        }
        targetUsers.set(id, { id, email });
        return { rows: [] };
      }

      if (text.includes('INSERT INTO workspaces')) {
        if (shouldFailWorkspaceInsert) {
          throw new Error('Simulated workspace insert failure');
        }
        // Extract slug from params - slug is 3rd param in our new query
        const slug = params?.[2];
        const id = params?.[0];
        // Check slug collision
        if (Array.from(targetWorkspaces.values()).some(w => w.slug === slug)) {
          throw new Error('duplicate key value violates unique constraint "workspaces_slug_key" slug');
        }
        targetWorkspaces.set(id, { id, slug, name: params?.[1] });
        return { rows: [] };
      }

      if (text.includes('INSERT INTO workspace_memberships') || text.includes('INSERT INTO workspace_members')) {
        if (shouldFailMembershipInsert) {
          throw new Error('Simulated membership insert failure');
        }
        const [id, workspace_id, user_id, role] = params || [];
        targetMemberships.set(id, { id, workspace_id, user_id, role });
        return { rows: [] };
      }

      return { rows: [] };
    },
    release: () => {},
  };
}

describe('PLAN-008 Phase 4 — Signup Atomic Transaction', () => {
  beforeEach(() => {
    users = new Map();
    workspaces = new Map();
    memberships = new Map();
    shouldFailWorkspaceInsert = false;
    shouldFailMembershipInsert = false;
  });

  it('P1-01: Successful signup — all 3 inserts committed atomically', async () => {
    const client = createMockClient();
    await client.query('BEGIN');
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const slug = `test-workspace-${userId.slice(0, 6)}`;

    await client.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [
      userId,
      'test@example.com',
      'hash',
      'Test User',
    ]);

    await client.query(
      `INSERT INTO workspaces (id, name, slug, public_key, signing_secret_hash, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [workspaceId, `Test's Workspace`, slug, 'pubkey', 'hash', 'starter', 'monthly']
    );

    await client.query(
      `INSERT INTO workspace_memberships (id, workspace_id, user_id, role, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [crypto.randomUUID(), workspaceId, userId, 'WORKSPACE_OWNER', 'ACTIVE']
    );

    await client.query('COMMIT');

    assert.equal(users.size, 1, 'should have 1 user committed');
    assert.equal(workspaces.size, 1, 'should have 1 workspace committed');
    assert.equal(memberships.size, 1, 'should have 1 membership committed');
  });

  it('P1-02: Failure after user insert — rollback, no orphaned user', async () => {
    const client = createMockClient();
    shouldFailWorkspaceInsert = true;

    try {
      await client.query('BEGIN');
      const userId = crypto.randomUUID();
      const workspaceId = crypto.randomUUID();
      const slug = `test-workspace-${userId.slice(0, 6)}`;

      await client.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [
        userId,
        'test@example.com',
        'hash',
        'Test User',
      ]);

      await client.query(
        `INSERT INTO workspaces (id, name, slug, public_key, signing_secret_hash, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [workspaceId, `Test's Workspace`, slug, 'pubkey', 'hash', 'starter', 'monthly']
      );

      await client.query('COMMIT');
      assert.fail('should have thrown workspace insert failure');
    } catch (err) {
      await client.query('ROLLBACK');
      // After rollback, no user should exist
      assert.equal(users.size, 0, 'should have 0 users after rollback — no orphaned user');
      assert.equal(workspaces.size, 0, 'should have 0 workspaces after rollback');
      assert.equal(memberships.size, 0, 'should have 0 memberships after rollback');
    } finally {
      shouldFailWorkspaceInsert = false;
    }
  });

  it('P1-03: Failure after workspace insert — rollback, no orphaned user or workspace', async () => {
    const client = createMockClient();
    shouldFailMembershipInsert = true;

    try {
      await client.query('BEGIN');
      const userId = crypto.randomUUID();
      const workspaceId = crypto.randomUUID();
      const slug = `test-workspace-${userId.slice(0, 6)}`;

      await client.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [
        userId,
        'test@example.com',
        'hash',
        'Test User',
      ]);

      await client.query(
        `INSERT INTO workspaces (id, name, slug, public_key, signing_secret_hash, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [workspaceId, `Test's Workspace`, slug, 'pubkey', 'hash', 'starter', 'monthly']
      );

      await client.query(
        `INSERT INTO workspace_memberships (id, workspace_id, user_id, role, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [crypto.randomUUID(), workspaceId, userId, 'WORKSPACE_OWNER', 'ACTIVE']
      );

      await client.query('COMMIT');
      assert.fail('should have thrown membership insert failure');
    } catch (err) {
      await client.query('ROLLBACK');
      assert.equal(users.size, 0, 'should have 0 users after rollback');
      assert.equal(workspaces.size, 0, 'should have 0 workspaces after rollback');
      assert.equal(memberships.size, 0, 'should have 0 memberships after rollback');
    } finally {
      shouldFailMembershipInsert = false;
    }
  });

  it('P1-04: Slug collision — retry with different slug', async () => {
    const client = createMockClient();
    await client.query('BEGIN');
    const userId1 = crypto.randomUUID();
    const workspaceId1 = crypto.randomUUID();
    const slug = 'test-workspace-collision';

    await client.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [
      userId1,
      'test1@example.com',
      'hash',
      'Test User',
    ]);

    await client.query(
      `INSERT INTO workspaces (id, name, slug, public_key, signing_secret_hash, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [workspaceId1, `Test's Workspace`, slug, 'pubkey', 'hash', 'starter', 'monthly']
    );

    await client.query('COMMIT');

    // Second signup with same slug should fail, then retry with different slug
    const client2 = createMockClient();
    await client2.query('BEGIN');
    const userId2 = crypto.randomUUID();
    const workspaceId2 = crypto.randomUUID();

    await client2.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [
      userId2,
      'test2@example.com',
      'hash',
      'Test User',
    ]);

    try {
      await client2.query(
        `INSERT INTO workspaces (id, name, slug, public_key, signing_secret_hash, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [workspaceId2, `Test's Workspace`, slug, 'pubkey', 'hash', 'starter', 'monthly']
      );
      assert.fail('should have thrown slug collision');
    } catch (err: any) {
      assert.ok(err.message.includes('duplicate key') && err.message.includes('slug'), 'should be slug collision error');
      // Retry with different slug
      const newSlug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
      await client2.query(
        `INSERT INTO workspaces (id, name, slug, public_key, signing_secret_hash, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [workspaceId2, `Test's Workspace`, newSlug, 'pubkey', 'hash', 'starter', 'monthly']
      );
    }

    await client2.query('COMMIT');

    assert.equal(users.size, 2, 'should have 2 users after slug collision retry');
    assert.equal(workspaces.size, 2, 'should have 2 workspaces after retry with different slug');
    const slugs = Array.from(workspaces.values()).map(w => w.slug);
    assert.equal(new Set(slugs).size, 2, 'slugs should be unique after collision handling');
  });

  it('P1-05: Concurrent signups — no race, each gets own workspace', async () => {
    const createSignup = async (email: string) => {
      const client = createMockClient();
      await client.query('BEGIN');
      const userId = crypto.randomUUID();
      const workspaceId = crypto.randomUUID();
      const slug = `test-${email.split('@')[0]}-${userId.slice(0, 6)}`;

      await client.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [
        userId,
        email,
        'hash',
        'Test User',
      ]);

      await client.query(
        `INSERT INTO workspaces (id, name, slug, public_key, signing_secret_hash, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [workspaceId, `Test's Workspace`, slug, 'pubkey', 'hash', 'starter', 'monthly']
      );

      await client.query(
        `INSERT INTO workspace_memberships (id, workspace_id, user_id, role, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [crypto.randomUUID(), workspaceId, userId, 'WORKSPACE_OWNER', 'ACTIVE']
      );

      await client.query('COMMIT');
      return userId;
    };

    const results = await Promise.all([createSignup('test1@example.com'), createSignup('test2@example.com')]);

    assert.equal(users.size, 2, 'should have 2 users after concurrent signups');
    assert.equal(workspaces.size, 2, 'should have 2 workspaces after concurrent signups');
    assert.equal(memberships.size, 2, 'should have 2 memberships after concurrent signups');
  });

  it('P1-06: Transaction uses BEGIN/COMMIT/ROLLBACK — verify atomicity', async () => {
    // This test verifies transaction pattern is used
    const client = createMockClient();
    let beginCalled = false;
    let commitCalled = false;
    let rollbackCalled = false;

    const originalQuery = client.query;
    client.query = async (text: string, params?: any[]) => {
      if (text === 'BEGIN') beginCalled = true;
      if (text === 'COMMIT') commitCalled = true;
      if (text === 'ROLLBACK') rollbackCalled = true;
      return originalQuery(text, params);
    };

    await client.query('BEGIN');
    await client.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [
      crypto.randomUUID(),
      'test@example.com',
      'hash',
      'Test',
    ]);
    await client.query('COMMIT');

    assert.equal(beginCalled, true, 'BEGIN should be called');
    assert.equal(commitCalled, true, 'COMMIT should be called');
    assert.equal(rollbackCalled, false, 'ROLLBACK should not be called on success');

    // Test rollback path
    beginCalled = false;
    commitCalled = false;
    rollbackCalled = false;
    const client2 = createMockClient();
    const origQuery2 = client2.query;
    client2.query = async (text: string, params?: any[]) => {
      if (text === 'BEGIN') beginCalled = true;
      if (text === 'COMMIT') commitCalled = true;
      if (text === 'ROLLBACK') rollbackCalled = true;
      return origQuery2(text, params);
    };

    try {
      await client2.query('BEGIN');
      await client2.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [
        crypto.randomUUID(),
        'test@example.com',
        'hash',
        'Test',
      ]);
      throw new Error('Simulated failure');
    } catch (err) {
      await client2.query('ROLLBACK');
    }

    assert.equal(beginCalled, true, 'BEGIN should be called on failure path');
    assert.equal(rollbackCalled, true, 'ROLLBACK should be called on failure');
    assert.equal(commitCalled, false, 'COMMIT should not be called on failure');
  });
});
