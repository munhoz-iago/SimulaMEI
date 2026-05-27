import { NextResponse } from 'next/server'
import { getCurrentAccountantOffice } from '@/lib/accountant/server'
import { createClient } from '@/lib/supabase/server'
import { getCheckoutUrl, getStripeClient, isStripeConfigured, STRIPE_PRODUCTS } from '@/lib/stripe'
import { isAccountantPaidPlan, type AccountantPaidPlan } from '@/lib/accountant/billing'

interface PortalRequestBody {
  /**
   * Quando setado, abre o Portal Stripe em modo de troca de plano travado
   * em `targetPlan`. SEM esse flag o Portal abre na home (cartão, faturas,
   * cancelamento).
   */
  flowType?: 'subscription_update'
  /**
   * Obrigatório quando flowType='subscription_update'. Determina o priceId
   * alvo passado para `subscription_update_confirm.items[].price`,
   * impedindo o owner de pular para outros preços do catálogo via UI Stripe
   * (P1.7).
   */
  targetPlan?: AccountantPaidPlan
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
  }

  const { office, error } = await getCurrentAccountantOffice(supabase, user.id, user.email)
  if (error) {
    console.error('[/api/billing/portal] office query error:', error)
    return NextResponse.json({ error: 'Não foi possível carregar o escritório contador.' }, { status: 500 })
  }

  if (!office) {
    return NextResponse.json({ error: 'Escritório contador não configurado.' }, { status: 403 })
  }

  // P1.3: abrir Portal (cartão, cancelamento, troca de plano) é ação de billing
  // sensível — só owner pode fazer.
  if (office.role !== 'owner') {
    return NextResponse.json(
      { error: 'Apenas o owner do escritório pode acessar o portal de cobrança.' },
      { status: 403 },
    )
  }

  if (!office.stripe_customer_id) {
    return NextResponse.json({ error: 'Este escritório ainda não tem assinatura ativa no Stripe.' }, { status: 409 })
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe ainda não está configurado neste ambiente.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null) as PortalRequestBody | null
  const wantsSubscriptionUpdate = body?.flowType === 'subscription_update'

  if (wantsSubscriptionUpdate) {
    if (!office.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Assinatura ativa não encontrada para alteração de plano.' },
        { status: 409 },
      )
    }
    // P1.7: troca de plano via Portal SEMPRE exige targetPlan amarrado server-side.
    // Sem isso, o Portal exibiria todos os produtos da Portal Configuration e o
    // owner poderia trocar Pro → Monitor (R$ 19) ou outros preços indesejados.
    if (!isAccountantPaidPlan(body?.targetPlan)) {
      return NextResponse.json(
        { error: 'targetPlan é obrigatório (accountant_starter ou accountant_pro) para alteração de plano via Portal.' },
        { status: 400 },
      )
    }
  }

  const stripe = getStripeClient()

  if (wantsSubscriptionUpdate && body?.targetPlan && office.stripe_subscription_id) {
    // P1.7: busca o subscription item ID e amarra `items[].price` no flow do Portal.
    let existingSubscriptionItemId: string | null = null
    try {
      const subscription = await stripe.subscriptions.retrieve(office.stripe_subscription_id)
      existingSubscriptionItemId = subscription.items?.data?.[0]?.id ?? null
    } catch (err) {
      console.error('[/api/billing/portal] subscription retrieve error:', err)
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

    const targetProductKey = body.targetPlan === 'pro' ? 'accountant_pro' : 'accountant_starter'
    const targetPriceId = STRIPE_PRODUCTS[targetProductKey].priceId
    if (!targetPriceId) {
      return NextResponse.json(
        { error: 'Price ID do plano alvo não configurado neste ambiente.' },
        { status: 503 },
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: office.stripe_customer_id,
      return_url: getCheckoutUrl(`/contador/assinatura?changed=${body.targetPlan}`),
      flow_data: {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: office.stripe_subscription_id,
          items: [{
            id: existingSubscriptionItemId,
            price: targetPriceId,
            quantity: 1,
          }],
        },
      },
    })

    return NextResponse.json({ url: session.url })
  }

  // Caso default: Portal genérico (gerenciar cartão, faturas, cancelar).
  const session = await stripe.billingPortal.sessions.create({
    customer: office.stripe_customer_id,
    return_url: getCheckoutUrl('/contador/assinatura'),
  })

  return NextResponse.json({ url: session.url })
}
