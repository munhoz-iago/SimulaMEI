import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  createClientMock,
  anthropicCreateMock,
  gerarOportunidadesFiscaisMock,
  renderToBufferMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  anthropicCreateMock: vi.fn(),
  gerarOportunidadesFiscaisMock: vi.fn(),
  renderToBufferMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function AnthropicMock() {
    return {
    messages: {
      create: anthropicCreateMock,
    },
    }
  }),
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

import { POST } from './route'

function makeRequest(body: unknown = {}) {
  return new NextRequest('http://localhost/api/relatorio-premium', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeQuery(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue({ data }),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
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
    process.env.ANTHROPIC_API_KEY = ''
    anthropicCreateMock.mockResolvedValue({
      content: [{ type: 'text', text: 'Analise fiscal gerada.' }],
    })
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

  it('requires a paid report or pro plan before generating the PDF', async () => {
    createClientMock.mockResolvedValue(makeServerClient({
      user: { id: 'user-1' },
      profile: { plano: 'free' },
      purchases: [],
      simulations: [{ resultado: {} }],
    }))

    const response = await POST(makeRequest())

    expect(response.status).toBe(403)
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

  it('returns 503 when Anthropic is not configured', async () => {
    createClientMock.mockResolvedValue(makeServerClient({
      user: { id: 'user-1' },
      profile: { plano: 'pro' },
      purchases: [],
      simulations: [{ resultado: makeResultado() }],
    }))

    const response = await POST(makeRequest())

    expect(response.status).toBe(503)
  })

  it('returns a PDF for pro users with a saved simulation', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
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
    expect(anthropicCreateMock).toHaveBeenCalled()
    expect(renderToBufferMock).toHaveBeenCalled()
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
