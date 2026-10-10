-- ============================================================================
-- OKEng — Staging Security Hardening, Complete RLS Matrix & Composite FKs
-- Migration ID : 20261009000003_okeng_staging_security_hardening.sql
-- Date         : 2026-10-09 (Held per AUDIT-STG-01 DECISION-02 until Phase 3)
-- Engine Target: PostgreSQL 15.0+ (required for column-specific ON DELETE SET NULL)
-- Governing Doc: docs/DB-01-PostgreSQL-Security-Migration-Specification.md
-- Dependencies : 20261003000001_okeng_schema.sql, 20261003000002_okeng_rls_and_storage.sql
-- ============================================================================
-- Implements:
--   1. Granular permissions column on `workspace_memberships` + last-owner guard trigger
--   2. Persistent tables for `shared_snapshots` (RENDER-041) & `issue_reports` (RENDER-001 §39)
--   3. Composite unique constraints & cross-tenant foreign keys (`NOT VALID` -> `VALIDATE`)
--   4. Hardened `SECURITY DEFINER` helper functions with fixed `search_path = public, pg_temp`
--   5. `FORCE ROW LEVEL SECURITY` across all 17 public tables
--   6. Operation-specific (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) RLS policies on all 17 tables
--   7. Operation-specific Supabase Storage (`storage.objects`) policies for `workspace-files`
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: SCHEMA EXTENSIONS & NEW PERSISTENT STAGING TABLES
-- ============================================================================

-- 1.1 Add explicit granular permissions array to `workspace_memberships` (AUTH-03)
ALTER TABLE public.workspace_memberships
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '["workspace.read","collection.read","content.read","test.execute"]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.workspace_memberships
  DROP CONSTRAINT IF EXISTS chk_workspace_memberships_permissions_array;

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT chk_workspace_memberships_permissions_array
  CHECK (jsonb_typeof(permissions) = 'array');

-- 1.2 Add envelope encryption & dual-key rotation columns to `workspaces` (SEC-01 §3.3)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS signing_secret_kid TEXT NOT NULL DEFAULT 'kid_primary_v1',
  ADD COLUMN IF NOT EXISTS signing_secret_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS secondary_signing_secret_kid TEXT,
  ADD COLUMN IF NOT EXISTS secondary_signing_secret_hash TEXT,
  ADD COLUMN IF NOT EXISTS secondary_signing_secret_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS knowledge_version INTEGER NOT NULL DEFAULT 1 CHECK (knowledge_version >= 1);

-- 1.3 Add upload lifecycle state to `files` for two-phase storage reconciliation (DATA-01 §4)
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS upload_status TEXT NOT NULL DEFAULT 'ready'
    CHECK (upload_status IN ('pending_upload', 'ready', 'orphaned', 'deleted'));

-- 1.4 Create `public.shared_snapshots` (Replaces in-memory `SHARE_STORE` — RENDER-041)
CREATE TABLE IF NOT EXISTS public.shared_snapshots (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL,
  document_id TEXT,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  is_public_document BOOLEAN NOT NULL DEFAULT false,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'es')),
  content_markdown TEXT NOT NULL CHECK (char_length(content_markdown) <= 262144),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, id)
);

-- 1.5 Create `public.issue_reports` (Replaces in-memory `ISSUE_REPORTS` — RENDER-001 §39)
CREATE TABLE IF NOT EXISTS public.issue_reports (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id TEXT,
  reported_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  surface TEXT NOT NULL CHECK (surface IN ('DOCUMENT_FULL', 'EMBED_ANSWER', 'GUIDED_TOUR', 'TEST_CONSOLE')),
  renderer_version TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),
  category TEXT NOT NULL CHECK (category IN ('formatting_problem', 'inaccurate_answer', 'broken_link', 'outdated_content', 'other')),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'triaged', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (workspace_id, id)
);

-- ============================================================================
-- SECTION 2: COMPOSITE UNIQUE KEYS & CROSS-TENANT FOREIGN KEYS
-- ============================================================================
-- Every parent table exposes a composite unique key starting with `workspace_id`
-- so child tables can enforce strict single-tenant relational integrity.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_files_workspace_id'
  ) THEN
    ALTER TABLE public.files ADD CONSTRAINT uq_files_workspace_id UNIQUE (workspace_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_documents_workspace_col_id'
  ) THEN
    ALTER TABLE public.documents ADD CONSTRAINT uq_documents_workspace_col_id UNIQUE (workspace_id, collection_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_embeds_workspace_id'
  ) THEN
    ALTER TABLE public.embeds ADD CONSTRAINT uq_embeds_workspace_id UNIQUE (workspace_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_conversations_workspace_id'
  ) THEN
    ALTER TABLE public.conversations ADD CONSTRAINT uq_conversations_workspace_id UNIQUE (workspace_id, id);
  END IF;
END $$;

-- 2.0 Drop legacy single-column / inline foreign keys from 20261003000001 (P1-SQL-02)
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_file_id_fkey;
ALTER TABLE public.document_chunks
  DROP CONSTRAINT IF EXISTS document_chunks_workspace_id_document_id_fkey;
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_embed_id_fkey;
ALTER TABLE public.conversation_messages
  DROP CONSTRAINT IF EXISTS conversation_messages_conversation_id_fkey;

-- 2.1 Upgrade `documents.file_id` to composite cross-tenant FK `(workspace_id, file_id)` (P0-SQL-01: PostgreSQL 15+ column-specific SET NULL)
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS fk_documents_workspace_file;
ALTER TABLE public.documents
  ADD CONSTRAINT fk_documents_workspace_file
  FOREIGN KEY (workspace_id, file_id)
  REFERENCES public.files(workspace_id, id)
  MATCH SIMPLE
  ON DELETE SET NULL (file_id)
  NOT VALID;

-- 2.2 Upgrade `document_chunks` to 3-column composite FK `(workspace_id, collection_id, document_id)`
-- Ensures a chunk's collection_id and workspace_id always match its parent document's collection_id and workspace_id.
ALTER TABLE public.document_chunks
  DROP CONSTRAINT IF EXISTS fk_chunks_workspace_col_document;
ALTER TABLE public.document_chunks
  ADD CONSTRAINT fk_chunks_workspace_col_document
  FOREIGN KEY (workspace_id, collection_id, document_id)
  REFERENCES public.documents(workspace_id, collection_id, id)
  ON DELETE CASCADE
  ON UPDATE CASCADE
  NOT VALID;

-- 2.3 Upgrade `conversations.embed_id` to composite cross-tenant FK `(workspace_id, embed_id)` (P0-SQL-01: PostgreSQL 15+ column-specific SET NULL)
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS fk_conversations_workspace_embed;
ALTER TABLE public.conversations
  ADD CONSTRAINT fk_conversations_workspace_embed
  FOREIGN KEY (workspace_id, embed_id)
  REFERENCES public.embeds(workspace_id, id)
  MATCH SIMPLE
  ON DELETE SET NULL (embed_id)
  NOT VALID;

-- 2.4 Upgrade `conversation_messages.conversation_id` to composite cross-tenant FK `(workspace_id, conversation_id)`
ALTER TABLE public.conversation_messages
  DROP CONSTRAINT IF EXISTS fk_messages_workspace_conversation;
ALTER TABLE public.conversation_messages
  ADD CONSTRAINT fk_messages_workspace_conversation
  FOREIGN KEY (workspace_id, conversation_id)
  REFERENCES public.conversations(workspace_id, id)
  ON DELETE CASCADE
  NOT VALID;

-- 2.5 Composite cross-tenant FKs on `shared_snapshots` and `issue_reports` (P0-SQL-01: PostgreSQL 15+ column-specific SET NULL)
ALTER TABLE public.shared_snapshots
  DROP CONSTRAINT IF EXISTS fk_shared_snapshots_workspace_collection;
ALTER TABLE public.shared_snapshots
  ADD CONSTRAINT fk_shared_snapshots_workspace_collection
  FOREIGN KEY (workspace_id, collection_id)
  REFERENCES public.collections(workspace_id, id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.shared_snapshots
  DROP CONSTRAINT IF EXISTS fk_shared_snapshots_workspace_document;
ALTER TABLE public.shared_snapshots
  ADD CONSTRAINT fk_shared_snapshots_workspace_document
  FOREIGN KEY (workspace_id, document_id)
  REFERENCES public.documents(workspace_id, id)
  MATCH SIMPLE
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.issue_reports
  DROP CONSTRAINT IF EXISTS fk_issue_reports_workspace_document;
ALTER TABLE public.issue_reports
  ADD CONSTRAINT fk_issue_reports_workspace_document
  FOREIGN KEY (workspace_id, document_id)
  REFERENCES public.documents(workspace_id, id)
  MATCH SIMPLE
  ON DELETE SET NULL (document_id)
  NOT VALID;
-- Note (P2-SQL-05): All 7 VALIDATE CONSTRAINT operations are executed outside this metadata transaction
-- in companion migration `20261009000004_okeng_staging_validate_constraints.sql` under ShareUpdateExclusiveLock.

-- ============================================================================
-- SECTION 3: LAST WORKSPACE OWNER PROTECTION TRIGGER (API-01 §8.1 / AUTH-02)
-- ============================================================================
-- Prevents deleting, revoking, or demoting the last active WORKSPACE_OWNER of any workspace.

CREATE OR REPLACE FUNCTION public.prevent_last_workspace_owner_loss()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  remaining_owners INTEGER;
BEGIN
  IF OLD.role = 'WORKSPACE_OWNER' AND OLD.status = 'ACTIVE' THEN
    IF TG_OP = 'DELETE' OR NEW.role <> 'WORKSPACE_OWNER' OR NEW.status <> 'ACTIVE' THEN
      SELECT COUNT(*) INTO remaining_owners
      FROM public.workspace_memberships wm
      WHERE wm.workspace_id = OLD.workspace_id
        AND wm.id <> OLD.id
        AND wm.role = 'WORKSPACE_OWNER'
        AND wm.status = 'ACTIVE';

      IF remaining_owners < 1 THEN
        RAISE EXCEPTION 'LAST_WORKSPACE_OWNER_PROTECTED: Cannot remove, suspend, or demote the final active WORKSPACE_OWNER for workspace %', OLD.workspace_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_workspace_owner ON public.workspace_memberships;
CREATE TRIGGER trg_protect_last_workspace_owner
  BEFORE UPDATE OR DELETE ON public.workspace_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_workspace_owner_loss();

-- ============================================================================
-- SECTION 4: HARDENED AUTHORIZATION HELPER FUNCTIONS (DB-01 §4.2)
-- ============================================================================
-- All SECURITY DEFINER helpers lock down `search_path = public, pg_temp`,
-- fail closed on NULL/malformed inputs, and revoke PUBLIC execution privileges.

CREATE OR REPLACE FUNCTION public.has_active_workspace_membership(target_workspace_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN target_workspace_id IS NULL OR auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.workspace_memberships wm
      JOIN public.users u ON u.id = wm.user_id
      WHERE wm.workspace_id = target_workspace_id
        AND wm.user_id = auth.uid()::text
        AND wm.status = 'ACTIVE'
        AND u.account_status = 'ACTIVE'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(target_workspace_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN target_workspace_id IS NULL OR auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.workspace_memberships wm
      JOIN public.users u ON u.id = wm.user_id
      WHERE wm.workspace_id = target_workspace_id
        AND wm.user_id = auth.uid()::text
        AND wm.role = 'WORKSPACE_OWNER'
        AND wm.status = 'ACTIVE'
        AND u.account_status = 'ACTIVE'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  target_workspace_id TEXT,
  required_perm TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN target_workspace_id IS NULL OR required_perm IS NULL OR auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.workspace_memberships wm
      JOIN public.users u ON u.id = wm.user_id
      WHERE wm.workspace_id = target_workspace_id
        AND wm.user_id = auth.uid()::text
        AND wm.status = 'ACTIVE'
        AND u.account_status = 'ACTIVE'
        AND (
          wm.role = 'WORKSPACE_OWNER'
          OR (
            jsonb_typeof(wm.permissions) = 'array'
            AND wm.permissions ? required_perm
          )
        )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()::text
        AND u.account_status = 'ACTIVE'
        AND u.platform_role IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN')
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.shares_active_workspace_with(target_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN target_user_id IS NULL OR auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.workspace_memberships caller_wm
      JOIN public.workspace_memberships peer_wm
        ON caller_wm.workspace_id = peer_wm.workspace_id
      JOIN public.users caller_u
        ON caller_u.id = caller_wm.user_id
      WHERE caller_wm.user_id = auth.uid()::text
        AND caller_wm.status = 'ACTIVE'
        AND caller_u.account_status = 'ACTIVE'
        AND peer_wm.user_id = target_user_id
        AND peer_wm.status = 'ACTIVE'
    )
  END;
$$;

-- Explicitly bind all SECURITY DEFINER RLS helpers to `postgres` (BYPASSRLS role)
-- so queries inside helpers do not recursively trigger FORCE ROW LEVEL SECURITY on
-- `public.users` and `public.workspace_memberships` (P1-SQL-03).
ALTER FUNCTION public.has_active_workspace_membership(TEXT) OWNER TO postgres;
ALTER FUNCTION public.is_workspace_owner(TEXT) OWNER TO postgres;
ALTER FUNCTION public.has_workspace_permission(TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.is_active_platform_admin() OWNER TO postgres;
ALTER FUNCTION public.shares_active_workspace_with(TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.has_active_workspace_membership(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_owner(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_workspace_permission(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shares_active_workspace_with(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_active_workspace_membership(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_workspace_permission(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_active_workspace_with(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_workspace_permission(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(TEXT) TO anon;

-- ============================================================================
-- SECTION 5: ENABLE & FORCE ROW LEVEL SECURITY ACROSS ALL 17 PUBLIC TABLES
-- ============================================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections FORCE ROW LEVEL SECURITY;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files FORCE ROW LEVEL SECURITY;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeds FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_grants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.critical_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critical_approvals FORCE ROW LEVEL SECURITY;

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.shared_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_snapshots FORCE ROW LEVEL SECURITY;

ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_reports FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 6: OPERATION-SPECIFIC RLS POLICY MATRIX (REPLACES BROAD `FOR ALL`)
-- ============================================================================

-- 6.1 `public.workspaces`
DROP POLICY IF EXISTS workspace_member_select ON public.workspaces;
DROP POLICY IF EXISTS workspace_owner_update ON public.workspaces;

CREATE POLICY workspaces_select_member ON public.workspaces
  FOR SELECT
  USING (public.has_workspace_permission(id, 'workspace.read'));

CREATE POLICY workspaces_update_owner ON public.workspaces
  FOR UPDATE
  USING (public.has_workspace_permission(id, 'workspace.settings.manage'))
  WITH CHECK (public.has_workspace_permission(id, 'workspace.settings.manage'));
-- Note: INSERT and DELETE on `public.workspaces` are intentionally omitted for client roles
-- and executed exclusively via controlled server provisioning / dual-operator approval workflows.

-- 6.2 `public.users` (Previously had 0 policies)
DROP POLICY IF EXISTS users_select_self_or_comember ON public.users;
DROP POLICY IF EXISTS users_update_self_profile ON public.users;

CREATE POLICY users_select_self_or_comember ON public.users
  FOR SELECT
  USING (
    id = auth.uid()::text
    OR public.shares_active_workspace_with(id)
  );

CREATE POLICY users_update_self_profile ON public.users
  FOR UPDATE
  USING (id = auth.uid()::text AND account_status = 'ACTIVE')
  WITH CHECK (
    id = auth.uid()::text
    AND account_status = 'ACTIVE'
    -- Prevent privilege self-escalation: platform_role must remain unchanged
    AND platform_role IS NOT DISTINCT FROM (
      SELECT u_existing.platform_role FROM public.users u_existing WHERE u_existing.id = auth.uid()::text
    )
  );

-- 6.3 `public.workspace_memberships` (Previously had 0 policies)
DROP POLICY IF EXISTS memberships_select_workspace ON public.workspace_memberships;
DROP POLICY IF EXISTS memberships_insert_manage ON public.workspace_memberships;
DROP POLICY IF EXISTS memberships_update_manage ON public.workspace_memberships;
DROP POLICY IF EXISTS memberships_delete_manage ON public.workspace_memberships;

CREATE POLICY memberships_select_workspace ON public.workspace_memberships
  FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR public.has_workspace_permission(workspace_id, 'workspace.read')
  );

CREATE POLICY memberships_insert_manage ON public.workspace_memberships
  FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, 'workspace.users.manage'));

CREATE POLICY memberships_update_manage ON public.workspace_memberships
  FOR UPDATE
  USING (public.has_workspace_permission(workspace_id, 'workspace.users.manage'))
  WITH CHECK (public.has_workspace_permission(workspace_id, 'workspace.users.manage'));

CREATE POLICY memberships_delete_manage ON public.workspace_memberships
  FOR DELETE
  USING (public.has_workspace_permission(workspace_id, 'workspace.users.manage'));

-- 6.4 `public.collections` (Replaces broad `FOR ALL` with explicit operation policies)
DROP POLICY IF EXISTS collections_tenant_or_public_select ON public.collections;
DROP POLICY IF EXISTS collections_owner_write ON public.collections;
DROP POLICY IF EXISTS collections_select_scoped ON public.collections;
DROP POLICY IF EXISTS collections_insert_scoped ON public.collections;
DROP POLICY IF EXISTS collections_update_scoped ON public.collections;
DROP POLICY IF EXISTS collections_delete_scoped ON public.collections;

CREATE POLICY collections_select_scoped ON public.collections
  FOR SELECT
  USING (
    visibility = 'everyone'
    OR public.has_workspace_permission(workspace_id, 'collection.read')
  );

CREATE POLICY collections_insert_scoped ON public.collections
  FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, 'collection.write'));

CREATE POLICY collections_update_scoped ON public.collections
  FOR UPDATE
  USING (public.has_workspace_permission(workspace_id, 'collection.write'))
  WITH CHECK (public.has_workspace_permission(workspace_id, 'collection.write'));

CREATE POLICY collections_delete_scoped ON public.collections
  FOR DELETE
  USING (public.has_workspace_permission(workspace_id, 'collection.delete'));

-- 6.5 `public.files` (Immutable after upload; no UPDATE policy)
DROP POLICY IF EXISTS files_tenant_isolation ON public.files;
DROP POLICY IF EXISTS files_select_scoped ON public.files;
DROP POLICY IF EXISTS files_insert_scoped ON public.files;
DROP POLICY IF EXISTS files_delete_scoped ON public.files;

CREATE POLICY files_select_scoped ON public.files
  FOR SELECT
  USING (public.has_workspace_permission(workspace_id, 'content.read'));

CREATE POLICY files_insert_scoped ON public.files
  FOR INSERT
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'content.write')
    AND EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.workspace_id = public.files.workspace_id
        AND c.id = public.files.collection_id
    )
  );

CREATE POLICY files_delete_scoped ON public.files
  FOR DELETE
  USING (public.has_workspace_permission(workspace_id, 'content.delete'));

-- 6.6 `public.documents` (Soft-delete lifecycle; hard DELETE denied to ordinary clients)
DROP POLICY IF EXISTS documents_authorized_select ON public.documents;
DROP POLICY IF EXISTS documents_owner_write ON public.documents;
DROP POLICY IF EXISTS documents_select_scoped ON public.documents;
DROP POLICY IF EXISTS documents_insert_scoped ON public.documents;
DROP POLICY IF EXISTS documents_update_scoped ON public.documents;

CREATE POLICY documents_select_scoped ON public.documents
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND status <> 'deleted'
    AND (
      EXISTS (
        SELECT 1 FROM public.collections c
        WHERE c.id = public.documents.collection_id
          AND c.workspace_id = public.documents.workspace_id
          AND c.visibility = 'everyone'
      )
      OR public.has_workspace_permission(workspace_id, 'content.read')
    )
  );

CREATE POLICY documents_insert_scoped ON public.documents
  FOR INSERT
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'content.write')
    AND EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.workspace_id = public.documents.workspace_id
        AND c.id = public.documents.collection_id
    )
  );

CREATE POLICY documents_update_scoped ON public.documents
  FOR UPDATE
  USING (public.has_workspace_permission(workspace_id, 'content.write'))
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'content.write')
    AND (
      (status <> 'deleted' AND deleted_at IS NULL)
      OR public.has_workspace_permission(workspace_id, 'content.delete')
    )
  );

-- 6.7 `public.document_versions` (Previously had 0 policies; immutable version history)
DROP POLICY IF EXISTS document_versions_select_scoped ON public.document_versions;
DROP POLICY IF EXISTS document_versions_insert_scoped ON public.document_versions;

CREATE POLICY document_versions_select_scoped ON public.document_versions
  FOR SELECT
  USING (public.has_workspace_permission(workspace_id, 'content.read'));

CREATE POLICY document_versions_insert_scoped ON public.document_versions
  FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, 'content.write'));
-- UPDATE and DELETE intentionally omitted (versions are immutable).

-- 6.8 `public.document_chunks` (Replaced atomically on index; no in-place UPDATE)
DROP POLICY IF EXISTS chunks_tenant_isolation ON public.document_chunks;
DROP POLICY IF EXISTS document_chunks_select_scoped ON public.document_chunks;
DROP POLICY IF EXISTS document_chunks_insert_scoped ON public.document_chunks;
DROP POLICY IF EXISTS document_chunks_delete_scoped ON public.document_chunks;

CREATE POLICY document_chunks_select_scoped ON public.document_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.workspace_id = public.document_chunks.workspace_id
        AND c.id = public.document_chunks.collection_id
        AND (
          c.visibility = 'everyone'
          OR public.has_workspace_permission(c.workspace_id, 'content.read')
        )
    )
  );

CREATE POLICY document_chunks_insert_scoped ON public.document_chunks
  FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, 'content.write'));

CREATE POLICY document_chunks_delete_scoped ON public.document_chunks
  FOR DELETE
  USING (public.has_workspace_permission(workspace_id, 'content.write'));

-- 6.9 `public.embeds`
DROP POLICY IF EXISTS embeds_tenant_isolation ON public.embeds;
DROP POLICY IF EXISTS embeds_select_scoped ON public.embeds;
DROP POLICY IF EXISTS embeds_insert_scoped ON public.embeds;
DROP POLICY IF EXISTS embeds_update_scoped ON public.embeds;
DROP POLICY IF EXISTS embeds_delete_scoped ON public.embeds;

CREATE POLICY embeds_select_scoped ON public.embeds
  FOR SELECT
  USING (public.has_workspace_permission(workspace_id, 'embed.read'));

CREATE POLICY embeds_insert_scoped ON public.embeds
  FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, 'embed.manage'));

CREATE POLICY embeds_update_scoped ON public.embeds
  FOR UPDATE
  USING (public.has_workspace_permission(workspace_id, 'embed.manage'))
  WITH CHECK (public.has_workspace_permission(workspace_id, 'embed.manage'));

CREATE POLICY embeds_delete_scoped ON public.embeds
  FOR DELETE
  USING (public.has_workspace_permission(workspace_id, 'embed.manage'));

-- 6.10 `public.conversations`
DROP POLICY IF EXISTS conversations_tenant_isolation ON public.conversations;
DROP POLICY IF EXISTS conversations_select_scoped ON public.conversations;
DROP POLICY IF EXISTS conversations_insert_scoped ON public.conversations;
DROP POLICY IF EXISTS conversations_update_feedback ON public.conversations;
DROP POLICY IF EXISTS conversations_delete_retention ON public.conversations;

CREATE POLICY conversations_select_scoped ON public.conversations
  FOR SELECT
  USING (public.has_workspace_permission(workspace_id, 'conversations.read'));

CREATE POLICY conversations_insert_scoped ON public.conversations
  FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, 'test.execute'));

CREATE POLICY conversations_update_feedback ON public.conversations
  FOR UPDATE
  USING (public.has_workspace_permission(workspace_id, 'conversations.read'))
  WITH CHECK (public.has_workspace_permission(workspace_id, 'conversations.read'));

CREATE POLICY conversations_delete_retention ON public.conversations
  FOR DELETE
  USING (public.is_workspace_owner(workspace_id));

-- 6.11 `public.conversation_messages` (Previously had 0 policies; immutable transcript)
DROP POLICY IF EXISTS conversation_messages_select_scoped ON public.conversation_messages;
DROP POLICY IF EXISTS conversation_messages_insert_scoped ON public.conversation_messages;

CREATE POLICY conversation_messages_select_scoped ON public.conversation_messages
  FOR SELECT
  USING (public.has_workspace_permission(workspace_id, 'conversations.read'));

CREATE POLICY conversation_messages_insert_scoped ON public.conversation_messages
  FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, 'test.execute'));
-- UPDATE and direct DELETE intentionally omitted (messages are immutable and cascade with parent conversation retention purge).

-- 6.12 `public.usage_records` (Read-only for Workspace Owners; written strictly via `service_role`)
DROP POLICY IF EXISTS usage_tenant_isolation ON public.usage_records;
DROP POLICY IF EXISTS usage_records_select_owner ON public.usage_records;

CREATE POLICY usage_records_select_owner ON public.usage_records
  FOR SELECT
  USING (public.is_workspace_owner(workspace_id));
-- INSERT, UPDATE, DELETE omitted for client roles (`service_role` metering writer only).

-- 6.13 `public.admin_grants` (Previously had 0 policies)
DROP POLICY IF EXISTS admin_grants_select_governance ON public.admin_grants;
DROP POLICY IF EXISTS admin_grants_insert_platform_admin ON public.admin_grants;
DROP POLICY IF EXISTS admin_grants_update_revoke ON public.admin_grants;

CREATE POLICY admin_grants_select_governance ON public.admin_grants
  FOR SELECT
  USING (
    public.is_workspace_owner(workspace_id)
    OR public.is_active_platform_admin()
  );

CREATE POLICY admin_grants_insert_platform_admin ON public.admin_grants
  FOR INSERT
  WITH CHECK (
    public.is_active_platform_admin()
    AND admin_user_id <> approved_by
  );

CREATE POLICY admin_grants_update_revoke ON public.admin_grants
  FOR UPDATE
  USING (
    public.is_workspace_owner(workspace_id)
    OR public.is_active_platform_admin()
  )
  WITH CHECK (
    revoked_at IS NOT NULL
  );

-- 6.14 `public.critical_approvals` (Previously had 0 policies)
DROP POLICY IF EXISTS critical_approvals_select_governance ON public.critical_approvals;
DROP POLICY IF EXISTS critical_approvals_insert_request ON public.critical_approvals;
DROP POLICY IF EXISTS critical_approvals_update_decision ON public.critical_approvals;

CREATE POLICY critical_approvals_select_governance ON public.critical_approvals
  FOR SELECT
  USING (
    public.is_workspace_owner(workspace_id)
    OR public.is_active_platform_admin()
  );

CREATE POLICY critical_approvals_insert_request ON public.critical_approvals
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()::text
    AND (
      public.is_workspace_owner(workspace_id)
      OR public.is_active_platform_admin()
    )
  );

CREATE POLICY critical_approvals_update_decision ON public.critical_approvals
  FOR UPDATE
  USING (
    status = 'PENDING'
    AND requested_by <> auth.uid()::text
    AND (
      public.is_workspace_owner(workspace_id)
      OR public.is_active_platform_admin()
    )
  )
  WITH CHECK (
    approved_by = auth.uid()::text
    AND requested_by <> approved_by
    AND status IN ('APPROVED', 'REJECTED')
  );

-- 6.15 `public.security_audit_logs` (Previously had 0 policies; append-only via `service_role`)
DROP POLICY IF EXISTS security_audit_logs_select_governance ON public.security_audit_logs;

CREATE POLICY security_audit_logs_select_governance ON public.security_audit_logs
  FOR SELECT
  USING (
    (workspace_id IS NOT NULL AND public.is_workspace_owner(workspace_id))
    OR public.is_active_platform_admin()
  );
-- INSERT, UPDATE, and DELETE are strictly denied to client roles; only `service_role` can append audit events.

-- 6.16 `public.shared_snapshots` (New persistent table)
DROP POLICY IF EXISTS shared_snapshots_select_scoped ON public.shared_snapshots;
DROP POLICY IF EXISTS shared_snapshots_insert_scoped ON public.shared_snapshots;
DROP POLICY IF EXISTS shared_snapshots_update_revoke ON public.shared_snapshots;
DROP POLICY IF EXISTS shared_snapshots_delete_owner ON public.shared_snapshots;

CREATE POLICY shared_snapshots_select_scoped ON public.shared_snapshots
  FOR SELECT
  USING (
    revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
      is_public_document = true
      OR public.has_workspace_permission(workspace_id, 'content.read')
    )
  );

CREATE POLICY shared_snapshots_insert_scoped ON public.shared_snapshots
  FOR INSERT
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'content.read')
    AND (
      is_public_document = false
      OR EXISTS (
        SELECT 1 FROM public.collections c
        WHERE c.workspace_id = public.shared_snapshots.workspace_id
          AND c.id = public.shared_snapshots.collection_id
          AND c.visibility = 'everyone'
      )
    )
  );

CREATE POLICY shared_snapshots_update_revoke ON public.shared_snapshots
  FOR UPDATE
  USING (public.has_workspace_permission(workspace_id, 'content.write'))
  WITH CHECK (revoked_at IS NOT NULL);

CREATE POLICY shared_snapshots_delete_owner ON public.shared_snapshots
  FOR DELETE
  USING (public.is_workspace_owner(workspace_id));

-- 6.17 `public.issue_reports` (New persistent table)
DROP POLICY IF EXISTS issue_reports_select_scoped ON public.issue_reports;
DROP POLICY IF EXISTS issue_reports_insert_scoped ON public.issue_reports;
DROP POLICY IF EXISTS issue_reports_update_scoped ON public.issue_reports;
DROP POLICY IF EXISTS issue_reports_delete_owner ON public.issue_reports;

CREATE POLICY issue_reports_select_scoped ON public.issue_reports
  FOR SELECT
  USING (public.has_workspace_permission(workspace_id, 'workspace.read'));

CREATE POLICY issue_reports_insert_scoped ON public.issue_reports
  FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, 'workspace.read'));

CREATE POLICY issue_reports_update_scoped ON public.issue_reports
  FOR UPDATE
  USING (public.has_workspace_permission(workspace_id, 'content.write'))
  WITH CHECK (public.has_workspace_permission(workspace_id, 'content.write'));

CREATE POLICY issue_reports_delete_owner ON public.issue_reports
  FOR DELETE
  USING (public.is_workspace_owner(workspace_id));

-- ============================================================================
-- SECTION 7: OPERATION-SPECIFIC SUPABASE STORAGE POLICIES (DB-01 §4.4)
-- ============================================================================
-- Replaces single `FOR ALL` policy on `storage.objects` with operation-specific
-- read, insert, and delete policies enforcing workspace + collection existence.

DROP POLICY IF EXISTS storage_workspace_member_access ON storage.objects;
DROP POLICY IF EXISTS storage_workspace_files_select ON storage.objects;
DROP POLICY IF EXISTS storage_workspace_files_insert ON storage.objects;
DROP POLICY IF EXISTS storage_workspace_files_delete ON storage.objects;

CREATE POLICY storage_workspace_files_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'workspace-files'
    AND public.has_workspace_permission((storage.foldername(name))[1], 'content.read')
  );

CREATE POLICY storage_workspace_files_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'workspace-files'
    AND public.has_workspace_permission((storage.foldername(name))[1], 'content.write')
    AND EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.workspace_id = (storage.foldername(name))[1]
        AND c.id = (storage.foldername(name))[2]
    )
  );
-- Note: UPDATE on `storage.objects` is intentionally omitted so uploaded files are immutable;
-- re-uploads generate a new versioned storage object path.

CREATE POLICY storage_workspace_files_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'workspace-files'
    AND public.has_workspace_permission((storage.foldername(name))[1], 'content.delete')
  );

-- ============================================================================
-- SECTION 8: ADDITIONAL PERFORMANCE & TENANT ISOLATION INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_memberships_user_active
  ON public.workspace_memberships(user_id, workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_shared_snapshots_workspace
  ON public.shared_snapshots(workspace_id, collection_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_issue_reports_workspace
  ON public.issue_reports(workspace_id, resolution_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created
  ON public.security_audit_logs(workspace_id, created_at DESC);

-- ============================================================================
-- SECTION 9: EXPLICIT TABLE GRANTS FOR NEW PERSISTENT TABLES (P2-SQL-04)
-- ============================================================================
-- Revoke default PUBLIC/anon write access and grant explicit role privileges
-- governed by FORCE ROW LEVEL SECURITY policies in Sections 6.16 and 6.17.

REVOKE ALL ON TABLE public.shared_snapshots FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.issue_reports FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_snapshots TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.issue_reports TO authenticated, service_role;

-- Allow anonymous callers to SELECT public non-expired shared snapshots (`is_public_document = true`)
-- strictly filtered by `shared_snapshots_select_scoped` RLS policy:
GRANT SELECT ON TABLE public.shared_snapshots TO anon;

COMMIT;

