-- ============================================================================
-- OKEngine — Supabase Auth identity, first-workspace provisioning, and private
-- Storage upload lifecycle.
--
-- New Auth users are mapped by immutable Auth UUID, never by email. Existing
-- custom-password users are deliberately NOT linked automatically; any legacy
-- account import needs an explicit, verified administrator migration.
-- ============================================================================

BEGIN;

-- 1. Map Auth identities to application profiles. The profile id remains text
-- and is set to auth.users.id::text for new users, matching the existing RLS
-- helpers that compare membership user_id with auth.uid()::text.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_uidx
  ON public.users(auth_user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_user_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  -- The application profile/workspace model requires a usable email for every Auth identity, including OAuth.
  -- The callback separately fails closed and signs out if the provider supplies no usable email.
  IF NEW.email IS NULL OR BTRIM(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  v_name := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name')), '');
  IF v_name IS NULL THEN
    v_name := NULLIF(SPLIT_PART(NEW.email, '@', 1), '');
  END IF;

  INSERT INTO public.users (id, auth_user_id, email, name, account_status, created_at, updated_at)
  VALUES (
    NEW.id::TEXT,
    NEW.id,
    LOWER(NEW.email),
    COALESCE(v_name, 'New user'),
    'ACTIVE',
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;
CREATE TRIGGER on_auth_user_profile_sync
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.users
  SET account_status = 'DELETED', updated_at = NOW()
  WHERE id = OLD.id::TEXT;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_profile_deletion ON auth.users;
CREATE TRIGGER on_auth_user_profile_deletion
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_auth_user();

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_deleted_auth_user() FROM PUBLIC, anon, authenticated;

-- Authenticated profile updates must not detach the immutable Auth identity or
-- change account/platform privileges. Existing legacy rows remain unlinked.
DROP POLICY IF EXISTS users_update_self_profile ON public.users;
CREATE POLICY users_update_self_profile ON public.users
  FOR UPDATE
  USING (
    id = auth.uid()::TEXT
    AND auth_user_id = auth.uid()
    AND account_status = 'ACTIVE'
  )
  WITH CHECK (
    id = auth.uid()::TEXT
    AND auth_user_id = auth.uid()
    AND account_status = 'ACTIVE'
    AND platform_role IS NOT DISTINCT FROM (
      SELECT u_existing.platform_role
      FROM public.users AS u_existing
      WHERE u_existing.id = auth.uid()::TEXT
        AND u_existing.auth_user_id = auth.uid()
    )
    AND email IS NOT DISTINCT FROM (
      SELECT u_existing.email FROM public.users AS u_existing
      WHERE u_existing.id = auth.uid()::TEXT AND u_existing.auth_user_id = auth.uid()
    )
    AND created_at IS NOT DISTINCT FROM (
      SELECT u_existing.created_at FROM public.users AS u_existing
      WHERE u_existing.id = auth.uid()::TEXT AND u_existing.auth_user_id = auth.uid()
    )
  );

-- Visibility helpers run as the migration-owned BYPASSRLS role so they can
-- inspect the target collection without recursively invoking its own SELECT
-- policy. Platform roles do not substitute for a workspace-owner membership.
CREATE OR REPLACE FUNCTION public.can_read_collection(
  target_workspace_id TEXT,
  target_collection_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN target_workspace_id IS NULL OR target_collection_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.collections AS c
      WHERE c.workspace_id = target_workspace_id
        AND c.id = target_collection_id
        AND (
          c.visibility = 'everyone'
          OR (
            c.visibility = 'members'
            AND public.has_workspace_permission(c.workspace_id, 'collection.read')
          )
          OR (
            c.visibility = 'admins'
            AND public.is_workspace_owner(c.workspace_id)
          )
        )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_read_collection_content(
  target_workspace_id TEXT,
  target_collection_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN target_workspace_id IS NULL OR target_collection_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.collections AS c
      WHERE c.workspace_id = target_workspace_id
        AND c.id = target_collection_id
        AND (
          c.visibility = 'everyone'
          OR (
            c.visibility = 'members'
            AND public.has_workspace_permission(c.workspace_id, 'content.read')
          )
          OR (
            c.visibility = 'admins'
            AND public.is_workspace_owner(c.workspace_id)
          )
        )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_collection_content(
  target_workspace_id TEXT,
  target_collection_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN target_workspace_id IS NULL OR target_collection_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.collections AS c
      WHERE c.workspace_id = target_workspace_id
        AND c.id = target_collection_id
        AND (
          (
            c.visibility IN ('everyone', 'members')
            AND public.has_workspace_permission(c.workspace_id, 'content.write')
          )
          OR (
            c.visibility = 'admins'
            AND public.is_workspace_owner(c.workspace_id)
          )
        )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_delete_collection_content(
  target_workspace_id TEXT,
  target_collection_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN target_workspace_id IS NULL OR target_collection_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.collections AS c
      WHERE c.workspace_id = target_workspace_id
        AND c.id = target_collection_id
        AND (
          (
            c.visibility IN ('everyone', 'members')
            AND public.has_workspace_permission(c.workspace_id, 'content.delete')
          )
          OR (
            c.visibility = 'admins'
            AND public.is_workspace_owner(c.workspace_id)
          )
        )
    )
  END;
$$;

ALTER FUNCTION public.can_read_collection(TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.can_read_collection_content(TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.can_write_collection_content(TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.can_delete_collection_content(TEXT, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.can_read_collection(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_collection_content(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_collection_content(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_delete_collection_content(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_collection(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_collection_content(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_collection_content(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_delete_collection_content(TEXT, TEXT) TO authenticated, service_role;

-- Rebuild data-access policies so visibility applies consistently to each
-- collection-bound record, not just to the parent collections table. In
-- particular, platform roles and ordinary content.read members cannot see an
-- `admins` collection unless they have an active WORKSPACE_OWNER membership.
DROP POLICY IF EXISTS collections_select_scoped ON public.collections;
CREATE POLICY collections_select_scoped ON public.collections
  FOR SELECT
  USING (public.can_read_collection(workspace_id, id));

DROP POLICY IF EXISTS collections_insert_scoped ON public.collections;
CREATE POLICY collections_insert_scoped ON public.collections
  FOR INSERT
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'collection.write')
    AND (visibility <> 'admins' OR public.is_workspace_owner(workspace_id))
  );

DROP POLICY IF EXISTS collections_update_scoped ON public.collections;
CREATE POLICY collections_update_scoped ON public.collections
  FOR UPDATE
  USING (
    public.has_workspace_permission(workspace_id, 'collection.write')
    AND public.can_read_collection(workspace_id, id)
  )
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'collection.write')
    AND public.can_read_collection(workspace_id, id)
  );

DROP POLICY IF EXISTS collections_delete_scoped ON public.collections;
CREATE POLICY collections_delete_scoped ON public.collections
  FOR DELETE
  USING (
    public.has_workspace_permission(workspace_id, 'collection.delete')
    AND public.can_read_collection(workspace_id, id)
  );

DROP POLICY IF EXISTS documents_select_scoped ON public.documents;
CREATE POLICY documents_select_scoped ON public.documents
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND status <> 'deleted'
    AND public.can_read_collection_content(workspace_id, collection_id)
  );

DROP POLICY IF EXISTS documents_insert_scoped ON public.documents;
CREATE POLICY documents_insert_scoped ON public.documents
  FOR INSERT
  WITH CHECK (public.can_write_collection_content(workspace_id, collection_id));

DROP POLICY IF EXISTS documents_update_scoped ON public.documents;
CREATE POLICY documents_update_scoped ON public.documents
  FOR UPDATE
  USING (public.can_write_collection_content(workspace_id, collection_id))
  WITH CHECK (
    public.can_write_collection_content(workspace_id, collection_id)
    AND (
      (status <> 'deleted' AND deleted_at IS NULL)
      OR public.has_workspace_permission(workspace_id, 'content.delete')
    )
  );

DROP POLICY IF EXISTS document_versions_select_scoped ON public.document_versions;
CREATE POLICY document_versions_select_scoped ON public.document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents AS d
      WHERE d.workspace_id = public.document_versions.workspace_id
        AND d.id = public.document_versions.document_id
        AND d.deleted_at IS NULL
        AND d.status <> 'deleted'
        AND public.can_read_collection_content(d.workspace_id, d.collection_id)
    )
  );

DROP POLICY IF EXISTS document_versions_insert_scoped ON public.document_versions;
CREATE POLICY document_versions_insert_scoped ON public.document_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents AS d
      WHERE d.workspace_id = public.document_versions.workspace_id
        AND d.id = public.document_versions.document_id
        AND d.deleted_at IS NULL
        AND d.status <> 'deleted'
        AND public.can_write_collection_content(d.workspace_id, d.collection_id)
    )
  );

DROP POLICY IF EXISTS document_chunks_select_scoped ON public.document_chunks;
CREATE POLICY document_chunks_select_scoped ON public.document_chunks
  FOR SELECT
  USING (
    public.can_read_collection_content(workspace_id, collection_id)
    AND EXISTS (
      SELECT 1 FROM public.documents AS d
      WHERE d.workspace_id = public.document_chunks.workspace_id
        AND d.collection_id = public.document_chunks.collection_id
        AND d.id = public.document_chunks.document_id
        AND d.deleted_at IS NULL
        AND d.status <> 'deleted'
    )
  );

DROP POLICY IF EXISTS document_chunks_insert_scoped ON public.document_chunks;
CREATE POLICY document_chunks_insert_scoped ON public.document_chunks
  FOR INSERT
  WITH CHECK (public.can_write_collection_content(workspace_id, collection_id));

DROP POLICY IF EXISTS document_chunks_delete_scoped ON public.document_chunks;
CREATE POLICY document_chunks_delete_scoped ON public.document_chunks
  FOR DELETE
  USING (public.can_write_collection_content(workspace_id, collection_id));

DROP POLICY IF EXISTS files_delete_scoped ON public.files;
CREATE POLICY files_delete_scoped ON public.files
  FOR DELETE
  USING (
    public.has_workspace_permission(workspace_id, 'content.delete')
    AND public.can_delete_collection_content(workspace_id, collection_id)
  );

DROP POLICY IF EXISTS shared_snapshots_select_scoped ON public.shared_snapshots;
CREATE POLICY shared_snapshots_select_scoped ON public.shared_snapshots
  FOR SELECT
  USING (
    revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
      (
        is_public_document = true
        AND public.can_read_collection(workspace_id, collection_id)
      )
      OR (
        is_public_document = false
        AND public.has_workspace_permission(workspace_id, 'content.read')
        AND public.can_read_collection_content(workspace_id, collection_id)
      )
    )
  );

DROP POLICY IF EXISTS shared_snapshots_insert_scoped ON public.shared_snapshots;
CREATE POLICY shared_snapshots_insert_scoped ON public.shared_snapshots
  FOR INSERT
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'content.read')
    AND public.can_read_collection_content(workspace_id, collection_id)
    AND (
      is_public_document = false
      OR EXISTS (
        SELECT 1 FROM public.collections AS c
        WHERE c.workspace_id = public.shared_snapshots.workspace_id
          AND c.id = public.shared_snapshots.collection_id
          AND c.visibility = 'everyone'
      )
    )
  );

DROP POLICY IF EXISTS shared_snapshots_update_revoke ON public.shared_snapshots;
CREATE POLICY shared_snapshots_update_revoke ON public.shared_snapshots
  FOR UPDATE
  USING (
    public.has_workspace_permission(workspace_id, 'content.write')
    AND public.can_write_collection_content(workspace_id, collection_id)
  )
  WITH CHECK (
    revoked_at IS NOT NULL
    AND public.has_workspace_permission(workspace_id, 'content.write')
    AND public.can_write_collection_content(workspace_id, collection_id)
  );

DROP POLICY IF EXISTS shared_snapshots_delete_owner ON public.shared_snapshots;
CREATE POLICY shared_snapshots_delete_owner ON public.shared_snapshots
  FOR DELETE
  USING (
    public.is_workspace_owner(workspace_id)
    AND public.can_delete_collection_content(workspace_id, collection_id)
  );

-- 2. Create exactly one starter workspace for a verified Auth identity that
-- has no active membership. The caller cannot choose the owner or workspace.
CREATE OR REPLACE FUNCTION public.provision_initial_workspace()
RETURNS TABLE (workspace_id TEXT, workspace_slug TEXT, workspace_role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_auth_user_id UUID := auth.uid();
  v_user_id TEXT;
  v_user_email TEXT;
  v_user_name TEXT;
  v_account_status TEXT;
  v_workspace_id TEXT;
  v_workspace_slug TEXT;
  v_workspace_name TEXT;
  v_workspace_role TEXT;
  v_slug_base TEXT;
  v_id_suffix TEXT;
BEGIN
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Serialize concurrent callback/signup requests for this Auth UUID so retries
  -- cannot provision a second starter workspace.
  PERFORM pg_advisory_xact_lock(hashtext(v_auth_user_id::TEXT));

  SELECT u.id, u.email, u.name, u.account_status
    INTO v_user_id, v_user_email, v_user_name, v_account_status
  FROM public.users AS u
  WHERE u.auth_user_id = v_auth_user_id;

  IF v_user_id IS NULL OR v_account_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Active application profile required' USING ERRCODE = '42501';
  END IF;

  SELECT wm.workspace_id, w.slug, wm.role
    INTO v_workspace_id, v_workspace_slug, v_workspace_role
  FROM public.workspace_memberships AS wm
  JOIN public.workspaces AS w ON w.id = wm.workspace_id
  WHERE wm.user_id = v_user_id
    AND wm.status = 'ACTIVE'
  ORDER BY wm.created_at DESC, wm.id DESC
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    workspace_id := v_workspace_id;
    workspace_slug := v_workspace_slug;
    workspace_role := v_workspace_role;
    RETURN NEXT;
    RETURN;
  END IF;

  v_workspace_id := 'ws_' || REPLACE(gen_random_uuid()::TEXT, '-', '');
  v_slug_base := REGEXP_REPLACE(LOWER(COALESCE(NULLIF(v_user_name, ''), SPLIT_PART(v_user_email, '@', 1), 'workspace')), '[^a-z0-9]+', '-', 'g');
  v_slug_base := TRIM(BOTH '-' FROM v_slug_base);
  IF v_slug_base = '' THEN
    v_slug_base := 'workspace';
  END IF;
  v_id_suffix := SUBSTRING(REPLACE(v_auth_user_id::TEXT, '-', '') FROM 1 FOR 8);
  v_workspace_slug := LEFT(v_slug_base, 48) || '-' || v_id_suffix;

  IF EXISTS (SELECT 1 FROM public.workspaces AS w WHERE w.slug = v_workspace_slug) THEN
    v_workspace_slug := LEFT(v_slug_base, 40) || '-' || v_id_suffix || '-' || SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
  END IF;

  v_workspace_name := COALESCE(NULLIF(v_user_name, ''), SPLIT_PART(v_user_email, '@', 1), 'Workspace') || '''s Workspace';

  INSERT INTO public.workspaces (id, slug, name, public_key, signing_secret_hash, created_at, updated_at)
  VALUES (
    v_workspace_id,
    v_workspace_slug,
    v_workspace_name,
    ENCODE(gen_random_bytes(16), 'hex'),
    ENCODE(digest(gen_random_bytes(32), 'sha256'), 'hex'),
    NOW(),
    NOW()
  );

  INSERT INTO public.workspace_memberships (id, workspace_id, user_id, role, status, permissions, created_at, updated_at)
  VALUES (
    'wm_' || REPLACE(gen_random_uuid()::TEXT, '-', ''),
    v_workspace_id,
    v_user_id,
    'WORKSPACE_OWNER',
    'ACTIVE',
    '["workspace.read","collection.read","content.read","test.execute"]'::JSONB,
    NOW(),
    NOW()
  );

  -- A real tenant starts with one private collection so its owner can upload
  -- private files immediately; this is tenant data, not a browser seed fixture.
  INSERT INTO public.collections (id, workspace_id, name, description, visibility, created_at, updated_at)
  VALUES (
    'col_' || REPLACE(gen_random_uuid()::TEXT, '-', ''),
    v_workspace_id,
    'Knowledge Base',
    'Private knowledge for this workspace.',
    'members',
    NOW(),
    NOW()
  );

  workspace_id := v_workspace_id;
  workspace_slug := v_workspace_slug;
  workspace_role := 'WORKSPACE_OWNER';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_initial_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_initial_workspace() TO authenticated;

-- 3. Bind each new Storage object to an authenticated, pending metadata row.
-- Object names are relative to the private `workspace-files` bucket:
-- {workspace_id}/{collection_id}/{uuid}-{safe_filename}
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS files_select_scoped ON public.files;
CREATE POLICY files_select_scoped ON public.files
  FOR SELECT
  USING (
    (
      upload_status = 'ready'
      AND public.has_workspace_permission(workspace_id, 'content.read')
      AND public.can_read_collection_content(workspace_id, collection_id)
    )
    OR (
      upload_status = 'pending_upload'
      AND uploaded_by = auth.uid()::TEXT
      AND public.has_workspace_permission(workspace_id, 'content.write')
      AND public.can_write_collection_content(workspace_id, collection_id)
    )
  );

DROP POLICY IF EXISTS files_insert_scoped ON public.files;
CREATE POLICY files_insert_scoped ON public.files
  FOR INSERT
  WITH CHECK (
    upload_status = 'pending_upload'
    AND uploaded_by = auth.uid()::TEXT
    AND public.has_workspace_permission(workspace_id, 'content.write')
    AND public.can_write_collection_content(public.files.workspace_id, public.files.collection_id)
  );

-- Storage reads and writes require matching metadata. This blocks untracked
-- objects and prevents pending/orphaned uploads from being served as ready.
DROP POLICY IF EXISTS storage_workspace_member_access ON storage.objects;
DROP POLICY IF EXISTS storage_workspace_files_select ON storage.objects;
DROP POLICY IF EXISTS storage_workspace_files_insert ON storage.objects;
DROP POLICY IF EXISTS storage_workspace_files_delete ON storage.objects;
CREATE POLICY storage_workspace_files_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'workspace-files'
    AND public.has_workspace_permission((storage.foldername(name))[1], 'content.read')
    AND public.can_read_collection_content(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
    AND EXISTS (
      SELECT 1 FROM public.files AS f
      WHERE f.workspace_id = (storage.foldername(name))[1]
        AND f.storage_path = storage.objects.name
        AND f.upload_status = 'ready'
    )
  );

DROP POLICY IF EXISTS storage_workspace_files_insert ON storage.objects;
CREATE POLICY storage_workspace_files_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'workspace-files'
    AND public.has_workspace_permission((storage.foldername(name))[1], 'content.write')
    AND public.can_write_collection_content(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
    AND EXISTS (
      SELECT 1 FROM public.files AS f
      WHERE f.workspace_id = (storage.foldername(name))[1]
        AND f.collection_id = (storage.foldername(name))[2]
        AND f.storage_path = storage.objects.name
        AND f.upload_status = 'pending_upload'
        AND f.uploaded_by = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS storage_workspace_files_delete ON storage.objects;
CREATE POLICY storage_workspace_files_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'workspace-files'
    AND (
      (
        public.has_workspace_permission((storage.foldername(name))[1], 'content.delete')
        AND public.can_delete_collection_content(
          (storage.foldername(name))[1],
          (storage.foldername(name))[2]
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.files AS f
        WHERE f.workspace_id = (storage.foldername(name))[1]
          AND f.collection_id = (storage.foldername(name))[2]
          AND f.storage_path = storage.objects.name
          AND f.upload_status = 'pending_upload'
          AND f.uploaded_by = auth.uid()::TEXT
          AND public.has_workspace_permission(f.workspace_id, 'content.write')
          AND public.can_write_collection_content(f.workspace_id, f.collection_id)
      )
    )
  );

CREATE OR REPLACE FUNCTION public.complete_file_upload(p_file_id TEXT, p_storage_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_workspace_id TEXT;
  v_collection_id TEXT;
  v_uploaded_by TEXT;
  v_current_path TEXT;
  v_upload_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT f.workspace_id, f.collection_id, f.uploaded_by, f.storage_path, f.upload_status
    INTO v_workspace_id, v_collection_id, v_uploaded_by, v_current_path, v_upload_status
  FROM public.files AS f
  WHERE f.id = p_file_id;

  IF v_workspace_id IS NULL
     OR v_uploaded_by IS DISTINCT FROM auth.uid()::TEXT
     OR v_current_path IS DISTINCT FROM p_storage_path
     OR v_upload_status NOT IN ('pending_upload', 'ready')
     OR NOT public.has_workspace_permission(v_workspace_id, 'content.write')
     OR NOT public.can_write_collection_content(v_workspace_id, v_collection_id) THEN
    RAISE EXCEPTION 'File upload authorization failed' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects AS o
    WHERE o.bucket_id = 'workspace-files'
      AND o.name = p_storage_path
  ) THEN
    RAISE EXCEPTION 'Uploaded object not found' USING ERRCODE = '55000';
  END IF;

  -- A lost RPC response can be retried safely after the first call committed.
  IF v_upload_status = 'ready' THEN
    RETURN TRUE;
  END IF;

  UPDATE public.files
  SET upload_status = 'ready'
  WHERE id = p_file_id AND upload_status = 'pending_upload';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.abort_file_upload(p_file_id TEXT, p_storage_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_workspace_id TEXT;
  v_collection_id TEXT;
  v_uploaded_by TEXT;
  v_current_path TEXT;
  v_upload_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT f.workspace_id, f.collection_id, f.uploaded_by, f.storage_path, f.upload_status
    INTO v_workspace_id, v_collection_id, v_uploaded_by, v_current_path, v_upload_status
  FROM public.files AS f
  WHERE f.id = p_file_id;

  IF v_workspace_id IS NULL
     OR v_uploaded_by IS DISTINCT FROM auth.uid()::TEXT
     OR v_current_path IS DISTINCT FROM p_storage_path
     OR v_upload_status <> 'pending_upload'
     OR NOT public.has_workspace_permission(v_workspace_id, 'content.write')
     OR NOT public.can_write_collection_content(v_workspace_id, v_collection_id) THEN
    RAISE EXCEPTION 'File upload authorization failed' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM storage.objects AS o
    WHERE o.bucket_id = 'workspace-files'
      AND o.name = p_storage_path
  ) THEN
    UPDATE public.files
    SET upload_status = 'orphaned'
    WHERE id = p_file_id AND upload_status = 'pending_upload';
    RETURN 'orphaned';
  END IF;

  DELETE FROM public.files
  WHERE id = p_file_id AND upload_status = 'pending_upload';
  RETURN 'removed';
END;
$$;

-- These SECURITY DEFINER functions must run as the migration-owned BYPASSRLS
-- role; their bodies perform their own Auth UUID, workspace, and metadata checks.
ALTER FUNCTION public.handle_new_auth_user() OWNER TO postgres;
ALTER FUNCTION public.handle_deleted_auth_user() OWNER TO postgres;
ALTER FUNCTION public.provision_initial_workspace() OWNER TO postgres;
ALTER FUNCTION public.complete_file_upload(TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.abort_file_upload(TEXT, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.complete_file_upload(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.abort_file_upload(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_file_upload(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abort_file_upload(TEXT, TEXT) TO authenticated;

-- 4. Explicit Data API grants. RLS policies above remain the tenant boundary;
-- grants merely permit the matching table operations for authenticated users.
REVOKE ALL ON TABLE
  public.workspaces,
  public.users,
  public.workspace_memberships,
  public.collections,
  public.files,
  public.documents,
  public.document_versions,
  public.document_chunks,
  public.embeds,
  public.conversations,
  public.conversation_messages,
  public.usage_records,
  public.admin_grants,
  public.critical_approvals,
  public.security_audit_logs
FROM PUBLIC, anon;

-- Anonymous Data API access is read-only and remains narrowed by the existing
-- visibility/RLS policies; private workspaces, files, and user data stay denied.
GRANT SELECT ON TABLE public.collections, public.documents, public.document_chunks TO anon;

-- Tenant-facing permissions use the caller's JWT and remain subject to RLS.
GRANT SELECT, UPDATE ON TABLE public.workspaces TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT ON TABLE public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.collections TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.files TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.documents TO authenticated;
GRANT SELECT ON TABLE public.documents TO service_role;
GRANT SELECT, INSERT ON TABLE public.document_versions TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.document_chunks TO authenticated;
GRANT SELECT ON TABLE public.document_chunks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.embeds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.conversation_messages TO authenticated;
GRANT SELECT ON TABLE public.usage_records TO authenticated;
GRANT INSERT ON TABLE public.usage_records TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_grants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.critical_approvals TO authenticated;
GRANT SELECT ON TABLE public.security_audit_logs TO authenticated;
GRANT INSERT ON TABLE public.security_audit_logs TO service_role;

COMMIT;
