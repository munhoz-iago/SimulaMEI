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

import { POST } from './route'

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

const CLIENT = {
  id: 'client-1',
  name: 'Loja Modelo',
  cnae: '4712-1/00',
  tipo_mei: 'geral',
  ativo: true,
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/accountant/clients/client-1/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeContext(id = 'client-1') {
  return { params: Promise.resolve({ id }) }
}

function validPayload() {
  return {
    faturamentoAcumulado: 42000,
    mesAtual: 6,
    folhaMensal: 1800,
  }
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
  clientRow?: Record<string, unknown> | null
  simulationInsertError?: { message: string } | null
}) {
  const user = opts && 'user' in opts ? opts.user : { id: 'user-1' }
  const clientRow = opts && 'clientRow' in opts ? opts.clientRow : CLIENT

  const clientQuery = makeQuery({ data: clientRow, error: null })
  const simulationQuery = makeQuery({
    data: opts?.simulationInsertError
      ? null
      : {
          id: 'simulation-1',
          client_id: 'client-1',
          office_id: 'office-1',
          created_at: '2026-04-30T12:00:00.000Z',
        },
    error: opts?.simulationInsertError ?? null,
  })

  const insertMock = vi.fn(() => simulationQuery)
  const fromMock = vi.fn((table: string) => {
    if (table === 'office_clients') {
      return { select: vi.fn(() => clientQuery) }
    }
    if (table === 'office_simulations') {
      return { insert: insertMock }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: fromMock,
    },
    clientQuery,
    simulationQuery,
    insertMock,
  }
}

describe('/api/accountant/clients/[id]/simulate POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({ office: OFFICE, error: null })
  })

  it('requires authentication', async () => {
    const ctx = makeServerClient({ user: null })
    createClientMock.mockResolvedValue(ctx.client)

    const response = await POST(makeRequest(validPayload()), makeContext())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Autenticação obrigatória.' })
  })

  it('P1.3: blocks simulation when role=member', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: { ...OFFICE, role: 'member' },
      error: null,
    })

    const response = await POST(makeRequest(validPayload()), makeContext())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Apenas o owner do escritório pode executar simulações.',
    })
    expect(ctx.insertMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the client is not in the current office', async () => {
    const ctx = makeServerClient({ clientRow: null })
    createClientMock.mockResolvedValue(ctx.client)

    const response = await POST(makeRequest(validPayload()), makeContext())

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Cliente não encontrado.' })
    expect(ctx.clientQuery.eq).toHaveBeenCalledWith('office_id', 'office-1')
    expect(ctx.clientQuery.eq).toHaveBeenCalledWith('id', 'client-1')
    expect(ctx.insertMock).not.toHaveBeenCalled()
  })

  it('blocks simulations when billing is restricted', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)
    getCurrentAccountantOfficeMock.mockResolvedValue({
      office: {
        ...OFFICE,
        plan: 'pro',
        max_clients: 150,
        stripe_customer_id: 'cus_1',
        stripe_subscription_id: 'sub_1',
        stripe_subscription_status: 'unpaid',
      },
      error: null,
    })

    const response = await POST(makeRequest(validPayload()), makeContext())

    expect(response.status).toBe(402)
    await expect(response.json()).resolves.toEqual({
      error: 'Regularize a assinatura do escritório para registrar novas simulações.',
      billing: expect.objectContaining({
        kind: 'unpaid',
        restricted: true,
      }),
    })
  })

  it('persists a simulation scoped to current office and client', async () => {
    const ctx = makeServerClient()
    createClientMock.mockResolvedValue(ctx.client)

    const response = await POST(makeRequest(validPayload()), makeContext())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.simulation.id).toBe('simulation-1')
    expect(body.resultado.entrada).toEqual({
      faturamentoAcumulado: 42000,
      mesAtual: 6,
      folhaMensal: 1800,
      cnae: '4712-1/00',
      tipoMei: 'geral',
    })
    expect(ctx.insertMock).toHaveBeenCalledWith(expect.objectContaining({
      office_id: 'office-1',
      client_id: 'client-1',
      performed_by: 'user-1',
      entrada: expect.objectContaining({ cnae: '4712-1/00' }),
      resultado: expect.objectContaining({ taxRuleVersion: expect.any(String) }),
      tax_rule_version: expect.any(String),
    }))
  })
})
