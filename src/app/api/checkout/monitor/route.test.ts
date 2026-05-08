import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, stripeCheckoutCreateMock, isStripeConfiguredMock, insertMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  stripeCheckoutCreateMock: vi.fn(),
  isStripeConfiguredMock: vi.fn(),
  insertMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/stripe', () => ({
  STRIPE_PRODUCTS: {
    monitor_mensal: {
      product: 'monitor_mensal',
      priceId: 'price_monitor',
      valorCentavos: 2900,
      successPath: '/dashboard?checkout=success',
      cancelPath: '/dashboard?checkout=cancel',
    },
  },
  getCheckoutUrl: (path: string) => `http://localhost:3000${path}`,
  getStripeClient: () => ({ checkout: { sessions: { create: stripeCheckoutCreateMock } } }),
  isStripeConfigured: isStripeConfiguredMock,
}))

import { POST } from './route'

function makeServerClient(user: { id: string; email?: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn(() => ({ insert: insertMock })),
  }
}

describe('/api/checkout/monitor POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isStripeConfiguredMock.mockReturnValue(true)
    stripeCheckoutCreateMock.mockResolvedValue({ id: 'cs_monitor_1', url: 'https://checkout.stripe.com/monitor' })
    insertMock.mockResolvedValue({ error: null })
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await POST()

    expect(response.status).toBe(401)
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })

  it('creates a subscription checkout session and records the pending purchase', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1', email: 'user@example.com' }))

    const response = await POST()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ url: 'https://checkout.stripe.com/monitor' })
    expect(stripeCheckoutCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      customer_email: 'user@example.com',
      line_items: [{ price: 'price_monitor', quantity: 1 }],
    }))
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      produto: 'monitor_mensal',
      status: 'pending',
      stripe_session_id: 'cs_monitor_1',
    }))
  })
})
