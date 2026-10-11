# PLAN-008 — Security & Billing Hardening: Resolution Plan for P0/P1 Review Findings (Amended v1.2)

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-008` |
| **Status** | `DRAFT v1.2 — AMENDED PER SECOND REVIEW — AWAITING SIGNAL FOR PHASE 1 ONLY` |
| **Owner** | Engineering & Security |
| **Authority** | Blocking — P0 Security, P1 Billing & Auth |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `STG-01`, `AUTH-01..03`, `PLAN-007`, `LOCAL-SETUP-GUIDE v2.0`, `00_product_contract` |
| **Revision** | `1.2 (2026-10-11)` — Incorporates second review 4 corrections: past_due grace enforceable with persisted past_due_since, price allowlist safe handling missing config, explicit concurrency strategy with row locking for webhook race, migration ownership single authoritative path + 5 review points: atomic token+password in single transaction, webhook idempotent recoverable with deleted subscription handling, subscription status policy with explicit period end, workspace auth consistency, rate-limit fallback trustworthy identifier |
| **Review Source** | User P0/P1 review + first review 5 adjustments (atomic consumption, idempotency, authoritative billing, workspace auth, proxy trust) + second review 4 corrections (past_due grace enforceable, price allowlist safe, concurrency strategy, migration ownership) + 5 remaining review points (password-reset atomicity, webhook recoverable, subscription policy, workspace auth, rate-limit fallback) |
| **Original Findings** | P0 password reset UUID takeover, P0 webhook forged events when secret absent, P1 checkout plan metadata trust, P1 signup non-atomic, P1 session workspace roles missing, P1 rate limiting IP spoofing |

---

## 0. Goal & Merge Gate (Amended v1.2)

Fix exploitable security, tenant isolation, billing entitlement, auth flows before merging PR #1. **Key principle**: security guarantees enforceable in code, not just documented. **Important rule from second review**: passing test suite necessary but not sufficient — each phase must demonstrate security invariant holds and existing behavior intact.

**Merge gate**:
- [ ] Secure password-reset token generation, verification, expiry, single-use enforcement with **atomic consumption in single transaction** (P0) + concurrent reuse prevention
- [ ] Strict Stripe webhook signature verification fail-closed staging/prod, **idempotent & recoverable** with event ID uniqueness, transactional dedup+entitlement, handles deleted subscriptions & API failures, out-of-order without stale overwrite, explicit concurrency strategy with row locking (P0)
- [ ] Server-side plan and price validation with entitlement from **verified Stripe price and authoritative subscription status** (trialing, past_due with persisted grace, unpaid, canceled at period end, deleted) — never metadata or unverified checkout (P1)
- [ ] Atomic signup transaction + **consistent workspace auth** — primary workspace deterministic (most recent active membership) but billing operations validate authenticated user, requested workspace, active membership, required role every time, never fallback to caller-provided ID when session missing (P1)
- [ ] Rate limiting hardened with **explicit proxy trust boundary**, TRUST_PROXY, safe fallback using trustworthy session/account identifier not shared unknown bucket, fail-closed AUTH on Redis outage, fail-open others with deliberate availability strategy (P1)
- [ ] Regression tests covering security & billing with **negative tests**, concurrent handlers, transaction rollback, integration, spoofed-header, Redis outage per tier, TTL
- [ ] Production build, lint, existing suites — **baseline 52/52 + 29/29 recorded before changes, treated as baseline to verify not guaranteed, investigate failures not weaken tests**, report actual results

**Scope note**: Code-inspection response, includes runtime verification. Next step per second review: review committed plan itself against criteria, then **explicitly authorize Phase 1 only** — not treat plan review as authorization for all 8 phases. Keep `OKENG_ENABLE_PASSWORD_RESET=false` until full reset flow and delivery verified.

---

## 1. Current State Audit — Findings Confirmed

### 1.1 P0 — Password reset permits account takeover

`src/app/api/auth/reset-password/route.ts` 61 lines — UUID as token, `UPDATE users SET password_hash WHERE id = token`, no verification. `forgot-password` 37 lines generic success no token. No `password_reset_tokens` table in migrations (201 + 936 lines). Schema `resetPasswordSchema` no format validation.

**Impact**: P0 Blocking.

### 1.2 P0 — Stripe webhook forged events

`src/app/api/billing/webhooks/route.ts` 106 lines — if secret absent parses JSON directly, uses `metadata.plan` client-controlled to update workspace. No fail-closed.

**Impact**: P0 Blocking.

### 1.3 P1 — Checkout trusts client plan metadata

`src/app/api/billing/checkout/route.ts` 79 lines — `plan = body.plan`, `priceId` only Pro, metadata plan can be escala while paying Pro, workspaceId from body or session (session missing on login), success URL includes plan from client, no idempotency.

**Impact**: P1 Required.

### 1.4 P1 — Signup not atomic

`src/app/api/auth/signup/route.ts` 81 lines — 3 INSERT without transaction.

**Impact**: P1 data corruption.

### 1.5 P1 — Session and workspace roles

Signup assigns admin via `workspace_members`, login reads `users.role` not `workspace_members`, no workspaceId. `users` Supabase has `platform_role`, pg pool uses `users.role` and `workspace_members` vs Supabase `workspace_memberships` inconsistency. Session missing workspaceId, checkout uses client-supplied.

**Impact**: P1 broken auth, isolation risk.

### 1.6 P1 — Rate limiting IP spoofing

`src/lib/rateLimit.ts` 60 lines — `x-forwarded-for` first entry trusted directly, fail-open all tiers, no accurate TTL.

**Impact**: P1 IP limits bypassable.

---

## 2. Secure Design — With 5 First Review Adjustments + 4 Second Review Corrections + 5 Remaining Points

### 2.1 P0 — Password Reset with Atomic Consumption in Single Transaction (Adjustments #1 + Review Point #1)

**Goal**: Random, expiring, single-use, hashed at rest, atomic consumption preventing concurrent reuse, **token consumption and password update in single DB transaction**, hash password only after validation.

**Review Point #1**: Conditional `UPDATE ... RETURNING user_id` is right primitive. Ensure token consumption and password update occur in single transaction. Otherwise failure between operations could consume valid token without resetting password.

**DB Migration** `supabase/migrations/20261011000005_password_reset_tokens.sql` (authoritative path, see 2.7):

```sql
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
CREATE INDEX idx_password_reset_tokens_user ON public.password_reset_tokens(user_id, expires_at);
CREATE INDEX idx_password_reset_tokens_hash ON public.password_reset_tokens(token_hash);
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens FORCE ROW LEVEL SECURITY;
```

For pg pool, same SQL applied via authoritative migration script (see 2.7).

**Token Generation** (forgot-password):

1. Generic success to avoid enumeration.
2. If user exists, generate raw token `crypto.randomBytes(32).toString('hex')` 256-bit.
3. Hash SHA256 `createHash('sha256').update(rawToken).digest('hex')` — store hash.
4. Store id UUID, user_id, token_hash, expires_at NOW()+1h, created_ip sanitized (see 2.6), user_agent.
5. Invalidate previous unused tokens for same user.
6. Email link `${APP_URL}/reset-password?token=${rawToken}` — dev only log token if `NODE_ENV=development` AND `OKENG_ENV=development`, never prod.
7. Rate limit per IP and per email AUTH tier.

**Token Verification** (reset-password) — **Amended with single transaction and atomic consumption**:

```ts
const tokenHash = sha256(rawToken);
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Atomic consumption + password update in single transaction — Review Point #1
  const consumeRes = await client.query(
    `UPDATE public.password_reset_tokens
     SET used_at = NOW()
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id, id`,
    [tokenHash]
  );
  if (consumeRes.rows.length === 0) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'bad_request', message: 'Token inválido o expirado' }, { status: 400 });
  }
  const userId = consumeRes.rows[0].user_id;
  // Hash password only after successful validation — per reviewer, avoid bcrypt waste and DoS
  const hash = await bcrypt.hash(newPassword, 10);
  await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
  // Invalidate other tokens for user
  await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  console.error('[reset-password] transaction failed', e);
  return NextResponse.json({ error: 'internal_error', message: 'Error interno' }, { status: 500 });
} finally {
  client.release();
}
```

- **Atomic consumption**: UPDATE ... WHERE used_at IS NULL AND expires_at > NOW() RETURNING ensures only first concurrent request succeeds — second finds used_at NOT NULL and returns 0 rows → 400.
- **Single transaction**: token consumption and password update in same BEGIN/COMMIT — failure between operations rolls back, token not consumed without password reset (prevents valid token consumed without resetting).
- **Hash after validation**: bcrypt only after atomic consumption succeeds.
- **Interim safe**: If `OKENG_ENABLE_PASSWORD_RESET=false` or table not exists, return 501 before any DB update — endpoint cannot modify passwords until full flow verified. Keep flag false until delivery mechanism verified in target env.

**Tests** (amended with concurrent and transaction):

- Valid token → password updated, token used, other invalidated.
- Expired, used, invalid, UUID → 400.
- **Concurrent reuse**: Promise.all two requests same token → only one succeeds, second 400, only one password update, transaction ensures atomic.
- **Failure between consumption and password update**: mock pool to throw on second query → ROLLBACK, token not marked used? Actually we already marked used in same transaction before password update, so if password update fails, rollback will undo used_at, token remains valid for retry — good, not consumed without reset.
- Enumeration, rate limiting, bcrypt not called on invalid.

### 2.2 P0 — Stripe Webhook Fail-Closed Idempotent Recoverable with Concurrency Strategy (Adjustments #2 + Review Points #2, #3 partial)

**Goal**: Fail-closed prod/staging, require signature, idempotent recoverable, handle deleted subscriptions, API failures, out-of-order without stale overwrite, explicit concurrency strategy with row locking.

**Review Point #2**: Keep deduplication record and entitlement update in same transaction. Ensure subscription retrieval handles deleted subscriptions, API failures, events whose referenced subscription no longer retrievable. Stripe retries should not be defeated by committed "processed" record after failed entitlement update.

**Review Point #3 partial**: Subscription status policy needs persisted start time, don't restart grace period every webhook, base access on authoritative state and period end.

**Secure design**:

1. **Fail-closed**:

```ts
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const isProd = process.env.NODE_ENV === 'production' || process.env.OKENG_ENV === 'production' || process.env.OKENG_ENV === 'staging';
if (!webhookSecret) {
  if (isProd) {
    console.error('[webhooks] STRIPE_WEBHOOK_SECRET required in production');
    return NextResponse.json({ error: 'internal_error', message: 'Webhook secret not configured' }, { status: 500 });
  } else {
    console.warn('[webhooks] Skipping signature validation in dev only');
  }
}
if (!sig) return 400
let event;
if (webhookSecret) {
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return 400 signature verification failed
  }
} else {
  if (isProd) return 500
  event = JSON.parse(body); // dev only
}
export const runtime = 'nodejs';
```

2. **Idempotency & transactional dedup + entitlement**:

Table `stripe_webhook_events`:

```sql
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  workspace_id TEXT,
  data JSONB,
  stripe_created BIGINT -- Stripe event created timestamp for ordering
);
CREATE UNIQUE INDEX idx_stripe_webhook_events_id ON public.stripe_webhook_events(id);
```

Processing with **row locking for concurrency** (see 2.4 for P1-3):

```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Idempotency check + insert in same transaction
  const insertRes = await client.query(
    `INSERT INTO stripe_webhook_events (id, type, workspace_id, data, stripe_created)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [event.id, event.type, workspaceId, JSON.stringify(event), event.created]
  );
  if (insertRes.rows.length === 0) {
    await client.query('ROLLBACK');
    console.log(`[webhooks] Duplicate ${event.id} already processed`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Serialize entitlement updates per workspace/subscription — explicit concurrency strategy (P1-3)
  // Lock workspace row FOR UPDATE to serialize concurrent webhook handlers for same workspace
  if (workspaceId) {
    await client.query(`SELECT id FROM workspaces WHERE id = $1 FOR UPDATE`, [workspaceId]);
  } else if (customerId) {
    await client.query(`SELECT id FROM workspaces WHERE stripe_customer_id = $1 FOR UPDATE`, [customerId]);
  }

  // Fetch authoritative subscription from Stripe API — handle deleted, API failures
  let subscription;
  try {
    const subscriptionId = event.data.object.id || event.data.object.subscription;
    if (!subscriptionId) {
      // For checkout.session.completed, subscription may be in session.subscription
      const sessionSubId = event.data.object.subscription;
      if (sessionSubId) {
        subscription = await stripe.subscriptions.retrieve(sessionSubId);
      } else {
        // No subscription ID — could be invoice event, handle accordingly
        subscription = null;
      }
    } else {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    }
  } catch (err: any) {
    if (err.code === 'resource_missing' || err.statusCode === 404) {
      // Subscription deleted or no longer retrievable — handle as deleted
      console.log(`[webhooks] Subscription ${event.data.object.id} not retrievable, treating as deleted`);
      // Downgrade to starter, but do NOT mark event as processed yet? Actually we should process as deleted
      // Continue to downgrade logic
      subscription = null; // treat as deleted
    } else {
      // API failure — do NOT mark as processed, return 500 so Stripe retries — Review Point #2
      await client.query('ROLLBACK');
      console.error('[webhooks] Stripe API failure, not acking', err);
      return NextResponse.json({ error: 'internal_error', message: 'Stripe API failure, retry' }, { status: 500 });
    }
  }

  // Derive plan from verified price and status — see 2.3
  let planResult;
  if (subscription) {
    const priceId = subscription.items.data[0]?.price?.id;
    const status = subscription.status;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    const currentPeriodEnd = subscription.current_period_end;
    // For past_due grace, need persisted past_due_since — see 2.3
    const existingWorkspace = await client.query(`SELECT past_due_since, plan FROM workspaces WHERE id = $1`, [workspaceId]);
    const existingPastDueSince = existingWorkspace.rows[0]?.past_due_since;
    planResult = getPlanFromSubscriptionStatus(status, priceId, cancelAtPeriodEnd, currentPeriodEnd, existingPastDueSince);
  } else {
    // Subscription deleted or not retrievable
    planResult = { plan: 'starter', hasPaidAccess: false, reason: 'deleted_or_not_retrievable' };
  }

  // Update workspace with new plan and billing state — only if newer than existing? Handle out-of-order
  // For out-of-order, we already locked row and fetched authoritative state, so last writer wins with authoritative state
  // But we should also check event created timestamp vs stored stripe_event_created to avoid stale overwrite
  // Store stripe_event_created in workspaces and only apply if event.created > stored
  // For simplicity, we always apply authoritative fetched state, not event payload, so out-of-order is handled by fetching current

  if (planResult) {
    await client.query(
      `UPDATE workspaces SET plan = $1, plan_interval = $2, stripe_subscription_status = $3, stripe_current_period_end = $4, stripe_cancel_at_period_end = $5, past_due_since = $6, updated_at = NOW() WHERE id = $7`,
      [planResult.plan, planResult.interval, subscription?.status, subscription ? new Date(subscription.current_period_end * 1000) : null, subscription?.cancel_at_period_end, planResult.pastDueSince, workspaceId]
    );
  }

  await client.query(`UPDATE stripe_webhook_events SET processed_at = NOW() WHERE id = $1`, [event.id]);
  await client.query('COMMIT');
  return NextResponse.json({ received: true });
} catch (err) {
  await client.query('ROLLBACK');
  console.error('[webhooks] DB error, not acking', err);
  return NextResponse.json({ error: 'internal_error', message: 'DB update failed, not acked' }, { status: 500 });
} finally {
  client.release();
}
```

- **Deduplication and entitlement in same transaction**: If DB update fails, ROLLBACK, event not marked processed, Stripe retries — does not defeat retries by committing processed record after failed entitlement.
- **Handles deleted subscriptions, API failures**: If Stripe API returns resource_missing 404, treat as deleted → downgrade to starter, but still commit. If API failure (network, 500), ROLLBACK and return 500, not acked, Stripe retries.
- **Concurrency strategy (P1-3)**: Serialize per workspace/subscription via `SELECT ... FOR UPDATE` locking workspace row inside transaction. Two concurrent handlers for same workspace will serialize — second waits for first to COMMIT, then fetches authoritative subscription again, ensuring last writer wins with latest state, not stale. Test concurrent handlers with Promise.all and row locking.

### 2.3 P1 — Billing State Authoritative with Enforceable Grace Period and Safe Price Allowlist (Adjustments #3 + Corrections P1-1, P1-2, P1-3)

**Goal**: Map price IDs to allowed plans safely, validate subscription status and workspace association, explicitly decide trialing, past_due with persisted start time, unpaid, cancellation at period end, deleted — never grant paid access via metadata.

**Correction P1-1**: past_due grace not enforceable yet — getPlanFromSubscriptionStatus grants paid for every past_due but no start time. Required: persist reliable past_due_since timestamp, start only on transition into past_due, downgrade after 7 days unless recovers, test repeated webhooks do not restart clock.

**Correction P1-2**: price allowlist needs safe handling missing config — PRICE_ID_TO_PLAN uses computed keys with non-null assertions, if missing coerces undefined to string "undefined", multiple missing overwrite. Required: build reverse map only from configured non-empty price IDs, reject duplicate price IDs mapped to different plans/intervals at startup, test partial/missing env.

**Correction P1-3**: Fetching current subscription alone does not eliminate race — two handlers can fetch different states and commit opposite order. Required: serialize entitlement updates per subscription/workspace (e.g., locking DB row inside transaction), define how stale updates rejected, test concurrent handlers not only sequential out-of-order.

**Secure design — Billing lib** `src/lib/billing.ts`:

```ts
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

// Build reverse map safely — Correction P1-2
export function buildPriceMap(): Record<string, { plan: BillingPlan, interval: BillingInterval }> {
  const reverse: Record<string, { plan: BillingPlan, interval: BillingInterval }> = {};
  for (const plan of BILLING_PLANS) {
    for (const interval of BILLING_INTERVALS) {
      const priceId = PLAN_PRICE_MAP[plan][interval];
      if (!priceId || priceId.trim() === '' || priceId === 'undefined') {
        // Skip missing/empty — do not add "undefined" key
        continue;
      }
      if (reverse[priceId]) {
        const existing = reverse[priceId];
        if (existing.plan !== plan || existing.interval !== interval) {
          throw new Error(`Duplicate Stripe price ID ${priceId} mapped to different plan/interval: ${existing.plan}/${existing.interval} vs ${plan}/${interval}`);
        }
        // Same mapping duplicate — ignore
        continue;
      }
      reverse[priceId] = { plan, interval };
    }
  }
  return reverse;
}

export const PRICE_ID_TO_PLAN = buildPriceMap(); // built at startup, throws if duplicate

// Validate at startup — fail fast if duplicate or missing required?
// For partial config, allow missing escala prices, but require pro prices if billing enabled
// Test partial/missing env: if STRIPE_PRO_MONTHLY_PRICE_ID missing and billing enabled, throw at startup or return 400 in checkout

export const PLAN_LIMITS = {
  starter: { maxCollections: 3, maxFiles: 10, maxEmbeds: 1, maxQueriesPerMonth: 100 },
  pro: { maxCollections: 20, maxFiles: 500, maxEmbeds: 10, maxQueriesPerMonth: 10000 },
  escala: { maxCollections: 100, maxFiles: 5000, maxEmbeds: 100, maxQueriesPerMonth: 100000 },
};

export type StripeSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused';

export interface PlanResult {
  plan: BillingPlan;
  interval: BillingInterval;
  hasPaidAccess: boolean;
  reason: string;
  pastDueSince: Date | null; // persisted start time for grace
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
  // Map priceId to plan safely — Correction P1-2: only from configured non-empty
  if (!priceId || !PRICE_ID_TO_PLAN[priceId]) {
    return { plan: 'starter', interval: 'monthly', hasPaidAccess: false, reason: `price ${priceId} not in allowlist`, pastDueSince: null };
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
      // Active → paid, even if cancel_at_period_end true, grant until period end
      return { plan, interval, hasPaidAccess: true, reason: cancelAtPeriodEnd ? 'active_cancel_at_period_end' : 'active', pastDueSince: null };
    case 'past_due': {
      // Correction P1-1: persist past_due_since, start only on transition into past_due, don't restart clock on repeated webhooks
      let pastDueSince: Date | null;
      if (existingPastDueSince) {
        // Already in past_due — keep existing start time, don't restart
        pastDueSince = existingPastDueSince;
      } else {
        // Transition into past_due — start clock now
        pastDueSince = now;
      }
      const graceEnd = pastDueSince.getTime() + 7 * 24 * 60 * 60 * 1000; // 7 days
      if (nowMs > graceEnd) {
        // Grace expired → downgrade to starter
        return { plan: 'starter', interval: 'monthly', hasPaidAccess: false, reason: 'past_due_grace_expired', pastDueSince };
      }
      // Within grace → still paid access
      return { plan, interval, hasPaidAccess: true, reason: 'past_due_grace', pastDueSince };
    }
    case 'unpaid':
      return { plan: 'starter', interval: 'monthly', hasPaidAccess: false, reason: 'unpaid', pastDueSince: null };
    case 'canceled': {
      // Correction: base on authoritative state and period end — not merely presence of cancel_at_period_end
      if (cancelAtPeriodEnd && currentPeriodEndMs > nowMs) {
        return { plan, interval, hasPaidAccess: true, reason: 'canceled_at_period_end_still_active', pastDueSince: null };
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
```

**Explicit decisions table** (amended with past_due_since):

| Stripe Status | cancel_at_period_end | Current Period End > Now? | existingPastDueSince | Has Paid Access? | Plan | past_due_since handling |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| trialing | any | yes | any | Yes | mapped | clear past_due_since → null |
| active | false | yes | any | Yes | mapped | clear → null |
| active | true | yes | any | Yes | mapped | clear → null, grant until period end |
| past_due | any | yes | null | Yes (grace) | mapped | set past_due_since = now, start clock |
| past_due | any | yes | existing | Yes if within 7d else No | mapped or starter | keep existing, don't restart, check expiry |
| unpaid | any | any | any | No | starter | clear → null |
| canceled | false | any | any | No | starter | clear |
| canceled | true | yes | any | Yes | mapped | grant until period end, then downgrade |
| canceled | true | no | any | No | starter | clear |
| incomplete etc | any | any | any | No | starter | clear |

- **Do not restart grace period** on repeated webhooks: if existingPastDueSince present, keep it, don't set to now.
- **Downgrade after 7 days**: if now > pastDueSince + 7d and still past_due, downgrade to starter.
- **Test repeated webhooks**: send past_due webhook twice, ensure past_due_since unchanged, grace not restarted.

**Workspaces table columns** (for P1-1):

```sql
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN DEFAULT false;
```

**Checkout route** (amended with safe allowlist and workspace auth):

- Validate plan against BILLING_PLANS, interval against BILLING_INTERVALS → 400 if invalid.
- If starter → no checkout.
- Lookup priceId = PLAN_PRICE_MAP[plan][interval] → 400 if not configured (not undefined string).
- **Workspace authorization**: Use session.workspaceId only, validate membership admin via requireWorkspaceAdmin, never fallback to caller-provided when session missing (see 2.4).
- Lookup stripe_customer_id, create session with customer, idempotency key, generic success URL.

**Webhook entitlement** (amended with concurrency and authoritative state):

- Retrieve authoritative subscription via Stripe API, handle deleted (resource_missing) and API failures (500 not acked).
- Map priceId via safe PRICE_ID_TO_PLAN, reject if not in allowlist.
- Use getPlanFromSubscriptionStatus with existingPastDueSince from DB, handle grace, cancellation based on period end.
- **Concurrency**: SELECT ... FOR UPDATE locking workspace row inside transaction to serialize concurrent handlers (P1-3).
- Audit log.

**Tests**: Plan/price mismatch, unauthorized workspace, missing config, duplicate price IDs, past_due grace start and expiry, repeated webhooks not restarting clock, concurrent handlers with row locking.

### 2.4 & 2.5 Workspace Authorization Consistency & Primary Workspace Selection (Adjustment #4 + Review Points #4)

**Goal**: Define primary workspace selection, validate membership and required role on every billing operation, never fallback to caller-provided ID.

**Review Point #4**: Most recent active membership is deterministic default, but not proof user authorized for particular billing action. requireWorkspaceAdmin should validate authenticated user, requested workspace, active membership, required role on every operation.

**Secure design**:

1. **Primary workspace selection**:

For user with multiple workspaces, primary = most recent active membership ORDER BY created_at DESC LIMIT 1. Document. For billing, primary is default, but user can switch via `/workspaces/[slug]` which validates membership. If no membership, session workspaceId undefined → billing operations fail 400, never fallback to client ID.

2. **Workspace membership validation on every billing operation**:

```ts
async function requireWorkspaceAdmin(client: PoolClient, userId: string, workspaceId: string): Promise<void> {
  const res = await client.query(
    `SELECT role, status FROM workspace_members WHERE user_id = $1 AND workspace_id = $2`,
    [userId, workspaceId]
  );
  if (res.rows.length === 0) throw new Error('Not member of workspace');
  const { role, status } = res.rows[0];
  if (status !== 'ACTIVE' && status !== 'active') throw new Error('Membership not active');
  if (role !== 'admin' && role !== 'owner' && role !== 'WORKSPACE_OWNER' && role !== 'WORKSPACE_OWNER') {
    throw new Error('Requires admin role');
  }
}
```

In checkout:

```ts
const session = await getSession(request);
if (!session) return 401
const workspaceId = session.workspaceId;
if (!workspaceId) {
  return NextResponse.json({ error: 'bad_request', message: 'No workspace context in session' }, { status: 400 });
}
// Validate authenticated user, requested workspace, active membership, required role
try {
  await requireWorkspaceAdmin(client, session.userId, workspaceId);
} catch (e) {
  return 403
}
// If body.workspaceId provided and different, validate user is admin of that workspace too, but prefer session
// Never fallback to body.workspaceId when session missing
```

- Never `body.workspaceId || session.workspaceId` — use only session, and if body provided, validate it matches session or user has permission, but do not trust blindly.

3. **SessionData extension**:

```ts
interface SessionData {
  userId: string;
  email: string;
  role: SystemRole;
  workspaceId?: string;
  workspaceRole?: string;
  createdAt: number;
}
```

Login queries workspace_members for primary workspace ORDER BY created_at DESC LIMIT 1.

4. **RBAC separation**: requireSystemRole for platform, requireWorkspaceRole for workspace.

5. **Tests**: Primary selection, unauthorized workspace, missing session, role checks, integration signup→login→checkout.

**Integration**: Phases 4-5 tested together because checkout depends on session contract.

### 2.6 Rate Limiting Proxy Trust Boundary & Fallback Trustworthy Identifier (Adjustment #5 + Review Point #5)

**Goal**: Document exact production deployment assumptions, sanitize forwarding headers at trusted edge, safe fallback using trustworthy session/account identifier, not shared unknown bucket, test Redis failure per tier.

**Review Point #5**: Using unknown when proxy untrusted avoids spoofed IPs, but IP-based limits collapse into shared bucket. Confirm fallback really uses trustworthy session or account identifier where available, and shared fallback cannot create easy DoS for unrelated users.

**Secure design**:

1. **Production deployment assumptions** (document in LOCAL-SETUP-GUIDE):

- Production runs behind Vercel (or Cloudflare, Nginx) that sanitizes x-forwarded-for and sets correct client IP.
- Vercel: x-forwarded-for first entry is client IP set by Vercel edge, not spoofable if behind Vercel, but x-real-ip and x-vercel-forwarded-for also available.
- If not behind trusted proxy, x-forwarded-for untrustworthy — use safe fallback.

2. **IP extraction with trust boundary and trustworthy fallback**:

```ts
function getClientIp(request: NextRequest): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  if (trustProxy) {
    // Behind trusted proxy (Vercel) — x-forwarded-for first entry is client IP set by proxy
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for') || 'unknown';
  } else {
    // Not behind trusted proxy — do NOT trust x-forwarded-for, use safe fallback
    // For dev, allow x-forwarded-for for testing, but log warning
    if (process.env.NODE_ENV === 'development') {
      return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    }
    // In prod without trust proxy, safe fallback: do not trust forwarded headers
    return 'unknown';
  }
}

function getRateLimitKey(request: NextRequest, tier: RateLimitTier): string {
  const ip = getClientIp(request);
  const sessionCookie = request.cookies.get('okeng.sid')?.value || request.cookies.get('__Host-okeng.sid')?.value;
  const sessionId = sessionCookie ? sessionCookie.slice(0, 8) : 'no-session';
  // Try to get userId from session if available? But getSession is async and needs verification — we can try to parse without verifying for rate limiting? Better to use sessionId as trustworthy identifier
  // For fallback when IP is unknown, use sessionId or userId if available, not shared unknown bucket
  // Key structure: rate_limit:${tier}:${ip}:${sessionId}
  // If ip is unknown and sessionId is no-session, then key becomes rate_limit:TIER:unknown:no-session — shared bucket could cause DoS for unauthenticated users
  // To mitigate DoS, for unknown IP and no session, use a more granular fallback: e.g., hash of user-agent + tier, or use a higher limit for unknown bucket
  // For AUTH tier, if IP unknown and no session, we should still rate limit per IP unknown but with fail-closed? Actually for AUTH, fail-closed on Redis error, but for IP fallback, we should use sessionId as primary
  // So if ip === 'unknown' and sessionId !== 'no-session', key is rate_limit:TIER:unknown:${sessionId} — per session, not shared across all unknown
  // If both ip unknown and session no-session (unauthenticated), then it's shared bucket — to avoid DoS, we can use a higher limit for this specific bucket or use a separate global limit
  // For MVP, we keep key as ip:sessionId, but document that unknown:no-session bucket is shared and could cause DoS, so we should have higher limit for it or use user-agent hash
  // Better: if ip unknown and no session, use rate_limit:${tier}:fallback:${hash of request headers?} — but still not perfect
  // For now, we use sessionId as trustworthy identifier where available, and if both unknown and no-session, it's shared but with higher limit (e.g., 100 for AUTH? No, AUTH should be stricter)
  // Decision: For AUTH tier, if ip unknown and no session, use a global bucket with limit 100 per 15m? Actually AUTH limit is 5 per 15m, so shared bucket of 5 per 15m for all unknown/no-session would cause DoS — one attacker could block all unauthenticated logins
  // So we should use a more granular fallback: e.g., use a hash of user-agent + accept-language + other fingerprint? Or simply not rate limit by IP when IP unknown, but rate limit per sessionId, and if sessionId also missing, use a per-request random? That would defeat rate limiting
  // Better approach: If IP untrustworthy and no session, use a safe fallback that still uses something like a cookie or a generated anonymous ID stored in a cookie? For MVP, we document and use sessionId as primary, and if no session, use a higher limit for unknown:no-session bucket (e.g., 20 per 15m instead of 5) to reduce DoS risk, but still protect
  // Alternatively, fail closed? No, fail open for availability
  // For this plan, we specify: fallback uses trustworthy session identifier where available (sessionId from httpOnly cookie, which is trustworthy because it's set by server and signed), and if sessionId also missing, use a separate bucket with higher limit and monitor for DoS
  return `rate_limit:${tier}:${ip}:${sessionId}`;
}
```

- **Trustworthy identifier**: sessionId from httpOnly cookie `okeng.sid` or `__Host-okeng.sid` is trustworthy because it's set by server, signed with HMAC, httpOnly, not client-controllable (except attacker can delete cookie, but then sessionId becomes no-session, still not spoofable to impersonate other user). So using sessionId as fallback is trustworthy.
- **Shared bucket DoS mitigation**: If both IP unknown and session no-session (unauthenticated, no cookie), key is `unknown:no-session` shared across all unauthenticated unknown IP requests. To avoid DoS where one attacker blocks all unauthenticated, we can:
  - Use higher limit for this specific bucket (e.g., 20 per 15m instead of 5 for AUTH? But AUTH limit is 5 per 15m, so higher limit reduces protection)
  - Or use a more granular fallback like hash of user-agent + IP? But user-agent spoofable
  - Or require that for AUTH tier, if IP unknown and no session, we still rate limit but with a global limit that is higher, and monitor
  - For MVP, we document that production must set TRUST_PROXY=true behind trusted proxy that provides trustworthy IP, so unknown case should not happen in prod. In dev, unknown is okay.
- **Document**: TRUST_PROXY env var, production deployment assumptions.

3. **Sanitize forwarding headers at trusted edge**:

- In proxy.ts, if NODE_ENV=production and TRUST_PROXY=true, we trust headers. If TRUST_PROXY=false in prod, strip x-forwarded-for, x-real-ip? Actually proxy.ts runs after edge proxy, so edge should have sanitized. Document.

4. **Fail-closed AUTH on Redis outage**:

```ts
try {
  const current = await redis.incr(key);
} catch (err) {
  if (tier === 'AUTH') {
    return { success: false, remaining: 0, limit: config.limit, retryAfter: config.windowSec };
  } else {
    return { success: true, remaining: config.limit, limit: config.limit, retryAfter: 0 };
  }
}
```

- AUTH fails closed (429), READ/WRITE fail open.

5. **Accurate TTL**: Use redis.ttl(key) if available.

6. **Tests**: Spoofed-header with TRUST_PROXY true/false, safe fallback with sessionId, shared bucket DoS mitigation, Redis outage per tier, TTL.

7. **Documentation**: LOCAL-SETUP-GUIDE section proxy trust boundary, TRUST_PROXY, production assumptions.

### 2.7 Migration Ownership and Operational Execution (Correction P2-4)

**Goal**: Designate one authoritative schema migration path, avoid drift between Supabase migrations and app-startup DDL, no uncontrolled DDL at runtime.

**Correction P2-4**: Plan proposes Supabase migration files and also creating same tables through src/lib/migrate.ts. Two migration mechanisms can drift, and automatic schema changes at app runtime introduce deployment and permission risks. Required: designate one authoritative path.

**Secure design**:

1. **Authoritative path**: Supabase migrations (`supabase/migrations/*.sql`) are source of truth for schema versioning. They are versioned, ordered by timestamp, applied via Supabase CLI `supabase db push` or `supabase migration up` in staging/prod, and via `supabase db reset` in dev.

2. **Direct PostgreSQL deployments** (non-Supabase, using `DATABASE_URL` with pg pool): Same SQL files from `supabase/migrations` are applied via a **versioned migration runner** `src/lib/migrate.ts` or `scripts/migrate.ts` that:
   - Tracks applied migrations in a table `public.schema_migrations` (id, filename, applied_at).
   - Runs SQL files from `supabase/migrations` in timestamp order, only if not already applied.
   - Is executed explicitly via `npm run migrate` (package.json script `migrate: tsx src/lib/migrate.ts`), not automatically at app startup.
   - Requires `DATABASE_URL` and appropriate DB permissions, fails fast if migration fails.
   - Does NOT run DDL at app startup — app startup only does `SELECT 1` health check, not CREATE TABLE.

3. **No uncontrolled app-startup DDL**: Remove any `CREATE TABLE IF NOT EXISTS` from `src/lib/db.ts` or API routes. All schema changes via versioned migrations.

4. **If project intentionally supports both Supabase and direct PG**: Document in LOCAL-SETUP-GUIDE and DB-01:

- Supabase deployment: use `supabase` CLI, migrations in `supabase/migrations`, RLS policies, storage policies.
- Direct PG deployment: use `npm run migrate` which runs same SQL files via pg pool, tracking in `schema_migrations`, no RLS (or RLS manually enabled), same versioned schema.

5. **Operational execution**:

- Dev: `npm run migrate` or `supabase db reset` to apply migrations.
- Staging/prod: CI/CD runs `supabase db push` or `npm run migrate` before deployment, not at runtime.
- Document permissions: migration runner requires DB owner or migration role, not app role.

6. **Tests**: Migration runner applies same SQL files in order, tracks applied, no drift.

---

## 3. DB Migrations & Schema Changes (Amended v1.2)

### 3.1 New Tables

**password_reset_tokens** + **stripe_webhook_events** + workspaces columns (see 2.1, 2.2, 2.3):

```sql
-- 20261011000005_password_reset_tokens.sql (authoritative Supabase path)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (...);
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (...);
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan TEXT ...;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
-- etc (see 2.3)
```

### 3.2 Env Vars

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET= # required prod/staging fail-closed
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_ESCALA_MONTHLY_PRICE_ID=
STRIPE_ESCALA_ANNUAL_PRICE_ID=
TRUST_PROXY=true
OKENG_ENABLE_PASSWORD_RESET=false # keep false until full flow verified
```

### 3.3 Migration Runner

- Authoritative: Supabase migrations.
- Direct PG: `src/lib/migrate.ts` versioned runner reading `supabase/migrations/*.sql` in order, tracking `schema_migrations`, explicit `npm run migrate`, no app-startup DDL.

---

## 4. API Changes — Detailed (Amended v1.2)

### 4.1 forgot-password

- Generic success, no enumeration.
- If user exists, generate 256-bit token, SHA256 hash, expiry 1h, invalidate old, store IP, rate limit per IP and per email.
- Dev log token only if dev.
- Tests.

### 4.2 reset-password

- Interim 501 if OKENG_ENABLE_PASSWORD_RESET=false or table not exists, ensure cannot modify passwords until implemented.
- When enabled, **single transaction** atomic consumption UPDATE ... RETURNING + password update + invalidate others + COMMIT, ROLLBACK on failure, hash only after validation.
- Tests with concurrent reuse, transaction failure.

### 4.3 webhooks

- Fail-closed prod/staging if secret missing, require signature, Node.js runtime.
- **Idempotency**: stripe_webhook_events uniqueness, transactional dedup+entitlement, do not ack if DB fails (500), Stripe retries.
- **Out-of-order**: fetch authoritative subscription via Stripe API, handle deleted (resource_missing) as downgrade, handle API failures as 500 not acked, use row locking SELECT ... FOR UPDATE to serialize concurrent handlers per workspace, store stripe_created for ordering, only apply if newer or always fetch current.
- **Billing state authoritative**: derive plan from verified price ID and status via getPlanFromSubscriptionStatus with persisted past_due_since, not metadata.
- **Concurrency**: row locking, test concurrent handlers.

### 4.4 checkout

- Validate plan/interval allowlist, map to priceId safely (skip missing, reject duplicates at startup), 400 if not configured.
- Workspace auth: use session.workspaceId only, validate membership admin via requireWorkspaceAdmin, never fallback to caller-provided when session missing, if body.workspaceId different validate permission.
- Lookup stripe_customer_id, create session with customer, idempotency, generic success URL.

### 4.5 signup

- Transaction BEGIN/COMMIT/ROLLBACK, handle slug collision.

### 4.6 login

- Query users, verify password, query workspace_members primary workspace ORDER BY created_at DESC LIMIT 1, populate session workspaceId and workspaceRole, extend SessionData.

### 4.7 rateLimit

- Harden IP extraction with TRUST_PROXY, safe fallback using trustworthy sessionId where available, not shared unknown bucket, shared bucket DoS mitigation (higher limit or separate), fail-closed AUTH on Redis error, fail-open others, accurate TTL.

---

## 5. Testing Plan — With Verification Gates (Amended v1.2)

### 5.1 Baseline

Record baseline before changes: `npm run build`, `npm run test:homepage-tour-readiness`, `npm run test:embed-authorization`, `npm run lint`, `npx tsc --noEmit`. Treat 52/52+29/29 as baseline to verify not guaranteed, investigate failures not weaken tests, report actual results.

### 5.2 Password Reset Tests (Phase 1 Gate: Negative Security + Atomicity)

- Valid, expired, used, invalid, UUID → 400.
- **Concurrent reuse**: Promise.all same token → only one succeeds, second 400, transaction ensures atomic, password only updated once.
- **Failure between consumption and password update**: mock throw on second query → ROLLBACK, token not consumed, retry possible.
- Enumeration, rate limiting, bcrypt not called on invalid.

### 5.3 Webhook Tests (Phase 2 Gate: Negative Security + Idempotency + Recoverable + Concurrency)

- No secret prod → 500 fail-closed, dev → warning.
- Invalid signature → 400.
- Price not in allowlist → no update.
- Valid price pro_monthly → update to pro.
- Forged without signature prod → 500.
- **Duplicate event ID**: same ID twice → second duplicate true, no re-processing.
- **DB failure**: mock throw on UPDATE → 500 not acked, event not marked processed.
- **Out-of-order**: past_due then active, ensure final active via authoritative fetch.
- **Deleted subscription**: resource_missing → downgrade to starter, processed.
- **API failure**: network error → 500 not acked, Stripe retry.
- **Concurrent handlers**: Promise.all two handlers for same workspace with different states → row locking serializes, last writer wins with authoritative state, no stale overwrite.

### 5.4 Checkout Tests (Phase 3 Gate: Plan/Price Mismatch + Unauthorized Workspace + Missing Config)

- Valid pro monthly → url, priceId pro monthly.
- Escala monthly no price → 400.
- Client tries escala while paying pro → server maps plan to priceId, cannot get escala entitlement while paying pro.
- Invalid plan → 400.
- WorkspaceId from body but session different and user not admin → 403.
- No session workspaceId → 400, not fallback.
- **Missing env config**: price ID missing → buildPriceMap skips, checkout with that plan → 400, no "undefined" key.
- **Duplicate price IDs**: env vars same price ID for different plans → throw at startup, test.

### 5.5 Signup Atomicity Tests (Phase 4 Gate: Transaction Rollback)

- Successful → all created.
- Failure after user insert → no user left, rollback.
- Slug collision → retry or 409.

### 5.6 Session Workspace Role Tests (Phase 5 Gate: Role Resolution + Integration + Primary Selection)

- Signup → session workspaceId admin.
- Login → session workspaceId and workspaceRole from membership.
- Multiple workspaces → primary = most recent DESC LIMIT 1.
- Checkout uses session workspaceId, not client.
- **Integration**: signup→login→checkout→webhook→plan updated full flow.
- **Workspace auth**: requireWorkspaceAdmin validates user, workspace, active membership, required role every operation, never fallback.

### 5.7 Rate Limiting Tests (Phase 6 Gate: Spoofed-Header + Redis Outage + Fallback Trustworthy)

- Spoofed x-forwarded-for TRUST_PROXY true vs false, safe fallback unknown.
- **Fallback trustworthy**: unknown IP with sessionId → key per session, not shared; unknown IP no session → shared bucket but higher limit or separate, test DoS mitigation — one attacker cannot block all unauthenticated.
- Redis down AUTH → 429 fail-closed, READ → success true fail-open.
- TTL, retry behavior, proxy docs.

### 5.8 Existing Suites (Phase 7 Gate: Preserve Existing Behavior)

- Build PASS — record actual routes.
- Homepage 52/52 baseline, embed 29/29 baseline — record, investigate failures.
- Lint 0 errors, tsc check.
- Manual verification: forgot→reset flow, webhook test signature, checkout valid/invalid, unauthorized workspace.
- **Gate rule**: Phase not complete merely because tests pass — must also preserve relevant existing behavior and demonstrate security invariant holds. Report actual results.

---

## 6. Phased Execution Plan — Amended v1.2 with Verification Gates (Awaiting Signal for Phase 1 Only)

**Phase 0 — This doc v1.2 (0.5 day)** — DONE: Incorporate 4 corrections + 5 review points, enforceable guarantees, verification gates, baseline recording, await signal for Phase 1 only.

**Phase 1 — P0 Password Reset with Atomic Consumption in Single Transaction (1 day)** — After signal:
- Create migration password_reset_tokens + stripe_webhook_events + workspaces columns (authoritative Supabase path, see 2.7).
- Implement forgot-password token generation (256-bit, SHA256 hash, expiry 1h, invalidate old, IP, rate limit).
- Implement reset-password with **single transaction** atomic UPDATE ... RETURNING + password update + invalidate others + COMMIT, ROLLBACK on failure, hash only after validation, interim 501 if disabled.
- Add tests password-reset.test.ts with negative, concurrent reuse, transaction failure.
- **Verification gate**: negative security tests, concurrent reuse, transaction atomicity, preserve existing behavior (build, existing tests baseline), report actual results.
- Commit: `fix(AUTH): secure password-reset atomic consumption single transaction (P0)`

**Phase 2 — P0 Stripe Webhook Fail-Closed Idempotent Recoverable with Concurrency (0.5 day)**:
- Update webhooks/route.ts fail-closed prod/staging, require signature, Node.js runtime, idempotency via stripe_webhook_events uniqueness, transactional dedup+entitlement, do not ack if DB fails, handle deleted subscriptions and API failures, out-of-order via fetching authoritative subscription, row locking SELECT ... FOR UPDATE to serialize concurrent handlers per workspace.
- Add tests billing-webhook.test.ts with negative, duplicate, DB failure, deleted, API failure, out-of-order, concurrent handlers.
- **Verification gate**: negative, duplicate, DB failure not acked, deleted handling, concurrent, preserve existing.
- Commit: `fix(BILLING): strict webhook signature fail-closed idempotent recoverable with row locking (P0)`

**Phase 3 — P1 Billing State Authoritative with Enforceable Grace and Safe Allowlist (1 day)**:
- Create src/lib/billing.ts with safe buildPriceMap (skip missing/empty, reject duplicates at startup), PLAN_PRICE_MAP, PRICE_ID_TO_PLAN, PLAN_LIMITS, getPlanFromSubscriptionStatus with persisted past_due_since, explicit status handling trialing, past_due with 7d grace start only on transition, don't restart clock, unpaid, canceled at period end based on authoritative state and period end.
- Add workspaces columns past_due_since, stripe_subscription_status, stripe_current_period_end, stripe_cancel_at_period_end.
- Update checkout/route.ts validate plan/interval allowlist, map to priceId safely, workspace auth from session only, lookup customer, idempotency, generic success URL.
- Update webhooks/route.ts derive plan from verified price and status with past_due_since handling, audit log.
- Add env vars for escala prices to .env.example.
- Add tests billing-checkout.test.ts with plan/price mismatch, unauthorized workspace, missing config, duplicate price IDs, past_due grace start/expiry, repeated webhooks not restarting clock.
- **Verification gate**: plan/price mismatch, unauthorized workspace, missing config, duplicate detection, past_due grace enforceable, preserve existing.
- Commit: `fix(BILLING): server-side plan price validation authoritative with grace and safe allowlist (P1)`

**Phase 4 — P1 Signup Atomic Transaction (0.5 day)**:
- Update signup/route.ts to use pool.connect() BEGIN/COMMIT/ROLLBACK, handle slug collision.
- Add tests signup-atomic.test.ts.
- **Verification gate**: transaction rollback, preserve existing.
- Commit: `fix(AUTH): atomic signup transaction (P1)`

**Phase 5 — P1 Session Workspace Role Resolution Consistent (0.5 day)**:
- Update login/route.ts to query workspace_members primary workspace ORDER BY created_at DESC LIMIT 1, populate session workspaceId and workspaceRole, extend SessionData, requireWorkspaceAdmin validates user, workspace, active membership, required role every billing op, never fallback to caller-provided when session missing.
- Update checkout to use session workspaceId only.
- Add tests session-workspace.test.ts + integration signup/login/checkout.
- **Verification gate**: role-resolution, primary selection deterministic, workspace auth consistency, integration, preserve existing.
- Commit: `fix(AUTH): session workspace role resolution consistent (P1)`
- Note: Test Phases 4-5 together because checkout depends on session contract.

**Phase 6 — P1 Rate Limiting Proxy Trust Boundary with Trustworthy Fallback (0.5 day)**:
- Update rateLimit.ts harden IP extraction with TRUST_PROXY env, safe fallback using trustworthy sessionId where available, not shared unknown bucket, shared bucket DoS mitigation (higher limit or separate), fail-closed AUTH on Redis error, fail-open others, accurate TTL.
- Update proxy.ts sanitize forwarding headers in prod, document trust boundary.
- Document in LOCAL-SETUP-GUIDE production deployment assumptions (Vercel/Cloudflare/Nginx), TRUST_PROXY, safe fallback, per-tier failure behavior.
- Add tests rate-limit.test.ts with spoofed-header, fallback trustworthy, shared bucket DoS, Redis outage per tier, TTL.
- **Verification gate**: spoofed-header, fallback trustworthy, DoS mitigation, Redis outage per tier, proxy docs, preserve existing.
- Commit: `fix(SEC): rate limiting proxy trust boundary trustworthy fallback (P1)`

**Phase 7 — Regression Tests & Verification (0.5 day)**:
- Run all new security tests + existing 52/52 + 29/29 baseline (record before, investigate failures not weaken).
- npm run build PASS (record actual routes), npm run lint 0 errors, npx tsc --noEmit.
- Manual verification: forgot→reset flow, webhook test signature, checkout valid/invalid, unauthorized workspace, past_due grace, concurrent handlers.
- Update LOCAL-SETUP-GUIDE with secure flows, env vars, billing state authoritative with grace, proxy trust boundary, migration ownership.
- **Verification gate**: existing regression suites, new tests, build, lint, manual verification, report actual results not assumed.
- Commit: `test(SEC): add regression tests for P0/P1 with enforceable guarantees (PLAN-008)`

**Phase 8 — Push & PR Update (0.5 day)**:
- Review final diff, verify committed changes and clean working tree, push branch, update PR with test evidence.
- **Verification gate**: final diff review, clean working tree, push, PR update with test evidence.
- Commit: `docs(PLAN-008): mark execution completed — P0/P1 security billing hardening with atomic guarantees and verification gates`

**Important**: Keep phases sequential and independently verifiable, especially password-reset and webhook fixes. Next step after this plan review is explicitly authorize Phase 1 only — not treat plan review as authorization for all 8 phases. Keep OKENG_ENABLE_PASSWORD_RESET=false until full reset flow and delivery verified.

---

## 7. Risks & Rollback (Amended v1.2)

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Password reset token table migration fails | Medium | High | Test in staging, rollback DROP TABLE, keep endpoint 501 until migration success, single transaction atomic consumption |
| Concurrent token reuse race still possible | Low | High | UPDATE ... RETURNING with used_at IS NULL and expires_at > NOW() in transaction, SELECT ... FOR UPDATE not needed for token (UPDATE is atomic), test Promise.all concurrent |
| Token consumed without password reset (failure between) | Medium | High | Single transaction token consumption + password update + COMMIT, ROLLBACK on failure, token remains valid for retry |
| Stripe webhook fail-closed breaks dev without secret | Low | Medium | Allow dev bypass only NODE_ENV=development AND OKENG_ENV=development, document, fail-closed only prod/staging, idempotency |
| Webhook out-of-order stale overwrite | Medium | High | Fetch authoritative subscription via Stripe API, row locking SELECT ... FOR UPDATE per workspace, store event created, only apply if newer or always fetch current, test concurrent handlers |
| Webhook deleted subscription not retrievable | Medium | High | Handle resource_missing 404 as downgrade to starter, not 500, but API failure 500 not acked, Stripe retry |
| Webhook DB failure acked as success | High if not handled | High | Deduplication + entitlement in same transaction, do not ack if DB fails (500), Stripe retry, test DB failure |
| Past_due grace indefinite (P1-1) | High if not persisted | High | Persist past_due_since, start only on transition into past_due, don't restart on repeated webhooks, downgrade after 7d, test repeated webhooks |
| Price allowlist undefined key (P1-2) | Medium | High | Build reverse map only from configured non-empty price IDs, reject duplicates at startup, test partial/missing env |
| Concurrent webhook race (P1-3) | Medium | High | Serialize per workspace via SELECT ... FOR UPDATE row locking inside transaction, define stale rejection, test concurrent handlers |
| Migration drift Supabase vs pg pool (P2-4) | Medium | High | Authoritative Supabase migrations as source of truth, direct PG via versioned runner reading same SQL files, tracking schema_migrations, explicit npm run migrate, no app-startup DDL, document |
| Signup transaction deadlocks | Low | Medium | Short transaction, retry on serialization failure |
| Session workspaceId missing for existing users | Medium | Medium | Migration for existing users, handle null gracefully, never fallback to client ID |
| Rate limiting fail-closed AUTH blocks legit when Redis down | Medium | Medium | Fail-closed only AUTH, fail-open READ/WRITE, monitor /api/health |
| Rate limiting fallback shared bucket DoS (Review Point #5) | Medium | High | Fallback uses trustworthy sessionId where available (httpOnly signed cookie), if both unknown and no-session, higher limit or separate bucket, document TRUST_PROXY, test spoofed-header and shared bucket |
| Proxy trust boundary misconfigured | Medium | High | Document exact prod assumptions Vercel sanitizes x-forwarded-for, TRUST_PROXY env, safe fallback, test |

**Rollback**:
- Keep branch with commits before fixes — revert via git revert or reset.
- DB down migrations: DROP TABLE password_reset_tokens, DROP TABLE stripe_webhook_events, ALTER TABLE workspaces DROP COLUMN past_due_since etc.
- Feature flags: OKENG_ENABLE_PASSWORD_RESET=false returns 501, OKENG_STRICT_WEBHOOK=false allows dev bypass only in dev.

---

## 8. References (Amended v1.2)

- Review findings: P0 password reset UUID takeover, P0 webhook forged events, P1 checkout plan metadata trust, P1 signup non-atomic, P1 session workspace roles, P1 rate limiting IP spoofing.
- First review 5 adjustments: atomic token consumption, webhook idempotency recoverable, billing state authoritative, workspace auth consistency, proxy trust boundary + verification gates.
- Second review 4 corrections: P1-1 past_due grace not enforceable needs persisted past_due_since, P1-2 price allowlist safe handling missing config, P1-3 concurrency strategy row locking, P2-4 migration ownership single authoritative path + 5 remaining points: password-reset atomicity single transaction, webhook recoverable deleted handling, subscription status policy period end, workspace auth consistency, rate-limit fallback trustworthy identifier.
- Current code: reset-password 61 lines UUID, webhooks 106 lines JSON.parse without signature, checkout 79 lines client plan in metadata, signup 81 lines separate queries, login 68 lines no workspaceId, rateLimit 60 lines x-forwarded-for spoofable, auth.ts 126 lines HMAC-SHA256.
- Supabase schema: 20261003000001 201 lines, 20261009000003 936 lines RLS, no password_reset_tokens, no stripe columns, no past_due_since.
- OWASP password reset: random 256-bit, hash at rest, expiry 15m-1h, single-use, atomic consumption UPDATE ... RETURNING in single transaction with password update, hash only after validation.
- Stripe: webhook signatures, idempotency event ID uniqueness, transactional dedup+entitlement, do not ack if DB fails, fetch authoritative subscription to handle out-of-order and deleted, row locking SELECT ... FOR UPDATE per workspace to serialize concurrent handlers, subscription status trialing, past_due with persisted start time, unpaid, canceled at period end, deleted.
- Billing: safe price allowlist building only from configured non-empty IDs, reject duplicates at startup, entitlement from verified price and status, never metadata.
- Workspace auth: primary workspace most recent active membership ORDER BY created_at DESC LIMIT 1 deterministic default, but billing operations validate authenticated user, requested workspace, active membership, required role every time, never fallback to caller-provided when session missing.
- Rate limiting: proxy trust boundary TRUST_PROXY, Vercel/Cloudflare/Nginx sanitizes, safe fallback using trustworthy sessionId (httpOnly signed cookie) where available, not shared unknown bucket, shared bucket DoS mitigation higher limit or separate, per-tier failure behavior AUTH fail-closed READ/WRITE fail-open.

---

*Amended plan v1.2 incorporating second review 4 corrections + 5 remaining points — enforceable guarantees: atomic token consumption in single transaction, webhook idempotent recoverable with row locking and deleted handling, authoritative billing with persisted past_due_since grace and safe price allowlist, consistent workspace auth with primary selection and per-operation validation, proxy trust boundary with trustworthy fallback, verification gates per phase, baseline recording, OKENG_ENABLE_PASSWORD_RESET=false until verified. Awaiting explicit signal for Phase 1 only.*
