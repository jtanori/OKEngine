// POST /api/billing/portal — Secure Stripe Customer Portal Session with workspace auth from session only (P1 Phase 3)
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

  // Workspace auth from session only — never fallback to body when session missing
  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: 'bad_request', message: 'Workspace ID required from session' }, { status: 400 });
  }

  if (body.workspaceId && body.workspaceId !== workspaceId) {
    return NextResponse.json({ error: 'forbidden', message: 'Workspace mismatch' }, { status: 403 });
  }

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
    let workspaceSlug: string | null = null;
    try {
      const res = await pool.query('SELECT stripe_customer_id, slug FROM workspaces WHERE id = $1', [workspaceId]);
      if (res.rows.length > 0) {
        customerId = res.rows[0].stripe_customer_id;
        workspaceSlug = res.rows[0].slug;
      }
    } catch (err: any) {
      if (err.message && err.message.includes('stripe_customer_id')) {
        const res2 = await pool.query('SELECT slug FROM workspaces WHERE id = $1', [workspaceId]);
        if (res2.rows.length > 0) workspaceSlug = res2.rows[0].slug;
      } else {
        console.warn('[billing/portal] DB error getting customer ID', err);
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: 'bad_request', message: 'No Stripe customer found for workspace, create checkout first' }, { status: 400 });
    }

    // Validate membership admin
    try {
      const memRes = await pool.query(
        `SELECT role, status FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, session.userId]
      );
      if (memRes.rows.length > 0) {
        const mem = memRes.rows[0];
        const isActive = mem.status === 'ACTIVE' || mem.status === 'active' || !mem.status;
        const isAdmin = mem.role === 'WORKSPACE_OWNER' || mem.role === 'admin' || mem.role === 'owner';
        if (!isActive || !isAdmin) {
          return NextResponse.json({ error: 'forbidden', message: 'Requires active admin membership' }, { status: 403 });
        }
      }
    } catch (err) {
      console.warn('[billing/portal] Membership check failed', err);
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
