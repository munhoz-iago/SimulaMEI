import { describe, expect, it } from 'vitest'
import { isResultadoVazio } from './reportEligibility'

describe('isResultadoVazio', () => {
  it('trata null/undefined/objeto vazio como vazio', () => {
    expect(isResultadoVazio(null)).toBe(true)
    expect(isResultadoVazio(undefined)).toBe(true)
    expect(isResultadoVazio({})).toBe(true)
  })

  it('é vazio quando faturamento e projeção são 0', () => {
    expect(isResultadoVazio({
      entrada: { faturamentoAcumulado: 0 },
      alertaTeto: { projecaoAnual: 0 },
    })).toBe(true)
  })

  it('NÃO é vazio quando há faturamento acumulado', () => {
    expect(isResultadoVazio({
      entrada: { faturamentoAcumulado: 68000 },
      alertaTeto: { projecaoAnual: 163200 },
    })).toBe(false)
  })

  it('NÃO é vazio se só a projeção existir (mês 1, acumulado baixo mas projeta)', () => {
    expect(isResultadoVazio({
      entrada: { faturamentoAcumulado: 0 },
      alertaTeto: { projecaoAnual: 50000 },
    })).toBe(false)
  })
})
