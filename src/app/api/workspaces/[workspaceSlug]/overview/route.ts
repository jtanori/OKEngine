import { NextRequest, NextResponse } from 'next/server';
import { composeAuthResponseAppliers, getSessionContext } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { createRouteSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(
  body: unknown,
  status: number,
  apply: (response: NextResponse) => NextResponse = (response) => response
) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie');
  return apply(response);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ workspaceSlug: string }> }
) {
  const rl = await rateLimit(request, 'READ');
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limit_exceeded', retryAfter: rl.retryAfter }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter), 'Cache-Control': 'no-store' },
    });
  }

  const { workspaceSlug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workspaceSlug) || workspaceSlug.length > 96) {
    return json({ error: 'not_found' }, 404);
  }

  const sessionContext = await getSessionContext(request);
  const { session } = sessionContext;
  let applyToResponse = sessionContext.applyToResponse;
  if (!session) return json({ error: 'unauthorized' }, 401, applyToResponse);
  try {
    const scopedClient = createRouteSupabaseClient(request);
    applyToResponse = composeAuthResponseAppliers(sessionContext.applyToResponse, scopedClient.applyToResponse);
    const { client } = scopedClient;
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user || authData.user.id !== session.userId) {
      return json({ error: 'unauthorized' }, 401, applyToResponse);
    }

    // Workspace, collections, documents, and file metadata are all queried with
    // this caller's JWT. PostgreSQL RLS remains the tenant authorization boundary.
    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id, slug, name')
      .eq('slug', workspaceSlug)
      .maybeSingle();
    if (workspaceError) {
      console.error('[workspace/overview] Workspace lookup failed', workspaceError.code || 'unknown');
      return json({ error: 'database_unavailable' }, 503, applyToResponse);
    }
    if (!workspace || workspace.id !== session.workspaceId) {
      return json({ error: 'not_found' }, 404, applyToResponse);
    }

    const [collectionsResult, documentsResult, filesResult] = await Promise.all([
      client
        .from('collections')
        .select('id, name, description, visibility, created_at, updated_at')
        .eq('workspace_id', workspace.id)
        .order('name')
        .limit(100),
      client
        .from('documents')
        .select('id, collection_id, title, filename, status, chunk_count, created_at, updated_at')
        .eq('workspace_id', workspace.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100),
      client
        .from('files')
        .select('id, collection_id, filename, mime_type, size_bytes, created_at')
        .eq('workspace_id', workspace.id)
        .eq('upload_status', 'ready')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    const queryError = collectionsResult.error || documentsResult.error || filesResult.error;
    if (queryError) {
      console.error('[workspace/overview] Tenant data lookup failed', queryError.code || 'unknown');
      return json({ error: 'database_unavailable' }, 503, applyToResponse);
    }

    const response = NextResponse.json({
      workspace,
      collections: collectionsResult.data || [],
      documents: documentsResult.data || [],
      files: filesResult.data || [],
      truncated: {
        collections: (collectionsResult.data?.length || 0) === 100,
        documents: (documentsResult.data?.length || 0) === 100,
        files: (filesResult.data?.length || 0) === 100,
      },
    });
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'Cookie');
    return applyToResponse(response);
  } catch (error) {
    console.error('[workspace/overview] Supabase request failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'database_unavailable' }, 503, applyToResponse);
  }
}
