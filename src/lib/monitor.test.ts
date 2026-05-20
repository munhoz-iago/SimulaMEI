import { describe, expect, it } from 'vitest'
import type { TipoMei } from '@/types/tributario'
import { detectAnexoTransition, getFiscalCalendarItems, summarizeMonthlyMonitor } from './monitor'

describe('summarizeMonthlyMonitor', () => {
  it('resume o monitor mensal e calcula o DAS estimado a partir da série', () => {
    const summary = summarizeMonthlyMonitor({
      cnae: '6201-5/01',
      tipoMei: 'geral',
      mesAtual: 4,
      historico: [
        { ano: 2026, mes: 1, faturamentoMes: 10_000, folhaMes: 2_000 },
        { ano: 2026, mes: 2, faturamentoMes: 11_000, folhaMes: 2_000 },
        { ano: 2026, mes: 3, faturamentoMes: 12_000, folhaMes: 2_500 },
        { ano: 2026, mes: 4, faturamentoMes: 13_000, folhaMes: 2_500 },
      ],
    })

    expect(summary.faturamentoAcumulado).toBe(46_000)
    expect(summary.projecaoAnual).toBe(138_000)
    expect(summary.dasMensalEstimado).toBeGreaterThan(0)
    expect(summary.proLaboreIdeal).toBeGreaterThan(0)
  })
})

describe('detectAnexoTransition', () => {
  it('detecta cruzamento recente de anexo no histórico mensal', () => {
    const transition = detectAnexoTransition([
      { ano: 2026, mes: 3, anexoCalculado: 'V', fatorR: 0.26 },
      { ano: 2026, mes: 4, anexoCalculado: 'III', fatorR: 0.31 },
    ])

    expect(transition).toEqual({
      from: 'V',
      to: 'III',
      ano: 2026,
      mes: 4,
      fatorR: 0.31,
    })
  })
})

describe('getFiscalCalendarItems', () => {
  it('gera agenda fiscal contextualizada ao estado do usuário', () => {
    // Fixar data pra teste determinístico (julho/2026, dia 10)
    const items = getFiscalCalendarItems({
      refDate: new Date(2026, 6, 10), // Jul 10, 2026
      nome: 'Ana',
      tipoMei: 'geral' satisfies TipoMei,
      anexoAtual: 'V',
      elegivelFatorR: true,
      usoTeto: 0.65,
      fatorRAtual: 0.15,
      faturamentoMedio: 10000,
      ultimoLancamentoMes: 6,
      ultimoLancamentoAno: 2026,
      totalLancamentos: 6,
    })

    // Sempre inclui DAS do mês (julho)
    expect(items.some(item => item.title.includes('Julho'))).toBe(true)
    expect(items.some(item => item.title.includes('DAS'))).toBe(true)
    // Uso de teto > 50% gera item informativo
    expect(items.some(item => item.title.includes('teto'))).toBe(true)
    // Fator R abaixo de 28% gera sugestão de ajuste
    expect(items.some(item => item.title.includes('Fator R'))).toBe(true)
    // Sem lançamento do mês corrente (já é dia 10 e último foi junho)
    expect(items.some(item => item.title.includes('ainda não registrado'))).toBe(true)
    // Pelo menos uma severidade de atenção/crítico
    expect(items.some(item => item.severity === 'atencao' || item.severity === 'critico')).toBe(true)
  })

  it('placeholder quando não há lançamentos ainda', () => {
    const items = getFiscalCalendarItems({
      refDate: new Date(2026, 0, 3), // 3 de janeiro
      nome: 'Iago',
      tipoMei: 'geral' satisfies TipoMei,
      anexoAtual: 'III',
      elegivelFatorR: false,
      totalLancamentos: 0,
    })

    expect(items.some(item => item.title.includes('Comece pelo primeiro lançamento'))).toBe(true)
  })

  // Res. CGSN 140/2018 art. 25-A: CNAE elegível Fator R + FR<28% → Anexo V (não III).
  // Mesmo que o upstream passe anexoAtual='III' (anexoPadrão do CNAE), o título
  // deve refletir o anexo EFETIVO no branch FR<28%, que por lei é V.
  it('FR<28% em CNAE elegível → título indica Anexo V (não o anexoAtual recebido)', () => {
    const items = getFiscalCalendarItems({
      refDate: new Date(2026, 6, 10),
      nome: 'Ana',
      tipoMei: 'geral' satisfies TipoMei,
      anexoAtual: 'III', // simula upstream passando anexoPadrão (pré-Fator R)
      elegivelFatorR: true,
      fatorRAtual: 0.15, // < 28% → efetivamente Anexo V
      faturamentoMedio: 10_000,
      totalLancamentos: 6,
    })

    const frItem = items.find(item => item.title.startsWith('Fator R abaixo de 28%'))
    expect(frItem).toBeDefined()
    expect(frItem!.title).toBe('Fator R abaixo de 28% — Anexo V aplicado')
  })
})
