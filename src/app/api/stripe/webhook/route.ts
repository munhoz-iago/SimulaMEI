import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import {
  getOfficeIdByStripeSubscription,
  getStripeObjectId,
  getSubscriptionCurrentPeriodEnd,
  getSubscriptionPrimaryPriceId,
  isStripeEventProcessed,
  markAccountantCheckoutExpired,
  markOfficeDisputed,
  markStripeEventProcessed,
  normalizeAccountantSubscriptionStatus,
  resolveAccountantPlanFromMetadata,
  resolveAccountantPlanFromPriceId,
  revertOfficeOnRefund,
  syncAccountantBilling,
  updateOfficeSubscriptionStatus,
} from '@/lib/accountant/billing'
import { getConfiguredAdminEmails } from '@/lib/auth/admin-access'
import {
  sendDisputeNotification,
  sendPaymentFailedNotification,
  sendRefundNotification,
  sendSubscriptionPausedNotification,
} from '@/lib/resend'
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
  const clientRef = session.client_reference_id

  // P2 cross-check: atacante poderia criar checkout passando metadata.user_id=victim_id
  // (metadata é controlada pelo client em alguns paths) e fazer o handler gravar
  // purchase/plano no perfil da vítima. Se client_reference_id estiver presente
  // E não bater com metadata.user_id, rejeita o evento.
  // Retorna sem erro (200) pra Stripe não retentar — log no servidor pra auditoria.
  if (clientRef && userId && clientRef !== userId) {
    console.error('[stripe-webhook] consumer checkout user_id mismatch:', {
      metadataUserId: userId,
      clientRef,
      sessionId: session.id,
    })
    return
  }

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
 * invoice.payment_failed: Stripe falhou em cobrar a fatura recorrente.
 * Office vira past_due e owner recebe notificacao com link pro portal.
 */
async function handleInvoicePaymentFailed(admin: SupabaseAdminLike, invoice: Stripe.Invoice) {
  // Stripe v22: invoice.subscription pode estar em invoice.parent.subscription_details
  const subscriptionId = extractSubscriptionIdFromInvoice(invoice)
  if (!subscriptionId) {
    console.warn('[stripe-webhook] invoice.payment_failed sem subscription:', invoice.id)
    return
  }

  const context = await updateOfficeSubscriptionStatus(admin, subscriptionId, 'past_due')
  if (!context) {
    console.warn('[stripe-webhook] invoice.payment_failed sem office vinculado:', subscriptionId)
    return
  }

  if (context.ownerEmail) {
    try {
      await sendPaymentFailedNotification({
        to: context.ownerEmail,
        officeName: context.officeName,
      })
    } catch (error) {
      console.warn('[stripe-webhook] email payment_failed falhou:', error)
    }
  }
}

/**
 * customer.subscription.paused: Stripe pausou a subscription (ex: trial sem
 * payment method depois do bypass). Office vira paused, plan limits aplicam
 * imediato via syncAccountantBilling com plan='starter'.
 */
async function handleSubscriptionPaused(admin: SupabaseAdminLike, sub: Stripe.Subscription) {
  const context = await updateOfficeSubscriptionStatus(admin, sub.id, 'paused')
  if (!context) {
    console.warn('[stripe-webhook] subscription.paused sem office vinculado:', sub.id)
    return
  }

  // Pausa efetiva: rebaixa pra starter pra aplicar limites de cliente imediatamente.
  // O office mantem stripe_subscription_id e pode ser retomado via resumed event.
  try {
    await syncAccountantBilling(admin, {
      officeId: context.officeId,
      plan: 'starter',
      status: 'paused',
      stripeCustomerId: getStripeObjectId(sub.customer),
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: getSubscriptionCurrentPeriodEnd(sub),
    })
  } catch (error) {
    console.warn('[stripe-webhook] subscription.paused plan downgrade falhou:', error)
  }

  if (context.ownerEmail) {
    try {
      await sendSubscriptionPausedNotification({
        to: context.ownerEmail,
        officeName: context.officeName,
      })
    } catch (error) {
      console.warn('[stripe-webhook] email subscription.paused falhou:', error)
    }
  }
}

/**
 * charge.refunded: admin emitiu refund no Dashboard Stripe. Reverter office
 * pra starter+canceled e desativar clientes excedentes via syncAccountantBilling.
 */
async function handleChargeRefunded(
  admin: SupabaseAdminLike,
  stripe: Stripe,
  charge: Stripe.Charge,
) {
  const invoiceId = getStripeObjectId(getChargeInvoice(charge))
  if (!invoiceId) {
    // Refund de pagamento single (relatorio), nao subscription. Sem acao no contador.
    return
  }

  let subscriptionId: string | null = null
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId)
    subscriptionId = extractSubscriptionIdFromInvoice(invoice)
  } catch (error) {
    console.warn('[stripe-webhook] charge.refunded invoice retrieve falhou:', error)
    return
  }

  if (!subscriptionId) {
    console.warn('[stripe-webhook] charge.refunded invoice sem subscription:', invoiceId)
    return
  }

  const context = await revertOfficeOnRefund(admin, subscriptionId)
  if (!context) {
    console.warn('[stripe-webhook] charge.refunded sem office vinculado:', subscriptionId)
    return
  }

  if (context.ownerEmail) {
    try {
      await sendRefundNotification({
        to: context.ownerEmail,
        officeName: context.officeName,
      })
    } catch (error) {
      console.warn('[stripe-webhook] email refund falhou:', error)
    }
  }
}

/**
 * charge.dispute.created: chargeback aberto. Office nao bloqueia (dispute pode
 * resolver a favor), mas flagga disputed_at e notifica admin via email.
 */
async function handleChargeDisputeCreated(
  admin: SupabaseAdminLike,
  stripe: Stripe,
  dispute: Stripe.Dispute,
) {
  // Dispute -> Charge -> Invoice -> Subscription -> Office
  let subscriptionId: string | null = null
  let customerId: string | null = null

  const chargeId = getStripeObjectId(dispute.charge)
  if (chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId)
      customerId = getStripeObjectId(charge.customer)
      const invoiceId = getStripeObjectId(getChargeInvoice(charge))
      if (invoiceId) {
        const invoice = await stripe.invoices.retrieve(invoiceId)
        subscriptionId = extractSubscriptionIdFromInvoice(invoice)
      }
    } catch (error) {
      console.warn('[stripe-webhook] dispute.created charge retrieve falhou:', error)
    }
  }

  const context = await markOfficeDisputed(admin, subscriptionId, customerId)
  if (!context) {
    console.warn('[stripe-webhook] dispute.created sem office vinculado:', dispute.id)
    return
  }

  const adminEmail = getConfiguredAdminEmails()[0]
  if (adminEmail) {
    try {
      await sendDisputeNotification({
        adminEmail,
        officeName: context.officeName,
        disputeId: dispute.id,
        reason: dispute.reason ?? null,
        amountCents: dispute.amount ?? 0,
        currency: dispute.currency ?? 'brl',
      })
    } catch (error) {
      console.warn('[stripe-webhook] email dispute falhou:', error)
    }
  }
}

/**
 * Stripe v22+: Charge.invoice nao esta no tipo publico (precisa expand),
 * mas o payload do webhook sempre traz como string. Acessa via cast.
 */
function getChargeInvoice(charge: Stripe.Charge): string | { id?: string } | null {
  return (charge as unknown as { invoice?: string | { id?: string } | null }).invoice ?? null
}

/**
 * Stripe v22+: invoice.subscription foi descontinuado em favor de
 * invoice.parent.subscription_details.subscription. Aceita ambos.
 */
function extractSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const direct = getStripeObjectId(
    (invoice as unknown as { subscription?: string | { id?: string } | null }).subscription,
  )
  if (direct) return direct

  const parent = (invoice as unknown as {
    parent?: { subscription_details?: { subscription?: string | { id?: string } | null } | null } | null
  }).parent
  return getStripeObjectId(parent?.subscription_details?.subscription)
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

  try {
    const isDuplicate = await isStripeEventProcessed(admin, event.id)
    if (isDuplicate) {
      return NextResponse.json({ received: true, duplicate: true })
    }
  } catch (error) {
    console.error('[stripe-webhook] idempotency read error:', {
      eventId: event.id,
      eventType: event.type,
      error,
    })
    return NextResponse.json({ error: 'Não foi possível validar o evento Stripe.' }, { status: 500 })
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

    if (event.type === 'invoice.payment_failed') {
      await handleInvoicePaymentFailed(admin, event.data.object as Stripe.Invoice)
    }

    if (event.type === 'customer.subscription.paused') {
      await handleSubscriptionPaused(admin, event.data.object as Stripe.Subscription)
    }

    if (event.type === 'charge.refunded') {
      await handleChargeRefunded(admin, stripe, event.data.object as Stripe.Charge)
    }

    if (event.type === 'charge.dispute.created') {
      await handleChargeDisputeCreated(admin, stripe, event.data.object as Stripe.Dispute)
    }
  } catch (error) {
    console.error('[stripe-webhook] handler error:', {
      eventId: event.id,
      eventType: event.type,
      error,
    })
    return NextResponse.json({ error: 'Erro ao processar evento Stripe.' }, { status: 500 })
  }

  const idempotency = await markStripeEventProcessed(admin, event.id, event.type)
  if (idempotency.error) {
    console.warn('[stripe-webhook] idempotency write error after handler success:', {
      eventId: event.id,
      eventType: event.type,
      error: idempotency.error,
    })
  }

  return NextResponse.json({ received: true })
}
