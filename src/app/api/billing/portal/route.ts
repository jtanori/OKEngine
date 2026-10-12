// POST /api/billing/portal — Secure Stripe Customer Portal Session with consistent workspace auth (P1 Phase 5)
import { NextRequest, NextResponse } from 'next/server';
import { composeAuthResponseAppliers, getSessionContext, validateCsrf } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { requireWorkspaceAdmin } from '@/lib/workspaceAuth';

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, 'WRITE');
  if (!rl.success) return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 });
  if (!validateCsrf(request)) return NextResponse.json({ error: 'csrf_invalid' }, { status: 403 });

  const { session, applyToResponse: applySessionToResponse } = await getSessionContext(request);
  let applyToResponse = applySessionToResponse;
  const respond = (body: unknown, init?: ResponseInit) => applyToResponse(NextResponse.json(body, init));
  if (!session) return respond({ error: 'unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Phase 5: Consistent workspace auth
  const workspaceAuth = await requireWorkspaceAdmin(request, session, body.workspaceId);
  applyToResponse = composeAuthResponseAppliers(applyToResponse, workspaceAuth.applyToResponse);
  if (!workspaceAuth.authorized) {
    return respond({ error: workspaceAuth.error, message: workspaceAuth.message }, { status: workspaceAuth.status });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    return respond({
      url: '/settings/billing',
      message: 'Stripe not configured — placeholder',
      placeholder: true,
    });
  }

  try {
    const customerId = workspaceAuth.workspace.stripe_customer_id || null;
    const workspaceSlug = workspaceAuth.workspace.slug;

    if (!customerId) {
      return respond({ error: 'bad_request', message: 'No Stripe customer found for workspace, create checkout first' }, { status: 400 });
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

    return respond({ url: portalSession.url });
  } catch (err: any) {
    console.error('[billing/portal] Error', err);
    return respond({ error: 'internal_error', message: err.message }, { status: 500 });
  }
}
