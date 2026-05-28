import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  constructEventMock,
  createAdminClientMock,
  headersMock,
  isStripeConfiguredMock,
  processedInsertMock,
  processedSelectMock,
  subscriptionRetrieveMock,
  invoiceRetrieveMock,
  chargeRetrieveMock,
  subscriptionSelectMock,
  subscriptionUpsertMock,
  subscriptionUpdateMock,
  officesUpdateMock,
  officesSelectMock,
  clientsSelectMock,
  clientsUpdateMock,
  purchasesUpdateMock,
  profilesUpdateMock,
  sendPaymentFailedNotificationMock,
  sendSubscriptionPausedNotificationMock,
  sendRefundNotificationMock,
  sendDisputeNotificationMock,
  authAdminGetUserByIdMock,
} = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  headersMock: vi.fn(),
  isStripeConfiguredMock: vi.fn(),
  processedInsertMock: vi.fn(),
  processedSelectMock: vi.fn(),
  subscriptionRetrieveMock: vi.fn(),
  invoiceRetrieveMock: vi.fn(),
  chargeRetrieveMock: vi.fn(),
  subscriptionSelectMock: vi.fn(),
  subscriptionUpsertMock: vi.fn(),
  subscriptionUpdateMock: vi.fn(),
  officesUpdateMock: vi.fn(),
  officesSelectMock: vi.fn(),
  clientsSelectMock: vi.fn(),
  clientsUpdateMock: vi.fn(),
  purchasesUpdateMock: vi.fn(),
  profilesUpdateMock: vi.fn(),
  sendPaymentFailedNotificationMock: vi.fn(),
  sendSubscriptionPausedNotificationMock: vi.fn(),
  sendRefundNotificationMock: vi.fn(),
  sendDisputeNotificationMock: vi.fn(),
  authAdminGetUserByIdMock: vi.fn(),
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
    invoices: {
      retrieve: invoiceRetrieveMock,
    },
    charges: {
      retrieve: chargeRetrieveMock,
    },
  }),
  isStripeConfigured: isStripeConfiguredMock,
}))

vi.mock('@/lib/resend', () => ({
  sendPaymentFailedNotification: sendPaymentFailedNotificationMock,
  sendSubscriptionPausedNotification: sendSubscriptionPausedNotificationMock,
  sendRefundNotification: sendRefundNotificationMock,
  sendDisputeNotification: sendDisputeNotificationMock,
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

const DEFAULT_OFFICE_ROW = {
  id: 'office-1',
  name: 'Prime Contabilidade',
  owner_user_id: 'owner-user-1',
}

function makeAdminClient(options?: {
  activeClients?: Array<{ id: string; created_at: string }>
  storedSubscription?: Record<string, unknown> | null
  subscriptionContext?: Record<string, unknown> | null
  officeRow?: Record<string, unknown> | null
}) {
  const activeClients = options?.activeClients ?? []
  const storedSubscription = options && 'storedSubscription' in options
    ? options.storedSubscription
    : { office_id: 'office-1', plan: 'pro' }
  const subscriptionContext = options && 'subscriptionContext' in options
    ? options.subscriptionContext
    : {
        office_id: 'office-1',
        accountant_offices: DEFAULT_OFFICE_ROW,
      }
  const officeRow = options && 'officeRow' in options
    ? options.officeRow
    : DEFAULT_OFFICE_ROW

  const fromMock = vi.fn((table: string) => {
    if (table === 'processed_stripe_events') {
      return {
        insert: processedInsertMock,
        select: processedSelectMock,
      }
    }

    if (table === 'office_subscriptions') {
      return {
        upsert: subscriptionUpsertMock,
        update: subscriptionUpdateMock,
        select: subscriptionSelectMock.mockImplementation((columns: string) => {
          // Branch: handler de status -> seleciona o join completo
          if (columns.includes('accountant_offices')) {
            return makeSelectChain(subscriptionContext ? [subscriptionContext] : [])
          }
          // Branch padrao: storedSubscription
          return makeSelectChain(storedSubscription ? [storedSubscription] : [])
        }),
      }
    }

    if (table === 'accountant_offices') {
      return {
        update: officesUpdateMock,
        select: officesSelectMock.mockReturnValue(makeSelectChain(officeRow ? [officeRow] : [])),
      }
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

  return {
    from: fromMock,
    auth: {
      admin: {
        getUserById: authAdminGetUserByIdMock,
      },
    },
  }
}

describe('/api/stripe/webhook POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.ADMIN_EMAIL = 'admin@simulamei.com.br'
    process.env.ADMIN_EMAILS = ''
    headersMock.mockResolvedValue(new Headers({ 'stripe-signature': 'sig_test' }))
    isStripeConfiguredMock.mockReturnValue(true)
    processedSelectMock.mockReturnValue(makeSelectChain([]))
    processedInsertMock.mockResolvedValue({ error: null })
    subscriptionUpsertMock.mockResolvedValue({ error: null })
    subscriptionUpdateMock.mockReturnValue(makePromiseChain())
    officesUpdateMock.mockReturnValue(makePromiseChain())
    clientsUpdateMock.mockReturnValue(makePromiseChain())
    purchasesUpdateMock.mockReturnValue(makePromiseChain())
    profilesUpdateMock.mockReturnValue(makePromiseChain())
    sendPaymentFailedNotificationMock.mockResolvedValue({ id: 'email_1' })
    sendSubscriptionPausedNotificationMock.mockResolvedValue({ id: 'email_2' })
    sendRefundNotificationMock.mockResolvedValue({ id: 'email_3' })
    sendDisputeNotificationMock.mockResolvedValue({ id: 'email_4' })
    authAdminGetUserByIdMock.mockResolvedValue({
      data: { user: { email: 'owner@example.com' } },
    })
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
    invoiceRetrieveMock.mockResolvedValue({
      id: 'in_1',
      subscription: 'sub_1',
    })
  })

  it('short-circuits duplicate Stripe events before mutating subscriptions', async () => {
    processedSelectMock.mockReturnValueOnce(makeSelectChain([{ stripe_event_id: 'evt_duplicate' }]))
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
    expect(processedInsertMock).not.toHaveBeenCalled()
    expect(subscriptionUpsertMock).not.toHaveBeenCalled()
    expect(officesUpdateMock).not.toHaveBeenCalled()
  })

  it('does not mark a Stripe event as processed when the handler fails', async () => {
    subscriptionRetrieveMock.mockRejectedValueOnce(new Error('stripe unavailable'))
    constructEventMock.mockReturnValue({
      id: 'evt_handler_fails',
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

    expect(response.status).toBe(500)
    expect(processedInsertMock).not.toHaveBeenCalled()
    expect(subscriptionUpsertMock).not.toHaveBeenCalled()
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

  // ─────────────────────────────────────────────────────────
  // P2 batch (PR #19): cross-check de client_reference_id vs metadata.user_id
  // ─────────────────────────────────────────────────────────

  it('refuses to credit consumer purchase when client_reference_id does not match metadata.user_id (P2 cross-check)', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_attack',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_attack',
          payment_intent: 'pi_attack',
          customer: 'cus_attack',
          client_reference_id: 'attacker-id',
          metadata: {
            user_id: 'victim-id',
            produto: 'monitor_mensal',
          },
        },
      },
    })

    const response = await POST(makeRequest())

    // Returns success to Stripe (so it doesn't retry), but does NOT mutate DB.
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(purchasesUpdateMock).not.toHaveBeenCalled()
    expect(profilesUpdateMock).not.toHaveBeenCalled()
    // Event is still marked processed (don't reprocess a known-bad session).
    expect(processedInsertMock).toHaveBeenCalledWith({
      stripe_event_id: 'evt_attack',
      event_type: 'checkout.session.completed',
    })
  })

  it('accepts consumer purchase when client_reference_id matches metadata.user_id', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_ok',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_ok',
          payment_intent: 'pi_ok',
          customer: 'cus_ok',
          client_reference_id: 'user-1',
          metadata: {
            user_id: 'user-1',
            produto: 'monitor_mensal',
          },
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(purchasesUpdateMock).toHaveBeenCalled()
    expect(profilesUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ plano: 'pro' }))
  })

  it('accepts consumer purchase when client_reference_id is absent (legacy clients)', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_legacy',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_legacy',
          payment_intent: 'pi_legacy',
          customer: 'cus_legacy',
          client_reference_id: null,
          metadata: {
            user_id: 'user-1',
            produto: 'monitor_mensal',
          },
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(purchasesUpdateMock).toHaveBeenCalled()
    expect(profilesUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ plano: 'pro' }))
  })

  // ─────────────────────────────────────────────────────────
  // Stripe handlers (PR #20): payment_failed / paused / refunded / dispute.created
  // ─────────────────────────────────────────────────────────

  it('handles invoice.payment_failed: status=past_due + notifica owner', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_payment_failed',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_payment_failed',
          subscription: 'sub_1',
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(subscriptionUpdateMock).toHaveBeenCalledWith({ status: 'past_due' })
    expect(officesUpdateMock).toHaveBeenCalledWith({ stripe_subscription_status: 'past_due' })
    expect(sendPaymentFailedNotificationMock).toHaveBeenCalledWith({
      to: 'owner@example.com',
      officeName: 'Prime Contabilidade',
    })
    expect(processedInsertMock).toHaveBeenCalledWith({
      stripe_event_id: 'evt_payment_failed',
      event_type: 'invoice.payment_failed',
    })
  })

  it('handles customer.subscription.paused: status=paused + plan limits aplicam', async () => {
    const activeClients = Array.from({ length: 50 }, (_, index) => ({
      id: `client-${String(index + 1).padStart(2, '0')}`,
      created_at: `2026-01-01T00:00:${String(index).padStart(2, '0')}.000Z`,
    }))
    createAdminClientMock.mockReturnValue(makeAdminClient({ activeClients }))

    constructEventMock.mockReturnValue({
      id: 'evt_subscription_paused',
      type: 'customer.subscription.paused',
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'paused',
          current_period_end: 1_800_000_000,
          items: { data: [{ price: { id: 'price_pro' } }] },
          metadata: { office_id: 'office-1' },
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    // Primeiro o status update
    expect(subscriptionUpdateMock).toHaveBeenCalledWith({ status: 'paused' })
    // Depois o syncAccountantBilling rebaixa pra starter + paused
    expect(subscriptionUpsertMock).toHaveBeenCalledWith(expect.objectContaining({
      office_id: 'office-1',
      plan: 'starter',
      status: 'paused',
    }), { onConflict: 'office_id' })
    expect(officesUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      plan: 'starter',
      max_clients: 30,
      stripe_subscription_status: 'paused',
    }))
    // Clientes excedentes (50 - 30 = 20) sao desativados
    expect(clientsUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      ativo: false,
      inactive_reason: 'plan_limit',
    }))
    expect(sendSubscriptionPausedNotificationMock).toHaveBeenCalledWith({
      to: 'owner@example.com',
      officeName: 'Prime Contabilidade',
    })
  })

  it('handles charge.refunded: status=canceled + revert plan', async () => {
    const activeClients = Array.from({ length: 100 }, (_, index) => ({
      id: `client-${String(index + 1).padStart(3, '0')}`,
      created_at: `2026-01-01T00:00:${String(index).padStart(2, '0')}.000Z`,
    }))
    createAdminClientMock.mockReturnValue(makeAdminClient({ activeClients }))

    constructEventMock.mockReturnValue({
      id: 'evt_refunded',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_refunded',
          invoice: 'in_refunded',
          customer: 'cus_1',
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(invoiceRetrieveMock).toHaveBeenCalledWith('in_refunded')
    expect(subscriptionUpsertMock).toHaveBeenCalledWith(expect.objectContaining({
      office_id: 'office-1',
      plan: 'starter',
      status: 'canceled',
    }), { onConflict: 'office_id' })
    expect(officesUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      plan: 'starter',
      max_clients: 30,
      stripe_subscription_status: 'canceled',
    }))
    expect(sendRefundNotificationMock).toHaveBeenCalledWith({
      to: 'owner@example.com',
      officeName: 'Prime Contabilidade',
    })
  })

  it('handles charge.dispute.created: marca disputed_at + notifica admin', async () => {
    chargeRetrieveMock.mockResolvedValue({
      id: 'ch_disputed',
      customer: 'cus_1',
      invoice: 'in_disputed',
    })

    constructEventMock.mockReturnValue({
      id: 'evt_dispute',
      type: 'charge.dispute.created',
      data: {
        object: {
          id: 'dp_1',
          charge: 'ch_disputed',
          reason: 'fraudulent',
          amount: 24700,
          currency: 'brl',
        },
      },
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(chargeRetrieveMock).toHaveBeenCalledWith('ch_disputed')
    expect(officesUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      disputed_at: expect.any(String),
    }))
    expect(sendDisputeNotificationMock).toHaveBeenCalledWith({
      adminEmail: 'admin@simulamei.com.br',
      officeName: 'Prime Contabilidade',
      disputeId: 'dp_1',
      reason: 'fraudulent',
      amountCents: 24700,
      currency: 'brl',
    })
  })
})
