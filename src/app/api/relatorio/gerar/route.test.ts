import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  gerarOportunidadesFiscaisMock,
  renderToBufferMock,
  consumeRateLimitMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  gerarOportunidadesFiscaisMock: vi.fn(),
  renderToBufferMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/security/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security/rate-limit')>('@/lib/security/rate-limit')
  return {
    ...actual,
    consumeRateLimit: consumeRateLimitMock,
  }
})

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

import { GET } from './route'

function makeRequest(qs: string = '') {
  return new Request(`http://localhost/api/relatorio/gerar${qs ? `?${qs}` : ''}`)
}

function makeQuery(data: unknown) {
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue({ data }),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
    then: (resolve: (v: { data: unknown }) => unknown) => resolve({ data }),
  }
  return query
}

/**
 * Builds a `from('table')` query that distinguishes:
 * - `.eq('id', x).maybeSingle()` lookups (by-id) — routed via `byId` map
 * - everything else — returns the default `data` payload (list/limit/etc.)
 *
 * `byId` keys are the value passed to `.eq('id', ...)`.
 */
function makeRoutedQuery(defaultData: unknown, byId?: Record<string, unknown | null>) {
  let pendingId: string | null = null
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn((col: string, val: unknown) => {
      if (col === 'id' && typeof val === 'string') pendingId = val
      return query
    }),
    order: vi.fn(() => query),
    limit: vi.fn().mockImplementation(async () => ({ data: defaultData })),
    maybeSingle: vi.fn().mockImplementation(async () => {
      if (pendingId && byId && Object.prototype.hasOwnProperty.call(byId, pendingId)) {
        return { data: byId[pendingId] }
      }
      return { data: defaultData }
    }),
    then: (resolve: (v: { data: unknown }) => unknown) => resolve({ data: defaultData }),
  }
  return query
}

function makeServerClient(options: {
  user: { id: string; email?: string } | null
  profile?: Record<string, unknown> | null
  purchases?: unknown[]
  simulations?: unknown[]
  purchaseById?: Record<string, unknown | null>
  simulationById?: Record<string, unknown | null>
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') return makeQuery(options.profile ?? null)
      if (table === 'purchases') return makeRoutedQuery(options.purchases ?? [], options.purchaseById)
      if (table === 'simulations') return makeRoutedQuery(options.simulations ?? [], options.simulationById)
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe('/api/relatorio/gerar GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gerarOportunidadesFiscaisMock.mockReturnValue([])
    renderToBufferMock.mockImplementation(async (element: { type?: unknown; props?: unknown }) => {
      if (typeof element.type === 'function') {
        element.type(element.props)
      }
      return Buffer.from('pdf')
    })
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      hitCount: 1,
    })
  })

  describe('?purchase=', () => {
    it('rejects with 403 when the purchase belongs to another user', async () => {
      createClientMock.mockResolvedValue(makeServerClient({
        user: { id: 'user-1', email: 'user@example.com' },
        purchaseById: {
          'p1': {
            user_id: 'other-user',
            status: 'paid',
            produto: 'relatorio',
            report_fingerprint: 'fp-x',
            simulation_id: 's1',
          },
        },
      }))

      const response = await GET(makeRequest('purchase=p1'))

      expect(response.status).toBe(403)
    })

    it('rejects with 402 when the purchase is not paid', async () => {
      createClientMock.mockResolvedValue(makeServerClient({
        user: { id: 'user-1', email: 'user@example.com' },
        purchaseById: {
          'p1': {
            user_id: 'user-1',
            status: 'pending',
            produto: 'relatorio',
            report_fingerprint: 'fp-x',
            simulation_id: 's1',
          },
        },
      }))

      const response = await GET(makeRequest('purchase=p1'))

      expect(response.status).toBe(402)
    })

    // Nota: nos testes do caminho PINNED (simulation_id resolvido), 'fp-x' é
    // só sentinela — a resolução nem chega a comparar hash. Já no FALLBACK
    // (sim pinada some), o fp tem que ser REAL porque o route compara igualdade
    // entre reportFingerprint(sim.entrada) e o fp pago.
    it('returns a PDF when purchase is paid + owned + pinned sim resolves', async () => {
      createClientMock.mockResolvedValue(makeServerClient({
        user: { id: 'user-1', email: 'user@example.com' },
        purchaseById: {
          'p1': {
            user_id: 'user-1',
            status: 'paid',
            produto: 'relatorio',
            report_fingerprint: 'fp-x',
            simulation_id: 's1',
          },
        },
        simulationById: {
          's1': { resultado: makeResultado() },
        },
        simulations: [{ resultado: { ...makeResultado(), entrada: { ...makeResultado().entrada, cnae: '9999-9/99' } } }],
      }))

      const response = await GET(makeRequest('purchase=p1'))

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(response.headers.get('Content-Disposition')).toBe(
        'attachment; filename="simulamei-relatorio.pdf"',
      )
      expect(renderToBufferMock).toHaveBeenCalled()
      const renderedResultado = (renderToBufferMock.mock.calls[0][0] as { props: { resultado: { entrada: { cnae: string } } } }).props.resultado
      expect(renderedResultado.entrada.cnae).toBe('6204-0/00')
    })

    it('falls back to fingerprint match when pinned sim is missing', async () => {
      const entrada = makeResultado().entrada
      const fp = (await import('@/lib/reports/reportFingerprint')).reportFingerprint(entrada)
      createClientMock.mockResolvedValue(makeServerClient({
        user: { id: 'user-1', email: 'user@example.com' },
        purchaseById: {
          'p1': {
            user_id: 'user-1',
            status: 'paid',
            produto: 'relatorio',
            report_fingerprint: fp,
            simulation_id: null,
          },
        },
        simulations: [{ resultado: makeResultado() }],
      }))

      const response = await GET(makeRequest('purchase=p1'))

      expect(response.status).toBe(200)
      expect(renderToBufferMock).toHaveBeenCalled()
    })

    it('retorna 422 mesmo com 20 sims candidatas — todas com hash diferente do fp pago', async () => {
      // Garante que o fallback é bounded: 20 sims, nenhuma casa o fp pago → 422.
      // Documenta o contrato: "se nenhuma das candidatas casa, é 422".
      createClientMock.mockResolvedValue(makeServerClient({
        user: { id: 'user-1', email: 'user@example.com' },
        purchaseById: {
          'p1': {
            user_id: 'user-1',
            status: 'paid',
            produto: 'relatorio',
            report_fingerprint: 'fp-pago-de-outro-conteudo',
            simulation_id: null,
          },
        },
        simulations: Array.from({ length: 20 }, (_, i) => ({
          resultado: { ...makeResultado(), entrada: { ...makeResultado().entrada, faturamentoAcumulado: 10000 + i } },
        })),
      }))

      const response = await GET(makeRequest('purchase=p1'))

      expect(response.status).toBe(422)
      expect(renderToBufferMock).not.toHaveBeenCalled()
    })

    it('returns 422 when no sim can be resolved (pinned missing + no fingerprint match)', async () => {
      createClientMock.mockResolvedValue(makeServerClient({
        user: { id: 'user-1', email: 'user@example.com' },
        purchaseById: {
          'p1': {
            user_id: 'user-1',
            status: 'paid',
            produto: 'relatorio',
            report_fingerprint: 'fp-que-nao-existe',
            simulation_id: null,
          },
        },
        simulations: [{ resultado: makeResultado() }],
      }))

      const response = await GET(makeRequest('purchase=p1'))

      expect(response.status).toBe(422)
      expect(renderToBufferMock).not.toHaveBeenCalled()
    })
  })

  describe('default flow (no ?purchase=)', () => {
    it('returns a PDF as attachment for pro plan + non-empty latest sim', async () => {
      createClientMock.mockResolvedValue(makeServerClient({
        user: { id: 'user-1', email: 'user@example.com' },
        profile: { plano: 'pro' },
        purchases: [],
        simulations: [{ resultado: makeResultado() }],
      }))

      const response = await GET(makeRequest())

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(response.headers.get('Content-Disposition')).toBe(
        'attachment; filename="simulamei-relatorio.pdf"',
      )
      expect(renderToBufferMock).toHaveBeenCalled()
    })
  })

  it('returns 429 with Retry-After when rate limit is exceeded (CPU-heavy PDF gen)', async () => {
    createClientMock.mockResolvedValue(makeServerClient({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { plano: 'pro' },
      purchases: [],
      simulations: [{ resultado: makeResultado() }],
    }))
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      hitCount: 31,
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    expect(response.headers.get('X-RateLimit-Limit')).toBe('30')
    expect(renderToBufferMock).not.toHaveBeenCalled()
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
