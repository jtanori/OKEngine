-- ============================================================================
-- OKEng — Post-Commit Composite Foreign Key Validation & Catalog Verification
-- Migration ID : 20261009000004_okeng_staging_validate_constraints.sql
-- Date         : 2026-10-09
-- Database Req : PostgreSQL 15.0+ (`SHOW server_version_num;` >= 150000)
-- Governing Doc: docs/DB-01-PostgreSQL-Security-Migration-Specification.md
--                docs/REMEDIATION-STG-01-Execution-Record.md (P2-SQL-05)
-- Status       : HELD — Pending live PostgreSQL 15.0+ clean-install & seeded-upgrade execution
-- ============================================================================
-- Rationale (P2-SQL-05):
--   Migration `20261009000003_okeng_staging_security_hardening.sql` adds all 7
--   composite cross-tenant foreign keys with `NOT VALID` inside a fast metadata
--   transaction so `AccessExclusiveLock` is released in milliseconds.
--   This companion script validates all 7 constraints outside that metadata
--   transaction block, acquiring only `ShareUpdateExclusiveLock` on each table
--   so concurrent reads and writes are not blocked during table scans.
-- ============================================================================

-- 1. Preflight PostgreSQL 15.0+ Engine Version Assertion
DO $$
DECLARE
  pg_ver INTEGER;
BEGIN
  pg_ver := current_setting('server_version_num')::integer;
  IF pg_ver < 150000 THEN
    RAISE EXCEPTION 'POSTGRES_VERSION_UNSUPPORTED: OKEng composite ON DELETE SET NULL (column) requires PostgreSQL 15.0+ (server_version_num >= 150000, found %)', pg_ver;
  END IF;
END $$;

-- 2. Non-Blocking Constraint Validation Phase (`ShareUpdateExclusiveLock`)
ALTER TABLE public.documents
  VALIDATE CONSTRAINT fk_documents_workspace_file;

ALTER TABLE public.document_chunks
  VALIDATE CONSTRAINT fk_chunks_workspace_col_document;

ALTER TABLE public.conversations
  VALIDATE CONSTRAINT fk_conversations_workspace_embed;

ALTER TABLE public.conversation_messages
  VALIDATE CONSTRAINT fk_messages_workspace_conversation;

ALTER TABLE public.shared_snapshots
  VALIDATE CONSTRAINT fk_shared_snapshots_workspace_collection;

ALTER TABLE public.shared_snapshots
  VALIDATE CONSTRAINT fk_shared_snapshots_workspace_document;

ALTER TABLE public.issue_reports
  VALIDATE CONSTRAINT fk_issue_reports_workspace_document;

-- 3. Post-Validation Catalog Verification Assertions (DB-01 §6 / P0-SQL-01..P2-SQL-05)
DO $$
DECLARE
  unvalidated_count INTEGER;
  unforced_rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unvalidated_count
  FROM pg_constraint
  WHERE conname IN (
    'fk_documents_workspace_file',
    'fk_chunks_workspace_col_document',
    'fk_conversations_workspace_embed',
    'fk_messages_workspace_conversation',
    'fk_shared_snapshots_workspace_collection',
    'fk_shared_snapshots_workspace_document',
    'fk_issue_reports_workspace_document'
  )
  AND convalidated = false;

  IF unvalidated_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION_VALIDATION_INCOMPLETE: % composite foreign keys remain NOT VALID', unvalidated_count;
  END IF;

  SELECT COUNT(*) INTO unforced_rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
      'workspaces', 'users', 'workspace_memberships', 'collections', 'files',
      'documents', 'document_versions', 'document_chunks', 'embeds',
      'conversations', 'conversation_messages', 'usage_records', 'admin_grants',
      'critical_approvals', 'security_audit_logs', 'shared_snapshots', 'issue_reports'
    )
    AND (c.relrowsecurity = false OR c.relforcerowsecurity = false);

  IF unforced_rls_count > 0 THEN
    RAISE EXCEPTION 'RLS_ENFORCEMENT_INCOMPLETE: % public tables lack ENABLE + FORCE ROW LEVEL SECURITY', unforced_rls_count;
  END IF;
END $$;
