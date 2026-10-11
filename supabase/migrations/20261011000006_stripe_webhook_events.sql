-- ============================================================================
-- OKEng — Stripe Webhook Events — Idempotent Recoverable Processing (P0)
-- Migration ID : 20261011000006_stripe_webhook_events.sql
-- Date         : 2026-10-11
-- Governing Doc: docs/PLAN-008-Security-Billing-Hardening.md v1.4 Phase 2
-- Implements   : P0 Stripe webhook can trust forged events fix
--                - Event ID uniqueness constraint for idempotency
--                - Status: processing, processed, unresolved for recoverable reconciliation
--                - Error JSONB for diagnostics, not silently discarded
--                - Scoped to webhook events only (not billing columns)
-- ============================================================================

BEGIN;

-- 1. Create stripe_webhook_events table — Phase 2 scoped only
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  workspace_id TEXT,
  data JSONB,
  stripe_created BIGINT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'unresolved')),
  error JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_webhook_events_id ON public.stripe_webhook_events(id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON public.stripe_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_workspace ON public.stripe_webhook_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events(type);

-- 2. Enable and Force RLS — only service_role can access, no client policies
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stripe_webhook_events TO service_role;

-- No policies for client roles — service_role bypasses RLS

COMMIT;
