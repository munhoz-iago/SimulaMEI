import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { isAdminEmail } from '@/lib/auth/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'

interface ProcessedStripeEventRow {
  stripe_event_id: string
  event_type: string | null
  processed_at: string
}

interface DbError {
  message: string
}

interface CountQuery {
  eq(column: string, value: string): Promise<{ count: number | null; error: DbError | null }>
}

function getStripeObjectId(object: Stripe.Event.Data.Object) {
  return typeof object === 'object' && object && 'id' in object && typeof object.id === 'string'
    ? object.id
    : null
}

async function countBy(table: unknown, column: string, value: string) {
  const query = (table as {
    select(columns: string, options: { count: 'exact'; head: true }): CountQuery
  }).select('id', { count: 'exact', head: true })

  const { count, error } = await query.eq(column, value)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe não configurado.' }, { status: 503 })
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const eventsQuery = admin.from('processed_stripe_events') as unknown as {
    select(columns: string): {
      gte(column: string, value: string): {
        order(column: string, options?: { ascending?: boolean }): Promise<{
          data: ProcessedStripeEventRow[] | null
          error: DbError | null
        }>
      }
    }
  }

  const { data, error } = await eventsQuery
    .select('stripe_event_id, event_type, processed_at')
    .gte('processed_at', since)
    .order('processed_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Não foi possível ler eventos Stripe.' }, { status: 500 })
  }

  const stripe = getStripeClient()

  // Paraleliza auditoria de cada evento (Stripe API + 2 DB queries) para evitar
  // N+1 sequencial — com janela de 24h, eventos numerosos faziam o serverless
  // timeout. Promise.all coleta em paralelo; cada task é independente e tem
  // try/catch isolado para não derrubar as outras.
  const auditTasks = (data ?? [])
    .filter(eventRow => eventRow.event_type === 'checkout.session.completed')
    .map(async (eventRow): Promise<{ eventId: string; eventType: string | null; reason: string } | null> => {
      try {
        const stripeEvent = await stripe.events.retrieve(eventRow.stripe_event_id)
        const checkoutSessionId = getStripeObjectId(stripeEvent.data.object)
        if (!checkoutSessionId) {
          return {
            eventId: eventRow.stripe_event_id,
            eventType: eventRow.event_type,
            reason: 'checkout.session.completed sem session id recuperavel',
          }
        }

        const [purchaseCount, subscriptionCount] = await Promise.all([
          countBy(admin.from('purchases'), 'stripe_session_id', checkoutSessionId),
          countBy(admin.from('office_subscriptions'), 'stripe_checkout_session_id', checkoutSessionId),
        ])

        if (purchaseCount === 0 && subscriptionCount === 0) {
          return {
            eventId: eventRow.stripe_event_id,
            eventType: eventRow.event_type,
            reason: `session ${checkoutSessionId} sem purchase ou office_subscription correspondente`,
          }
        }
        return null
      } catch (error) {
        return {
          eventId: eventRow.stripe_event_id,
          eventType: eventRow.event_type,
          reason: error instanceof Error ? `falha ao auditar evento: ${error.message}` : 'falha ao auditar evento',
        }
      }
    })

  const results = await Promise.all(auditTasks)
  const drifts = results.filter((r): r is { eventId: string; eventType: string | null; reason: string } => r !== null)

  return NextResponse.json({
    windowHours: 24,
    processedEvents: data?.length ?? 0,
    drifts,
  })
}
