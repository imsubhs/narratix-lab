import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';
import {
  assertAllowedRequestHost,
  enforceSupabaseRateLimit,
  getAccountActionRateRules,
  getAllowedRequestOrigin,
  hasConfiguredSecret,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!hasConfiguredSecret(secretKey)) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  return new Stripe(secretKey);
}

export async function POST(request: NextRequest) {
  try {
    assertAllowedRequestHost(request);

    let plan: 'pro' | 'team' = 'pro';
    try {
      const body = await request.json();
      if (body?.plan === 'team') {
        plan = 'team';
      }
    } catch (e) {}

    const priceId = plan === 'team' ? process.env.STRIPE_TEAM_PRICE_ID : process.env.STRIPE_PRO_PRICE_ID;

    if (!hasConfiguredSecret(priceId)) {
      return NextResponse.json(
        { error: `STRIPE_${plan.toUpperCase()}_PRICE_ID is not configured.` },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in before upgrading.' },
        { status: 401 }
      );
    }

    const rate = await enforceSupabaseRateLimit({
      identityKey: `user:${user.id}`,
      action: 'stripe-checkout',
      plan: 'free',
      rules: getAccountActionRateRules(),
    });

    if (!rate.allowed) {
      const retryAfter = (rate as { retry_after_seconds?: number }).retry_after_seconds;
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please wait before trying again.' },
        {
          status: 429,
          headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
        }
      );
    }

    const appUrl = getAllowedRequestOrigin(request);
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: plan,
        },
      },
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(
      '[api/stripe/checkout] failed:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: 'Stripe checkout failed.' }, { status: 500 });
  }
}
