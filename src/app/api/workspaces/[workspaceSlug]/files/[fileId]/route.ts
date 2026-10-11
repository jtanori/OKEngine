import { NextRequest, NextResponse } from 'next/server';
import { getSession, validateCsrf } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { createRouteSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const BUCKET = 'workspace-files';

function json(body: unknown, status: number, apply: (response: NextResponse) => NextResponse = (response) => response) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return apply(response);
}

async function loadFileContext(
  client: ReturnType<typeof createRouteSupabaseClient>['client'],
  workspaceSlug: string,
  fileId: string
) {
  const { data: workspace, error: workspaceError } = await client
    .from('workspaces')
    .select('id')
    .eq('slug', workspaceSlug)
    .maybeSingle();
  if (workspaceError) return { error: 'database_unavailable' as const, workspace: null, file: null };
  if (!workspace) return { error: 'not_found' as const, workspace: null, file: null };

  const { data: file, error: fileError } = await client
    .from('files')
    .select('id, workspace_id, storage_path, filename, mime_type, size_bytes, upload_status')
    .eq('workspace_id', workspace.id)
    .eq('id', fileId)
    .eq('upload_status', 'ready')
    .maybeSingle();
  if (fileError) return { error: 'database_unavailable' as const, workspace: null, file: null };
  if (!file) return { error: 'not_found' as const, workspace: null, file: null };
  return { error: null, workspace, file };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ workspaceSlug: string; fileId: string }> }
) {
  const rl = await rateLimit(request, 'READ');
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limit_exceeded', retryAfter: rl.retryAfter }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter), 'Cache-Control': 'no-store' },
    });
  }

  const session = await getSession(request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  const { workspaceSlug, fileId } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workspaceSlug) || workspaceSlug.length > 96 || !/^file_[a-f0-9]{32}$/.test(fileId)) {
    return json({ error: 'not_found' }, 404);
  }

  let applyToResponse = (response: NextResponse) => response;
  try {
    const scopedClient = createRouteSupabaseClient(request);
    applyToResponse = scopedClient.applyToResponse;
    const { client } = scopedClient;
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user || authData.user.id !== session.userId) return json({ error: 'unauthorized' }, 401, applyToResponse);

    const loaded = await loadFileContext(client, workspaceSlug, fileId);
    if (loaded.error === 'database_unavailable') return json({ error: 'database_unavailable' }, 503, applyToResponse);
    if (loaded.error) return json({ error: 'not_found' }, 404, applyToResponse);

    const { data: signed, error: signedError } = await client.storage
      .from(BUCKET)
      .createSignedUrl(loaded.file.storage_path, 60, { download: loaded.file.filename });
    if (signedError || !signed.signedUrl) {
      console.warn('[files/download] Signed URL request failed', signedError?.statusCode || 'unknown');
      return json({ error: 'storage_unavailable' }, 503, applyToResponse);
    }

    return json({
      success: true,
      signedUrl: signed.signedUrl,
      expiresInSeconds: 60,
      file: {
        id: loaded.file.id,
        filename: loaded.file.filename,
        mimeType: loaded.file.mime_type,
        sizeBytes: loaded.file.size_bytes,
      },
    }, 200, applyToResponse);
  } catch (error) {
    console.error('[files/download] Supabase request failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'storage_unavailable' }, 503, applyToResponse);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ workspaceSlug: string; fileId: string }> }
) {
  const rl = await rateLimit(request, 'WRITE');
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limit_exceeded', retryAfter: rl.retryAfter }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter), 'Cache-Control': 'no-store' },
    });
  }

  if (!validateCsrf(request)) return json({ error: 'csrf_invalid' }, 403);
  const session = await getSession(request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  const { workspaceSlug, fileId } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workspaceSlug) || workspaceSlug.length > 96 || !/^file_[a-f0-9]{32}$/.test(fileId)) {
    return json({ error: 'not_found' }, 404);
  }

  let applyToResponse = (response: NextResponse) => response;
  try {
    const scopedClient = createRouteSupabaseClient(request);
    applyToResponse = scopedClient.applyToResponse;
    const { client } = scopedClient;
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user || authData.user.id !== session.userId) return json({ error: 'unauthorized' }, 401, applyToResponse);

    const loaded = await loadFileContext(client, workspaceSlug, fileId);
    if (loaded.error === 'database_unavailable') return json({ error: 'database_unavailable' }, 503, applyToResponse);
    if (loaded.error) return json({ error: 'not_found' }, 404, applyToResponse);

    const { error: storageError } = await client.storage.from(BUCKET).remove([loaded.file.storage_path]);
    // Treat an already-missing object as a completed storage step so retries can
    // finish removing stale metadata after a partial delete.
    if (storageError && String(storageError.statusCode) !== '404') {
      console.warn('[files/delete] Storage delete denied or failed', storageError.statusCode || 'unknown');
      return json({ error: storageError.statusCode === '403' ? 'forbidden' : 'storage_unavailable' }, storageError.statusCode === '403' ? 403 : 503, applyToResponse);
    }

    const { data: deleted, error: deleteError } = await client
      .from('files')
      .delete()
      .eq('workspace_id', loaded.workspace.id)
      .eq('id', loaded.file.id)
      .select('id');
    if (deleteError || !deleted?.length) {
      console.error('[files/delete] Metadata cleanup failed after object deletion', deleteError?.code || 'row_not_deleted');
      return json({ error: 'database_unavailable' }, 503, applyToResponse);
    }

    return json({ success: true }, 200, applyToResponse);
  } catch (error) {
    console.error('[files/delete] Supabase request failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'storage_unavailable' }, 503, applyToResponse);
  }
}
