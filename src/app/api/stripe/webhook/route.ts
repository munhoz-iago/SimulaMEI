import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getOfficeIdByStripeSubscription,
  getStripeObjectId,
  getSubscriptionCurrentPeriodEnd,
  getSubscriptionPrimaryPriceId,
  markAccountantCheckoutExpired,
  markStripeEventProcessed,
  normalizeAccountantSubscriptionStatus,
  resolveAccountantPlanFromMetadata,
  resolveAccountantPlanFromPriceId,
  syncAccountantBilling,
} from "@/lib/accountant/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { logger } from "@/lib/logger";

interface DbError {
  message: string;
}

interface UpdateQuery {
  eq(column: string, value: string): Promise<{ error: DbError | null }>;
}

interface SupabaseAdminLike {
  from(table: string): unknown;
}

async function handleConsumerCheckoutCompleted(
  admin: SupabaseAdminLike,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.user_id;
  const produto = session.metadata?.produto;
  const purchasesTable = admin.from("purchases") as {
    update(payload: Record<string, unknown>): UpdateQuery;
  };
  const profilesTable = admin.from("user_profiles") as {
    update(payload: Record<string, unknown>): UpdateQuery;
  };

  await purchasesTable
    .update({
      status: "paid",
      stripe_payment_id:
        getStripeObjectId(session.payment_intent) ??
        getStripeObjectId(session.subscription),
    })
    .eq("stripe_session_id", session.id);

  if (userId && produto === "monitor_mensal") {
    await profilesTable
      .update({
        plano: "pro",
        stripe_customer_id: getStripeObjectId(session.customer),
        stripe_subscription_status: "active",
      })
      .eq("id", userId);
  }
}

async function handleAccountantCheckoutCompleted(
  admin: SupabaseAdminLike,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const officeId = session.metadata?.office_id ?? session.client_reference_id;
  const subscriptionId = getStripeObjectId(session.subscription);

  if (!officeId || !subscriptionId) {
    logger.warn(
      "stripe-webhook.checkout",
      "Checkout contador sem office/subscription",
      { sessionId: session.id },
    );
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const plan =
    resolveAccountantPlanFromPriceId(
      getSubscriptionPrimaryPriceId(subscription),
    ) ?? resolveAccountantPlanFromMetadata(session.metadata);

  if (!plan) {
    logger.warn(
      "stripe-webhook.checkout",
      "Checkout contador sem plano suportado",
      { sessionId: session.id },
    );
    return;
  }

  await syncAccountantBilling(admin, {
    officeId,
    plan,
    status: normalizeAccountantSubscriptionStatus(subscription.status),
    stripeCustomerId:
      getStripeObjectId(subscription.customer) ??
      getStripeObjectId(session.customer),
    stripeSubscriptionId: subscription.id,
    stripeCheckoutSessionId: session.id,
    currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
  });
}

async function handleAccountantSubscriptionEvent(
  admin: SupabaseAdminLike,
  subscription: Stripe.Subscription,
  eventType: string,
) {
  const officeId =
    subscription.metadata?.office_id ??
    (await getOfficeIdByStripeSubscription(admin, subscription.id));

  if (!officeId) {
    logger.warn("stripe-webhook.subscription", "Subscription sem office", {
      subscriptionId: subscription.id,
    });
    return;
  }

  const plan =
    eventType === "customer.subscription.deleted"
      ? "starter"
      : (resolveAccountantPlanFromPriceId(
          getSubscriptionPrimaryPriceId(subscription),
        ) ?? resolveAccountantPlanFromMetadata(subscription.metadata));

  if (!plan) {
    logger.warn(
      "stripe-webhook.subscription",
      "Subscription sem plano suportado",
      { subscriptionId: subscription.id },
    );
    return;
  }

  await syncAccountantBilling(admin, {
    officeId,
    plan,
    status:
      eventType === "customer.subscription.deleted"
        ? "canceled"
        : normalizeAccountantSubscriptionStatus(subscription.status),
    stripeCustomerId: getStripeObjectId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
  });
}

async function handleCheckoutExpired(
  admin: SupabaseAdminLike,
  session: Stripe.Checkout.Session,
) {
  if (!resolveAccountantPlanFromMetadata(session.metadata)) return;
  await markAccountantCheckoutExpired(admin, session.id);
}

export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook não configurado." },
      { status: 503 },
    );
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Assinatura Stripe ausente." },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Assinatura Stripe inválida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  const idempotency = await markStripeEventProcessed(
    admin,
    event.id,
    event.type,
  );

  if (idempotency.duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (idempotency.error) {
    // Erro de idempotência não deve retornar 500 (causa retentativas infinitas do Stripe)
    // Em vez disso, logamos e retornamos 200 — o evento pode ser reprocessado manualmente
    logger.warn(
      "stripe-webhook.idempotency",
      "Erro ao registrar evento Stripe (não crítico)",
      {
        eventId: event.id,
        eventType: event.type,
        error: idempotency.error,
      },
    );
    return NextResponse.json({ received: true, warning: "event_log_failed" });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (resolveAccountantPlanFromMetadata(session.metadata)) {
        await handleAccountantCheckoutCompleted(admin, stripe, session);
      } else {
        await handleConsumerCheckoutCompleted(admin, session);
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await handleAccountantSubscriptionEvent(
        admin,
        event.data.object as Stripe.Subscription,
        event.type,
      );
    }

    if (event.type === "checkout.session.expired") {
      await handleCheckoutExpired(
        admin,
        event.data.object as Stripe.Checkout.Session,
      );
    }
  } catch (error) {
    logger.error("stripe-webhook.handler", "Erro ao processar evento Stripe", {
      error,
    });
    return NextResponse.json(
      { error: "Erro ao processar evento Stripe." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
