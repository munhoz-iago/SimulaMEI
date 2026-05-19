import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { ResultadoSimulacao } from '@/types/tributario'

const {
  createClientMock,
  simularMock,
  getCnaeMock,
  normalizeCnaeCodeMock,
  consumeRateLimitMock,
  hashIpAddressMock,
  getClientIpMock,
  getUserAgentMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  simularMock: vi.fn(),
  getCnaeMock: vi.fn(),
  normalizeCnaeCodeMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  hashIpAddressMock: vi.fn(),
  getClientIpMock: vi.fn(),
  getUserAgentMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
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

vi.mock('@/lib/security/hash', () => ({
  hashIpAddress: hashIpAddressMock,
}))

vi.mock('@/lib/security/request', () => ({
  getClientIp: getClientIpMock,
  getUserAgent: getUserAgentMock,
}))

import { POST } from './route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/simular', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeRateLimitResult(overrides: Partial<Awaited<ReturnType<typeof consumeRateLimitMock>>> = {}) {
  return {
    allowed: true,
    remaining: 59,
    resetAt: '2026-04-30T12:00:00.000Z',
    hitCount: 1,
    ...overrides,
  }
}

function makeSupabaseMock() {
  const insertMock = vi.fn().mockResolvedValue({ error: null })
  const profileMaybeSingleMock = vi.fn().mockResolvedValue({ data: { plano: 'free' }, error: null })
  const profileEqMock = vi.fn(() => ({ maybeSingle: profileMaybeSingleMock }))
  const profileSelectMock = vi.fn(() => ({ eq: profileEqMock }))
  const simulationCountEqMock = vi.fn().mockResolvedValue({ count: 0, error: null })
  const simulationSelectMock = vi.fn(() => ({ eq: simulationCountEqMock }))
  const fromMock = vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return { select: profileSelectMock }
    }

    if (table === 'simulations') {
      return {
        insert: insertMock,
        select: simulationSelectMock,
      }
    }

    return { insert: insertMock }
  })

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: fromMock,
    },
    insertMock,
    fromMock,
    profileSelectMock,
    simulationSelectMock,
  }
}

const fakeResultado = {
  entrada: {
    faturamentoAcumulado: 60000,
    mesAtual: 6,
    cnae: '6204-0/00',
    folhaMensal: 2000,
    tipoMei: 'geral',
  },
  alertaTeto: {
    limiteAplicavel: 81000,
    percentualUtilizado: 0.74,
    projecaoAnual: 120000,
    cenario: 'excesso_leve',
    excessoEstimado: 39000,
  },
  fatorR: null,
  anexoAtual: 'III',
  comparativo: {
    simplesAnexoAtual: { anexo: 'III', aliquotaEfetiva: 0.06, dasMensal: 600, dasAnual: 7200 },
    presumido: { total: 14000, irpj: 1000, csll: 500, pis: 800, cofins: 3600, iss: 4800, inss: 3300 },
    real: { total: 19000, margemAssumida: 0.3 },
    melhorRegime: 'simplesAtual',
    economiaVsMelhor: 0,
  },
  taxRuleVersion: 'TEST',
  geradoEm: '2026-04-30T10:00:00.000Z',
} as unknown as ResultadoSimulacao

describe('/api/simular POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumeRateLimitMock.mockResolvedValue(makeRateLimitResult())
    hashIpAddressMock.mockReturnValue('hashed-ip')
    getClientIpMock.mockReturnValue('127.0.0.1')
    getUserAgentMock.mockReturnValue('Vitest')
    normalizeCnaeCodeMock.mockImplementation((value: string) => value)
    getCnaeMock.mockReturnValue({ cnae: '6204-0/00' })
    simularMock.mockReturnValue(fakeResultado)
  })

  it('rejects legacy faturamentoAnual payloads with 400', async () => {
    const response = await POST(makeRequest({
      faturamentoAnual: 120000,
      faturamentoAcumulado: 60000,
      mesAtual: 6,
      cnae: '6204-0/00',
      folhaMensal: 2000,
      tipoMei: 'geral',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Use faturamentoAcumulado. O campo faturamentoAnual nao e mais aceito nesta API.',
    })
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('returns 429 when the simulation rate limit is exhausted', async () => {
    consumeRateLimitMock.mockResolvedValueOnce(makeRateLimitResult({
      allowed: false,
      remaining: 0,
      hitCount: 60,
    }))

    const response = await POST(makeRequest({
      faturamentoAcumulado: 60000,
      mesAtual: 6,
      cnae: '6204-0/00',
      folhaMensal: 2000,
      tipoMei: 'geral',
    }))

    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('rejects unknown CNAE codes before simulating', async () => {
    normalizeCnaeCodeMock.mockReturnValueOnce('9999-9/99')
    getCnaeMock.mockReturnValueOnce(undefined)

    const response = await POST(makeRequest({
      faturamentoAcumulado: 60000,
      mesAtual: 6,
      cnae: '9999999',
      folhaMensal: 2000,
      tipoMei: 'geral',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'CNAE não reconhecido. Informe um código oficial válido.',
    })
    expect(simularMock).not.toHaveBeenCalled()
  })

  it('simulates successfully, persists the result and exposes rate limit headers', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await POST(makeRequest({
      faturamentoAcumulado: 60000,
      mesAtual: 6,
      cnae: '6204000',
      folhaMensal: 2000,
      tipoMei: 'geral',
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(fakeResultado)
    expect(normalizeCnaeCodeMock).toHaveBeenCalledWith('6204000')
    expect(simularMock).toHaveBeenCalledWith({
      faturamentoAcumulado: 60000,
      mesAtual: 6,
      cnae: '6204000',
      folhaMensal: 2000,
      tipoMei: 'geral',
    })
    expect(supabase.fromMock).toHaveBeenCalledWith('simulations')
    expect(supabase.profileSelectMock).toHaveBeenCalledWith('plano')
    expect(supabase.simulationSelectMock).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(supabase.insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      entrada: {
        faturamentoAcumulado: 60000,
        mesAtual: 6,
        cnae: '6204000',
        folhaMensal: 2000,
        tipoMei: 'geral',
      },
      resultado: fakeResultado,
      ip_hash: 'hashed-ip',
      user_agent: 'Vitest',
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard')
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('59')
  })
})
