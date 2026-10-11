-- ============================================================================
-- OKEng — Password Reset Tokens — Secure Recovery Flow (P0)
-- Migration ID : 20261011000005_password_reset_tokens.sql
-- Date         : 2026-10-11
-- Governing Doc: docs/PLAN-008-Security-Billing-Hardening.md v1.4 Phase 1
-- Implements   : P0 password reset permits account takeover fix
--                - Random 256-bit token, SHA256 hash at rest, expiring 1h, single-use
--                - Atomic consumption UPDATE ... WHERE used_at IS NULL AND expires_at > NOW() RETURNING user_id
--                - Token consumption and password update in single transaction
--                - Scoped to password reset only (not webhook/billing columns)
-- ============================================================================

BEGIN;

-- 1. Create password_reset_tokens table — Phase 1 scoped only
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at) WHERE used_at IS NULL;

-- 2. Enable and Force RLS — only service_role can access, no client policies
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens FORCE ROW LEVEL SECURITY;

-- Revoke all from PUBLIC, anon, authenticated — service_role bypasses RLS
REVOKE ALL ON TABLE public.password_reset_tokens FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.password_reset_tokens TO service_role;

-- No policies for client roles — service_role bypasses RLS, so no client access
-- Explicitly deny all for client roles via no policies (with FORCE RLS, no policy = deny)

COMMIT;
