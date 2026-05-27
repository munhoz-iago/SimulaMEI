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

import { DELETE, GET, PATCH } from './route'

const OFFICE = {
  id: 'office-1',
  name: 'Prime Contabilidade',
  plan: 'starter_trial',
  max_clients: 30,
  trial_ends_at: null,
  role: 'owner',
}

function makeRequest(body?: unknown, method: 'GET' | 'PATCH' | 'DELETE' = 'GET') {
  return new NextRequest('http://localhost/api/accountant/clients/client-1', {
    method: body ? 'PATCH' : method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeContext(id = 'client-1') {
  return { params: Promise.resolve({ id }) }
}

function makeQuery<T>(result: T) {
  const query = {
    eq: vi.fn(() => query),
    select: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: T) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function makeServerClient(opts?: {
  user?: { id: string } | null
  detailRow?: Record<string, unknown> | null
  activeCount?: number
  updateRow?: Record<string, unknown>
}) {
  const user = opts && 'user' in opts ? opts.user : { id: 'user-1' }
  const detailRow = opts && 'detailRow' in opts
    ? opts.detailRow
    : { id: 'client-1', name: 'Loja Modelo' }

  const detailQuery = makeQuery({ data: detailRow, error: null })
  const countQuery = makeQuery({ data: null, error: null, count: opts?.activeCount ?? 0 })
  const updateQuery = makeQuery({
    data: opts?.updateRow ?? { id: 'client-1', name: 'Loja Modelo', ativo: false, inactive_reason: 'manual' },
    error: null,
  })

  const selectMock = vi.fn((_columns: string, queryOptions?: { head?: boolean }) =>
    queryOptions?.head ? countQuery : detailQuery,
  )
  const updateMock = vi.fn(() => updateQuery)
  const fromMock = vi.fn((table: string) => {
    if (table !== 'office_clients') {
      throw new Error(`Unexpected table: ${table}`)
    }
    return { select: selectMock, update: updateMock }
  })

  return {
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: fromMock,
    },
    detailQuery,
    countQuery,
    updateQuery,
    updateMock,
  }
}

describe('/api/accountant/clients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({ office: OFFICE, error: null })
  })

  it('returns 404 when the client is not in the current office', async () => {
    const ctx = makeServerClient({ detailRow: null })
    createClientMock.mockResolvedValue(ctx.client)

    const response = await GET(makeRequest(), makeContext())

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Cliente não encontrado.' })
    expect(ctx.detailQuery.eq).toHaveBeenCalledWith('office_id', 'office-1')
    expect(ctx.detailQuery.eq).toHaveBeenCalledWith('id', 'client-1')
  })

  it('P1.3: blocks PATCH when role=member', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'member' },
      error: null,
    })

    const response = await PATCH(makeRequest({
      nome: 'Atualizado',
      cnae: '4712-1/00',
      tipoMei: 'geral',
    }), makeContext())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Apenas o owner do escritório pode editar clientes.',
    })
    expect(ctx.updateMock).not.toHaveBeenCalled()
  })

  it('P1.3: blocks DELETE when role=member', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'member' },
      error: null,
    })

    const response = await DELETE(makeRequest(undefined, 'DELETE'), makeContext())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Apenas o owner do escritório pode pausar clientes.',
    })
    expect(ctx.updateMock).not.toHaveBeenCalled()
  })

  it('P1.3: allows GET when role=member (read-only)', async () => {
    const ctx = makeServerClient({
      detailRow: { id: 'client-1', name: 'Loja Modelo', ativo: true },
    })
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'member' },
      error: null,
    })

    const response = await GET(makeRequest(), makeContext())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.client.id).toBe('client-1')
  })

  it('updates a client scoped to the current office', async () => {
    const ctx = makeServerClient({
      updateRow: { id: 'client-1', name: 'Cliente Atualizado', ativo: true },
    })
    createClientMock.mockResolvedValue(ctx.client)

    const response = await PATCH(makeRequest({
      nome: 'Cliente Atualizado',
      cnae: '4712-1/00',
      tipoMei: 'geral',
    }), makeContext())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      client: { id: 'client-1', name: 'Cliente Atualizado', ativo: true },
    })
    expect(ctx.updateMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Cliente Atualizado',
      cnae: '4712-1/00',
      tipo_mei: 'geral',
    }))
    expect(ctx.updateQuery.eq).toHaveBeenCalledWith('office_id', 'office-1')
  })

  it('soft deletes a client with manual inactive reason', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)

    const response = await DELETE(makeRequest(undefined, 'DELETE'), makeContext())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      client: { id: 'client-1', name: 'Loja Modelo', ativo: false, inactive_reason: 'manual' },
    })
    expect(ctx.updateMock).toHaveBeenCalledWith(expect.objectContaining({
      ativo: false,
      inactive_reason: 'manual',
      disabled_by_plan_limit_at: null,
    }))
  })
})
