/**
 * Análise preditiva sobre os lançamentos do Monitor mensal.
 *
 * Recebe o histórico bruto e devolve insights acionáveis: média,
 * projeção anual, mês previsto de estouro do teto, tendência
 * (subindo/descendo/estável) e recomendações personalizadas.
 */

import { LIMITES_MEI } from '@/lib/tributario'
import type { TipoMei } from '@/types/tributario'

export interface MonthlyEntry {
  ano: number
  mes: number
  faturamentoMes: number
  folhaMes: number
  anexoCalculado: string | null
  fatorR: number | null
}

export interface MonitorInsights {
  /** Quantos meses lançados (drives confidence) */
  monthsCount: number
  /** Faturamento médio mensal */
  averageMonthly: number
  /** Mediana mensal (mais resistente a outliers) */
  medianMonthly: number
  /** Projeção anual extrapolada (média × 12) */
  projectedAnnual: number
  /** Faturamento acumulado real até hoje */
  accumulatedActual: number
  /** Excedente projetado sobre o teto MEI (>0 = vai estourar) */
  projectedOverflow: number
  /** % do teto que a projeção representa */
  usagePct: number
  /** Tendência: linha de tendência simples (slope mensal) */
  trendSlope: number
  /** Categoria da tendência: 'rising' | 'falling' | 'stable' */
  trendCategory: 'rising' | 'falling' | 'stable'
  /** Mês em que vai cruzar o teto MEI no ritmo atual (null = não estoura) */
  monthOfTetoBreach: { ano: number; mes: number } | null
  /** Cenário fiscal: 'safe' | 'watch' | 'critical' */
  scenario: 'safe' | 'watch' | 'critical'
  /** Lista de recomendações ordenadas por prioridade */
  recommendations: Recommendation[]
}

export interface Recommendation {
  /** Severidade visual */
  tone: 'info' | 'warn' | 'critical' | 'opportunity'
  /** Título curto (até ~60 chars) */
  title: string
  /** Descrição com 1-2 frases */
  body: string
  /** Ação CTA opcional */
  cta?: { label: string; href: string }
}

/** Média aritmética */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

/** Mediana (resistente a outliers) */
function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/** Slope da reta de tendência via least squares simplificado */
function linearSlope(arr: number[]): number {
  if (arr.length < 2) return 0
  const n = arr.length
  const xMean = (n - 1) / 2
  const yMean = mean(arr)
  let num = 0
  let den = 0
  arr.forEach((y, i) => {
    num += (i - xMean) * (y - yMean)
    den += (i - xMean) ** 2
  })
  return den === 0 ? 0 : num / den
}

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function monthLabel(mes: number) {
  return MONTH_LABELS[Math.max(0, Math.min(11, mes - 1))]
}

/** Calcula em qual (ano,mes) o faturamento acumulado vai cruzar o teto */
function projectTetoBreach(
  ordered: MonthlyEntry[],
  averageMonthly: number,
  teto: number,
): { ano: number; mes: number } | null {
  if (averageMonthly <= 0) return null
  const accumulated = ordered.reduce((s, item) => s + item.faturamentoMes, 0)
  if (accumulated >= teto) {
    // Já estourou — retorna o último mês registrado como "ponto de virada"
    const last = ordered.at(-1)
    return last ? { ano: last.ano, mes: last.mes } : null
  }
  const remaining = teto - accumulated
  const monthsToBreach = Math.ceil(remaining / averageMonthly)
  // Partindo do mês seguinte ao último registrado
  const last = ordered.at(-1)
  if (!last) return null
  let ano = last.ano
  let mes = last.mes + monthsToBreach
  while (mes > 12) {
    mes -= 12
    ano += 1
  }
  // Se ultrapassar 12 meses do início, não consideramos relevante (ritmo muda)
  if (monthsToBreach > 12) return null
  return { ano, mes }
}

export function analyzeMonitorInsights(
  history: MonthlyEntry[],
  tipoMei: TipoMei = 'geral',
  refDate: Date = new Date(),
): MonitorInsights | null {
  if (history.length === 0) return null

  // Ordena cronologicamente
  const ordered = [...history].sort(
    (a, b) => a.ano * 100 + a.mes - (b.ano * 100 + b.mes),
  )
  const faturamentos = ordered.map(item => item.faturamentoMes)
  const teto = LIMITES_MEI[tipoMei].anual

  const averageMonthly = mean(faturamentos)
  const medianMonthly = median(faturamentos)
  const projectedAnnual = averageMonthly * 12
  const accumulatedActual = faturamentos.reduce((s, v) => s + v, 0)
  const projectedOverflow = projectedAnnual - teto
  const usagePct = projectedAnnual / teto
  const trendSlope = linearSlope(faturamentos)

  // Tendência: slope > 5% da média = subindo; < -5% = caindo; senão estável
  const trendThreshold = averageMonthly * 0.05
  const trendCategory: MonitorInsights['trendCategory'] =
    trendSlope > trendThreshold ? 'rising'
    : trendSlope < -trendThreshold ? 'falling'
    : 'stable'

  const monthOfTetoBreach = projectTetoBreach(ordered, averageMonthly, teto)

  // Cenário fiscal
  const scenario: MonitorInsights['scenario'] =
    usagePct > 1.0 || (monthOfTetoBreach && new Date(monthOfTetoBreach.ano, monthOfTetoBreach.mes - 1).getTime() - refDate.getTime() < 90 * 24 * 60 * 60 * 1000)
      ? 'critical'
    : usagePct > 0.7
      ? 'watch'
      : 'safe'

  const recommendations = buildRecommendations({
    scenario, trendCategory, usagePct, monthOfTetoBreach,
    averageMonthly, projectedOverflow, monthsCount: ordered.length,
    lastFatorR: ordered.at(-1)?.fatorR ?? null,
    lastAnexo: ordered.at(-1)?.anexoCalculado ?? null,
  })

  return {
    monthsCount: ordered.length,
    averageMonthly,
    medianMonthly,
    projectedAnnual,
    accumulatedActual,
    projectedOverflow,
    usagePct,
    trendSlope,
    trendCategory,
    monthOfTetoBreach,
    scenario,
    recommendations,
  }
}

interface RecommendationInput {
  scenario: MonitorInsights['scenario']
  trendCategory: MonitorInsights['trendCategory']
  usagePct: number
  monthOfTetoBreach: { ano: number; mes: number } | null
  averageMonthly: number
  projectedOverflow: number
  monthsCount: number
  lastFatorR: number | null
  lastAnexo: string | null
}

function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const recs: Recommendation[] = []

  // 1. Cenário crítico — estouro iminente
  if (input.scenario === 'critical' && input.monthOfTetoBreach) {
    recs.push({
      tone: 'critical',
      title: `Vai estourar o teto em ${monthLabel(input.monthOfTetoBreach.mes)}/${input.monthOfTetoBreach.ano}`,
      body: `Projeção indica ultrapassar o teto MEI em ~${input.projectedOverflow > 0 ? Math.round(input.projectedOverflow).toLocaleString('pt-BR') : 0} reais. Migre para ME no Simples Nacional antes da virada do ano fiscal pra evitar tributação retroativa.`,
      cta: { label: 'Simular Simples Nacional', href: '/dashboard/simular' },
    })
  } else if (input.scenario === 'critical') {
    recs.push({
      tone: 'critical',
      title: 'Projeção acima do teto MEI',
      body: `No ritmo atual (média de R$ ${Math.round(input.averageMonthly).toLocaleString('pt-BR')}/mês), você passa do limite anual. Avalie migração para ME ou redução de ritmo.`,
      cta: { label: 'Ver comparativo de regimes', href: '/dashboard/simular' },
    })
  }

  // 2. Watch — entrou na faixa de atenção
  if (input.scenario === 'watch') {
    recs.push({
      tone: 'warn',
      title: `${Math.round(input.usagePct * 100)}% do teto projetados`,
      body: 'Você ainda tem margem mas o ritmo se aproxima do limite. Continue lançando todo mês — qualquer aceleração pede plano de migração.',
    })
  }

  // 3. Fator R abaixo de 28% — oportunidade fiscal
  if (input.lastFatorR !== null && input.lastFatorR < 0.28 && input.lastAnexo === 'V') {
    const folhaMinima = input.averageMonthly * 0.28
    const aumentoFolha = folhaMinima - (input.averageMonthly * input.lastFatorR)
    recs.push({
      tone: 'opportunity',
      title: `Fator R em ${(input.lastFatorR * 100).toFixed(1)}% — você está pagando Anexo V`,
      body: `Aumentando a folha mensal em ~R$ ${Math.max(0, Math.round(aumentoFolha)).toLocaleString('pt-BR')} você cruza os 28% e migra para o Anexo III (menor alíquota). Economia anual pode chegar a milhares.`,
      cta: { label: 'Simular ajuste de pró-labore', href: '/dashboard/simular' },
    })
  }

  // 4. Tendência subindo — alerta de crescimento
  if (input.trendCategory === 'rising' && input.scenario !== 'critical') {
    recs.push({
      tone: 'info',
      title: 'Faturamento crescendo mês a mês',
      body: `Sua tendência é positiva. Comece a planejar a migração pra ME antes que o ritmo te empurre pra fora do MEI no meio do ano fiscal.`,
    })
  }

  // 5. Tendência caindo — atenção
  if (input.trendCategory === 'falling' && input.monthsCount >= 3) {
    recs.push({
      tone: 'warn',
      title: 'Faturamento em queda',
      body: 'Seu ritmo diminuiu nos últimos meses. Vale revisar precificação, canais de venda ou avaliar gerar conteúdo para retomar.',
    })
  }

  // 6. Poucos lançamentos — pede mais histórico
  if (input.monthsCount < 3) {
    recs.push({
      tone: 'info',
      title: 'Histórico ainda curto pra projeções confiáveis',
      body: `Você tem ${input.monthsCount} ${input.monthsCount === 1 ? 'mês registrado' : 'meses registrados'}. Com 3+ meses, projeções e alertas ficam mais precisos.`,
    })
  }

  // 7. Cenário safe + monitor ativo = parabéns
  if (input.scenario === 'safe' && input.monthsCount >= 3 && recs.length === 0) {
    recs.push({
      tone: 'info',
      title: 'Cenário fiscal saudável',
      body: `${Math.round(input.usagePct * 100)}% do teto projetados. Continue acompanhando mensalmente e a margem se mantém.`,
    })
  }

  return recs
}
