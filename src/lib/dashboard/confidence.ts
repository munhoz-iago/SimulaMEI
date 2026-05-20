export type ConfidenceLevel = 'limitada' | 'razoavel' | 'forte'

export function confidenceLevel(monthsOfHistory: number): { level: ConfidenceLevel; label: string } {
  if (monthsOfHistory < 6) {
    return { level: 'limitada', label: `Projeção com base limitada — ${monthsOfHistory} ${monthsOfHistory === 1 ? 'mês' : 'meses'} de histórico` }
  }
  if (monthsOfHistory < 10) {
    return { level: 'razoavel', label: `Projeção com base razoável — ${monthsOfHistory} meses de histórico` }
  }
  return { level: 'forte', label: `Histórico consistente — projeção confiável (${monthsOfHistory} meses)` }
}
