import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, createBrandedCheckoutSessionMock, isStripeConfiguredMock, insertMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createBrandedCheckoutSessionMock: vi.fn(),
  isStripeConfiguredMock: vi.fn(),
  insertMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/stripe', () => ({
  STRIPE_PRODUCTS: {
    relatorio: {
      product: 'relatorio',
      priceId: 'price_report',
      valorCentavos: 990,
      successPath: '/relatorio?checkout=success',
      cancelPath: '/relatorio?checkout=cancel',
    },
  },
  getCheckoutUrl: (path: string) => `http://localhost:3000${path}`,
  createBrandedCheckoutSession: createBrandedCheckoutSessionMock,
  isStripeConfigured: isStripeConfiguredMock,
}))

import { POST } from './route'

function makeQuery(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue({ data }),
  }
  return query
}

function makeServerClient(
  user: { id: string; email?: string } | null,
  opts?: { simulations?: unknown[] },
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'simulations') return makeQuery(opts?.simulations ?? [])
      return { insert: insertMock }
    }),
  }
}

describe('/api/checkout/report POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isStripeConfiguredMock.mockReturnValue(true)
    createBrandedCheckoutSessionMock.mockResolvedValue({ id: 'cs_report_1', url: 'https://checkout.stripe.com/report' })
    insertMock.mockResolvedValue({ error: null })
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await POST()

    expect(response.status).toBe(401)
    expect(createBrandedCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('creates a payment checkout session and records the pending purchase', async () => {
    createClientMock.mockResolvedValue(makeServerClient(
      { id: 'user-1', email: 'user@example.com' },
      { simulations: [{ resultado: { entrada: { faturamentoAcumulado: 60000 }, alertaTeto: { projecaoAnual: 1 } } }] },
    ))

    const response = await POST()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ url: 'https://checkout.stripe.com/report' })
    expect(createBrandedCheckoutSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      product: 'relatorio',
      userId: 'user-1',
      userEmail: 'user@example.com',
      mode: 'payment',
    }))
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      produto: 'relatorio',
      status: 'pending',
      stripe_session_id: 'cs_report_1',
    }))
  })

  it('returns 500 with a sanitized error (no Stripe details leaked) on stripe failure', async () => {
    // P2: Stripe error messages podem conter price IDs / acct_* / paths internos.
    // O endpoint deve logar o erro server-side mas NUNCA expor pro cliente.
    createClientMock.mockResolvedValue(makeServerClient(
      { id: 'user-1', email: 'user@example.com' },
      { simulations: [{ resultado: { entrada: { faturamentoAcumulado: 60000 }, alertaTeto: { projecaoAnual: 1 } } }] },
    ))
    createBrandedCheckoutSessionMock.mockRejectedValue(
      new Error("No such price: 'price_x'; a similar object exists in test mode, but a live mode key was used to make this request."),
    )

    const response = await POST()

    expect(response.status).toBe(500)
    const payload = await response.json()
    // Mensagem genérica — não contém os detalhes do Stripe.
    expect(payload.error).not.toContain('No such price')
    expect(payload.error).not.toContain('price_x')
    expect(payload.error).not.toContain('live mode')
    expect(payload.error).toMatch(/Não foi possível iniciar o checkout/)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('calcula fingerprint da simulação atual e injeta no checkout + insert', async () => {
    const entrada = { cnae: '6201-5/01', tipoMei: 'geral', mesAtual: 5, faturamentoAcumulado: 68000, folhaMensal: 4000 }
    createClientMock.mockResolvedValue(makeServerClient(
      { id: 'user-1', email: 'u@e.com' },
      { simulations: [{ resultado: { entrada, alertaTeto: { projecaoAnual: 163200 } } }] },
    ))

    const response = await POST()

    expect(response.status).toBe(200)
    const extra = createBrandedCheckoutSessionMock.mock.calls[0][0].extraMetadata
    expect(extra.report_fingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      report_fingerprint: extra.report_fingerprint,
    }))
  })

  it('bloqueia checkout (422) quando não há simulação ou está vazia', async () => {
    createClientMock.mockResolvedValue(makeServerClient(
      { id: 'user-1', email: 'u@e.com' },
      { simulations: [] },
    ))
    const response = await POST()
    expect(response.status).toBe(422)
    expect(createBrandedCheckoutSessionMock).not.toHaveBeenCalled()
  })
})
