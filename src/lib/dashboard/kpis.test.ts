import { describe, expect, it } from 'vitest'
import { getDashboardKPIs } from './kpis'
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
