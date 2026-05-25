import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  createClientMock,
  createAdminClientMock,
  getCurrentAccountantOfficeMock,
  createBrandedCheckoutSessionMock,
  portalCreateMock,
  isStripeConfiguredMock,
  subscriptionInsertMock,
  subscriptionSelectMock,
  subscriptionUpdateMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  getCurrentAccountantOfficeMock: vi.fn(),
  createBrandedCheckoutSessionMock: vi.fn(),
  portalCreateMock: vi.fn(),
  isStripeConfiguredMock: vi.fn(),
  subscriptionInsertMock: vi.fn(),
  subscriptionSelectMock: vi.fn(),
  subscriptionUpdateMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/accountant/server', () => ({
  getCurrentAccountantOffice: getCurrentAccountantOfficeMock,
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
  getCheckoutUrl: (path: string) => `http://localhost:3000${path}`,
  createBrandedCheckoutSession: createBrandedCheckoutSessionMock,
  getStripeClient: () => ({
    billingPortal: {
      sessions: {
        create: portalCreateMock,
      },
    },
  }),
  isStripeConfigured: isStripeConfiguredMock,
}))

import { POST } from './route'

const OFFICE = {
  id: 'office-1',
  name: 'Prime Contabilidade',
  plan: 'starter_trial',
  max_clients: 30,
  trial_ends_at: null,
  role: 'owner',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_subscription_status: null,
  current_period_end: null,
}

function makeServerClient(user: { id: string; email?: string } | null = { id: 'user-1', email: 'ana@contabil.com' }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeAdminClient(storedSubscription: Record<string, unknown> | null = null) {
  const selectChain = {
    eq: vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: storedSubscription, error: null }),
    })),
  }
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  const fromMock = vi.fn((table: string) => {
    if (table !== 'office_subscriptions') {
      throw new Error(`Unexpected table: ${table}`)
    }

    return {
      select: subscriptionSelectMock.mockReturnValue(selectChain),
      update: subscriptionUpdateMock.mockReturnValue(updateChain),
      insert: subscriptionInsertMock,
    }
  })

  return { from: fromMock, selectChain, updateChain }
}

function makeRequest() {
  return new NextRequest('http://localhost/api/checkout/accountant-starter', {
    method: 'POST',
  })
}

describe('/api/checkout/accountant-starter POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isStripeConfiguredMock.mockReturnValue(true)
    createClientMock.mockResolvedValue(makeServerClient())
    createAdminClientMock.mockReturnValue(makeAdminClient())
    getCurrentAccountantOfficeMock.mockResolvedValue({ office: OFFICE, error: null })
    createBrandedCheckoutSessionMock.mockResolvedValue({
      id: 'cs_starter_1',
      url: 'https://checkout.stripe.com/cs_starter_1',
    })
    portalCreateMock.mockResolvedValue({ url: 'https://billing.stripe.com/session' })
    subscriptionInsertMock.mockResolvedValue({ error: null })
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Autenticação obrigatória para assinar o plano contador.',
    })
    expect(createBrandedCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('requires an existing accountant office', async () => {
    getCurrentAccountantOfficeMock.mockResolvedValue({ office: null, error: null })

    const response = await POST(makeRequest())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Crie o escritório contador antes de assinar um plano.',
    })
    expect(createBrandedCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('creates a subscription checkout session linked to the office and records it as pending', async () => {
    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: 'https://checkout.stripe.com/cs_starter_1',
    })

    expect(createBrandedCheckoutSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      product: 'accountant_starter',
      userId: 'user-1',
      userEmail: 'ana@contabil.com',
      mode: 'subscription',
      extraMetadata: expect.objectContaining({
        office_id: 'office-1',
        plan: 'starter',
      }),
    }))

    expect(subscriptionInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      office_id: 'office-1',
      status: 'pending',
      plan: 'starter',
      stripe_checkout_session_id: 'cs_starter_1',
    }))
  })

  it('preserves live Stripe fields when recording a new pending checkout over an existing inactive row', async () => {
    const admin = makeAdminClient({
      id: 'sub-row-1',
      office_id: 'office-1',
      status: 'canceled',
      plan: 'pro',
      stripe_customer_id: 'cus_old',
      stripe_subscription_id: 'sub_old',
    })
    createAdminClientMock.mockReturnValue(admin)

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(subscriptionUpdateMock).toHaveBeenCalledWith({
      status: 'pending',
      plan: 'starter',
      stripe_checkout_session_id: 'cs_starter_1',
    })
    expect(admin.updateChain.eq).toHaveBeenCalledWith('office_id', 'office-1')
    expect(subscriptionInsertMock).not.toHaveBeenCalled()
  })

  it('sends active plan changes to Stripe Customer Portal instead of creating a second checkout', async () => {
    createAdminClientMock.mockReturnValue(makeAdminClient({
      id: 'sub-row-1',
      status: 'active',
      plan: 'pro',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
    }))

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: 'https://billing.stripe.com/session',
    })
    expect(createBrandedCheckoutSessionMock).not.toHaveBeenCalled()
    expect(portalCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_1',
      flow_data: {
        type: 'subscription_update',
        subscription_update: { subscription: 'sub_1' },
      },
    }))
  })
})
