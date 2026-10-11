// src/lib/billing.ts — Billing plan definitions, price mappings, authoritative status handling (PLAN-008 Phase 2-3)
// Implements: safe construction of Stripe price map, fail-fast on duplicate, past_due grace with persisted past_due_since, authoritative billing state

export const BILLING_PLANS = ['starter', 'pro', 'escala'] as const;
export type BillingPlan = typeof BILLING_PLANS[number];
export const BILLING_INTERVALS = ['monthly', 'annual'] as const;
export type BillingInterval = typeof BILLING_INTERVALS[number];

export const PLAN_PRICE_MAP: Record<BillingPlan, Record<BillingInterval, string | undefined>> = {
  starter: { monthly: undefined, annual: undefined },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  },
  escala: {
    monthly: process.env.STRIPE_ESCALA_MONTHLY_PRICE_ID,
    annual: process.env.STRIPE_ESCALA_ANNUAL_PRICE_ID,
  },
};

// Build reverse map safely — Correction P1-2: only from configured non-empty price IDs, reject duplicates at startup
export function buildPriceMap(): Record<string, { plan: BillingPlan; interval: BillingInterval }> {
  const reverse: Record<string, { plan: BillingPlan; interval: BillingInterval }> = {};
  for (const plan of BILLING_PLANS) {
    for (const interval of BILLING_INTERVALS) {
      const priceId = PLAN_PRICE_MAP[plan][interval];
      if (!priceId || priceId.trim() === '' || priceId === 'undefined') {
        // Skip missing/empty — do not add "undefined" key (P1-2)
        continue;
      }
      if (reverse[priceId]) {
        const existing = reverse[priceId];
        if (existing.plan !== plan || existing.interval !== interval) {
          throw new Error(
            `Duplicate Stripe price ID ${priceId} mapped to different plan/interval: ${existing.plan}/${existing.interval} vs ${plan}/${interval}`
          );
        }
        // Same mapping duplicate — ignore
        continue;
      }
      reverse[priceId] = { plan, interval };
    }
  }
  return reverse;
}

// Built at startup, throws if duplicate — fail fast
export const PRICE_ID_TO_PLAN = buildPriceMap();

export const PLAN_LIMITS = {
  // Verified against product contract (00_product_contract, ANALYSIS-001): Starter 1k/mo, Pro 10k/mo, Escala custom/unlimited (usage.ts also Infinity)
  // Escala is custom/unlimited per CAP-21/CAP-21 — no hard cap; Infinity reflects negotiable, not 100 placeholder.
  starter: { maxCollections: 1, maxFiles: 100, maxEmbeds: 1, maxQueriesPerMonth: 1000 },
  pro: { maxCollections: 10, maxFiles: 1000, maxEmbeds: 5, maxQueriesPerMonth: 10000 },
  escala: { maxCollections: Infinity, maxFiles: Infinity, maxEmbeds: Infinity, maxQueriesPerMonth: Infinity },
};

export type StripeSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface PlanResult {
  plan: BillingPlan;
  interval: BillingInterval;
  hasPaidAccess: boolean;
  reason: string;
  pastDueSince: Date | null;
}

// Correction P1-1: past_due grace enforceable with persisted past_due_since
export function getPlanFromSubscriptionStatus(
  status: StripeSubscriptionStatus,
  priceId: string | undefined,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: number, // seconds
  existingPastDueSince: Date | null | undefined,
  now: Date = new Date()
): PlanResult {
  // Map priceId to plan safely — only from configured non-empty
  if (!priceId || !PRICE_ID_TO_PLAN[priceId]) {
    return {
      plan: 'starter',
      interval: 'monthly',
      hasPaidAccess: false,
      reason: `price ${priceId} not in allowlist`,
      pastDueSince: null,
    };
  }
  const mapped = PRICE_ID_TO_PLAN[priceId];
  const plan = mapped.plan;
  const interval = mapped.interval;

  const currentPeriodEndMs = currentPeriodEnd * 1000;
  const nowMs = now.getTime();

  switch (status) {
    case 'trialing':
      return { plan, interval, hasPaidAccess: true, reason: 'trialing', pastDueSince: null };
    case 'active':
      return {
        plan,
        interval,
        hasPaidAccess: true,
        reason: cancelAtPeriodEnd ? 'active_cancel_at_period_end' : 'active',
        pastDueSince: null,
      };
    case 'past_due': {
      // Correction P1-1: persist past_due_since, start only on transition, don't restart clock
      let pastDueSince: Date | null;
      if (existingPastDueSince) {
        pastDueSince = existingPastDueSince;
      } else {
        pastDueSince = now;
      }
      const graceEnd = pastDueSince.getTime() + 7 * 24 * 60 * 60 * 1000; // 7 days
      if (nowMs > graceEnd) {
        return {
          plan: 'starter',
          interval: 'monthly',
          hasPaidAccess: false,
          reason: 'past_due_grace_expired',
          pastDueSince,
        };
      }
      return { plan, interval, hasPaidAccess: true, reason: 'past_due_grace', pastDueSince };
    }
    case 'unpaid':
      return { plan: 'starter', interval: 'monthly', hasPaidAccess: false, reason: 'unpaid', pastDueSince: null };
    case 'canceled': {
      // Base on authoritative state and period end, not merely cancel_at_period_end
      if (cancelAtPeriodEnd && currentPeriodEndMs > nowMs) {
        return {
          plan,
          interval,
          hasPaidAccess: true,
          reason: 'canceled_at_period_end_still_active',
          pastDueSince: null,
        };
      }
      return { plan: 'starter', interval: 'monthly', hasPaidAccess: false, reason: 'canceled', pastDueSince: null };
    }
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return { plan: 'starter', interval: 'monthly', hasPaidAccess: false, reason: status, pastDueSince: null };
  }
}

// Helper to validate plan and interval against allowlists
export function validatePlanAndInterval(
  plan: string,
  interval: string
): { valid: boolean; plan?: BillingPlan; interval?: BillingInterval; error?: string } {
  if (!BILLING_PLANS.includes(plan as BillingPlan)) {
    return { valid: false, error: `Invalid plan ${plan}, allowed: ${BILLING_PLANS.join(', ')}` };
  }
  if (!BILLING_INTERVALS.includes(interval as BillingInterval)) {
    return { valid: false, error: `Invalid interval ${interval}, allowed: ${BILLING_INTERVALS.join(', ')}` };
  }
  return { valid: true, plan: plan as BillingPlan, interval: interval as BillingInterval };
}
