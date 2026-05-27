import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  getCurrentAccountantOfficeMock,
  isStripeConfiguredMock,
  portalCreateMock,
  subscriptionRetrieveMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getCurrentAccountantOfficeMock: vi.fn(),
  isStripeConfiguredMock: vi.fn(),
  portalCreateMock: vi.fn(),
  subscriptionRetrieveMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/accountant/server', () => ({
  getCurrentAccountantOffice: getCurrentAccountantOfficeMock,
}))

vi.mock('@/lib/stripe', () => ({
  STRIPE_PRODUCTS: {
    accountant_starter: {
      product: 'accountant_starter',
      priceId: 'price_starter_test',
      valorCentavos: 9700,
      successPath: '/upgrade/contador?checkout=success&plan=starter',
      cancelPath: '/upgrade/contador?checkout=cancel&plan=starter',
    },
    accountant_pro: {
      product: 'accountant_pro',
      priceId: 'price_pro_test',
      valorCentavos: 24700,
      successPath: '/upgrade/contador?checkout=success&plan=pro',
      cancelPath: '/upgrade/contador?checkout=cancel&plan=pro',
    },
  },
  getCheckoutUrl: (path: string) => `http://localhost:3000${path}`,
  isStripeConfigured: isStripeConfiguredMock,
  getStripeClient: () => ({
    billingPortal: { sessions: { create: portalCreateMock } },
    subscriptions: { retrieve: subscriptionRetrieveMock },
  }),
}))

import { POST } from './route'

const OFFICE = {
  id: 'office-1',
  name: 'Prime Contabilidade',
  plan: 'pro' as const,
  max_clients: 150,
  trial_ends_at: null,
  stripe_customer_id: 'cus_1',
  stripe_subscription_id: 'sub_1',
  stripe_subscription_status: 'active',
  current_period_end: null,
  role: 'owner' as const,
}

function makeRequest(body?: unknown) {
  return new Request('http://localhost/api/billing/portal', {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeServerClient(user: { id: string } | null = { id: 'user-1' }) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  }
}

describe('/api/billing/portal POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isStripeConfiguredMock.mockReturnValue(true)
    createClientMock.mockResolvedValue(makeServerClient())
    getCurrentAccountantOfficeMock.mockResolvedValue({ office: OFFICE, error: null })
    portalCreateMock.mockResolvedValue({ url: 'https://billing.stripe.com/session_test' })
    subscriptionRetrieveMock.mockResolvedValue({
      items: { data: [{ id: 'si_test_existing' }] },
    })
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Autenticação obrigatória.' })
  })

  it('P1.3: blocks POST when role=member', async () => {
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'member' },
      error: null,
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Apenas o owner do escritório pode acessar o portal de cobrança.',
    })
    expect(portalCreateMock).not.toHaveBeenCalled()
  })

  it('P1.3: blocks POST when role=admin', async () => {
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'admin' },
      error: null,
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(403)
    expect(portalCreateMock).not.toHaveBeenCalled()
  })

  it('opens generic Portal session when no flowType is requested', async () => {
    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ url: 'https://billing.stripe.com/session_test' })
    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_1',
      return_url: 'http://localhost:3000/contador/assinatura',
    })
    expect(subscriptionRetrieveMock).not.toHaveBeenCalled()
  })

  it('P1.7: subscription_update requires targetPlan (rejects without it)', async () => {
    const response = await POST(makeRequest({ flowType: 'subscription_update' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'targetPlan é obrigatório (accountant_starter ou accountant_pro) para alteração de plano via Portal.',
    })
    expect(portalCreateMock).not.toHaveBeenCalled()
  })

  it('P1.7: subscription_update rejects invalid targetPlan (e.g. monitor)', async () => {
    const response = await POST(makeRequest({
      flowType: 'subscription_update',
      targetPlan: 'monitor', // não é accountant_starter|accountant_pro
    }))

    expect(response.status).toBe(400)
    expect(portalCreateMock).not.toHaveBeenCalled()
  })

  it('P1.7: subscription_update_confirm.items contém apenas plano alvo (starter)', async () => {
    const response = await POST(makeRequest({
      flowType: 'subscription_update',
      targetPlan: 'starter',
    }))

    expect(response.status).toBe(200)
    expect(subscriptionRetrieveMock).toHaveBeenCalledWith('sub_1')
    expect(portalCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_1',
      flow_data: {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: 'sub_1',
          items: [{
            id: 'si_test_existing',
            price: 'price_starter_test',
            quantity: 1,
          }],
        },
      },
    }))
  })

  it('P1.7: subscription_update_confirm.items contém apenas plano alvo (pro)', async () => {
    const response = await POST(makeRequest({
      flowType: 'subscription_update',
      targetPlan: 'pro',
    }))

    expect(response.status).toBe(200)
    expect(portalCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      flow_data: {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: 'sub_1',
          items: [{
            id: 'si_test_existing',
            price: 'price_pro_test',
            quantity: 1,
          }],
        },
      },
    }))
  })

  it('returns 409 when subscription_update is requested but office has no Stripe sub', async () => {
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, stripe_subscription_id: null },
      error: null,
    })

    const response = await POST(makeRequest({
      flowType: 'subscription_update',
      targetPlan: 'pro',
    }))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Assinatura ativa não encontrada para alteração de plano.',
    })
  })
})
