import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createClientMock, getCurrentAccountantOfficeMock, isAdminAccessFallbackOfficeMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getCurrentAccountantOfficeMock: vi.fn(),
  isAdminAccessFallbackOfficeMock: vi.fn((office: { id: string }) => office.id.startsWith('admin-fallback:')),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/accountant/server', () => ({
  getCurrentAccountantOffice: getCurrentAccountantOfficeMock,
  isAdminAccessFallbackOffice: isAdminAccessFallbackOfficeMock,
}))

import { GET, POST } from './route'

const OFFICE = {
  id: 'office-1',
  name: 'Prime Contabilidade',
  plan: 'starter_trial',
  max_clients: 30,
  trial_ends_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_subscription_status: null,
  current_period_end: null,
  role: 'owner',
}

function makeRequest(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeQuery<T>(result: T) {
  const query = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => Promise.resolve(result)),
    select: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: T) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function makeServerClient(opts?: {
  user?: { id: string } | null
  activeCount?: number
  listRows?: Array<Record<string, unknown>>
  insertRow?: Record<string, unknown>
}) {
  const user = opts && 'user' in opts ? opts.user : { id: 'user-1' }

  const countQuery = makeQuery({ data: null, error: null, count: opts?.activeCount ?? 0 })
  const listQuery = makeQuery({
    data: opts?.listRows ?? [],
    error: null,
    count: opts?.listRows?.length ?? 0,
  })
  const insertQuery = makeQuery({
    data: opts?.insertRow ?? { id: 'client-1', name: 'Loja Modelo' },
    error: null,
  })

  const selectMock = vi.fn((_columns: string, queryOptions?: { head?: boolean }) =>
    queryOptions?.head ? countQuery : listQuery,
  )
  const insertMock = vi.fn(() => insertQuery)
  const fromMock = vi.fn((table: string) => {
    if (table !== 'office_clients') {
      throw new Error(`Unexpected table: ${table}`)
    }
    return { select: selectMock, insert: insertMock }
  })

  return {
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: fromMock,
    },
    countQuery,
    listQuery,
    insertQuery,
    selectMock,
    insertMock,
  }
}

describe('/api/accountant/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({ office: OFFICE, error: null })
  })

  it('requires authentication on create', async () => {
    const ctx = makeServerClient({ user: null })
    createClientMock.mockResolvedValue(ctx.client)

    const response = await POST(makeRequest('http://localhost/api/accountant/clients', {
      nome: 'Cliente',
      cnae: '4712-1/00',
      tipoMei: 'geral',
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Autenticação obrigatória.' })
  })

  it('P1.3: blocks POST when role=member', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'member' },
      error: null,
    })

    const response = await POST(makeRequest('http://localhost/api/accountant/clients', {
      nome: 'Cliente',
      cnae: '4712-1/00',
      tipoMei: 'geral',
    }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Apenas o owner do escritório pode cadastrar clientes.',
    })
    expect(ctx.insertMock).not.toHaveBeenCalled()
  })

  it('P1.3: blocks POST when role=admin (member-equivalent for write)', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'admin' },
      error: null,
    })

    const response = await POST(makeRequest('http://localhost/api/accountant/clients', {
      nome: 'Cliente',
      cnae: '4712-1/00',
      tipoMei: 'geral',
    }))

    expect(response.status).toBe(403)
    expect(ctx.insertMock).not.toHaveBeenCalled()
  })

  it('P1.3: allows GET when role=member (read-only)', async () => {
    const ctx = makeServerClient({
      listRows: [{ id: 'client-1', name: 'Loja Modelo', ativo: true }],
    })
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'member' },
      error: null,
    })

    const response = await GET(makeRequest('http://localhost/api/accountant/clients?status=active&page=1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.clients).toHaveLength(1)
  })

  it('blocks creation when the plan active client limit is reached', async () => {
    const ctx = makeServerClient({ activeCount: 30 })
    createClientMock.mockResolvedValue(ctx.client)

    const response = await POST(makeRequest('http://localhost/api/accountant/clients', {
      nome: 'Cliente',
      cnae: '4712-1/00',
      tipoMei: 'geral',
    }))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Limite de 30 clientes ativos atingido para o plano atual.',
    })
    expect(ctx.insertMock).not.toHaveBeenCalled()
  })

  it('blocks creation when billing is restricted', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: {
        ...OFFICE,
        plan: 'pro',
        max_clients: 150,
        stripe_customer_id: 'cus_1',
        stripe_subscription_id: 'sub_1',
        stripe_subscription_status: 'past_due',
      },
      error: null,
    })

    const response = await POST(makeRequest('http://localhost/api/accountant/clients', {
      nome: 'Cliente',
      cnae: '4712-1/00',
      tipoMei: 'geral',
    }))

    expect(response.status).toBe(402)
    await expect(response.json()).resolves.toEqual({
      error: 'Regularize a assinatura do escritório para cadastrar novos clientes.',
      billing: expect.objectContaining({
        kind: 'past_due',
        restricted: true,
      }),
    })
    expect(ctx.insertMock).not.toHaveBeenCalled()
  })

  it('keeps fallback admin office read-only when Supabase admin is unavailable', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: {
        ...OFFICE,
        id: 'admin-fallback:user-1',
        admin_access_fallback: true,
        admin_access_error: 'Invalid API key',
      },
      error: null,
    })

    const listResponse = await GET(makeRequest('http://localhost/api/accountant/clients?status=all&page=1'))
    expect(listResponse.status).toBe(200)
    await expect(listResponse.json()).resolves.toEqual({
      ok: true,
      clients: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    })

    const createResponse = await POST(makeRequest('http://localhost/api/accountant/clients', {
      nome: 'Cliente',
      cnae: '4712-1/00',
      tipoMei: 'geral',
    }))
    expect(createResponse.status).toBe(503)
    await expect(createResponse.json()).resolves.toEqual({
      error: 'Configure SUPABASE_SERVICE_ROLE_KEY para cadastrar clientes reais no modo contador.',
    })
  })

  it('creates a client scoped to the current office', async () => {
    const ctx = makeServerClient({ activeCount: 2 })
    createClientMock.mockResolvedValue(ctx.client)

    const response = await POST(makeRequest('http://localhost/api/accountant/clients', {
      nome: 'Loja Modelo',
      email: 'cliente@example.com',
      cnae: '4712100',
      tipoMei: 'geral',
      uf: 'SP',
      municipio: 'Sao Paulo',
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      client: { id: 'client-1', name: 'Loja Modelo' },
    })
    expect(ctx.insertMock).toHaveBeenCalledWith(expect.objectContaining({
      office_id: 'office-1',
      name: 'Loja Modelo',
      email: 'cliente@example.com',
      cnae: '4712-1/00',
      tipo_mei: 'geral',
      uf: 'SP',
      municipio: 'Sao Paulo',
      ativo: true,
      inactive_reason: null,
    }))
  })

  it('lists clients scoped to the current office and requested status', async () => {
    const ctx = makeServerClient({
      listRows: [{ id: 'client-1', name: 'Loja Modelo', ativo: true }],
    })
    createClientMock.mockResolvedValue(ctx.client)

    const response = await GET(makeRequest('http://localhost/api/accountant/clients?status=active&page=1'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      clients: [{ id: 'client-1', name: 'Loja Modelo', ativo: true }],
      pagination: { page: 1, pageSize: 20, total: 1 },
    })
    expect(ctx.listQuery.eq).toHaveBeenCalledWith('office_id', 'office-1')
    expect(ctx.listQuery.eq).toHaveBeenCalledWith('ativo', true)
  })
})
