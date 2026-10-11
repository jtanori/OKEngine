// POST /api/billing/checkout — Secure Stripe Checkout Session with server-side plan validation and consistent workspace auth (P1 fix PLAN-008 Phase 3+5)
// Implements: validate plan/interval allowlist, map to priceId safely, workspace auth from session only via requireWorkspaceAdmin,
// never fallback to caller-provided ID when session missing, lookup customer, idempotency, generic success URL, safe price map

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSystemRole } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { getPool } from '@/lib/db';
import { validatePlanAndInterval, PLAN_PRICE_MAP, buildPriceMap } from '@/lib/billing';
import { requireWorkspaceAdmin } from '@/lib/workspaceAuth';

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, 'WRITE');
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limit_exceeded', message: 'Too many requests', retryAfter: rl.retryAfter }, { status: 429 });
  }

  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'unauthorized', message: 'No autorizado' }, { status: 401 });

  try {
    requireSystemRole(session.role, 'admin');
  } catch {
    return NextResponse.json({ error: 'forbidden', message: 'No tienes permiso' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // P1: Validate plan and interval against allowlists — never trust client metadata for entitlement
  const rawPlan = body.plan;
  const rawInterval = body.interval;
  const planToValidate = rawPlan || 'pro';
  const intervalToValidate = rawInterval || 'monthly';

  const validation = validatePlanAndInterval(planToValidate, intervalToValidate);
  if (!validation.valid) {
    return NextResponse.json({ error: 'bad_request', message: validation.error }, { status: 400 });
  }

  const plan = validation.plan!;
  const interval = validation.interval!;

  // P1-2: Safe price map — build only from configured non-empty, reject duplicates at startup (fail-fast)
  let priceMap: Record<string, { plan: string; interval: string }>;
  try {
    priceMap = buildPriceMap();
  } catch (err: any) {
    console.error('[billing/checkout] Duplicate price IDs detected at startup', err);
    return NextResponse.json({ error: 'internal_error', message: `Price configuration error: ${err.message}` }, { status: 500 });
  }

  const priceId = PLAN_PRICE_MAP[plan][interval];
  if (!priceId || priceId.trim() === '' || priceId === 'undefined') {
    return NextResponse.json({ error: 'bad_request', message: `Price ID not configured for ${plan} ${interval}` }, { status: 400 });
  }

  if (!priceMap[priceId]) {
    console.warn(`[billing/checkout] Price ID ${priceId} for ${plan}/${interval} not in allowlist map`);
  }

  // Phase 5: Consistent workspace auth — requireWorkspaceAdmin validates user, workspace, active membership, required role every time
  // Never fallback to caller-provided ID when session missing
  const workspaceAuth = await requireWorkspaceAdmin(session, body.workspaceId);
  if (!workspaceAuth.authorized) {
    return NextResponse.json({ error: workspaceAuth.error, message: workspaceAuth.message }, { status: workspaceAuth.status });
  }

  const workspaceId = workspaceAuth.workspaceId;
  const workspace = workspaceAuth.workspace;

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    console.warn('[billing/checkout] Stripe not configured, returning placeholder');
    return NextResponse.json({
      url: `/#precios?plan=${plan}&interval=${interval}&workspace=${workspaceId}`,
      message: 'Stripe not configured — placeholder, set STRIPE_SECRET_KEY and price IDs',
      placeholder: true,
    });
  }

  try {
    const pool = getPool();

    // Get stripe_customer_id — workspace already validated, but need customer ID
    let stripeCustomerId: string | null = null;
    let workspaceSlug = workspace.slug;
    try {
      const res = await pool.query('SELECT stripe_customer_id, slug FROM workspaces WHERE id = $1', [workspaceId]);
      if (res.rows.length > 0) {
        stripeCustomerId = res.rows[0].stripe_customer_id;
        workspaceSlug = res.rows[0].slug || workspaceSlug;
      }
    } catch (err: any) {
      console.warn('[billing/checkout] Failed to get stripe_customer_id, using workspace from auth', err);
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const idempotencyKey = `checkout_${workspaceId}_${plan}_${interval}_${new Date().toISOString().split('T')[0]}`;

    const checkoutParams: any = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/workspaces/${workspaceSlug || workspaceId}/settings?checkout=success`,
      cancel_url: `${appUrl}/#precios?checkout=cancelled`,
      metadata: {
        workspaceId: workspaceId,
        plan: plan,
        interval: interval,
        userId: session.userId,
      },
    };

    if (stripeCustomerId) {
      checkoutParams.customer = stripeCustomerId;
    } else if (session.email) {
      checkoutParams.customer_email = session.email;
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutParams, {
      idempotencyKey,
    });

    console.log(`[billing/checkout] Created checkout session for workspace ${workspaceId} plan ${plan} interval ${interval} price ${priceId}`);

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error('[billing/checkout] Stripe error', err);
    return NextResponse.json({ error: 'internal_error', message: 'Error creando sesión de pago', details: err.message }, { status: 500 });
  }
}
