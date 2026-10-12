import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { composeAuthResponseAppliers, getSessionContext } from '../../src/lib/auth';
import type { RouteSupabaseClient } from '../../src/lib/supabase/server';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const previousMode = process.env.OKENG_DATA_MODE;

afterEach(() => {
  if (previousMode === undefined) delete process.env.OKENG_DATA_MODE;
  else process.env.OKENG_DATA_MODE = previousMode;
});

describe('Auth session refresh cookie propagation', () => {
  it('carries refreshed SSR cookies through the session result to the response', async () => {
    process.env.OKENG_DATA_MODE = 'supabase';

    const profile = {
      id: 'auth-user-1',
      email: 'user@example.com',
      name: 'Auth User',
      platform_role: null,
      account_status: 'ACTIVE',
    };
    const membership = {
      id: 'membership-1',
      workspace_id: 'workspace-1',
      role: 'WORKSPACE_OWNER',
      permissions: ['workspace.manage'],
      status: 'ACTIVE',
      created_at: '2026-10-11T00:00:00.000Z',
    };
    const workspace = { id: 'workspace-1', slug: 'user-workspace', name: 'User Workspace' };

    const client = {
      auth: {
        getUser: async () => ({
          data: { user: { id: 'auth-user-1', email: 'user@example.com', created_at: '2026-10-11T00:00:00.000Z' } },
          error: null,
        }),
      },
      from(table: string) {
        const result = table === 'users' ? profile : table === 'workspace_memberships' ? membership : workspace;
        const builder: Record<string, unknown> = {};
        builder.select = () => builder;
        builder.eq = () => builder;
        builder.order = () => builder;
        builder.limit = async () => ({ data: [result], error: null });
        builder.maybeSingle = async () => ({ data: result, error: null });
        return builder;
      },
    } as unknown as SupabaseClient;

    const request = new NextRequest('http://localhost/api/auth/session', {
      headers: { cookie: 'okeng-auth=stale-session' },
    });
    const createClient = (): RouteSupabaseClient => ({
      client,
      applyToResponse(response) {
        response.cookies.set('okeng-auth', 'refreshed-session', {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        });
        return response;
      },
    });

    const { session, applyToResponse } = await getSessionContext(request, createClient);
    assert.equal(session?.userId, 'auth-user-1');

    const response = applyToResponse(NextResponse.json({ authenticated: Boolean(session) }));
    assert.match(response.headers.get('set-cookie') || '', /okeng-auth=refreshed-session/);
    assert.match(response.headers.get('set-cookie') || '', /HttpOnly/i);
  });

  it('composes cookie mutations from multiple request-scoped SSR clients', () => {
    const response = composeAuthResponseAppliers(
      (target) => {
        target.cookies.set('okeng-auth-access', 'refreshed-access', { path: '/', httpOnly: true });
        return target;
      },
      (target) => {
        target.cookies.set('okeng-auth-refresh', 'refreshed-refresh', { path: '/', httpOnly: true });
        return target;
      },
    )(NextResponse.json({ ok: true }));

    const setCookie = response.headers.get('set-cookie') || '';
    assert.match(setCookie, /okeng-auth-access=refreshed-access/);
    assert.match(setCookie, /okeng-auth-refresh=refreshed-refresh/);
  });

  it('applies session refresh cookies on the session API response', () => {
    const sessionRoute = read('src/app/api/auth/session/route.ts');
    assert.match(sessionRoute, /getSessionContext\(request\)/);
    assert.match(sessionRoute, /return applyToResponse\(response\)/);
  });

  it('preserves response appliers at every app-session route call site', () => {
    const routePaths = [
      'src/app/api/billing/checkout/route.ts',
      'src/app/api/billing/portal/route.ts',
      'src/app/api/chat/stream/route.ts',
      'src/app/api/workspaces/[workspaceSlug]/files/route.ts',
      'src/app/api/workspaces/[workspaceSlug]/files/[fileId]/route.ts',
      'src/app/api/workspaces/[workspaceSlug]/overview/route.ts',
    ];

    for (const routePath of routePaths) {
      const route = read(routePath);
      assert.match(route, /getSessionContext\(request\)/, `${routePath} resolves a cookie-aware session context`);
      assert.match(route, /applyToResponse/, `${routePath} retains and applies refreshed cookies`);
      assert.doesNotMatch(route, /getSession\(request\)/, `${routePath} must not discard the response applier`);
    }
  });

  it('propagates the billing authorization client’s SSR updates as well', () => {
    const workspaceAuth = read('src/lib/workspaceAuth.ts');
    assert.match(workspaceAuth, /applyToResponse: AuthResponseApplier/);

    for (const routePath of ['src/app/api/billing/checkout/route.ts', 'src/app/api/billing/portal/route.ts']) {
      assert.match(read(routePath), /workspaceAuth\.applyToResponse/);
    }
  });
});
