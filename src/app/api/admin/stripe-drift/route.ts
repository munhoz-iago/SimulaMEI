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
  const drifts: Array<{ eventId: string; eventType: string | null; reason: string }> = []

  for (const eventRow of data ?? []) {
    if (eventRow.event_type !== 'checkout.session.completed') continue

    try {
      const stripeEvent = await stripe.events.retrieve(eventRow.stripe_event_id)
      const checkoutSessionId = getStripeObjectId(stripeEvent.data.object)
      if (!checkoutSessionId) {
        drifts.push({
          eventId: eventRow.stripe_event_id,
          eventType: eventRow.event_type,
          reason: 'checkout.session.completed sem session id recuperavel',
        })
        continue
      }

      const [purchaseCount, subscriptionCount] = await Promise.all([
        countBy(admin.from('purchases'), 'stripe_session_id', checkoutSessionId),
        countBy(admin.from('office_subscriptions'), 'stripe_checkout_session_id', checkoutSessionId),
      ])

      if (purchaseCount === 0 && subscriptionCount === 0) {
        drifts.push({
          eventId: eventRow.stripe_event_id,
          eventType: eventRow.event_type,
          reason: `session ${checkoutSessionId} sem purchase ou office_subscription correspondente`,
        })
      }
    } catch (error) {
      drifts.push({
        eventId: eventRow.stripe_event_id,
        eventType: eventRow.event_type,
        reason: error instanceof Error ? `falha ao auditar evento: ${error.message}` : 'falha ao auditar evento',
      })
    }
  }

  return NextResponse.json({
    windowHours: 24,
    processedEvents: data?.length ?? 0,
    drifts,
  })
}
