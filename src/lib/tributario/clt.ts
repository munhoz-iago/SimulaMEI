// clt.ts - Comparativo CLT: encargos do empregado e custo total do empregador
// TAX_RULE_VERSION: 'BR-MEI-SN-2026-04-28'
//
// Objetivo: mostrar ao usuario quanto pagaria em INSS + IRRF se tivesse uma
// vaga CLT com salario equivalente a receita atual dividida por 12.

import type { ResultadoCLT } from '@/types/tributario'
import { SALARIO_MINIMO_2026 } from '@/constants/tributario'

// Tabela INSS 2026 - aliquotas progressivas por faixa (empregado)
// Base no salario minimo de R$ 1.518
const FAIXAS_INSS: Array<{ limite: number; aliquota: number }> = [
  { limite: 1_518.00, aliquota: 0.075 },
  { limite: 2_793.88, aliquota: 0.090 },
  { limite: 4_190.83, aliquota: 0.120 },
  { limite: 8_157.41, aliquota: 0.140 }, // teto da contribuicao
]

// Tabela IRRF 2026 - mensal (apos deducoes)
// Desconto simplificado: R$ 564,80/mes (substitui deducoes por dependentes/despesas)
const DESCONTO_SIMPLIFICADO_IRRF = 564.80

const FAIXAS_IRRF: Array<{ limite: number; aliquota: number; parcelaDeduzir: number }> = [
  { limite: 2_259.20, aliquota: 0,     parcelaDeduzir: 0       },
  { limite: 2_826.65, aliquota: 0.075, parcelaDeduzir: 169.44  },
  { limite: 3_751.05, aliquota: 0.150, parcelaDeduzir: 381.44  },
  { limite: 4_664.68, aliquota: 0.225, parcelaDeduzir: 662.77  },
  { limite: Infinity, aliquota: 0.275, parcelaDeduzir: 896.00  },
]

// Encargos patronais sobre salario (estimativa media):
// INSS 20% + RAT ~3% + contribuicoes a terceiros ~5.8% = ~28.8%
const ENCARGOS_PATRONAIS_RATE = 0.288

const FGTS_ALIQUOTA = 0.08

function calcularINSSProgressivo(salarioBruto: number): number {
  let inss = 0
  let faixaAnterior = 0

  for (const faixa of FAIXAS_INSS) {
    if (salarioBruto <= faixaAnterior) break
    const baseNaFaixa = Math.min(salarioBruto, faixa.limite) - faixaAnterior
    inss += baseNaFaixa * faixa.aliquota
    faixaAnterior = faixa.limite
    if (salarioBruto <= faixa.limite) break
  }

  return inss
}

function calcularIRRFMensal(salarioBruto: number, inss: number): number {
  // Base IRRF = salario bruto - INSS - desconto simplificado
  const base = salarioBruto - inss - DESCONTO_SIMPLIFICADO_IRRF
  if (base <= 0) return 0

  for (const faixa of FAIXAS_IRRF) {
    if (base <= faixa.limite) {
      return Math.max(0, base * faixa.aliquota - faixa.parcelaDeduzir)
    }
  }

  return 0
}

/**
 * Estima o regime CLT para uma receita anual equivalente.
 *
 * Assume salario bruto mensal = receitaAnual / 12.
 * Inclui 13o salario e ferias com 1/3 no custo do empregador.
 *
 * @param receitaAnual - Receita bruta anual projetada (base para salario equivalente)
 */
export function calcularCLT(receitaAnual: number): ResultadoCLT {
  // Garantir que o salário não seja inferior ao mínimo
  const salarioBruto = Math.max(receitaAnual / 12, SALARIO_MINIMO_2026)

  // Encargos mensais do empregado
  const inssEmpregadoMensal  = calcularINSSProgressivo(salarioBruto)
  const irrfMensal           = calcularIRRFMensal(salarioBruto, inssEmpregadoMensal)
  const salarioLiquidoMensal = salarioBruto - inssEmpregadoMensal - irrfMensal

  // Projecao anual
  // 13o salario tambem sofre INSS (simplificacao: mesma aliquota mensal)
  const inssEmpregadoAnual = inssEmpregadoMensal * 13 // 12 mensais + 13o
  const irrfAnual          = irrfMensal * 12          // 13o tem calculo especifico, aproximado aqui
  const salarioBrutoAnual  = salarioBruto * 13        // 12 meses + 13o

  const salarioLiquidoAnual = salarioBruto * 12 - inssEmpregadoMensal * 12 - irrfAnual

  // FGTS (pago pelo empregador)
  const fgtsAnual = salarioBruto * 13 * FGTS_ALIQUOTA

  // Beneficios anuais
  const decimoTerceiro = salarioBruto
  const feriasComTerco = salarioBruto * (1 + 1 / 3)

  // Custo total do empregador:
  // 12 salarios + 13o + ferias + FGTS + encargos patronais (INSS + RAT + terceiros)
  const encargosPatronaisAnuais = salarioBruto * 12 * ENCARGOS_PATRONAIS_RATE
  const custoEmpregadorAnual =
    salarioBruto * 12 +
    decimoTerceiro +
    feriasComTerco +
    fgtsAnual +
    encargosPatronaisAnuais

  const encargosEmpregadoAnual = inssEmpregadoAnual + irrfAnual

  return {
    salarioBruto,
    salarioBrutoAnual,
    inssEmpregadoMensal,
    inssEmpregadoAnual,
    irrfMensal,
    irrfAnual,
    salarioLiquidoMensal,
    salarioLiquidoAnual,
    fgtsAnual,
    decimoTerceiro,
    feriasComTerco,
    custoEmpregadorAnual,
    encargosEmpregadoAnual,
  }
}
