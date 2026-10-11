# PLAN-008 — Security & Billing Hardening: Resolution Plan for P0/P1 Review Findings (Amended v1.3)

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-008` |
| **Status** | `DRAFT v1.3 — AMENDED PER FINAL REVIEW — AWAITING SIGNAL FOR PHASE 1 ONLY` |
| **Owner** | Engineering & Security |
| **Authority** | Blocking — P0 Security, P1 Billing & Auth |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `STG-01`, `AUTH-01..03`, `PLAN-007`, `LOCAL-SETUP-GUIDE v2.0`, `00_product_contract` |
| **Revision** | `1.3 (2026-10-11)` — Incorporates final review 2 corrections: Phase 1 migration scoped to password reset only (not webhook/billing columns), never use untrusted webhook metadata to select workspace whose entitlement will change — resolve via verified persisted Stripe customer/subscription association, metadata only secondary check, fail safely if missing/contradictory, treat resource_missing as deletion only after confirming subscription ID and existing workspace association + preserves v1.2 improvements: persisted past_due_since, safe price map, row locking concurrency, single authoritative migration path, single transaction atomicity, idempotent recoverable webhook, authoritative billing status, consistent workspace auth, trustworthy rate-limit fallback |
| **Review Source** | User P0/P1 review + first review 5 adjustments + second review 4 corrections + 5 remaining points + final review 2 corrections (scoped Phase 1 migration, never use untrusted metadata to select workspace) |
| **Original Findings** | P0 password reset UUID takeover, P0 webhook forged events when secret absent, P1 checkout plan metadata trust, P1 signup non-atomic, P1 session workspace roles missing, P1 rate limiting IP spoofing |

---

## 0. Goal & Merge Gate (Amended v1.3)

Fix exploitable security, tenant isolation, billing entitlement, auth flows before merging PR #1. **Key principles**: security guarantees enforceable in code not just documented; passing test suite necessary but not sufficient — each phase must demonstrate security invariant holds and existing behavior intact.

**Merge gate**:
- [ ] Secure password-reset token generation, verification, expiry, single-use enforcement with atomic consumption in single transaction, concurrent reuse prevention (P0)
- [ ] Strict Stripe webhook signature verification fail-closed staging/prod, idempotent & recoverable with event ID uniqueness, transactional dedup+entitlement, handles deleted subscriptions & API failures, out-of-order without stale overwrite, explicit concurrency strategy with row locking, **never use untrusted metadata to select workspace** — resolve via verified persisted customer/subscription association (P0)
- [ ] Server-side plan and price validation with entitlement from verified Stripe price and authoritative subscription status (trialing, past_due with persisted past_due_since grace, unpaid, canceled at period end, deleted) — never metadata or unverified checkout (P1)
- [ ] Atomic signup transaction + consistent workspace auth — primary workspace deterministic (most recent active membership) but billing operations validate authenticated user, requested workspace, active membership, required role every time, never fallback to caller-provided ID when session missing (P1)
- [ ] Rate limiting hardened with explicit proxy trust boundary, TRUST_PROXY, safe fallback using trustworthy session/account identifier not shared unknown bucket, fail-closed AUTH on Redis outage, fail-open others (P1)
- [ ] Regression tests with negative tests, concurrent handlers, transaction rollback, integration, spoofed-header, Redis outage per tier, TTL
- [ ] Production build, lint, existing suites — baseline 52/52+29/29 recorded before changes, treated as baseline to verify not guaranteed, investigate failures not weaken tests, report actual results

**Scope note**: Code-inspection response, includes runtime verification. Next step per final review: review committed plan v1.3 against criteria, then **explicitly authorize Phase 1 only** — not treat plan review as authorization for all 8 phases. Keep `OKENG_ENABLE_PASSWORD_RESET=false` until full reset flow and delivery verified. Plan preserves right execution boundary: review plan now; authorize Phase 1 separately; do not begin Phase 2+ without further approval.

**Reviewer notes on v1.2**: v1.2 amendments address major security gaps, strongest improvements are persisted past_due_since, safe construction of Stripe price map, single authoritative migration path, fallback from untrusted IP to per-session rate limits, keeping password reset disabled until verified. One detail deserves scrutiny before implementation: webhook row locking and authoritative Stripe retrieval must be coordinated carefully — ensure concurrent handlers cannot commit stale entitlement, and failed Stripe retrieval or DB transaction cannot leave event permanently marked as processed. Two final corrections recommended (see below) — incorporated in v1.3.

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

## 2. Secure Design — With All Adjustments + 2 Final Corrections

### 2.1 P0 — Password Reset with Atomic Consumption in Single Transaction (Adjustment #1 + Review Point #1 + Final Correction P1-1 Scoped Migration)

**Goal**: Random, expiring, single-use, hashed at rest, atomic consumption preventing concurrent reuse, token consumption and password update in single DB transaction, hash password only after validation.

**Final Correction P1-1**: Keep Phase 1's database migration scoped to password reset only. Phase 1 checklist currently says to create password_reset_tokens, stripe_webhook_events, and required workspace columns together. That brings Phase 2 and Phase 3 schema changes into first commit before their implementation and verification gates. Change: Phase 1 adds only password-reset schema required for its tests. Add webhook and billing columns in their respective phases. Migration-runner work can be handled separately if prerequisite, but must be explicitly scoped and verified.

**DB Migration — Phase 1 Scoped Only** `supabase/migrations/20261011000005_password_reset_tokens.sql` (authoritative path, see 2.7):

```sql
-- Phase 1 only: password reset tokens, not webhook or billing columns
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
-- service_role bypasses RLS, no client policies needed
```

- **Phase 1 adds only password_reset_tokens** — not stripe_webhook_events, not workspaces past_due_since etc.
- **Phase 2** adds `stripe_webhook_events` table (see 2.2).
- **Phase 3** adds workspaces columns `past_due_since`, `stripe_subscription_status`, `stripe_current_period_end`, `stripe_cancel_at_period_end`, `stripe_customer_id`, `stripe_subscription_id`, `plan`, `plan_interval`, etc (see 2.3).
- **Migration-runner** work (src/lib/migrate.ts versioned runner) handled separately if prerequisite, explicitly scoped and verified — see 2.7. If runner needed for Phase 1, it should only apply password_reset_tokens migration, not all.

**Token Generation** (forgot-password):

1. Generic success to avoid enumeration.
2. If user exists, generate raw token `crypto.randomBytes(32).toString('hex')` 256-bit.
3. Hash SHA256 `createHash('sha256').update(rawToken).digest('hex')` — store hash.
4. Store id UUID, user_id, token_hash, expires_at NOW()+1h, created_ip sanitized (see 2.6), user_agent.
5. Invalidate previous unused tokens for same user.
6. Email link `${APP_URL}/reset-password?token=${rawToken}` — dev only log token if `NODE_ENV=development` AND `OKENG_ENV=development`, never prod.
7. Rate limit per IP and per email AUTH tier.

**Token Verification** (reset-password) — **Single transaction atomic**:

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
    return NextResponse.json({ error: 'bad_request', message: 'Token inválido o expirado' }, { status: 400 });
  }
  const userId = consumeRes.rows[0].user_id;
  // Hash only after validation — per reviewer
  const hash = await bcrypt.hash(newPassword, 10);
  await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
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

- Atomic consumption UPDATE ... RETURNING ensures only first concurrent succeeds.
- Single transaction token consumption + password update — failure between rolls back, token not consumed without reset.
- Hash after validation.
- Interim safe: if `OKENG_ENABLE_PASSWORD_RESET=false` or table not exists, return 501 before any DB update — endpoint cannot modify passwords until full flow verified. Keep flag false until delivery verified.

**Tests**: Valid, expired, used, invalid, UUID, concurrent reuse Promise.all, failure between consumption and password update (mock throw → ROLLBACK, token remains valid), enumeration, rate limiting, bcrypt not called on invalid.

### 2.2 P0 — Stripe Webhook Fail-Closed Idempotent Recoverable with Trusted Workspace Resolution (Adjustments #2 + Review Points #2 + Final Correction P1-2 Never Use Untrusted Metadata)

**Goal**: Fail-closed prod/staging, require signature, idempotent recoverable, handle deleted subscriptions, API failures, out-of-order without stale overwrite, explicit concurrency strategy with row locking, **never use untrusted webhook metadata to select workspace whose entitlement will change**.

**Final Correction P1-2**: Never use untrusted webhook metadata to select workspace whose entitlement will change. Proposed webhook flow can derive workspaceId from event and then lock that workspace row. Valid Stripe signature proves Stripe sent event; does not prove arbitrary workspace ID in metadata is correct owner of that subscription. Change: Resolve workspace using verified, persisted Stripe customer or subscription association, then validate association against retrieved subscription. Use metadata only as secondary consistency check or diagnostics. If association missing or contradictory, do not grant or revoke entitlement against guessed workspace; fail safely and log. Treat resource_missing as deletion signal only after confirming subscription ID and its existing workspace association. Missing or mismatched resource should not be enough to downgrade workspace selected from untrusted event data.

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

2. **Trusted workspace resolution — never use untrusted metadata to select workspace**:

**Problem**: Valid Stripe signature proves Stripe sent event, but does not prove arbitrary workspace ID in metadata is correct owner of subscription. Metadata workspaceId is set by our server during checkout creation (from session.workspaceId), so it is somewhat trustworthy if checkout was created by our server, but still should not be sole source for entitlement changes, especially for subscription.updated/deleted events which may not have metadata, or for forged events where attacker could have set metadata if they controlled checkout creation? Actually checkout creation validates workspaceId from session, so metadata workspaceId is set by server, not client, so it's somewhat trustworthy. However reviewer says never use untrusted webhook metadata to select workspace whose entitlement will change — resolve using verified persisted Stripe customer or subscription association, then validate association against retrieved subscription. Use metadata only as secondary consistency check or diagnostics. If association missing or contradictory, do not grant or revoke entitlement against guessed workspace; fail safely and log.

**Implementation**:

```ts
// For each webhook event, resolve workspace via verified persisted association, not metadata

async function resolveWorkspaceFromStripeEvent(
  client: PoolClient,
  event: any,
  stripe: Stripe,
  metadataWorkspaceId?: string // untrusted, only for secondary check
): Promise<{ workspaceId: string | null, customerId: string | null, subscriptionId: string | null, subscription: Stripe.Subscription | null, resolutionMethod: string }> {

  let customerId: string | null = null;
  let subscriptionId: string | null = null;
  let subscription: Stripe.Subscription | null = null;

  // Extract IDs from event — these are verified from Stripe, not metadata
  const eventObject = event.data.object;
  if (event.type === 'checkout.session.completed') {
    // checkout.session.completed has customer and subscription (verified)
    customerId = eventObject.customer as string;
    subscriptionId = eventObject.subscription as string;
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    // subscription events have id and customer (verified)
    subscriptionId = eventObject.id as string;
    customerId = eventObject.customer as string;
    subscription = eventObject as Stripe.Subscription; // may be partial, but we will fetch authoritative
  } else if (event.type.startsWith('invoice.')) {
    customerId = eventObject.customer as string;
    subscriptionId = eventObject.subscription as string;
  }

  // Try to resolve workspace via verified persisted association — authoritative
  // First, try stripe_customer_id
  if (customerId) {
    const res = await client.query(`SELECT id FROM workspaces WHERE stripe_customer_id = $1`, [customerId]);
    if (res.rows.length > 0) {
      const workspaceId = res.rows[0].id;
      // Validate association: if subscriptionId present, fetch authoritative subscription and check its customer matches customerId and its id matches or is associated
      // For checkout.session.completed, we should also fetch subscription to verify customer matches
      return { workspaceId, customerId, subscriptionId, subscription, resolutionMethod: 'stripe_customer_id' };
    }
  }

  // Second, try stripe_subscription_id
  if (subscriptionId) {
    const res = await client.query(`SELECT id FROM workspaces WHERE stripe_subscription_id = $1`, [subscriptionId]);
    if (res.rows.length > 0) {
      const workspaceId = res.rows[0].id;
      return { workspaceId, customerId, subscriptionId, subscription, resolutionMethod: 'stripe_subscription_id' };
    }
  }

  // No existing association found — for checkout.session.completed, this is expected for new customer
  // For new checkout, we may need to use metadata workspaceId as candidate, but with validation and fail-safe
  if (event.type === 'checkout.session.completed' && metadataWorkspaceId) {
    // metadataWorkspaceId is from our server during checkout creation (from session.workspaceId), but treat as untrusted for safety and validate
    // Lookup workspace by metadata ID
    const wsRes = await client.query(`SELECT id, stripe_customer_id, stripe_subscription_id FROM workspaces WHERE id = $1`, [metadataWorkspaceId]);
    if (wsRes.rows.length === 0) {
      // Workspace from metadata not found — fail safely, do not guess, log for investigation
      console.error(`[webhooks] No workspace found for customer ${customerId} and metadata workspace ${metadataWorkspaceId} not found — fail safe, no entitlement change`);
      return { workspaceId: null, customerId, subscriptionId, subscription, resolutionMethod: 'metadata_not_found_fail_safe' };
    }
    const ws = wsRes.rows[0];
    // Validate: if workspace already has different stripe_customer_id, it's contradictory — fail safely
    if (ws.stripe_customer_id && ws.stripe_customer_id !== customerId) {
      console.error(`[webhooks] Contradictory association: workspace ${ws.id} has stripe_customer_id ${ws.stripe_customer_id} but event customer ${customerId} — fail safe`);
      return { workspaceId: null, customerId, subscriptionId, subscription, resolutionMethod: 'contradictory_customer_fail_safe' };
    }
    if (ws.stripe_subscription_id && ws.stripe_subscription_id !== subscriptionId) {
      console.error(`[webhooks] Contradictory subscription: workspace ${ws.id} has sub ${ws.stripe_subscription_id} but event sub ${subscriptionId} — fail safe`);
      return { workspaceId: null, customerId, subscriptionId, subscription, resolutionMethod: 'contradictory_subscription_fail_safe' };
    }
    // For new checkout, workspace has no stripe_customer_id yet, so allow using metadata as candidate with validation
    // But also validate that subscription's customer matches customerId (authoritative)
    // Fetch authoritative subscription if not already
    if (!subscription && subscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch (err: any) {
        if (err.code === 'resource_missing' || err.statusCode === 404) {
          // Treat as deletion only after confirming subscription ID and existing workspace association — see below
          // For checkout.session.completed, resource_missing should not happen, but handle
          console.log(`[webhooks] Subscription ${subscriptionId} not retrievable during checkout, treating as not found`);
          subscription = null;
        } else {
          throw err; // API failure → will cause ROLLBACK and 500, not acked
        }
      }
    }
    if (subscription && subscription.customer as string !== customerId) {
      console.error(`[webhooks] Subscription customer mismatch: sub customer ${subscription.customer} vs event customer ${customerId} — fail safe`);
      return { workspaceId: null, customerId, subscriptionId, subscription, resolutionMethod: 'customer_mismatch_fail_safe' };
    }
    // Use metadata workspaceId as candidate for new checkout, with validation passed
    console.log(`[webhooks] Resolving workspace via metadata for new checkout: ${metadataWorkspaceId} (validated, no existing association)`);
    return { workspaceId: metadataWorkspaceId, customerId, subscriptionId, subscription, resolutionMethod: 'metadata_for_new_checkout_validated' };
  }

  // No association found and no metadata or not checkout event — fail safely, do not guess workspace, log for investigation
  console.error(`[webhooks] No workspace association found for event ${event.id} type ${event.type} customer ${customerId} subscription ${subscriptionId} — fail safe, no entitlement change`);
  return { workspaceId: null, customerId, subscriptionId, subscription, resolutionMethod: 'no_association_fail_safe' };
}
```

- **Resolve via verified persisted association**: First try `stripe_customer_id`, then `stripe_subscription_id` — these are verified, persisted from previous successful webhook processing, not metadata.
- **Metadata only secondary check**: For `checkout.session.completed` new customer where no existing association, use metadata workspaceId as candidate but validate: workspace exists, its existing stripe_customer_id is null or matches event customerId, its stripe_subscription_id null or matches, subscription's customer matches event customerId. If contradictory, fail safely and log, do not grant/revoke entitlement against guessed workspace.
- **Fail safely**: If association missing or contradictory, do not grant or revoke entitlement, return workspaceId null, log event for investigation, return 200? Or return 500? For missing association, we should log and return 200 with no entitlement change? Actually if no association found, we should not update any workspace, but we should still mark event as processed? Or return 500? Decision: If no association found and it's not a new checkout (where metadata can be used), fail safely — log, do not update, but mark event as processed? Or return 200 with no update? Better to return 200 with log, not 500, because Stripe will retry indefinitely if we return 500, but if no association, retry won't help. So we should return 200 with no entitlement change and log for manual investigation. However if it's a new checkout and we used metadata validated, we should update.

- **Resource_missing handling**: Treat Stripe's `resource_missing` response as deletion signal only after confirming subscription ID and its existing workspace association. A missing or mismatched resource should not be enough to downgrade workspace selected from untrusted event data.

```ts
try {
  subscription = await stripe.subscriptions.retrieve(subscriptionId);
} catch (err: any) {
  if (err.code === 'resource_missing' || err.statusCode === 404) {
    // Confirm subscription ID and existing workspace association before treating as deletion
    if (!subscriptionId) {
      console.error(`[webhooks] resource_missing but no subscriptionId in event ${event.id} — fail safe, no downgrade`);
      return { workspaceId: null, ... }; // fail safe, do not downgrade guessed workspace
    }
    // Check if we have existing workspace association for this subscriptionId
    const assocRes = await client.query(`SELECT id FROM workspaces WHERE stripe_subscription_id = $1`, [subscriptionId]);
    if (assocRes.rows.length === 0) {
      console.error(`[webhooks] resource_missing for subscription ${subscriptionId} but no existing workspace association — fail safe, no downgrade`);
      return { workspaceId: null, ... }; // fail safe, no association to downgrade
    }
    // Has existing association — treat as deleted, downgrade that workspace
    console.log(`[webhooks] Subscription ${subscriptionId} not retrievable, has existing association, treating as deleted`);
    subscription = null; // will trigger downgrade to starter for that workspace
  } else {
    // API failure — do not mark as processed, return 500 so Stripe retries
    await client.query('ROLLBACK');
    return 500
  }
}
```

- **Do not downgrade workspace selected from untrusted event data**: If we resolved workspace via metadata (untrusted) and then get resource_missing, do not downgrade that workspace — only downgrade if workspace was resolved via verified persisted association (stripe_customer_id or stripe_subscription_id).

3. **Idempotency & transactional dedup + entitlement**:

```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Idempotency check
  const insertRes = await client.query(
    `INSERT INTO stripe_webhook_events (id, type, workspace_id, data, stripe_created)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [event.id, event.type, workspaceId, JSON.stringify(event), event.created]
  );
  if (insertRes.rows.length === 0) {
    await client.query('ROLLBACK');
    return duplicate true
  }

  // Serialize per workspace via row locking — P1-3
  if (workspaceId) {
    await client.query(`SELECT id FROM workspaces WHERE id = $1 FOR UPDATE`, [workspaceId]);
  }

  // Resolve workspace via trusted method (see above) — already done before BEGIN? Actually should be inside transaction after locking? Better to resolve before locking, but then lock resolved workspace
  // For simplicity, resolve before BEGIN, then lock inside

  // ... fetch authoritative subscription, derive plan, update workspace ...

  await client.query(`UPDATE stripe_webhook_events SET processed_at = NOW() WHERE id = $1`, [event.id]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  return 500 not acked
} finally {
  client.release();
}
```

- Deduplication and entitlement in same transaction — if DB fails, not acked, Stripe retries.
- Row locking `SELECT ... FOR UPDATE` serializes concurrent handlers per workspace, preventing stale overwrite.

### 2.3 P1 — Billing State Authoritative with Enforceable Grace and Safe Allowlist (Corrections P1-1, P1-2, P1-3)

**Goal**: Map price IDs to allowed plans safely, validate subscription status and workspace association, explicitly decide trialing, past_due with persisted start time, unpaid, cancellation at period end, deleted — never grant paid access via metadata.

**Correction P1-1**: past_due grace enforceable with persisted past_due_since — see 2.3 in v1.2 but now with workspace columns added in Phase 3, not Phase 1.

**Workspaces columns — Phase 3 only** (not Phase 1):

```sql
-- Phase 3 migration: billing columns
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'escala'));
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_interval IN ('monthly', 'annual'));
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS signing_secret TEXT;
```

**Billing lib** `src/lib/billing.ts` with safe buildPriceMap (skip missing, reject duplicates) and getPlanFromSubscriptionStatus with past_due_since handling — see v1.2 for full code, now with Phase 3 columns.

**Explicit decisions table** (same as v1.2 but with past_due_since handling):

| Stripe Status | cancel_at_period_end | Period End > Now? | existingPastDueSince | Has Paid Access? | Plan | past_due_since |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| trialing | any | yes | any | Yes | mapped | clear null |
| active | false | yes | any | Yes | mapped | clear null |
| active | true | yes | any | Yes | mapped | clear null, grant until period end |
| past_due | any | yes | null | Yes (grace) | mapped | set now, start clock |
| past_due | any | yes | existing | Yes if within 7d else No | mapped or starter | keep existing, don't restart, check expiry |
| unpaid | any | any | any | No | starter | clear null |
| canceled | false | any | any | No | starter | clear |
| canceled | true | yes | any | Yes | mapped | grant until period end |
| canceled | true | no | any | No | starter | clear |
| incomplete etc | any | any | any | No | starter | clear |

- Do not restart grace period on repeated webhooks.
- Downgrade after 7d if still past_due.
- Test repeated webhooks.

**Checkout route**: Validate plan/interval allowlist, map to priceId safely, workspace auth from session only (see 2.4), lookup customer, idempotency, generic success URL, do not trust metadata for entitlement.

**Webhook entitlement**: Derive plan from verified price and status via getPlanFromSubscriptionStatus with existingPastDueSince, handle deleted and API failures, row locking, audit log, never use untrusted metadata to select workspace (see 2.2).

**Tests**: Plan/price mismatch, unauthorized workspace, missing config, duplicate price IDs, past_due grace start/expiry, repeated webhooks not restarting clock, concurrent handlers with row locking.

### 2.4 & 2.5 Workspace Authorization Consistency & Primary Workspace Selection (Adjustment #4 + Review Point #4)

**Goal**: Define primary workspace selection, validate membership and required role on every billing operation, never fallback to caller-provided ID.

**Review Point #4**: Most recent active membership deterministic default but not proof for billing. requireWorkspaceAdmin must validate authenticated user, requested workspace, active membership, required role every operation.

**Secure design**:

1. **Primary workspace selection**: Most recent active membership ORDER BY created_at DESC LIMIT 1. Document. For billing, primary is default, but user can switch via `/workspaces/[slug]` with membership validation. If no membership, session workspaceId undefined → billing fails 400, never fallback to client ID.

2. **Workspace membership validation every billing op**:

```ts
async function requireWorkspaceAdmin(client: PoolClient, userId: string, workspaceId: string): Promise<void> {
  const res = await client.query(`SELECT role, status FROM workspace_members WHERE user_id = $1 AND workspace_id = $2`, [userId, workspaceId]);
  if (res.rows.length === 0) throw new Error('Not member');
  const { role, status } = res.rows[0];
  if (status !== 'ACTIVE' && status !== 'active') throw new Error('Membership not active');
  if (!['admin','owner','WORKSPACE_OWNER'].includes(role)) throw new Error('Requires admin');
}
```

In checkout:

```ts
const session = await getSession(request);
if (!session) return 401
const workspaceId = session.workspaceId;
if (!workspaceId) return 400 No workspace context — never fallback to body.workspaceId
await requireWorkspaceAdmin(client, session.userId, workspaceId);
```

- Never `body.workspaceId || session.workspaceId` — use only session, validate if body provided and different.

3. **SessionData**: workspaceId, workspaceRole, platform role separation.

4. **Tests**: Primary selection, unauthorized workspace, missing session, role checks, integration signup→login→checkout.

**Integration**: Phases 4-5 tested together.

### 2.6 Rate Limiting Proxy Trust Boundary & Trustworthy Fallback (Adjustment #5 + Review Point #5)

**Goal**: Document prod deployment assumptions, sanitize forwarding headers at trusted edge, safe fallback using trustworthy session/account identifier, not shared unknown bucket, test Redis failure per tier.

**Review Point #5**: Using unknown avoids spoofed IPs but collapses into shared bucket → DoS risk. Confirm fallback really uses trustworthy session/account identifier where available, and shared fallback cannot create easy DoS for unrelated users.

**Secure design**:

1. **Production deployment assumptions** (LOCAL-SETUP-GUIDE):

- Production behind Vercel/Cloudflare/Nginx that sanitizes x-forwarded-for and sets correct client IP.
- If not behind trusted proxy, x-forwarded-for untrustworthy — use safe fallback.

2. **IP extraction with trust boundary and trustworthy fallback**:

```ts
function getClientIp(request: NextRequest): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  if (trustProxy) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for') || 'unknown';
  } else {
    if (process.env.NODE_ENV === 'development') {
      return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    }
    return 'unknown';
  }
}

function getRateLimitKey(request: NextRequest, tier: RateLimitTier): string {
  const ip = getClientIp(request);
  const sessionCookie = request.cookies.get('okeng.sid')?.value || request.cookies.get('__Host-okeng.sid')?.value;
  const sessionId = sessionCookie ? sessionCookie.slice(0, 8) : 'no-session';
  // Trustworthy identifier: sessionId from httpOnly signed cookie is trustworthy (set by server, signed)
  // If ip unknown and sessionId present, key per session not shared
  // If both unknown and no-session, shared bucket — mitigate with higher limit or separate bucket
  // For MVP, keep ip:sessionId, but document that unknown:no-session bucket shared could cause DoS, so production must set TRUST_PROXY=true
  // For AUTH tier, if ip unknown and no session, use global bucket with higher limit? Actually AUTH limit 5 per 15m shared would cause DoS, so use higher limit for this bucket
  // Decision: For AUTH, if ip unknown and no session, use rate_limit:AUTH:fallback:unknown-no-session with limit 20 per 15m instead of 5? Or use user-agent hash? For this plan, document and use sessionId as primary fallback
  return `rate_limit:${tier}:${ip}:${sessionId}`;
}
```

- **Trustworthy identifier**: sessionId from httpOnly signed cookie is trustworthy (server-set, HMAC, httpOnly).
- **Shared bucket DoS mitigation**: If both IP unknown and no-session, key `unknown:no-session` shared across all unauthenticated unknown IP requests → one attacker could block all unauthenticated logins (DoS). Mitigation: production must set TRUST_PROXY=true so unknown case should not happen in prod; in dev, higher limit for unknown:no-session bucket or separate bucket; or use anonymous ID cookie; or require that AUTH tier with unknown IP and no session still rate limits but with higher threshold and monitoring.
- **Document**: TRUST_PROXY env, prod assumptions.

3. **Sanitize headers at trusted edge**: proxy.ts defense-in-depth, document.

4. **Fail-closed AUTH on Redis outage**: AUTH → 429 fail-closed, READ/WRITE → success true fail-open.

5. **Accurate TTL**: redis.ttl.

6. **Tests**: Spoofed-header TRUST_PROXY true/false, fallback trustworthy sessionId, shared bucket DoS, Redis outage per tier, TTL, proxy docs.

### 2.7 Migration Ownership and Operational Execution (Correction P2-4)

**Goal**: Single authoritative migration path, avoid drift, no uncontrolled DDL at runtime.

**Correction P2-4**: Two mechanisms can drift, runtime DDL risky. Designate one authoritative path.

**Secure design**:

1. **Authoritative path**: Supabase migrations `supabase/migrations/*.sql` source of truth, versioned by timestamp, applied via Supabase CLI `supabase db push` or `supabase migration up` in staging/prod, `supabase db reset` in dev.

2. **Direct PG deployments**: Same SQL files applied via versioned runner `src/lib/migrate.ts` or `scripts/migrate.ts` that tracks `schema_migrations` table, runs SQL files in order only if not applied, explicit `npm run migrate`, not app startup. Requires DATABASE_URL, fails fast.

3. **No app-startup DDL**: Remove CREATE TABLE IF NOT EXISTS from db.ts or API routes. All schema via versioned migrations.

4. **If both Supabase and direct PG supported**: Document in LOCAL-SETUP-GUIDE and DB-01: Supabase via CLI, direct PG via `npm run migrate` reading same SQL files, tracking schema_migrations, no RLS or manual RLS, same versioned schema.

5. **Operational execution**: Dev `npm run migrate` or `supabase db reset`, staging/prod CI/CD runs `supabase db push` or `npm run migrate` before deployment, not runtime. Permissions: migration runner requires DB owner/migration role, not app role.

6. **Phase scoping**: Phase 1 migration only password_reset_tokens, Phase 2 only stripe_webhook_events, Phase 3 only workspaces billing columns + past_due_since etc. Migration-runner work handled separately if prerequisite, explicitly scoped and verified — e.g., create migration runner in Phase 0 or Phase 1 prerequisite with its own verification.

---

## 3. DB Migrations & Schema Changes (Amended v1.3 — Scoped per Phase)

### 3.1 Phase 1: password_reset_tokens only

`supabase/migrations/20261011000005_password_reset_tokens.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (...);
-- only password reset, not webhook or billing columns
```

### 3.2 Phase 2: stripe_webhook_events

`supabase/migrations/20261011000006_stripe_webhook_events.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  workspace_id TEXT,
  data JSONB,
  stripe_created BIGINT
);
CREATE UNIQUE INDEX idx_stripe_webhook_events_id ON public.stripe_webhook_events(id);
```

### 3.3 Phase 3: workspaces billing columns + past_due_since

`supabase/migrations/20261011000007_workspaces_billing.sql`:

```sql
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'escala'));
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_interval IN ('monthly', 'annual'));
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS signing_secret TEXT;
```

### 3.4 Env Vars

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET= # required prod/staging fail-closed
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_ESCALA_MONTHLY_PRICE_ID=
STRIPE_ESCALA_ANNUAL_PRICE_ID=
TRUST_PROXY=true
OKENG_ENABLE_PASSWORD_RESET=false
```

### 3.5 Migration Runner

- Authoritative: Supabase migrations.
- Direct PG: src/lib/migrate.ts versioned runner reading supabase/migrations in order, tracking schema_migrations, explicit npm run migrate, no app-startup DDL.
- Phase 1 runner only applies password_reset_tokens migration if prerequisite.

---

## 4. API Changes — Detailed (Amended v1.3)

### 4.1 forgot-password

- Generic success, no enumeration.
- If user exists, generate 256-bit token, SHA256 hash, expiry 1h, invalidate old, store IP, rate limit per IP and per email.
- Dev log token only if dev.
- Tests.

### 4.2 reset-password

- Interim 501 if OKENG_ENABLE_PASSWORD_RESET=false or table not exists, ensure cannot modify passwords until implemented.
- When enabled, **single transaction** atomic UPDATE ... RETURNING + password update + invalidate others + COMMIT, ROLLBACK on failure, hash only after validation.
- Tests with concurrent reuse, transaction failure.

### 4.3 webhooks

- Fail-closed prod/staging if secret missing, require signature, Node.js runtime.
- **Idempotency**: stripe_webhook_events uniqueness, transactional dedup+entitlement, do not ack if DB fails (500 Stripe retry).
- **Trusted workspace resolution**: Resolve via verified persisted stripe_customer_id or stripe_subscription_id, not metadata. Metadata only secondary consistency check/diagnostics. If association missing or contradictory, fail safely and log, do not grant/revoke entitlement against guessed workspace.
- **Resource_missing**: Treat as deletion only after confirming subscription ID and existing workspace association. Missing/mismatched resource should not downgrade workspace selected from untrusted event data.
- **Out-of-order**: Fetch authoritative subscription via Stripe API, handle deleted and API failures, row locking SELECT ... FOR UPDATE per workspace to serialize concurrent handlers, store stripe_created for ordering.
- **Billing state authoritative**: Derive plan from verified price and status with past_due_since, not metadata.
- Audit log.

### 4.4 checkout

- Validate plan/interval allowlist, map to priceId safely (skip missing, reject duplicates at startup), 400 if not configured.
- Workspace auth: use session.workspaceId only, validate membership admin via requireWorkspaceAdmin, never fallback to caller-provided when session missing, if body.workspaceId different validate permission.
- Lookup stripe_customer_id, create session with customer, idempotency, generic success URL.

### 4.5 signup

- Transaction BEGIN/COMMIT/ROLLBACK, handle slug collision.

### 4.6 login

- Query users, verify password, query workspace_members primary workspace ORDER BY created_at DESC LIMIT 1, populate session workspaceId and workspaceRole, extend SessionData.

### 4.7 rateLimit

- Harden IP extraction with TRUST_PROXY, safe fallback using trustworthy sessionId where available, not shared unknown bucket, shared bucket DoS mitigation higher limit or separate, fail-closed AUTH on Redis error, fail-open others, accurate TTL.

---

## 5. Testing Plan — With Verification Gates (Amended v1.3)

### 5.1 Baseline

Record baseline before changes: build, homepage 52/52, embed 29/29, lint, tsc. Treat 52/52+29/29 as baseline to verify not guaranteed, investigate failures not weaken tests, report actual results.

### 5.2 Password Reset Tests (Phase 1 Gate: Negative Security + Atomicity + Scoped Migration)

- Valid, expired, used, invalid, UUID → 400.
- **Concurrent reuse**: Promise.all same token → only one succeeds, second 400, transaction atomic, password only updated once.
- **Failure between consumption and password update**: mock throw on second query → ROLLBACK, token not consumed, retry possible.
- Enumeration, rate limiting, bcrypt not called on invalid.
- **Scoped migration**: Phase 1 only creates password_reset_tokens table, not webhook or billing columns — verify migration file only contains password reset.

### 5.3 Webhook Tests (Phase 2 Gate: Negative Security + Idempotency + Recoverable + Concurrency + Trusted Resolution)

- No secret prod → 500 fail-closed, dev → warning.
- Invalid signature → 400.
- Price not in allowlist → no update.
- Valid price pro_monthly → update to pro.
- Forged without signature prod → 500.
- **Duplicate event ID**: same ID twice → second duplicate true, no re-processing.
- **DB failure**: mock throw on UPDATE → 500 not acked, event not marked processed.
- **Out-of-order**: past_due then active, ensure final active via authoritative fetch.
- **Deleted subscription**: resource_missing → downgrade to starter only if existing workspace association confirmed, else fail safe no downgrade.
- **API failure**: network error → 500 not acked, Stripe retry.
- **Concurrent handlers**: Promise.all two handlers same workspace different states → row locking serializes, last writer wins with authoritative state, no stale overwrite.
- **Trusted workspace resolution**: No association found → fail safe no entitlement change, log; contradictory association (workspace has different customer ID) → fail safe; metadata only secondary check; resource_missing without existing association → fail safe no downgrade.

### 5.4 Checkout Tests (Phase 3 Gate: Plan/Price Mismatch + Unauthorized Workspace + Missing Config + Grace)

- Valid pro monthly → url, priceId pro monthly.
- Escala monthly no price → 400.
- Client tries escala while paying pro → server maps plan to priceId, cannot get escala entitlement while paying pro.
- Invalid plan → 400.
- WorkspaceId from body but session different and user not admin → 403.
- No session workspaceId → 400, not fallback.
- **Missing env config**: price ID missing → buildPriceMap skips, checkout with that plan → 400, no "undefined" key.
- **Duplicate price IDs**: same price ID for different plans → throw at startup.
- **Past_due grace**: start time persisted, repeated webhooks don't restart clock, expiry after 7d downgrades.

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
- TTL, retry, proxy docs.

### 5.8 Existing Suites (Phase 7 Gate: Preserve Existing Behavior)

- Build PASS — record actual routes.
- Homepage 52/52 baseline, embed 29/29 baseline — record, investigate failures.
- Lint 0 errors, tsc check.
- Manual verification: forgot→reset flow, webhook test signature, checkout valid/invalid, unauthorized workspace, past_due grace, concurrent handlers.
- **Gate rule**: Phase not complete merely because tests pass — must also preserve relevant existing behavior and demonstrate security invariant holds. Report actual results.

---

## 6. Phased Execution Plan — Amended v1.3 with Scoped Migrations and Trusted Resolution (Awaiting Signal for Phase 1 Only)

**Phase 0 — This doc v1.3 (0.5 day)** — DONE: Incorporate 2 final corrections (scoped Phase 1 migration, never use untrusted metadata to select workspace) + preserve v1.2 improvements, verification gates, baseline recording, await explicit signal for Phase 1 only.

**Phase 1 — P0 Password Reset with Atomic Consumption in Single Transaction Scoped Migration (1 day)** — After explicit signal for Phase 1 only:
- **Scoped migration**: Create migration `20261011000005_password_reset_tokens.sql` only — password_reset_tokens table, not webhook or billing columns. Migration-runner work handled separately if prerequisite, explicitly scoped and verified (e.g., runner only applies password_reset_tokens migration if needed, or document that Supabase migrations are authoritative and runner not used for Phase 1).
- Implement forgot-password token generation (256-bit, SHA256 hash, expiry 1h, invalidate old, IP, rate limit).
- Implement reset-password with **single transaction** atomic UPDATE ... RETURNING + password update + invalidate others + COMMIT, ROLLBACK on failure, hash only after validation, interim 501 if OKENG_ENABLE_PASSWORD_RESET=false.
- Add tests password-reset.test.ts with negative, concurrent reuse, transaction failure, scoped migration verification.
- **Verification gate**: negative security tests, concurrent reuse, transaction atomicity (token consumption and password update in single transaction), preserve existing behavior (build, existing tests baseline), report actual results, demonstrate security invariant holds (no UUID takeover, no concurrent reuse).
- Commit: `fix(AUTH): secure password-reset atomic consumption single transaction scoped migration (P0)`

**Phase 2 — P0 Stripe Webhook Fail-Closed Idempotent Recoverable with Trusted Workspace Resolution (0.5 day)** — Awaiting separate signal after Phase 1:
- **Scoped migration**: Create `20261011000006_stripe_webhook_events.sql` only — stripe_webhook_events table, not billing columns.
- Update webhooks/route.ts fail-closed prod/staging, require signature, Node.js runtime, idempotency via stripe_webhook_events uniqueness, transactional dedup+entitlement, do not ack if DB fails, handle deleted subscriptions and API failures, out-of-order via fetching authoritative subscription, row locking SELECT ... FOR UPDATE per workspace to serialize concurrent handlers, **never use untrusted metadata to select workspace** — resolve via verified persisted stripe_customer_id or stripe_subscription_id, metadata only secondary consistency check/diagnostics, fail safely if missing/contradictory, treat resource_missing as deletion only after confirming subscription ID and existing workspace association, missing/mismatched resource should not downgrade workspace selected from untrusted event data.
- Add tests billing-webhook.test.ts with negative, duplicate, DB failure, deleted handling with association confirmation, API failure, out-of-order, concurrent handlers, trusted workspace resolution (no association fail safe, contradictory fail safe, metadata secondary).
- **Verification gate**: negative, duplicate, DB failure not acked, deleted handling with association, concurrent with row locking, trusted resolution, preserve existing.
- Commit: `fix(BILLING): strict webhook signature fail-closed idempotent recoverable trusted workspace resolution (P0)`

**Phase 3 — P1 Billing State Authoritative with Enforceable Grace and Safe Allowlist (1 day)** — Awaiting separate signal:
- **Scoped migration**: Create `20261011000007_workspaces_billing.sql` — workspaces billing columns past_due_since, stripe_subscription_status, stripe_current_period_end, stripe_cancel_at_period_end, stripe_customer_id, stripe_subscription_id, plan, plan_interval, public_key, signing_secret.
- Create src/lib/billing.ts with safe buildPriceMap (skip missing/empty, reject duplicates at startup), PLAN_PRICE_MAP, PRICE_ID_TO_PLAN, PLAN_LIMITS, getPlanFromSubscriptionStatus with persisted past_due_since, explicit status handling trialing, past_due with 7d grace start only on transition, don't restart clock, unpaid, canceled at period end based on authoritative state and period end.
- Update checkout/route.ts validate plan/interval allowlist, map to priceId safely, workspace auth from session only, lookup customer, idempotency, generic success URL.
- Update webhooks/route.ts derive plan from verified price and status with past_due_since handling, audit log.
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
- Manual verification: forgot→reset flow, webhook test signature, checkout valid/invalid, unauthorized workspace, past_due grace, concurrent handlers, trusted workspace resolution.
- Update LOCAL-SETUP-GUIDE with secure flows, env vars, billing state authoritative with grace, proxy trust boundary, migration ownership.
- **Verification gate**: existing regression suites, new tests, build, lint, manual verification, report actual results not assumed.
- Commit: `test(SEC): add regression tests for P0/P1 with enforceable guarantees (PLAN-008)`

**Phase 8 — Push & PR Update (0.5 day)** — Awaiting separate signal:
- Review final diff, verify committed changes and clean working tree, push branch, update PR with test evidence.
- **Verification gate**: final diff review, clean working tree, push, PR update with test evidence.
- Commit: `docs(PLAN-008): mark execution completed — P0/P1 security billing hardening with atomic guarantees and verification gates`

**Important**: Keep phases sequential and independently verifiable, especially password-reset and webhook fixes. Next step after this plan review is explicitly authorize Phase 1 only — not treat plan review as authorization for all 8 phases. Keep OKENG_ENABLE_PASSWORD_RESET=false until full reset flow and delivery verified. Webhook row locking and authoritative Stripe retrieval must be coordinated carefully — ensure concurrent handlers cannot commit stale entitlement, and failed Stripe retrieval or DB transaction cannot leave event permanently marked as processed.

---

## 7. Risks & Rollback (Amended v1.3)

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Password reset token table migration fails | Medium | High | Test in staging, rollback DROP TABLE, keep endpoint 501 until migration success, single transaction atomic consumption, scoped migration Phase 1 only |
| Concurrent token reuse race still possible | Low | High | UPDATE ... RETURNING with used_at IS NULL and expires_at > NOW() in single transaction with password update, test Promise.all concurrent |
| Token consumed without password reset (failure between) | Medium | High | Single transaction token consumption + password update + COMMIT, ROLLBACK on failure, token remains valid for retry |
| Stripe webhook fail-closed breaks dev without secret | Low | Medium | Allow dev bypass only NODE_ENV=development AND OKENG_ENV=development, document, fail-closed only prod/staging, idempotency |
| Webhook uses untrusted metadata to select workspace (P1-2 final correction) | High if not fixed | High | Resolve workspace via verified persisted stripe_customer_id or stripe_subscription_id, not metadata, metadata only secondary check/diagnostics, fail safely if missing/contradictory, log for investigation |
| Webhook resource_missing downgrades guessed workspace (P1-2) | Medium | High | Treat resource_missing as deletion only after confirming subscription ID and existing workspace association, missing/mismatched resource should not downgrade workspace selected from untrusted event data |
| Webhook out-of-order stale overwrite | Medium | High | Fetch authoritative subscription via Stripe API, row locking SELECT ... FOR UPDATE per workspace to serialize concurrent handlers, store event created, test concurrent handlers |
| Webhook DB failure acked as success | High if not handled | High | Deduplication + entitlement in same transaction, do not ack if DB fails (500), Stripe retry, test DB failure |
| Past_due grace indefinite (P1-1) | High if not persisted | High | Persist past_due_since, start only on transition into past_due, don't restart on repeated webhooks, downgrade after 7d, test repeated webhooks |
| Price allowlist undefined key (P1-2) | Medium | High | Build reverse map only from configured non-empty price IDs, reject duplicates at startup, test partial/missing env |
| Concurrent webhook race (P1-3) | Medium | High | Serialize per workspace via SELECT ... FOR UPDATE row locking inside transaction, define stale rejection, test concurrent handlers |
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

## 8. References (Amended v1.3)

- Review findings: P0 password reset UUID takeover, P0 webhook forged events, P1 checkout plan metadata trust, P1 signup non-atomic, P1 session workspace roles, P1 rate limiting IP spoofing.
- First review 5 adjustments: atomic token consumption, webhook idempotency recoverable, billing state authoritative, workspace auth consistency, proxy trust boundary + verification gates.
- Second review 4 corrections: P1-1 past_due grace not enforceable needs persisted past_due_since, P1-2 price allowlist safe handling missing config, P1-3 concurrency strategy row locking, P2-4 migration ownership single authoritative path + 5 remaining points: password-reset atomicity single transaction, webhook recoverable deleted handling, subscription status policy period end, workspace auth consistency, rate-limit fallback trustworthy identifier.
- Final review 2 corrections: P1-1 Phase 1 migration scoped to password reset only (not webhook/billing columns), P1-2 never use untrusted webhook metadata to select workspace whose entitlement will change — resolve via verified persisted Stripe customer/subscription association, metadata only secondary check, fail safely if missing/contradictory, treat resource_missing as deletion only after confirming subscription ID and existing workspace association.
- Current code: reset-password 61 lines UUID, webhooks 106 lines JSON.parse without signature, checkout 79 lines client plan in metadata, signup 81 lines separate queries, login 68 lines no workspaceId, rateLimit 60 lines x-forwarded-for spoofable, auth.ts 126 lines HMAC-SHA256.
- Supabase schema: 20261003000001 201 lines, 20261009000003 936 lines RLS, no password_reset_tokens, no stripe columns, no past_due_since.
- OWASP password reset: random 256-bit, hash at rest, expiry 15m-1h, single-use, atomic consumption UPDATE ... RETURNING in single transaction with password update, hash only after validation, scoped migration.
- Stripe: webhook signatures, idempotency event ID uniqueness, transactional dedup+entitlement, do not ack if DB fails, fetch authoritative subscription to handle out-of-order and deleted, row locking SELECT ... FOR UPDATE per workspace to serialize concurrent handlers, subscription status trialing, past_due with persisted start time, unpaid, canceled at period end, deleted, **never use untrusted metadata to select workspace**, resolve via verified persisted association, metadata only secondary check, fail safely, resource_missing only after confirming association.
- Billing: safe price allowlist building only from configured non-empty IDs, reject duplicates at startup, entitlement from verified price and status, never metadata, scoped migrations per phase.
- Workspace auth: primary workspace most recent active membership ORDER BY created_at DESC LIMIT 1 deterministic default but not proof for billing, requireWorkspaceAdmin validates user, workspace, active membership, required role every operation, never fallback to caller-provided when session missing.
- Rate limiting: proxy trust boundary TRUST_PROXY, Vercel/Cloudflare/Nginx sanitizes, safe fallback using trustworthy sessionId (httpOnly signed cookie) where available, not shared unknown bucket, shared bucket DoS mitigation higher limit or separate, per-tier failure behavior AUTH fail-closed READ/WRITE fail-open.

---

*Amended plan v1.3 incorporating final review 2 corrections — scoped Phase 1 migration to password reset only, never use untrusted webhook metadata to select workspace whose entitlement will change (resolve via verified persisted Stripe customer/subscription association, metadata only secondary check, fail safely if missing/contradictory, resource_missing only after confirming association) + preserves v1.2 improvements: persisted past_due_since, safe price map, row locking concurrency, single authoritative migration path, single transaction atomicity, idempotent recoverable webhook, authoritative billing status, consistent workspace auth, trustworthy rate-limit fallback, verification gates per phase, baseline recording, OKENG_ENABLE_PASSWORD_RESET=false until verified. Awaiting explicit signal for Phase 1 only.*
