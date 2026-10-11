import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, validateCsrf } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { createRouteSupabaseClient } from '@/lib/supabase/server';
import {
  MAX_PRIVATE_MULTIPART_BYTES,
  MAX_PRIVATE_UPLOAD_BYTES,
  parseMultipartWithinLimit,
  PayloadTooLargeError,
} from '@/lib/limitedMultipart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'workspace-files';
const MAX_FILE_SIZE = MAX_PRIVATE_UPLOAD_BYTES;
const ALLOWED_MIME_TYPES = new Set(['text/markdown', 'text/plain', 'application/pdf']);
const SEGMENT_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function json(body: unknown, status: number, apply: (response: NextResponse) => NextResponse = (response) => response) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return apply(response);
}

function safeFilename(value: string): string {
  const normalized = value.normalize('NFKC').replace(/\\/g, '_').replace(/\//g, '_');
  const safe = normalized.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 120);
  return safe || 'upload';
}

async function cleanupPendingUpload(
  client: ReturnType<typeof createRouteSupabaseClient>['client'],
  fileId: string,
  storagePath: string
): Promise<void> {
  const { data: file, error: lookupError } = await client
    .from('files')
    .select('upload_status')
    .eq('id', fileId)
    .maybeSingle();
  if (lookupError || file?.upload_status !== 'pending_upload') return;

  try {
    await client.storage.from(BUCKET).remove([storagePath]);
  } catch {
    // The RPC preserves an object as `orphaned` if Storage cleanup failed.
  }
  const { error } = await client.rpc('abort_file_upload', {
    p_file_id: fileId,
    p_storage_path: storagePath,
  });
  if (error) console.warn('[files/upload] Pending upload cleanup did not complete', error.code || 'unknown');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ workspaceSlug: string }> }
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

  const { workspaceSlug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workspaceSlug) || workspaceSlug.length > 96) {
    return json({ error: 'invalid_workspace' }, 400);
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_PRIVATE_MULTIPART_BYTES) {
    return json({ error: 'file_too_large', maxBytes: MAX_FILE_SIZE }, 413);
  }

  let formData: FormData;
  try {
    formData = await parseMultipartWithinLimit(request);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return json({ error: 'file_too_large', maxBytes: MAX_FILE_SIZE }, 413);
    }
    return json({ error: 'invalid_multipart' }, 400);
  }

  const collectionIdValue = formData.get('collectionId');
  const fileValue = formData.get('file');
  if (typeof collectionIdValue !== 'string' || !SEGMENT_PATTERN.test(collectionIdValue)) {
    return json({ error: 'invalid_collection' }, 400);
  }
  if (!(fileValue instanceof File)) return json({ error: 'file_required' }, 400);
  if (fileValue.size <= 0) return json({ error: 'empty_file' }, 400);
  if (fileValue.size > MAX_FILE_SIZE) return json({ error: 'file_too_large', maxBytes: MAX_FILE_SIZE }, 413);
  if (!ALLOWED_MIME_TYPES.has(fileValue.type)) return json({ error: 'unsupported_file_type' }, 415);

  let applyToResponse = (response: NextResponse) => response;
  let fileId: string | undefined;
  let storagePath: string | undefined;
  try {
    const scopedClient = createRouteSupabaseClient(request);
    applyToResponse = scopedClient.applyToResponse;
    const { client } = scopedClient;

    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user || authData.user.id !== session.userId) {
      return json({ error: 'unauthorized' }, 401, applyToResponse);
    }

    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id')
      .eq('slug', workspaceSlug)
      .maybeSingle();
    if (workspaceError) {
      console.error('[files/upload] Workspace lookup failed', workspaceError.code || 'unknown');
      return json({ error: 'database_unavailable' }, 503, applyToResponse);
    }
    if (!workspace || !SEGMENT_PATTERN.test(workspace.id)) return json({ error: 'workspace_not_found' }, 404, applyToResponse);

    const { data: collection, error: collectionError } = await client
      .from('collections')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('id', collectionIdValue)
      .maybeSingle();
    if (collectionError) {
      console.error('[files/upload] Collection lookup failed', collectionError.code || 'unknown');
      return json({ error: 'database_unavailable' }, 503, applyToResponse);
    }
    if (!collection || !SEGMENT_PATTERN.test(collection.id)) return json({ error: 'collection_not_found' }, 404, applyToResponse);

    fileId = `file_${randomUUID().replace(/-/g, '')}`;
    storagePath = `${workspace.id}/${collection.id}/${randomUUID()}-${safeFilename(fileValue.name)}`;
    const { error: insertError } = await client.from('files').insert({
      id: fileId,
      workspace_id: workspace.id,
      collection_id: collection.id,
      storage_path: storagePath,
      filename: safeFilename(fileValue.name),
      mime_type: fileValue.type,
      size_bytes: fileValue.size,
      upload_status: 'pending_upload',
      uploaded_by: session.userId,
    });
    if (insertError) {
      console.warn('[files/upload] Metadata insert denied or failed', insertError.code || 'unknown');
      return json({ error: insertError.code === '42501' ? 'forbidden' : 'database_unavailable' }, insertError.code === '42501' ? 403 : 503, applyToResponse);
    }

    const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, await fileValue.arrayBuffer(), {
      contentType: fileValue.type,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) {
      await cleanupPendingUpload(client, fileId, storagePath);
      return json({ error: 'storage_upload_failed' }, uploadError.statusCode === '413' ? 413 : 503, applyToResponse);
    }

    const { data: completed, error: completionError } = await client.rpc('complete_file_upload', {
      p_file_id: fileId,
      p_storage_path: storagePath,
    });
    if (completionError || completed !== true) {
      console.error('[files/upload] Upload completion failed', completionError?.code || 'unknown');
      await cleanupPendingUpload(client, fileId, storagePath);
      return json({ error: 'storage_finalize_failed' }, 503, applyToResponse);
    }

    const response = NextResponse.json({
      success: true,
      file: {
        id: fileId,
        workspaceId: workspace.id,
        collectionId: collection.id,
        filename: safeFilename(fileValue.name),
        mimeType: fileValue.type,
        sizeBytes: fileValue.size,
      },
    });
    response.headers.set('Cache-Control', 'private, no-store');
    return applyToResponse(response);
  } catch (error) {
    if (fileId && storagePath) {
      try {
        const client = createRouteSupabaseClient(request).client;
        await cleanupPendingUpload(client, fileId, storagePath);
      } catch {
        // A pending metadata row remains non-readable and is safe to reconcile.
      }
    }
    console.error('[files/upload] Supabase upload request failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'storage_unavailable' }, 503, applyToResponse);
  }
}
