import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  createAdminClientMock,
  eventRetrieveMock,
  isStripeConfiguredMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  eventRetrieveMock: vi.fn(),
  isStripeConfiguredMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/stripe', () => ({
  getStripeClient: () => ({
    events: {
      retrieve: eventRetrieveMock,
    },
  }),
  isStripeConfigured: isStripeConfiguredMock,
}))

import { GET } from './route'

function makeServerClient(user: { id: string; email: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeAdminClient(counts: Record<string, number> = {}) {
  const eventsOrder = vi.fn().mockResolvedValue({
    data: [{
      stripe_event_id: 'evt_1',
      event_type: 'checkout.session.completed',
      processed_at: '2026-05-25T10:00:00.000Z',
    }],
    error: null,
  })
  const eventsGte = vi.fn(() => ({ order: eventsOrder }))
  const countEq = vi.fn((column: string, value: string) => Promise.resolve({
    count: counts[`${column}:${value}`] ?? 0,
    error: null,
  }))
  const from = vi.fn((table: string) => {
    if (table === 'processed_stripe_events') {
      return {
        select: vi.fn(() => ({
          gte: eventsGte,
        })),
      }
    }

    return {
      select: vi.fn(() => ({
        eq: countEq,
      })),
    }
  })

  return { from, countEq }
}

describe('/api/admin/stripe-drift GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAIL = 'admin@simulamei.com.br'
    process.env.ADMIN_EMAILS = ''
    isStripeConfiguredMock.mockReturnValue(true)
    eventRetrieveMock.mockResolvedValue({
      data: {
        object: { id: 'cs_1' },
      },
    })
  })

  it('bloqueia usuario que nao e admin', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1', email: 'contador@example.com' }))

    const response = await GET()

    expect(response.status).toBe(403)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('lista drift quando evento processado nao tem compra nem assinatura correspondente', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'admin-1', email: 'admin@simulamei.com.br' }))
    createAdminClientMock.mockReturnValue(makeAdminClient())

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      windowHours: 24,
      processedEvents: 1,
      drifts: [{
        eventId: 'evt_1',
        eventType: 'checkout.session.completed',
        reason: 'session cs_1 sem purchase ou office_subscription correspondente',
      }],
    })
  })
})
