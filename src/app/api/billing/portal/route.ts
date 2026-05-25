import { NextResponse } from 'next/server'
import { getCurrentAccountantOffice } from '@/lib/accountant/server'
import { createClient } from '@/lib/supabase/server'
import { getCheckoutUrl, getStripeClient, isStripeConfigured } from '@/lib/stripe'

interface PortalRequestBody {
  flowType?: 'subscription_update'
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

  if (!office.stripe_customer_id) {
    return NextResponse.json({ error: 'Este escritório ainda não tem assinatura ativa no Stripe.' }, { status: 409 })
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe ainda não está configurado neste ambiente.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null) as PortalRequestBody | null
  if (body?.flowType === 'subscription_update' && !office.stripe_subscription_id) {
    return NextResponse.json({ error: 'Assinatura ativa não encontrada para alteração de plano.' }, { status: 409 })
  }

  const session = await getStripeClient().billingPortal.sessions.create({
    customer: office.stripe_customer_id,
    return_url: getCheckoutUrl('/contador/assinatura'),
    ...(body?.flowType === 'subscription_update'
      ? {
          flow_data: {
            type: 'subscription_update' as const,
            subscription_update: {
              subscription: office.stripe_subscription_id!,
            },
          },
        }
      : {}),
  })

  return NextResponse.json({ url: session.url })
}
