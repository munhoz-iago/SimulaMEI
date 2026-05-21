import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { ResultadoSimulacao } from '@/types/tributario'

const { 
  createClientMock, 
  gerarDiagnosticoFiscalMock, 
  simularMock, 
  getCnaeMock, 
  normalizeCnaeCodeMock,
  consumeRateLimitMock
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  gerarDiagnosticoFiscalMock: vi.fn(),
  simularMock: vi.fn(),
  getCnaeMock: vi.fn(),
  normalizeCnaeCodeMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/ai/diagnostico', () => ({
  gerarDiagnosticoFiscal: gerarDiagnosticoFiscalMock,
}))

vi.mock('@/lib/tributario', () => ({
  simular: simularMock,
  getCnae: getCnaeMock,
  normalizeCnaeCode: normalizeCnaeCodeMock,
}))

vi.mock('@/lib/security/rate-limit', () => ({
  consumeRateLimit: consumeRateLimitMock,
  applyRateLimitHeaders: vi.fn((res) => res),
}))

import { GET, POST } from './route'

function makeRequest(body: unknown = null) {
  return new NextRequest('http://localhost/api/diagnostico', {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function makeServerClient(user: { id: string } | null, simulations: unknown[] = []) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: simulations }),
          })),
        })),
      })),
    })),
  }
}

const entrada = {
  faturamentoAcumulado: 60000,
  mesAtual: 6,
  cnae: '6204000',
  folhaMensal: 2000,
  tipoMei: 'geral' as const,
}

const resultado = {
  entrada: { ...entrada, cnae: '6204-0/00' },
  alertaTeto: {},
  fatorR: null,
  anexoAtual: 'III',
  comparativo: {},
  taxRuleVersion: 'TEST',
  geradoEm: '2026-05-08T00:00:00.000Z',
} as unknown as ResultadoSimulacao

describe('/api/diagnostico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('APP_HASH_SECRET', 'test-secret')
    consumeRateLimitMock.mockResolvedValue({ allowed: true, remaining: 10, resetAt: new Date().toISOString() })
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1' }))
    normalizeCnaeCodeMock.mockReturnValue('6204-0/00')
    getCnaeMock.mockReturnValue({ cnae: '6204-0/00' })
    simularMock.mockReturnValue(resultado)
    gerarDiagnosticoFiscalMock.mockResolvedValue({ resumoExecutivo: 'ok' })
  })

  describe('POST', () => {
    it('requires an authenticated Supabase session', async () => {
      createClientMock.mockResolvedValue(makeServerClient(null))

      const response = await POST(makeRequest({ entrada }))

      expect(response.status).toBe(401)
      expect(gerarDiagnosticoFiscalMock).not.toHaveBeenCalled()
    })

    it('rejects invalid payloads before calling Anthropic', async () => {
      const response = await POST(makeRequest({ entrada: { ...entrada, mesAtual: 13 } }))

      expect(response.status).toBe(400)
      expect(gerarDiagnosticoFiscalMock).not.toHaveBeenCalled()
    })

    it('rejects unknown CNAEs before calling Anthropic', async () => {
      getCnaeMock.mockReturnValueOnce(undefined)

      const response = await POST(makeRequest({ entrada }))

      expect(response.status).toBe(400)
      expect(gerarDiagnosticoFiscalMock).not.toHaveBeenCalled()
    })

    it('recalculates the simulation server-side before generating the diagnosis', async () => {
      const response = await POST(makeRequest({
        entrada,
        resultado: { entrada: { ...entrada, cnae: 'malicious' } },
      }))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ resumoExecutivo: 'ok' })
      expect(simularMock).toHaveBeenCalledWith({ ...entrada, cnae: '6204-0/00' })
      expect(gerarDiagnosticoFiscalMock).toHaveBeenCalledWith(resultado)
    })
  })

  describe('GET', () => {
    it('requires authentication when loading the latest saved simulation', async () => {
      createClientMock.mockResolvedValue(makeServerClient(null))

      const response = await GET(makeRequest())

      expect(response.status).toBe(401)
      expect(gerarDiagnosticoFiscalMock).not.toHaveBeenCalled()
    })

    it('returns 404 when the authenticated user has no saved simulation', async () => {
      const response = await GET(makeRequest())

      expect(response.status).toBe(404)
      expect(gerarDiagnosticoFiscalMock).not.toHaveBeenCalled()
    })

    it('generates a diagnosis from the latest saved simulation', async () => {
      createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1' }, [{ resultado }]))

      const response = await GET(makeRequest())

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ resumoExecutivo: 'ok' })
      expect(gerarDiagnosticoFiscalMock).toHaveBeenCalledWith(resultado)
    })
  })
})
