import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  createClientMock,
  gerarOportunidadesFiscaisMock,
  renderToBufferMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  gerarOportunidadesFiscaisMock: vi.fn(),
  renderToBufferMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@react-pdf/renderer', () => ({
  Document: 'Document',
  Page: 'Page',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View',
  renderToBuffer: renderToBufferMock,
}))

vi.mock('@/lib/tributario', () => ({
  gerarOportunidadesFiscais: gerarOportunidadesFiscaisMock,
}))

vi.mock('@/lib/reports/SimulationReportDocument', () => ({
  SimulationReportDocument: vi.fn(() => null),
}))

import { POST } from './route'

function makeRequest(body: unknown = {}) {
  return new NextRequest('http://localhost/api/relatorio-premium', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeQuery(data: unknown) {
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue({ data }),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
    // Chainable também é "thenable": permite `await supabase.from(...).select(...).eq(...)`
    // sem precisar de .limit() no final (caso das queries de purchases após o gate por fingerprint).
    then: (resolve: (v: { data: unknown }) => unknown) => resolve({ data }),
  }
  return query
}

function makeServerClient(options: {
  user: { id: string; email?: string } | null
  profile?: Record<string, unknown> | null
  purchases?: unknown[]
  simulations?: unknown[]
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') return makeQuery(options.profile ?? null)
      if (table === 'purchases') return makeQuery(options.purchases ?? [])
      if (table === 'simulations') return makeQuery(options.simulations ?? [])
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe('/api/relatorio-premium POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gerarOportunidadesFiscaisMock.mockReturnValue([])
    renderToBufferMock.mockImplementation(async (element: { type?: unknown; props?: unknown }) => {
      if (typeof element.type === 'function') {
        element.type(element.props)
      }

      return Buffer.from('pdf')
    })
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ user: null }))

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
  })

  it('rejects a mismatched user_id payload', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ user: { id: 'user-1' } }))

    const response = await POST(makeRequest({ user_id: 'other-user' }))

    expect(response.status).toBe(403)
  })

  it('bloqueia 422 quando a simulação está vazia (mesmo sem acesso)', async () => {
    createClientMock.mockResolvedValue(makeServerClient({
      user: { id: 'user-1' },
      profile: { plano: 'free' },
      purchases: [],
      simulations: [{ resultado: {} }],
    }))

    const response = await POST(makeRequest())

    expect(response.status).toBe(422)
  })

  it('requires a saved simulation after access is confirmed', async () => {
    createClientMock.mockResolvedValue(makeServerClient({
      user: { id: 'user-1' },
      profile: { plano: 'pro' },
      purchases: [],
      simulations: [],
    }))

    const response = await POST(makeRequest())

    expect(response.status).toBe(404)
  })

  it('returns a PDF for pro users with a saved simulation', async () => {
    createClientMock.mockResolvedValue(makeServerClient({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: {
        nome: 'Ana',
        nome_negocio: 'Studio Ana',
        cnae_principal: '6204-0/00',
        atividades_realizadas: 'Desenvolvimento',
        plano: 'pro',
      },
      purchases: [],
      simulations: [{ resultado: makeResultado() }],
    }))

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(renderToBufferMock).toHaveBeenCalled()
  })

  it('returns 422 (not a zeroed PDF) when the saved simulation is empty', async () => {
    createClientMock.mockResolvedValue(makeServerClient({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { plano: 'pro' },
      purchases: [],
      simulations: [{ resultado: { entrada: { faturamentoAcumulado: 0 }, alertaTeto: { projecaoAnual: 0 } } }],
    }))

    const response = await POST(makeRequest())

    expect(response.status).toBe(422)
    expect(renderToBufferMock).not.toHaveBeenCalled()
  })

  it('libera 200 para free user quando o fingerprint da simulação atual já foi pago', async () => {
    const entrada = makeResultado().entrada
    const fp = (await import('@/lib/reports/reportFingerprint')).reportFingerprint(entrada)
    createClientMock.mockResolvedValue(makeServerClient({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { plano: 'free' },
      purchases: [{ report_fingerprint: fp }],
      simulations: [{ resultado: makeResultado() }],
    }))
    const response = await POST(makeRequest())
    expect(response.status).toBe(200)
  })

  it('bloqueia 403 para free user quando o fingerprint atual não foi pago', async () => {
    createClientMock.mockResolvedValue(makeServerClient({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { plano: 'free' },
      purchases: [{ report_fingerprint: 'fp-de-outra-sim' }],
      simulations: [{ resultado: makeResultado() }],
    }))
    const response = await POST(makeRequest())
    expect(response.status).toBe(403)
  })
})

function makeResultado() {
  return {
    entrada: {
      faturamentoAcumulado: 60000,
      mesAtual: 6,
      cnae: '6204-0/00',
      folhaMensal: 2000,
      tipoMei: 'geral',
    },
    alertaTeto: {
      percentualUtilizado: 0.7,
      projecaoAnual: 120000,
      tetoAnual: 81000,
    },
    fatorR: null,
    anexoAtual: 'III',
    comparativo: {
      melhorRegime: 'simplesAtual',
    },
    taxRuleVersion: 'TEST',
    geradoEm: '2026-05-08T00:00:00.000Z',
  }
}
