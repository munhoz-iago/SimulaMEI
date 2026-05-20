import type { CenarioExcesso, ResultadoFatorR } from '@/types/tributario'

export type Acao =
  | { tipo: 'consultar_contador'; motivo: string }
  | { tipo: 'lancar_mes'; mes: number }
  | { tipo: 'planejar_migracao_me'; mesEstouro: number | null }
  | { tipo: 'ajustar_pro_labore'; folhaSugerida: number }
  | { tipo: 'sem_acao_urgente' }

export interface RecomendacaoInput {
  cenario: CenarioExcesso
  fatorR?: Pick<ResultadoFatorR, 'atingeMinimo' | 'aumentoFolhaMensalNecessario'>
  /** Mês (1-12) em que o motor projeta estouro do teto, ou null se sem risco */
  mesEstourarTeto: number | null
  elegivelFatorR: boolean
  faltaLancamentoMesAtual: boolean
  diaDoMes: number
  mesAtual: number
}

/**
 * Regra ranqueada de "próxima ação" — primeira condição que casa ganha.
 * Pura e determinística para suportar TDD e renderização server-side.
 *
 * Ordem das regras (decisão-first):
 *  1. Excesso grave → consultar contador (risco de tributação retroativa)
 *  2. Falta lançamento do mês corrente (após dia 5) → lançar o mês
 *  3. Excesso leve → planejar migração ME
 *  4. Estouro previsto nos próximos 3 meses → planejar migração ME
 *  5. CNAE elegível Fator R mas <28% → ajustar pró-labore
 *  6. Default → sem ação urgente
 */
export function recomendarAcao(input: RecomendacaoInput): Acao {
  if (input.cenario === 'excesso_grave') {
    return {
      tipo: 'consultar_contador',
      motivo: 'Risco de tributação retroativa — planeje migração com urgência',
    }
  }

  if (input.faltaLancamentoMesAtual && input.diaDoMes > 5) {
    return { tipo: 'lancar_mes', mes: input.mesAtual }
  }

  if (input.cenario === 'excesso_leve') {
    return { tipo: 'planejar_migracao_me', mesEstouro: input.mesEstourarTeto }
  }

  if (
    input.mesEstourarTeto !== null &&
    input.mesEstourarTeto <= input.mesAtual + 3
  ) {
    return { tipo: 'planejar_migracao_me', mesEstouro: input.mesEstourarTeto }
  }

  if (input.elegivelFatorR && input.fatorR && !input.fatorR.atingeMinimo) {
    return {
      tipo: 'ajustar_pro_labore',
      folhaSugerida: input.fatorR.aumentoFolhaMensalNecessario,
    }
  }

  return { tipo: 'sem_acao_urgente' }
}
