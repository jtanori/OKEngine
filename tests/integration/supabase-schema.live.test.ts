import assert from 'node:assert/strict';
import { Client } from 'pg';
import { test } from 'node:test';
import { requireLocalSupabase } from './helpers/localSupabase';

const local = requireLocalSupabase();
const PUBLIC_RLS_TABLES = [
  'workspaces',
  'users',
  'workspace_memberships',
  'collections',
  'files',
  'documents',
  'document_versions',
  'document_chunks',
  'embeds',
  'conversations',
  'conversation_messages',
  'usage_records',
  'admin_grants',
  'critical_approvals',
  'security_audit_logs',
  'shared_snapshots',
  'issue_reports',
];
const EXPECTED_POLICIES = [
  ['public', 'workspaces', 'workspaces_select_member'],
  ['public', 'workspaces', 'workspaces_update_owner'],
  ['public', 'users', 'users_select_self_or_comember'],
  ['public', 'users', 'users_update_self_profile'],
  ['public', 'workspace_memberships', 'memberships_select_workspace'],
  ['public', 'workspace_memberships', 'memberships_insert_manage'],
  ['public', 'workspace_memberships', 'memberships_update_manage'],
  ['public', 'workspace_memberships', 'memberships_delete_manage'],
  ['public', 'collections', 'collections_select_scoped'],
  ['public', 'collections', 'collections_insert_scoped'],
  ['public', 'collections', 'collections_update_scoped'],
  ['public', 'collections', 'collections_delete_scoped'],
  ['public', 'documents', 'documents_select_scoped'],
  ['public', 'documents', 'documents_insert_scoped'],
  ['public', 'documents', 'documents_update_scoped'],
  ['public', 'document_versions', 'document_versions_select_scoped'],
  ['public', 'document_versions', 'document_versions_insert_scoped'],
  ['public', 'document_chunks', 'document_chunks_select_scoped'],
  ['public', 'document_chunks', 'document_chunks_insert_scoped'],
  ['public', 'files', 'files_select_scoped'],
  ['public', 'files', 'files_insert_scoped'],
  ['public', 'files', 'files_delete_scoped'],
  ['public', 'shared_snapshots', 'shared_snapshots_select_scoped'],
  ['storage', 'objects', 'storage_workspace_files_select'],
  ['storage', 'objects', 'storage_workspace_files_insert'],
  ['storage', 'objects', 'storage_workspace_files_delete'],
];
const REQUIRED_COLUMNS = [
  ['users', 'auth_user_id', 'uuid'],
  ['users', 'updated_at', 'timestamp with time zone'],
  ['workspace_memberships', 'permissions', 'jsonb'],
  ['workspace_memberships', 'updated_at', 'timestamp with time zone'],
  ['workspaces', 'plan', 'text'],
  ['workspaces', 'stripe_customer_id', 'text'],
  ['workspaces', 'stripe_subscription_id', 'text'],
  ['workspaces', 'past_due_since', 'timestamp with time zone'],
  ['files', 'uploaded_by', 'text'],
  ['files', 'upload_status', 'text'],
  ['stripe_webhook_events', 'status', 'text'],
  ['password_reset_tokens', 'token_hash', 'text'],
];
const SECURITY_DEFINER_FUNCTIONS = [
  ['has_active_workspace_membership', 'search_path=public, pg_temp'],
  ['is_workspace_owner', 'search_path=public, pg_temp'],
  ['has_workspace_permission', 'search_path=public, pg_temp'],
  ['is_active_platform_admin', 'search_path=public, pg_temp'],
  ['shares_active_workspace_with', 'search_path=public, pg_temp'],
  ['can_read_collection', 'search_path=pg_catalog, public'],
  ['can_read_collection_content', 'search_path=pg_catalog, public'],
  ['can_write_collection_content', 'search_path=pg_catalog, public'],
  ['can_delete_collection_content', 'search_path=pg_catalog, public'],
  ['handle_new_auth_user', 'search_path=pg_catalog, public'],
  ['handle_deleted_auth_user', 'search_path=pg_catalog, public'],
  ['provision_initial_workspace', 'search_path=pg_catalog, public, extensions'],
  ['complete_file_upload', 'search_path=pg_catalog, public, extensions'],
  ['abort_file_upload', 'search_path=pg_catalog, public, extensions'],
];
const EXPECTED_COMPOSITE_CONSTRAINTS = [
  'fk_documents_workspace_file',
  'fk_chunks_workspace_col_document',
  'fk_conversations_workspace_embed',
  'fk_messages_workspace_conversation',
  'fk_shared_snapshots_workspace_collection',
  'fk_shared_snapshots_workspace_document',
  'fk_issue_reports_workspace_document',
];

test('fresh local migrations produce the required schema, security catalog, grants, and private bucket', async () => {
  const database = new Client({ connectionString: local.databaseUrl, connectionTimeoutMillis: 5000 });
  await database.connect();
  try {
    const identity = await database.query('SELECT current_database() AS database_name, inet_server_port() AS port');
    assert.equal(identity.rows[0]?.database_name, 'postgres');
    // inet_server_port() reports PostgreSQL's in-container listener (5432),
    // not the host-side port 54322 validated from DATABASE_URL by the runner.
    assert.equal(Number(identity.rows[0]?.port), 5432);

    const migrationLedger = await database.query<{ version: string }>(
      'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version',
    );
    const versions = migrationLedger.rows.map(({ version }) => version);
    for (const version of [
      '20261003000001',
      '20261003000002',
      '20261009000003',
      '20261009000004',
      '20261011000005',
      '20261011000006',
      '20261011000007',
      '20261011000008',
    ]) {
      assert.ok(versions.includes(version), `Clean local reset is missing migration ${version}.`);
    }

    const columnRows = await database.query<{ table_name: string; column_name: string; data_type: string }>(
      `SELECT table_name, column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (table_name, column_name) IN (
            SELECT x.table_name, x.column_name
            FROM unnest($1::text[], $2::text[]) AS x(table_name, column_name)
          )`,
      [REQUIRED_COLUMNS.map(([table]) => table), REQUIRED_COLUMNS.map(([, column]) => column)],
    );
    const columns = new Map(columnRows.rows.map((row) => [`${row.table_name}.${row.column_name}`, row.data_type]));
    for (const [table, column, type] of REQUIRED_COLUMNS) {
      assert.equal(columns.get(`${table}.${column}`), type, `Missing or mismatched expected column ${table}.${column} (${type}).`);
    }

    const rlsRows = await database.query<{ table_name: string; rls_enabled: boolean; rls_forced: boolean }>(
      `SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
         FROM pg_class AS c
         JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1::text[])
        ORDER BY c.relname`,
      [PUBLIC_RLS_TABLES],
    );
    assert.deepEqual(rlsRows.rows.map(({ table_name }) => table_name), [...PUBLIC_RLS_TABLES].sort());
    for (const table of rlsRows.rows) {
      assert.equal(table.rls_enabled, true, `RLS is not enabled on public.${table.table_name}.`);
      assert.equal(table.rls_forced, true, `RLS is not forced on public.${table.table_name}.`);
    }

    const extraRlsRows = await database.query<{ table_name: string; rls_enabled: boolean; rls_forced: boolean }>(
      `SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
         FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`,
      [['password_reset_tokens', 'stripe_webhook_events']],
    );
    assert.equal(extraRlsRows.rows.length, 2);
    for (const table of extraRlsRows.rows) {
      assert.equal(table.rls_enabled, true, `RLS is not enabled on public.${table.table_name}.`);
      assert.equal(table.rls_forced, true, `RLS is not forced on public.${table.table_name}.`);
    }

    const policyRows = await database.query<{ schema_name: string; table_name: string; policy_name: string }>(
      `SELECT schemaname AS schema_name, tablename AS table_name, policyname AS policy_name
         FROM pg_policies
        WHERE (schemaname, tablename, policyname) IN (
          SELECT x.schema_name, x.table_name, x.policy_name
          FROM unnest($1::text[], $2::text[], $3::text[]) AS x(schema_name, table_name, policy_name)
        )`,
      [EXPECTED_POLICIES.map(([schema]) => schema), EXPECTED_POLICIES.map(([, table]) => table), EXPECTED_POLICIES.map(([, , policy]) => policy)],
    );
    const policies = new Set(policyRows.rows.map(({ schema_name, table_name, policy_name }) => `${schema_name}.${table_name}.${policy_name}`));
    for (const [schema, table, policy] of EXPECTED_POLICIES) {
      assert.ok(policies.has(`${schema}.${table}.${policy}`), `Missing runtime policy ${schema}.${table}.${policy}.`);
    }

    const authTriggers = await database.query<{ trigger_name: string; function_name: string }>(
      `SELECT t.tgname AS trigger_name, p.proname AS function_name
         FROM pg_trigger AS t
         JOIN pg_proc AS p ON p.oid = t.tgfoid
        WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal`,
    );
    const triggers = new Map(authTriggers.rows.map(({ trigger_name, function_name }) => [trigger_name, function_name]));
    assert.equal(triggers.get('on_auth_user_profile_sync'), 'handle_new_auth_user');
    assert.equal(triggers.get('on_auth_user_profile_deletion'), 'handle_deleted_auth_user');

    const securityDefinerFunctions = await database.query<{
      function_name: string;
      security_definer: boolean;
      function_owner: string;
      settings: string[];
    }>(
      `SELECT p.proname AS function_name,
              p.prosecdef AS security_definer,
              pg_get_userbyid(p.proowner) AS function_owner,
              COALESCE(p.proconfig, ARRAY[]::text[]) AS settings
         FROM pg_proc AS p
         JOIN pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = ANY($1::text[])
        ORDER BY p.proname`,
      [SECURITY_DEFINER_FUNCTIONS.map(([name]) => name)],
    );
    assert.deepEqual(
      securityDefinerFunctions.rows.map(({ function_name }) => function_name),
      SECURITY_DEFINER_FUNCTIONS.map(([name]) => name).sort(),
      'Every expected authorization, Auth-trigger, provisioning, and file-lifecycle function must exist exactly once.',
    );
    for (const [name, searchPath] of SECURITY_DEFINER_FUNCTIONS) {
      const fn = securityDefinerFunctions.rows.find(({ function_name }) => function_name === name);
      assert.equal(fn?.security_definer, true, `${name} must be SECURITY DEFINER to pass FORCE RLS safely.`);
      assert.equal(fn?.function_owner, 'postgres', `${name} must execute as the migration-owned BYPASSRLS role.`);
      assert.ok(fn?.settings.includes(searchPath), `${name} must pin ${searchPath}.`);
    }

    const functionGrants = await database.query<{
      provision_anon: boolean;
      provision_authenticated: boolean;
      complete_anon: boolean;
      complete_authenticated: boolean;
      abort_anon: boolean;
      abort_authenticated: boolean;
      profile_trigger_anon: boolean;
      profile_trigger_authenticated: boolean;
    }>(`
      SELECT
        has_function_privilege('anon', 'public.provision_initial_workspace()', 'EXECUTE') AS provision_anon,
        has_function_privilege('authenticated', 'public.provision_initial_workspace()', 'EXECUTE') AS provision_authenticated,
        has_function_privilege('anon', 'public.complete_file_upload(text,text)', 'EXECUTE') AS complete_anon,
        has_function_privilege('authenticated', 'public.complete_file_upload(text,text)', 'EXECUTE') AS complete_authenticated,
        has_function_privilege('anon', 'public.abort_file_upload(text,text)', 'EXECUTE') AS abort_anon,
        has_function_privilege('authenticated', 'public.abort_file_upload(text,text)', 'EXECUTE') AS abort_authenticated,
        has_function_privilege('anon', 'public.handle_new_auth_user()', 'EXECUTE') AS profile_trigger_anon,
        has_function_privilege('authenticated', 'public.handle_new_auth_user()', 'EXECUTE') AS profile_trigger_authenticated
    `);
    const grants = functionGrants.rows[0];
    assert.equal(grants?.provision_anon, false);
    assert.equal(grants?.provision_authenticated, true);
    assert.equal(grants?.complete_anon, false);
    assert.equal(grants?.complete_authenticated, true);
    assert.equal(grants?.abort_anon, false);
    assert.equal(grants?.abort_authenticated, true);
    assert.equal(grants?.profile_trigger_anon, false);
    assert.equal(grants?.profile_trigger_authenticated, false);

    const helperGrants = await database.query<{
      membership_anon: boolean;
      membership_authenticated: boolean;
      workspace_owner_anon: boolean;
      workspace_owner_authenticated: boolean;
      permission_anon: boolean;
      permission_authenticated: boolean;
      platform_admin_anon: boolean;
      platform_admin_authenticated: boolean;
      shared_workspace_anon: boolean;
      shared_workspace_authenticated: boolean;
      collection_read_anon: boolean;
      collection_read_authenticated: boolean;
      collection_content_read_anon: boolean;
      collection_content_read_authenticated: boolean;
      collection_write_anon: boolean;
      collection_write_authenticated: boolean;
      collection_delete_anon: boolean;
      collection_delete_authenticated: boolean;
    }>(`
      SELECT
        has_function_privilege('anon', 'public.has_active_workspace_membership(text)', 'EXECUTE') AS membership_anon,
        has_function_privilege('authenticated', 'public.has_active_workspace_membership(text)', 'EXECUTE') AS membership_authenticated,
        has_function_privilege('anon', 'public.is_workspace_owner(text)', 'EXECUTE') AS workspace_owner_anon,
        has_function_privilege('authenticated', 'public.is_workspace_owner(text)', 'EXECUTE') AS workspace_owner_authenticated,
        has_function_privilege('anon', 'public.has_workspace_permission(text,text)', 'EXECUTE') AS permission_anon,
        has_function_privilege('authenticated', 'public.has_workspace_permission(text,text)', 'EXECUTE') AS permission_authenticated,
        has_function_privilege('anon', 'public.is_active_platform_admin()', 'EXECUTE') AS platform_admin_anon,
        has_function_privilege('authenticated', 'public.is_active_platform_admin()', 'EXECUTE') AS platform_admin_authenticated,
        has_function_privilege('anon', 'public.shares_active_workspace_with(text)', 'EXECUTE') AS shared_workspace_anon,
        has_function_privilege('authenticated', 'public.shares_active_workspace_with(text)', 'EXECUTE') AS shared_workspace_authenticated,
        has_function_privilege('anon', 'public.can_read_collection(text,text)', 'EXECUTE') AS collection_read_anon,
        has_function_privilege('authenticated', 'public.can_read_collection(text,text)', 'EXECUTE') AS collection_read_authenticated,
        has_function_privilege('anon', 'public.can_read_collection_content(text,text)', 'EXECUTE') AS collection_content_read_anon,
        has_function_privilege('authenticated', 'public.can_read_collection_content(text,text)', 'EXECUTE') AS collection_content_read_authenticated,
        has_function_privilege('anon', 'public.can_write_collection_content(text,text)', 'EXECUTE') AS collection_write_anon,
        has_function_privilege('authenticated', 'public.can_write_collection_content(text,text)', 'EXECUTE') AS collection_write_authenticated,
        has_function_privilege('anon', 'public.can_delete_collection_content(text,text)', 'EXECUTE') AS collection_delete_anon,
        has_function_privilege('authenticated', 'public.can_delete_collection_content(text,text)', 'EXECUTE') AS collection_delete_authenticated
    `);
    assert.deepEqual(helperGrants.rows[0], {
      membership_anon: false,
      membership_authenticated: true,
      workspace_owner_anon: true,
      workspace_owner_authenticated: true,
      permission_anon: true,
      permission_authenticated: true,
      platform_admin_anon: false,
      platform_admin_authenticated: true,
      shared_workspace_anon: false,
      shared_workspace_authenticated: true,
      collection_read_anon: true,
      collection_read_authenticated: true,
      collection_content_read_anon: true,
      collection_content_read_authenticated: true,
      collection_write_anon: false,
      collection_write_authenticated: true,
      collection_delete_anon: false,
      collection_delete_authenticated: true,
    });

    const tableGrants = await database.query<{ anon_user_read: boolean; anon_collection_read: boolean; auth_files_insert: boolean }>(`
      SELECT
        has_table_privilege('anon', 'public.users', 'SELECT') AS anon_user_read,
        has_table_privilege('anon', 'public.collections', 'SELECT') AS anon_collection_read,
        has_table_privilege('authenticated', 'public.files', 'INSERT') AS auth_files_insert
    `);
    assert.deepEqual(tableGrants.rows[0], {
      anon_user_read: false,
      anon_collection_read: true,
      auth_files_insert: true,
    });

    const bucketResult = await database.query<{
      id: string;
      public: boolean;
      file_size_limit: number;
      allowed_mime_types: string[];
    }>(
      `SELECT id, public, file_size_limit, allowed_mime_types
         FROM storage.buckets WHERE id = 'workspace-files'`,
    );
    assert.equal(bucketResult.rows.length, 1, 'The private workspace-files bucket must exist after migrations.');
    assert.equal(bucketResult.rows[0]?.public, false, 'The workspace-files bucket must remain private.');
    assert.equal(Number(bucketResult.rows[0]?.file_size_limit), 10485760);
    assert.deepEqual([...((bucketResult.rows[0]?.allowed_mime_types || []) as string[])].sort(), [
      'application/pdf',
      'text/markdown',
      'text/plain',
    ]);

    const storageRls = await database.query<{ enabled: boolean }>(
      `SELECT c.relrowsecurity AS enabled
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'storage' AND c.relname = 'objects'`,
    );
    assert.equal(storageRls.rows[0]?.enabled, true, 'Storage object policies require PostgreSQL RLS.');

    const compositeConstraints = await database.query<{ conname: string; validated: boolean }>(
      `SELECT conname, convalidated AS validated
         FROM pg_constraint
        WHERE conname = ANY($1::text[])
        ORDER BY conname`,
      [EXPECTED_COMPOSITE_CONSTRAINTS],
    );
    assert.deepEqual(
      compositeConstraints.rows.map(({ conname }) => conname),
      [...EXPECTED_COMPOSITE_CONSTRAINTS].sort(),
      'A clean reset must create all expected composite tenant foreign keys.',
    );
    for (const constraint of compositeConstraints.rows) {
      assert.equal(constraint.validated, true, `${constraint.conname} must be validated by the clean migration set.`);
    }
  } finally {
    await database.end().catch(() => undefined);
  }
});
