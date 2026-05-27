import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createAdminClientMock, simularMock, getCnaeMock, normalizeCnaeCodeMock, consumeRateLimitMock } = vi.hoisted(() => {
  process.env.SIMULAMEI_API_KEY_SECRET = 'test-secret'
  return {
    createAdminClientMock: vi.fn(),
    simularMock: vi.fn(),
    getCnaeMock: vi.fn(),
    normalizeCnaeCodeMock: vi.fn(),
    consumeRateLimitMock: vi.fn(),
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/tributario', () => ({
  simular: simularMock,
  getCnae: getCnaeMock,
  normalizeCnaeCode: normalizeCnaeCodeMock,
}))

vi.mock('@/lib/security/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security/rate-limit')>('@/lib/security/rate-limit')
  return {
    ...actual,
    consumeRateLimit: consumeRateLimitMock,
  }
})

import { GET } from './route'

function makeRequest() {
  return new NextRequest('http://localhost/api/contadores/simulate?faturamentoAcumulado=60000&mesAtual=6&cnae=6204000&folhaMensal=2000&tipoMei=geral', {
    headers: { authorization: 'Bearer smei_test_key' },
  })
}

function makeRequestUrl(url: string) {
  return new NextRequest(url, {
    headers: { authorization: 'Bearer smei_test_key' },
  })
}

function makeApiKeyQuery(data: Record<string, unknown> | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  }
  return query
}

describe('/api/contadores/simulate GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    normalizeCnaeCodeMock.mockReturnValue('6204-0/00')
    getCnaeMock.mockReturnValue({ cnae: '6204-0/00' })
    simularMock.mockReturnValue({ ok: 'resultado' })
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(Date.now() + 60 * 1000).toISOString(),
      hitCount: 1,
    })
  })

  it('returns 429 without simulating when atomic quota consumption returns no row', async () => {
    const apiKeyQuery = makeApiKeyQuery({
      id: 'key-1',
      user_id: 'user-1',
      tier: 'free',
      revoked_at: null,
    })
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => apiKeyQuery),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(429)
    expect(simularMock).not.toHaveBeenCalled()
  })

  it('rejects invalid query parameters before consuming quota', async () => {
    const apiKeyQuery = makeApiKeyQuery({
      id: 'key-1',
      user_id: 'user-1',
      tier: 'free',
      revoked_at: null,
    })
    const rpcMock = vi.fn()
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => apiKeyQuery),
      rpc: rpcMock,
    })

    const response = await GET(makeRequestUrl('http://localhost/api/contadores/simulate?faturamentoAcumulado=60000&mesAtual=13&cnae=6204000&folhaMensal=2000&tipoMei=geral'))

    expect(response.status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('rejects unknown CNAEs before consuming quota', async () => {
    getCnaeMock.mockReturnValueOnce(undefined)
    const apiKeyQuery = makeApiKeyQuery({
      id: 'key-1',
      user_id: 'user-1',
      tier: 'free',
      revoked_at: null,
    })
    const rpcMock = vi.fn()
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => apiKeyQuery),
      rpc: rpcMock,
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 500 when quota accounting fails', async () => {
    const apiKeyQuery = makeApiKeyQuery({
      id: 'key-1',
      user_id: 'user-1',
      tier: 'free',
      revoked_at: null,
    })
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => apiKeyQuery),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'rpc unavailable' } }),
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(500)
    expect(simularMock).not.toHaveBeenCalled()
  })

  it('uses the quota RPC result for successful usage accounting', async () => {
    const apiKeyQuery = makeApiKeyQuery({
      id: 'key-1',
      user_id: 'user-1',
      tier: 'free',
      revoked_at: null,
    })
    const rpcMock = vi.fn().mockResolvedValue({
      data: [{ requests_month: 42, monthly_limit: 1000 }],
      error: null,
    })
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => apiKeyQuery),
      rpc: rpcMock,
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      usage: { used: 42, limit: 1000 },
      resultado: { ok: 'resultado' },
    })
    expect(rpcMock).toHaveBeenCalledWith('increment_quota', { p_api_key_id: 'key-1' })
  })

  it('returns 429 with Retry-After when burst rate limit (100/min) is exceeded', async () => {
    const apiKeyQuery = makeApiKeyQuery({
      id: 'key-1',
      user_id: 'user-1',
      tier: 'pro',
      revoked_at: null,
    })
    const rpcMock = vi.fn()
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => apiKeyQuery),
      rpc: rpcMock,
    })
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 30 * 1000).toISOString(),
      hitCount: 101,
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
    expect(rpcMock).not.toHaveBeenCalled()
    expect(simularMock).not.toHaveBeenCalled()
  })
})
