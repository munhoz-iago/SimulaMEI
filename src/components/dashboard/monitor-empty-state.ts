export type MonitorEmptyReason = 'cnae-missing' | 'tipo-missing' | 'no-rows'

interface ProfileShape {
  cnae_principal?: string | null
  tipo_mei?: string | null
}

/**
 * Retorna o motivo de `monitorSummary` ser null, ou `null` se há dados.
 * Ordem de prioridade: cnae > tipo > rows (mais relevante primeiro).
 */
export function diagnoseMonitorEmptyReason(
  profile: ProfileShape | null | undefined,
  rowsCount: number,
): MonitorEmptyReason | null {
  if (!profile?.cnae_principal) return 'cnae-missing'
  if (!profile?.tipo_mei) return 'tipo-missing'
  if (rowsCount === 0) return 'no-rows'
  return null
}
