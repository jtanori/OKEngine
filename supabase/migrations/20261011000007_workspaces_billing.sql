-- ============================================================================
-- OKEng — Workspaces Billing Columns — Authoritative Billing State (P1)
-- Migration ID : 20261011000007_workspaces_billing.sql
-- Date         : 2026-10-11
-- Governing Doc: docs/PLAN-008-Security-Billing-Hardening.md v1.4 Phase 3
-- Implements   : P1 Billing state authoritative with enforceable grace and safe allowlist
--                - Adds billing columns to workspaces: plan, plan_interval, stripe_customer_id,
--                  stripe_subscription_id, stripe_subscription_status, stripe_current_period_end,
--                  stripe_cancel_at_period_end, past_due_since
--                - Scoped to billing columns only (not password_reset_tokens, not stripe_webhook_events)
-- ============================================================================

BEGIN;

-- 1. Add billing columns to workspaces if not exist
-- plan: starter | pro | escala, default starter
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'escala'));
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_interval IN ('monthly', 'annual'));

-- stripe_customer_id: nullable, unique index for fast lookup
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- stripe_subscription_status: trialing, active, past_due, unpaid, canceled, incomplete, incomplete_expired, paused
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;

-- stripe_current_period_end: period end from Stripe authoritative
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;

-- stripe_cancel_at_period_end: boolean flag
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- past_due_since: persisted start time for past_due grace 7d, start only on transition
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;

-- 2. Indexes for fast trusted workspace resolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_stripe_customer_id ON public.workspaces(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_stripe_subscription_id ON public.workspaces(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_plan ON public.workspaces(plan);
CREATE INDEX IF NOT EXISTS idx_workspaces_past_due_since ON public.workspaces(past_due_since) WHERE past_due_since IS NOT NULL;

-- 3. RLS remains enabled from previous migrations, no additional policies needed
-- Existing policies on workspaces continue to apply

COMMIT;
