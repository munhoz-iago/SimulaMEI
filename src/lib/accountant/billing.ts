import type Stripe from 'stripe'
import { STRIPE_PRODUCTS } from '@/lib/stripe'
import { getAccountantPlanLimit, type AccountantOfficePlan } from './office'

export const ACCOUNTANT_PAID_PLANS = ['starter', 'pro'] as const

export type AccountantPaidPlan = typeof ACCOUNTANT_PAID_PLANS[number]
export type AccountantCheckoutProductKey = 'accountant_starter' | 'accountant_pro'
export type AccountantSubscriptionStatus =
  | 'pending'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid'

export const ACCOUNTANT_PLAN_PRODUCTS: Record<AccountantPaidPlan, AccountantCheckoutProductKey> = {
  starter: 'accountant_starter',
  pro: 'accountant_pro',
}

/**
 * Source-of-truth para os endpoints de checkout dos planos contador.
 * Centraliza as URLs em vez de espalhar literais 'starter' | 'pro' →
 * '/api/checkout/accountant-<plan>' em múltiplos componentes.
 */
export const ACCOUNTANT_CHECKOUT_ENDPOINTS: Record<AccountantPaidPlan, string> = {
  starter: '/api/checkout/accountant-starter',
  pro: '/api/checkout/accountant-pro',
} as const

const ACCOUNTANT_PRODUCT_PLANS: Record<string, AccountantPaidPlan> = {
  accountant_starter: 'starter',
  accountant_pro: 'pro',
}

const ACCOUNTANT_SUBSCRIPTION_STATUSES = new Set<AccountantSubscriptionStatus>([
  'pending',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'unpaid',
])

interface DbError {
  code?: string
  message: string
}

interface QueryResult<T = unknown> {
  data?: T
  error: DbError | null
}

interface SupabaseAdminLike {
  from(table: string): unknown
}

interface OfficeClientLimitRow {
  id: string
  created_at: string
}

interface OfficeClientSelectQuery {
  eq(column: string, value: unknown): OfficeClientSelectQuery
  order(column: string, options?: { ascending?: boolean }): Promise<QueryResult<OfficeClientLimitRow[]>>
}

interface OfficeClientUpdateQuery extends PromiseLike<QueryResult> {
  eq(column: string, value: unknown): OfficeClientUpdateQuery
  in(column: string, values: string[]): Promise<QueryResult>
}

export interface AccountantBillingSyncPayload {
  officeId: string
  plan: AccountantPaidPlan
  status: AccountantSubscriptionStatus
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeCheckoutSessionId?: string | null
  currentPeriodEnd: string | null
}

export function isAccountantPaidPlan(value: unknown): value is AccountantPaidPlan {
  return typeof value === 'string' && ACCOUNTANT_PAID_PLANS.includes(value as AccountantPaidPlan)
}

export function normalizeAccountantSubscriptionStatus(
  status: string | null | undefined,
): AccountantSubscriptionStatus {
  if (status === 'incomplete_expired') return 'canceled'
  if (status === 'paused') return 'past_due'
  if (status && ACCOUNTANT_SUBSCRIPTION_STATUSES.has(status as AccountantSubscriptionStatus)) {
    return status as AccountantSubscriptionStatus
  }

  return 'pending'
}

export function getAccountantStripeProduct(plan: AccountantPaidPlan) {
  return STRIPE_PRODUCTS[ACCOUNTANT_PLAN_PRODUCTS[plan]]
}

export function resolveAccountantPlanFromProduct(product: string | null | undefined) {
  return product ? ACCOUNTANT_PRODUCT_PLANS[product] ?? null : null
}

export function resolveAccountantPlanFromPriceId(priceId: string | null | undefined) {
  if (!priceId) return null

  if (priceId === STRIPE_PRODUCTS.accountant_starter.priceId) return 'starter'
  if (priceId === STRIPE_PRODUCTS.accountant_pro.priceId) return 'pro'

  return null
}

export function resolveAccountantPlanFromMetadata(metadata?: Stripe.Metadata | null) {
  if (isAccountantPaidPlan(metadata?.plan)) return metadata.plan
  return resolveAccountantPlanFromProduct(metadata?.produto)
}

export function getStripeObjectId(value: string | { id?: string } | null | undefined) {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.id ?? null
}

export function stripeTimestampToIso(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null
}

export function getSubscriptionPrimaryPriceId(subscription: Stripe.Subscription | null | undefined) {
  return subscription?.items?.data?.[0]?.price?.id ?? null
}

export function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription | null | undefined) {
  const timestamp = (subscription as { current_period_end?: number | null } | null | undefined)
    ?.current_period_end
  return stripeTimestampToIso(timestamp)
}

export async function isStripeEventProcessed(
  admin: SupabaseAdminLike,
  eventId: string,
) {
  const table = admin.from('processed_stripe_events') as {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<QueryResult<{ stripe_event_id: string } | null>>
      }
    }
  }
  const { data, error } = await table
    .select('stripe_event_id')
    .eq('stripe_event_id', eventId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}

export async function markStripeEventProcessed(
  admin: SupabaseAdminLike,
  eventId: string,
  eventType: string,
) {
  const table = admin.from('processed_stripe_events') as {
    insert(payload: { stripe_event_id: string; event_type: string }): Promise<QueryResult>
  }
  const { error } = await table.insert({
    stripe_event_id: eventId,
    event_type: eventType,
  })

  if (!error) return { duplicate: false, error: null }
  if (error.code === '23505') return { duplicate: true, error: null }

  return { duplicate: false, error: error.message }
}

export async function getOfficeIdByStripeSubscription(
  admin: SupabaseAdminLike,
  stripeSubscriptionId: string,
) {
  const table = admin.from('office_subscriptions') as {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<QueryResult<{ office_id: string } | null>>
      }
    }
  }
  const { data, error } = await table
    .select('office_id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.office_id ?? null
}

export async function applyAccountantPlanLimit(
  admin: SupabaseAdminLike,
  officeId: string,
  plan: AccountantOfficePlan,
) {
  const clientsTable = admin.from('office_clients') as {
    select(columns: string): OfficeClientSelectQuery
    update(payload: Record<string, unknown>): OfficeClientUpdateQuery
  }

  const planLimit = getAccountantPlanLimit(plan)

  // Count currently active clients
  const { data: activeData, error: activeError } = await clientsTable
    .select('id, created_at')
    .eq('office_id', officeId)
    .eq('ativo', true)
    .order('created_at', { ascending: true })

  if (activeError) throw new Error(activeError.message)
  const activeClients = activeData ?? []
  const activeCount = activeClients.length

  // Deactivate excess active clients (downgrade path)
  if (activeCount > planLimit) {
    const excessIds = activeClients.slice(planLimit).map(client => client.id)
    const updateResult = await clientsTable
      .update({
        ativo: false,
        inactive_reason: 'plan_limit',
        disabled_by_plan_limit_at: new Date().toISOString(),
      })
      .in('id', excessIds)

    if (updateResult.error) throw new Error(updateResult.error.message)
    return
  }

  // Reactivate plan_limit clients up to available slots (upgrade path)
  const slotsAvailable = planLimit - activeCount
  if (slotsAvailable <= 0) return

  const { data: disabledData, error: disabledError } = await clientsTable
    .select('id, created_at')
    .eq('office_id', officeId)
    .eq('inactive_reason', 'plan_limit')
    .order('created_at', { ascending: true })

  if (disabledError) throw new Error(disabledError.message)
  const toReactivate = (disabledData ?? []).slice(0, slotsAvailable).map(c => c.id)
  if (toReactivate.length === 0) return

  const reactivateResult = await clientsTable
    .update({
      ativo: true,
      inactive_reason: null,
      disabled_by_plan_limit_at: null,
    })
    .in('id', toReactivate)

  if (reactivateResult.error) throw new Error(reactivateResult.error.message)
}

export async function syncAccountantBilling(
  admin: SupabaseAdminLike,
  payload: AccountantBillingSyncPayload,
) {
  const subscriptionTable = admin.from('office_subscriptions') as {
    upsert(
      payload: Record<string, unknown>,
      options: { onConflict: string },
    ): Promise<QueryResult>
  }
  const officesTable = admin.from('accountant_offices') as {
    update(payload: Record<string, unknown>): {
      eq(column: string, value: string): Promise<QueryResult>
    }
  }

  const subscriptionPayload = {
    office_id: payload.officeId,
    status: payload.status,
    plan: payload.plan,
    stripe_customer_id: payload.stripeCustomerId,
    stripe_subscription_id: payload.stripeSubscriptionId,
    current_period_end: payload.currentPeriodEnd,
    ...(payload.stripeCheckoutSessionId
      ? { stripe_checkout_session_id: payload.stripeCheckoutSessionId }
      : {}),
  }
  const subscriptionResult = await subscriptionTable.upsert(subscriptionPayload, {
    onConflict: 'office_id',
  })

  if (subscriptionResult.error) {
    throw new Error(subscriptionResult.error.message)
  }

  const officeResult = await officesTable
    .update({
      plan: payload.plan,
      max_clients: getAccountantPlanLimit(payload.plan),
      stripe_customer_id: payload.stripeCustomerId,
      stripe_subscription_id: payload.stripeSubscriptionId,
      stripe_subscription_status: payload.status,
      current_period_end: payload.currentPeriodEnd,
      trial_ends_at: null,
    })
    .eq('id', payload.officeId)

  if (officeResult.error) {
    throw new Error(officeResult.error.message)
  }

  await applyAccountantPlanLimit(admin, payload.officeId, payload.plan)
}

export async function markAccountantCheckoutExpired(
  admin: SupabaseAdminLike,
  checkoutSessionId: string,
) {
  const table = admin.from('office_subscriptions') as {
    update(payload: Record<string, unknown>): {
      eq(column: string, value: string): Promise<QueryResult>
    }
  }

  const { error } = await table
    .update({ status: 'canceled' })
    .eq('stripe_checkout_session_id', checkoutSessionId)

  if (error) {
    throw new Error(error.message)
  }
}
