// POST /api/billing/portal — Create Stripe Customer Portal Session
import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSystemRole } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, 'WRITE');
  if (!rl.success) return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 });

  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    requireSystemRole(session.role, 'admin');
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const workspaceId = body.workspaceId || session.workspaceId;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    return NextResponse.json({
      url: '/settings/billing',
      message: 'Stripe not configured — placeholder',
      placeholder: true,
    });
  }

  try {
    const pool = getPool();
    // Get workspace stripe_customer_id
    let customerId: string | null = null;
    if (workspaceId) {
      try {
        const res = await pool.query('SELECT stripe_customer_id FROM workspaces WHERE id = $1', [workspaceId]);
        if (res.rows.length > 0) customerId = res.rows[0].stripe_customer_id;
      } catch (err) {
        console.warn('[billing/portal] DB error getting customer ID', err);
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: 'bad_request', message: 'No Stripe customer found for workspace, create checkout first' }, { status: 400 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error('[billing/portal] Error', err);
    return NextResponse.json({ error: 'internal_error', message: err.message }, { status: 500 });
  }
}
