import { describe, expect, it, vi } from 'vitest'
import { runOfficeAlertsMonitor } from './office-monitor'
import type { ResultadoSimulacao } from '@/types/tributario'

function makeResultado(percentualUtilizado: number): ResultadoSimulacao {
  return {
    entrada: {
      faturamentoAcumulado: 72_000,
      mesAtual: 8,
      cnae: '4712-1/00',
      folhaMensal: 0,
      tipoMei: 'geral',
    },
    alertaTeto: {
      faturamentoAcumulado: 72_000,
      tetoAnual: 81_000,
      tipoMei: 'geral',
      projecaoAnual: 108_000,
      diferenca: -27_000,
      percentualUtilizado,
      mesesRestantes: 4,
      mesesParaTeto: null,
      mesEstourarTeto: 9,
      cenario: 'dentro_limite',
      excessoProjetado: 0,
      percentualExcesso: 0,
    },
    fatorR: null,
    anexoAtual: 'I',
    comparativo: {
      simplesAnexoAtual: {
        anexo: 'I',
        rbt12: 108_000,
        faixa: 1,
        aliquotaNominal: 0.04,
        parcelaDeduzir: 0,
        aliquotaEfetiva: 0.04,
        dasAnual: 4320,
        dasMensal: 360,
      },
      presumido: {
        receitaAnual: 108_000,
        irpj: 0,
        csll: 0,
        pis: 0,
        cofins: 0,
        iss: 0,
        total: 0,
        aliquotaEfetiva: 0,
        categoria: 'servicos',
        presuncaoUtilizada: 0.32,
        inssProLabore: 0,
        inssPatronal: 0,
        custoTotal: 0,
        aliquotaEfetivaCustoTotal: 0,
      },
      real: {
        receitaAnual: 108_000,
        margemLiquida: 0.3,
        lucroEstimado: 32_400,
        irpj: 0,
        csll: 0,
        pis: 0,
        cofins: 0,
        iss: 0,
        total: 0,
        aliquotaEfetiva: 0,
        categoria: 'servicos',
        inssProLabore: 0,
        inssPatronal: 0,
        custoTotal: 0,
        aliquotaEfetivaCustoTotal: 0,
      },
      melhorRegime: 'simplesAtual',
      economiaVsMelhor: 0,
    },
    taxRuleVersion: 'BR-MEI-SN-2026-04-28',
    geradoEm: '2026-05-01T12:00:00.000Z',
  }
}

function makeQuery<T>(result: T) {
  const query = {
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    not: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => Promise.resolve(result)),
    limit: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    select: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: T) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function makeAdminClient(options?: {
  clients?: Array<{ id: string; name: string; cnae: string; tipo_mei: string }>
  latestSimulations?: Array<{ id: string; client_id: string; resultado: ResultadoSimulacao; created_at: string }>
}) {
  const clients = options?.clients ?? [{
    id: 'client-1',
    name: 'Loja Modelo',
    cnae: '4712-1/00',
    tipo_mei: 'geral',
  }]
  const latestSimulations = options?.latestSimulations ?? [{
    id: 'simulation-1',
    client_id: 'client-1',
    resultado: makeResultado(0.96),
    created_at: '2026-05-01T12:00:00.000Z',
  }]
  const alertInsertResult = {
    data: {
      id: 'alert-1',
      office_id: 'office-1',
      client_id: 'client-1',
      tipo: 'teto_95',
      mes_referencia: '2026-05',
      payload: {},
      created_at: '2026-05-01T12:00:00.000Z',
    },
    error: null,
  }
  const alertInsertQuery = {
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue(alertInsertResult),
    })),
  }
  const alertUpdateQuery = makeQuery({ error: null })
  const alertInsertMock = vi.fn(() => alertInsertQuery)
  const alertUpdateMock = vi.fn(() => alertUpdateQuery)

  const fromMock = vi.fn((table: string) => {
    if (table === 'accountant_offices') {
      return {
        select: vi.fn(() => makeQuery({
          data: [{
            id: 'office-1',
            name: 'Prime Contabilidade',
            plan: 'pro',
            max_clients: 150,
            trial_ends_at: null,
            stripe_subscription_status: 'active',
            current_period_end: null,
          }],
          error: null,
        })),
      }
    }

    if (table === 'office_clients') {
      return {
        select: vi.fn(() => makeQuery({
          data: clients,
          error: null,
        })),
      }
    }

    if (table === 'office_simulations') {
      return {
        select: vi.fn(() => makeQuery({
          data: [{
            id: 'simulation-1',
            resultado: makeResultado(0.96),
            created_at: '2026-05-01T12:00:00.000Z',
          }],
          error: null,
        })),
      }
    }

    if (table === 'office_members') {
      return {
        select: vi.fn(() => makeQuery({
          data: [{ user_id: 'user-1', role: 'owner' }],
          error: null,
        })),
      }
    }

    if (table === 'user_profiles') {
      return {
        select: vi.fn(() => makeQuery({
          data: [{ id: 'user-1', email: 'owner@example.com', nome: 'Ana' }],
          error: null,
        })),
      }
    }

    if (table === 'office_alerts') {
      return {
        insert: alertInsertMock,
        update: alertUpdateMock,
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      from: fromMock,
      rpc: vi.fn((fn: string, args: Record<string, unknown>) => {
        if (fn !== 'get_latest_simulations_by_office' || args.p_office_id !== 'office-1') {
          throw new Error(`Unexpected rpc: ${fn}`)
        }

        return Promise.resolve({ data: latestSimulations, error: null })
      }),
    },
    alertInsertMock,
    alertUpdateMock,
    fromMock,
  }
}

describe('runOfficeAlertsMonitor', () => {
  it('creates alerts and keeps them even when email delivery fails', async () => {
    const admin = makeAdminClient()
    const sendEmail = vi.fn().mockRejectedValue(new Error('resend unavailable'))

    const summary = await runOfficeAlertsMonitor({
      admin: admin.client,
      sendEmail,
      now: new Date('2026-05-01T12:00:00.000Z'),
    })

    expect(summary).toEqual(expect.objectContaining({
      officesScanned: 1,
      clientsScanned: 1,
      created: 1,
      duplicated: 0,
      emailsFailed: 1,
    }))
    expect(admin.alertInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      office_id: 'office-1',
      client_id: 'client-1',
      tipo: 'teto_95',
      mes_referencia: '2026-05',
    }))
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.com',
      officeName: 'Prime Contabilidade',
      clientName: 'Loja Modelo',
    }))
    expect(admin.alertUpdateMock).not.toHaveBeenCalled()
  })

  it('loads latest simulations once per office instead of querying per client', async () => {
    const admin = makeAdminClient({
      clients: [
        { id: 'client-1', name: 'Loja Modelo', cnae: '4712-1/00', tipo_mei: 'geral' },
        { id: 'client-2', name: 'Servico Modelo', cnae: '6204-0/00', tipo_mei: 'geral' },
      ],
      latestSimulations: [
        {
          id: 'simulation-1',
          client_id: 'client-1',
          resultado: makeResultado(0.96),
          created_at: '2026-05-01T12:00:00.000Z',
        },
        {
          id: 'simulation-2',
          client_id: 'client-2',
          resultado: makeResultado(0.82),
          created_at: '2026-05-01T12:05:00.000Z',
        },
      ],
    })

    const summary = await runOfficeAlertsMonitor({
      admin: admin.client,
      sendEmail: vi.fn().mockResolvedValue({ ok: true }),
      now: new Date('2026-05-01T12:00:00.000Z'),
    })

    expect(summary.clientsScanned).toBe(2)
    expect(admin.client.rpc).toHaveBeenCalledTimes(1)
    expect(admin.fromMock).not.toHaveBeenCalledWith('office_simulations')
  })
})
