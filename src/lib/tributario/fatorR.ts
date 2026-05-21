// fatorR.ts — Cálculo do Fator R e lógica de migração Anexo III ↔ V
// Fonte: Resolução CGSN nº 140/2018, art. 25-A
// TAX_RULE_VERSION: 'BR-MEI-SN-2026-04-28'

import type { AlertaProLabore, FolhaCalculada, FolhaInput, ResultadoFatorR } from '@/types/tributario'
import {
  TETO_INSS_MENSAL_2026,
  INSS_PRO_LABORE_RATE,
  INSS_PATRONAL_RATE,
} from '@/constants/tributario'
import { calcularAliquotaEfetiva } from './anexos'

export const FATOR_R_MINIMO = 0.28 // 28%
export const FGTS_RATE = 0.08

function moedaPositiva(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

export function calcularFolhaFatorR(folha?: FolhaInput, fallbackMensal = 0): FolhaCalculada {
  if (!folha) {
    const totalMensal = moedaPositiva(fallbackMensal)
    return {
      salariosClt: 0,
      proLabore: totalMensal,
      inssPatronal: 0,
      fgts: 0,
      rpa: 0,
      beneficios: 0,
      totalMensal,
      total12meses: totalMensal * 12,
    }
  }

  const salariosClt = moedaPositiva(folha.salariosClt)
  const proLabore = moedaPositiva(folha.proLabore)
  const inssPatronal = moedaPositiva(folha.inssPatronal) || (salariosClt + proLabore) * INSS_PATRONAL_RATE
  const fgts = moedaPositiva(folha.fgts) || salariosClt * FGTS_RATE
  const rpa = moedaPositiva(folha.rpa)
  const beneficios = moedaPositiva(folha.beneficios)
  const totalMensal = salariosClt + proLabore + inssPatronal + fgts + rpa + beneficios

  return {
    salariosClt,
    proLabore,
    inssPatronal,
    fgts,
    rpa,
    beneficios,
    totalMensal,
    total12meses: totalMensal * 12,
  }
}

export function calcularFolhaMinimaAnualFatorR(rbt12: number): number {
  return Math.max(0, rbt12 * FATOR_R_MINIMO)
}

export function calcularAumentoFolhaMensalNecessario(rbt12: number, folhaMensalAtual: number): number {
  const folhaMinimaAnual = calcularFolhaMinimaAnualFatorR(rbt12)
  return Math.max(0, (folhaMinimaAnual / 12) - folhaMensalAtual)
}

export function calcularInssPessoalProLabore(proLaboreMensal: number): number {
  return Math.min(moedaPositiva(proLaboreMensal), TETO_INSS_MENSAL_2026) * INSS_PRO_LABORE_RATE
}

export function gerarAlertaProLabore(folha: FolhaCalculada, fatorR: number): AlertaProLabore | undefined {
  if (folha.totalMensal <= 0 || fatorR < FATOR_R_MINIMO) return undefined

  // Alerta se o pro-labore e muito alto em relacao a folha total (risco fiscal/previdenciario)
  // Se for 100% pro-labore (sem CLT), e comum em pequenas empresas, mas vale o alerta se > 70%
  const percentualFolha = folha.proLabore / folha.totalMensal
  if (percentualFolha <= 0.7) return undefined

  return {
    proLaboreMensal: folha.proLabore,
    folhaMensal: folha.totalMensal,
    percentualFolha,
    inssPessoalEstimado: calcularInssPessoalProLabore(folha.proLabore),
  }
}

/**
 * Calcula o Fator R.
 * Fator R = Folha de pagamento acumulada (12 meses) / Receita Bruta acumulada (12 meses)
 *
 * Se Fator R >= 28%, a empresa do Anexo V tributa pelo Anexo III naquele período.
 */
export function calcularFatorR(
  folha12meses: number,
  rbt12: number,
  folhaDetalhada?: FolhaCalculada,
): ResultadoFatorR {
  const fatorR = rbt12 > 0 ? folha12meses / rbt12 : 0
  const atingeMinimo = fatorR >= FATOR_R_MINIMO
  const anexoResultante = atingeMinimo ? 'III' : 'V'

  const folhaMinimaAnual = calcularFolhaMinimaAnualFatorR(rbt12)
  const folhaMinimaMensal = folhaMinimaAnual / 12
  const aumentoFolhaMensalNecessario = calcularAumentoFolhaMensalNecessario(
    rbt12,
    folha12meses / 12,
  )

  // Economia: diferença entre pagar Anexo V e Anexo III no mesmo RBT12
  const aliqV = calcularAliquotaEfetiva(rbt12, 'V')
  const aliqIII = calcularAliquotaEfetiva(rbt12, 'III')
  const economiaAnual = rbt12 * (aliqV - aliqIII)
  const economiaAnualPositiva = Math.max(0, economiaAnual)
  const memoriaCalculo = {
    aliquotaEfetivaAnexoV: aliqV,
    aliquotaEfetivaAnexoIII: aliqIII,
    rbt12Projetado: rbt12,
    diferencaAliquota: Math.max(0, aliqV - aliqIII),
    economiaAnual: economiaAnualPositiva,
  }

  return {
    folha12meses,
    rbt12,
    fatorR,
    fatorRPercent: fatorR * 100,
    atingeMinimo,
    anexoResultante,
    proLaboreMinimo: folhaMinimaMensal,
    folhaMinimaAnual,
    folhaMinimaMensal,
    aumentoFolhaMensalNecessario,
    economiaAnual: economiaAnualPositiva,
    memoriaCalculo,
    ...(folhaDetalhada ? { folhaDetalhada } : {}),
    ...(folhaDetalhada ? { alertaProLabore: gerarAlertaProLabore(folhaDetalhada, fatorR) } : {}),
  }
}

/**
 * Determina o Anexo correto para um dado CNAE e Fator R.
 * Apenas atividades elegíveis ao Fator R podem migrar entre Anexo III e V.
 */
export function determinarAnexo(
  anexoPadrao: 'III' | 'IV' | 'V',
  elegivelFatorR: boolean,
  fatorR: number
): 'III' | 'IV' | 'V' {
  if (!elegivelFatorR || anexoPadrao === 'IV') return anexoPadrao
  return fatorR >= FATOR_R_MINIMO ? 'III' : 'V'
}

/**
 * Dado um faturamento anual, calcula o valor de folha mensal necessário
 * para atingir Fator R >= 28% (pró-labore ideal).
 *
 * Útil para o componente "Simulador de Pró-labore Ideal".
 */
export function calcularProLaboreIdeal(faturamentoAnual: number): number {
  // Folha anual mínima = faturamento * 28%
  // Folha mensal = folha anual / 12
  return (faturamentoAnual * FATOR_R_MINIMO) / 12
}

/**
 * Dado um faturamento anual e folha mensal, retorna se atingiria 28%
 * e quanto falta (ou sobra) mensalmente.
 */
export function analisarFatorR(
  faturamentoAnual: number,
  folhaMensal: number
): {
  fatorRAtual: number
  fatorRPercent: number
  atingeMinimo: boolean
  diferencaMensal: number // positivo = sobra, negativo = falta
  proLaboreIdeal: number
} {
  const folhaAnual = folhaMensal * 12
  const fatorRAtual = faturamentoAnual > 0 ? folhaAnual / faturamentoAnual : 0
  const proLaboreIdeal = calcularProLaboreIdeal(faturamentoAnual)
  const diferencaMensal = folhaMensal - proLaboreIdeal

  return {
    fatorRAtual,
    fatorRPercent: fatorRAtual * 100,
    atingeMinimo: fatorRAtual >= FATOR_R_MINIMO,
    diferencaMensal,
    proLaboreIdeal,
  }
}
