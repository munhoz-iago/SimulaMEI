import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createBrandedCheckoutSession, getCheckoutUrl, getStripeClient, isStripeConfigured } from '@/lib/stripe'
import { getCurrentAccountantOffice, type CurrentAccountantOffice } from './server'
import {
  getAccountantStripeProduct,
  type AccountantPaidPlan,
} from './billing'

interface DbError {
  message: string
}

interface OfficeSubscriptionRow {
  id: string
  plan: AccountantPaidPlan
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

interface OfficeSubscriptionsTable {
  select(columns: string): {
    eq(column: string, value: string): {
      maybeSingle(): Promise<{ data: OfficeSubscriptionRow | null; error: DbError | null }>
    }
  }
  update(payload: Record<string, unknown>): {
    eq(column: string, value: string): Promise<{ error: DbError | null }>
  }
  insert(payload: Record<string, unknown>): Promise<{ error: DbError | null }>
}

const LIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due'])

function getOfficeLiveSubscription(
  office: CurrentAccountantOffice,
  stored: OfficeSubscriptionRow | null,
): OfficeSubscriptionRow | null {
  const candidate = stored ?? (
    office.stripe_customer_id && office.stripe_subscription_id && (office.plan === 'starter' || office.plan === 'pro')
      ? {
          id: office.id,
          plan: office.plan,
          status: office.stripe_subscription_status ?? 'active',
          stripe_customer_id: office.stripe_customer_id,
          stripe_subscription_id: office.stripe_subscription_id,
        }
      : null
  )

  if (!candidate?.stripe_customer_id || !candidate.stripe_subscription_id) return null
  return LIVE_SUBSCRIPTION_STATUSES.has(candidate.status) ? candidate : null
}

async function getStoredSubscription(table: OfficeSubscriptionsTable, officeId: string) {
  const { data, error } = await table
    .select('id, plan, status, stripe_customer_id, stripe_subscription_id')
    .eq('office_id', officeId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

async function markPendingSubscription(
  table: OfficeSubscriptionsTable,
  officeId: string,
  plan: AccountantPaidPlan,
  sessionId: string,
) {
  const existing = await getStoredSubscription(table, officeId)
  if (existing) {
    const { error } = await table
      .update({
        status: 'pending',
        plan,
        stripe_checkout_session_id: sessionId,
      })
      .eq('office_id', officeId)

    if (error) throw new Error(error.message)
    return
  }

  const { error } = await table.insert({
    office_id: officeId,
    status: 'pending',
    plan,
    stripe_checkout_session_id: sessionId,
  })

  if (error) throw new Error(error.message)
}

export async function createAccountantCheckout(plan: AccountantPaidPlan) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Autenticação obrigatória para assinar o plano contador.' },
      { status: 401 },
    )
  }

  const { office, error } = await getCurrentAccountantOffice(supabase, user.id, user.email)
  if (error) {
    console.error('[/api/checkout/accountant] office query error:', error)
    return NextResponse.json(
      { error: 'Não foi possível carregar o escritório contador.' },
      { status: 500 },
    )
  }

  if (!office) {
    return NextResponse.json(
      { error: 'Crie o escritório contador antes de assinar um plano.' },
      { status: 403 },
    )
  }

  if (office.role !== 'owner') {
    return NextResponse.json(
      { error: 'Apenas o owner do escritório pode alterar o plano.' },
      { status: 403 },
    )
  }

  const product = getAccountantStripeProduct(plan)
  if (!isStripeConfigured() || !product.priceId) {
    return NextResponse.json(
      { error: 'Stripe ainda não está configurado para planos contador neste ambiente.' },
      { status: 503 },
    )
  }

  const admin = createAdminClient()
  const subscriptions = admin.from('office_subscriptions') as unknown as OfficeSubscriptionsTable
  let storedSubscription: OfficeSubscriptionRow | null
  try {
    storedSubscription = await getStoredSubscription(subscriptions, office.id)
  } catch (error) {
    console.error('[/api/checkout/accountant] subscription lookup error:', error)
    return NextResponse.json(
      { error: 'Não foi possível carregar a assinatura atual do escritório.' },
      { status: 500 },
    )
  }

  const liveSubscription = getOfficeLiveSubscription(office, storedSubscription)
  if (liveSubscription?.plan === plan) {
    return NextResponse.json({
      url: getCheckoutUrl(`/contador/assinatura?already=${plan}`),
    })
  }

  if (liveSubscription) {
    const stripeCustomerId = liveSubscription.stripe_customer_id
    const stripeSubscriptionId = liveSubscription.stripe_subscription_id
    if (!stripeCustomerId || !stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'Assinatura Stripe incompleta para alteração de plano.' },
        { status: 409 },
      )
    }

    // P1.7: amarra o flow do Portal ao plano alvo. SEM `items[].price` o Portal
    // mostraria todos os preços expostos na Portal Configuration (ex: Monitor
    // R$ 19), permitindo ao owner pular de Pro → Monitor pela UI do Stripe.
    // Com `subscription_update_confirm` + items[{ id, price }] o Portal exibe
    // apenas o preço alvo e confirma a troca — fluxo determinístico server-side.
    const stripe = getStripeClient()
    let existingSubscriptionItemId: string | null = null
    try {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
      existingSubscriptionItemId = subscription.items?.data?.[0]?.id ?? null
    } catch (err) {
      console.error('[/api/checkout/accountant] subscription retrieve error:', err)
      return NextResponse.json(
        { error: 'Não foi possível carregar a assinatura no Stripe.' },
        { status: 502 },
      )
    }

    if (!existingSubscriptionItemId) {
      return NextResponse.json(
        { error: 'Assinatura Stripe sem item para atualizar.' },
        { status: 409 },
      )
    }

    if (!product.priceId) {
      return NextResponse.json(
        { error: 'Price ID do plano alvo não configurado neste ambiente.' },
        { status: 503 },
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: getCheckoutUrl(`/contador/assinatura?changed=${plan}`),
      flow_data: {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: stripeSubscriptionId,
          items: [{
            id: existingSubscriptionItemId,
            price: product.priceId,
            quantity: 1,
          }],
        },
      },
    })

    return NextResponse.json({ url: session.url })
  }

  const session = await createBrandedCheckoutSession({
    product: plan === 'pro' ? 'accountant_pro' : 'accountant_starter',
    userId: user.id,
    userEmail: user.email,
    mode: 'subscription',
    extraMetadata: {
      office_id: office.id,
      plan,
    },
  })

  if (!session.url) {
    return NextResponse.json(
      { error: 'Stripe não retornou uma URL de checkout.' },
      { status: 502 },
    )
  }

  try {
    await markPendingSubscription(subscriptions, office.id, plan, session.id)
  } catch (error) {
    console.error('[/api/checkout/accountant] pending subscription error:', error)
    return NextResponse.json(
      { error: 'Checkout criado, mas não foi possível registrar a assinatura pendente.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ url: session.url })
}
