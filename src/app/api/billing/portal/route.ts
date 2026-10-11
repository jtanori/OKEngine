// POST /api/billing/portal — Secure Stripe Customer Portal Session with consistent workspace auth (P1 Phase 5)
import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSystemRole } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { getPool } from '@/lib/db';
import { requireWorkspaceAdmin } from '@/lib/workspaceAuth';

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

  // Phase 5: Consistent workspace auth
  const workspaceAuth = await requireWorkspaceAdmin(session, body.workspaceId);
  if (!workspaceAuth.authorized) {
    return NextResponse.json({ error: workspaceAuth.error, message: workspaceAuth.message }, { status: workspaceAuth.status });
  }

  const workspaceId = workspaceAuth.workspaceId;
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
    let customerId: string | null = null;
    let workspaceSlug: string | null = workspaceAuth.workspace.slug;
    try {
      const res = await pool.query('SELECT stripe_customer_id, slug FROM workspaces WHERE id = $1', [workspaceId]);
      if (res.rows.length > 0) {
        customerId = res.rows[0].stripe_customer_id;
        workspaceSlug = res.rows[0].slug || workspaceSlug;
      }
    } catch (err: any) {
      console.warn('[billing/portal] DB error getting customer ID', err);
    }

    if (!customerId) {
      return NextResponse.json({ error: 'bad_request', message: 'No Stripe customer found for workspace, create checkout first' }, { status: 400 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = workspaceSlug
      ? `${appUrl}/workspaces/${workspaceSlug}/settings?portal=return`
      : `${appUrl}/settings/billing`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error('[billing/portal] Error', err);
    return NextResponse.json({ error: 'internal_error', message: err.message }, { status: 500 });
  }
}
