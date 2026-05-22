import { describe, expect, it } from 'vitest'
import { normalizeOfficeClientSimulation } from './simulations'

const client = {
  cnae: '4712-1/00',
  tipo_mei: 'geral',
}

describe('normalizeOfficeClientSimulation', () => {
  it('uses client fiscal data when cnae and tipoMei are omitted', () => {
    const result = normalizeOfficeClientSimulation({
      faturamentoAcumulado: 42000,
      mesAtual: 6,
      folhaMensal: 1800,
    }, client)

    expect(result).toEqual({
      ok: true,
      value: {
        faturamentoAcumulado: 42000,
        mesAtual: 6,
        folhaMensal: 1800,
        cnae: '4712-1/00',
        tipoMei: 'geral',
      },
    })
  })

  it('rejects invalid month', () => {
    const result = normalizeOfficeClientSimulation({
      faturamentoAcumulado: 42000,
      mesAtual: 13,
      folhaMensal: 1800,
    }, client)

    expect(result).toEqual({ ok: false, error: 'mesAtual deve ser entre 1 e 12.' })
  })

  it('preserves detailed payroll fields from the full simulator', () => {
    const result = normalizeOfficeClientSimulation({
      faturamentoAcumulado: 42000,
      mesAtual: 6,
      folhaMensal: 2600,
      folhaDetalhada: {
        salariosClt: 1000,
        proLabore: 1200,
        rpa: 200,
        beneficios: 200,
      },
    }, client)

    expect(result).toEqual({
      ok: true,
      value: {
        faturamentoAcumulado: 42000,
        mesAtual: 6,
        folhaMensal: 2600,
        cnae: '4712-1/00',
        folhaDetalhada: {
          salariosClt: 1000,
          proLabore: 1200,
          rpa: 200,
          beneficios: 200,
        },
        tipoMei: 'geral',
      },
    })
  })

  it('rejects invalid detailed payroll fields', () => {
    const result = normalizeOfficeClientSimulation({
      faturamentoAcumulado: 42000,
      mesAtual: 6,
      folhaMensal: 1800,
      folhaDetalhada: {
        salariosClt: -1,
      },
    }, client)

    expect(result).toEqual({
      ok: false,
      error: 'Campos inválidos. Verifique faturamentoAcumulado, mesAtual, folhaMensal e folhaDetalhada.',
    })
  })

  it('rejects an unknown override CNAE', () => {
    const result = normalizeOfficeClientSimulation({
      faturamentoAcumulado: 42000,
      mesAtual: 6,
      folhaMensal: 1800,
      cnae: '9999999',
    }, client)

    expect(result).toEqual({ ok: false, error: 'CNAE não reconhecido. Informe um código oficial válido.' })
  })
})
