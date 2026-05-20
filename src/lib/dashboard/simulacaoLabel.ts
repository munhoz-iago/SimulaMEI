import type { CenarioExcesso } from '@/types/tributario'

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const CENARIO_LABEL: Record<string, string> = {
  dentro_limite: 'dentro do teto',
  excesso_leve: 'excesso leve',
  excesso_grave: 'excesso grave',
}

const MAX_DESCRICAO = 28

interface SimulacaoLabelInput {
  geradoEm: string
  cnae: string
  cenario: CenarioExcesso
  cnaeDescricao?: string
}

/**
 * Rótulo humano para uma simulação salva — usado no histórico em vez do
 * hash truncado, que não diz nada sobre o conteúdo da simulação.
 *
 * Formato: "mai/2026 · Cabeleireiros · excesso grave"
 */
export function simulacaoLabel(s: SimulacaoLabelInput): string {
  const d = new Date(s.geradoEm)
  const mes = MES[d.getUTCMonth()] ?? '?'
  const ano = d.getUTCFullYear()
  const cnae = s.cnaeDescricao
    ? s.cnaeDescricao.length > MAX_DESCRICAO
      ? `${s.cnaeDescricao.slice(0, MAX_DESCRICAO - 1)}…`
      : s.cnaeDescricao
    : s.cnae
  const cen = CENARIO_LABEL[s.cenario] ?? s.cenario
  return `${mes}/${ano} · ${cnae} · ${cen}`
}
