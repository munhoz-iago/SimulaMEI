import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createClientMock, createAdminClientMock, getCurrentAccountantOfficeMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  getCurrentAccountantOfficeMock: vi.fn(),
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
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

function makeServerClient(user: { id: string } | null = { id: 'user-1' }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
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

function makeAdminClient(options?: {
  clientRow?: Record<string, unknown> | null
  simulationInsertError?: { message: string } | null
}) {
  const clientRow = options && 'clientRow' in options ? options.clientRow : CLIENT
  const clientQuery = makeQuery({ data: clientRow, error: null })
  const simulationQuery = makeQuery({
    data: options?.simulationInsertError
      ? null
      : {
          id: 'simulation-1',
          client_id: 'client-1',
          office_id: 'office-1',
          created_at: '2026-04-30T12:00:00.000Z',
        },
    error: options?.simulationInsertError ?? null,
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
    client: { from: fromMock },
    clientQuery,
    simulationQuery,
    insertMock,
  }
}

describe('/api/accountant/clients/[id]/simulate POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createClientMock.mockResolvedValue(makeServerClient())
    getCurrentAccountantOfficeMock.mockResolvedValue({ office: OFFICE, error: null })
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await POST(makeRequest(validPayload()), makeContext())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Autenticação obrigatória.' })
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the client is not in the current office', async () => {
    const admin = makeAdminClient({ clientRow: null })
    createAdminClientMock.mockReturnValue(admin.client)

    const response = await POST(makeRequest(validPayload()), makeContext())

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Cliente não encontrado.' })
    expect(admin.clientQuery.eq).toHaveBeenCalledWith('office_id', 'office-1')
    expect(admin.clientQuery.eq).toHaveBeenCalledWith('id', 'client-1')
    expect(admin.insertMock).not.toHaveBeenCalled()
  })

  it('blocks simulations when billing is restricted', async () => {
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
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('persists a simulation scoped to current office and client', async () => {
    const admin = makeAdminClient()
    createAdminClientMock.mockReturnValue(admin.client)

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
    expect(admin.insertMock).toHaveBeenCalledWith(expect.objectContaining({
      office_id: 'office-1',
      client_id: 'client-1',
      performed_by: 'user-1',
      entrada: expect.objectContaining({ cnae: '4712-1/00' }),
      resultado: expect.objectContaining({ taxRuleVersion: expect.any(String) }),
      tax_rule_version: expect.any(String),
    }))
  })
})
