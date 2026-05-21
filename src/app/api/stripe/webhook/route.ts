import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
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
} from '@/lib/accountant/billing'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'

interface DbError {
  message: string
}

interface UpdateQuery {
  eq(column: string, value: string): Promise<{ error: DbError | null }>
}

interface SupabaseAdminLike {
  from(table: string): unknown
}

async function handleConsumerCheckoutCompleted(
  admin: SupabaseAdminLike,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.user_id
  const produto = session.metadata?.produto
  const purchasesTable = admin.from('purchases') as {
    update(payload: Record<string, unknown>): UpdateQuery
  }
  const profilesTable = admin.from('user_profiles') as {
    update(payload: Record<string, unknown>): UpdateQuery
  }

  const fp = session.metadata?.report_fingerprint
  const simId = session.metadata?.simulation_id
  await purchasesTable
    .update({
      status: 'paid',
      stripe_payment_id: getStripeObjectId(session.payment_intent)
        ?? getStripeObjectId(session.subscription),
      ...(fp ? { report_fingerprint: fp } : {}),
      ...(simId ? { simulation_id: simId } : {}),
    })
    .eq('stripe_session_id', session.id)

  if (userId && produto === 'monitor_mensal') {
    await profilesTable
      .update({
        plano: 'pro',
        stripe_customer_id: getStripeObjectId(session.customer),
        stripe_subscription_status: 'active',
      })
      .eq('id', userId)
  }
}

async function handleAccountantCheckoutCompleted(
  admin: SupabaseAdminLike,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const officeId = session.metadata?.office_id ?? session.client_reference_id
  const subscriptionId = getStripeObjectId(session.subscription)

  if (!officeId || !subscriptionId) {
    console.warn('[stripe-webhook] accountant checkout without office/subscription:', session.id)
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const plan = resolveAccountantPlanFromPriceId(getSubscriptionPrimaryPriceId(subscription))
    ?? resolveAccountantPlanFromMetadata(session.metadata)

  if (!plan) {
    console.warn('[stripe-webhook] accountant checkout without supported plan:', session.id)
    return
  }

  await syncAccountantBilling(admin, {
    officeId,
    plan,
    status: normalizeAccountantSubscriptionStatus(subscription.status),
    stripeCustomerId: getStripeObjectId(subscription.customer) ?? getStripeObjectId(session.customer),
    stripeSubscriptionId: subscription.id,
    stripeCheckoutSessionId: session.id,
    currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
  })
}

async function handleAccountantSubscriptionEvent(
  admin: SupabaseAdminLike,
  subscription: Stripe.Subscription,
  eventType: string,
) {
  const officeId = subscription.metadata?.office_id
    ?? await getOfficeIdByStripeSubscription(admin, subscription.id)

  if (!officeId) {
    console.warn('[stripe-webhook] accountant subscription without office:', subscription.id)
    return
  }

  const plan = eventType === 'customer.subscription.deleted'
    ? 'starter'
    : resolveAccountantPlanFromPriceId(getSubscriptionPrimaryPriceId(subscription))
      ?? resolveAccountantPlanFromMetadata(subscription.metadata)

  if (!plan) {
    console.warn('[stripe-webhook] accountant subscription without supported plan:', subscription.id)
    return
  }

  await syncAccountantBilling(admin, {
    officeId,
    plan,
    status: eventType === 'customer.subscription.deleted'
      ? 'canceled'
      : normalizeAccountantSubscriptionStatus(subscription.status),
    stripeCustomerId: getStripeObjectId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
  })

}

async function handleCheckoutExpired(admin: SupabaseAdminLike, session: Stripe.Checkout.Session) {
  if (!resolveAccountantPlanFromMetadata(session.metadata)) return
  await markAccountantCheckoutExpired(admin, session.id)
}

/**
 * Resolve o subscription id de uma invoice independente da versão do tipo
 * Stripe (campo direto `subscription` ou aninhado em `parent`).
 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const direct = (invoice as { subscription?: string | { id?: string } | null }).subscription
  if (direct) return getStripeObjectId(direct)

  const parent = (invoice as {
    parent?: { subscription_details?: { subscription?: string | { id?: string } | null } | null } | null
  }).parent
  return getStripeObjectId(parent?.subscription_details?.subscription ?? null)
}

/**
 * invoice.paid / invoice.payment_failed — mantém o estado de billing
 * sincronizado nas renovações recorrentes (o checkout inicial não cobre isto).
 *
 * - Assinatura de contador: atualiza office_subscriptions + accountant_offices.
 * - Assinatura de consumidor (monitor_mensal): atualiza user_profiles pelo
 *   stripe_customer_id, já que não há office vinculado.
 */
async function handleInvoiceEvent(
  admin: SupabaseAdminLike,
  invoice: Stripe.Invoice,
  eventType: 'invoice.paid' | 'invoice.payment_failed',
) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) {
    // Invoice avulsa (ex.: relatório one-shot) não tem estado recorrente a sincronizar.
    return
  }

  const paid = eventType === 'invoice.paid'
  const customerId = getStripeObjectId(invoice.customer)

  // Caminho contador: a subscription está registrada em office_subscriptions.
  const officeId = await getOfficeIdByStripeSubscription(admin, subscriptionId)
  if (officeId) {
    const status = paid ? 'active' : 'past_due'
    const subscriptionsTable = admin.from('office_subscriptions') as {
      update(payload: Record<string, unknown>): UpdateQuery
    }
    const officesTable = admin.from('accountant_offices') as {
      update(payload: Record<string, unknown>): UpdateQuery
    }
    await subscriptionsTable
      .update({ status })
      .eq('stripe_subscription_id', subscriptionId)
    await officesTable
      .update({ stripe_subscription_status: status })
      .eq('stripe_subscription_id', subscriptionId)
    return
  }

  // Caminho consumidor: monitor_mensal vive em user_profiles, vinculado pelo customer.
  if (!customerId) {
    console.warn('[stripe-webhook] invoice sem customer e sem office:', invoice.id)
    return
  }
  const profilesTable = admin.from('user_profiles') as {
    update(payload: Record<string, unknown>): UpdateQuery
  }
  await profilesTable
    .update({
      stripe_subscription_status: paid ? 'active' : 'past_due',
      ...(paid ? {} : { plano: 'free' }),
    })
    .eq('stripe_customer_id', customerId)
}

export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook não configurado.' }, { status: 503 })
  }

  const signature = (await headers()).get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Assinatura Stripe ausente.' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripeClient()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assinatura Stripe inválida.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = createAdminClient()
  const idempotency = await markStripeEventProcessed(admin, event.id, event.type)
  if (idempotency.error) {
    console.error('[stripe-webhook] idempotency error:', idempotency.error)
    return NextResponse.json({ error: 'Não foi possível registrar o evento Stripe.' }, { status: 500 })
  }

  if (idempotency.duplicate) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      if (resolveAccountantPlanFromMetadata(session.metadata)) {
        await handleAccountantCheckoutCompleted(admin, stripe, session)
      } else {
        await handleConsumerCheckoutCompleted(admin, session)
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await handleAccountantSubscriptionEvent(
        admin,
        event.data.object as Stripe.Subscription,
        event.type,
      )
    }

    if (event.type === 'checkout.session.expired') {
      await handleCheckoutExpired(admin, event.data.object as Stripe.Checkout.Session)
    }

    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      await handleInvoiceEvent(admin, event.data.object as Stripe.Invoice, event.type)
    }
  } catch (error) {
    console.error('[stripe-webhook] handler error:', error)
    return NextResponse.json({ error: 'Erro ao processar evento Stripe.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
