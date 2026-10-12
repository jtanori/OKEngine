import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { test } from 'node:test';
import { POST as signup } from '../../src/app/api/auth/signup/route';
import { POST as login } from '../../src/app/api/auth/login/route';
import { POST as uploadRoute } from '../../src/app/api/workspaces/[workspaceSlug]/files/route';
import { GET as downloadRoute, DELETE as deleteRoute } from '../../src/app/api/workspaces/[workspaceSlug]/files/[fileId]/route';
import {
  confirmLocalSignup,
  createLocalCleanup,
  getResponseCookies,
  makeApiRequest,
  makeSupabaseClient,
  nextTestIp,
  queryLocalDatabase,
  readAuthSessionCookie,
  requireLocalSupabase,
  type CookieValue,
  LOCAL_APP_ORIGIN,
} from './helpers/localSupabase';

const local = requireLocalSupabase();

async function createAppSession(cleanup: ReturnType<typeof createLocalCleanup>, label: string) {
  const email = `okeng-storage-${label}-${randomUUID()}@example.com`;
  const password = `Storage-Test-${randomUUID()}-9!`;
  const signupResponse = await signup(makeApiRequest('/api/auth/signup', {
    method: 'POST', csrf: true,
    body: { name: `Storage ${label}`, email, password, terms: true },
  }));
  const signupBody = await signupResponse.json();
  assert.equal(signupResponse.status, 200, `Local signup failed with ${signupBody?.error || signupResponse.status}.`);
  assert.equal(signupBody.confirmationRequired, true);
  const pendingUsers = await cleanup.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.equal(pendingUsers.error, null, pendingUsers.error?.message);
  const pendingUser = pendingUsers.data.users.find(({ email: candidate }) => candidate === email);
  assert.ok(pendingUser, 'The pending Auth signup must be available for its one-time confirmation flow.');
  cleanup.trackUser(pendingUser.id);
  const confirmedUser = await confirmLocalSignup(local, email, password);
  assert.equal(confirmedUser.id, pendingUser.id);

  const loginResponse = await login(makeApiRequest('/api/auth/login', {
    method: 'POST', csrf: true,
    body: { email, password, remember: false },
  }));
  const loginBody = await loginResponse.json();
  assert.equal(loginResponse.status, 200, `Local login failed with ${loginBody?.error || loginResponse.status}.`);
  cleanup.trackUser(loginBody.user.id);
  cleanup.trackWorkspace(loginBody.workspace.id);
  return { email, password, body: loginBody, cookies: getResponseCookies(loginResponse) };
}

function makeMultipartUploadRequest(
  workspaceSlug: string,
  cookies: CookieValue[],
  collectionId: string,
  file: File,
): NextRequest {
  const formData = new FormData();
  formData.set('collectionId', collectionId);
  formData.set('file', file);
  const request = new NextRequest(new URL(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/files`,
    LOCAL_APP_ORIGIN,
  ), {
    method: 'POST',
    headers: {
      'x-real-ip': nextTestIp(),
      'x-csrf-token': 'local-integration-csrf',
    },
    body: formData,
  });
  for (const cookie of cookies) request.cookies.set(cookie.name, cookie.value);
  request.cookies.set('okeng.csrf', 'local-integration-csrf');
  return request;
}

test('real app file routes bind uploads to metadata, authorize signed downloads, and delete Storage plus metadata', async () => {
  const cleanup = createLocalCleanup(local);
  try {
    const owner = await createAppSession(cleanup, 'owner');
    const collectionRows = await queryLocalDatabase<{ id: string }>(local, `
      SELECT id FROM public.collections WHERE workspace_id = $1 ORDER BY created_at LIMIT 1
    `, [owner.body.workspace.id]);
    assert.equal(collectionRows.length, 1, 'Signup must provision exactly one private starter collection.');
    const collectionId = collectionRows[0]!.id;
    const filename = 'private-notes.txt';
    const fileText = `Private local storage fixture ${randomUUID()}\n`;

    const upload = await uploadRoute(
      makeMultipartUploadRequest(
        owner.body.workspace.slug,
        owner.cookies,
        collectionId,
        new File([fileText], filename, { type: 'text/plain' }),
      ),
      { params: Promise.resolve({ workspaceSlug: owner.body.workspace.slug }) },
    );
    const uploadBody = await upload.json();
    assert.equal(upload.status, 200, JSON.stringify(uploadBody));
    assert.equal(uploadBody.success, true);
    assert.equal(uploadBody.file.workspaceId, owner.body.workspace.id);
    assert.equal(uploadBody.file.collectionId, collectionId);
    assert.equal(uploadBody.file.filename, filename);
    const fileId = uploadBody.file.id as string;
    assert.match(fileId, /^file_[a-f0-9]{32}$/);

    const metadata = await queryLocalDatabase<{
      workspace_id: string;
      collection_id: string;
      storage_path: string;
      uploaded_by: string;
      upload_status: string;
      size_bytes: number;
    }>(local, `
      SELECT workspace_id, collection_id, storage_path, uploaded_by, upload_status, size_bytes
      FROM public.files WHERE id = $1
    `, [fileId]);
    assert.equal(metadata.length, 1);
    assert.equal(metadata[0]?.workspace_id, owner.body.workspace.id);
    assert.equal(metadata[0]?.collection_id, collectionId);
    assert.equal(metadata[0]?.uploaded_by, owner.body.user.id);
    assert.equal(metadata[0]?.upload_status, 'ready', 'The application route must finalize metadata only after the Storage write.');
    assert.equal(Number(metadata[0]?.size_bytes), Buffer.byteLength(fileText));
    assert.ok(metadata[0]!.storage_path.startsWith(`${owner.body.workspace.id}/${collectionId}/`));
    assert.ok(metadata[0]!.storage_path.endsWith(`-${filename}`));
    cleanup.trackStoragePath(metadata[0]!.storage_path);

    const download = await downloadRoute(
      makeApiRequest(`/api/workspaces/${encodeURIComponent(owner.body.workspace.slug)}/files/${encodeURIComponent(fileId)}`, {
        cookies: owner.cookies,
      }),
      { params: Promise.resolve({ workspaceSlug: owner.body.workspace.slug, fileId }) },
    );
    const downloadBody = await download.json();
    assert.equal(download.status, 200);
    assert.equal(downloadBody.success, true);
    assert.equal(downloadBody.expiresInSeconds, 60);
    assert.equal(downloadBody.file.id, fileId);
    assert.equal('access_token' in downloadBody, false);
    assert.equal('refresh_token' in downloadBody, false);
    const signedResponse = await fetch(downloadBody.signedUrl);
    assert.equal(signedResponse.status, 200, 'The authorized 60-second signed Storage URL must download the private object.');
    assert.equal(await signedResponse.text(), fileText);

    const anonymous = makeSupabaseClient(local.url, local.anonKey);
    const anonymousDownload = await anonymous.storage.from('workspace-files').download(metadata[0]!.storage_path);
    assert.ok(anonymousDownload.error || !anonymousDownload.data, 'Anonymous Storage reads must not access private workspace objects.');

    const other = await createAppSession(cleanup, 'other-tenant');
    const crossTenantDownload = await downloadRoute(
      makeApiRequest(`/api/workspaces/${encodeURIComponent(owner.body.workspace.slug)}/files/${encodeURIComponent(fileId)}`, {
        cookies: other.cookies,
      }),
      { params: Promise.resolve({ workspaceSlug: owner.body.workspace.slug, fileId }) },
    );
    const crossTenantBody = await crossTenantDownload.json();
    assert.equal(crossTenantDownload.status, 404);
    assert.equal(crossTenantBody.error, 'not_found');
    assert.equal('signedUrl' in crossTenantBody, false, 'Cross-tenant callers must not receive a Storage signed URL.');

    const deletion = await deleteRoute(
      makeApiRequest(`/api/workspaces/${encodeURIComponent(owner.body.workspace.slug)}/files/${encodeURIComponent(fileId)}`, {
        method: 'DELETE', csrf: true, cookies: owner.cookies,
      }),
      { params: Promise.resolve({ workspaceSlug: owner.body.workspace.slug, fileId }) },
    );
    assert.equal(deletion.status, 200, JSON.stringify(await deletion.clone().json()));
    assert.deepEqual(await deletion.json(), { success: true });
    const afterDelete = await queryLocalDatabase<{ count: string }>(local, 'SELECT COUNT(*)::text AS count FROM public.files WHERE id = $1', [fileId]);
    assert.equal(afterDelete[0]?.count, '0', 'Delete must remove both the object and its metadata.');
    const signedAfterDelete = await fetch(downloadBody.signedUrl);
    assert.ok([400, 404].includes(signedAfterDelete.status), 'A deleted private object must no longer be retrievable by its prior signed URL.');

    const noSession = await downloadRoute(
      makeApiRequest(`/api/workspaces/${encodeURIComponent(owner.body.workspace.slug)}/files/${encodeURIComponent(fileId)}`),
      { params: Promise.resolve({ workspaceSlug: owner.body.workspace.slug, fileId }) },
    );
    assert.equal(noSession.status, 401, 'Download requires the application session even after object deletion.');

    // Exercise the narrow abort RPC as the real Auth user: an uncommitted
    // reservation with no object is removed; an object that remains is marked
    // orphaned and cannot be signed for reading.
    const session = readAuthSessionCookie(owner.cookies);
    const ownerClient = makeSupabaseClient(local.url, local.anonKey);
    const setSession = await ownerClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    assert.equal(setSession.error, null, setSession.error?.message);
    assert.equal(setSession.data.user?.id, owner.body.user.id);

    const abortId = `file_${randomUUID().replace(/-/g, '')}`;
    const abortPath = `${owner.body.workspace.id}/${collectionId}/${randomUUID()}-abort.txt`;
    const abortMetadata = await ownerClient.from('files').insert({
      id: abortId,
      workspace_id: owner.body.workspace.id,
      collection_id: collectionId,
      storage_path: abortPath,
      filename: 'abort.txt',
      mime_type: 'text/plain',
      size_bytes: Buffer.byteLength('Not uploaded.'),
      upload_status: 'pending_upload',
      uploaded_by: owner.body.user.id,
    });
    assert.equal(abortMetadata.error, null, abortMetadata.error?.message);
    const aborted = await ownerClient.rpc('abort_file_upload', { p_file_id: abortId, p_storage_path: abortPath });
    assert.equal(aborted.error, null, aborted.error?.message);
    assert.equal(aborted.data, 'removed');
    const removedReservation = await queryLocalDatabase<{ count: string }>(local, 'SELECT COUNT(*)::text AS count FROM public.files WHERE id = $1', [abortId]);
    assert.equal(removedReservation[0]?.count, '0');

    const orphanId = `file_${randomUUID().replace(/-/g, '')}`;
    const orphanPath = `${owner.body.workspace.id}/${collectionId}/${randomUUID()}-orphan.txt`;
    cleanup.trackStoragePath(orphanPath);
    const orphanMetadata = await ownerClient.from('files').insert({
      id: orphanId,
      workspace_id: owner.body.workspace.id,
      collection_id: collectionId,
      storage_path: orphanPath,
      filename: 'orphan.txt',
      mime_type: 'text/plain',
      size_bytes: Buffer.byteLength('Orphan fixture.'),
      upload_status: 'pending_upload',
      uploaded_by: owner.body.user.id,
    });
    assert.equal(orphanMetadata.error, null, orphanMetadata.error?.message);
    const orphanUpload = await ownerClient.storage.from('workspace-files').upload(
      orphanPath,
      new Blob(['Orphan fixture.'], { type: 'text/plain' }),
      { contentType: 'text/plain', upsert: false },
    );
    assert.equal(orphanUpload.error, null, orphanUpload.error?.message);
    const orphaned = await ownerClient.rpc('abort_file_upload', { p_file_id: orphanId, p_storage_path: orphanPath });
    assert.equal(orphaned.error, null, orphaned.error?.message);
    assert.equal(orphaned.data, 'orphaned');
    const orphanSigned = await ownerClient.storage.from('workspace-files').createSignedUrl(orphanPath, 60);
    assert.ok(orphanSigned.error || !orphanSigned.data?.signedUrl, 'Orphaned objects must remain unreadable until reconciled.');
    const orphanState = await queryLocalDatabase<{ upload_status: string }>(local, 'SELECT upload_status FROM public.files WHERE id = $1', [orphanId]);
    assert.equal(orphanState[0]?.upload_status, 'orphaned');
  } finally {
    await cleanup.cleanup();
  }
});
