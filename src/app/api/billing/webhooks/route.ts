// POST /api/billing/webhooks — Handle Stripe webhooks with signature validation
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!sig) return NextResponse.json({ error: 'bad_request', message: 'Missing stripe-signature' }, { status: 400 });
  if (!webhookSecret) {
    console.warn('[billing/webhooks] STRIPE_WEBHOOK_SECRET not set, skipping signature validation (dev only)');
  }
  if (!stripeSecret) {
    return NextResponse.json({ error: 'bad_request', message: 'Stripe not configured' }, { status: 400 });
  }

  try {
    const body = await request.text();
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret);

    let event: any;

    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err: any) {
        console.error('[billing/webhooks] Signature verification failed', err.message);
        return NextResponse.json({ error: 'bad_request', message: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
      }
    } else {
      // Dev without secret: parse JSON directly
      event = JSON.parse(body);
    }

    console.log('[billing/webhooks] Received event', event.type);

    const pool = getPool();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspaceId;
        const plan = session.metadata?.plan || 'pro';
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (workspaceId) {
          try {
            await pool.query('UPDATE workspaces SET plan = $1, stripe_customer_id = $2, stripe_subscription_id = $3, updated_at = NOW() WHERE id = $4', [
              plan,
              customerId,
              subscriptionId,
              workspaceId,
            ]);
            console.log(`[billing/webhooks] Updated workspace ${workspaceId} to plan ${plan}`);
          } catch (err) {
            console.error('[billing/webhooks] DB update error', err);
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const status = subscription.status;
        // Map Stripe status to plan? For MVP, if active -> pro, if canceled -> starter
        let plan = 'pro';
        if (status === 'canceled' || status === 'unpaid') plan = 'starter';

        try {
          await pool.query('UPDATE workspaces SET plan = $1, updated_at = NOW() WHERE stripe_customer_id = $2', [plan, customerId]);
          console.log(`[billing/webhooks] Updated customer ${customerId} subscription to ${status} -> plan ${plan}`);
        } catch (err) {
          console.error('[billing/webhooks] DB update error', err);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        try {
          await pool.query('UPDATE workspaces SET plan = $1, stripe_subscription_id = NULL, updated_at = NOW() WHERE stripe_customer_id = $2', ['starter', customerId]);
          console.log(`[billing/webhooks] Downgraded customer ${customerId} to starter after subscription deleted`);
        } catch (err) {
          console.error('[billing/webhooks] DB update error', err);
        }
        break;
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        // Log for monitoring, no plan change
        console.log(`[billing/webhooks] Invoice event ${event.type} for ${event.data.object.customer}`);
        break;
      default:
        console.log(`[billing/webhooks] Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[billing/webhooks] Error', err);
    return NextResponse.json({ error: 'internal_error', message: err.message }, { status: 500 });
  }
}
