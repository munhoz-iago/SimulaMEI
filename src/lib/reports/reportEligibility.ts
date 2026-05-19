// Uma simulação só vira relatório útil se houver sinal financeiro real.
// Sem isto, dava pra pagar R$ 9,90 (ou usar plano) e receber um PDF todo
// zerado quando a última simulação salva foi um teste vazio (faturamento 0).

type ResultadoVazioInput =
  | {
      entrada?: { faturamentoAcumulado?: number | null } | null
      alertaTeto?: { projecaoAnual?: number | null } | null
    }
  | null
  | undefined

/**
 * True quando a simulação não tem faturamento nem projeção — relatório
 * sairia todo R$ 0. As rotas usam isto pra bloquear com mensagem clara
 * em vez de entregar um PDF inútil.
 */
export function isResultadoVazio(resultado: ResultadoVazioInput): boolean {
  if (!resultado) return true
  const faturamento = resultado.entrada?.faturamentoAcumulado ?? 0
  const projecao = resultado.alertaTeto?.projecaoAnual ?? 0
  return faturamento <= 0 && projecao <= 0
}

export const RELATORIO_VAZIO_MSG =
  'Sua última simulação está vazia (faturamento R$ 0). Refaça a simulação com seus dados antes de gerar o relatório.'
