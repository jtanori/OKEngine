import { config as loadEnv } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { test } from 'node:test';

loadEnv({ path: '.env.local' });

const runLive = process.env.OKENG_RUN_SUPABASE_INTEGRATION === '1';
const BUCKET = 'workspace-files';

function makeClient(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function createUser(url: string, anonKey: string, suffix: string) {
  const client = makeClient(url, anonKey);
  const { data, error } = await client.auth.signUp({
    email: `okeng-${suffix}@example.com`,
    password: `Local-Test-${randomUUID()}-9!`,
    options: { data: { name: `Local Test ${suffix}` } },
  });
  assert.equal(error, null, error?.message);
  assert.ok(data.user, 'Auth signup should return a user');
  assert.ok(data.session, 'Local Auth confirmations must be disabled for this test');
  return { client, user: data.user };
}

test('local Supabase Auth, RLS visibility, and private Storage lifecycle', { skip: !runLive }, async () => {
  const url = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(anonKey, 'SUPABASE_ANON_KEY is required in ignored .env.local');
  assert.ok(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY is required in ignored .env.local');
  assert.ok(databaseUrl, 'DATABASE_URL is required in ignored .env.local for test cleanup');
  const isLoopbackHost = (hostname: string) => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  const parsedUrl = new URL(url);
  const parsedDatabaseUrl = new URL(databaseUrl);
  assert.ok(isLoopbackHost(parsedUrl.hostname), 'This test is local-only; refusing a non-loopback Supabase URL');
  assert.ok(isLoopbackHost(parsedDatabaseUrl.hostname), 'This test is local-only; refusing a non-loopback DATABASE_URL');

  const admin = makeClient(url, serviceKey);
  const userIds: string[] = [];
  const workspaceIds: string[] = [];
  const storagePaths: string[] = [];

  try {
    const first = await createUser(url, anonKey, randomUUID());
    userIds.push(first.user.id);
    const { data: firstProfile, error: profileError } = await first.client
      .from('users')
      .select('id, auth_user_id, account_status')
      .eq('auth_user_id', first.user.id)
      .single();
    assert.equal(profileError, null, profileError?.message);
    assert.equal(firstProfile.auth_user_id, first.user.id);
    assert.equal(firstProfile.id, first.user.id);
    assert.equal(firstProfile.account_status, 'ACTIVE');

    const { data: firstProvision, error: firstProvisionError } = await first.client.rpc('provision_initial_workspace');
    assert.equal(firstProvisionError, null, firstProvisionError?.message);
    const firstWorkspace = Array.isArray(firstProvision) ? firstProvision[0] : firstProvision;
    assert.ok(firstWorkspace?.workspace_id);
    assert.ok(firstWorkspace?.workspace_slug);
    workspaceIds.push(firstWorkspace.workspace_id);

    const { data: starterCollections, error: starterCollectionError } = await first.client
      .from('collections')
      .select('id, name, visibility')
      .eq('workspace_id', firstWorkspace.workspace_id);
    assert.equal(starterCollectionError, null, starterCollectionError?.message);
    assert.equal(starterCollections?.length, 1, 'A new tenant should receive one private starter collection');
    assert.equal(starterCollections?.[0]?.name, 'Knowledge Base');
    assert.equal(starterCollections?.[0]?.visibility, 'members');

    const repeatProvisionResult = await first.client.rpc('provision_initial_workspace');
    assert.equal(repeatProvisionResult.error, null, repeatProvisionResult.error?.message);
    const repeatedWorkspace = Array.isArray(repeatProvisionResult.data) ? repeatProvisionResult.data[0] : repeatProvisionResult.data;
    assert.equal(repeatedWorkspace?.workspace_id, firstWorkspace.workspace_id, 'Provisioning must be idempotent');

    const suffix = randomUUID().replace(/-/g, '');
    const publicCollectionId = `col_public_${suffix}`;
    const membersCollectionId = `col_members_${suffix}`;
    const adminsCollectionId = `col_admins_${suffix}`;
    const collectionRows = [
      { id: publicCollectionId, workspace_id: firstWorkspace.workspace_id, name: 'Public test', visibility: 'everyone' },
      { id: membersCollectionId, workspace_id: firstWorkspace.workspace_id, name: 'Member test', visibility: 'members' },
      { id: adminsCollectionId, workspace_id: firstWorkspace.workspace_id, name: 'Admin test', visibility: 'admins' },
    ];
    const { error: collectionInsertError } = await first.client.from('collections').insert(collectionRows);
    assert.equal(collectionInsertError, null, collectionInsertError?.message);

    const documentRows = [
      { id: `doc_public_${suffix}`, workspace_id: firstWorkspace.workspace_id, collection_id: publicCollectionId, title: 'Public fixture', filename: 'public.txt', content: 'Public only fixture.' },
      { id: `doc_members_${suffix}`, workspace_id: firstWorkspace.workspace_id, collection_id: membersCollectionId, title: 'Member fixture', filename: 'members.txt', content: 'Private member fixture.' },
      { id: `doc_admins_${suffix}`, workspace_id: firstWorkspace.workspace_id, collection_id: adminsCollectionId, title: 'Admin fixture', filename: 'admins.txt', content: 'Private admin fixture.' },
    ];
    const { error: documentInsertError } = await first.client.from('documents').insert(documentRows);
    assert.equal(documentInsertError, null, documentInsertError?.message);

    const adminDocumentId = `doc_admin_${suffix}`;
    const { error: versionInsertError } = await first.client.from('document_versions').insert({
      id: `ver_admin_${suffix}`,
      workspace_id: firstWorkspace.workspace_id,
      document_id: adminDocumentId,
      version_number: 1,
      content: 'Private admin version fixture.',
      created_by: first.user.id,
    });
    assert.equal(versionInsertError, null, versionInsertError?.message);
    const { error: chunkInsertError } = await first.client.from('document_chunks').insert({
      id: `chunk_admin_${suffix}`,
      workspace_id: firstWorkspace.workspace_id,
      collection_id: adminsCollectionId,
      document_id: adminDocumentId,
      chunk_index: 0,
      content: 'Private admin chunk fixture.',
      token_count: 5,
    });
    assert.equal(chunkInsertError, null, chunkInsertError?.message);
    const { error: snapshotInsertError } = await first.client.from('shared_snapshots').insert({
      id: `snapshot_admin_${suffix}`,
      workspace_id: firstWorkspace.workspace_id,
      collection_id: adminsCollectionId,
      document_id: adminDocumentId,
      created_by: first.user.id,
      is_public_document: false,
      content_markdown: 'Private admin snapshot fixture.',
    });
    assert.equal(snapshotInsertError, null, snapshotInsertError?.message);
    const flippedPublicSnapshotId = `snapshot_flip_${suffix}`;
    const { error: publicSnapshotInsertError } = await first.client.from('shared_snapshots').insert({
      id: flippedPublicSnapshotId,
      workspace_id: firstWorkspace.workspace_id,
      collection_id: publicCollectionId,
      document_id: `doc_public_${suffix}`,
      created_by: first.user.id,
      is_public_document: true,
      content_markdown: 'Public fixture before visibility is tightened.',
    });
    assert.equal(publicSnapshotInsertError, null, publicSnapshotInsertError?.message);

    const anonymous = makeClient(url, anonKey);
    const { data: anonymousCollections, error: anonymousCollectionError } = await anonymous
      .from('collections')
      .select('id, visibility')
      .eq('workspace_id', firstWorkspace.workspace_id);
    assert.equal(anonymousCollectionError, null, anonymousCollectionError?.message);
    assert.deepEqual(anonymousCollections?.map((row) => row.id), [publicCollectionId]);

    const { data: anonymousDocuments, error: anonymousDocumentError } = await anonymous
      .from('documents')
      .select('id')
      .eq('workspace_id', firstWorkspace.workspace_id);
    assert.equal(anonymousDocumentError, null, anonymousDocumentError?.message);
    assert.deepEqual(anonymousDocuments?.map((row) => row.id), [`doc_public_${suffix}`]);
    const { data: anonymousPublicSnapshot, error: anonymousSnapshotError } = await anonymous
      .from('shared_snapshots').select('id').eq('id', flippedPublicSnapshotId);
    assert.equal(anonymousSnapshotError, null, anonymousSnapshotError?.message);
    assert.deepEqual(anonymousPublicSnapshot?.map((row) => row.id), [flippedPublicSnapshotId]);

    const invalidIdentity = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: 'Bearer invalid-not-a-supabase-jwt' } },
    });
    const { data: invalidIdentityRows, error: invalidIdentityError } = await invalidIdentity
      .from('documents')
      .select('id')
      .eq('workspace_id', firstWorkspace.workspace_id);
    assert.ok(invalidIdentityError || invalidIdentityRows?.length === 0, 'Invalid JWT must not disclose document rows');

    const second = await createUser(url, anonKey, randomUUID());
    userIds.push(second.user.id);
    const { data: secondProvision, error: secondProvisionError } = await second.client.rpc('provision_initial_workspace');
    assert.equal(secondProvisionError, null, secondProvisionError?.message);
    const secondWorkspace = Array.isArray(secondProvision) ? secondProvision[0] : secondProvision;
    assert.ok(secondWorkspace?.workspace_id);
    workspaceIds.push(secondWorkspace.workspace_id);

    const member = await createUser(url, anonKey, randomUUID());
    userIds.push(member.user.id);
    const { data: memberProvision, error: memberProvisionError } = await member.client.rpc('provision_initial_workspace');
    assert.equal(memberProvisionError, null, memberProvisionError?.message);
    const memberWorkspace = Array.isArray(memberProvision) ? memberProvision[0] : memberProvision;
    assert.ok(memberWorkspace?.workspace_id);
    workspaceIds.push(memberWorkspace.workspace_id);

    const { error: membershipInsertError } = await first.client.from('workspace_memberships').insert({
      id: `wm_member_${suffix}`,
      workspace_id: firstWorkspace.workspace_id,
      user_id: member.user.id,
      role: 'WORKSPACE_USER',
      status: 'ACTIVE',
      permissions: ['workspace.read', 'collection.read', 'content.read'],
    });
    assert.equal(membershipInsertError, null, membershipInsertError?.message);

    const { error: visibilityTightenError } = await first.client.from('collections')
      .update({ visibility: 'admins' }).eq('id', publicCollectionId);
    assert.equal(visibilityTightenError, null, visibilityTightenError?.message);
    const { data: ownerFlippedSnapshot, error: ownerFlippedSnapshotError } = await first.client
      .from('shared_snapshots').select('id').eq('id', flippedPublicSnapshotId);
    assert.equal(ownerFlippedSnapshotError, null, ownerFlippedSnapshotError?.message);
    assert.deepEqual(ownerFlippedSnapshot?.map((row) => row.id), [flippedPublicSnapshotId]);
    const { data: memberFlippedSnapshot, error: memberFlippedSnapshotError } = await member.client
      .from('shared_snapshots').select('id').eq('id', flippedPublicSnapshotId);
    assert.equal(memberFlippedSnapshotError, null, memberFlippedSnapshotError?.message);
    assert.deepEqual(memberFlippedSnapshot, [], 'A formerly public snapshot must follow its collection after visibility tightens');
    const { data: anonymousFlippedSnapshot, error: anonymousFlippedSnapshotError } = await anonymous
      .from('shared_snapshots').select('id').eq('id', flippedPublicSnapshotId);
    assert.equal(anonymousFlippedSnapshotError, null, anonymousFlippedSnapshotError?.message);
    assert.deepEqual(anonymousFlippedSnapshot, [], 'Tightened collection visibility must revoke anonymous snapshot visibility');

    const { data: ownerAdminCollection, error: ownerAdminCollectionError } = await first.client
      .from('collections').select('id').eq('id', adminsCollectionId);
    assert.equal(ownerAdminCollectionError, null, ownerAdminCollectionError?.message);
    assert.deepEqual(ownerAdminCollection?.map((row) => row.id), [adminsCollectionId]);
    const { data: memberAdminCollection, error: memberAdminCollectionError } = await member.client
      .from('collections').select('id').eq('id', adminsCollectionId);
    assert.equal(memberAdminCollectionError, null, memberAdminCollectionError?.message);
    assert.deepEqual(memberAdminCollection, [], 'A same-workspace non-owner must not read an admins collection');

    const { data: ownerAdminDocument, error: ownerAdminDocumentError } = await first.client
      .from('documents').select('id').eq('id', adminDocumentId);
    assert.equal(ownerAdminDocumentError, null, ownerAdminDocumentError?.message);
    assert.deepEqual(ownerAdminDocument?.map((row) => row.id), [adminDocumentId]);
    const { data: memberAdminDocument, error: memberAdminDocumentError } = await member.client
      .from('documents').select('id').eq('id', adminDocumentId);
    assert.equal(memberAdminDocumentError, null, memberAdminDocumentError?.message);
    assert.deepEqual(memberAdminDocument, [], 'A same-workspace non-owner must not read admins-tier documents');

    const { data: ownerAdminVersion, error: ownerAdminVersionError } = await first.client
      .from('document_versions').select('id').eq('id', `ver_admin_${suffix}`);
    assert.equal(ownerAdminVersionError, null, ownerAdminVersionError?.message);
    assert.deepEqual(ownerAdminVersion?.map((row) => row.id), [`ver_admin_${suffix}`]);
    const { data: memberAdminVersion, error: memberAdminVersionError } = await member.client
      .from('document_versions').select('id').eq('id', `ver_admin_${suffix}`);
    assert.equal(memberAdminVersionError, null, memberAdminVersionError?.message);
    assert.deepEqual(memberAdminVersion, [], 'A same-workspace non-owner must not read admins-tier document versions');

    const { data: ownerAdminChunk, error: ownerAdminChunkError } = await first.client
      .from('document_chunks').select('id').eq('id', `chunk_admin_${suffix}`);
    assert.equal(ownerAdminChunkError, null, ownerAdminChunkError?.message);
    assert.deepEqual(ownerAdminChunk?.map((row) => row.id), [`chunk_admin_${suffix}`]);
    const { data: memberAdminChunk, error: memberAdminChunkError } = await member.client
      .from('document_chunks').select('id').eq('id', `chunk_admin_${suffix}`);
    assert.equal(memberAdminChunkError, null, memberAdminChunkError?.message);
    assert.deepEqual(memberAdminChunk, [], 'A same-workspace non-owner must not read admins-tier chunks');

    const { data: ownerAdminSnapshot, error: ownerAdminSnapshotError } = await first.client
      .from('shared_snapshots').select('id').eq('id', `snapshot_admin_${suffix}`);
    assert.equal(ownerAdminSnapshotError, null, ownerAdminSnapshotError?.message);
    assert.deepEqual(ownerAdminSnapshot?.map((row) => row.id), [`snapshot_admin_${suffix}`]);
    const { data: memberAdminSnapshot, error: memberAdminSnapshotError } = await member.client
      .from('shared_snapshots').select('id').eq('id', `snapshot_admin_${suffix}`);
    assert.equal(memberAdminSnapshotError, null, memberAdminSnapshotError?.message);
    assert.deepEqual(memberAdminSnapshot, [], 'A same-workspace non-owner must not read admins-tier snapshots');

    const { data: crossTenantDocs, error: crossTenantError } = await second.client
      .from('documents')
      .select('id')
      .eq('workspace_id', firstWorkspace.workspace_id)
      .in('id', [`doc_members_${suffix}`, `doc_admins_${suffix}`]);
    assert.equal(crossTenantError, null, crossTenantError?.message);
    assert.deepEqual(crossTenantDocs, []);

    const adminFileId = `file_admin_${suffix}`;
    const adminStoragePath = `${firstWorkspace.workspace_id}/${adminsCollectionId}/${randomUUID()}-admin.txt`;
    storagePaths.push(adminStoragePath);
    const { error: adminFileMetadataError } = await first.client.from('files').insert({
      id: adminFileId,
      workspace_id: firstWorkspace.workspace_id,
      collection_id: adminsCollectionId,
      storage_path: adminStoragePath,
      filename: 'admin.txt',
      mime_type: 'text/plain',
      size_bytes: 20,
      upload_status: 'pending_upload',
      uploaded_by: first.user.id,
    });
    assert.equal(adminFileMetadataError, null, adminFileMetadataError?.message);
    const { error: adminUploadError } = await first.client.storage.from(BUCKET).upload(
      adminStoragePath,
      new Blob(['Admins-only fixture.'], { type: 'text/plain' }),
      { contentType: 'text/plain', upsert: false },
    );
    assert.equal(adminUploadError, null, adminUploadError?.message);
    const { data: adminUploadCompleted, error: adminUploadCompleteError } = await first.client.rpc('complete_file_upload', {
      p_file_id: adminFileId,
      p_storage_path: adminStoragePath,
    });
    assert.equal(adminUploadCompleteError, null, adminUploadCompleteError?.message);
    assert.equal(adminUploadCompleted, true);

    const { data: ownerAdminFile, error: ownerAdminFileError } = await first.client
      .from('files').select('id').eq('id', adminFileId);
    assert.equal(ownerAdminFileError, null, ownerAdminFileError?.message);
    assert.deepEqual(ownerAdminFile?.map((row) => row.id), [adminFileId]);
    const { data: memberAdminFile, error: memberAdminFileError } = await member.client
      .from('files').select('id').eq('id', adminFileId);
    assert.equal(memberAdminFileError, null, memberAdminFileError?.message);
    assert.deepEqual(memberAdminFile, [], 'A same-workspace non-owner must not read admins-tier file metadata');
    const { data: ownerAdminSignedUrl, error: ownerAdminSignedUrlError } = await first.client
      .storage.from(BUCKET).createSignedUrl(adminStoragePath, 60);
    assert.equal(ownerAdminSignedUrlError, null, ownerAdminSignedUrlError?.message);
    assert.ok(ownerAdminSignedUrl?.signedUrl);
    const { data: memberAdminSignedUrl, error: memberAdminSignedUrlError } = await member.client
      .storage.from(BUCKET).createSignedUrl(adminStoragePath, 60);
    assert.ok(memberAdminSignedUrlError || !memberAdminSignedUrl?.signedUrl);

    const { error: adminStorageDeleteError } = await first.client.storage.from(BUCKET).remove([adminStoragePath]);
    assert.equal(adminStorageDeleteError, null, adminStorageDeleteError?.message);
    const { data: adminFileDeleted, error: adminFileDeleteError } = await first.client
      .from('files').delete().eq('id', adminFileId).select('id');
    assert.equal(adminFileDeleteError, null, adminFileDeleteError?.message);
    assert.deepEqual(adminFileDeleted?.map((row) => row.id), [adminFileId]);
    storagePaths.splice(storagePaths.indexOf(adminStoragePath), 1);

    const fileId = `file_${suffix}`;
    const storagePath = `${firstWorkspace.workspace_id}/${membersCollectionId}/${randomUUID()}-sample.txt`;
    storagePaths.push(storagePath);
    const { error: metadataError } = await first.client.from('files').insert({
      id: fileId,
      workspace_id: firstWorkspace.workspace_id,
      collection_id: membersCollectionId,
      storage_path: storagePath,
      filename: 'sample.txt',
      mime_type: 'text/plain',
      size_bytes: 24,
      upload_status: 'pending_upload',
      uploaded_by: first.user.id,
    });
    assert.equal(metadataError, null, metadataError?.message);

    const { error: uploadError } = await first.client.storage.from(BUCKET).upload(
      storagePath,
      new Blob(['Private local fixture.'], { type: 'text/plain' }),
      { contentType: 'text/plain', upsert: false },
    );
    assert.equal(uploadError, null, uploadError?.message);

    const { data: completed, error: completeError } = await first.client.rpc('complete_file_upload', {
      p_file_id: fileId,
      p_storage_path: storagePath,
    });
    assert.equal(completeError, null, completeError?.message);
    assert.equal(completed, true);
    const retryCompletion = await first.client.rpc('complete_file_upload', {
      p_file_id: fileId,
      p_storage_path: storagePath,
    });
    assert.equal(retryCompletion.error, null, retryCompletion.error?.message);
    assert.equal(retryCompletion.data, true, 'Finalizing an already-ready object should be idempotent');

    const { data: signed, error: signedError } = await first.client.storage.from(BUCKET).createSignedUrl(storagePath, 60);
    assert.equal(signedError, null, signedError?.message);
    assert.ok(signed?.signedUrl);

    const { data: crossTenantFile, error: crossTenantFileError } = await second.client
      .from('files')
      .select('id')
      .eq('id', fileId);
    assert.equal(crossTenantFileError, null, crossTenantFileError?.message);
    assert.deepEqual(crossTenantFile, []);
    const { data: unauthorizedSignedUrl, error: unauthorizedSignedUrlError } = await second.client
      .storage.from(BUCKET).createSignedUrl(storagePath, 60);
    assert.ok(unauthorizedSignedUrlError || !unauthorizedSignedUrl?.signedUrl);

    const { error: storageDeleteError } = await first.client.storage.from(BUCKET).remove([storagePath]);
    assert.equal(storageDeleteError, null, storageDeleteError?.message);
    const { data: deletedRows, error: metadataDeleteError } = await first.client
      .from('files')
      .delete()
      .eq('id', fileId)
      .select('id');
    assert.equal(metadataDeleteError, null, metadataDeleteError?.message);
    assert.deepEqual(deletedRows?.map((row) => row.id), [fileId]);
    storagePaths.length = 0;

    // An abort with no object must remove the reservation row; an object already
    // removed above cannot become readable or be signed by another tenant.
    const cleanupFileId = `file_cleanup_${suffix}`;
    const cleanupPath = `${firstWorkspace.workspace_id}/${membersCollectionId}/${randomUUID()}-cleanup.txt`;
    const { error: cleanupMetadataError } = await first.client.from('files').insert({
      id: cleanupFileId,
      workspace_id: firstWorkspace.workspace_id,
      collection_id: membersCollectionId,
      storage_path: cleanupPath,
      filename: 'cleanup.txt',
      mime_type: 'text/plain',
      size_bytes: 12,
      upload_status: 'pending_upload',
      uploaded_by: first.user.id,
    });
    assert.equal(cleanupMetadataError, null, cleanupMetadataError?.message);
    const { data: abortResult, error: abortError } = await first.client.rpc('abort_file_upload', {
      p_file_id: cleanupFileId,
      p_storage_path: cleanupPath,
    });
    assert.equal(abortError, null, abortError?.message);
    assert.equal(abortResult, 'removed');
    const { data: cleanupRows, error: cleanupLookupError } = await first.client.from('files').select('id').eq('id', cleanupFileId);
    assert.equal(cleanupLookupError, null, cleanupLookupError?.message);
    assert.deepEqual(cleanupRows, []);
  } finally {
    for (const storagePath of storagePaths) {
      await admin.storage.from(BUCKET).remove([storagePath]).catch(() => undefined);
    }
    for (const userId of userIds) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    }

    const cleanup = new Client({ connectionString: databaseUrl });
    try {
      await cleanup.connect();
      await cleanup.query('BEGIN');
      try {
        if (workspaceIds.length > 0) {
          // Test teardown removes entire tenants; temporarily bypass only the
          // last-owner guard while FK cascades remove their memberships.
          await cleanup.query('ALTER TABLE public.workspace_memberships DISABLE TRIGGER trg_protect_last_workspace_owner');
          await cleanup.query('DELETE FROM public.workspaces WHERE id = ANY($1::text[])', [workspaceIds]);
          await cleanup.query('ALTER TABLE public.workspace_memberships ENABLE TRIGGER trg_protect_last_workspace_owner');
        }
        if (userIds.length > 0) {
          await cleanup.query('DELETE FROM public.users WHERE id = ANY($1::text[])', [userIds]);
        }
        await cleanup.query('COMMIT');
      } catch (cleanupError) {
        await cleanup.query('ROLLBACK').catch(() => undefined);
        throw cleanupError;
      }
    } finally {
      await cleanup.end().catch(() => undefined);
    }
  }
});
