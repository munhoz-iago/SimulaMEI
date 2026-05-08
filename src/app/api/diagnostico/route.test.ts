import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { ResultadoSimulacao } from '@/types/tributario'

const { createClientMock, gerarDiagnosticoFiscalMock, simularMock, getCnaeMock, normalizeCnaeCodeMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  gerarDiagnosticoFiscalMock: vi.fn(),
  simularMock: vi.fn(),
  getCnaeMock: vi.fn(),
  normalizeCnaeCodeMock: vi.fn(),
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

import { GET, POST } from './route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/diagnostico', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
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

describe('/api/diagnostico POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1' }))
    normalizeCnaeCodeMock.mockReturnValue('6204-0/00')
    getCnaeMock.mockReturnValue({ cnae: '6204-0/00' })
    simularMock.mockReturnValue(resultado)
    gerarDiagnosticoFiscalMock.mockResolvedValue({ resumoExecutivo: 'ok' })
  })

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

  it('requires authentication when loading the latest saved simulation', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await GET()

    expect(response.status).toBe(401)
    expect(gerarDiagnosticoFiscalMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the authenticated user has no saved simulation', async () => {
    const response = await GET()

    expect(response.status).toBe(404)
    expect(gerarDiagnosticoFiscalMock).not.toHaveBeenCalled()
  })

  it('generates a diagnosis from the latest saved simulation', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1' }, [{ resultado }]))

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ resumoExecutivo: 'ok' })
    expect(gerarDiagnosticoFiscalMock).toHaveBeenCalledWith(resultado)
  })
})
