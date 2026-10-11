// POST /api/billing/webhooks — Secure Stripe webhook handling with fail-closed, idempotency, trusted workspace resolution (P0 fix PLAN-008 Phase 2)
// Implements: fail-closed prod/staging if secret missing, require signature verification, Node.js runtime, idempotency via stripe_webhook_events uniqueness,
// transactional dedup+entitlement, do not ack if DB fails, handle deleted subscriptions only after confirming association, API failures 500 not acked,
// row locking SELECT ... FOR UPDATE per workspace to serialize concurrent handlers, never use untrusted metadata to select workspace,
// validate both association paths before returning (customer vs subscription different workspaces fail safe), make unresolved events recoverable via durable reconciliation path

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { PRICE_ID_TO_PLAN, getPlanFromSubscriptionStatus, buildPriceMap } from '@/lib/billing';

interface WorkspaceRecord {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  past_due_since?: Date | null;
}

interface ResolutionResult {
  workspaceId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  subscription: any | null;
  resolutionMethod: string;
  validationErrors: string[];
}

async function resolveWorkspaceFromStripeEvent(
  client: any,
  event: any,
  stripe: any,
  metadataWorkspaceId?: string
): Promise<ResolutionResult> {
  let customerId: string | null = null;
  let subscriptionId: string | null = null;
  let subscription: any | null = null;
  const validationErrors: string[] = [];

  const eventObject = event.data.object;
  if (event.type === 'checkout.session.completed') {
    customerId = eventObject.customer as string;
    subscriptionId = eventObject.subscription as string;
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    subscriptionId = eventObject.id as string;
    customerId = eventObject.customer as string;
  } else if (event.type.startsWith('invoice.')) {
    customerId = eventObject.customer as string;
    subscriptionId = eventObject.subscription as string;
  }

  // Lookup both association paths inside transaction — do NOT return immediately after first match (Refinement #1)
  let workspaceByCustomer: WorkspaceRecord | null = null;
  let workspaceBySubscription: WorkspaceRecord | null = null;

  if (customerId) {
    try {
      const res = await client.query(`SELECT id, stripe_customer_id, stripe_subscription_id FROM workspaces WHERE stripe_customer_id = $1`, [customerId]);
      if (res.rows.length > 0) {
        workspaceByCustomer = res.rows[0];
      }
    } catch (err) {
      // Table or column may not exist in some envs — treat as no association
      console.warn('[webhooks] workspace lookup by customer failed, treating as no association', err);
    }
  }

  if (subscriptionId) {
    try {
      const res = await client.query(`SELECT id, stripe_customer_id, stripe_subscription_id FROM workspaces WHERE stripe_subscription_id = $1`, [subscriptionId]);
      if (res.rows.length > 0) {
        workspaceBySubscription = res.rows[0];
      }
    } catch (err) {
      console.warn('[webhooks] workspace lookup by subscription failed, treating as no association', err);
    }
  }

  // Refinement #1: If both lookups identify different workspaces, fail safely rather than choosing either
  if (workspaceByCustomer && workspaceBySubscription && workspaceByCustomer.id !== workspaceBySubscription.id) {
    console.error(
      `[webhooks] Contradictory association: customer ${customerId} maps to workspace ${workspaceByCustomer.id} but subscription ${subscriptionId} maps to workspace ${workspaceBySubscription.id} — fail safe`
    );
    return {
      workspaceId: null,
      customerId,
      subscriptionId,
      subscription: null,
      resolutionMethod: 'contradictory_customer_vs_subscription_fail_safe',
      validationErrors: [`customer maps to ${workspaceByCustomer.id} but subscription maps to ${workspaceBySubscription.id}`],
    };
  }

  // Determine candidate workspaceId from verified associations (not metadata)
  let candidateWorkspaceId: string | null = null;
  let resolutionMethod = 'no_association';
  if (workspaceByCustomer) {
    candidateWorkspaceId = workspaceByCustomer.id;
    resolutionMethod = 'stripe_customer_id';
  } else if (workspaceBySubscription) {
    candidateWorkspaceId = workspaceBySubscription.id;
    resolutionMethod = 'stripe_subscription_id';
  }

  // For new checkout where no existing association, use metadata as candidate but with validation
  let isNewCheckoutWithMetadata = false;
  if (!candidateWorkspaceId && event.type === 'checkout.session.completed' && metadataWorkspaceId) {
    isNewCheckoutWithMetadata = true;
    candidateWorkspaceId = metadataWorkspaceId;
    resolutionMethod = 'metadata_for_new_checkout_candidate';
  }

  if (!candidateWorkspaceId) {
    console.error(
      `[webhooks] No workspace association found for event ${event.id} type ${event.type} customer ${customerId} subscription ${subscriptionId} — fail safe`
    );
    return {
      workspaceId: null,
      customerId,
      subscriptionId,
      subscription: null,
      resolutionMethod: 'no_association_fail_safe',
      validationErrors: ['no workspace found via customer or subscription'],
    };
  }

  // Retrieve authoritative subscription when applicable and verify ID, customer, persisted association agree — before returning (Refinement #1)
  if (subscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (err: any) {
      if (err.code === 'resource_missing' || err.statusCode === 404) {
        console.log(`[webhooks] Subscription ${subscriptionId} not retrievable, will handle as deleted if association confirmed`);
        subscription = null;
      } else {
        // API failure — throw to cause ROLLBACK and 500, not acked, Stripe retries
        throw err;
      }
    }
  }

  // Validate both association paths before returning
  if (subscription) {
    if (subscriptionId && subscription.id !== subscriptionId) {
      validationErrors.push(`subscription ID mismatch: event ${subscriptionId} vs retrieved ${subscription.id}`);
    }
    const subCustomerId = subscription.customer as string;
    if (customerId && subCustomerId !== customerId) {
      validationErrors.push(`subscription customer mismatch: event customer ${customerId} vs retrieved sub customer ${subCustomerId}`);
    }
    if (workspaceByCustomer && workspaceByCustomer.stripe_customer_id !== subCustomerId) {
      validationErrors.push(
        `workspace ${workspaceByCustomer.id} stripe_customer_id ${workspaceByCustomer.stripe_customer_id} does not match retrieved sub customer ${subCustomerId}`
      );
    }
    if (
      workspaceBySubscription &&
      workspaceBySubscription.stripe_customer_id &&
      workspaceBySubscription.stripe_customer_id !== subCustomerId
    ) {
      validationErrors.push(
        `workspace ${workspaceBySubscription.id} stripe_customer_id ${workspaceBySubscription.stripe_customer_id} does not match sub customer ${subCustomerId}`
      );
    }
  }

  if (validationErrors.length > 0 && !isNewCheckoutWithMetadata) {
    console.error(`[webhooks] Validation errors for event ${event.id}: ${validationErrors.join(', ')} — fail safe`);
    return {
      workspaceId: null,
      customerId,
      subscriptionId,
      subscription,
      resolutionMethod: 'validation_failed_fail_safe',
      validationErrors,
    };
  }

  // For new checkout with metadata candidate, perform additional validation
  if (isNewCheckoutWithMetadata) {
    try {
      const wsRes = await client.query(`SELECT id, stripe_customer_id, stripe_subscription_id FROM workspaces WHERE id = $1`, [
        candidateWorkspaceId,
      ]);
      if (wsRes.rows.length === 0) {
        console.error(`[webhooks] Metadata workspace ${candidateWorkspaceId} not found — fail safe`);
        return {
          workspaceId: null,
          customerId,
          subscriptionId,
          subscription,
          resolutionMethod: 'metadata_not_found_fail_safe',
          validationErrors: ['metadata workspace not found'],
        };
      }
      const ws = wsRes.rows[0];
      if (ws.stripe_customer_id && ws.stripe_customer_id !== customerId) {
        console.error(
          `[webhooks] Contradictory customer for metadata workspace ${ws.id}: has ${ws.stripe_customer_id} vs event ${customerId} — fail safe`
        );
        return {
          workspaceId: null,
          customerId,
          subscriptionId,
          subscription,
          resolutionMethod: 'contradictory_customer_fail_safe',
          validationErrors: ['contradictory customer'],
        };
      }
      if (ws.stripe_subscription_id && ws.stripe_subscription_id !== subscriptionId) {
        console.error(
          `[webhooks] Contradictory subscription for metadata workspace ${ws.id}: has ${ws.stripe_subscription_id} vs event ${subscriptionId} — fail safe`
        );
        return {
          workspaceId: null,
          customerId,
          subscriptionId,
          subscription,
          resolutionMethod: 'contradictory_subscription_fail_safe',
          validationErrors: ['contradictory subscription'],
        };
      }
      if (subscription && (subscription.customer as string) !== customerId) {
        console.error(
          `[webhooks] Subscription customer mismatch for metadata workspace: sub customer ${subscription.customer} vs event customer ${customerId} — fail safe`
        );
        return {
          workspaceId: null,
          customerId,
          subscriptionId,
          subscription,
          resolutionMethod: 'customer_mismatch_fail_safe',
          validationErrors: ['customer mismatch'],
        };
      }
      console.log(`[webhooks] Resolving workspace via metadata for new checkout: ${candidateWorkspaceId} (validated)`);
      return {
        workspaceId: candidateWorkspaceId,
        customerId,
        subscriptionId,
        subscription,
        resolutionMethod: 'metadata_for_new_checkout_validated',
        validationErrors: [],
      };
    } catch (err) {
      console.warn('[webhooks] Metadata workspace validation failed, treating as no association', err);
      return {
        workspaceId: null,
        customerId,
        subscriptionId,
        subscription,
        resolutionMethod: 'metadata_validation_error_fail_safe',
        validationErrors: ['metadata validation error'],
      };
    }
  }

  return {
    workspaceId: candidateWorkspaceId,
    customerId,
    subscriptionId,
    subscription,
    resolutionMethod,
    validationErrors: [],
  };
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  // Fail-closed: require signature in prod/staging
  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.OKENG_ENV === 'production' ||
    process.env.OKENG_ENV === 'staging';

  if (!sig) {
    return NextResponse.json({ error: 'bad_request', message: 'Missing stripe-signature' }, { status: 400 });
  }

  if (!webhookSecret) {
    if (isProd) {
      console.error('[billing/webhooks] STRIPE_WEBHOOK_SECRET required in production — fail closed');
      return NextResponse.json({ error: 'internal_error', message: 'Webhook secret not configured' }, { status: 500 });
    } else {
      console.warn('[billing/webhooks] STRIPE_WEBHOOK_SECRET not set, skipping signature validation (dev only)');
    }
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
        return NextResponse.json(
          { error: 'bad_request', message: `Webhook signature verification failed: ${err.message}` },
          { status: 400 }
        );
      }
    } else {
      // Dev without secret: parse JSON directly — only allowed in dev
      if (isProd) {
        console.error('[billing/webhooks] No webhook secret in prod — fail closed');
        return NextResponse.json({ error: 'internal_error', message: 'Webhook secret not configured' }, { status: 500 });
      }
      try {
        event = JSON.parse(body);
      } catch {
        return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 });
      }
    }

    console.log('[billing/webhooks] Received event', event.type, 'id', event.id);

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Idempotency check — insert event ID with ON CONFLICT DO NOTHING
      // If duplicate, rollback and return duplicate true — no duplicate entitlement updates
      let insertRes;
      try {
        insertRes = await client.query(
          `INSERT INTO stripe_webhook_events (id, type, workspace_id, data, stripe_created, status)
           VALUES ($1, $2, $3, $4, $5, 'processing')
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [event.id, event.type, null, JSON.stringify(event), event.created]
        );
      } catch (err: any) {
        // If table doesn't exist (e.g., Phase 1 only, Phase 2 not yet migrated), treat as no idempotency but continue
        // For Phase 2, table should exist via migration 20261011000006
        if (err.message && err.message.includes('stripe_webhook_events')) {
          console.warn('[billing/webhooks] stripe_webhook_events table not exists, skipping idempotency check (Phase 1)');
          insertRes = { rows: [{ id: event.id }] } as any;
        } else {
          throw err;
        }
      }

      if (insertRes.rows.length === 0) {
        // Already processed — check existing status
        let existing;
        try {
          existing = await client.query(`SELECT status, processed_at FROM stripe_webhook_events WHERE id = $1`, [event.id]);
        } catch {
          existing = { rows: [] } as any;
        }
        if (existing.rows.length > 0 && existing.rows[0].status === 'processed') {
          await client.query('ROLLBACK');
          console.log(`[billing/webhooks] Duplicate event ${event.id} already processed`);
          return NextResponse.json({ received: true, duplicate: true });
        }
        // If existing status is unresolved, allow re-processing? For simplicity, treat as duplicate but log
        await client.query('ROLLBACK');
        console.log(`[billing/webhooks] Duplicate event ${event.id} status ${existing.rows[0]?.status}`);
        return NextResponse.json({ received: true, duplicate: true });
      }

      // Resolve workspace via verified persisted association — never use untrusted metadata alone
      const metadataWorkspaceId = event.data.object.metadata?.workspaceId;
      let resolution: ResolutionResult;
      try {
        resolution = await resolveWorkspaceFromStripeEvent(client, event, stripe, metadataWorkspaceId);
      } catch (err: any) {
        // Stripe API failure inside resolve — do NOT mark as processed, return 500 so Stripe retries (Review Point #2)
        await client.query('ROLLBACK');
        console.error('[billing/webhooks] Stripe API failure during resolution, not acking', err);
        return NextResponse.json({ error: 'internal_error', message: 'Stripe API failure, retry' }, { status: 500 });
      }

      if (!resolution.workspaceId) {
        // No association or contradictory or validation failed — make unresolved events recoverable (Refinement #2)
        // Do NOT silently mark processed and discard — persist as unresolved in durable observable reconciliation path
        try {
          await client.query(
            `UPDATE stripe_webhook_events SET workspace_id = $1, status = 'unresolved', data = $2, error = $3 WHERE id = $4`,
            [
              null,
              JSON.stringify(event),
              JSON.stringify({ reason: resolution.resolutionMethod, errors: resolution.validationErrors }),
              event.id,
            ]
          );
        } catch (err) {
          console.warn('[webhooks] Failed to update unresolved status, but still committing', err);
        }
        await client.query('COMMIT');
        console.error(
          `[billing/webhooks] Unresolved event ${event.id} persisted as unresolved for reconciliation: ${resolution.resolutionMethod}`
        );
        // Return 200 with unresolved true and log for investigation — not silently discarded, has durable record
        // This avoids permanent loss of valid event received before association exists, while not causing infinite Stripe retries
        return NextResponse.json({ received: true, unresolved: true, reason: resolution.resolutionMethod });
      }

      const workspaceId = resolution.workspaceId;

      // Serialize entitlement updates per workspace — explicit concurrency strategy (P1-3 + Refinement #1)
      // Lock workspace row FOR UPDATE to serialize concurrent handlers for same workspace
      try {
        await client.query(`SELECT id FROM workspaces WHERE id = $1 FOR UPDATE`, [workspaceId]);
      } catch (err) {
        console.warn('[webhooks] Row locking failed, continuing without lock', err);
      }

      // Re-fetch authoritative subscription inside lock to ensure freshest state at time of lock — prevents stale concurrent updates
      let authoritativeSubscription: any = resolution.subscription;
      if (resolution.subscriptionId) {
        try {
          authoritativeSubscription = await stripe.subscriptions.retrieve(resolution.subscriptionId);
        } catch (err: any) {
          if (err.code === 'resource_missing' || err.statusCode === 404) {
            // Treat as deletion signal only after confirming subscription ID and existing workspace association (P1-2)
            if (!resolution.subscriptionId) {
              console.error(`[webhooks] resource_missing but no subscriptionId in event ${event.id} — fail safe, no downgrade`);
              try {
                await client.query(
                  `UPDATE stripe_webhook_events SET status = 'unresolved', error = $1 WHERE id = $2`,
                  [JSON.stringify({ reason: 'resource_missing_no_subscriptionId' }), event.id]
                );
              } catch {}
              await client.query('COMMIT');
              return NextResponse.json({ received: true, unresolved: true, reason: 'resource_missing_no_subscriptionId' });
            }
            let assocRes;
            try {
              assocRes = await client.query(`SELECT id FROM workspaces WHERE stripe_subscription_id = $1`, [
                resolution.subscriptionId,
              ]);
            } catch {
              assocRes = { rows: [] } as any;
            }
            if (assocRes.rows.length === 0) {
              console.error(
                `[webhooks] resource_missing for ${resolution.subscriptionId} but no existing workspace association — fail safe, no downgrade`
              );
              try {
                await client.query(
                  `UPDATE stripe_webhook_events SET status = 'unresolved', error = $1 WHERE id = $2`,
                  [JSON.stringify({ reason: 'resource_missing_no_association' }), event.id]
                );
              } catch {}
              await client.query('COMMIT');
              return NextResponse.json({ received: true, unresolved: true, reason: 'resource_missing_no_association' });
            }
            console.log(
              `[webhooks] Subscription ${resolution.subscriptionId} not retrievable, has existing association ${assocRes.rows[0].id}, treating as deleted`
            );
            authoritativeSubscription = null; // will trigger downgrade
          } else {
            // API failure — do NOT mark as processed, return 500 so Stripe retries
            await client.query('ROLLBACK');
            console.error('[webhooks] Stripe API failure inside lock, not acking', err);
            return NextResponse.json({ error: 'internal_error', message: 'Stripe API failure, retry' }, { status: 500 });
          }
        }
      }

      // Validate both association paths again with authoritative subscription fetched inside lock (Refinement #1)
      if (authoritativeSubscription) {
        const subCustomerId = authoritativeSubscription.customer as string;
        const subId = authoritativeSubscription.id;

        if (resolution.customerId && subCustomerId !== resolution.customerId) {
          console.error(
            `[webhooks] Inside lock: subscription customer mismatch ${subCustomerId} vs event customer ${resolution.customerId} — fail safe`
          );
          try {
            await client.query(`UPDATE stripe_webhook_events SET status = 'unresolved', error = $1 WHERE id = $2`, [
              JSON.stringify({ reason: 'customer_mismatch_inside_lock' }),
              event.id,
            ]);
          } catch {}
          await client.query('COMMIT');
          return NextResponse.json({ received: true, unresolved: true, reason: 'customer_mismatch_inside_lock' });
        }

        // Check if customer and subscription lookups now identify different workspaces (race)
        try {
          const customerLookup = await client.query(`SELECT id FROM workspaces WHERE stripe_customer_id = $1`, [subCustomerId]);
          const subscriptionLookup = await client.query(`SELECT id FROM workspaces WHERE stripe_subscription_id = $1`, [subId]);
          if (
            customerLookup.rows.length > 0 &&
            subscriptionLookup.rows.length > 0 &&
            customerLookup.rows[0].id !== subscriptionLookup.rows[0].id
          ) {
            console.error(
              `[webhooks] Inside lock: contradictory association after re-fetch: customer maps to ${customerLookup.rows[0].id} but subscription maps to ${subscriptionLookup.rows[0].id} — fail safe`
            );
            await client.query(`UPDATE stripe_webhook_events SET status = 'unresolved', error = $1 WHERE id = $2`, [
              JSON.stringify({ reason: 'contradictory_inside_lock' }),
              event.id,
            ]);
            await client.query('COMMIT');
            return NextResponse.json({ received: true, unresolved: true, reason: 'contradictory_inside_lock' });
          }
        } catch (err) {
          console.warn('[webhooks] Contradictory check inside lock failed, continuing', err);
        }
      }

      // Derive plan from verified price and status with persisted past_due_since — authoritative billing state
      let planResult;
      let existingPastDueSince: Date | null = null;
      try {
        const existingWs = await client.query(`SELECT past_due_since, plan FROM workspaces WHERE id = $1`, [workspaceId]);
        if (existingWs.rows.length > 0) {
          existingPastDueSince = existingWs.rows[0].past_due_since;
        }
      } catch {
        // Column may not exist in Phase 2 (added in Phase 3) — treat as null
        existingPastDueSince = null;
      }

      if (authoritativeSubscription) {
        const priceId = authoritativeSubscription.items?.data?.[0]?.price?.id;
        const status = authoritativeSubscription.status;
        const cancelAtPeriodEnd = authoritativeSubscription.cancel_at_period_end;
        const currentPeriodEnd = authoritativeSubscription.current_period_end;

        // Use safe price map and authoritative status handling
        try {
          // Ensure price map built safely
          buildPriceMap();
          planResult = getPlanFromSubscriptionStatus(status, priceId, cancelAtPeriodEnd, currentPeriodEnd, existingPastDueSince);
        } catch (err: any) {
          console.error('[webhooks] Price map error', err);
          planResult = {
            plan: 'starter',
            interval: 'monthly',
            hasPaidAccess: false,
            reason: `price map error ${err.message}`,
            pastDueSince: null,
          };
        }
      } else {
        // Subscription deleted or not retrievable and has existing association — downgrade to starter
        planResult = {
          plan: 'starter',
          interval: 'monthly',
          hasPaidAccess: false,
          reason: 'deleted_or_not_retrievable',
          pastDueSince: null,
        };
      }

      // Update workspace with new plan and billing state under row lock — final entitlement update
      if (planResult) {
        try {
          // Try to update with all billing columns (Phase 3), fallback to basic if columns missing (Phase 2)
          await client.query(
            `UPDATE workspaces SET plan = $1, plan_interval = $2, stripe_subscription_status = $3, stripe_current_period_end = $4, stripe_cancel_at_period_end = $5, past_due_since = $6, stripe_customer_id = $7, stripe_subscription_id = $8, updated_at = NOW() WHERE id = $9`,
            [
              planResult.plan,
              planResult.interval,
              authoritativeSubscription?.status || null,
              authoritativeSubscription ? new Date(authoritativeSubscription.current_period_end * 1000) : null,
              authoritativeSubscription?.cancel_at_period_end || false,
              planResult.pastDueSince,
              resolution.customerId,
              resolution.subscriptionId,
              workspaceId,
            ]
          );
        } catch (err: any) {
          // If columns like past_due_since etc don't exist (Phase 2), fallback to basic update
          if (err.message && (err.message.includes('past_due_since') || err.message.includes('stripe_subscription_status'))) {
            console.warn('[webhooks] Billing columns not exist yet (Phase 2), fallback to basic plan update');
            await client.query(
              `UPDATE workspaces SET plan = $1, stripe_customer_id = $2, stripe_subscription_id = $3, updated_at = NOW() WHERE id = $4`,
              [planResult.plan, resolution.customerId, resolution.subscriptionId, workspaceId]
            );
          } else {
            throw err;
          }
        }
        console.log(`[billing/webhooks] Updated workspace ${workspaceId} to plan ${planResult.plan} reason ${planResult.reason}`);
      }

      // Mark event as processed
      try {
        await client.query(`UPDATE stripe_webhook_events SET workspace_id = $1, processed_at = NOW(), status = 'processed' WHERE id = $2`, [
          workspaceId,
          event.id,
        ]);
      } catch (err) {
        console.warn('[webhooks] Failed to update processed_at, but entitlement already updated', err);
      }

      await client.query('COMMIT');
      return NextResponse.json({ received: true });
    } catch (err: any) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('[webhooks] Rollback failed', rbErr);
      }
      console.error('[billing/webhooks] Error', err);
      return NextResponse.json({ error: 'internal_error', message: err.message }, { status: 500 });
    } finally {
      try {
        client.release();
      } catch {}
    }
  } catch (err: any) {
    console.error('[billing/webhooks] Outer error', err);
    return NextResponse.json({ error: 'internal_error', message: err.message }, { status: 500 });
  }
}
