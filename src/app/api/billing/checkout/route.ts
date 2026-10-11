// POST /api/billing/checkout — Create Stripe Checkout Session (from ANALYSIS-001)
// P0: Functional Stripe integration if STRIPE_SECRET_KEY present, else placeholder

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSystemRole } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

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

  const plan = body.plan || 'pro';
  const interval = body.interval || 'monthly';
  const workspaceId = body.workspaceId || session.workspaceId;

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const proMonthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnualPriceId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;

  // If Stripe not configured, return placeholder (for dev without Stripe)
  if (!stripeSecret || !proMonthlyPriceId) {
    console.warn('[billing/checkout] Stripe not configured, returning placeholder');
    return NextResponse.json({
      url: `/#precios?plan=${plan}&interval=${interval}&workspace=${workspaceId}`,
      message: 'Stripe not configured — placeholder, set STRIPE_SECRET_KEY and price IDs',
      placeholder: true,
    });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret);

    const priceId = interval === 'annual' ? proAnnualPriceId : proMonthlyPriceId;

    if (!priceId) {
      return NextResponse.json({ error: 'bad_request', message: `Price ID not configured for ${plan} ${interval}` }, { status: 400 });
    }

    // For MVP, create checkout session without customer (or with customer if we have stripe_customer_id from DB)
    // We would need to get workspace stripe_customer_id from DB — for MVP, create without
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/workspaces?checkout=success&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/#precios?checkout=cancelled`,
      metadata: {
        workspaceId: workspaceId || '',
        plan,
        interval,
        userId: session.userId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error('[billing/checkout] Stripe error', err);
    return NextResponse.json({ error: 'internal_error', message: 'Error creando sesión de pago', details: err.message }, { status: 500 });
  }
}
