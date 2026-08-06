import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-admin';
import { hasConfiguredSecret } from '@/lib/security';

export const dynamic = 'force-dynamic';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!hasConfiguredSecret(secretKey)) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  return new Stripe(secretKey);
}

type BillingPlan = 'free' | 'pro' | 'team';

function getBillingStatus(status: Stripe.Subscription.Status) {
  if (status === 'active') return 'active';
  if (status === 'trialing') return 'trialing';
  if (status === 'past_due') return 'past_due';
  if (status === 'unpaid') return 'unpaid';
  if (status === 'canceled') return 'cancelled';
  return 'inactive';
}

async function recordEventOnce(event: Stripe.Event) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('record_stripe_event_once', {
    p_event_id: event.id,
    p_event_type: event.type,
  });

  if (error) {
    throw new Error(`Failed to record Stripe webhook idempotency key: ${error.message}`);
  }

  return Boolean(data);
}

async function applyStripePlanUpdate(params: {
  userId: string | undefined;
  plan: BillingPlan;
  subscriptionStatus: string;
  billingStatus: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  currentPeriodEnd?: number | null;
}) {
  const {
    userId,
    plan,
    subscriptionStatus,
    billingStatus,
    customerId,
    subscriptionId,
    currentPeriodEnd,
  } = params;

  if (!userId) return;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('apply_stripe_subscription_update', {
    p_user_id: userId,
    p_plan: plan,
    p_subscription_status: subscriptionStatus,
    p_billing_status: billingStatus,
    p_stripe_customer_id: customerId ?? null,
    p_stripe_subscription_id: subscriptionId ?? null,
    p_current_period_end: currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null,
  });

  if (error) {
    throw new Error(`Failed to update subscription plan: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');

  if (!hasConfiguredSecret(process.env.STRIPE_WEBHOOK_SECRET)) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not configured.' },
      { status: 500 }
    );
  }

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const shouldProcess = await recordEventOnce(event);
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const plan = (session.metadata?.plan === 'team' ? 'team' : 'pro') as 'pro' | 'team';
      await applyStripePlanUpdate({
        userId: session.metadata?.user_id,
        plan,
        subscriptionStatus: 'active',
        billingStatus: 'active',
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      });
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive = ['active', 'trialing'].includes(subscription.status);
      const plan = (subscription.metadata?.plan === 'team' ? 'team' : 'pro') as 'pro' | 'team';
      await applyStripePlanUpdate({
        userId: subscription.metadata?.user_id,
        plan: isActive ? plan : 'free',
        subscriptionStatus: subscription.status === 'canceled' ? 'cancelled' : subscription.status,
        billingStatus: getBillingStatus(subscription.status),
        customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
        subscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end,
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await applyStripePlanUpdate({
        userId: subscription.metadata?.user_id,
        plan: 'free',
        subscriptionStatus: 'cancelled',
        billingStatus: 'cancelled',
        customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
        subscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Signature failures and internal errors both return a bare 400: Stripe
    // only needs a non-2xx to retry, and the caller is untrusted.
    console.error(
      '[api/stripe/webhook] processing failed:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: 'Stripe webhook failed.' }, { status: 400 });
  }
}
