import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBrandedCheckoutSession, isStripeConfigured, STRIPE_PRODUCTS } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória para assinar o monitor.' }, { status: 401 })
  }

  if (!isStripeConfigured() || !STRIPE_PRODUCTS.monitor_mensal.priceId) {
    return NextResponse.json({ error: 'Stripe ainda não está configurado neste ambiente.' }, { status: 503 })
  }

  try {
    const session = await createBrandedCheckoutSession({
      product: 'monitor_mensal',
      userId: user.id,
      userEmail: user.email,
      mode: 'subscription',
    })

    await supabase.from('purchases').insert({
      user_id: user.id,
      produto: STRIPE_PRODUCTS.monitor_mensal.product,
      status: 'pending',
      valor_centavos: STRIPE_PRODUCTS.monitor_mensal.valorCentavos,
      stripe_session_id: session.id,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    // P2: Stripe error messages podem conter acct_*, price IDs, paths do catálogo.
    // Log completo server-side, mensagem genérica pro cliente.
    console.error('[checkout/monitor] stripe error:', err)
    return NextResponse.json(
      { error: 'Não foi possível iniciar o checkout. Tente novamente em alguns minutos.' },
      { status: 500 },
    )
  }
}
