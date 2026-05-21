import type { ComparativoRegimes } from '@/types/tributario'

export const REGIME_LABELS: Record<ComparativoRegimes['melhorRegime'], string> = {
  simplesAtual: 'Simples atual',
  simplesOtimo: 'Simples otimizado',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
}

// Valores vigentes para 2026
export const SALARIO_MINIMO_2026 = 1_518.00
export const TETO_INSS_MENSAL_2026 = 8_475.55
export const INSS_PRO_LABORE_RATE = 0.11
export const INSS_PATRONAL_RATE = 0.20

// Estimativas de alíquotas para regimes complexos
export const ESTIMATIVA_ICMS_EFETIVO = 0.05 // 5% (média considerando créditos)
export const ESTIMATIVA_IPI_EFETIVO = 0.02  // 2%
