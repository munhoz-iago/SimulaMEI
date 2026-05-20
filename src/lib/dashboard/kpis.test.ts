import { describe, expect, it } from 'vitest'
import { deriveMesEstourarTeto, getDashboardKPIs } from './kpis'
import { simular } from '@/lib/tributario'
import type { MonthlyMonitorSummary } from '@/lib/monitor'

const refDate = new Date('2026-05-19T12:00:00-03:00')

function makeMonitorSummary(overrides: Partial<MonthlyMonitorSummary> = {}): MonthlyMonitorSummary {
  return {
    rbt12: 48_000,
    faturamentoAcumulado: 48_000,
    folhaAcumulada: 12_000,
    projecaoAnual: 115_200,
    fatorRAtual: 0.25,
    dasMensalEstimado: 1_400,
    proLaboreIdeal: 2_688,
    ...overrides,
  }
}

describe('getDashboardKPIs', () => {
  it('classifica como crítico quando uso atual parece saudável, mas projeção passa da tolerância do teto', () => {
    const kpis = getDashboardKPIs({
      monitorSummary: makeMonitorSummary(),
      monthlyInputsCount: 5,
      latestMonth: 5,
      latestYear: 2026,
      tipoMei: 'geral',
      plan: 'pro',
      freeLimitReached: false,
      refDate,
    })

    expect(kpis.source).toBe('monitor')
    expect(kpis.usoTeto).toBeCloseTo(0.593, 3)
    expect(kpis.tone).toBe('danger')
    expect(kpis.contextMessage).toBe('Projeção crítica: 142% do teto')
    expect(kpis.contextSubMessage).toContain('Acumulado atual em 59%')
    expect(kpis.contextSubMessage).toContain('5 meses')
  })

  it('classifica como atenção quando projeção passa do teto, mas fica dentro da tolerância', () => {
    const kpis = getDashboardKPIs({
      monitorSummary: makeMonitorSummary({
        faturamentoAcumulado: 45_000,
        projecaoAnual: 89_000,
      }),
      monthlyInputsCount: 5,
      latestMonth: 5,
      latestYear: 2026,
      tipoMei: 'geral',
      plan: 'pro',
      freeLimitReached: false,
      refDate,
    })

    expect(kpis.tone).toBe('warn')
    expect(kpis.contextMessage).toBe('Projeção acima do teto: 110%')
  })

  it('também usa projeção, não só acumulado, para classificar simulação avulsa', () => {
    const latestSimulation = simular({
      faturamentoAcumulado: 48_000,
      mesAtual: 5,
      cnae: '6201-5/01',
      folhaMensal: 1_000,
      tipoMei: 'geral',
    })

    const kpis = getDashboardKPIs({
      latestSimulation,
      monthlyInputsCount: 0,
      latestMonth: null,
      latestYear: null,
      tipoMei: 'geral',
      plan: 'pro',
      freeLimitReached: false,
      refDate,
    })

    expect(kpis.source).toBe('simulation')
    expect(kpis.usoTeto).toBeCloseTo(0.593, 3)
    expect(kpis.tone).toBe('danger')
    expect(kpis.contextSubMessage).toContain('142% do teto')
  })
})

describe('getDashboardKPIs — "margem confortável" só quando projeção também confortável', () => {
  // BUG: usuário com uso atual baixo (30%) mas projeção que estoura o teto (150%)
  // recebia "margem confortável" no card, contradizendo o headline crítico do
  // alerta no topo. A árvore precisa ramificar por projeção PRIMEIRO.
  it('NÃO diz "confortável" quando projeção excede o teto, mesmo com uso atual baixo', () => {
    const kpis = getDashboardKPIs({
      monitorSummary: makeMonitorSummary({
        faturamentoAcumulado: 24_300, // 30% do teto (R$ 81k)
        projecaoAnual: 121_500,        // 150% do teto → estouro projetado
      }),
      monthlyInputsCount: 3,
      latestMonth: 5,
      latestYear: 2026,
      tipoMei: 'geral',
      plan: 'pro',
      freeLimitReached: false,
      refDate,
    })

    const fullText = (kpis.contextMessage + ' ' + kpis.contextSubMessage).toLowerCase()
    expect(fullText).not.toContain('confortável')
    expect(fullText).toMatch(/projeç|excede|estouro/i)
  })

  it('mantém "margem confortável" quando ambos uso atual E projeção estão baixos', () => {
    const kpis = getDashboardKPIs({
      monitorSummary: makeMonitorSummary({
        faturamentoAcumulado: 24_300, // 30% do teto
        projecaoAnual: 32_400,         // 40% do teto → projeção confortável
      }),
      monthlyInputsCount: 3,
      latestMonth: 5,
      latestYear: 2026,
      tipoMei: 'geral',
      plan: 'pro',
      freeLimitReached: false,
      refDate,
    })

    const fullText = (kpis.contextMessage + ' ' + kpis.contextSubMessage).toLowerCase()
    expect(fullText).toContain('confortável')
  })
})

describe('deriveMesEstourarTeto', () => {
  it('projeção abaixo do teto → null', () => {
    expect(deriveMesEstourarTeto(60_000, 81_000)).toBeNull()
    expect(deriveMesEstourarTeto(81_000, 81_000)).toBeNull()
  })

  it('projeção 162k em teto 81k (ritmo dobrado) → mês 6', () => {
    expect(deriveMesEstourarTeto(162_000, 81_000)).toBe(6)
  })

  it('projeção 100k em teto 81k → ainda no ano', () => {
    const m = deriveMesEstourarTeto(100_000, 81_000)
    expect(m).not.toBeNull()
    expect(m! >= 1 && m! <= 12).toBe(true)
  })

  it('projeção zero → null', () => {
    expect(deriveMesEstourarTeto(0, 81_000)).toBeNull()
  })
})
