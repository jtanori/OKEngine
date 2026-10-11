// POST /api/billing/webhooks — Handle Stripe webhooks
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Validate Stripe signature via STRIPE_WEBHOOK_SECRET
  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'bad_request', message: 'Missing signature' }, { status: 400 });

  // TODO: Implement Stripe webhook handling: checkout.session.completed, customer.subscription.updated, etc
  // For MVP, just log and return success
  try {
    const body = await request.text();
    console.log('[billing/webhooks] Received', { sig: sig.slice(0, 20), bodyLength: body.length });
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[billing/webhooks] Error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
