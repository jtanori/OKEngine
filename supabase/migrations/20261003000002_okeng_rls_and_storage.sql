-- ============================================================================
-- OKEng — Row-Level Security (RLS) & Supabase Storage Policies (DATA-MIG-001)
-- Enforces Multi-Tenant Isolation (DATA-002) & Pre-Retrieval Visibility (SECURITY-001)
-- ============================================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critical_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: verify active membership in target workspace
CREATE OR REPLACE FUNCTION public.has_active_workspace_membership(target_workspace_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_memberships wm
    JOIN public.users u ON u.id = wm.user_id
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = auth.uid()::text
      AND wm.status = 'ACTIVE'
      AND u.account_status = 'ACTIVE'
  );
$$;

-- Helper function: verify workspace owner role
CREATE OR REPLACE FUNCTION public.is_workspace_owner(target_workspace_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_memberships wm
    JOIN public.users u ON u.id = wm.user_id
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = auth.uid()::text
      AND wm.role = 'WORKSPACE_OWNER'
      AND wm.status = 'ACTIVE'
      AND u.account_status = 'ACTIVE'
  );
$$;

-- 1. Workspaces Isolation Policy
CREATE POLICY workspace_member_select ON public.workspaces
  FOR SELECT USING (public.has_active_workspace_membership(id));

CREATE POLICY workspace_owner_update ON public.workspaces
  FOR UPDATE USING (public.is_workspace_owner(id));

-- 2. Collections Isolation + Public Surface Policy
CREATE POLICY collections_tenant_or_public_select ON public.collections
  FOR SELECT USING (
    visibility = 'everyone'
    OR public.has_active_workspace_membership(workspace_id)
  );

CREATE POLICY collections_owner_write ON public.collections
  FOR ALL USING (public.is_workspace_owner(workspace_id));

-- 3. Documents Isolation + Pre-Retrieval Visibility & Soft-Delete Exclusion
CREATE POLICY documents_authorized_select ON public.documents
  FOR SELECT USING (
    deleted_at IS NULL
    AND status <> 'deleted'
    AND (
      EXISTS (
        SELECT 1 FROM public.collections c
        WHERE c.id = documents.collection_id
          AND c.workspace_id = documents.workspace_id
          AND c.visibility = 'everyone'
      )
      OR public.has_active_workspace_membership(workspace_id)
    )
  );

CREATE POLICY documents_owner_write ON public.documents
  FOR ALL USING (public.is_workspace_owner(workspace_id));

-- 4. Chunks, Files, Embeds, Conversations & Usage Policies
CREATE POLICY files_tenant_isolation ON public.files
  FOR ALL USING (public.has_active_workspace_membership(workspace_id));

CREATE POLICY chunks_tenant_isolation ON public.document_chunks
  FOR SELECT USING (public.has_active_workspace_membership(workspace_id));

CREATE POLICY embeds_tenant_isolation ON public.embeds
  FOR ALL USING (public.has_active_workspace_membership(workspace_id));

CREATE POLICY conversations_tenant_isolation ON public.conversations
  FOR ALL USING (public.has_active_workspace_membership(workspace_id));

CREATE POLICY usage_tenant_isolation ON public.usage_records
  FOR ALL USING (public.has_active_workspace_membership(workspace_id));

-- 5. Supabase Storage Bucket & Tenant-Scoped Object Policy (DATA-001 & STORAGE-001)
-- Path convention: workspace-files/{workspace_id}/{collection_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-files',
  'workspace-files',
  false,
  10485760,
  ARRAY['text/markdown', 'text/plain', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_workspace_member_access ON storage.objects
  FOR ALL USING (
    bucket_id = 'workspace-files'
    AND public.has_active_workspace_membership((storage.foldername(name))[1])
  );
