import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createClientMock, getCurrentAccountantOfficeMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getCurrentAccountantOfficeMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/accountant/server', () => ({
  getCurrentAccountantOffice: getCurrentAccountantOfficeMock,
}))

import { PATCH } from './route'

const OFFICE = {
  id: 'office-1',
  name: 'Prime Contabilidade',
  plan: 'pro',
  max_clients: 150,
  trial_ends_at: null,
  stripe_customer_id: 'cus_1',
  stripe_subscription_id: 'sub_1',
  stripe_subscription_status: 'active',
  current_period_end: null,
  role: 'owner',
}

function makeRequest() {
  return new NextRequest('http://localhost/api/accountant/alerts/alert-1/resolve', {
    method: 'PATCH',
  })
}

function makeContext(id = 'alert-1') {
  return { params: Promise.resolve({ id }) }
}

function makeMutationQuery(result: Record<string, unknown>) {
  const query = {
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return query
}

function makeServerClient(opts?: { user?: { id: string } | null }) {
  const user = opts && 'user' in opts ? opts.user : { id: 'user-1' }
  const updateQuery = makeMutationQuery({
    data: {
      id: 'alert-1',
      office_id: 'office-1',
      resolved_by: 'user-1',
      resolved_at: '2026-05-01T12:00:00.000Z',
    },
    error: null,
  })
  const updateMock = vi.fn(() => updateQuery)
  const fromMock = vi.fn((table: string) => {
    if (table !== 'office_alerts') {
      throw new Error(`Unexpected table: ${table}`)
    }
    return { update: updateMock }
  })

  return {
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: fromMock,
    },
    updateMock,
    updateQuery,
  }
}

describe('/api/accountant/alerts/[id]/resolve PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({ office: OFFICE, error: null })
  })

  it('requires authentication', async () => {
    const ctx = makeServerClient({ user: null })
    createClientMock.mockResolvedValue(ctx.client)

    const response = await PATCH(makeRequest(), makeContext())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Autenticação obrigatória.' })
  })

  it('P1.3: allows member to resolve alerts (not destructive of billing)', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'member' },
      error: null,
    })

    const response = await PATCH(makeRequest(), makeContext())

    expect(response.status).toBe(200)
    expect(ctx.updateMock).toHaveBeenCalled()
  })

  it('resolves an alert scoped to the current office and records the resolver', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)

    const response = await PATCH(makeRequest(), makeContext())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      alert: {
        id: 'alert-1',
        office_id: 'office-1',
        resolved_by: 'user-1',
        resolved_at: '2026-05-01T12:00:00.000Z',
      },
    })
    expect(ctx.updateMock).toHaveBeenCalledWith({
      resolved_at: expect.any(String),
      resolved_by: 'user-1',
    })
    expect(ctx.updateQuery.eq).toHaveBeenCalledWith('id', 'alert-1')
    expect(ctx.updateQuery.eq).toHaveBeenCalledWith('office_id', 'office-1')
    expect(ctx.updateQuery.is).toHaveBeenCalledWith('resolved_at', null)
  })
})
