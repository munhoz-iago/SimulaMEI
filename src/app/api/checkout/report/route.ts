import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBrandedCheckoutSession, isStripeConfigured, STRIPE_PRODUCTS } from '@/lib/stripe'
import { reportFingerprint } from '@/lib/reports/reportFingerprint'
import { isResultadoVazio } from '@/lib/reports/reportEligibility'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória para comprar o relatório.' }, { status: 401 })
  }

  if (!isStripeConfigured() || !STRIPE_PRODUCTS.relatorio.priceId) {
    return NextResponse.json({ error: 'Stripe ainda não está configurado neste ambiente.' }, { status: 503 })
  }

  const { data: sims } = await supabase
    .from('simulations')
    .select('id, resultado')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
  const sim = sims?.[0] as { id: string; resultado: { entrada?: unknown } } | undefined
  if (!sim || isResultadoVazio(sim.resultado as never)) {
    return NextResponse.json({ error: 'Refaça a simulação com seus dados antes de pagar o relatório.' }, { status: 422 })
  }
  const fingerprint = reportFingerprint((sim.resultado as { entrada?: never }).entrada)

  try {
    const session = await createBrandedCheckoutSession({
      product: 'relatorio',
      userId: user.id,
      userEmail: user.email,
      mode: 'payment',
      extraMetadata: { report_fingerprint: fingerprint, simulation_id: sim.id },
    })

    await supabase.from('purchases').insert({
      user_id: user.id,
      produto: STRIPE_PRODUCTS.relatorio.product,
      status: 'pending',
      valor_centavos: STRIPE_PRODUCTS.relatorio.valorCentavos,
      stripe_session_id: session.id,
      report_fingerprint: fingerprint,
      simulation_id: sim.id,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    // P2: Stripe error messages podem conter acct_*, price IDs, ou paths do
    // catálogo. NÃO exibir pro cliente — log completo server-side, mensagem
    // genérica pro cliente.
    console.error('[checkout/report] stripe error:', err)
    return NextResponse.json(
      { error: 'Não foi possível iniciar o checkout. Tente novamente em alguns minutos.' },
      { status: 500 },
    )
  }
}
