import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  constructEventMock,
  createAdminClientMock,
  headersMock,
  isStripeConfiguredMock,
  processedInsertMock,
  subscriptionRetrieveMock,
  subscriptionSelectMock,
  subscriptionUpsertMock,
  subscriptionUpdateMock,
  officesUpdateMock,
  clientsSelectMock,
  clientsUpdateMock,
  purchasesUpdateMock,
  profilesUpdateMock,
} = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  headersMock: vi.fn(),
  isStripeConfiguredMock: vi.fn(),
  processedInsertMock: vi.fn(),
  subscriptionRetrieveMock: vi.fn(),
  subscriptionSelectMock: vi.fn(),
  subscriptionUpsertMock: vi.fn(),
  subscriptionUpdateMock: vi.fn(),
  officesUpdateMock: vi.fn(),
  clientsSelectMock: vi.fn(),
  clientsUpdateMock: vi.fn(),
  purchasesUpdateMock: vi.fn(),
  profilesUpdateMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: headersMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/stripe', () => ({
  STRIPE_PRODUCTS: {
    accountant_starter: {
      product: 'accountant_starter',
      priceId: 'price_starter',
      valorCentavos: 9700,
      successPath: '/upgrade/contador?checkout=success&plan=starter',
      cancelPath: '/upgrade/contador?checkout=cancel&plan=starter',
    },
    accountant_pro: {
      product: 'accountant_pro',
      priceId: 'price_pro',
      valorCentavos: 24700,
      successPath: '/upgrade/contador?checkout=success&plan=pro',
      cancelPath: '/upgrade/contador?checkout=cancel&plan=pro',
    },
  },
  getStripeClient: () => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
    subscriptions: {
      retrieve: subscriptionRetrieveMock,
    },
  }),
  isStripeConfigured: isStripeConfiguredMock,
}))

import { POST } from './route'

function makeRequest() {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: true }),
  })
}

function makePromiseChain(result: { error: null | { message: string } } = { error: null }) {
  const chain = {
    eq: vi.fn(() => chain),
    in: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

function makeSelectChain<T>(rows: T[]) {
  const result = { data: rows, error: null }
  const chain = {
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve({ data: rows[0] ?? null, error: null })),
  }
  return chain
}

function makeAdminClient(options?: {
  activeClients?: Array<{ id: string; created_at: string }>
  storedSubscription?: Record<string, unknown> | null
}) {
  const activeClients = options?.activeClients ?? []
  const storedSubscription = options && 'storedSubscription' in options
    ? options.storedSubscription
    : { office_id: 'office-1', plan: 'pro' }

  const fromMock = vi.fn((table: string) => {
    if (table === 'processed_stripe_events') {
      return { insert: processedInsertMock }
    }

    if (table === 'office_subscriptions') {
      return {
        upsert: subscriptionUpsertMock,
        update: subscriptionUpdateMock,
        select: subscriptionSelectMock.mockReturnValue(makeSelectChain(
          storedSubscription ? [storedSubscription] : [],
        )),
      }
    }

    if (table === 'accountant_offices') {
      return { update: officesUpdateMock }
    }

    if (table === 'purchases') {
      return { update: purchasesUpdateMock }
    }

    if (table === 'user_profiles') {
      return { update: profilesUpdateMock }
    }

    if (table === 'office_clients') {
      return {
        select: clientsSelectMock.mockReturnValue(makeSelectChain(activeClients)),
        update: clientsUpdateMock,
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return { from: fromMock }
}

describe('/api/stripe/webhook POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    headersMock.mockResolvedValue(new Headers({ 'stripe-signature': 'sig_test' }))
    isStripeConfiguredMock.mockReturnValue(true)
    processedInsertMock.mockResolvedValue({ error: null })
    subscriptionUpsertMock.mockResolvedValue({ error: null })
    subscriptionUpdateMock.mockReturnValue(makePromiseChain())
    officesUpdateMock.mockReturnValue(makePromiseChain())
    clientsUpdateMock.mockReturnValue(makePromiseChain())
    purchasesUpdateMock.mockReturnValue(makePromiseChain())
    profilesUpdateMock.mockReturnValue(makePromiseChain())
    createAdminClientMock.mockReturnValue(makeAdminClient())
    subscriptionRetrieveMock.mockResolvedValue({
      id: 'sub_1',
      customer: 'cus_1',
      status: 'active',
      current_period_end: 1_800_000_000,
      items: { data: [{ price: { id: 'price_pro' } }] },
      metadata: {
        user_id: 'user-1',
        office_id: 'office-1',
        produto: 'accountant_pro',
        plan: 'pro',
      },
    })
  })

  it('short-circuits duplicate Stripe events before mutating subscriptions', async () => {
    processedInsertMock.mockResolvedValueOnce({
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })
    constructEventMock.mockReturnValue({
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          customer: 'cus_1',
          subscription: 'sub_1',
          client_reference_id: 'office-1',
          metadata: { produto: 'accountant_pro', plan: 'pro', office_id: 'office-1' },
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true })
    expect(subscriptionUpsertMock).not.toHaveBeenCalled()
    expect(officesUpdateMock).not.toHaveBeenCalled()
  })

  it('activates the accountant office plan after checkout.session.completed', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          customer: 'cus_1',
          subscription: 'sub_1',
          client_reference_id: 'office-1',
          metadata: {
            user_id: 'user-1',
            office_id: 'office-1',
            produto: 'accountant_pro',
            plan: 'pro',
          },
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(processedInsertMock).toHaveBeenCalledWith({
      stripe_event_id: 'evt_checkout',
      event_type: 'checkout.session.completed',
    })
    expect(subscriptionUpsertMock).toHaveBeenCalledWith(expect.objectContaining({
      office_id: 'office-1',
      status: 'active',
      plan: 'pro',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      stripe_checkout_session_id: 'cs_1',
      current_period_end: '2027-01-15T08:00:00.000Z',
    }), { onConflict: 'office_id' })
    expect(officesUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      plan: 'pro',
      max_clients: 150,
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      stripe_subscription_status: 'active',
      current_period_end: '2027-01-15T08:00:00.000Z',
      trial_ends_at: null,
    }))
  })

  it('downgrades canceled subscriptions to starter and pauses only clients above the starter limit', async () => {
    const activeClients = Array.from({ length: 31 }, (_, index) => ({
      id: `client-${String(index + 1).padStart(2, '0')}`,
      created_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    }))
    createAdminClientMock.mockReturnValue(makeAdminClient({ activeClients }))
    constructEventMock.mockReturnValue({
      id: 'evt_deleted',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'canceled',
          current_period_end: 1_800_000_000,
          items: { data: [{ price: { id: 'price_pro' } }] },
          metadata: { office_id: 'office-1', plan: 'pro', produto: 'accountant_pro' },
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(officesUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      plan: 'starter',
      max_clients: 30,
      stripe_subscription_status: 'canceled',
    }))
    expect(clientsSelectMock).toHaveBeenCalledWith('id, created_at')
    expect(clientsUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      ativo: false,
      inactive_reason: 'plan_limit',
      disabled_by_plan_limit_at: expect.any(String),
    }))
    const updateChain = clientsUpdateMock.mock.results[0]?.value
    expect(updateChain.in).toHaveBeenCalledWith('id', ['client-31'])
  })

  it('persists report_fingerprint and simulation_id when a report purchase is paid', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_report',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_report',
          payment_intent: 'pi_report',
          customer: 'cus_report',
          metadata: {
            user_id: 'u1',
            produto: 'relatorio',
            report_fingerprint: 'abc123',
            simulation_id: 'sim-1',
          },
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(purchasesUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'paid',
      report_fingerprint: 'abc123',
      simulation_id: 'sim-1',
    }))
  })
})
