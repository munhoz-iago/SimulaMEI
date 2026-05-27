import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createClientMock, createAdminClientMock, consumeRateLimitMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/security/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security/rate-limit')>('@/lib/security/rate-limit')
  return {
    ...actual,
    consumeRateLimit: consumeRateLimitMock,
  }
})

import { POST } from './route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/accountant/onboarding', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validPayload() {
  return {
    nomeEscritorio: 'Prime Contabilidade',
    cnpj: '12.345.678/0001-90',
    telefone: '(11) 99999-9999',
    carteiraRange: '21-50',
    ferramentaAtual: 'Planilha',
    objetivo: 'Monitorar teto dos clientes',
  }
}

function makeServerClient(user: { id: string; email?: string } | null = { id: 'user-1', email: 'ana@example.com' }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeAdminClient(options?: {
  existingOfficeId?: string | null
  existingError?: { message: string } | null
  officeInsertError?: { message: string } | null
  memberError?: { message: string } | null
}) {
  const maybeSingleMock = vi.fn().mockResolvedValue({
    data: options?.existingOfficeId ? { id: options.existingOfficeId } : null,
    error: options?.existingError ?? null,
  })
  const existingEqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }))
  const existingSelectMock = vi.fn(() => ({ eq: existingEqMock }))

  const singleMock = vi.fn().mockResolvedValue({
    data: options?.officeInsertError ? null : { id: 'office-1' },
    error: options?.officeInsertError ?? null,
  })
  const insertSelectMock = vi.fn(() => ({ single: singleMock }))
  const insertMock = vi.fn(() => ({ select: insertSelectMock }))

  const upsertMock = vi.fn().mockResolvedValue({ error: options?.memberError ?? null })

  const fromMock = vi.fn((table: string) => {
    if (table === 'accountant_offices') {
      return {
        select: existingSelectMock,
        insert: insertMock,
      }
    }
    if (table === 'office_members') {
      return { upsert: upsertMock }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: { from: fromMock },
    fromMock,
    insertMock,
    upsertMock,
  }
}

describe('/api/accountant/onboarding POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 2,
      resetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      hitCount: 1,
    })
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await POST(makeRequest(validPayload()))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Autenticação obrigatória.' })
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('rejects invalid CNPJ format', async () => {
    createClientMock.mockResolvedValue(makeServerClient())

    const response = await POST(makeRequest({ ...validPayload(), cnpj: '123' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'CNPJ deve conter 14 dígitos ou ficar em branco.' })
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('returns an existing office without creating a duplicate', async () => {
    createClientMock.mockResolvedValue(makeServerClient())
    const admin = makeAdminClient({ existingOfficeId: 'office-existing' })
    createAdminClientMock.mockReturnValue(admin.client)

    const response = await POST(makeRequest(validPayload()))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      officeId: 'office-existing',
      alreadyExists: true,
    })
    expect(admin.insertMock).not.toHaveBeenCalled()
  })

  it('returns 429 with Retry-After when onboarding rate limit is exceeded', async () => {
    createClientMock.mockResolvedValue(makeServerClient())
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      hitCount: 4,
    })

    const response = await POST(makeRequest(validPayload()))

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    expect(response.headers.get('X-RateLimit-Limit')).toBe('3')
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('creates an office and owner membership for a valid payload', async () => {
    createClientMock.mockResolvedValue(makeServerClient())
    const admin = makeAdminClient()
    createAdminClientMock.mockReturnValue(admin.client)

    const response = await POST(makeRequest(validPayload()))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, officeId: 'office-1' })
    expect(admin.insertMock).toHaveBeenCalledWith(expect.objectContaining({
      owner_user_id: 'user-1',
      name: 'Prime Contabilidade',
      cnpj: '12345678000190',
      telefone: '(11) 99999-9999',
      plan: 'starter_trial',
      max_clients: 30,
      trial_ends_at: expect.any(String),
      white_label: expect.objectContaining({
        carteira_range: '21-50',
        ferramenta_atual: 'Planilha',
      }),
    }))
    expect(admin.upsertMock).toHaveBeenCalledWith({
      office_id: 'office-1',
      user_id: 'user-1',
      role: 'owner',
      accepted_at: expect.any(String),
    }, { onConflict: 'office_id,user_id' })
  })
})
