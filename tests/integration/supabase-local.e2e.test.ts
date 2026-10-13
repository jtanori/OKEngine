import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmLocalSignup, queryLocalDatabase, requireLocalSupabase } from './helpers/localSupabase';

const local = requireLocalSupabase();
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

async function createUser(config: typeof local, suffix: string) {
  const client = makeClient(config.url, config.anonKey);
  const email = `okeng-${suffix}@example.com`;
  const password = `Local-Test-${randomUUID()}-9!`;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name: `Local Test ${suffix}` } },
  });
  assert.equal(error, null, error?.message);
  assert.ok(data.user, 'Auth signup should return a pending user before email confirmation.');
  assert.equal(data.session, null, 'Auth must not issue a session before local email confirmation.');
  const user = await confirmLocalSignup(config, email, password, client);
  assert.equal(user.id, data.user.id);
  return { client, user };
}

test('runtime tenant RLS, collection visibility, and private Storage policies on local Supabase', async () => {
  const { url, anonKey, serviceRoleKey: serviceKey, databaseUrl } = local;
  const admin = makeClient(url, serviceKey);
  const userIds: string[] = [];
  const workspaceIds: string[] = [];
  const storagePaths: string[] = [];

  try {
    const first = await createUser(local, randomUUID());
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

    const concurrentProvisioning = await Promise.all(
      Array.from({ length: 6 }, () => first.client.rpc('provision_initial_workspace')),
    );
    for (const result of concurrentProvisioning) assert.equal(result.error, null, result.error?.message);
    const provisionedRows = concurrentProvisioning.map(({ data }) => Array.isArray(data) ? data[0] : data);
    const firstWorkspace = provisionedRows[0];
    assert.ok(firstWorkspace?.workspace_id);
    assert.ok(firstWorkspace?.workspace_slug);
    assert.deepEqual(
      new Set(provisionedRows.map((row) => row?.workspace_id)).size,
      1,
      'Concurrent callback/signup attempts must serialize on one initial workspace.',
    );
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

    const adminDocumentId = `doc_admins_${suffix}`;
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
    const anonymousProvisioning = await anonymous.rpc('provision_initial_workspace');
    assert.ok(anonymousProvisioning.error, 'Anonymous callers must not execute workspace provisioning.');
    const anonymousCompletion = await anonymous.rpc('complete_file_upload', {
      p_file_id: `file_anonymous_${suffix}`,
      p_storage_path: `${firstWorkspace.workspace_id}/${membersCollectionId}/anonymous.txt`,
    });
    assert.ok(anonymousCompletion.error || anonymousCompletion.data !== true, 'Anonymous callers must not complete a private upload.');
    const anonymousAbort = await anonymous.rpc('abort_file_upload', {
      p_file_id: `file_anonymous_${suffix}`,
      p_storage_path: `${firstWorkspace.workspace_id}/${membersCollectionId}/anonymous.txt`,
    });
    assert.ok(anonymousAbort.error || !['removed', 'orphaned'].includes(anonymousAbort.data), 'Anonymous callers must not abort a private upload.');
    const anonymousWorkspaces = await anonymous.from('workspaces').select('id').eq('id', firstWorkspace.workspace_id);
    assert.ok(
      anonymousWorkspaces.error || anonymousWorkspaces.data?.length === 0,
      'Anonymous callers must not read private tenant roots whether denied by table grants or RLS.',
    );
    const anonymousProfiles = await anonymous.from('users').select('id').eq('id', first.user.id);
    assert.ok(anonymousProfiles.error || anonymousProfiles.data?.length === 0, 'Anonymous callers must not enumerate profiles.');

    const invalidIdentity = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: 'Bearer invalid-not-a-supabase-jwt' } },
    });
    const { data: invalidIdentityRows, error: invalidIdentityError } = await invalidIdentity
      .from('documents')
      .select('id')
      .eq('workspace_id', firstWorkspace.workspace_id);
    assert.ok(invalidIdentityError || invalidIdentityRows?.length === 0, 'Invalid JWT must not disclose document rows');

    const second = await createUser(local, randomUUID());
    userIds.push(second.user.id);
    const { data: secondProvision, error: secondProvisionError } = await second.client.rpc('provision_initial_workspace');
    assert.equal(secondProvisionError, null, secondProvisionError?.message);
    const secondWorkspace = Array.isArray(secondProvision) ? secondProvision[0] : secondProvision;
    assert.ok(secondWorkspace?.workspace_id);
    workspaceIds.push(secondWorkspace.workspace_id);
    assert.notEqual(secondWorkspace.workspace_id, firstWorkspace.workspace_id);

    const secondPrivateWorkspace = await second.client.from('workspaces').select('id').eq('id', firstWorkspace.workspace_id);
    assert.equal(secondPrivateWorkspace.error, null, secondPrivateWorkspace.error?.message);
    assert.deepEqual(secondPrivateWorkspace.data, [], 'Workspace RLS must hide a different tenant root.');
    const secondOtherProfile = await second.client.from('users').select('id').eq('id', first.user.id);
    assert.equal(secondOtherProfile.error, null, secondOtherProfile.error?.message);
    assert.deepEqual(secondOtherProfile.data, [], 'Profile RLS must hide unrelated users.');
    const secondOtherMemberships = await second.client.from('workspace_memberships')
      .select('id').eq('workspace_id', firstWorkspace.workspace_id);
    assert.ok(secondOtherMemberships.error || secondOtherMemberships.data?.length === 0, 'Membership RLS must hide another tenant\'s users.');
    const foreignProfileUpdate = await second.client.from('users')
      .update({ platform_role: 'PLATFORM_OWNER' })
      .eq('id', first.user.id)
      .select('id');
    assert.ok(foreignProfileUpdate.error || foreignProfileUpdate.data?.length === 0, 'A tenant cannot mutate another user\'s profile or privileges.');
    const foreignCollectionUpdate = await second.client.from('collections')
      .update({ name: 'Cross-tenant mutation' })
      .eq('id', publicCollectionId)
      .select('id');
    assert.ok(foreignCollectionUpdate.error || foreignCollectionUpdate.data?.length === 0, 'A tenant cannot mutate another workspace\'s collection.');
    const forgedCollection = await second.client.from('collections').insert({
      id: `col_forged_${randomUUID().replace(/-/g, '')}`,
      workspace_id: firstWorkspace.workspace_id,
      name: 'Forged cross-tenant collection',
      visibility: 'everyone',
    }).select('id');
    assert.ok(forgedCollection.error || forgedCollection.data?.length === 0, 'A tenant cannot insert a collection into another workspace.');

    const member = await createUser(local, randomUUID());
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

    const editor = await createUser(local, randomUUID());
    userIds.push(editor.user.id);
    const { data: editorProvision, error: editorProvisionError } = await editor.client.rpc('provision_initial_workspace');
    assert.equal(editorProvisionError, null, editorProvisionError?.message);
    const editorWorkspace = Array.isArray(editorProvision) ? editorProvision[0] : editorProvision;
    assert.ok(editorWorkspace?.workspace_id);
    workspaceIds.push(editorWorkspace.workspace_id);
    const { error: editorMembershipError } = await first.client.from('workspace_memberships').insert({
      id: `wm_editor_${suffix}`,
      workspace_id: firstWorkspace.workspace_id,
      user_id: editor.user.id,
      role: 'WORKSPACE_USER',
      status: 'ACTIVE',
      permissions: ['workspace.read', 'collection.read', 'content.read', 'content.write'],
    });
    assert.equal(editorMembershipError, null, editorMembershipError?.message);

    const roleEscalation = await member.client.from('workspace_memberships')
      .update({ role: 'WORKSPACE_OWNER', permissions: ['workspace.settings.manage', 'content.write', 'content.delete'] })
      .eq('workspace_id', firstWorkspace.workspace_id)
      .eq('user_id', member.user.id)
      .select('role, permissions');
    assert.ok(roleEscalation.error || roleEscalation.data?.length === 0, 'A member cannot escalate its own workspace role or permissions.');
    const platformEscalation = await member.client.from('users')
      .update({ platform_role: 'PLATFORM_OWNER' })
      .eq('id', member.user.id)
      .select('platform_role');
    assert.ok(platformEscalation.error || platformEscalation.data?.length === 0, 'A user cannot grant itself platform privileges.');
    const protectedMembership = await first.client.from('workspace_memberships')
      .select('role, permissions')
      .eq('workspace_id', firstWorkspace.workspace_id)
      .eq('user_id', member.user.id)
      .single();
    assert.equal(protectedMembership.error, null, protectedMembership.error?.message);
    assert.equal(protectedMembership.data.role, 'WORKSPACE_USER');
    assert.deepEqual(protectedMembership.data.permissions, ['workspace.read', 'collection.read', 'content.read']);
    const protectedProfile = await first.client.from('users')
      .select('platform_role')
      .eq('id', member.user.id)
      .single();
    assert.equal(protectedProfile.error, null, protectedProfile.error?.message);
    assert.equal(protectedProfile.data.platform_role, null);

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

    const untrackedPath = `${firstWorkspace.workspace_id}/${membersCollectionId}/${randomUUID()}-untracked.txt`;
    const untrackedUpload = await first.client.storage.from(BUCKET).upload(
      untrackedPath,
      new Blob(['No metadata reservation.'], { type: 'text/plain' }),
      { contentType: 'text/plain', upsert: false },
    );
    assert.ok(untrackedUpload.error, 'Storage INSERT must reject an object with no matching pending metadata row.');

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
    const wrongPath = `${firstWorkspace.workspace_id}/${adminsCollectionId}/${randomUUID()}-wrong-path.txt`;
    const wrongPathUpload = await first.client.storage.from(BUCKET).upload(
      wrongPath,
      new Blob(['Path does not match metadata.'], { type: 'text/plain' }),
      { contentType: 'text/plain', upsert: false },
    );
    assert.ok(wrongPathUpload.error, 'Storage INSERT must require an exact path bound to pending file metadata.');
    const crossTenantUploader = await second.client.storage.from(BUCKET).upload(
      adminStoragePath,
      new Blob(['Wrong tenant.'], { type: 'text/plain' }),
      { contentType: 'text/plain', upsert: false },
    );
    assert.ok(crossTenantUploader.error, 'A different workspace cannot upload into another tenant\'s pending metadata reservation.');
    const crossTenantCompletion = await second.client.rpc('complete_file_upload', {
      p_file_id: adminFileId,
      p_storage_path: adminStoragePath,
    });
    assert.ok(crossTenantCompletion.error || crossTenantCompletion.data !== true, 'A different workspace cannot complete another tenant\'s file upload.');
    const otherUploader = await editor.client.storage.from(BUCKET).upload(
      adminStoragePath,
      new Blob(['Wrong uploader.'], { type: 'text/plain' }),
      { contentType: 'text/plain', upsert: false },
    );
    assert.ok(otherUploader.error, 'A workspace editor cannot upload into another user\'s pending metadata reservation.');
    const otherCompletion = await editor.client.rpc('complete_file_upload', {
      p_file_id: adminFileId,
      p_storage_path: adminStoragePath,
    });
    assert.ok(otherCompletion.error || otherCompletion.data !== true, 'Only the metadata uploader may complete its pending upload.');
    const pendingSignedUrl = await first.client.storage.from(BUCKET).createSignedUrl(adminStoragePath, 60);
    assert.ok(pendingSignedUrl.error || !pendingSignedUrl.data?.signedUrl, 'Pending objects must not be readable or signed.');
    const { error: adminUploadError } = await first.client.storage.from(BUCKET).upload(
      adminStoragePath,
      new Blob(['Admins-only fixture.'], { type: 'text/plain' }),
      { contentType: 'text/plain', upsert: false },
    );
    assert.equal(adminUploadError, null, adminUploadError?.message);
    const pendingObjectSignedUrl = await first.client.storage.from(BUCKET).createSignedUrl(adminStoragePath, 60);
    assert.ok(pendingObjectSignedUrl.error || !pendingObjectSignedUrl.data?.signedUrl, 'A pending object must remain unsigned after it reaches Storage.');
    const pendingObjectDownload = await first.client.storage.from(BUCKET).download(adminStoragePath);
    assert.ok(pendingObjectDownload.error || !pendingObjectDownload.data, 'A pending object must remain unreadable after upload and before completion.');
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
      size_bytes: Buffer.byteLength('Private local fixture.'),
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
    const ownerDownload = await first.client.storage.from(BUCKET).download(storagePath);
    assert.equal(ownerDownload.error, null, ownerDownload.error?.message);
    assert.equal(await ownerDownload.data?.text(), 'Private local fixture.');
    const memberDownload = await member.client.storage.from(BUCKET).download(storagePath);
    assert.equal(memberDownload.error, null, memberDownload.error?.message);
    assert.equal(await memberDownload.data?.text(), 'Private local fixture.');
    const editorSignedUrl = await editor.client.storage.from(BUCKET).createSignedUrl(storagePath, 60);
    assert.equal(editorSignedUrl.error, null, editorSignedUrl.error?.message);
    assert.ok(editorSignedUrl.data?.signedUrl, 'A same-workspace content reader can access a members-tier file.');

    const { data: crossTenantFile, error: crossTenantFileError } = await second.client
      .from('files')
      .select('id')
      .eq('id', fileId);
    assert.equal(crossTenantFileError, null, crossTenantFileError?.message);
    assert.deepEqual(crossTenantFile, []);
    const crossTenantFileUpdate = await second.client.from('files')
      .update({ filename: 'tenant-tampered.txt' }).eq('id', fileId).select('id');
    assert.ok(crossTenantFileUpdate.error || crossTenantFileUpdate.data?.length === 0, 'Another tenant cannot mutate private file metadata by ID.');
    const crossTenantFileDelete = await second.client.from('files').delete().eq('id', fileId).select('id');
    assert.ok(crossTenantFileDelete.error || crossTenantFileDelete.data?.length === 0, 'Another tenant cannot delete private file metadata by ID.');
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

    // If Storage still has an object, abort must retain a non-readable orphan
    // marker rather than pretending cleanup succeeded or exposing the object.
    const orphanFileId = `file_orphan_${suffix}`;
    const orphanPath = `${firstWorkspace.workspace_id}/${membersCollectionId}/${randomUUID()}-orphan.txt`;
    storagePaths.push(orphanPath);
    const { error: orphanMetadataError } = await first.client.from('files').insert({
      id: orphanFileId,
      workspace_id: firstWorkspace.workspace_id,
      collection_id: membersCollectionId,
      storage_path: orphanPath,
      filename: 'orphan.txt',
      mime_type: 'text/plain',
      size_bytes: Buffer.byteLength('Orphan fixture.'),
      upload_status: 'pending_upload',
      uploaded_by: first.user.id,
    });
    assert.equal(orphanMetadataError, null, orphanMetadataError?.message);
    const { error: orphanUploadError } = await first.client.storage.from(BUCKET).upload(
      orphanPath,
      new Blob(['Orphan fixture.'], { type: 'text/plain' }),
      { contentType: 'text/plain', upsert: false },
    );
    assert.equal(orphanUploadError, null, orphanUploadError?.message);
    const orphanAbort = await first.client.rpc('abort_file_upload', {
      p_file_id: orphanFileId,
      p_storage_path: orphanPath,
    });
    assert.equal(orphanAbort.error, null, orphanAbort.error?.message);
    assert.equal(orphanAbort.data, 'orphaned');
    const orphanSignedUrl = await first.client.storage.from(BUCKET).createSignedUrl(orphanPath, 60);
    assert.ok(orphanSignedUrl.error || !orphanSignedUrl.data?.signedUrl, 'An orphaned object must remain unreadable.');
    const cleanupDatabase = new Client({ connectionString: databaseUrl });
    try {
      await cleanupDatabase.connect();
      const orphanState = await cleanupDatabase.query('SELECT upload_status FROM public.files WHERE id = $1', [orphanFileId]);
      assert.equal(orphanState.rows[0]?.upload_status, 'orphaned');
    } finally {
      await cleanupDatabase.end().catch(() => undefined);
    }

    const orphanObjectCleanup = await first.client.storage.from(BUCKET).remove([orphanPath]);
    assert.equal(orphanObjectCleanup.error, null, orphanObjectCleanup.error?.message);
    const orphanMetadataCleanup = await first.client.from('files').delete().eq('id', orphanFileId);
    assert.equal(orphanMetadataCleanup.error, null, orphanMetadataCleanup.error?.message);
    const orphanCleanupState = await queryLocalDatabase<{ metadata_count: string; object_count: string }>(local, `
      SELECT
        (SELECT COUNT(*)::text FROM public.files WHERE id = $1) AS metadata_count,
        (SELECT COUNT(*)::text FROM storage.objects WHERE bucket_id = $2 AND name = $3) AS object_count
    `, [orphanFileId, BUCKET, orphanPath]);
    assert.deepEqual(orphanCleanupState[0], { metadata_count: '0', object_count: '0' }, 'Orphan cleanup must remove both the private object and its metadata.');
    storagePaths.splice(storagePaths.indexOf(orphanPath), 1);
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
