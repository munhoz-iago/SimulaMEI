import type { Anexo } from '@/types/tributario'

export type RegimeAtual = 'mei' | 'simples' | null | undefined

/**
 * Rotula o anexo conforme o regime fiscal atual do usuário.
 *
 * MEI não tem anexo do Simples — afirmar "atual" para um MEI é fiscalmente
 * incorreto. Para MEI, o anexo é uma projeção do que se aplicaria se ele
 * migrasse para ME. Para quem já está no Simples (ME/EPP), o anexo é o atual.
 */
export function labelAnexoPorRegime(regime: RegimeAtual, anexo: Anexo): string {
  if (regime === 'mei') return `Anexo ${anexo} (se migrar para ME)`
  if (regime === 'simples') return `Anexo ${anexo} (atual)`
  return `Anexo ${anexo}`
}
