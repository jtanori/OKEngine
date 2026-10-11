# PLAN-008 — Security & Billing Hardening: Resolution Plan for P0/P1 Review Findings (Amended v1.1)

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-008` |
| **Status** | `DRAFT v1.1 — AMENDED PER REVIEW — AWAITING SIGNAL` |
| **Owner** | Engineering & Security |
| **Authority** | Blocking — P0 Security, P1 Billing & Auth |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `STG-01`, `AUTH-01..03`, `PLAN-007`, `LOCAL-SETUP-GUIDE v2.0`, `00_product_contract` |
| **Revision** | `1.1 (2026-10-11)` — Amended per reviewer 5 adjustments: atomic token consumption, webhook idempotency & recoverable, billing state authoritative, workspace auth consistency, proxy trust boundary + verification gates |
| **Review Source** | User-provided P0/P1 review + reviewer feedback on PLAN-008 v1.0: make security guarantees enforceable in code, not just documented |
| **Original Findings** | P0 password reset account takeover via UUID, P0 Stripe webhook forged events when secret absent, P1 checkout plan metadata trust, P1 signup non-atomic, P1 session workspace roles missing, P1 rate limiting IP spoofing |

---

## 0. Goal & Merge Gate (Amended)

Fix exploitable security issues, tenant isolation, billing entitlement, auth flows before merging PR #1. Distinguish concrete code findings from runtime verification risks. **Key principle from review**: security guarantees must be enforceable in code, not just documented.

**Merge gate (from review) — must have before merge**:
- [ ] Secure password-reset token generation, verification, expiry, single-use enforcement with atomic consumption (P0)
- [ ] Strict Stripe webhook signature verification fail-closed in staging/production, idempotent & recoverable processing (P0)
- [ ] Server-side plan and price validation with entitlement derived from verified Stripe price and subscription status, not client metadata (P1)
- [ ] Atomic signup (user+workspace+membership transaction) and verified workspace-role resolution with consistent primary workspace selection (P1)
- [ ] Rate limiting IP extraction hardened with explicit proxy trust boundary, fail-closed for AUTH tier on Redis outage (P1)
- [ ] Regression tests covering security and billing cases with negative tests
- [ ] Successful production build, lint, and existing test suites — baseline 52/52 + 29/29 to verify, not guaranteed, investigate failures not weaken tests

**Scope note**: Code-inspection review response, not verified CI run. Plan includes runtime verification steps and verification gates per phase.

**User instruction**: "Please build a resolution plan, show it to me and wait for my signal." + "Here is my review on your plan, please amend your plans as recommended, show it again and wait for me" — So this doc is amended plan only, no code changes yet, awaiting signal.

**Reviewer approval note**: Reviewer said plan looks directionally sound, would approve approach with security and sequencing adjustments. Key is enforceable guarantees. Recommendation: Approve PLAN-008 for implementation after incorporating safeguards, keep phases sequential and independently verifiable, especially password-reset and webhook fixes. Next step is review committed plan itself against criteria, then begin Phase 1 only after that review is complete.

---

## 1. Current State Audit — Findings Confirmed (Unchanged from v1.0)

### 1.1 P0 — Password reset permits account takeover

**File**: `src/app/api/auth/reset-password/route.ts` (61 lines)

```ts
// TODO: Validate token from DB or JWT — for MVP, just check token exists
if (!token) return 400
const isUuid = /^[0-9a-f]{8}-...$/i.test(token);
if (isUuid) {
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, token]);
}
return { success: true }
```

- Treats user UUID as sufficient authorization — no reset-token verification.
- Anyone obtaining user ID can takeover.
- `forgot-password` (37 lines) returns generic success, no token generation.
- No `password_reset_tokens` table in migrations (`20261003000001` 201 lines, `20261009000003` 936 lines) nor pg pool.
- `resetPasswordSchema` requires token min 1, newPassword min 8, confirm match, but no format validation.

**Impact**: P0 Blocking — exploitable account takeover.

### 1.2 P0 — Stripe webhook can trust forged events

**File**: `src/app/api/billing/webhooks/route.ts` (106 lines)

```ts
if (!sig) return 400
if (!webhookSecret) console.warn('skipping validation dev only')
if (webhookSecret) {
  event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
} else {
  event = JSON.parse(body); // vulnerable
}
plan = session.metadata?.plan || 'pro'
UPDATE workspaces SET plan = $1 WHERE id = $4
```

- If secret absent, parses arbitrary JSON as Stripe event, can update plan without auth.
- No fail-closed in staging/prod, only warning.
- Uses `metadata.plan` client-controlled for entitlement.

**Impact**: P0 Blocking — forged webhook escalates plan.

### 1.3 P1 — Checkout trusts client-supplied plan metadata

**File**: `src/app/api/billing/checkout/route.ts` (79 lines)

```ts
const plan = body.plan || 'pro';
const interval = body.interval || 'monthly';
const workspaceId = body.workspaceId || session.workspaceId;
const proMonthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
const priceId = interval === 'annual' ? proAnnualPriceId : proMonthlyPriceId;
metadata: { workspaceId, plan, interval, userId }
```

- Accepts plan/interval from client, includes in metadata, webhook uses metadata for entitlement — client could request escala while paying Pro price.
- No allowlist, no plan→price mapping, workspaceId from body or session (session missing on login).
- Success/cancel URLs include plan from client, no idempotency, no customer lookup.

**Impact**: P1 Required — wrong limits, entitlement escalation.

### 1.4 P1 — Signup not atomic

**File**: `src/app/api/auth/signup/route.ts` (81 lines) — 3 separate INSERT without transaction.

**Impact**: P1 — partial account state.

### 1.5 P1 — Session and workspace roles

**Files**: `signup` assigns admin via `workspace_members`, `login` reads `users.role` not `workspace_members`, no `workspaceId` in session.

- `users` table Supabase has `platform_role`, pg pool uses `users.role` and `workspace_members` role `admin`/`member` vs Supabase `workspace_memberships` `WORKSPACE_OWNER`/`WORKSPACE_USER` — inconsistency.
- Login does not resolve workspace membership.
- `SessionData` optional `workspaceId`, missing on login, checkout uses client-supplied workspaceId.

**Impact**: P1 — broken auth, wrong permissions, isolation risk.

### 1.6 P1 — Rate limiting IP spoofing

**File**: `src/lib/rateLimit.ts` (60 lines) — `x-forwarded-for` first entry trusted directly, fail-open on Redis error for all tiers, no accurate TTL.

**Impact**: P1 — IP limits bypassable.

---

## 2. Secure Design — Resolution with 5 Reviewer Adjustments Incorporated

### 2.1 P0 — Secure Password Reset Token Flow (Amended with Adjustment #1)

**Goal**: Random, expiring, single-use, hashed at rest, atomic consumption preventing concurrent reuse, hash password only after validation.

**Adjustment #1 from reviewer**: Prevent concurrent token reuse. Consume reset tokens atomically in DB, e.g., `UPDATE ... WHERE used_at IS NULL AND expires_at > NOW() RETURNING user_id`. Hash new password only after successful validation where practical, ensure concurrent requests cannot both succeed.

**DB Migration** `supabase/migrations/20261011000005_password_reset_tokens.sql` + pg pool equivalent:

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
-- service_role bypasses RLS, no client policies
```

For pg pool, same table in public schema via `src/lib/migrate.ts` (create if not exists).

**Token Generation** (forgot-password):

1. Always generic success to avoid enumeration.
2. If user exists, generate raw token: `crypto.randomBytes(32).toString('hex')` 64 chars 256-bit.
3. Hash SHA256: `createHash('sha256').update(rawToken).digest('hex')` — store hash, not raw.
4. Store: id UUID, user_id, token_hash, expires_at NOW()+1h (or 15m stricter), created_ip sanitized (see 2.6), user_agent.
5. Invalidate previous unused tokens for same user: `UPDATE ... SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL` OR delete — single active token.
6. Send email with link `${APP_URL}/reset-password?token=${rawToken}` — MVP dev only log token if `NODE_ENV=development` AND `OKENG_ENV=development`, never prod logs. Or return token in dev for testing.
7. Rate limit per IP and per email — AUTH tier 5 per 15m plus per-email.

**Token Verification** (reset-password) — **Amended for atomic consumption**:

1. Parse body token (raw), newPassword, confirmPassword.
2. Hash raw token SHA256 → token_hash.
3. **Atomic consumption**: Do NOT first SELECT then UPDATE — that allows race. Instead, attempt atomic UPDATE with RETURNING:

```sql
UPDATE public.password_reset_tokens
SET used_at = NOW()
WHERE token_hash = $1
  AND used_at IS NULL
  AND expires_at > NOW()
RETURNING user_id, id;
```

- If RETURNING 0 rows → token invalid, expired, or already used → 400 generic "Token inválido o expirado".
- If RETURNING user_id → token valid and now consumed atomically — concurrent requests cannot both succeed because second UPDATE will find used_at NOT NULL and return 0 rows.

4. Only AFTER successful atomic consumption, hash new password with bcrypt (cost 10) and update `users.password_hash`.

```ts
const tokenHash = sha256(rawToken);
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const res = await client.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING user_id, id`,
    [tokenHash]
  );
  if (res.rows.length === 0) {
    await client.query('ROLLBACK');
    return 400;
  }
  const userId = res.rows[0].user_id;
  // Now hash password only after validation — per reviewer: hash only after successful validation where practical
  const hash = await bcrypt.hash(newPassword, 10);
  await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
  // Invalidate other tokens for user
  await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

- Ensures concurrent requests cannot both succeed — only first UPDATE RETURNING succeeds.
- Hash password only after validation — avoids wasting bcrypt on invalid tokens (DoS mitigation) and ensures password not hashed if token invalid.
- Optionally clear Redis session keys for user to force re-login.

**Security properties**:
- Random 256-bit, hashed at rest, single-use, expiring, atomic consumption.
- No UUID takeover.
- Do not allow endpoint to modify passwords until implemented — interim return 501 if token table not exists or feature flag `OKENG_ENABLE_PASSWORD_RESET=false`. Per reviewer: safe interim provided endpoint cannot modify passwords.

**Tests** (amended):
- Generate token → stored hashed, not raw, expiry 1h, old invalidated.
- Reset valid token → password updated, token used, other tokens invalidated.
- Reset expired → 400.
- Reset used → 400 single-use.
- Reset invalid → 400.
- Reset UUID (old vuln) → 400.
- **Concurrent reuse**: two simultaneous requests with same token → only one succeeds, second 400 — test with Promise.all and transaction.
- Enumeration: non-existing email → generic success, no token.
- Rate limiting.

### 2.2 P0 — Stripe Webhook Fail-Closed & Idempotent Recoverable (Amended with Adjustment #2)

**Goal**: Fail-closed in staging/prod, require valid signature, idempotent and recoverable processing, handle out-of-order events without stale overwrite.

**Adjustment #2 from reviewer**: Make webhook processing idempotent and recoverable. Record event IDs with uniqueness constraint, commit deduplication record and entitlement changes transactionally. Do not acknowledge event as successfully processed if DB update fails. Handle out-of-order subscription events without allowing stale state to overwrite newer state.

**Current vulnerable code** (see 1.2).

**Secure design**:

1. **Fail-closed**:

```ts
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const isProd = process.env.NODE_ENV === 'production' || process.env.OKENG_ENV === 'production' || process.env.OKENG_ENV === 'staging';
if (!webhookSecret) {
  if (isProd) {
    console.error('[billing/webhooks] STRIPE_WEBHOOK_SECRET required in production');
    return NextResponse.json({ error: 'internal_error', message: 'Webhook secret not configured' }, { status: 500 });
  } else {
    console.warn('[billing/webhooks] Skipping signature validation in dev only');
  }
}
if (!sig) return 400 Missing stripe-signature
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
```

- Add `export const runtime = 'nodejs'` for Node.js runtime (Stripe needs Node).
- Do not parse JSON directly in prod/staging.

2. **Idempotency & uniqueness constraint**:

Create table `stripe_webhook_events`:

```sql
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY, -- Stripe event ID evt_...
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  workspace_id TEXT,
  data JSONB
);
CREATE UNIQUE INDEX idx_stripe_webhook_events_id ON public.stripe_webhook_events(id);
```

Processing flow:

```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Try to insert event ID with ON CONFLICT DO NOTHING
  const insertRes = await client.query(
    `INSERT INTO stripe_webhook_events (id, type, workspace_id, data) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [event.id, event.type, workspaceId, JSON.stringify(event)]
  );
  if (insertRes.rows.length === 0) {
    // Already processed — idempotent, return 200 but do not re-process
    await client.query('ROLLBACK');
    console.log(`[webhooks] Duplicate event ${event.id} already processed`);
    return NextResponse.json({ received: true, duplicate: true });
  }
  // ... process entitlement changes within same transaction ...
  // Update workspaces plan based on verified price
  // If DB update fails, ROLLBACK and return 500 — do NOT ack as success
  await client.query('UPDATE workspaces SET plan = $1, stripe_customer_id = $2, stripe_subscription_id = $3, updated_at = NOW() WHERE id = $4', [...]);
  await client.query('UPDATE stripe_webhook_events SET processed_at = NOW() WHERE id = $1', [event.id]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  console.error('[webhooks] DB error, not acking', err);
  return NextResponse.json({ error: 'internal_error', message: 'DB update failed, event not acked' }, { status: 500 });
} finally {
  client.release();
}
```

- Deduplication record and entitlement changes committed transactionally — if DB update fails, event not acked, Stripe will retry (recoverable).
- Do not acknowledge event as successfully processed if DB update fails — return 500, Stripe retries.

3. **Handle out-of-order subscription events without stale overwrite**:

Stripe subscription events may arrive out-of-order (e.g., `customer.subscription.updated` with `past_due` then `active` but processed in reverse). To avoid stale state overwriting newer:

- Store `stripe_subscription_status`, `stripe_current_period_end`, `stripe_cancel_at_period_end`, `updated_at` in workspaces table.
- When processing `customer.subscription.updated`, compare event `created` timestamp or `subscription.current_period_end` or event ID ordering? Stripe events have `created` timestamp. We should only apply update if event is newer than current DB state, or use `subscription.status` logic that is monotonic? Better: store `stripe_event_created` and only apply if event.created > stored.
- Alternatively, always fetch latest subscription from Stripe API `stripe.subscriptions.retrieve(subscriptionId)` to get authoritative current state, not rely on event payload ordering — this ensures we don't apply stale event.

```ts
// Instead of using event.data.object directly for plan mapping, fetch authoritative subscription
const subscriptionId = event.data.object.id || event.data.object.subscription;
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
const priceId = subscription.items.data[0].price.id;
const status = subscription.status; // authoritative
// Then map priceId to plan and handle status
```

- For `checkout.session.completed`, retrieve subscription via `stripe.subscriptions.retrieve(session.subscription)` to get verified price, not metadata.
- For `customer.subscription.updated`, retrieve subscription to get current status and price.
- This handles out-of-order: even if events arrive out-of-order, fetching current subscription gives latest state.

4. **Billing state authoritative** (see 2.3 for plan mapping and status handling).

5. **Tests**: Valid signature, invalid signature, missing secret prod vs dev, forged event without signature, duplicate event ID (idempotency), DB failure not acked, out-of-order events (simulate past_due then active, ensure final state active).

### 2.3 P1 — Billing State Authoritative & Plan Validation (Amended with Adjustment #3)

**Goal**: Map configured Stripe price IDs to allowed plans, validate subscription status and workspace association, explicitly decide how trialing, past_due, unpaid, cancellation at period end, deleted affect access, never grant paid access via arbitrary metadata or unverified checkout.

**Adjustment #3 from reviewer**: Treat billing state as authoritative. Map configured Stripe price IDs to allowed plans, but also validate subscription status and subscription associated with workspace. Decide explicitly how trialing, past_due, unpaid, cancellation at period end, deleted subscriptions affect access. Do not let arbitrary metadata or unverified checkout completion grant paid access.

**Server-side allowlists** (`src/lib/billing.ts` new file):

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

export const PRICE_ID_TO_PLAN: Record<string, { plan: BillingPlan, interval: BillingInterval }> = {
  [process.env.STRIPE_PRO_MONTHLY_PRICE_ID!]: { plan: 'pro', interval: 'monthly' },
  [process.env.STRIPE_PRO_ANNUAL_PRICE_ID!]: { plan: 'pro', interval: 'annual' },
  [process.env.STRIPE_ESCALA_MONTHLY_PRICE_ID!]: { plan: 'escala', interval: 'monthly' },
  [process.env.STRIPE_ESCALA_ANNUAL_PRICE_ID!]: { plan: 'escala', interval: 'annual' },
};

export const PLAN_LIMITS = {
  starter: { maxCollections: 3, maxFiles: 10, maxEmbeds: 1, maxQueriesPerMonth: 100 },
  pro: { maxCollections: 20, maxFiles: 500, maxEmbeds: 10, maxQueriesPerMonth: 10000 },
  escala: { maxCollections: 100, maxFiles: 5000, maxEmbeds: 100, maxQueriesPerMonth: 100000 },
};

// Subscription status to access decision
export type StripeSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused';

export function getPlanFromSubscriptionStatus(
  status: StripeSubscriptionStatus,
  priceId: string,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: number
): { plan: BillingPlan, hasPaidAccess: boolean, reason: string } {
  // Map priceId to plan first
  const mapped = PRICE_ID_TO_PLAN[priceId];
  if (!mapped) {
    return { plan: 'starter', hasPaidAccess: false, reason: `price ${priceId} not in allowlist` };
  }
  const plan = mapped.plan;

  // Decide access based on status
  switch (status) {
    case 'trialing':
      // Trialing → grant paid access until trial ends, map to plan
      return { plan, hasPaidAccess: true, reason: 'trialing' };
    case 'active':
      // Active → paid access, even if cancel_at_period_end true, grant until period end
      return { plan, hasPaidAccess: true, reason: cancelAtPeriodEnd ? 'active_cancel_at_period_end' : 'active' };
    case 'past_due':
      // Past due → Stripe retries payment, for MVP grant grace period 7 days? Or restrict? Decide: grant paid access but log warning, or restrict to starter? We decide: past_due → still has paid access for grace period, but mark as past_due for UI warning
      return { plan, hasPaidAccess: true, reason: 'past_due_grace' };
    case 'unpaid':
      // Unpaid → payment failed after retries, revoke paid access → downgrade to starter
      return { plan: 'starter', hasPaidAccess: false, reason: 'unpaid' };
    case 'canceled':
      // Canceled → check if cancel_at_period_end and current_period_end > now → still has access until period end, else starter
      if (cancelAtPeriodEnd && currentPeriodEnd * 1000 > Date.now()) {
        return { plan, hasPaidAccess: true, reason: 'canceled_at_period_end_still_active' };
      }
      return { plan: 'starter', hasPaidAccess: false, reason: 'canceled' };
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return { plan: 'starter', hasPaidAccess: false, reason: status };
  }
}
```

**Explicit decisions** (to document in LOCAL-SETUP-GUIDE and code):

| Stripe Status | cancel_at_period_end | Current Period End > Now? | Has Paid Access? | Plan Assigned | Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| trialing | any | yes | Yes | mapped from price | Grant paid, show trial banner |
| active | false | yes | Yes | mapped from price | Grant paid |
| active | true | yes | Yes | mapped from price | Grant paid until period end, show cancellation notice |
| past_due | any | yes | Yes (grace) | mapped from price | Grant paid grace 7d, log warning, UI past_due |
| unpaid | any | any | No | starter | Downgrade to starter, revoke paid |
| canceled | false | any | No | starter | Downgrade to starter |
| canceled | true | yes | Yes | mapped from price | Grant until period end, then downgrade |
| canceled | true | no | No | starter | Downgrade |
| incomplete, incomplete_expired, paused | any | any | No | starter | Downgrade |

- Do not let arbitrary metadata or unverified checkout.session.completed grant paid access — only grant after verifying subscription via Stripe API and mapping price ID to allowlist and checking status.

**Checkout route changes** (amended):

1. Validate plan against `BILLING_PLANS`, interval against `BILLING_INTERVALS` → 400 if invalid.
2. If plan starter → no checkout, return "Starter is free".
3. Lookup priceId = PLAN_PRICE_MAP[plan][interval] → 400 if not configured.
4. **Workspace authorization**: Must be from session, not client — see 2.4. Validate membership and required role (admin) on every billing operation. Never fall back to caller-provided workspace ID when session context missing.
5. Lookup workspace from DB to get stripe_customer_id — if exists, create session with customer, else create new.
6. Create Stripe checkout session with verified priceId, metadata workspaceId (verified), userId, but webhook must NOT use metadata for entitlement — only for logging.
7. Idempotency key, success URL generic not containing plan from client.

**Webhook entitlement** (amended):

1. On checkout.session.completed, retrieve subscription via `stripe.subscriptions.retrieve(session.subscription)` to get verified price ID and status, not use metadata plan.
2. Map price ID to plan via allowlist, validate status via `getPlanFromSubscriptionStatus`, update workspace plan only if hasPaidAccess true and price in allowlist.
3. Similarly for subscription.updated, retrieve authoritative subscription, map, handle status, handle out-of-order via fetching current.
4. For subscription.deleted → downgrade to starter.
5. Audit log.

**Tests**: Plan/price mismatch, unauthorized workspace, etc (see 5).

### 2.4 & 2.5 P1 — Workspace Authorization Consistency & Primary Workspace Selection (Amended with Adjustment #4)

**Goal**: Define primary workspace selection when user belongs to multiple workspaces, validate membership and required workspace role on every billing operation, never fall back to caller-provided workspace ID when session context missing.

**Adjustment #4 from reviewer**: Resolve workspace authorization consistently. Define how primary workspace is selected when user belongs to multiple workspaces. Validate membership and required workspace role on every billing operation. Never fall back to caller-provided workspace ID when session context is missing.

**Current gaps** (see 1.4, 1.5).

**Secure design**:

1. **Primary workspace selection**:

When user belongs to multiple workspaces, how to pick primary?

Options:
- Most recent membership (ORDER BY created_at DESC LIMIT 1)
- First created (ORDER BY created_at ASC LIMIT 1)
- Explicit `users.primary_workspace_id` column (future)
- Require workspace selection UI if multiple

For MVP, define: **Primary workspace = most recently created membership where status ACTIVE, ORDER BY created_at DESC LIMIT 1**. Document this, and for users with multiple workspaces, after login, they get primary workspace in session, but can switch workspace via `/workspaces/[slug]` route which validates membership.

If user has no workspace membership (edge case), session workspaceId = undefined, and billing operations should fail with 403 "No workspace context" — never fall back to client-provided ID.

2. **Workspace membership validation on every billing operation**:

Create helper `requireWorkspaceAdmin`:

```ts
async function requireWorkspaceAdmin(userId: string, workspaceId: string): Promise<void> {
  const res = await pool.query(
    `SELECT role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2 AND status = 'ACTIVE'`,
    [userId, workspaceId]
  );
  if (res.rows.length === 0) throw new Error('Not member');
  const role = res.rows[0].role;
  if (role !== 'admin' && role !== 'owner' && role !== 'WORKSPACE_OWNER') throw new Error('Requires admin');
}
```

In checkout route:

```ts
const session = await getSession(request);
if (!session) return 401
const workspaceId = session.workspaceId;
if (!workspaceId) {
  // Never fall back to caller-provided workspace ID
  return NextResponse.json({ error: 'bad_request', message: 'No workspace context in session' }, { status: 400 });
}
// Validate membership and admin role
try {
  await requireWorkspaceAdmin(session.userId, workspaceId);
} catch {
  return 403
}
// Do NOT use body.workspaceId at all, or if body.workspaceId provided and different, validate that user is admin of that workspace too, but prefer session
// If body.workspaceId provided and user is super_admin, allow, but still validate membership
```

- Never fall back to `body.workspaceId || session.workspaceId` — use only `session.workspaceId`, and if body.workspaceId provided, validate it is same as session or user has permission to that workspace, but do not trust blindly.

3. **SessionData extension**:

```ts
interface SessionData {
  userId: string;
  email: string;
  role: SystemRole; // platform role
  workspaceId?: string; // primary workspace
  workspaceRole?: string; // role in primary workspace
  createdAt: number;
}
```

- Login: query users for platform role, query workspace_members for primary workspace (ORDER BY created_at DESC LIMIT 1), populate both.
- Signup: creates workspace and membership admin, session has workspaceId and workspaceRole admin.

4. **RBAC separation**:

- `requireSystemRole` for platform-level (super_admin)
- `requireWorkspaceRole` for workspace-level (admin, member)

5. **Tests**: Primary workspace selection with multiple memberships, unauthorized workspace, missing session context, role checks.

**Integration**: Phases 4 (signup atomic) and 5 (session role) should be tested together because checkout depends on session contract — per reviewer.

### 2.6 P1 — Rate Limiting Proxy Trust Boundary (Amended with Adjustment #5)

**Goal**: Document exact production deployment assumptions, sanitize forwarding headers at trusted edge, safe fallback if cannot establish trustworthy IP, test Redis failure per tier.

**Adjustment #5 from reviewer**: Specify proxy trust boundary. Document exact production deployment assumptions and sanitize forwarding headers at trusted edge. If application cannot establish trustworthy client IP, use safe fallback rather than trusting arbitrary forwarded values. Test Redis failure behavior separately for each rate-limit tier.

**Current**: `x-forwarded-for` first entry trusted directly.

**Secure design**:

1. **Production deployment assumptions** (document in LOCAL-SETUP-GUIDE):

- Production runs behind Vercel (or Cloudflare, or Nginx) that sanitizes `x-forwarded-for` and sets correct client IP.
- Vercel: `x-forwarded-for` first entry is client IP set by Vercel edge, not spoofable if behind Vercel, but `x-real-ip` and `x-vercel-forwarded-for` also available.
- If not behind trusted proxy (e.g., direct Node.js), `x-forwarded-for` is untrustworthy — use safe fallback.

2. **IP extraction with trust boundary**:

```ts
function getClientIp(request: NextRequest): string {
  const isProd = process.env.NODE_ENV === 'production';
  const trustProxy = process.env.TRUST_PROXY === 'true' || isProd; // or explicit env var

  if (trustProxy) {
    // Behind trusted proxy (Vercel) — x-forwarded-for is set by proxy, first entry is client IP
    // Still, to be safe, we can use x-real-ip or x-vercel-forwarded-for if present
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      // x-forwarded-for may contain multiple IPs: client, proxy1, proxy2 — first is client
      // Since proxy sanitizes, we trust first
      return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for') || 'unknown';
  } else {
    // Not behind trusted proxy — do NOT trust x-forwarded-for, use safe fallback
    // In dev, use remote address? NextRequest doesn't have remoteAddr, so fallback to 'unknown' or use x-real-ip only if explicitly allowed
    // For dev, allow x-forwarded-for for testing, but log warning
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    if (process.env.NODE_ENV === 'development') {
      return ip;
    }
    // In prod without trust proxy, safe fallback: do not trust forwarded headers, use 'unknown' and rate limit per session instead of IP
    return 'unknown';
  }
}
```

- If cannot establish trustworthy IP (returns 'unknown'), use safe fallback: rate limit per session ID or per user ID, not per IP, to avoid bypass via spoofed IP.
- Document: `TRUST_PROXY=true` must be set in production if behind Vercel/Cloudflare/Nginx that sanitizes headers. If not set, app uses safe fallback.

3. **Sanitize forwarding headers at trusted edge**:

- In `proxy.ts`, if `NODE_ENV=production`, remove or validate `x-forwarded-for`, `x-real-ip` from client? Actually proxy.ts runs after edge proxy, so edge proxy should have already sanitized. But we can add defense-in-depth: in proxy.ts, if request comes from untrusted source, strip headers? Simpler: document that production proxy (Vercel) sanitizes, and app trusts it only if `TRUST_PROXY=true`.

4. **Fail-closed for AUTH tier on Redis outage**:

```ts
try {
  const current = await redis.incr(key);
  // ...
} catch (err) {
  console.warn('[rateLimit] Redis error', err);
  if (tier === 'AUTH') {
    // Fail closed for AUTH to prevent brute-force bypass when Redis down
    return { success: false, remaining: 0, limit: config.limit, retryAfter: config.windowSec };
  } else {
    // Fail open for READ/WRITE to preserve availability
    return { success: true, remaining: config.limit, limit: config.limit, retryAfter: 0 };
  }
}
```

- AUTH tier (login, signup, forgot-password, reset-password) fails closed (429) when Redis down.
- READ/WRITE fails open (success true) to not block legit users.

5. **Accurate TTL**:

Try to get actual TTL via `redis.ttl(key)` if client supports, else use windowSec.

6. **Tests**:

- Spoofed-header tests: request with `x-forwarded-for: 1.2.3.4, 5.6.7.8` and `TRUST_PROXY=true` vs `false`, ensure IP extraction correct and safe fallback.
- Redis outage tests: mock Redis to throw, test AUTH tier returns success false (429), READ tier returns success true.
- Rate-limit TTL and retry behavior: test remaining, retryAfter.

7. **Documentation**: Add section in LOCAL-SETUP-GUIDE about proxy trust boundary, TRUST_PROXY env var, production deployment assumptions (Vercel, Cloudflare), safe fallback.

---

## 3. DB Migrations & Schema Changes (Amended)

### 3.1 New Tables

**password_reset_tokens** (see 2.1) + **stripe_webhook_events** (see 2.2):

```sql
-- password_reset_tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (...);
-- stripe_webhook_events
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  workspace_id TEXT,
  data JSONB
);
```

**Workspaces columns** (if not exists):

```sql
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'escala'));
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_interval IN ('monthly', 'annual'));
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS signing_secret TEXT;
```

### 3.2 Env Vars

Add to `.env.example`:

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET= # required in staging/production, fail-closed
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_ESCALA_MONTHLY_PRICE_ID=
STRIPE_ESCALA_ANNUAL_PRICE_ID=
TRUST_PROXY=true # set true in production behind Vercel/Cloudflare/Nginx that sanitizes x-forwarded-for
OKENG_ENABLE_PASSWORD_RESET=false # set true after token flow implemented, else 501
```

### 3.3 Transaction Support

No schema change, code uses `pool.connect()` with BEGIN/COMMIT/ROLLBACK.

---

## 4. API Changes — Detailed (Amended)

### 4.1 forgot-password

- Generic success, no enumeration.
- If user exists, generate token 256-bit, hash SHA256, expiry 1h, invalidate old, store IP, rate limit per IP and per email.
- Dev log token only if dev.
- Tests: enumeration, rate limiting.

### 4.2 reset-password

- Interim 501 if `OKENG_ENABLE_PASSWORD_RESET=false` or table not exists, and ensure endpoint cannot modify passwords until implemented (return 501 before any DB update).
- When enabled, atomic consumption via UPDATE ... RETURNING, hash password only after validation, invalidate other tokens, clear sessions.
- Tests: valid, expired, used, invalid, UUID, concurrent reuse (Promise.all), enumeration.

### 4.3 webhooks

- Fail-closed prod/staging if secret missing, require signature, Node.js runtime.
- Idempotency via stripe_webhook_events uniqueness, transactional commit of dedup + entitlement, do not ack if DB fails (500), Stripe retries.
- Handle out-of-order via fetching authoritative subscription from Stripe API, compare event created timestamp, only apply if newer or always fetch current.
- Derive plan from verified price ID and status via `getPlanFromSubscriptionStatus`, not metadata.
- Audit log.

### 4.4 checkout

- Validate plan/interval allowlist, map to priceId, 400 if not configured.
- Workspace authorization: use session.workspaceId only, validate membership admin, never fall back to client-provided ID when session missing, if body.workspaceId different, validate permission.
- Lookup stripe_customer_id, create session with customer, idempotency key, generic success URL.
- Do not trust metadata for entitlement.

### 4.5 signup

- Transaction BEGIN/COMMIT/ROLLBACK, handle slug collision.
- Return session with workspaceId.

### 4.6 login

- Query users, verify password, query workspace_members for primary workspace ORDER BY created_at DESC LIMIT 1, populate session workspaceId and workspaceRole.
- Extend SessionData.

### 4.7 rateLimit

- Harden IP extraction with trust boundary, TRUST_PROXY env, safe fallback unknown → rate limit per session.
- Fail-closed AUTH on Redis error, fail-open others, accurate TTL.

---

## 5. Testing Plan — Regression Tests with Verification Gates (Amended)

### 5.1 Baseline

Record baseline before changes: `npm run build`, `npm run test:homepage-tour-readiness`, `npm run test:embed-authorization`, `npm run lint`, `npx tsc --noEmit`. Treat 52/52 + 29/29 as baseline to verify, not guaranteed — investigate failures, not weaken tests.

### 5.2 Password Reset Tests (Phase 1 Gate: Negative Security Tests)

**File**: `tests/security/password-reset.test.ts`

- [ ] Generate token for existing user → hashed, not raw, expiry 1h, old invalidated.
- [ ] Reset valid token → password updated, token used, other tokens invalidated.
- [ ] Reset expired → 400.
- [ ] Reset used → 400 single-use.
- [ ] Reset invalid → 400.
- [ ] Reset UUID (old vuln) → 400.
- [ ] **Concurrent reuse**: two simultaneous requests same token → only one succeeds, second 400 — atomic UPDATE RETURNING test.
- [ ] Enumeration: non-existing email → generic success, no token, no timing leak.
- [ ] Rate limiting per IP and per email.
- [ ] Hash password only after validation — ensure bcrypt not called on invalid token (mock bcrypt, check call count).

**Gate**: Must include negative tests, concurrent reuse, DB failure.

### 5.3 Stripe Webhook Tests (Phase 2 Gate: Negative Security Tests)

**File**: `tests/security/billing-webhook.test.ts`

- [ ] No secret in prod → 500 fail-closed, not parse JSON.
- [ ] No secret in dev → warning, parses JSON dev only.
- [ ] Invalid signature → 400.
- [ ] Valid signature price not in allowlist → does not update, logs error.
- [ ] Valid signature price pro_monthly → updates to pro.
- [ ] Forged event without signature in prod → 500.
- [ ] **Duplicate event ID**: same event ID twice → second returns duplicate true, no re-processing, idempotent.
- [ ] **DB failure**: mock pool to throw on UPDATE → returns 500, not acked, event not marked processed, Stripe retry would work.
- [ ] **Out-of-order**: simulate past_due event after active, ensure final state active (fetch authoritative subscription).

### 5.4 Checkout Tests (Phase 3 Gate: Plan/Price Mismatch, Unauthorized Workspace)

**File**: `tests/security/billing-checkout.test.ts`

- [ ] Valid pro monthly → returns url, priceId pro monthly.
- [ ] Escala monthly no price configured → 400.
- [ ] Client tries escala while paying pro price → server maps plan to priceId, if escala price exists creates escala session, not pro — cannot get escala entitlement while paying pro.
- [ ] Invalid plan enterprise → 400.
- [ ] WorkspaceId from body but session workspaceId different and user not admin of that workspace → 403.
- [ ] No session workspaceId → 400, not fallback to body.
- [ ] Success URL does not contain client-controlled plan.

### 5.5 Signup Atomicity Tests (Phase 4 Gate: Transaction Rollback)

**File**: `tests/security/signup-atomic.test.ts`

- [ ] Successful signup → user, workspace, membership all created.
- [ ] Failure after user insert (mock throw on workspace insert) → no user left, rollback.
- [ ] Slug collision → retry or 409, no partial.

### 5.6 Session Workspace Role Tests (Phase 5 Gate: Role Resolution + Integration)

**File**: `tests/security/session-workspace.test.ts`

- [ ] Signup → session has workspaceId and role admin.
- [ ] Login → session has workspaceId and workspaceRole from membership.
- [ ] Multiple workspaces → primary = most recent membership ORDER BY created_at DESC LIMIT 1.
- [ ] Checkout uses session workspaceId, not client-supplied.
- [ ] **Integration**: signup → login → checkout → webhook → plan updated — full flow.

**Note**: Phases 4-5 tested together because checkout depends on session contract — per reviewer.

### 5.7 Rate Limiting Tests (Phase 6 Gate: Spoofed-Header, Redis Outage)

**File**: `tests/security/rate-limit.test.ts`

- [ ] Spoofed x-forwarded-for with TRUST_PROXY=true vs false, safe fallback unknown.
- [ ] No forwarding headers → unknown, rate limit per session.
- [ ] Redis down AUTH tier → 429 fail-closed, READ tier → success true fail-open.
- [ ] Accurate Retry-After from TTL, TTL behavior.
- [ ] Proxy config documentation.

### 5.8 Existing Suites (Phase 7 Gate: Preserve Existing Behavior)

- [ ] `npm run build` PASS — record actual routes, not assumed.
- [ ] `npm run test:homepage-tour-readiness` — record baseline 52/52, investigate failures.
- [ ] `npm run test:embed-authorization` — record baseline 29/29.
- [ ] `npm run lint` 0 errors.
- [ ] `npx tsc --noEmit` — pre-existing errors ok if ignoreBuildErrors true, but document.
- [ ] Manual verification: forgot-password → reset-password flow, Stripe webhook test signature, checkout valid/invalid plans.

**Gate rule**: Phase not complete merely because tests pass — must also preserve relevant existing behavior. Report actual results rather than assumed pass counts. Treat 52/52+29/29 as baseline to verify, not guaranteed.

---

## 6. Phased Execution Plan — Amended with Verification Gates (Awaiting Signal)

**Phase 0 — This doc v1.1 (0.5 day)** — DONE: Audit, confirm findings, incorporate 5 reviewer adjustments, design enforceable guarantees, write amended PLAN-008 v1.1 for review, await signal. Includes verification gates and baseline recording.

**Phase 1 — P0 Password Reset with Atomic Consumption (1 day)** — After signal:
- Create migration password_reset_tokens + stripe_webhook_events (for Phase 2) + workspaces columns if needed.
- Implement forgot-password token generation (256-bit, SHA256 hash, expiry 1h, invalidate old, IP, rate limit).
- Implement reset-password with atomic UPDATE ... RETURNING, hash password only after validation, invalidate other tokens, clear sessions, interim 501 if disabled.
- Add tests password-reset.test.ts with negative, concurrent reuse, DB failure.
- Verification gate: negative security tests, concurrent reuse test, preserve existing behavior (build, existing tests baseline).
- Commit: `fix(AUTH): secure password-reset atomic consumption expiry single-use (P0)`

**Phase 2 — P0 Stripe Webhook Fail-Closed Idempotent Recoverable (0.5 day)**:
- Update webhooks/route.ts fail-closed prod/staging, require signature, Node.js runtime, idempotency via stripe_webhook_events uniqueness, transactional commit, do not ack if DB fails, handle out-of-order via fetching authoritative subscription.
- Add tests billing-webhook.test.ts with negative, duplicate, DB failure, out-of-order.
- Verification gate: negative security tests, duplicate, DB failure, preserve existing.
- Commit: `fix(BILLING): strict webhook signature fail-closed idempotent recoverable (P0)`

**Phase 3 — P1 Billing State Authoritative & Plan Validation (1 day)**:
- Create src/lib/billing.ts with allowlists, PLAN_PRICE_MAP, PRICE_ID_TO_PLAN, PLAN_LIMITS, getPlanFromSubscriptionStatus with explicit status handling trialing, past_due, unpaid, canceled at period end, deleted.
- Update checkout/route.ts validate plan/interval, map to priceId, workspace auth from session only, lookup customer, idempotency, generic success URL.
- Update webhooks/route.ts derive plan from verified price and status, not metadata, audit log.
- Add env vars for escala prices to .env.example.
- Add tests billing-checkout.test.ts with plan/price mismatch, unauthorized workspace.
- Verification gate: plan/price mismatch, unauthorized workspace, preserve existing.
- Commit: `fix(BILLING): server-side plan price validation authoritative state (P1)`

**Phase 4 — P1 Signup Atomic Transaction (0.5 day)**:
- Update signup/route.ts to use pool.connect() BEGIN/COMMIT/ROLLBACK, handle slug collision.
- Add tests signup-atomic.test.ts.
- Verification gate: transaction rollback, preserve existing.
- Commit: `fix(AUTH): atomic signup transaction (P1)`

**Phase 5 — P1 Session Workspace Role Resolution Consistent (0.5 day)**:
- Update login/route.ts to query workspace_members primary workspace ORDER BY created_at DESC LIMIT 1, populate session workspaceId and workspaceRole, extend SessionData.
- Update checkout to use session workspaceId only, never fallback to caller-provided when session missing.
- Add tests session-workspace.test.ts + integration signup/login/checkout.
- Verification gate: role-resolution, primary selection, integration, preserve existing.
- Commit: `fix(AUTH): session workspace role resolution consistent primary selection (P1)`
- Note: Test Phases 4-5 together because checkout depends on session contract.

**Phase 6 — P1 Rate Limiting Proxy Trust Boundary (0.5 day)**:
- Update rateLimit.ts harden IP extraction with TRUST_PROXY env, safe fallback unknown → per session, fail-closed AUTH on Redis error, fail-open others, accurate TTL.
- Update proxy.ts sanitize forwarding headers in prod, document trust boundary.
- Document in LOCAL-SETUP-GUIDE production deployment assumptions (Vercel, Cloudflare, Nginx), TRUST_PROXY, safe fallback.
- Add tests rate-limit.test.ts with spoofed-header, Redis outage per tier, TTL.
- Verification gate: spoofed-header, Redis outage per tier, proxy docs, preserve existing.
- Commit: `fix(SEC): rate limiting proxy trust boundary fail-closed AUTH (P1)`

**Phase 7 — Regression Tests & Verification (0.5 day)**:
- Run all new security tests + existing 52/52 + 29/29 (record baseline before changes, investigate failures not weaken).
- npm run build PASS (record actual routes), npm run lint 0 errors, npx tsc --noEmit check.
- Manual verification: forgot-password → reset-password flow, Stripe webhook test signature, checkout valid/invalid plans, unauthorized workspace.
- Update LOCAL-SETUP-GUIDE with secure flows, env vars, billing state authoritative, proxy trust boundary.
- Verification gate: existing regression suites, new tests, build, lint, manual verification, report actual results.
- Commit: `test(SEC): add regression tests for P0/P1 security billing (PLAN-008)`

**Phase 8 — Push & PR Update (0.5 day)**:
- Review final diff, verify committed changes and clean working tree, push branch, update PR with test evidence.
- Verification gate: final diff review, clean working tree, push, PR update with test evidence.
- Commit: `docs(PLAN-008): mark execution completed — P0/P1 security billing hardening with atomic guarantees`

---

## 7. Risks & Rollback (Amended)

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Password reset token table migration fails | Medium | High | Test in staging, rollback DROP TABLE, keep endpoint 501 until migration success, atomic consumption prevents partial |
| Concurrent token reuse race still possible | Low | High | Use UPDATE ... RETURNING with used_at IS NULL and expires_at > NOW() in transaction, test with Promise.all concurrent requests |
| Stripe webhook fail-closed breaks dev without secret | Low | Medium | Allow dev bypass only when NODE_ENV=development AND OKENG_ENV=development, document, fail-closed only prod/staging, idempotency prevents duplicate processing |
| Webhook out-of-order stale overwrite | Medium | High | Fetch authoritative subscription via stripe.subscriptions.retrieve, store event created timestamp, only apply if newer or always fetch current, test out-of-order |
| Checkout plan validation breaks Pro checkout | Low | High | Keep Pro price IDs working, add escala only if env present, test with Stripe test mode, validate price→plan mapping |
| Signup transaction deadlocks | Low | Medium | Short transaction, retry on serialization failure, test rollback |
| Session workspaceId missing for existing users | Medium | Medium | Migration: for existing users without membership, create default workspace or require re-login, handle null workspaceId gracefully, never fallback to client ID |
| Rate limiting fail-closed AUTH blocks legit users when Redis down | Medium | Medium | Fail-closed only AUTH, fail-open READ/WRITE, monitor Redis health /api/health, document TRUST_PROXY |
| Proxy trust boundary misconfigured | Medium | High | Document exact prod assumptions (Vercel sanitizes x-forwarded-for), TRUST_PROXY env, safe fallback unknown → per session, test spoofed headers |

**Rollback**:
- Keep branch with commits before fixes — revert via git revert or reset.
- DB down migrations: DROP TABLE password_reset_tokens, DROP TABLE stripe_webhook_events, ALTER TABLE workspaces DROP COLUMN if added.
- Feature flags: OKENG_ENABLE_PASSWORD_RESET=false returns 501, OKENG_STRICT_WEBHOOK=false allows dev bypass (only in dev).

---

## 8. References (Amended)

- Review findings: P0 password reset UUID takeover, P0 webhook forged events, P1 checkout plan metadata trust, P1 signup non-atomic, P1 session workspace roles, P1 rate limiting IP spoofing.
- Reviewer feedback on PLAN-008 v1.0: 5 adjustments — atomic token consumption, webhook idempotency recoverable, billing state authoritative, workspace auth consistency, proxy trust boundary + verification gates per phase, baseline 52/52+29/29 to verify not guaranteed.
- Current code: reset-password 61 lines UUID, webhooks 106 lines JSON.parse without signature, checkout 79 lines client plan in metadata, signup 81 lines separate queries, login 68 lines no workspaceId, rateLimit 60 lines x-forwarded-for spoofable, auth.ts 126 lines HMAC-SHA256.
- Supabase schema: 20261003000001 201 lines, 20261009000003 936 lines RLS, no password_reset_tokens, no stripe columns.
- OWASP password reset: random 256-bit, hash at rest, expiry 15m-1h, single-use, atomic consumption UPDATE ... RETURNING, hash password only after validation.
- Stripe: webhook signatures https://stripe.com/docs/webhooks/signatures, idempotency event ID uniqueness, fetch authoritative subscription to handle out-of-order, subscription status handling trialing, past_due, unpaid, canceled at period end, deleted.
- Billing: server-side allowlist, price→plan mapping, entitlement from verified price and status, never metadata.

---

*Amended plan v1.1 incorporating reviewer 5 adjustments — enforceable security guarantees in code, atomic consumption, idempotent recoverable webhook, authoritative billing state, consistent workspace auth, explicit proxy trust boundary, verification gates per phase, baseline recording. Awaiting signal to execute P0/P1 hardening.*
