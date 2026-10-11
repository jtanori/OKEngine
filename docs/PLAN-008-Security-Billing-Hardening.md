# PLAN-008 — Security & Billing Hardening: Resolution Plan for P0/P1 Review Findings (Amended v1.4)

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-008` |
| **Status** | `DRAFT v1.4 — AMENDED PER FINAL REVIEW 2 REFINEMENTS — AWAITING SIGNAL FOR PHASE 1 ONLY` |
| **Owner** | Engineering & Security |
| **Authority** | Blocking — P0 Security, P1 Billing & Auth |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `STG-01`, `AUTH-01..03`, `PLAN-007`, `LOCAL-SETUP-GUIDE v2.0`, `00_product_contract` |
| **Revision** | `1.4 (2026-10-11)` — Incorporates final review 2 refinements: validate both association paths before returning (customer lookup and subscription lookup must agree, fail safe if different workspaces, retrieve authoritative subscription and verify ID/customer/persisted association), make unresolved events recoverable (do not silently mark processed and discard, either leave retryable 500 or persist in durable observable reconciliation path with status unresolved) + preserves v1.3 corrections: scoped Phase 1 migration to password reset only, never use untrusted metadata to select workspace, fail safe if missing/contradictory, resource_missing only after confirming association + v1.2 improvements: persisted past_due_since, safe price map, row locking concurrency, authoritative migration path, single transaction atomicity, idempotent recoverable webhook, authoritative billing status, consistent workspace auth, trustworthy rate-limit fallback |
| **Review Source** | User P0/P1 review + first review 5 adjustments + second review 4 corrections + 5 remaining points + final review 2 corrections (scoped Phase 1, never use untrusted metadata) + final review 2 refinements (validate both association paths, make unresolved events recoverable) |
| **Original Findings** | P0 password reset UUID takeover, P0 webhook forged events when secret absent, P1 checkout plan metadata trust, P1 signup non-atomic, P1 session workspace roles missing, P1 rate limiting IP spoofing |

---

## 0. Goal & Merge Gate (Amended v1.4)

Fix exploitable security, tenant isolation, billing entitlement, auth flows before merging PR #1. **Key principles**: security guarantees enforceable in code not just documented; passing test suite necessary but not sufficient — each phase must demonstrate security invariant holds and existing behavior intact. **Execution boundary**: review plan now; authorize Phase 1 separately; do not begin Phase 2+ without further approval.

**Merge gate**:
- [ ] Secure password-reset token generation, verification, expiry, single-use enforcement with atomic consumption in single transaction, concurrent reuse prevention, scoped migration Phase 1 only (P0)
- [ ] Strict Stripe webhook signature verification fail-closed staging/prod, idempotent & recoverable with event ID uniqueness, transactional dedup+entitlement, handles deleted subscriptions & API failures, out-of-order without stale overwrite, explicit concurrency strategy with row locking, never use untrusted metadata to select workspace — resolve via verified persisted customer/subscription association, **validate both association paths before returning** (customer and subscription lookups must agree, fail safe if different workspaces), **make unresolved events recoverable** (not silently marked processed and discarded, either retryable 500 or durable observable reconciliation path) (P0)
- [ ] Server-side plan and price validation with entitlement from verified Stripe price and authoritative subscription status (trialing, past_due with persisted past_due_since grace, unpaid, canceled at period end, deleted) — never metadata or unverified checkout (P1)
- [ ] Atomic signup transaction + consistent workspace auth — primary workspace deterministic (most recent active membership) but billing operations validate authenticated user, requested workspace, active membership, required role every time, never fallback to caller-provided ID when session missing (P1)
- [ ] Rate limiting hardened with explicit proxy trust boundary, TRUST_PROXY, safe fallback using trustworthy session/account identifier not shared unknown bucket, fail-closed AUTH on Redis outage, fail-open others (P1)
- [ ] Regression tests with negative tests, concurrent handlers, transaction rollback, integration, spoofed-header, Redis outage per tier, TTL
- [ ] Production build, lint, existing suites — baseline 52/52+29/29 recorded before changes, treated as baseline to verify not guaranteed, investigate failures not weaken tests, report actual results

**Scope note**: Code-inspection response, includes runtime verification. Keep `OKENG_ENABLE_PASSWORD_RESET=false` until full reset flow and delivery verified. Plan preserves right execution boundary: review plan now; authorize Phase 1 separately; do not begin Phase 2+ without further approval.

**Reviewer notes on v1.3**: v1.3 properly scoped Phase 1 to password_reset_tokens and explicitly disallowed metadata as authority for entitlement changes, preserves transaction-atomic password reset, webhook idempotency, persisted past_due_since, price-map validation, concurrency strategy, phase-by-phase verification gates. One security detail still needs tightening: proposed `resolveWorkspaceFromStripeEvent()` queries stripe_customer_id and immediately returns workspace when it finds a match, but surrounding comments say to retrieve and validate authoritative subscription, but validation not actually performed before return in shown flow. Matching customer ID alone not sufficient to establish particular subscription belongs to that workspace. Two related points to close: (1) Validate both association paths before returning — whether found by stripe_customer_id or stripe_subscription_id, retrieve subscription when applicable and verify ID, customer, persisted association agree, if customer lookup identifies one workspace but subscription lookup identifies another, fail safely rather than choosing either, perform final entitlement update under workspace row lock with authoritative state retrieval and transaction ordering designed to prevent stale concurrent updates. (2) Make unresolved events recoverable — returning 200 when association missing because retrying may not help is reasonable only if event not silently marked processed and discarded. Either leave retryable where appropriate or persist in durable observable reconciliation path, otherwise valid event received before its association exists could be permanently lost. These are refinements to webhook design, not reasons to expand Phase 1. Phase 1 decision: plan materially improved, but recommend one final amendment clarifying those two behaviors before implementation. Not started Phase 1, review not authorization.

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

## 2. Secure Design — With All Adjustments + 2 Final Refinements (v1.4)

### 2.1 P0 — Password Reset with Atomic Consumption in Single Transaction Scoped Migration (Unchanged from v1.3, Preserved)

**Goal**: Random, expiring, single-use, hashed at rest, atomic consumption preventing concurrent reuse, token consumption and password update in single DB transaction, hash password only after validation, scoped migration Phase 1 only.

**DB Migration — Phase 1 Scoped Only** `supabase/migrations/20261011000005_password_reset_tokens.sql`:

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

- Phase 1 adds only password_reset_tokens — not webhook or billing columns.
- Phase 2 adds stripe_webhook_events, Phase 3 adds workspaces billing columns.
- Migration-runner handled separately if prerequisite, explicitly scoped and verified.

**Token Generation** (forgot-password): Generic success, 256-bit random, SHA256 hash, expiry 1h, invalidate old, store IP, rate limit per IP and per email, dev log token only if dev.

**Token Verification** (reset-password) — Single transaction atomic:

```ts
const tokenHash = sha256(rawToken);
const client = await pool.connect();
try {
  await client.query('BEGIN');
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
    return 400 Token inválido o expirado
  }
  const userId = consumeRes.rows[0].user_id;
  const hash = await bcrypt.hash(newPassword, 10);
  await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
  await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  return 500
} finally {
  client.release();
}
```

- Atomic consumption UPDATE ... RETURNING ensures only first concurrent succeeds.
- Single transaction token consumption + password update — failure rolls back, token not consumed without reset.
- Hash after validation.
- Interim 501 if OKENG_ENABLE_PASSWORD_RESET=false.

**Tests**: Valid, expired, used, invalid, UUID, concurrent reuse Promise.all, failure between consumption and password update ROLLBACK, enumeration, rate limiting, bcrypt not called on invalid.

### 2.2 P0 — Stripe Webhook with Validated Both Association Paths and Recoverable Unresolved Events (Amended v1.4 with 2 Final Refinements)

**Goal**: Fail-closed prod/staging, require signature, idempotent recoverable, handle deleted subscriptions & API failures, out-of-order without stale overwrite, explicit concurrency strategy with row locking, never use untrusted metadata to select workspace, **validate both association paths before returning**, **make unresolved events recoverable**.

**Final Refinement #1**: Validate both association paths before returning. Whether workspace found by stripe_customer_id or stripe_subscription_id, retrieve subscription when applicable and verify ID, customer, persisted association agree. If customer lookup identifies one workspace but subscription lookup identifies another, fail safely rather than choosing either workspace. Perform final entitlement update under workspace row lock, with authoritative state retrieval and transaction ordering designed to prevent stale concurrent updates.

**Final Refinement #2**: Make unresolved events recoverable. Returning 200 when association missing because retrying same event may not help is reasonable only if event not silently marked processed and discarded. Either leave retryable where appropriate or persist in durable observable reconciliation path. Otherwise valid event received before its association exists could be permanently lost.

**Secure design**:

1. **Fail-closed** (same as v1.3):

```ts
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const isProd = process.env.NODE_ENV === 'production' || process.env.OKENG_ENV === 'production' || process.env.OKENG_ENV === 'staging';
if (!webhookSecret) {
  if (isProd) {
    console.error('[webhooks] STRIPE_WEBHOOK_SECRET required in production');
    return 500 Webhook secret not configured
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

2. **Trusted workspace resolution with validation of both association paths — Refinement #1**:

**Problem in v1.3**: Proposed `resolveWorkspaceFromStripeEvent()` queried `stripe_customer_id` and immediately returned workspace when it finds a match, but surrounding comments said to retrieve and validate authoritative subscription, but validation not actually performed before return. Matching customer ID alone not sufficient to establish particular subscription belongs to that workspace.

**Fixed implementation**:

```ts
async function resolveWorkspaceFromStripeEvent(
  client: PoolClient,
  event: any,
  stripe: Stripe,
  metadataWorkspaceId?: string // untrusted, only secondary check
): Promise<{
  workspaceId: string | null,
  customerId: string | null,
  subscriptionId: string | null,
  subscription: Stripe.Subscription | null,
  resolutionMethod: string,
  validationErrors: string[]
}> {

  let customerId: string | null = null;
  let subscriptionId: string | null = null;
  let subscription: Stripe.Subscription | null = null;
  const validationErrors: string[] = [];

  const eventObject = event.data.object;
  if (event.type === 'checkout.session.completed') {
    customerId = eventObject.customer as string;
    subscriptionId = eventObject.subscription as string;
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    subscriptionId = eventObject.id as string;
    customerId = eventObject.customer as string;
  } else if (event.type.startsWith('invoice.')) {
    customerId = eventObject.customer as string;
    subscriptionId = eventObject.subscription as string;
  }

  // Lookup both association paths inside transaction — do NOT return immediately after first match
  let workspaceByCustomer: { id: string, stripe_customer_id: string, stripe_subscription_id: string | null } | null = null;
  let workspaceBySubscription: { id: string, stripe_customer_id: string | null, stripe_subscription_id: string } | null = null;

  if (customerId) {
    const res = await client.query(`SELECT id, stripe_customer_id, stripe_subscription_id FROM workspaces WHERE stripe_customer_id = $1`, [customerId]);
    if (res.rows.length > 0) {
      workspaceByCustomer = res.rows[0];
    }
  }

  if (subscriptionId) {
    const res = await client.query(`SELECT id, stripe_customer_id, stripe_subscription_id FROM workspaces WHERE stripe_subscription_id = $1`, [subscriptionId]);
    if (res.rows.length > 0) {
      workspaceBySubscription = res.rows[0];
    }
  }

  // Refinement #1: If both lookups identify different workspaces, fail safely rather than choosing either
  if (workspaceByCustomer && workspaceBySubscription && workspaceByCustomer.id !== workspaceBySubscription.id) {
    console.error(`[webhooks] Contradictory association: customer ${customerId} maps to workspace ${workspaceByCustomer.id} but subscription ${subscriptionId} maps to workspace ${workspaceBySubscription.id} — fail safe, no entitlement change`);
    return {
      workspaceId: null,
      customerId,
      subscriptionId,
      subscription: null,
      resolutionMethod: 'contradictory_customer_vs_subscription_fail_safe',
      validationErrors: [`customer maps to ${workspaceByCustomer.id} but subscription maps to ${workspaceBySubscription.id}`]
    };
  }

  // Determine candidate workspaceId from verified associations (not metadata)
  let candidateWorkspaceId: string | null = null;
  let resolutionMethod = 'no_association';
  if (workspaceByCustomer) {
    candidateWorkspaceId = workspaceByCustomer.id;
    resolutionMethod = 'stripe_customer_id';
  } else if (workspaceBySubscription) {
    candidateWorkspaceId = workspaceBySubscription.id;
    resolutionMethod = 'stripe_subscription_id';
  }

  // If no candidate from verified associations, handle new checkout case with metadata as candidate but with validation (see below)
  let isNewCheckoutWithMetadata = false;
  if (!candidateWorkspaceId && event.type === 'checkout.session.completed' && metadataWorkspaceId) {
    isNewCheckoutWithMetadata = true;
    // For new checkout, we will validate metadata workspace later, but we need to fetch authoritative subscription first to verify
    candidateWorkspaceId = metadataWorkspaceId; // candidate for validation, not yet trusted
    resolutionMethod = 'metadata_for_new_checkout_candidate';
  }

  // If still no candidate, fail safely — no association
  if (!candidateWorkspaceId) {
    console.error(`[webhooks] No workspace association found for event ${event.id} type ${event.type} customer ${customerId} subscription ${subscriptionId} — fail safe, no entitlement change`);
    return {
      workspaceId: null,
      customerId,
      subscriptionId,
      subscription: null,
      resolutionMethod: 'no_association_fail_safe',
      validationErrors: ['no workspace found via customer or subscription']
    };
  }

  // Refinement #1: Retrieve authoritative subscription when applicable and verify ID, customer, persisted association agree — before returning
  // Fetch authoritative subscription from Stripe API if subscriptionId present
  if (subscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (err: any) {
      if (err.code === 'resource_missing' || err.statusCode === 404) {
        // Handle deleted — see below for resource_missing logic that requires confirming association
        console.log(`[webhooks] Subscription ${subscriptionId} not retrievable, will handle as deleted if association confirmed`);
        subscription = null;
      } else {
        // API failure — throw to cause ROLLBACK and 500, not acked, Stripe retries — Review Point #2
        throw err;
      }
    }
  }

  // Validate both association paths before returning — Refinement #1
  if (subscription) {
    // Verify subscription ID matches event subscriptionId (if present)
    if (subscriptionId && subscription.id !== subscriptionId) {
      validationErrors.push(`subscription ID mismatch: event ${subscriptionId} vs retrieved ${subscription.id}`);
    }
    // Verify subscription customer matches event customerId and persisted association
    const subCustomerId = subscription.customer as string;
    if (customerId && subCustomerId !== customerId) {
      validationErrors.push(`subscription customer mismatch: event customer ${customerId} vs retrieved sub customer ${subCustomerId}`);
    }
    // Verify persisted workspace association agrees
    // If we resolved via customerId, check that workspace's stripe_subscription_id (if present) matches or is null or matches retrieved subscription id? Actually for existing workspace, stripe_subscription_id should match subscriptionId or be null for first time?
    // For existing workspace found by customer, its stripe_subscription_id should be either null (first subscription) or equal to subscriptionId or equal to subscription.id
    // If it has different subscriptionId, it could be that workspace has multiple subscriptions? But we assume one subscription per workspace for MVP
    // So we check: if workspaceByCustomer exists and workspaceByCustomer.stripe_subscription_id and workspaceByCustomer.stripe_subscription_id !== subscriptionId and workspaceByCustomer.stripe_subscription_id !== subscription.id, then contradictory?
    // Actually we already checked contradictory between customer and subscription lookups, but we should also check that retrieved subscription's customer matches workspace's stripe_customer_id
    if (workspaceByCustomer && workspaceByCustomer.stripe_customer_id !== subCustomerId) {
      validationErrors.push(`workspace ${workspaceByCustomer.id} stripe_customer_id ${workspaceByCustomer.stripe_customer_id} does not match retrieved sub customer ${subCustomerId}`);
    }
    if (workspaceBySubscription && workspaceBySubscription.stripe_customer_id && workspaceBySubscription.stripe_customer_id !== subCustomerId) {
      validationErrors.push(`workspace ${workspaceBySubscription.id} stripe_customer_id ${workspaceBySubscription.stripe_customer_id} does not match sub customer ${subCustomerId}`);
    }
  }

  // If validation errors and not new checkout, fail safely
  if (validationErrors.length > 0 && !isNewCheckoutWithMetadata) {
    console.error(`[webhooks] Validation errors for event ${event.id}: ${validationErrors.join(', ')} — fail safe`);
    return {
      workspaceId: null,
      customerId,
      subscriptionId,
      subscription,
      resolutionMethod: 'validation_failed_fail_safe',
      validationErrors
    };
  }

  // For new checkout with metadata candidate, perform additional validation (see v1.3)
  if (isNewCheckoutWithMetadata) {
    const wsRes = await client.query(`SELECT id, stripe_customer_id, stripe_subscription_id FROM workspaces WHERE id = $1`, [candidateWorkspaceId]);
    if (wsRes.rows.length === 0) {
      console.error(`[webhooks] Metadata workspace ${candidateWorkspaceId} not found — fail safe`);
      return { workspaceId: null, customerId, subscriptionId, subscription, resolutionMethod: 'metadata_not_found_fail_safe', validationErrors: ['metadata workspace not found'] };
    }
    const ws = wsRes.rows[0];
    if (ws.stripe_customer_id && ws.stripe_customer_id !== customerId) {
      console.error(`[webhooks] Contradictory customer for metadata workspace ${ws.id}: has ${ws.stripe_customer_id} vs event ${customerId} — fail safe`);
      return { workspaceId: null, customerId, subscriptionId, subscription, resolutionMethod: 'contradictory_customer_fail_safe', validationErrors: ['contradictory customer'] };
    }
    if (ws.stripe_subscription_id && ws.stripe_subscription_id !== subscriptionId) {
      console.error(`[webhooks] Contradictory subscription for metadata workspace ${ws.id}: has ${ws.stripe_subscription_id} vs event ${subscriptionId} — fail safe`);
      return { workspaceId: null, customerId, subscriptionId, subscription, resolutionMethod: 'contradictory_subscription_fail_safe', validationErrors: ['contradictory subscription'] };
    }
    if (subscription && (subscription.customer as string) !== customerId) {
      console.error(`[webhooks] Subscription customer mismatch for metadata workspace: sub customer ${subscription.customer} vs event customer ${customerId} — fail safe`);
      return { workspaceId: null, customerId, subscriptionId, subscription, resolutionMethod: 'customer_mismatch_fail_safe', validationErrors: ['customer mismatch'] };
    }
    // Validation passed for new checkout
    console.log(`[webhooks] Resolving workspace via metadata for new checkout: ${candidateWorkspaceId} (validated)`);
    return { workspaceId: candidateWorkspaceId, customerId, subscriptionId, subscription, resolutionMethod: 'metadata_for_new_checkout_validated', validationErrors: [] };
  }

  // For existing association, validation passed (or no subscription to validate, e.g., invoice event without subscription)
  // Return candidate workspaceId with validated subscription
  return {
    workspaceId: candidateWorkspaceId,
    customerId,
    subscriptionId,
    subscription,
    resolutionMethod,
    validationErrors: []
  };
}
```

- **Validate both association paths before returning**: Whether found by `stripe_customer_id` or `stripe_subscription_id`, retrieve authoritative subscription when applicable and verify ID, customer, persisted association agree. If customer lookup identifies one workspace but subscription lookup identifies another, fail safely rather than choosing either (contradictory check).
- **Perform final entitlement update under workspace row lock, with authoritative state retrieval and transaction ordering designed to prevent stale concurrent updates**: See transaction ordering below.

3. **Transaction ordering with row locking to prevent stale concurrent updates — Refinement #1 continued + P1-3**:

```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');

  // Step 1: Idempotency check — insert event ID with ON CONFLICT DO NOTHING
  const insertRes = await client.query(
    `INSERT INTO stripe_webhook_events (id, type, workspace_id, data, stripe_created, status)
     VALUES ($1, $2, $3, $4, $5, 'processing')
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [event.id, event.type, null, JSON.stringify(event), event.created] // workspace_id initially null, will update after resolution
  );
  if (insertRes.rows.length === 0) {
    // Already processed — check if it was previously unresolved or processed
    const existing = await client.query(`SELECT status, processed_at FROM stripe_webhook_events WHERE id = $1`, [event.id]);
    if (existing.rows[0]?.status === 'processed') {
      await client.query('ROLLBACK');
      console.log(`[webhooks] Duplicate event ${event.id} already processed`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    // If existing status is unresolved, we can attempt to re-process? For idempotency, if previously unresolved, allow re-processing
    // For simplicity, if duplicate and not processed, allow re-processing? Actually ON CONFLICT DO NOTHING will not insert, so we need to handle unresolved re-processing
    // Better: if existing status is unresolved, we should allow re-processing by updating status to processing and continuing
    // For this plan, we handle unresolved via separate reconciliation path, not via duplicate insert
    await client.query('ROLLBACK');
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Step 2: Resolve workspace via verified persisted association inside transaction — with validation of both paths
  const metadataWorkspaceId = event.data.object.metadata?.workspaceId; // untrusted, only secondary
  const resolution = await resolveWorkspaceFromStripeEvent(client, event, stripe, metadataWorkspaceId);

  if (!resolution.workspaceId) {
    // No association or contradictory or validation failed — make unresolved events recoverable (Refinement #2)
    // Do NOT silently mark processed and discard
    // Persist as unresolved in durable observable reconciliation path
    await client.query(
      `UPDATE stripe_webhook_events SET workspace_id = $1, status = 'unresolved', data = $2, error = $3 WHERE id = $4`,
      [null, JSON.stringify(event), JSON.stringify({ reason: resolution.resolutionMethod, errors: resolution.validationErrors }), event.id]
    );
    await client.query('COMMIT');
    console.error(`[webhooks] Unresolved event ${event.id} persisted as unresolved for reconciliation: ${resolution.resolutionMethod}`);
    // Return 200 with no entitlement change but with durable record for reconciliation — not silently discarded
    // Alternatively, return 500 to leave retryable? For missing association, retry won't help, so return 200 with unresolved status and log for manual investigation
    return NextResponse.json({ received: true, unresolved: true, reason: resolution.resolutionMethod });
  }

  const workspaceId = resolution.workspaceId;

  // Step 3: Serialize entitlement updates per workspace — explicit concurrency strategy
  // Lock workspace row FOR UPDATE to serialize concurrent handlers for same workspace
  // This must happen BEFORE final entitlement update and AFTER resolution, and BEFORE authoritative retrieval? Actually we already retrieved authoritative subscription in resolve function, but to prevent stale, we should lock first, then re-fetch authoritative subscription inside lock
  // So we will lock, then re-fetch authoritative subscription again inside lock to ensure freshest state at time of lock

  await client.query(`SELECT id FROM workspaces WHERE id = $1 FOR UPDATE`, [workspaceId]);

  // Step 4: Re-fetch authoritative subscription inside lock to ensure freshest state at time of lock — prevents stale concurrent updates
  // The earlier fetch in resolve function was outside lock or inside but before lock, so it could be stale by time we acquire lock
  // So we re-fetch now inside lock
  let authoritativeSubscription: Stripe.Subscription | null = null;
  if (resolution.subscriptionId) {
    try {
      authoritativeSubscription = await stripe.subscriptions.retrieve(resolution.subscriptionId);
    } catch (err: any) {
      if (err.code === 'resource_missing' || err.statusCode === 404) {
        // Confirm subscription ID and existing workspace association before treating as deletion — Refinement P1-2
        if (!resolution.subscriptionId) {
          console.error(`[webhooks] resource_missing but no subscriptionId — fail safe, no downgrade`);
          await client.query(`UPDATE stripe_webhook_events SET status = 'unresolved', error = $1 WHERE id = $2`, [JSON.stringify({ reason: 'resource_missing_no_subscriptionId' }), event.id]);
          await client.query('COMMIT');
          return NextResponse.json({ received: true, unresolved: true, reason: 'resource_missing_no_subscriptionId' });
        }
        const assocRes = await client.query(`SELECT id FROM workspaces WHERE stripe_subscription_id = $1`, [resolution.subscriptionId]);
        if (assocRes.rows.length === 0) {
          console.error(`[webhooks] resource_missing for ${resolution.subscriptionId} but no existing workspace association — fail safe, no downgrade`);
          await client.query(`UPDATE stripe_webhook_events SET status = 'unresolved', error = $1 WHERE id = $2`, [JSON.stringify({ reason: 'resource_missing_no_association' }), event.id]);
          await client.query('COMMIT');
          return NextResponse.json({ received: true, unresolved: true, reason: 'resource_missing_no_association' });
        }
        console.log(`[webhooks] Subscription ${resolution.subscriptionId} not retrievable, has existing association ${assocRes.rows[0].id}, treating as deleted`);
        authoritativeSubscription = null; // will trigger downgrade
      } else {
        // API failure — do NOT mark as processed, return 500 so Stripe retries — Review Point #2
        await client.query('ROLLBACK');
        console.error('[webhooks] Stripe API failure inside lock, not acking', err);
        return NextResponse.json({ error: 'internal_error', message: 'Stripe API failure, retry' }, { status: 500 });
      }
    }
  }

  // Step 5: Validate both association paths again with authoritative subscription fetched inside lock
  if (authoritativeSubscription) {
    const subCustomerId = authoritativeSubscription.customer as string;
    const subId = authoritativeSubscription.id;
    // Verify customer lookup and subscription lookup still agree (in case they changed between resolve and lock)
    if (resolution.customerId && subCustomerId !== resolution.customerId) {
      console.error(`[webhooks] Inside lock: subscription customer mismatch ${subCustomerId} vs event customer ${resolution.customerId} — fail safe`);
      await client.query(`UPDATE stripe_webhook_events SET status = 'unresolved', error = $1 WHERE id = $2`, [JSON.stringify({ reason: 'customer_mismatch_inside_lock' }), event.id]);
      await client.query('COMMIT');
      return NextResponse.json({ received: true, unresolved: true, reason: 'customer_mismatch_inside_lock' });
    }
    // Check if customer lookup and subscription lookup would now identify different workspaces (race condition)
    const customerLookup = await client.query(`SELECT id FROM workspaces WHERE stripe_customer_id = $1`, [subCustomerId]);
    const subscriptionLookup = await client.query(`SELECT id FROM workspaces WHERE stripe_subscription_id = $1`, [subId]);
    if (customerLookup.rows.length > 0 && subscriptionLookup.rows.length > 0 && customerLookup.rows[0].id !== subscriptionLookup.rows[0].id) {
      console.error(`[webhooks] Inside lock: contradictory association after re-fetch: customer maps to ${customerLookup.rows[0].id} but subscription maps to ${subscriptionLookup.rows[0].id} — fail safe`);
      await client.query(`UPDATE stripe_webhook_events SET status = 'unresolved', error = $1 WHERE id = $2`, [JSON.stringify({ reason: 'contradictory_inside_lock' }), event.id]);
      await client.query('COMMIT');
      return NextResponse.json({ received: true, unresolved: true, reason: 'contradictory_inside_lock' });
    }
  }

  // Step 6: Derive plan from verified price and status with persisted past_due_since — see 2.3
  let planResult;
  if (authoritativeSubscription) {
    const priceId = authoritativeSubscription.items.data[0]?.price?.id;
    const status = authoritativeSubscription.status;
    const cancelAtPeriodEnd = authoritativeSubscription.cancel_at_period_end;
    const currentPeriodEnd = authoritativeSubscription.current_period_end;
    const existingWorkspace = await client.query(`SELECT past_due_since, plan FROM workspaces WHERE id = $1`, [workspaceId]);
    const existingPastDueSince = existingWorkspace.rows[0]?.past_due_since;
    planResult = getPlanFromSubscriptionStatus(status, priceId, cancelAtPeriodEnd, currentPeriodEnd, existingPastDueSince);
  } else {
    planResult = { plan: 'starter', interval: 'monthly', hasPaidAccess: false, reason: 'deleted_or_not_retrievable', pastDueSince: null };
  }

  // Step 7: Update workspace with new plan and billing state under row lock — final entitlement update
  if (planResult) {
    await client.query(
      `UPDATE workspaces SET plan = $1, plan_interval = $2, stripe_subscription_status = $3, stripe_current_period_end = $4, stripe_cancel_at_period_end = $5, past_due_since = $6, stripe_customer_id = $7, stripe_subscription_id = $8, updated_at = NOW() WHERE id = $9`,
      [planResult.plan, planResult.interval, authoritativeSubscription?.status, authoritativeSubscription ? new Date(authoritativeSubscription.current_period_end * 1000) : null, authoritativeSubscription?.cancel_at_period_end, planResult.pastDueSince, resolution.customerId, resolution.subscriptionId, workspaceId]
    );
  }

  // Step 8: Mark event as processed
  await client.query(`UPDATE stripe_webhook_events SET workspace_id = $1, processed_at = NOW(), status = 'processed' WHERE id = $2`, [workspaceId, event.id]);
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

- **Validate both association paths before returning**: Whether found by customer or subscription, retrieve authoritative subscription and verify ID, customer, persisted association agree. If customer lookup identifies one workspace but subscription lookup identifies another, fail safely rather than choosing either.
- **Final entitlement update under workspace row lock**: SELECT ... FOR UPDATE serializes concurrent handlers per workspace, authoritative state retrieval inside lock ensures freshest state at time of lock, transaction ordering prevents stale concurrent updates.
- **Make unresolved events recoverable — Refinement #2**:

**Problem in v1.3**: Plan proposed returning 200 when association missing because retrying same event may not help. Reasonable only if event not silently marked processed and discarded. Otherwise valid event received before its association exists could be permanently lost.

**Fixed design**:

- **Two categories**:
  - **Recoverable via Stripe retry (return 500, not marked processed)**: Stripe API failure (network, 500), DB failure (transaction ROLLBACK) — return 500, event not marked processed, Stripe retries.
  - **Unresolvable via retry but recoverable via durable reconciliation path (return 200 with unresolved status, persisted)**: No workspace association found, contradictory association, validation failed, resource_missing without existing association, etc. — these won't be fixed by Stripe retrying same event. Instead, persist event in `stripe_webhook_events` with `status = 'unresolved'` (or `needs_reconciliation = true`), `processed_at = NULL`, `workspace_id = NULL` or candidate, `error` JSON with reason, and return 200 with `unresolved: true` and log for investigation. Do NOT silently mark as processed and discard.

- **Durable observable reconciliation path**:

Table `stripe_webhook_events` has columns `id`, `type`, `workspace_id`, `data`, `stripe_created`, `status` (`processing`, `processed`, `unresolved`), `processed_at`, `error` JSONB.

For unresolved events:
- Insert with `status = 'unresolved'`, `processed_at = NULL`, `error` = reason, `workspace_id` = null or candidate.
- Return 200 with `unresolved: true` — Stripe considers event delivered, but we have durable record for manual investigation or automated reconciliation job.
- Have a reconciliation job or admin dashboard that lists unresolved events, allows manual resolution, or retries resolution after some time (e.g., if workspace was created after event, reconciliation job can re-attempt to resolve via customerId).

- **Avoid permanent loss**: Valid event received before its association exists (e.g., checkout.session.completed received before workspace created? But workspace should be created before checkout, so this shouldn't happen for new checkout if we use metadata validated path. For subscription events, if workspace was deleted, then no association is expected, and we should not downgrade guessed workspace — fail safe and log, but not lose event entirely — we have record in unresolved table).

- **Tests**: Duplicate event ID, DB failure not acked, deleted handling with association confirmation, API failure not acked, out-of-order, concurrent handlers with row locking, trusted workspace resolution (no association → unresolved persisted, not silently discarded, contradictory → fail safe), resource_missing without association → unresolved, not downgrade, unresolved events recoverable via reconciliation job.

### 2.3 P1 — Billing State Authoritative with Enforceable Grace and Safe Allowlist (Preserved from v1.3 with P1-1, P1-2, P1-3)

See v1.3 for full code of `buildPriceMap()` safe handling missing config and duplicate detection, `getPlanFromSubscriptionStatus()` with persisted `past_due_since`, explicit status table, workspaces columns added in Phase 3 only.

**Key points preserved**:
- Safe price map: skip missing/empty, reject duplicates at startup.
- Past_due grace: persisted start time, start only on transition, don't restart on repeated webhooks, downgrade after 7d.
- Concurrency: row locking (see 2.2).
- Scoped migration: Phase 3 only adds billing columns.

### 2.4 & 2.5 Workspace Authorization Consistency (Preserved)

See v1.3 for primary workspace selection most recent active membership ORDER BY created_at DESC LIMIT 1, requireWorkspaceAdmin validates user, workspace, active membership, required role every operation, never fallback to caller-provided when session missing, Phases 4-5 tested together.

### 2.6 Rate Limiting Proxy Trust Boundary & Trustworthy Fallback (Preserved)

See v1.3 for TRUST_PROXY, safe fallback using trustworthy sessionId from httpOnly signed cookie, shared bucket DoS mitigation, fail-closed AUTH on Redis error, accurate TTL, proxy docs.

### 2.7 Migration Ownership Single Authoritative Path (Preserved with Scoped per Phase)

See v1.3 for authoritative Supabase migrations source of truth, direct PG via versioned runner reading same SQL files tracking schema_migrations, explicit npm run migrate, no app-startup DDL, scoped per phase: Phase 1 only password_reset_tokens, Phase 2 only stripe_webhook_events, Phase 3 only workspaces billing columns.

---

## 3. DB Migrations & Schema Changes (Amended v1.4 — Scoped per Phase + Unresolved Events Recoverable)

### 3.1 Phase 1: password_reset_tokens only

`supabase/migrations/20261011000005_password_reset_tokens.sql` — only password reset.

### 3.2 Phase 2: stripe_webhook_events with status and error for recoverable unresolved

`supabase/migrations/20261011000006_stripe_webhook_events.sql`:

```sql
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
CREATE UNIQUE INDEX idx_stripe_webhook_events_id ON public.stripe_webhook_events(id);
CREATE INDEX idx_stripe_webhook_events_status ON public.stripe_webhook_events(status);
```

- Status `processing` initially, `processed` when successfully processed, `unresolved` when association missing/contradictory/validation failed — durable observable reconciliation path, not silently discarded.

### 3.3 Phase 3: workspaces billing columns + past_due_since

`supabase/migrations/20261011000007_workspaces_billing.sql` — billing columns.

### 3.4 Env Vars

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_ESCALA_MONTHLY_PRICE_ID=
STRIPE_ESCALA_ANNUAL_PRICE_ID=
TRUST_PROXY=true
OKENG_ENABLE_PASSWORD_RESET=false
```

### 3.5 Migration Runner

- Authoritative: Supabase migrations.
- Direct PG: src/lib/migrate.ts versioned runner reading supabase/migrations in order, tracking schema_migrations, explicit npm run migrate, no app-startup DDL, scoped per phase.

---

## 4. API Changes — Detailed (Amended v1.4)

### 4.1 forgot-password

- Generic success, no enumeration, generate 256-bit token, SHA256 hash, expiry 1h, invalidate old, store IP, rate limit.

### 4.2 reset-password

- Interim 501 if disabled, single transaction atomic consumption + password update, hash only after validation, concurrent reuse prevention.

### 4.3 webhooks

- Fail-closed prod/staging if secret missing, require signature, Node.js runtime.
- **Trusted workspace resolution with validation of both association paths**: Resolve via verified persisted stripe_customer_id and stripe_subscription_id, validate both paths before returning, if customer and subscription lookups identify different workspaces fail safely, retrieve authoritative subscription and verify ID/customer/persisted association agree, perform final entitlement update under workspace row lock with authoritative retrieval inside lock to prevent stale concurrent updates.
- **Idempotency & recoverable**: stripe_webhook_events uniqueness, transactional dedup+entitlement, do not ack if DB fails (500), Stripe retries, handle deleted subscriptions only after confirming association, API failures 500 not acked.
- **Unresolved events recoverable**: If no association or contradictory or validation failed, persist as unresolved with status unresolved and error JSON, return 200 with unresolved true and log for investigation, not silently marked processed and discarded. Have durable observable reconciliation path (admin dashboard or job) to retry or manually resolve. Avoid permanent loss of valid event received before association exists.
- **Billing state authoritative**: Derive plan from verified price and status with past_due_since, not metadata.
- Audit log.

### 4.4 checkout

- Validate plan/interval allowlist, map to priceId safely, workspace auth from session only, lookup customer, idempotency, generic success URL.

### 4.5 signup

- Transaction BEGIN/COMMIT/ROLLBACK, handle slug collision.

### 4.6 login

- Query users, verify password, primary workspace most recent active membership, populate session.

### 4.7 rateLimit

- Harden IP extraction with TRUST_PROXY, safe fallback trustworthy sessionId, not shared unknown bucket, DoS mitigation, fail-closed AUTH, accurate TTL.

---

## 5. Testing Plan — With Verification Gates (Amended v1.4)

### 5.1 Baseline

Record baseline before changes: build, homepage 52/52, embed 29/29, lint, tsc. Treat as baseline to verify not guaranteed, investigate failures, report actual results.

### 5.2 Password Reset Tests (Phase 1 Gate)

- Valid, expired, used, invalid, UUID, concurrent reuse Promise.all, failure between consumption and password update ROLLBACK, enumeration, rate limiting, bcrypt not called on invalid, scoped migration only password_reset_tokens.

### 5.3 Webhook Tests (Phase 2 Gate) — Amended with 2 Refinements

- No secret prod → 500 fail-closed, dev → warning.
- Invalid signature → 400.
- Price not in allowlist → no update.
- Valid price pro_monthly → update to pro.
- Forged without signature prod → 500.
- **Duplicate event ID**: same ID twice → second duplicate true, no re-processing.
- **DB failure**: mock throw → 500 not acked, event not marked processed.
- **Out-of-order**: past_due then active, ensure final active via authoritative fetch inside lock.
- **Deleted subscription**: resource_missing → downgrade only if existing workspace association confirmed, else fail safe no downgrade, persisted as unresolved.
- **API failure**: network error → 500 not acked.
- **Concurrent handlers**: Promise.all two handlers same workspace different states → row locking serializes, last writer wins with authoritative state, no stale overwrite, test concurrent handlers not only sequential.
- **Trusted workspace resolution with both paths validation**: 
  - Customer lookup finds workspace A, subscription lookup finds workspace B (different) → fail safely, no entitlement change, persisted as unresolved, no workspace chosen.
  - Customer lookup finds workspace, subscription lookup finds same workspace → success, but still validate authoritative subscription ID/customer agree before returning.
  - Customer lookup finds workspace, subscription lookup finds none → validate via authoritative subscription retrieval, if subscription's customer matches, allow.
  - Subscription lookup finds workspace, customer lookup finds none → similar.
  - No association → fail safe, persisted as unresolved, not silently discarded.
  - Contradictory association (workspace has different customer ID) → fail safe.
  - Metadata only secondary check: for new checkout, metadata workspaceId candidate validated, but if both customer and subscription lookups already found different workspaces, fail safe rather than using metadata.
- **Unresolved events recoverable**:
  - No association → persisted as unresolved with status unresolved and error JSON, returned 200 with unresolved true, not marked processed and discarded, has durable record for reconciliation.
  - Contradictory association → same, unresolved persisted.
  - Validation failed → unresolved persisted.
  - Resource_missing without existing association → unresolved persisted, no downgrade, not lost.
  - Reconciliation: test that unresolved events can be listed via query `SELECT * FROM stripe_webhook_events WHERE status = 'unresolved'` and manually resolved or retried via job.

### 5.4 Checkout Tests (Phase 3 Gate)

- Valid pro monthly, escala monthly no price → 400, invalid plan → 400, workspaceId from body but session different and not admin → 403, no session workspaceId → 400 not fallback, missing env config → 400 no undefined key, duplicate price IDs → throw at startup, past_due grace start/expiry, repeated webhooks not restarting clock.

### 5.5 Signup Atomicity Tests (Phase 4 Gate)

- Successful, failure after user insert → rollback, slug collision.

### 5.6 Session Workspace Role Tests (Phase 5 Gate)

- Signup → session workspaceId admin, login → workspaceId and workspaceRole, multiple workspaces → primary most recent DESC LIMIT 1, checkout uses session workspaceId, integration signup→login→checkout, workspace auth validates user/workspace/active membership/required role every operation, never fallback.

### 5.7 Rate Limiting Tests (Phase 6 Gate)

- Spoofed x-forwarded-for TRUST_PROXY true/false, fallback trustworthy sessionId per session not shared, unknown IP no session shared bucket DoS mitigation, Redis down AUTH 429 fail-closed READ success true fail-open, TTL.

### 5.8 Existing Suites (Phase 7 Gate)

- Build PASS record actual routes, homepage 52/52 baseline, embed 29/29 baseline record investigate, lint 0 errors, tsc check, manual verification, gate rule phase not complete merely because tests pass must demonstrate security invariant holds and existing behavior intact, report actual results.

---

## 6. Phased Execution Plan — Amended v1.4 with 2 Final Refinements (Awaiting Signal for Phase 1 Only)

**Phase 0 — This doc v1.4 (0.5 day)** — DONE: Incorporate 2 final refinements (validate both association paths before returning, make unresolved events recoverable with durable reconciliation path) + preserve v1.3 corrections (scoped Phase 1 migration, never use untrusted metadata to select workspace) + v1.2 improvements, verification gates, baseline recording, await explicit signal for Phase 1 only.

**Phase 1 — P0 Password Reset with Atomic Consumption in Single Transaction Scoped Migration (1 day)** — After explicit signal for Phase 1 only:
- **Scoped migration**: Create `20261011000005_password_reset_tokens.sql` only — password_reset_tokens table, not webhook or billing columns. Migration-runner handled separately if prerequisite explicitly scoped and verified.
- Implement forgot-password token generation (256-bit, SHA256 hash, expiry 1h, invalidate old, IP, rate limit).
- Implement reset-password with **single transaction** atomic UPDATE ... RETURNING + password update + invalidate others + COMMIT, ROLLBACK on failure, hash only after validation, interim 501 if OKENG_ENABLE_PASSWORD_RESET=false.
- Add tests password-reset.test.ts with negative, concurrent reuse, transaction failure (token consumption and password update in single transaction), scoped migration verification.
- **Verification gate**: negative security tests, concurrent reuse, transaction atomicity (token consumption and password update in single transaction, failure between rolls back token not consumed without reset), preserve existing behavior (build, existing tests baseline), report actual results, demonstrate security invariant holds (no UUID takeover, no concurrent reuse).
- Commit: `fix(AUTH): secure password-reset atomic consumption single transaction scoped migration (P0)`

**Phase 2 — P0 Stripe Webhook Fail-Closed Idempotent Recoverable with Trusted Workspace Resolution Validating Both Paths and Recoverable Unresolved (0.5 day)** — Awaiting separate signal after Phase 1:
- **Scoped migration**: Create `20261011000006_stripe_webhook_events.sql` only — stripe_webhook_events table with status and error for recoverable unresolved, not billing columns.
- Update webhooks/route.ts fail-closed prod/staging, require signature, Node.js runtime, idempotency via stripe_webhook_events uniqueness, transactional dedup+entitlement, do not ack if DB fails, handle deleted subscriptions and API failures, out-of-order via fetching authoritative subscription, row locking SELECT ... FOR UPDATE per workspace to serialize concurrent handlers, **never use untrusted metadata to select workspace** — resolve via verified persisted stripe_customer_id or stripe_subscription_id, **validate both association paths before returning** — whether found by customer or subscription, retrieve authoritative subscription when applicable and verify ID/customer/persisted association agree, if customer lookup identifies one workspace but subscription lookup identifies another fail safely rather than choosing either, perform final entitlement update under workspace row lock with authoritative state retrieval inside lock and transaction ordering designed to prevent stale concurrent updates, **make unresolved events recoverable** — if no association or contradictory or validation failed, persist as unresolved with status unresolved and error JSON in durable observable reconciliation path, return 200 with unresolved true and log for investigation, not silently marked processed and discarded, have reconciliation job or admin dashboard listing unresolved events, avoid permanent loss of valid event received before association exists.
- Add tests billing-webhook.test.ts with negative, duplicate, DB failure not acked, deleted handling with association confirmation, API failure not acked, out-of-order, concurrent handlers with row locking, trusted workspace resolution with both paths validation (customer vs subscription different workspaces fail safe, both same workspace success, no association fail safe unresolved persisted not discarded, contradictory fail safe, metadata secondary), unresolved recoverable (no association persisted as unresolved, contradictory persisted, validation failed persisted, resource_missing without association persisted, reconciliation query).
- **Verification gate**: negative, duplicate, DB failure not acked, deleted handling with association confirmation, API failure not acked, concurrent with row locking and authoritative retrieval inside lock preventing stale, trusted resolution validating both paths, unresolved recoverable with durable path, preserve existing.
- Commit: `fix(BILLING): strict webhook signature fail-closed idempotent recoverable trusted resolution both paths validated unresolved recoverable (P0)`

**Phase 3 — P1 Billing State Authoritative with Enforceable Grace and Safe Allowlist (1 day)** — Awaiting separate signal:
- **Scoped migration**: Create `20261011000007_workspaces_billing.sql` — workspaces billing columns past_due_since, stripe_subscription_status, stripe_current_period_end, stripe_cancel_at_period_end, stripe_customer_id, stripe_subscription_id, plan, plan_interval, public_key, signing_secret.
- Create src/lib/billing.ts with safe buildPriceMap (skip missing/empty, reject duplicates at startup), PLAN_PRICE_MAP, PRICE_ID_TO_PLAN, PLAN_LIMITS, getPlanFromSubscriptionStatus with persisted past_due_since, explicit status handling trialing, past_due with 7d grace start only on transition don't restart clock, unpaid, canceled at period end based on authoritative state and period end.
- Update checkout/route.ts validate plan/interval allowlist, map to priceId safely, workspace auth from session only, lookup customer, idempotency, generic success URL.
- Update webhooks/route.ts derive plan from verified price and status with past_due_since handling, audit log, already has trusted resolution from Phase 2 but now with billing columns.
- Add env vars for escala prices to .env.example.
- Add tests billing-checkout.test.ts with plan/price mismatch, unauthorized workspace, missing config, duplicate price IDs, past_due grace start/expiry, repeated webhooks not restarting clock.
- **Verification gate**: plan/price mismatch, unauthorized workspace, missing config, duplicate detection, past_due grace enforceable, preserve existing.
- Commit: `fix(BILLING): server-side plan price validation authoritative with grace and safe allowlist (P1)`

**Phase 4 — P1 Signup Atomic Transaction (0.5 day)** — Awaiting separate signal:
- Update signup/route.ts to use pool.connect() BEGIN/COMMIT/ROLLBACK, handle slug collision.
- Add tests signup-atomic.test.ts.
- **Verification gate**: transaction rollback, preserve existing.
- Commit: `fix(AUTH): atomic signup transaction (P1)`

**Phase 5 — P1 Session Workspace Role Resolution Consistent (0.5 day)** — Awaiting separate signal:
- Update login/route.ts to query workspace_members primary workspace ORDER BY created_at DESC LIMIT 1, populate session workspaceId and workspaceRole, extend SessionData, requireWorkspaceAdmin validates user, workspace, active membership, required role every billing op, never fallback to caller-provided when session missing.
- Update checkout to use session workspaceId only.
- Add tests session-workspace.test.ts + integration signup/login/checkout.
- **Verification gate**: role-resolution, primary selection deterministic, workspace auth consistency, integration, preserve existing.
- Commit: `fix(AUTH): session workspace role resolution consistent (P1)`
- Note: Test Phases 4-5 together because checkout depends on session contract.

**Phase 6 — P1 Rate Limiting Proxy Trust Boundary with Trustworthy Fallback (0.5 day)** — Awaiting separate signal:
- Update rateLimit.ts harden IP extraction with TRUST_PROXY env, safe fallback using trustworthy sessionId where available, not shared unknown bucket, shared bucket DoS mitigation higher limit or separate, fail-closed AUTH on Redis error, fail-open others, accurate TTL.
- Update proxy.ts sanitize forwarding headers in prod, document trust boundary.
- Document in LOCAL-SETUP-GUIDE production deployment assumptions (Vercel/Cloudflare/Nginx), TRUST_PROXY, safe fallback, per-tier failure behavior.
- Add tests rate-limit.test.ts with spoofed-header, fallback trustworthy, shared bucket DoS, Redis outage per tier, TTL.
- **Verification gate**: spoofed-header, fallback trustworthy, DoS mitigation, Redis outage per tier, proxy docs, preserve existing.
- Commit: `fix(SEC): rate limiting proxy trust boundary trustworthy fallback (P1)`

**Phase 7 — Regression Tests & Verification (0.5 day)** — Awaiting separate signal:
- Run all new security tests + existing 52/52 + 29/29 baseline (record before, investigate failures not weaken).
- npm run build PASS (record actual routes), npm run lint 0 errors, npx tsc --noEmit.
- Manual verification: forgot→reset flow, webhook test signature, checkout valid/invalid, unauthorized workspace, past_due grace, concurrent handlers, trusted workspace resolution both paths, unresolved recoverable reconciliation.
- Update LOCAL-SETUP-GUIDE with secure flows, env vars, billing state authoritative with grace, proxy trust boundary, migration ownership.
- **Verification gate**: existing regression suites, new tests, build, lint, manual verification, report actual results not assumed.
- Commit: `test(SEC): add regression tests for P0/P1 with enforceable guarantees (PLAN-008)`

**Phase 8 — Push & PR Update (0.5 day)** — Awaiting separate signal:
- Review final diff, verify committed changes and clean working tree, push branch, update PR with test evidence.
- **Verification gate**: final diff review, clean working tree, push, PR update with test evidence.
- Commit: `docs(PLAN-008): mark execution completed — P0/P1 security billing hardening with atomic guarantees and verification gates`

**Important**: Keep phases sequential and independently verifiable, especially password-reset and webhook fixes. Next step after this plan review is explicitly authorize Phase 1 only — not treat plan review as authorization for all 8 phases. Keep OKENG_ENABLE_PASSWORD_RESET=false until full reset flow and delivery verified. Webhook row locking and authoritative Stripe retrieval must be coordinated carefully — ensure concurrent handlers cannot commit stale entitlement, and failed Stripe retrieval or DB transaction cannot leave event permanently marked as processed. Validate both association paths before returning, fail safe if different workspaces, perform final entitlement update under workspace row lock with authoritative state retrieval inside lock and transaction ordering designed to prevent stale concurrent updates. Make unresolved events recoverable via durable observable reconciliation path, not silently discarded.

---

## 7. Risks & Rollback (Amended v1.4)

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Password reset token table migration fails | Medium | High | Test in staging, rollback DROP TABLE, keep endpoint 501 until migration success, single transaction atomic consumption, scoped migration Phase 1 only |
| Concurrent token reuse race still possible | Low | High | UPDATE ... RETURNING with used_at IS NULL and expires_at > NOW() in single transaction with password update, test Promise.all concurrent |
| Token consumed without password reset (failure between) | Medium | High | Single transaction token consumption + password update + COMMIT, ROLLBACK on failure, token remains valid for retry |
| Stripe webhook fail-closed breaks dev without secret | Low | Medium | Allow dev bypass only NODE_ENV=development AND OKENG_ENV=development, document, fail-closed only prod/staging, idempotency |
| Webhook uses untrusted metadata to select workspace (P1-2 final correction) | High if not fixed | High | Resolve via verified persisted stripe_customer_id or stripe_subscription_id, not metadata, metadata only secondary check/diagnostics, fail safely if missing/contradictory, log |
| Webhook resource_missing downgrades guessed workspace (P1-2) | Medium | High | Treat resource_missing as deletion only after confirming subscription ID and existing workspace association, missing/mismatched resource should not downgrade workspace selected from untrusted event data |
| Webhook both association paths different workspaces (Refinement #1) | Medium | High | Validate both association paths before returning, if customer lookup identifies one workspace but subscription lookup identifies another fail safely rather than choosing either, test contradictory |
| Webhook matching customer ID alone not sufficient (Refinement #1) | Medium | High | Whether found by customer or subscription, retrieve authoritative subscription when applicable and verify ID, customer, persisted association agree before returning, perform final entitlement update under workspace row lock with authoritative retrieval inside lock |
| Webhook unresolved events permanently lost (Refinement #2) | Medium | High | Make unresolved events recoverable — do not silently mark processed and discarded, either leave retryable 500 where appropriate (API failure, DB failure) or persist in durable observable reconciliation path with status unresolved and error JSON, return 200 with unresolved true and log, have reconciliation job or admin dashboard listing unresolved, avoid permanent loss |
| Webhook out-of-order stale overwrite | Medium | High | Fetch authoritative subscription via Stripe API inside row lock, row locking SELECT ... FOR UPDATE per workspace to serialize concurrent handlers, store event created, test concurrent handlers |
| Webhook DB failure acked as success | High if not handled | High | Deduplication + entitlement in same transaction, do not ack if DB fails (500), Stripe retry, test DB failure |
| Past_due grace indefinite (P1-1) | High if not persisted | High | Persist past_due_since, start only on transition into past_due, don't restart on repeated webhooks, downgrade after 7d, test repeated webhooks |
| Price allowlist undefined key (P1-2) | Medium | High | Build reverse map only from configured non-empty price IDs, reject duplicates at startup, test partial/missing env |
| Concurrent webhook race (P1-3) | Medium | High | Serialize per workspace via SELECT ... FOR UPDATE row locking inside transaction, authoritative retrieval inside lock, define stale rejection, test concurrent handlers |
| Migration drift Supabase vs pg pool (P2-4) | Medium | High | Authoritative Supabase migrations as source of truth, direct PG via versioned runner reading same SQL files, tracking schema_migrations, explicit npm run migrate, no app-startup DDL, document, scoped per phase (Phase 1 only password_reset_tokens, Phase 2 only stripe_webhook_events, Phase 3 only workspaces billing columns) |
| Migration-runner prerequisite not scoped | Medium | Medium | Handle runner separately if prerequisite, explicitly scoped and verified, e.g., Phase 0 or Phase 1 prerequisite with own verification, only apply required migration |
| Signup transaction deadlocks | Low | Medium | Short transaction, retry on serialization failure |
| Session workspaceId missing for existing users | Medium | Medium | Migration for existing users, handle null gracefully, never fallback to client ID |
| Rate limiting fail-closed AUTH blocks legit when Redis down | Medium | Medium | Fail-closed only AUTH, fail-open READ/WRITE, monitor /api/health |
| Rate limiting fallback shared bucket DoS (Review Point #5) | Medium | High | Fallback uses trustworthy sessionId where available (httpOnly signed cookie), if both unknown and no-session shared bucket DoS mitigation higher limit or separate, document TRUST_PROXY, test spoofed-header and shared bucket |

**Rollback**:
- Keep branch with commits before fixes — revert via git revert or reset.
- DB down migrations: DROP TABLE password_reset_tokens (Phase 1), DROP TABLE stripe_webhook_events (Phase 2), ALTER TABLE workspaces DROP COLUMN past_due_since etc (Phase 3).
- Feature flags: OKENG_ENABLE_PASSWORD_RESET=false returns 501, OKENG_STRICT_WEBHOOK=false allows dev bypass only in dev.

---

## 8. References (Amended v1.4)

- Review findings: P0 password reset UUID takeover, P0 webhook forged events, P1 checkout plan metadata trust, P1 signup non-atomic, P1 session workspace roles, P1 rate limiting IP spoofing.
- First review 5 adjustments: atomic token consumption, webhook idempotency recoverable, billing state authoritative, workspace auth consistency, proxy trust boundary + verification gates.
- Second review 4 corrections: P1-1 past_due grace not enforceable needs persisted past_due_since, P1-2 price allowlist safe handling missing config, P1-3 concurrency strategy row locking, P2-4 migration ownership single authoritative path + 5 remaining points: password-reset atomicity single transaction, webhook recoverable deleted handling, subscription status policy period end, workspace auth consistency, rate-limit fallback trustworthy identifier.
- Final review 2 corrections: P1-1 Phase 1 migration scoped to password reset only (not webhook/billing columns), P1-2 never use untrusted webhook metadata to select workspace whose entitlement will change — resolve via verified persisted Stripe customer/subscription association, metadata only secondary check, fail safely if missing/contradictory, treat resource_missing as deletion only after confirming subscription ID and existing workspace association.
- Final review 2 refinements: (1) Validate both association paths before returning — whether workspace found by stripe_customer_id or stripe_subscription_id, retrieve subscription when applicable and verify ID, customer, persisted association agree, if customer lookup identifies one workspace but subscription lookup identifies another fail safely rather than choosing either, perform final entitlement update under workspace row lock with authoritative state retrieval and transaction ordering designed to prevent stale concurrent updates. (2) Make unresolved events recoverable — returning 200 when association missing because retrying may not help is reasonable only if event not silently marked processed and discarded, either leave retryable where appropriate or persist in durable observable reconciliation path, otherwise valid event received before its association exists could be permanently lost.
- Current code: reset-password 61 lines UUID, webhooks 106 lines JSON.parse without signature, checkout 79 lines client plan in metadata, signup 81 lines separate queries, login 68 lines no workspaceId, rateLimit 60 lines x-forwarded-for spoofable, auth.ts 126 lines HMAC-SHA256.
- Supabase schema: 20261003000001 201 lines, 20261009000003 936 lines RLS, no password_reset_tokens, no stripe columns, no past_due_since.
- OWASP password reset: random 256-bit, hash at rest, expiry 15m-1h, single-use, atomic consumption UPDATE ... RETURNING in single transaction with password update, hash only after validation, scoped migration Phase 1 only.
- Stripe: webhook signatures, idempotency event ID uniqueness, transactional dedup+entitlement, do not ack if DB fails, fetch authoritative subscription to handle out-of-order and deleted, row locking SELECT ... FOR UPDATE per workspace to serialize concurrent handlers, subscription status trialing, past_due with persisted start time, unpaid, canceled at period end, deleted, never use untrusted metadata to select workspace, resolve via verified persisted association, validate both association paths before returning, fail safe if different workspaces, final entitlement update under row lock with authoritative retrieval inside lock, unresolved events recoverable via durable observable reconciliation path with status unresolved and error JSON, not silently discarded.
- Billing: safe price allowlist building only from configured non-empty IDs, reject duplicates at startup, entitlement from verified price and status, never metadata, scoped migrations per phase.
- Workspace auth: primary workspace most recent active membership ORDER BY created_at DESC LIMIT 1 deterministic default but not proof for billing, requireWorkspaceAdmin validates user, workspace, active membership, required role every operation, never fallback to caller-provided when session missing.
- Rate limiting: proxy trust boundary TRUST_PROXY, Vercel/Cloudflare/Nginx sanitizes, safe fallback using trustworthy sessionId (httpOnly signed cookie) where available, not shared unknown bucket, shared bucket DoS mitigation higher limit or separate, per-tier failure behavior AUTH fail-closed READ/WRITE fail-open.

---

*Amended plan v1.4 incorporating final review 2 refinements — validate both association paths before returning (customer and subscription lookups must agree, fail safe if different workspaces, retrieve authoritative subscription and verify ID/customer/persisted association, final entitlement update under workspace row lock with authoritative retrieval inside lock preventing stale concurrent updates), make unresolved events recoverable (do not silently mark processed and discarded, either leave retryable 500 for API/DB failures or persist in durable observable reconciliation path with status unresolved and error JSON, return 200 with unresolved true and log for investigation, avoid permanent loss) + preserves v1.3 corrections: scoped Phase 1 migration to password reset only, never use untrusted metadata to select workspace, fail safe if missing/contradictory, resource_missing only after confirming association + v1.2 improvements: persisted past_due_since, safe price map, row locking concurrency, single authoritative migration path, single transaction atomicity, idempotent recoverable webhook, authoritative billing status, consistent workspace auth, trustworthy rate-limit fallback, verification gates per phase, baseline recording, OKENG_ENABLE_PASSWORD_RESET=false until verified. Awaiting explicit signal for Phase 1 only.*
