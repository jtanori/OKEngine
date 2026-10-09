-- ============================================================================
-- OKEng — Canonical Supabase PostgreSQL Schema Migration (DATA-MIG-001)
-- Implements AUTH-01, AUTH-02, AUTH-03, EMBED-01, EMBED-02, DATA-001–003
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Workspaces (Tenant Root)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  public_key TEXT NOT NULL,
  signing_secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users (Synced with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
  platform_role TEXT CHECK (platform_role IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Workspace Memberships (Tenant Isolation Boundary)
CREATE TABLE IF NOT EXISTS public.workspace_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('WORKSPACE_OWNER', 'WORKSPACE_USER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

-- 4. Collections (Permission & Visibility Boundary)
CREATE TABLE IF NOT EXISTS public.collections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL CHECK (visibility IN ('everyone', 'members', 'admins')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, id)
);

-- 5. Uploaded Source Files (Supabase Storage Metadata)
CREATE TABLE IF NOT EXISTS public.files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, collection_id) REFERENCES public.collections(workspace_id, id) ON DELETE CASCADE
);

-- 6. Knowledge Documents (DATA-003 State Machine Enforced)
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL,
  file_id TEXT REFERENCES public.files(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'indexing', 'ready', 'failed', 'deleted')),
  next_step_label TEXT,
  next_step_url TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  indexed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, collection_id) REFERENCES public.collections(workspace_id, id) ON DELETE CASCADE
);

-- 7. Document Versions
CREATE TABLE IF NOT EXISTS public.document_versions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, document_id) REFERENCES public.documents(workspace_id, id) ON DELETE CASCADE
);

-- 8. Document Chunks (Pre-Retrieval Scoped Index)
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, document_id) REFERENCES public.documents(workspace_id, id) ON DELETE CASCADE
);

-- 9. Composable Embed Deployments (EMBED-02)
CREATE TABLE IF NOT EXISTS public.embeds (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft')),
  mode TEXT NOT NULL DEFAULT 'widget' CHECK (mode IN ('widget', 'panel', 'fullscreen', 'inline', 'documentation', 'contextual')),
  knowledge_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  behavior_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  appearance_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Conversations & Feedback
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  embed_id TEXT REFERENCES public.embeds(id) ON DELETE SET NULL,
  simulated_role TEXT NOT NULL CHECK (simulated_role IN ('everyone', 'members', 'admins')),
  current_url TEXT NOT NULL,
  feedback TEXT CHECK (feedback IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Usage Metering Records
CREATE TABLE IF NOT EXISTS public.usage_records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('retrieval_query', 'file_ingestion', 'embed_load')),
  answer_mode TEXT NOT NULL DEFAULT 'deterministic' CHECK (answer_mode IN ('deterministic', 'extractive', 'generative')),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Exceptional Admin Grants & Dual-Operator Approvals (AUTH-02 §15–16)
CREATE TABLE IF NOT EXISTS public.admin_grants (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  admin_user_id TEXT NOT NULL REFERENCES public.users(id),
  approved_by TEXT NOT NULL REFERENCES public.users(id),
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (admin_user_id <> approved_by)
);

CREATE TABLE IF NOT EXISTS public.critical_approvals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  requested_by TEXT NOT NULL REFERENCES public.users(id),
  approved_by TEXT REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (approved_by IS NULL OR requested_by <> approved_by)
);

-- 13. Immutable Security Audit Logs
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('ALLOW', 'DENY')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tenant-scoped query performance (DATA-001 & PERFORMANCE-001)
CREATE INDEX IF NOT EXISTS idx_collections_workspace ON public.collections(workspace_id, visibility);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_col ON public.documents(workspace_id, collection_id, status);
CREATE INDEX IF NOT EXISTS idx_chunks_workspace_col ON public.document_chunks(workspace_id, collection_id);
CREATE INDEX IF NOT EXISTS idx_embeds_workspace ON public.embeds(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON public.conversations(workspace_id, created_at DESC);
